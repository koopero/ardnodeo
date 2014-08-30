#include "Ardnodeo.h"
#include <avr/wdt.h>

void Ardnodeo::setup () {

}

void Ardnodeo::update () {
  //if ( options & Protocol::Tick ) {
    tick();
  //}
  receive();
}

void Ardnodeo::tick() {
  //if ( Serial )
    sendReturn( Protocol::Tick );
}

bool Ardnodeo::catchEvent( uint8_t eventCode ) {
  uint8_t byteIndex = eventCode >> 3;
  uint8_t bitIndex = eventCode & 7;
  uint8_t bit = 1 << bitIndex;

  if ( _incomingEvents[byteIndex] & bit ) {
    _incomingEvents[byteIndex] ^= bit;
    return true;
  }

  return false;
}



void Ardnodeo::receive() {
  int commandsProcessed;

  do { 
    commandsProcessed = 0;

    while ( Serial.available() ) {
      uint8_t command = Serial.read();
      
      // Bottom nibble is arg0
      uint8_t arg0 = command & 0xf;

      // Top nibble of command is actual command
      command = command >> 4;

      //Serial.println("Got command");
      //Serial.println(command, DEC );

      switch ( command ) {
        case Protocol::pinMode :
        {
          uint8_t pinId = Serial.read();
          switch ( arg0 ) {
            case Protocol::Output:       pinMode( pinId, OUTPUT ); break;
            case Protocol::Input:        pinMode( pinId, INPUT ); break;
            case Protocol::InputPullup:  pinMode( pinId, INPUT_PULLUP ); break;
          }
          commandsProcessed ++;
        }
        break;

        case Protocol::digitalWrite :
        {
          uint8_t pinId = readByte();
          digitalWrite( pinId, arg0 ? HIGH : LOW );

          commandsProcessed ++;
        }
        break;

        case Protocol::analogWrite :
        {
          uint8_t pinId = readByte();
          uint8_t value = readByte();

          analogWrite( pinId, value );

          commandsProcessed ++;
        }
        break;

        case Protocol::poke :
        {
          uint16_t offset = readUnsignedShort();
          if ( !lastReadOkay )
            break;

          uint8_t size = arg0 + 1;
          char * p = (char*)((int) data + (int) offset);

          Serial.readBytes( p, size );
          commandsProcessed ++;
        }
        break;

        case Protocol::peek :
        {
          uint16_t offset = readUnsignedShort();
          if ( !lastReadOkay )
            break;

          uint8_t size = arg0 + 1;
          uint8_t * p = (uint8_t*)((int) data + (int) offset);

          /*
          Serial.println( "Got peek" );
          Serial.println( offset, DEC );
          Serial.println( size, DEC );
          */

          sendReturn( Protocol::peek, arg0 );

          Serial.write( p, size );

          commandsProcessed ++;
        }
        break;

        case Protocol::setFlags :
        {
          uint8_t newOptions = readByte();
          if ( lastReadOkay )
            options = newOptions;
        }
        break;

        case Protocol::reset :
        {
          wdt_enable(WDTO_15MS);
          while(1)
          {
          }
        }
        break;

      }
    };

    sendReturn( Protocol::status, Protocol::received );

    delay( 2 );

  } while ( commandsProcessed );
}



void Ardnodeo::sendReturn( uint8_t cmd, uint8_t arg ) {
  sendByte( 
    128 |  // All returns have top bit set
    ( ( cmd & 0xf ) << 4 ) |
    ( arg & 0xf )
  );
}


inline void Ardnodeo::sendByte( uint8_t byte ) {
  Serial.write( byte );
}


Ardnodeo_readMethod( readByte, uint8_t );
Ardnodeo_readMethod( readUnsignedShort, uint16_t );
