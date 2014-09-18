var Ardnodeo = require('../../js/index');

// Automatically load your Arduino preferences and connect to the device.
var arduino = Ardnodeo.Bootstrap();

// Load the sketch.
arduino.source('Blink.ino');

// Since we already defined LED_PIN in the sketch, no need to define it again.
var ledPin = arduino.define.LED_PIN;

// Blink the LED every second.
var ledState = false;
setInterval( function () {
  ledState = !ledState;
  arduino.digitalWrite( ledPin, ledState );
}, 1000 );