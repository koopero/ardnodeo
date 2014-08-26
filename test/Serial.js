var Serial = require('../js/Serial');
var colors = require( 'colors' );

var connection = new Serial();
connection.on( 'open', listenDebug( 'open' ) );
connection.on( 'close', listenDebug( 'close' ) );
connection.on( 'data', listenDebug( 'data' ) );
connection.on( 'status', listenDebug( 'status' ) );

connection.open(  { port: '/dev/tty.usbmodem1d151' }  );


function listenDebug( eventName ) {
	return function () {
		process.stderr.write( eventName.green + '\n' );
	};
} 