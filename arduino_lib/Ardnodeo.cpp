#include "Ardnodeo.h"
#include <avr/wdt.h>

Ardnodeo::Timecode::Timecode () {
	ms = millis();
	ns = micros();
}

void Ardnodeo::setup () {
	Serial.begin( 9600 );
	flags |= Protocol::connected;
}

bool Ardnodeo::isConnected () {
	return flags & Protocol::connected;
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
	bool sendAck = true;
	do {
		age = millis() - timecode.ms;

		while ( receiveCommand() ) {
			// If we're getting command, we're connected.
			flags |= Protocol::connected;

			age = millis() - timecode.ms;

			if ( maxDelay && age >= maxDelay )
				return false;

			sendAck = true;
		};

		if ( sendAck ) {
			if ( !sendAcknowledge() ) {
				flags &= ~Protocol::connected;
			}
			sendAck = false;
		}

		
		if ( age + 2 < minDelay )
			delay(2);

	} while ( age < minDelay );

	return true;
}

bool Ardnodeo::beginPacket () {
	return true;
}

bool Ardnodeo::endPacket () {
	Serial.flush();
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

	// If we're getting input,
	// we can assume we're connected
	flags |= Protocol::connected;

	uint8_t command = Serial.read();
	
	// Bottom nibble is arg0
	uint8_t arg0 = command & 0xf;

	// Top nibble of command is actual command
	command = command >> 4;

	//	This is the master protocol switch.
	//	Actually, a nested switch, grouped by
	//	commands that have the similar options.
	switch ( command ) {
		case Protocol::hello :
		{
			return true;
		}
		break;

		case Protocol::setFlags :
		{
			uint8_t newFlags = readByte();
			if ( lastReadOkay ) {
				switch ( arg0 ) {
					case Protocol::opSet :
						flags = newFlags;
					break;

					case Protocol::opAnd :
						flags &= newFlags;
					break;

					case Protocol::opOr :
						flags |= newFlags;
					break;

					default:
						return false;
				}
				
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

				return true;
			}
		}
		break;

		case Protocol::reset :
		{
			// Okay, so this doesn't actually reset.
			// Rather, it ends the Serial connection and
			// goes into an infinite loop, so hopefully
			// the server will be able to execute a
			// reset over serial.

			Serial.end();
			while (1) {};
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
						beginPacket()
						&& sendCommand( Protocol::analogRead )
						&& sendByte( pinId )
						&& sendWord( analogRead( pinId) )
						&& endPacket ()
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
						beginPacket()
						&& sendCommand( Protocol::analogRead )
						&& sendByte( pinId )
						&& sendByte( digitalRead( pinId ) )
						&& endPacket ()
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
						beginPacket()
						&& sendCommand( Protocol::peek )
						&& sendMemory( memory, size )
						&& endPacket ();
				}
				case Protocol::poke : 
				{
					return readMemory( memory, size );
				}
			}
		}
		break;

		//	---------------
		//	EEProm Commands
		//	---------------
		/*
		case Protocol::eepromRead:
		case Protocol::eepromWrite:
		{
			uint8_t size = arg0 + 1;
			uint16_t offset = readUnsignedShort();
			
			switch ( command ) {
				case Protocol::eepromRead:
					return
						beginPacket()
						&& sendCommand( Protocol::eepromRead )
						&& sendEEProm( offset, size )
						&& endPacket()
				break;

				case Protocol::
			}
		}
		break; 	
		*/	
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

	while ( size ) {
		uint8_t packetSize = min( size, 16 );
		if ( !(
			beginPacket()
			&& sendCommand( Protocol::poke, packetSize - 1 )
			&& sendWord( offset )
			&& sendMemory( loc, size )
			&& endPacket ()
		)) 
			return false;

		loc = (void *)((int)loc + packetSize );
		size -= packetSize; 
		offset += packetSize;
	}

	return true;
}



bool Ardnodeo::sendByte( uint8_t byte ) {
	if ( ~flags & Protocol::connected )
		return false;

	return Serial.write( byte );
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
/*
bool Ardnodeo::sendEEProm( uint16_t offset, size_t length ) {
	while ( length && sendByte( EEProm.read( offset ) ) ) {
		offset ++;
		length --;
	}
	return !length;
}
*/


bool Ardnodeo::readMemory( void * buf, size_t length ) {
	size_t read = Serial.readBytes( (char * )buf, length );
	return read == length;
}


Ardnodeo_readMethod( readByte, uint8_t );
Ardnodeo_readMethod( readUnsignedShort, uint16_t );
