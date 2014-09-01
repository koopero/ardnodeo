var Ardnodeo = require('../../js/index');

var arduino = Ardnodeo.Bootstrap();
arduino.source( "InputVars.ino" );

arduino.vars.buttonState.on('change', function ( value, index ) {
	console.log( 'Button '+(index[0]+1)+' is '+( value ? 'down' : 'up' )+'. ' );
});


var prompt = require( '../../js/Prompt' )( arduino );
