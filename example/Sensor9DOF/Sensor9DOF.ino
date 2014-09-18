#include <Wire.h>
#include "Ardnodeo.h"
#include "Sparkfun9DOF.h"

#define LED_PIN 13

Sparkfun9DOF stick;

struct data_t {
	bool read;
	Sparkfun9DOF_data sensor;
} d; 


ArdnodeoData<data_t> node = ArdnodeoData<data_t> ( &d );

void setup () {
	
	stick.init();
	node.setup();

};

void loop () {
	stick.read();

	d.read = stick.read();
	d.sensor = stick.data;


	static bool	ledPulse;
	ledPulse = !ledPulse;
	digitalWrite( LED_PIN, ledPulse ? HIGH : LOW );

	node.loop( 100 );
	node.poke( &d.read );
	node.poke( &d.sensor );
};