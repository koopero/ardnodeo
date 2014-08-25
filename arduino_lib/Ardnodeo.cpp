#include "Ardnodeo.h"


void Ardnodeo::setup () {

}

void Ardnodeo::update () {
  if ( options & Protocol::Tick ) {
    tick();
  }
  receive();
}

void Ardnodeo::tick() {
  //if ( Serial )
    sendReturn( Protocol::Tick );
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
        case Protocol::PinMode :
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

        case Protocol::DigitalWrite :
        {
          uint8_t pinId = readByte();
          digitalWrite( pinId, arg0 ? HIGH : LOW );

          commandsProcessed ++;
        }
        break;

        case Protocol::AnalogWrite :
        {
          uint8_t pinId = readByte();
          uint8_t value = readByte();

          analogWrite( pinId, value );

          commandsProcessed ++;
        }
        break;

        case Protocol::MemWrite :
        {
          uint16_t offset = readUnsignedShort();
          if ( !lastReadOkay )
            break;

          uint8_t size = arg0 + 1;
          char * p = (char*)((int) data + (int) offset);

          /*
          Serial.println("Offset");
          Serial.println(offset, DEC );
          
          Serial.println("Size");
          Serial.println(size, DEC );
          */

          Serial.readBytes( p, size );
          commandsProcessed ++;
        }
        break;

        case Protocol::setOptions :
        {
          uint8_t newOptions = readByte();
          if ( lastReadOkay )
            options = newOptions;
        }
        break;

        case Protocol::reset :
        {
          resetFunc();
        }
        break;

      }
    };

    if ( commandsProcessed )
      sendReturn( Protocol::status, Protocol::received );

    delay( 2 );

  } while ( commandsProcessed );
}



void Ardnodeo::sendReturn( uint8_t cmd, uint8_t arg ) {
  sendByte( 
    128 |  // All returns have top bit set
    ( ( cmd & 0xf ) << 3 ) |
    ( arg & 7 )
  );
}


inline void Ardnodeo::sendByte( uint8_t byte ) {
  Serial.write( byte );
}


Ardnodeo_readMethod( readByte, uint8_t );
Ardnodeo_readMethod( readUnsignedShort, uint16_t );
