var Ardnodeo = require('../../js/index');

var ard = Ardnodeo.Bootstrap();
ard.source( "InputVars.ino" );

ard.setTick( true );



require( '../../js/Prompt' )( ard );
