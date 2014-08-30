#include <FastLED.h>
#include "Ardnodeo.h"

// Theses will need to tweaked for your setup!
#define STRIP_TYPE TM1809
#define STRIP_FORMAT BRG
#define STRIP_LENGTH 90
#define STRIP_PIN 11

// Arduino's onboard LED
#define ACTIVITY_PIN 13

// Size of convolution kernel
#define KERNEL_SIZE 10

// RGB, 'cause no magic numbers, right?
#define CHANNELS 3

#define clamp(v) ((v)>255?255:(v)<0?0:(v))

struct data_t {
  //#ARDNODEO_VARS
  int16_t   snowFreq; // Add random snow locally
  bool      convolutionActive;  // Whether to run convolution
  bool      normalizeKernel; // Whether to automatically set kerndelDiv
  int8_t    kernelOrigin; // Centre point of convolution kernel
  int8_t    kernel[CHANNELS][KERNEL_SIZE]; // Actual kernel
  uint16_t  kernelDiv[CHANNELS];
  CRGB      edgeColour;
  CRGB      ledBuffer[STRIP_LENGTH];
  //#/ARDNODEO_VARS
} data;

ArdnodeoData<data_t> node = ArdnodeoData<data_t>( &data );


void setup() {                
  FastLED.addLeds<STRIP_TYPE, STRIP_PIN, STRIP_FORMAT>(data.ledBuffer, STRIP_LENGTH);

  data.snowFreq = 6;
  
  // Pre-initialize the kernal, mostly so this thing will work without
  // node attached.
  data.kernelOrigin = 4;

  data.kernel[0][3] = 10;
  data.kernel[0][4] = 20;
  data.kernel[0][5] = 10;
  data.kernelDiv[0] = 41;
  
  data.kernel[1][3] = 10;
  data.kernel[1][4] = 20;
  data.kernel[1][5] = 10;
  data.kernelDiv[1] = 42;
  
  data.kernel[2][0] = 2;
  data.kernel[2][1] = 5;
  data.kernel[2][2] = 10;
  data.kernel[2][3] = 5;
  data.kernel[2][4] = 15;
  data.kernel[2][5] = 5;
  data.kernel[2][6] = 10;
  data.kernel[2][7] = 5;
  data.kernel[2][8] = 2;


  data.kernelDiv[2] = 60;
 
  data.normalizeKernel = true;

/*
  data.snowFreq = 2;

  data.kernel[0][4] = 10;
  data.kernel[0][5] = 10;
  
  data.kernelDiv[0] = 21;
  
  data.kernel[1][2] = 20;
  data.kernelDiv[1] = 21;
  
  data.kernel[2][6] = 15;
  data.kernelDiv[2] = 16;
*/

  node.setup();

  data.convolutionActive = true;
}

bool activity= false;


void convolve () {
  if ( data.normalizeKernel ) {
    for ( uint8_t channel = 0; channel < CHANNELS; channel++ ) {
      data.kernelDiv[channel] = 1;
      for ( int x = 0; x < KERNEL_SIZE; x ++ )
        data.kernelDiv[channel] += data.kernel[channel][x];
    }
  }


  // kernelOrigin currently must be inside the kernel.
  data.kernelOrigin = max( min( data.kernelOrigin, KERNEL_SIZE - 1 ), 0 );

  // The convolution will write to this ring buffer instead of directly back to 
  // data.ledBuffer so the input to the kernel stays clean.
  CRGB buffer[KERNEL_SIZE];
  int16_t bufferWrite = 0;
  int16_t bufferRead = 0;

  // This definitely isn't the tightest implementation of
  // a 1D convolution kernel, but it'll do.
	for ( int16_t i = 0; i < STRIP_LENGTH; i ++ ) {

    int16_t left = i - data.kernelOrigin;
    int16_t right = left + KERNEL_SIZE;

    if ( i >= KERNEL_SIZE ) {
      data.ledBuffer[i-KERNEL_SIZE] = buffer[bufferRead];

      bufferRead ++;
      if ( bufferRead == KERNEL_SIZE )
        bufferRead = 0;
    }

		for ( uint8_t channel = 0; channel < CHANNELS; channel++ ) {
			int32_t accumulator = 0;
      uint8_t kx = 0;
			for ( int16_t x = left; x < right; x ++ ) {
        // Value from either inside data.ledBuffer or edgeColour
        int16_t value = ( x >= 0 && x < STRIP_LENGTH ? data.ledBuffer[x] : data.edgeColour ).raw[channel];

				accumulator += value * data.kernel[channel][kx];
        kx++;
			}

      accumulator = accumulator / data.kernelDiv[channel];
      buffer[bufferWrite].raw[channel] = clamp( accumulator );
		}

    bufferWrite ++;
    if ( bufferWrite == KERNEL_SIZE )
      bufferWrite = 0;
	}

  // Write out the rest of the ring buffer
  for ( int x = 0; x < KERNEL_SIZE; x ++ ) {
    data.ledBuffer[ STRIP_LENGTH - KERNEL_SIZE + x ] = buffer[bufferRead];
    bufferRead ++;
    if ( bufferRead == KERNEL_SIZE )
      bufferRead = 0;    
  }


}

uint16_t frame = 0;

void loop() {

  
  // Blink the onboard LED to show activity
  static bool activityBlinker = false;
	activityBlinker = !activityBlinker;
	digitalWrite( ACTIVITY_PIN, activityBlinker ? HIGH : LOW );

  // 
  node.update();

  if ( data.snowFreq && !( frame % data.snowFreq ) ) {
    uint16_t index = random(STRIP_LENGTH);
    data.ledBuffer[index].raw[0] = 255;
    data.ledBuffer[index].raw[1] = 255;
    data.ledBuffer[index].raw[2] = 255;
  }
  frame ++;



  
  //renderDebug( ledState ? 255 : 30, 0, 40 );
  FastLED.show();

  if ( data.convolutionActive )
    convolve();

}

