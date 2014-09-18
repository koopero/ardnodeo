const
	_ = require('underscore'),
	_s = require('underscore.string'),
	assert = require('chai').assert,
	colors = require('colors'),
	events = require('events'),
	util = require('util'),
	Dimensions = require('./Dimensions'),
	RegionList = require('./RegionList'),
	Type = require('./Type'),
	VariableList = require('./VariableList')
; 

colors.setTheme( {
	varType: 'green',
	varPrefix: 'grey',
	varName: 'bold',
	varOffset: 'grey',
	varDimBracket: 'red',
	varDim: 'yellow',
	varStrideBracket: 'blue',
	varStride: 'green',
	
	varComment: 'cyan'
});


module.exports = Variable;

util.inherits( Variable, events.EventEmitter );
function Variable ( opt ) {
	//
	//	Parse and validate options.
	//

	assert.isNumber( opt.offset, 'offset must be Number');
	assert.equal( opt.offset, Math.floor( opt.offset ), 'Offset be be integer');
	assert.instanceOf( opt.type, Type, 'Type must be instance of Type');

	if ( opt.stride ) {
		assert.isArray( opt.stride, "Predefined stride must be array" );
		opt.stride.forEach( function ( value ) {
			assert.typeOf( value, 'number', "Stride must be number" );
			assert.equal( value, Math.floor( value ), "stride must be integer" );
		});
	}

	if ( opt.dims ) {
		assert.isArray( opt.dims, "Dims must be array" );
		opt.dims.forEach( function ( value ) {
			assert.typeOf( value, 'number', "dim must be number" );
			assert.equal( value, Math.floor( value ), "dim must be integer" );
		});		
	}





	var self = this;

	var stride = opt.stride || [],
		dims = opt.dims || [],
		numDims = dims.length,
		length;


	length = 1;
	dims.forEach( function ( dim ) {
		length *= dim;
	});


	var strideCur = opt.type.size;
	for ( var i = numDims - 1; i >= 0; i -- ) {
		if ( !stride[i] ) {
			stride[i] = strideCur;
		}
		strideCur *= dims[i];
	}



	





	_const( 'name',	opt.name );
	_const( 'type', opt.type );
	_const( 'offset', opt.offset );
	_const( 'dims', dims );
	_const( 'stride', stride );

	if ( opt.comment ) {
		_const( 'comment', opt.comment );
	}





	_const( 'length', length );
	_const( 'size', self.type.size * self.length );
	_method( 'getOpt', getOpt );
	_method( 'indexAtOffset', indexAtOffset );
	_method( 'readBuffer', readBuffer );
	_method( 'write', write );
	_method( 'toBuffer', toBuffer );
	_method( 'printPretty', printPretty );
	_method( 'flatten', flatten );

	Object.defineProperty( self, 'value', {
		get: function () {
			return self.readLocal();
		},
		set: function ( value ) {
			self.write( value );
			return self.readLocal();
		}
	});

	//
	//	Methods
	//

	function getOpt() {
		return {
			name: self.name,
			type: self.type,
			offset: self.offset,
			comment: self.comment,
			dims: dims.concat(),
			stride: stride.concat(),
		};
	}

	function readBuffer( buffer, indexes ) {
		var dim = Dimensions.parseDimensionsArguments( self, arguments, 1, false );
		return Dimensions.walkDimensions( function ( offset ) {
			return self.type.fromBuffer( buffer, offset );
		}, dim );
	}

	function write( target, values, indexes ) {
		
		if ( Buffer.isBuffer( target ) ) {
			
			var buffer = target;
			
			target = function ( valueBuffer, offset ) {
				valueBuffer.copy( buffer, offset );
			};

		} else if ( 'function' != typeof target ) {
			throw new TypeError( "target must be Buffer or function" );
		}

		var dim = Dimensions.parseDimensionsArguments( self, arguments, 2, false );
		var sparse = self.type.isGroup;
		if ( sparse ) {
			return Dimensions.walkDimensions( function ( offset, value ) {
				self.type.write( target, value, offset );
			}, dim, values );
		} else {
			if ( !Array.isArray( values ) ) {

				// If values isn't an Array, we can do the conversion from
				// value to buffer once, instead of for every index.
				
				var valueBuffer = self.type.toBuffer( values );
				return Dimensions.walkDimensions( function ( offset ) {
					target( valueBuffer, offset );
				}, dim );
			} else {

				return Dimensions.walkDimensions( function ( offset, value ) {
					var valueBuffer = self.type.toBuffer( value );
					target( valueBuffer, offset );
				}, dim, values );
			}
		}
	}

	function toBuffer( values, index ) {
		var buffer = new Buffer( self.size );
		buffer.fill( 0 );
		var dim = Dimensions.parseDimensionsArguments( self, arguments, 1, false );
		write( buffer, values, dim );
		return buffer;
	}


	function indexAtOffset( offset ) {
		if ( offset < self.offset )
			return undefined;

		if ( !numDims )
			if ( offset < self.offset + self.type.size )
				return [];
			else
				return undefined;

		offset -= self.offset;

		var ret = [];

		for ( var i = 0; i < dims.length; i ++ ) {
			var index = Math.floor( offset / stride[i] );
			if ( index >= dims[i] || index < 0 )
				return;

			ret[i] = index;
			offset -= index * stride[i];
		}
		return ret;
	}

	function printPretty ( write, prefix, indent ) {
		if ( !write )
			write = process.stdout.write.bind( process.stdout );

		prefix = prefix || '';
		var v = self;
		var line = '';
		line += prettyHexShort( v.offset ).varOffset;
		line += ' ';
		line += prettyHexShort( v.offset + v.size ).varOffset;
		line += ' ';
		line += _s.pad( v.type.name, 16, ' ' ).varType;
		line += ' ';
		line += prefix.varPrefix;
		line += ( v.name ? v.name.varName : 'anonymous' );

		for ( var dim in v.dims ) {
			line +='['.varDimBracket+String(v.dims[dim]).varDim+']'.varDimBracket;
		}

		line += ' ';

		for ( var stride in v.stride ) {
			line +='{'.varStrideBracket+String(v.stride[stride]).varStride+'}'.varStrideBracket;
		}

		if ( v.comment ) {
			line += ('  // '+v.comment).varComment;
		}
		line += '\n';
		write( line );

		if ( false && self.type.members ) {
			_.map( self.type.members, function ( member ) {
				member.printPretty( write, prefix + ( v.name ? v.name+'.' : '.' ) );
			} );
		}

		function prettyHexShort ( num ) {
			return _s.pad( num.toString( 16 ), 4, '0' );
		}
	}

	function flatten( opt ) {

		//console.log(  "flatten", opt, self );

		opt = opt || {};
		opt.namePrefix = opt.namePrefix || '';
		opt.offset = opt.offset || 0;
		opt.stridePrefix = opt.stridePrefix || [];
		opt.dimsPrefix = opt.dimsPrefix || [];


		var ret = [];
		var selfOpt = self.getOpt();


		selfOpt.name = opt.namePrefix + selfOpt.name;
		selfOpt.offset += opt.offset;
		selfOpt.dims = opt.dimsPrefix.concat( selfOpt.dims );
		selfOpt.stride = opt.stridePrefix.concat( selfOpt.stride );



		var selfClone = new Variable( selfOpt );


		

		ret.push( selfClone )

		if ( self.type.isGroup ) {
			var memberOpt  = _.clone( opt );
			memberOpt.namePrefix = selfOpt.name ? selfOpt.name+'.' : '';
			memberOpt.offset = selfOpt.offset;
			memberOpt.dimsPrefix = selfOpt.dims;
			memberOpt.stridePrefix = selfOpt.stride;

			//console.log( "memberOpt", memberOpt );

			var membersRet = _.map( self.type.members, function ( member ) {
				var flattenedMember = member.flatten( memberOpt );
				return flattenedMember.array;
			});

			ret = ret.concat( _.flatten( membersRet ) );
		}



		ret = new VariableList( ret );
		return ret;
	}

	//
	//	Object setup helpers
	//
	function _const( name, value ) {
		Object.defineProperty( self, name, {
			enumerable: true,
			value: value
		});
	}

	function _method( name, value ) {
		Object.defineProperty( self, name, {
			value: value
		});
	}
}