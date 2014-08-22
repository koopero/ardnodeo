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

int Ardnodeo::receive() {
  int commandsProcessed = 0;

  while ( Serial.available() ) {
    unsigned char command = Serial.read();
    
    // Bottom nibble is arg0
    unsigned char arg0 = command & 0xf;

    // Top nibble of command is actual command
    command = command >> 4;

    //Serial.println("Got command");
    //Serial.println(command, DEC );

    switch ( command ) {
      case Protocol::PinMode :
      {
        unsigned char pinId = Serial.read();
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
        unsigned char pinId = readByte();
        digitalWrite( pinId, arg0 ? HIGH : LOW );

        commandsProcessed ++;
      }
      break;

      case Protocol::AnalogWrite :
      {
        unsigned char pinId = readByte();
        unsigned char value = readByte();

        analogWrite( pinId, value );

        commandsProcessed ++;
      }
      break;

      case Protocol::MemWrite :
      {
        unsigned short offset = readUnsignedShort();
        if ( !lastReadOkay )
          break;

        unsigned char size = readByte();
        if ( !lastReadOkay )
          break;
        
        char * p = (char*)((int) data + (int) offset);

        /*
        Serial.println("Offset");
        Serial.println(offset, DEC );
        
        Serial.println("Size");
        Serial.println(size, DEC );
        */

        Serial.readBytes( p, size );

      }
      break;

      case Protocol::setOptions :
      {
        uint8_t newOptions = readByte();
        if ( lastReadOkay )
          options = newOptions;
      }

    }
  };

  return commandsProcessed;
}



void Ardnodeo::sendReturn( unsigned char cmd, unsigned char arg ) {
  sendByte( 
    128 |  // All returns have top bit set
    ( ( cmd & 0xf ) << 3 ) |
    ( arg & 7 )
  );
}


inline void Ardnodeo::sendByte( unsigned char byte ) {
  Serial.write( byte );
}


Ardnodeo_readMethod( readByte, uint8_t );
Ardnodeo_readMethod( readUnsignedShort, uint16_t );
