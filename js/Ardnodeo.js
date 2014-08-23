var Protocol = require('./Protocol');
var Convert = require('./Convert');
var _ = require('underscore');

var async = require('async');

var util = require('util');

util.inherits( Ardnodeo, require('events').EventEmitter );

var newLine = '\r\n';



function Ardnodeo ( opt ) {
	var self = this;

	var _serial,
		_serialIsOpen = false,
		_serialOutBuffer = new Buffer(0),
		_serialInLine,
		_receiveQueue = [],
		_variables = Object.create( null );


	self.vars = _variables;
	self.offsets = [];

	opt = opt || {};

	if ( opt.serial ) {
		setSerial( opt.serial );
	}

	self.close = close;
	function close ( cb ) {

		setTick( false );

		console.log( "Closing time" );
		if ( _serial ) {
			async.series( [ 
				_serial.drain.bind( _serial ),
				_serial.flush.bind( _serial ),
				_serial.close.bind( _serial )
			], function () {
				_serial = null;
				cb;
			} );
		} else {
			cb( new Error( "Already closed" ) );
		}
		
		//_serial.close();
	}


	self.source = sourceFile;
	function sourceFile ( file ) {
		var Source = require('./Source');
		var parsed = Source.file( file );

		self.define = parsed.define;

		_.map( parsed.vars, function ( v, name ) {
			varConfig( name, v );
		});
	}


	self.setSerial = setSerial;
	function setSerial( serial ) {
		if ( _serial ) {
			throw new Error( "Serial already set" );
		}

		var SerialPort = require("serialport").SerialPort;

		if ( serial instanceof SerialPort ) {
			_serial = serial;
		} else {
			_serial = new SerialPort( serial.port, serial );
		}
		
		_serial.on('data', _onSerialData );
		_serial.on('open', _onSerialOpen );
		//_serial.on('error', _onSerialError );
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
		command = (command & 120) >> 3;
		//console.log( "Got command", command );
		switch ( command ) {
			case Protocol.Return.Tick:
				self.emit('tick', arg0 );
			break;
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

	function _onSerialError( error ) {
		console.warn( "Serial Error", error );
	}

	function _writeSerial ( buffer ) {
		if ( _serial && _serialIsOpen ) {
			//_debug( "_writeSerial", buffer );
			_serial.write( buffer );
		} else {
			if ( !_serialOutBuffer )
				_serialOutBuffer = new Buffer (0);
			_serialOutBuffer = Buffer.concat( [ _serialOutBuffer, buffer ] );
		}
	}

	function _sendCommand ( command, arg0 ) {

		var numArgs = Math.max( 0, arguments.length - 2 );
		var firstByte = (( command & 0xf ) << 4 ) | ( arg0 & 0xf );
		var buf = new Buffer( 1 + numArgs );
		buf[0] = firstByte;
		

		for ( var i = 0; i < numArgs; i ++ ) {
			buf[i+1] = parseInt( arguments[i + 2] ) & 0xff;
		}
		_writeSerial( buf );

	}

	function _receiveBytes ( length, cb ) {
		var receiver = {
			buffer: new Buffer( numBytes),
			got: 0
		};
	}

	var commands = self;

	commands.pinMode = function ( pin, mode ) {
		pin = parseInt( pin );
		mode = parseInt( mode );
		_sendCommand( Protocol.Command.PinMode, mode, pin );
	}

	commands.digitalWrite = function ( pin, value ) {
		_sendCommand( Protocol.Command.DigitalWrite, value ? 1 : 0, pin );
	}

	commands.analogWrite = function ( pin, value ) {
		value = Convert.NumberToUint8( value );
		_sendCommand( Protocol.Command.AnalogWrite, 0, pin, value );
	}

	commands.analogRead = function ( pin, callback ) {

	}

	commands.setTick = setTick; 
	function setTick ( v ) {
		_sendCommand( Protocol.Command.setFlags, 0, v ? Protocol.Options.Tick : 0 );
	}

	commands.memWrite = memWrite;
	function memWrite ( offset, buffer ) {

		if ( buffer.length <= 0 )
			return;

		var size = buffer.length;

		size = size > 255 ? 255 : size;

		_sendCommand( Protocol.Command.MemWrite, 0 );
		_writeSerial( Convert.Uint16ToBuffer( offset ) );
		_writeSerial( Convert.Uint8ToBuffer( size ) );
		

		
		if ( size < buffer.length ) {
			_writeSerial( buffer.slice( 0, size ) );
			return commands.memWrite( offset + size, buffer.slice( size ) );
		} else {
			_writeSerial( buffer );
		}
	}

	commands.varConfig = varConfig;
	function varConfig ( varName, opt ) {
		if ( 'string' != typeof varName )
			throw new TypeError ( 'Invalid var name' );

		if ( opt == null ) {
			delete _variables[varName];
			return;
		}

		if ( 'number' != typeof opt.offset )
			throw new TypeError ( 'Invalid or unspecified offset' );

		if ( 'object' != typeof opt.type )
			throw new TypeError ( 'Invalid or unspecified type' );

		_variables[varName] = opt;
		opt.write = varWrite.bind( self, varName );
	}

	commands.varWrite = varWrite;
	function varWrite ( varName, value ) {
		var variable = _variables[varName];
		if ( !variable )
			throw new Error( 'Variable not found' );

		var buffer = variable.type.toBuffer( value );

		if ( !buffer )
			throw new Error( "Problem converting "+String(value) );

		var dims = variable.dims;
		if ( dims && dims.length ) {
			var indexes = _.toArray( arguments ).slice( 2 );

			setDimension( 0, variable.offset, variable.type.size );

			function setDimension( d, offset, stride ) {
				var isLeaf = d == dims.length;

				//console.warn ( "setDimension", d, offset, stride )

				if ( isLeaf ) {
					memWrite( offset, buffer )
				} else {
					var dim = dims[d];
					var index = parseInt( indexes[d] );
					if ( isNaN( index ) ) {
						for ( index = 0; index < dim; index ++ ) 
							setDimension( d + 1, offset + stride * index, stride * dim );
					} else {
						setDimension( d + 1, offset + stride * index, stride * dim );
					}
				}
			}

		} else {
			memWrite( variable.offset, buffer );
		}
	} 

	self.Protocol = Protocol;

}



module.exports = Ardnodeo;



