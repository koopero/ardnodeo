# Example

### Blink.ino
```C++
#include "Ardnodeo.h"
#define LED_PIN 13

Ardnodeo node;

void setup() {
  node.setup();
}

void loop() {
  node.update();
}
```
### Blink.js
```javascript
var Ardnodeo = require('ardnodeo');

// Automatically load your Arduino preferences and connect to the device.
var arduino = Ardnodeo.Bootstrap();

// Load the sketch.
arduino.source('HelloWorld.ino');

// Since we already defined LED_PIN in the sketch, no need to define it again.
var ledPin = arduino.define.LED_PIN;

// Blink the LED every second.
var ledState = false;
setInterval( function () {
  ledState = !ledState;
  arduino.digitalWrite( ledPin, ledState );
}, 1000 );

```


# Shared Variables

Ardnodeo can recognize variables from a sketch and share them remotely.

This example is a cut down version of the [FastLED Example](example/FastLED/)

### Sketch.ino
```C++
#define NUM_LEDS 90
#define KERNAL_SIZE 5

struct data_t {
  //#ARDNODEO_VARS
  signed short ledSpeed;
  signed char ledConvolution[KERNAL_SIZE];
  CRGB ledBuffer[NUM_LEDS];
  //#/ARDNODEO_VARS
} data;

ArdnodeoData<data_t> ard = ArdnodeoData<data_t>( &data );

// etc...
```

### Javascript
```javascript
// Load the sketch's source code. Magic happens here. 
arduino.source('Sketch.ino');

// Definitions are loaded.
arduino.define.NUM_LEDS == 90;

// Setting variables
arduino.varWrite('ledSpeed', -200 );

// Setting an array index.
arduino.varWrite('ledConvolution', 10, 1 );

// Recognizes FastLED's CRGB class and recognizes colours.
arduino.varWrite('leds', 'red', 0 );
```

