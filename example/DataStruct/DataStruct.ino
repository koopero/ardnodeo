/**
	
	Example of settting memory.

	Here's another roundabout way of turn an LED on and
	off ;-)
*/
	



#include <Ardnodeo.h>

#define LED_PIN 13

Ardnodeo node = Ardnodeo();
bool ledState = false;

struct test_data {
	//!BEGIN_ARDNODEO_STRUCT
	unsigned short delay;
	unsigned char intensity;
	//!END_ARDNODEO_STRUCT
} testData;



void setup() {
	node.data = &testData;
	testData.intensity = 128;
	testData.delay = 50;

	Serial.setTimeout( 100 );

	pinMode(LED_PIN, OUTPUT);
}

void loop() {

	ledState = !ledState;
	analogWrite( LED_PIN, ledState ? testData.intensity : 0 );
	//digitalWrite( LED_PIN, ledState ? HIGH : LOW );

	node.update();

	unsigned short del = testData.delay;

	//Serial.println( "Short val" );
	//Serial.println( del, DEC );
	
	delay( del );
}
