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