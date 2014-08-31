#include "Ardnodeo.h"

// Theses will need to tweaked for your setup!
#define BUTTON1_PIN 2
#define BUTTON2_PIN 3
#define LED_PIN 13

struct data_t {
	//#ARDNODEO_VARS
	bool buttonState[2];
  	//#/ARDNODEO_VARS
} data;

ArdnodeoData<data_t> node = ArdnodeoData<data_t>( &data );


void setup() {      
	pinMode( BUTTON1_PIN, INPUT );
	pinMode( BUTTON2_PIN, INPUT );
	
  	node.setup();
}

void loop() {
	node.loop(10);
	data.buttonState[0] = digitalRead( BUTTON1_PIN );
	data.buttonState[1] = digitalRead( BUTTON2_PIN );

	digitalWrite( LED_PIN, data.buttonState[1] ? HIGH : LOW );

	//node.mark( &data.buttonState[0] );
	node.poke( &data.buttonState[1] );
}