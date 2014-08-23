var Ardnodeo = require('../../js/index');
var Convert = Ardnodeo.Convert;
var onecolor = require('onecolor');


var ard = Ardnodeo.Bootstrap();
ard.source( "FastLED.ino" );
ard.setTick( true );

ard.varWrite( 'leds', 'green' );

require( '../../js/Prompt' )( ard );



//setInterval( tick, 100 );
var colour = new onecolor( "red" );

var NUM_LEDS = ard.define.NUM_LEDS; 

var phase
tick();
function tick () {
	if ( phase === undefined ) phase = Math.random() * 1000;
	phase += 0.01;

	var colour = new onecolor.HSV( phase % 1, Math.random(), Math.random() );
	var index = Math.floor( Math.random() * NUM_LEDS );
	ard.varWrite( 'leds', colour );
}

var phase = 0;

ard.on('tick', tick );
