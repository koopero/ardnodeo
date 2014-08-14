#include "Ardnodeo.h"


void Ardnodeo::setup () {

}

int Ardnodeo::receive() {
  int commandsProcessed = 0;

  while ( Serial.available() ) {
    unsigned char command = Serial.read();
    
    // Bottom nibble is arg0
    unsigned char arg0 = command & 0xf;

    // Top nibble of command is actual command
    command = command >> 4;

    Serial.println("Got command");
    Serial.println(command, DEC );

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
        unsigned char pinId = Serial.read();
        digitalWrite( pinId, arg0 ? HIGH : LOW );

        commandsProcessed ++;
      }
      break;

      case Protocol::AnalogWrite :
      {
        unsigned char pinId = Serial.read();
        unsigned char value = Serial.read();

        analogWrite( pinId, value );

        commandsProcessed ++;
      }
      break;

    }
  };

  return commandsProcessed;
}