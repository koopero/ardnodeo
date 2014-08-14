#ifndef Ardnodeo_h
#define Ardnodeo_h

#include "Arduino.h"

class Ardnodeo {
public:


	void setup();
	int receive ();

	class Protocol {
	public:
		enum InputCommand {
			Null = 0,
			PinMode = 1,
			DigitalWrite = 2,
			AnalogWrite = 3
		};

		enum ReturnCommand {
			Boot = 1,
			Heartbeat = 2,
			AnalogRead = 4
		};

		enum PinMode {
			Output = 0,
			Input = 1,
			InputPullup = 2
		};
	};

protected:

};



#endif