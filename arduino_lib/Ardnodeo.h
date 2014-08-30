#ifndef Ardnodeo_h
#define Ardnodeo_h

#include "Arduino.h"

typedef uint8_t clamp8 ; 
typedef uint16_t clamp10 ; 
typedef uint16_t clamp12 ; 

class Ardnodeo {
public:


	void setup();
	void update();
	void receive ();
	void tick ();

	bool catchEvent( uint8_t eventCode );

	void * data;
	char options = 0;

	class Protocol {
	public:
		//#ARDNODEO_PROTOCOL
		enum InputCommand {
			Null = 0,
			pinMode = 1,
			digitalWrite = 2,
			analogWrite = 3,
			poke = 4,
			peek = 7,
			setFlags = 5,
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
			received = 2
		};
		//#/ARDNODEO_PROTOCOL
	};

	template <typename T> void mark( const T* offset, bool force = false ) {
		_markRegion( (void *) offset, sizeof(T), force );
	};

protected:
	bool lastReadOkay;

	uint8_t _incomingEvents[32];

	uint8_t  readByte  ();
	uint16_t readUnsignedShort ();

	

	void _markRegion( void * offset, size_t size, bool force );


	void sendReturn ( unsigned char commandId, unsigned char arg = 0 );
	void sendByte ( unsigned char byte );
	
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