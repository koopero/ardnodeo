var Protocol = require('./Protocol');
var Convert = require('./Convert');
var Regulator = require('./Regulator');
var _ = require('underscore');

var async = require('async');

var util = require('util');

util.inherits( Ardnodeo, require('events').EventEmitter );

var newLine = '\r\n';



function Ardnodeo ( opt ) {
	var self = this;

	// Protected variables
	var 
		_serial,
		_serialWrite,
		_serialInLine,
		_receiveQueue = [],
		status = {},
		_variables = Object.create( null ),
		outputRegulator = new Regulator( 10000 ),
		serialBufferSize = 60
	;


	self.vars = _variables;
	self.offsets = [];
	self.close = close;
	self.source = sourceFile;
	self.setSerial = setSerial;
	self.status = status;


	self.outputRegulator = outputRegulator;

	opt = opt || {};

	if ( opt.serial ) {
		setSerial( opt.serial );
	}

	
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


	
	function sourceFile ( file ) {
		var Source = require('./Source');
		var parsed = Source.file( file );

		self.define = parsed.define;

		_.map( parsed.vars, function ( v, name ) {
			varConfig( name, v );
		});
	}


	
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
		
		var arg0 = command & 7;
		command = (command & 120) >> 3;

		switch ( command ) {
			case Protocol.Return.Tick:
				self.emit('tick', arg0 );


			case 5 :
				outputRegulator.allow = serialBufferSize;
				flushOutput();
			break;
		}
	}

	function _onSerialOpen () {
		status.serialOpen = true;
		_serialWrite = _serial.write.bind( _serial );
		flushOutput ();
	}

	function _onSerialError( error ) {
		console.warn( "Serial Error", error );
	}


	function packOutput () {
		var buffers = [];

		for ( var i = 0; i < arguments.length; i++ ) {
			var arg = arguments[i];
			var buffer;
			if ( arg instanceof Buffer )
				buffer = arg;
			else if ( 'number' == typeof arg ) {
				buffer = new Buffer( 1 )
				buffer[1] = arg;
			} else if ( 'string' == typeof arg ) {
				buffer = new Buffer( arg, 'ascii' );
			} else
				throw new Error( "bad input" );

			buffers.push( buffer );
		}

		return Buffer.concat( buffers );
	}

	function queueOutput ( buffer ) {
		outputRegulator.push( buffer );
		flushOutput();
	}

	function flushOutput () {
		if ( !_serialWrite ) {
			status.writeError = true;
			return false;
		}

		status.writeError = false;
		
		var result = outputRegulator.write( _serialWrite );
		status.bufferFull = !result;
	}

	function packCommand ( command, arg0 ) {
		if ( !command )
			throw new Error( 'Invalid command' );

		var numArgs = Math.max( 0, arguments.length - 2 );
		var firstByte = (( command & 0xf ) << 4 ) | ( arg0 & 0xf );
		var buf = new Buffer( 1 );
		buf[0] = firstByte;
		
		return buf;
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
		queueOutput( packOutput( 
			packCommand( Protocol.pinMode, mode ),
			pin
		) );
	}

	commands.digitalWrite = function ( pin, value ) {
		queueOutput( packOutput( 
			packCommand( Protocol.Command.DigitalWrite, value ? 1 : 0 ),
			pin
		) );
	}

	commands.analogWrite = function ( pin, value ) {
		value = Convert.NumberToUint8( value );

		queueOutput( packOutput( 
			packCommand( Protocol.Command.AnalogWrite ),
			pin,
			value
		) );
	}

	commands.analogRead = function ( pin, callback ) {

	}

	commands.setTick = setTick; 
	function setTick ( v ) {
		queueOutput( packOutput( 
			packCommand( Protocol.setFlags, v ? Protocol.Options.Tick : 0 )
		) );
	}

	commands.memWrite = memWrite;
	function memWrite ( offset, buffer ) {
		while ( buffer.length ) {
			size = buffer.length > 16 ? 16 : buffer.length;
			queueOutput( packOutput( 
				packCommand( Protocol.poke, size - 1 ),
				Convert.uint16ToBuffer( offset ),
				buffer.slice( 0, size )
			) );
			buffer = buffer.slice( size );
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


	commands.reset = reset;
	function reset () {
		_sendCommand( Protocol.Command.reset, 0 );
	}	 

	self.Protocol = Protocol;

}



module.exports = Ardnodeo;



