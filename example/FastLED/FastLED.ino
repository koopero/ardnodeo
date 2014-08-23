#include <FastLED.h>
#include "Ardnodeo.h"

#define LED_TYPE TM1809
#define NUM_LEDS 30
#define LED_PIN 11


struct data_t {
  //#ARDNODEO_VARS
  CRGB leds[NUM_LEDS];
  //#/ARDNODEO_VARS
} data;

ArdnodeoData<data_t> ard = ArdnodeoData<data_t>( &data );




// the setup routine runs once when you press reset:
void setup() {                
  FastLED.addLeds<LED_TYPE, LED_PIN, BRG>(data.leds, NUM_LEDS);
  ard.setup();
}

void renderDebug( long r, long g = 0, long b = 0 ) {
  r = r * NUM_LEDS / 255;
  g = g * NUM_LEDS / 255;
  b = b * NUM_LEDS / 255;
  
  for ( int i = 0; i < NUM_LEDS; i ++ ) {
    data.leds[i].raw[0] = i <= r ? 80 : 0; // Blue
    data.leds[i].raw[1] = i <= g ? 80 : 0;
    data.leds[i].raw[2] = i <= b ? 80 : 0;
  }
 
}

bool ledState = false;


void diffuseLeds ( int width = 3, int bias = 1, int darken = 1 ) {
	for ( int i = 0; i < NUM_LEDS - width; i ++ ) {
		for ( char c = 0; c < 3; c++ ) {
			int v = 0;
			for ( int x = 0; x < width; x ++ ) {
				v += data.leds[i + x].raw[c] * ( x == 0 ? bias + 1 : 1 );
			}
			data.leds[i].raw[c] = v / ( width + bias + darken ) ;
		}
	}
}

// the loop routine runs over and over again forever:
void loop() {
	ledState = !ledState;
	digitalWrite( 13, ledState ? HIGH : LOW );

  ard.update();
  //diffuseLeds();
  //renderDebug( ledState ? 255 : 30, 0, 40 );
  FastLED.show();

  delay(100);
}

