#ifndef Ardnodeo_h
#define Ardnodeo_h

#include "Arduino.h"

typedef uint8_t clamp8 ; 
typedef uint16_t clamp10 ; 
typedef uint16_t clamp12 ; 

typedef uint8_t command_t;
typedef unsigned long ms_t;
typedef uint8_t event_t;
typedef uint8_t arg_t;
typedef uint8_t flags_t;



class Ardnodeo {
public:
	class Protocol {
	public:
		//#ARDNODEO_PROTOCOL
		enum Command {
			acknowledge = 0,
			event = 1,
			pinMode = 3,
			analogRead = 4,
			digitalRead = 5,
			peek = 6,
			poke = 7,
			
			analogWrite = 8,
			digitalWrite = 9,
			setFlags = 10,
			reset = 11
		};

		enum PinMode {
			Output = 0,
			Input = 1,
			InputPullup = 2
		};

		enum Flags {
			connected = 1,
			timecode = 2
		};
		//#/ARDNODEO_PROTOCOL
	};

	class Timecode {
	public:
		unsigned long ms;
		unsigned long ns;

		Timecode ();
	};

	void setup();
	
	void tick ();
	bool loop( ms_t minDelay = 0, ms_t maxDelay = 0 );
	
	bool catchEvent( uint8_t eventCode );
	bool sendEvent( event_t event );

	bool sendCommand ( command_t commandId, arg_t arg = 0 );
	bool sendByte ( unsigned char byte );
	bool sendWord ( uint16_t word );	
	bool sendMemory( void * buf, size_t length );
	
	bool sendAcknowledge();
	bool sendTimecode( Timecode timecode = Timecode() );


	

	bool receiveCommand ();

	void * data;
	flags_t flags = 0;



	template <typename T> bool poke( const T* offset, bool force = false ) {
		return pokeMemory( (void *) offset, sizeof(T), force );
	};



protected:
	bool lastReadOkay;

	uint8_t _incomingEvents[32];

	uint8_t  readByte  ();
	uint16_t readUnsignedShort ();
	bool readMemory( void * offset, size_t size );
	bool pokeMemory( void * offset, size_t size, bool force );

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