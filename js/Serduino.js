var Protocol = require('./Protocol');
var Convert = require('./Convert');

var util = require('util');

util.inherits( Serduino, require('events').EventEmitter );

var newLine = '\r\n';



function Serduino ( opt ) {
	var self = this;

	var _serial,
		_serialIsOpen = false,
		_serialOutBuffer = new Buffer(0),
		_serialInLine,
		_receiveQueue = [];


	_initSerial();

	function _initSerial( ) {
		var SerialPort = require("serialport").SerialPort;

		_serial = new SerialPort( opt.port, opt );
		_serial.on('data', _onSerialData );
		_serial.on('open', _onSerialOpen );
	}

	function _onSerialData ( data ) {
		var i = 0,
			k = data.length;

		if ( !k )
			return;

		for ( var ri = 0; ri < _receiveQueue.length; ri ++ ) {
			var receiver = _receiveQueue[ri];

			var need = receiver.buffer.length - receiver.got;
			var copy = length < need ? length : need;

			data.copy( receiver.buffer, receiver.got );

			receiver.got += copy;
			i += copy;

			if ( need == copy ) {
				receiver.callback( null, receiver.buffer );
				_receiveQueue.shift();
				_onSerialData( data.slice( i ) );
				return;
			}
		}
		
		while ( i < data.length ) {
			var c = data[i];
			// Returning bytes will always have their high bit set,
			// to allow ascii to pass unencumbered
			if ( c & 128 ) {
				_onSerialReturn( c );
				_onSerialData( data.slice( i + 1 ) );
				return;
			} else {
				if ( !_serialInLine )
					_serialInLine = '';

				_serialInLine += String.fromCharCode( c );
			}

			i++;
		}

		_flushInLine();
	}

	function _flushInLine () {
		while ( true ) {
			var ind = _serialInLine.indexOf( newLine );
			if ( ind == -1 )
				return;

			self.emit('line', _serialInLine.substr( 0, ind ) );
			_serialInLine = _serialInLine.substr( ind + newLine.length );
		}
		
	}

	function _onSerialReturn ( command ) {
		var arg0 = command & 15;
		command = (command & 120) >> 4;
		//console.log( "Got command", command );
		switch ( command ) {

		}
	}

	function _onSerialOpen () {
		console.warn( "Serial open" );
		_serialIsOpen = true;
		if ( _serialOutBuffer && _serialOutBuffer.length ) {
			_serial.write( _serialOutBuffer );
			_serialOutBuffer = null;
		}
	}

	function _writeSerial ( buffer ) {
		if ( _serialIsOpen ) {
			console.warn ( "Writing", buffer );
			_serial.write( buffer );
		} else {
			_serialOutBuffer = Buffer.concat( [ _serialOutBuffer, buffer ] );
		}
	}

	function _sendCommand ( command, arg0 ) {
		var firstByte = (( command & 0xf ) << 4 ) | ( arg0 & 0xf );
		var buf = new Buffer( arguments.length - 1 );
		buf[0] = firstByte;
		

		for ( var i = 2; i < arguments.length; i ++ ) {
			buf[i-1] = parseInt( arguments[i] ) & 0xff;
		}
		_writeSerial( buf );

	}

	function _receiveBytes ( length, cb ) {
		var receiver = {
			buffer: new Buffer( numBytes),
			got: 0
		};
	}

	var commandsOb = self;

	commandsOb.pinMode = function ( pin, mode ) {
		pin = parseInt( pin );
		mode = parseInt( mode );
		_sendCommand( Protocol.Command.PinMode, mode, pin );
	}

	commandsOb.digitalWrite = function ( pin, value ) {
		_sendCommand( Protocol.Command.DigitalWrite, value ? 1 : 0, pin );
	}

	commandsOb.analogWrite = function ( pin, value ) {
		value = Convert.NumberToUint8( value );
		_sendCommand( Protocol.Command.AnalogWrite, 0, pin, value );
	}

	commandsOb.analogRead = function ( pin, callback ) {

	}

	self.Protocol = Protocol;

}



module.exports = Serduino;



