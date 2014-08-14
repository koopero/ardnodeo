var Serduino = require('../js/Serduino.js');

var LED_PIN = 13;

var ser = new Serduino ( {
  port: "/dev/tty.usbmodem1d161"
});

ser.on('line', function ( line ) {
	console.log( "L", line );
});

ser.pinMode(LED_PIN, ser.Protocol.PinMode.OUTPUT );

var ledOn = false;

setInterval( function () {
  ledOn = !ledOn;
  //ser.digitalWrite( LED_PIN, ledOn );
  ser.analogWrite( LED_PIN, Math.random() * 3 - 1 );
}, 1000 );
