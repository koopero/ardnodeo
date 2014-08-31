#include "Ardnodeo.h"
#include <avr/wdt.h>

Ardnodeo::Timecode::Timecode () {
	ms = millis();
	ns = micros();
}

void Ardnodeo::setup () {

}

bool Ardnodeo::catchEvent( event_t eventCode ) {
	uint8_t byteIndex = eventCode >> 3;
	uint8_t bitIndex = eventCode & 7;
	uint8_t bit = 1 << bitIndex;

	if ( _incomingEvents[byteIndex] & bit ) {
		_incomingEvents[byteIndex] ^= bit;
		return true;
	}

	return false;
}

bool Ardnodeo::loop( ms_t minDelay, ms_t maxDelay ) {
	Timecode timecode = Timecode();

	if ( ( flags & Protocol::connected ) && ( flags & Protocol::timecode ) ) {
		sendTimecode( timecode );
	}

	unsigned long age;
	do {
		while ( receiveCommand() ) {
			flags |= Protocol::connected;
			if ( !sendAcknowledge() ) {
				flags &= ~Protocol::connected;
				break;
			}
			age = millis() - timecode.ms;

			if ( maxDelay && age >= maxDelay )
				return false;
		};
		
		if ( age + 1 < minDelay )
			delay(1);

	} while ( age < minDelay );

	return true;
}

bool Ardnodeo::sendEvent( event_t event ) {
	return 
		sendCommand( Protocol::event )
		&& sendByte( event )
	;
}

bool Ardnodeo::sendAcknowledge() {
	return sendCommand(
		Protocol::acknowledge,
		flags
	);
}

bool Ardnodeo::sendTimecode( Timecode timecode ) {
	return 
		sendCommand ( 
			Protocol::timecode,
			sizeof( Timecode ) + 1
		)
		&& sendMemory( &timecode, sizeof( Timecode ) );
}

bool Ardnodeo::receiveCommand() {
	int commandsProcessed;

	if ( !Serial.available() )
		return false;

	uint8_t command = Serial.read();
	
	// Bottom nibble is arg0
	uint8_t arg0 = command & 0xf;

	// Top nibble of command is actual command
	command = command >> 4;

	switch ( command ) {

		case Protocol::setFlags :
		{
			uint8_t newFlags = readByte();
			if ( lastReadOkay ) {
				flags = newFlags;
				return true;
			}
		}
		break;

		case Protocol::event :
		{
			event_t eventCode = readByte();
			if ( lastReadOkay ) {
				uint8_t byteIndex = eventCode >> 3;
				uint8_t bitIndex = eventCode & 7;
				uint8_t bit = 1 << bitIndex;

				_incomingEvents[byteIndex] |= bit;
			}
		}
		break;

		//	------------
		//	Pin Commands
		//	------------

		case Protocol::pinMode :
		case Protocol::analogWrite :
		case Protocol::analogRead :
		case Protocol::digitalWrite :
		case Protocol::digitalRead :
		{
			uint8_t pinId = readByte();
			switch ( command ) {
				case Protocol::pinMode :
				{
					switch ( arg0 ) {
						case Protocol::Output:       pinMode( pinId, OUTPUT ); break;
						case Protocol::Input:        pinMode( pinId, INPUT ); break;
						case Protocol::InputPullup:  pinMode( pinId, INPUT_PULLUP ); break;
					}
					return true;
				}
				case Protocol::analogWrite :
				{
					clamp8 value = readByte();
					if ( lastReadOkay ) {
						analogWrite( pinId, value );
						return true;
					}
				}
				break;

				case Protocol::analogRead :
				{
					return 
						sendCommand( Protocol::analogRead )
						&& sendByte( pinId )
						&& sendWord( analogRead( pinId) )
					;
				}


				case Protocol::digitalWrite :
				{

					digitalWrite( pinId, arg0 ? HIGH : LOW );

					return true;
				}
				break;

				case Protocol::digitalRead :
				{
					return 
						sendCommand( Protocol::analogRead )
						&& sendByte( pinId )
						&& sendByte( digitalRead( pinId ) )
					;
				}
			}
		}
		break;

		//	---------------
		//	Memory Commands
		//	---------------

		case Protocol::poke :
		case Protocol::peek :
		{
			uint8_t size = arg0 + 1;
			uint16_t offset = readUnsignedShort();
			if ( !lastReadOkay )
				return false;

			char * memory = (char*)((int) data + (int) offset);

			switch ( command ) {
				case Protocol::peek :
				{
					return 
						sendCommand( Protocol::peek )
						&& sendMemory( memory, size );
				}
				case Protocol::poke : 
				{
					return readMemory(  memory, size );
				}
			}
		}
		break;
	}

	return false;
}


bool Ardnodeo::sendCommand( uint8_t cmd, uint8_t arg ) {
	return sendByte( 
		128 |  // All returns have top bit set
		( ( cmd & 0xf ) << 4 ) |
		( arg & 0xf )
	);
}

bool Ardnodeo::pokeMemory( void * loc, size_t size, bool force ) {
	int16_t offset =  (int) loc - (int) data;
	return 
		sendCommand( Protocol::poke, size - 1 )
		&& sendWord( offset )
		&& sendMemory( loc, size )
	;
}



bool Ardnodeo::sendByte( uint8_t byte ) {
	if ( ~flags & Protocol::connected )
		return false;

	Serial.write( byte );
	return true;
}

bool Ardnodeo::sendWord ( uint16_t word ) {
	return sendByte( word & 0xff ) && sendByte( word >> 8 );
}

bool Ardnodeo::sendMemory( void * buf, size_t length ) {
	while ( length && sendByte( ((uint8_t*)buf)[0] ) ) {
		buf = (void*)((int)buf+1);
		length --;
	}
	return !length;
}

bool Ardnodeo::readMemory( void * buf, size_t length ) {
	Serial.write( (char * )buf, length );
	return true;
}


Ardnodeo_readMethod( readByte, uint8_t );
Ardnodeo_readMethod( readUnsignedShort, uint16_t );
