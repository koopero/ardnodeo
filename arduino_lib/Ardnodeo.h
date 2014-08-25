#ifndef Ardnodeo_h
#define Ardnodeo_h

#include "Arduino.h"

class Ardnodeo {
public:


	void setup();
	void update();
	void receive ();
	void tick ();

	void * data;
	char options = 0;

	class Protocol {
	public:
		enum InputCommand {
			Null = 0,
			PinMode = 1,
			DigitalWrite = 2,
			AnalogWrite = 3,
			MemWrite = 4,
			setOptions = 5,
			reset = 6
		};

		enum ReturnCommand {
			Boot = 1,
			Tick = 2,
			AnalogRead = 4,
			status = 5
		};

		enum PinMode {
			Output = 0,
			Input = 1,
			InputPullup = 2
		};

		enum Status {
			received = 1 
		};
	};

protected:
	uint8_t  readByte  ();
	uint16_t readUnsignedShort ();

	bool lastReadOkay;

	void sendMem( void * offset, size_t size );

	void sendReturn ( unsigned char commandId, unsigned char arg = 0 );
	void sendByte ( unsigned char byte );

	void(* resetFunc) (void) = 0;
	
};



#define Ardnodeo_readMethod(NAME,TYPE) TYPE Ardnodeo::NAME  () { \
  TYPE data; \
  size_t expect = sizeof( data ); \
  size_t read = Serial.readBytes( (char*)&data, expect ); \
  lastReadOkay = read == expect; \
  return data; \
}

template <class T> class ArdnodeoData : public Ardnodeo {
	public:
		ArdnodeoData ( T* setData ) {
			data = (void *) setData;
		}
		T * mirror = NULL;
};


#endif