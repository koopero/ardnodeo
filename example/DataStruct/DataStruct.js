var Ardnodeo = require('../../js/index');
var ard = Ardnodeo.Bootstrap( function ( err, arduino ) {
	arduino.source( 'DataStruct.ino' );
});



ard.on('line', function ( line ) {
	console.log( "----", line );
});


ard.varConfig ( 'delay', { offset: 0, type: Ardnodeo.Types.Uint16 } );
ard.varConfig ( 'intensity', { offset: 2, type: Ardnodeo.Types.Clamp8 } );


require( '../../js/Prompt' )( ard );



var phase = 0;
/*
ard.on('tick', function () {
	phase += 0.1;
	var v = 100 * ( Math.cos( phase ) + 1 );
	//ard.memWrite( 0, Ardnodeo.Convert.Uint16ToBuffer( v ) );
	//ard.memWrite( 2, Ardnodeo.Convert.Clamp8ToBuffer( Math.cos( phase * 1.2 ) / 2 + 0.5 ) );
	ard.varWrite( 'delay', v );
	ard.varWrite( 'intensity', Math.cos( phase * 1.2 ) / 2 + 0.5 );
} );
*/