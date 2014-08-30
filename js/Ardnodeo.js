const
	Convert = require('./Convert'),
	Protocol = require('./Protocol'),
	Regulator = require('./Regulator'),
	Serial = require('./Serial'),
	_ = require('underscore'),
	async = require('async'),
	util = require('util');

util.inherits( Ardnodeo, require('events').EventEmitter );

var newLine = '\r\n';



function Ardnodeo ( opt ) {
	var self = this;

	// Protected variables
	var 
		_connection,
		_serialInLine,
		_receiveQueue = [],
		_receiveCommand = 0,
		status = {},
		_variables = Object.create( null ),
		serialBufferSize = 32,
		outputRegulator = new Regulator( serialBufferSize )
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
		sendImmediate(
			packCommand( Protocol.setFlags, 0 )
		);

		_connection.close();
	}

	function addConnectionListeners( connection ) {
		connection.on('status', function () {
			setStatus( connection.status );
		});

		connection.on('data', onData );
		connection.on('open', function () {
			self.emit('open');
			outputRegulator.allow = serialBufferSize;
			flushOutput ();
		});
	}


	
	function sourceFile ( file ) {
		var Source = require('./Source');
		var parsed = Source.file( file );

		self.define = parsed.define;

		_.map( parsed.vars, function ( v, name ) {
			varConfig( name, v );
		});


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
		
		//console.log( "Got command", command, Protocol );

		switch ( command ) {
			case Protocol.Tick:
				//console.log( "tick");

				self.emit('tick', arg0 );


			case Protocol.status:
				//console.log( "received!");
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
	function varWrite ( varName, values, indexes, cb ) {
		var variable = _variables[varName];
		if ( !variable )
			throw new Error( 'Variable not found '+varName );

		var type = variable.type;

		var lastArg = arguments.length - 1;
		if ( 'function' == typeof arguments[lastArg] ) {
			cb = arguments[lastArg];
			lastArg --;
		}

		var inds;
		if ( Array.isArray( indexes ) ) {
			inds = indexes;
		} else {
			inds = [];
			for ( var i = 2; i <= lastArg; i ++ ) {
				inds[i-2] = arguments[i];
			}
		}

		assertIndexesArray( inds );

		var dims = variable.dims;
		var stride = variable.type.size;

		for ( var i = 0; i < dims.length; i ++ )
			stride *= dims[i];


		setDimension( 0, values, variable.offset, stride );

		function setDimension( d, value, offset, stride ) {
			var isLeaf = d == dims.length;

			//console.warn ( "setDimension", d, offset, stride )

			if ( isLeaf ) {
				if ( Array.isArray( value ) )
					throw new TypeError( 'Too many dimension in value' );

				if ( value === undefined )
					return;

				poke( offset, type.toBuffer( value ) );
			} else {
				var dim = dims[d];
				stride /= dim;
				var index = parseInt( inds[d] );
				if ( isNaN( index ) ) {
					for ( index = 0; index < dim; index ++ ) {
						v = Array.isArray( value ) ? value[index] : value;
						setDimension( d + 1, v, offset + stride * index, stride );
					}
				} else {
					setDimension( d + 1, value, offset + stride * index, stride );
				}
			}
		}

	}

	commands.varRead = varRead;
	function varRead( varName, indexes, cb ) {
		var variable = _variables[varName];
		if ( !variable )
			throw new Error( 'Variable not found '+varName );

		var type = variable.type;

		var lastArg = arguments.length - 1;
		if ( 'function' == typeof arguments[lastArg] ) {
			cb = arguments[lastArg];
			lastArg --;
		}

		var inds;
		if ( Array.isArray( indexes ) ) {
			inds = indexes;
		} else {
			inds = [];
			for ( var i = 2; i <= lastArg; i ++ ) {
				inds[i-2] = arguments[i];
			}
		}

		if ( cb ) {
			var peekCallback = function ( err ) {
				if ( err )
					cb( err )
				else
					cb( null, varReadLocal( varName, inds ) );
			}
		}

		return varReadLocal( varName, inds );
	} 

	commands.varReadLocal = varReadLocal;
	function varReadLocal( varName ) {
		var variable = _variables[varName];
		if ( !variable )
			throw new Error( 'Variable not found '+varName );

		var dims = variable.dims;
		var inds = _.toArray( arguments ).slice( 1 );

		var memory = self.memory;

		if ( inds > dims.length ) 
			throw new Error( 'Too many dimensions' );


		var stride = variable.type.size;
		for ( var i = 0; i < dims.length; i ++ )
			stride *= dims[i];

		return getDimension( 0, variable.offset, stride );

		function getDimension ( d, offset, stride ) {
			var isLeaf = d == dims.length;
			if ( isLeaf ) {
				return variable.type.fromBuffer( memory, offset );
			} else {
				var dim = dims[d];
				stride /= dim;
				var index = parseInt( inds[d] );
				if ( isNaN( index ) ) {
					var ret = []
					for ( index = 0; index < dim; index ++ ) 
						ret[index] = getDimension( d + 1, offset + stride * index, stride );

					return ret;
				} else {
					return getDimension( d + 1, offset + stride * index, stride );
				}
			}
		}

	} 


	commands.reset = reset;
	function reset () {
		queueOutput( packOutput( 
			packCommand( Protocol.reset )
		) );
	}	 

	self.Protocol = Protocol;

}

module.exports = Ardnodeo;


function assertIndexesArray ( arr ) {
	for ( var i = 0; i <  arr.length; i ++ ) {
		var val = arr[i];
		if ( val === null || val === undefined ) 
			continue;

		if ( Array.isArray( val ) ) {
			assertIndexesArray( val );
			continue;
		}

		if ( 'number' != typeof val )
			throw new TypeError( 'Index must be number or null' );

		if ( val != parseInt( val ) )
			throw new TypeError( 'Index must be integer' );
	}

}



