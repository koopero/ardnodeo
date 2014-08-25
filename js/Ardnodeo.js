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
		_receiveCommand = 0,
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
	self._receiveQueue = _receiveQueue;


	self.outputRegulator = outputRegulator;

	opt = opt || {};

	if ( opt.serial ) {
		setSerial( opt.serial );
	}

	
	function close ( cb ) {

		setTick( false );



		debug( "Closing time" );
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

		//if ( data[0] != 0xa0 )
		//	console.log( _receiveCommand, data );

		if ( _receiveCommand ) {
			for ( var ri = 0; ri < _receiveQueue.length; ri ++ ) {
				var receiver = _receiveQueue[ri];

				if ( receiver.command != _receiveCommand )
					continue;

				var need = receiver.buffer.length - receiver.got;
				var copy = k < need ? k : need;

				data.copy( receiver.buffer, receiver.got );

				receiver.got += copy;
				i += copy;

				if ( need == copy ) {
					_receiveCommand = 0;
					//console.log( "Got buffer", receiver );
					receiver.callback( null, receiver.buffer );
					_receiveQueue.splice( ri, 1 );
					_onSerialData( data.slice( i ) );
				}

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
		
		var arg0 = command & 0xf;
		command = (command & 0x70) >> 4;

		//console.log ( " COMANND", command );

		switch ( command ) {
			case Protocol.tick:
				self.emit('tick', arg0 );


			case Protocol.received:
				outputRegulator.allow = serialBufferSize;
				flushOutput();
			break;

			case Protocol.peek:
				//console.log( "GOT PEEK" );
				_receiveCommand = Protocol.peek;
			break;
		}
	}

	function receiveBuffer( command, buffer, cb ) {
		_receiveQueue.push( {
			command: command,
			got: 0,
			buffer: buffer,
			callback: cb,
			time: new Date().getTime()
		});
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
			packCommand( Protocol.digitalWrite, value ? 1 : 0 ),
			pin
		) );
	}

	commands.analogWrite = function ( pin, value ) {
		value = Convert.NumberToUint8( value );

		queueOutput( packOutput( 
			packCommand( Protocol.analogWrite ),
			pin,
			value
		) );
	}

	commands.analogRead = function ( pin, callback ) {

	}

	commands.setTick = setTick; 
	function setTick ( v ) {
		queueOutput( packOutput( 
			packCommand( Protocol.setFlags, v ? Protocol.Tick : 0 )
		) );
	}

	commands.poke = poke;
	function poke ( offset, buffer ) {
		growMemory( offset + buffer.length );
		buffer.copy( self.memory, offset );

		while ( buffer.length ) {
			size = buffer.length > 16 ? 16 : buffer.length;
			queueOutput( packOutput( 
				packCommand( Protocol.poke, size - 1 ),
				Convert.uint16_t.Buffer( offset ),
				buffer.slice( 0, size )
			) );
			buffer = buffer.slice( size );
		}
	}

	commands.peek = peek;
	function peek ( offset, size, cb ) {
		size = parseInt( size );
		size = isNaN( size ) ? 1 : size;
		
		growMemory( offset + size );

		var ret = new Buffer( size );
		ret.fill(0);

		self.memory.copy( ret, 0, offset, offset + size );
		
		queueOutput( packOutput( 
			packCommand( Protocol.peek, size - 1 ),
			Convert.uint16_t.Buffer( offset )
		) );

		receiveBuffer( Protocol.peek, ret, function ( err, buffer ) {
			//console.log( "peek return", err, buffer );
			if ( err ) {
				if ( cb )
					return cb( err );

				throw new Error("Unhandled fault on peek");
			}

			buffer.copy( self.memory, offset );

			if ( cb )
				cb( null, buffer );
		});

		return ret;
	}

	commands.varConfig = varConfig;
	function varConfig ( varName, _var ) {
		if ( 'string' != typeof varName )
			throw new TypeError ( 'Invalid var name' );

		if ( _var == null ) {
			delete _variables[varName];
			return;
		}

		if ( 'number' != typeof _var.offset )
			throw new TypeError ( 'Invalid or unspecified offset' );

		if ( 'object' != typeof _var.type )
			throw new TypeError ( 'Invalid or unspecified type' );

		_variables[varName] = _var;


		_var.write = varWrite.bind( self, varName );



		growMemory( _var.offset + _var.length );

	}

	function growMemory ( length ) {
		if ( !self.memory || self.memory.length < length ) {
			var newMirror = new Buffer( length );
			newMirror.fill( 0 );
			if ( self.memory )
				self.memory.copy( newMirror );
			self.memory = newMirror;
		}
	}

	commands.varWrite = varWrite;
	function varWrite ( varName, value ) {
		var variable = _variables[varName];
		if ( !variable )
			throw new Error( 'Variable not found '+varName );

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
					poke( offset, buffer )
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
			poke( variable.offset, buffer );
		}
	}

	commands.varRead = varRead;
	function varRead( varName, cb ) {
		var variable = _variables[varName];
		if ( !variable )
			throw new Error( 'Variable not found '+varName );

		if ( cb ) {
			var peekCallback = function ( err, buffer ) {
				if ( err )
					cb( err )
				else
					cb( null, variable.type.fromBuffer( buffer ) );
			}
		}

		var buffer = peek( variable.offset, variable.length, peekCallback );

		return variable.type.fromBuffer( buffer );
	} 


	commands.reset = reset;
	function reset () {
		_sendCommand( Protocol.reset, 0 );
	}	 

	self.Protocol = Protocol;

}



module.exports = Ardnodeo;



