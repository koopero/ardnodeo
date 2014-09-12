const
	_ = require('underscore'),
	async = require('async'),
	util = require('util'),
	Compiler = require('./Compiler'),
	Convert = require('./Convert'),
	Dimensions = require('./Dimensions'),
	Protocol = require('./Protocol'),
	Regulator = require('./Regulator'),
	Serial = require('./Serial'),
	Timecode = require('./Timecode'),
	Variable = require('./Variable')
;

util.inherits( Ardnodeo, require('events').EventEmitter );

var newLine = '\r\n';



function Ardnodeo ( opt ) {
	var self = this;

	// Private variables
	var 
		_connection,
		_serialInLine,
		_receiveQueue = [],
		_receiveCommand = 0,
		status = {},
		_variables = Object.create( null ),
		serialBufferSize = 32,
		outputRegulator = new Regulator( serialBufferSize ),
		timecodeReader = new (Timecode.Reader) (),
		compiler = new Compiler()
	;

	opt = opt || {};

	_connection = new Serial();
	addConnectionListeners( _connection );

	self.connection = _connection;

	self.vars = _variables;
	self.offsets = [];
	self.close = close;
	self.source = sourceFile;
	self.status = status;
	self._receiveQueue = _receiveQueue;
	self.setConnection = setConnection;
	self.outputRegulator = outputRegulator;


	function setConnection ( opt ) {
		_connection.open ( opt );
	}

	
	function close ( cb ) {

		sendImmediate( packOutput (
			packCommand( Protocol.setFlags, Protocol.opAnd ),
			~Protocol.connected
		) );


		_connection.close();
	}

	function addConnectionListeners( connection ) {
		connection.on('status', function () {
			setStatus( connection.status );
		});

		connection.on('data', onData );
		connection.on('open', function () {
			//console.warn('open');
			self.emit('open');
			sendImmediate( packCommand ( 
				Protocol.hello
			) );
			outputRegulator.allow = serialBufferSize;
			flushOutput ();
		});
	}


	
	function sourceFile ( file ) {
		throw new Error("Needs to be rethought");
		/*
		var Source = require('./Source');
		var parsed = Source.file( file );

		self.define = parsed.define;

		_.map( parsed.vars, function ( v, name ) {
			varConfig( name, v );
		});
		*/

	}


	function setStatus( newStatus ) {
		var changed = false;
		for ( var k in newStatus ) {
			if ( status[k] !== newStatus[k] ) {
				changed = true;
				status[k] = newStatus[k];
			}
		}

		if ( changed ) {
			self.emit('status', status );
		}
	}


	function onData ( data ) {
		var i = 0,
			k = data.length;

		if ( !k )
			return;

		//if ( data[0] != 0xa0 )
		//	console.log( _receiveCommand, data );

		if ( _receiveCommand ) {
			for ( var ri = 0; ri < _receiveQueue.length; ri ++ ) {
				var receiver = _receiveQueue[ri];

				if ( receiver.command && receiver.command != _receiveCommand )
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
					onData( data.slice( i ) );
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
				onData( data.slice( i + 1 ) );
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

		//process.stdout.write( "\r\0\0"+command+'\0' );
		
		
		switch ( command ) {
			case Protocol.timecode:
				_receiveCommand = Protocol.timecode;
				var size = arg0 + 1;
				size = 8;
				receiveBuffer( Protocol.timecode, size, function ( err, buffer ) {
					if ( !err ) {

						var tc = timecodeReader.readBuffer( buffer );
						self.timecode = tc;
						//console.warn( 'timecode', tc );
						self.emit( 'timecode', tc );
					}
				} );
			break;

			case Protocol.acknowledge:
				outputRegulator.allow = serialBufferSize;
				flushOutput();
			break;


			case Protocol.event :
				_receiveCommand = Protocol.event;
				receiveBuffer( Protocol.event, 1, function ( err, buffer ) {
					if ( err ) {
						var eventCode = buffer.readUInt8(0);
						self.emit( eventCode );
					}
				} );
			break;

			case Protocol.poke:
				onCommandPoke( arg0 )
			break;

			case Protocol.analogRead:

			break;

			case Protocol.digitalRead:
				
			break;



			case Protocol.peek:
				//console.log( "GOT PEEK" );
				_receiveCommand = Protocol.peek;
			break;


		}
	}

	function onCommandPoke ( arg0 ) {
		_receiveCommand = Protocol.poke;
		var size = arg0 + 1;
		var offsetBuffer = new Buffer( 2 );
		var inputBuffer = new Buffer( size );
		var offset;
		receiveBuffer( Protocol.poke, offsetBuffer, function ( err ) {
			offset = offsetBuffer.readUInt16LE( 0 );
			_receiveCommand = Protocol.poke;
		});
		receiveBuffer( Protocol.poke, inputBuffer, function ( err ) {
			if ( bufferSliceIsDifferent( self.memory, offset, inputBuffer ) ) {
				
				growMemory( offset + inputBuffer.length );
				inputBuffer.copy( self.memory, offset );
				var variable = varAtOffset( offset );
				if ( variable ) {
					if ( variable.listeners('change').length ) {
						var index = variable.offsetIndex( offset );
						variable.emit( 
							'change',
							variable.readLocal( index ),
							index
						);
					}
				}
			};


			//
		} );	
	}

	function receiveBuffer( command, buffer, cb ) {
		if ( 'number' == typeof buffer )
			buffer = new Buffer( buffer );

		_receiveQueue.push( {
			command: command,
			got: 0,
			buffer: buffer,
			callback: cb,
			time: new Date().getTime()
		});
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
				buffer.writeUInt8( arg & 0xff, 0 );
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
		if ( !_connection.write ) {
			setStatus( {
				writeError: true
			});
			return false;
		}
		
		var result = outputRegulator.write( _connection.write );
		setStatus( {
			writeError: false,
			bufferFull: !result
		});	
	}

	function sendImmediate( buffer ) {
		if ( _connection.write ) {
			//console.log( "sendImmediate", buffer );
			_connection.write( buffer );
			return true;
		}
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

	commands.sendEvent = sendEvent;
	function sendEvent ( eventCode ) {

	}

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
	function peek ( offset, buffer, cb ) {
		var size,
			end;

		// Default to peeking 1 byte
		if ( buffer === undefined )
			buffer = 1;

		if ( 'number' == typeof buffer ) {
			 size = buffer;
			 buffer = new Buffer(size);
			 buffer.fill(0);
		} else if ( buffer instanceof Buffer ) {
			size = buffer.length;
		} else {
			throw new Error ( "Parameter must be Buffer or length" );
		}

		end = offset + size; 
		growMemory( end );
		self.memory.copy( buffer, 0, offset, end);

		if ( size > 16 ) {
			var chunks = [];
			for ( var o = offset; o < end; o += 16 ) {
				var chunkEnd = Math.min( end, o + 16 );
				var chunkBuffer = 
				chunks.push( {
					offset: o,
					buffer: buffer.slice( o, chunkEnd )
				});
			}

			async.map( chunks, function ( chunk, cb ) {
				peek( chunk.offset, chunk.buffer, cb );
			}, function ( err ) {
				if ( cb )
					cb( err, buffer );
			});

		} else {
			queueOutput( packOutput( 
				packCommand( Protocol.peek, size - 1 ),
				Convert.uint16_t.Buffer( offset )
			) );

			receiveBuffer( Protocol.peek, buffer, function ( err, buffer ) {
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
		}

		return buffer;
	}

	commands.peekAll = peekAll;
	function peekAll( cb ) {
		return peek( 0, self.memory.length, cb );
	}


	commands.varConfig = varConfig;
	function varConfig ( varName, opt ) {
		if ( 'string' != typeof varName )
			throw new TypeError ( 'Invalid var name' );

		if ( opt == null ) {
			delete _variables[varName];
			return;
		}

		var variable = opt instanceof Variable ? opt : new Variable( varName, opt );

		_variables[varName] = variable;


		variable.write = varWrite.bind( self, varName );
		variable.read = varRead.bind( self, varName );
		variable.readLocal = varReadLocal.bind( self, varName );

		growMemory( variable.offset + variable.size );
	}

	commands.varAtOffset = varAtOffset;
	function varAtOffset( offset ) {
		for ( var varName in _variables ) {
			var variable = _variables[varName];
			if ( 
				variable.offset <= offset 
				&& variable.offset + variable.size > offset 
			)
				return variable;
		}
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

	/*
	commands.varWrite = varWrite;
	function varWrite ( varName, values, indexes, cb ) {
		var variable = getVar( varName );
		var type = variable.type;
		var dim = Dimensions.parseDimensionsArguments( variable, arguments, 2, true );

		Dimensions.walkDimensions( function ( offset, value ) {
			poke( offset, type.toBuffer( value ) );
		}, dim, values );
	}

	commands.varRead = varRead;
	function varRead( varName, indexes, cb ) {
		var variable = getVar( varName );
		var dim = Dimensions.parseDimensionsArguments( variable, arguments, 1, true );

		cb = dim.callback;

		var peekCalls = Dimensions.walkDimensions( function ( offset ) {
			return function ( cb ) {
				peek( offset, variable.type.size, cb );
			}
		}, dim );

		var finalCallback;
		if ( cb ) {
			finalCallback = function( err ) {
				if ( err )
					cb( err );
				else
					cb( null, varReadLocal( varName, dim.indexes ) );
			}
		} else {
			finalCallback = function () {};
		}

		if ( Array.isArray( peekCalls ) ) {
			peekCalls = _.flatten( peekCalls );
			async.parallel( peekCalls, finalCallback );
		} else {
			peekCalls( finalCallback );
		}
	} 

	commands.varReadLocal = varReadLocal;
	function varReadLocal( varName, indexes ) {
		var variable = getVar( varName );
		var dim = Dimensions.parseDimensionsArguments( variable, arguments, 1, false );
		var memory = self.memory;

		return Dimensions.walkDimensions( function ( offset ) {
			return variable.type.fromBuffer( memory, offset );
		}, dim );
	} 

	function getVar( varName ) {
		var variable = _variables[varName];
		if ( !variable )
			throw new Error( 'Variable not found '+varName );

		return variable;
	}
	*/


	commands.reset = reset;
	function reset () {
		sendImmediate( packOutput( 
			packCommand( Protocol.reset )
		) );
		_connection.reset();
	}	 

	self.Protocol = Protocol;

}

module.exports = Ardnodeo;


function bufferSliceIsDifferent( buffer1, buffer1Offset, buffer2 ) {
	for ( var i = 0; i < buffer2.length; i ++ ) {
		if ( buffer1[ buffer1Offset + i ] != buffer2[i] )
			return true;
	}

	return false;
}




