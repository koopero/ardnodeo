var Ardnodeo = require('../../js/index');
var Convert = Ardnodeo.Convert;

var ard = new Ardnodeo ( {
  port: "/dev/tty.usbmodem1d151"
});


ard.setTick( true );

require( '../../js/Prompt' )( ard );



//setInterval( tick, 100 );

var NUM_LEDS = 80; 

var phase = Math.random() * 1000;
//tick();
function tick () {
	phase += 0.01;
		var c = 0,
			r = Math.cos( phase * 0.6 + c * 6 ),
			g = Math.cos( phase * 1.6 + c * 4 ),
			b = Math.cos( phase * 2.6 + c * 3 );

	var offset = Math.floor( Math.random() * NUM_LEDS ) * 3;
	ard.memWrite( offset, Convert.HSVToBuffer( phase % 1, Math.random(), Math.random() ) );
}

var phase = 0;

ard.on('tick', tick );
