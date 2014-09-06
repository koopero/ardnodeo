const
	_ = require('underscore'),
	async = require('async'),
	util = require('util'),
	SerialPort = require("serialport").SerialPort;

util.inherits( Serial, require('events').EventEmitter );

module.exports = Serial;

function Serial ( opt ) {
	var self = this;

	self.status = {};
	self.write = null;
	self.close = close;
	self.opt = {};
	self.stayOpen = true;
	self.open = open;
	self.reset = reset;

	if ( opt ) {
		open(opt);
	}



	function close ( cb ) {
		self.stayOpen = false;

		closePort( function () {
			self.port.removeAllListeners();
			self.port = null;
			if ( cb )
				cb();
		});
	}


	function reset( cb ) {
		async.series( [
			closePort,
			delay( 50 ),
			openReset,
			delay( 50 ),
			closeReset,
			delay( 50 )	
		], function ( err ) {
			console.log( "RESET SERIAL?" );
		} );

		var resetPort = new SerialPort( 
			self.opt.port, 
			{	
				baudrate: 1200,
				rtscts: true
			},
			false
		);

		function openReset( cb ) {
			console.log( "Opening resetPort")
			resetPort.open( cb );
		}

		function closeReset( cb ) {
			console.log( "Closing resetPort")
			resetPort.close( cb );
		}

		function delay ( milliseconds ) {
			return function ( cb ) {
				setTimeout( cb, milliseconds );
			}
		}
	}

	function closePort( cb ) {
		if ( self.port ) {
			async.series( [ 
				self.port.drain.bind( self.port ),
				self.port.flush.bind( self.port ),
				self.port.close.bind( self.port )
			], cb );
		} else if ( cb ) {
			cb( new Error( "Already closed" ) );
		}		
	}


	function open( opt ) {
		if ( opt ) {
			self.opt = _.extend( self.opt, _.pick( opt, 'port', 'baudrate', 'stopbits', 'parity' ) );
		}

		if ( !self.port ) {
			self.port = new SerialPort( self.opt.port, self.opt, false );

		}

		checkPortListener('open', _onSerialOpen );
		checkPortListener('error', _onSerialError );
		checkPortListener('close', _onSerialClose );
		checkPortListener('data', _onSerialData );	

		if ( !self.status.open )
			self.port.open();

		function checkPortListener( event, listener ) {
			var emitter = self.port;
			var listeners = emitter.listeners( event );
			var ind = listeners.indexOf( listener );
			if ( ind == -1 )
				emitter.on( event, listener );
		}

	}



	function delayReconnect() {
		if ( self.stayOpen )
			setTimeout( open, 100 );
	}

	function _onSerialData ( data ) {
		//console.log( "data", data );
		self.emit('data', data );
	}

	function _onSerialOpen () {

		self.status.open = true;
		self.status.error = false;
		self.write = self.port.write.bind( self.port );
		self.emit('open');
		self.emit('status');
	}

	function _onSerialError( error ) {
		self.status.error = true;
		self.status.open = false;
		self.write = null;
		//self.port.close();
		
		//self.emit('error');
		self.emit('close');
		self.emit('status');

		delayReconnect();
	}

	function _onSerialClose( error ) {
		self.status.open = false;
		self.write = null;
		
		//self.port.close();
		//self.port = null;
		self.emit('close');
		self.emit('status');


		delayReconnect();
	}


}