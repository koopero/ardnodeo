var Ardnodeo = require('../../js/index');
var Convert = Ardnodeo.Convert;
var onecolor = require('onecolor');


var ard = Ardnodeo.Bootstrap();
ard.source( "FastLED.ino" );

require( '../../js/Prompt' )( ard );



//setInterval( tick, 100 );
var colour = new onecolor( "red" );

var STRIP_LENGTH = ard.define.STRIP_LENGTH; 

var phase;
function tick () {
	if ( phase === undefined ) phase = Math.random() * 1000;
	phase += 0.01;

	var colour = new onecolor.HSV( phase % 1, Math.random(), Math.random() );
	var index = Math.floor( Math.random() * STRIP_LENGTH );
	ard.varWrite( 'ledBuffer', colour, index );
}

var phase = 0;

ard.on('timecode', tick );
