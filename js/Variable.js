const
	_ = require('underscore'),
	_s = require('underscore.string'),
	colors = require('colors'),
	events = require('events'),
	util = require('util'),
	Dimensions = require('./Dimensions')
; 

colors.setTheme( {
	varType: 'green',
	varPrefix: 'grey',
	varName: 'bold',
	varOffset: 'grey',
	varDimBracket: 'red',
	varDim: 'yellow',
	varComment: 'cyan'
});


module.exports = Variable;

util.inherits( Variable, events.EventEmitter );
function Variable ( name, opt ) {

	//if ( 'string' != typeof name )
	//	throw new TypeError ( 'Invalid var name' );

	if ( 'number' != typeof opt.offset )
		throw new TypeError ( 'Invalid or unspecified offset' );

	if ( 'object' != typeof opt.type )
		throw new TypeError ( 'Invalid or unspecified type' );

	var self = this;

	_const( 'name',	name );
	_const( 'type', opt.type );
	_const( 'offset', opt.offset );
	_const( 'dims', opt.dims || [] );

	if ( opt.comment ) {
		_const( 'comment', opt.comment );
	}



	var length = 1;
	self.dims.forEach( function ( dim ) {
		length *= dim;
	});

	_const( 'length', length );
	_const( 'size', self.type.size * self.length );
	_method( 'indexAtOffset', indexAtOffset );
	_method( 'readBuffer', readBuffer );
	_method( 'writeBuffer', writeBuffer );
	_method( 'toBuffer', toBuffer );
	_method( 'printPretty', printPretty );

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

	function readBuffer( buffer, indexes ) {
		var dim = Dimensions.parseDimensionsArguments( self, arguments, 1, false );
		return Dimensions.walkDimensions( function ( offset ) {
			return self.type.fromBuffer( buffer, offset );
		}, dim );
	}

	function writeBuffer( buffer, values, indexes ) {
		var dim = Dimensions.parseDimensionsArguments( self, arguments, 2, false );

		var sparse = self.type.isGroup;

		if ( sparse ) {
			return Dimensions.walkDimensions( function ( offset, value ) {
				self.type.writeBuffer( buffer, value, offset );
			}, dim, values );
		} else {
			if ( !Array.isArray( values ) ) {
				var valueBuffer = self.type.toBuffer( values );
				return Dimensions.walkDimensions( function ( offset ) {
					valueBuffer .copy( buffer, offset );
				}, dim );
			} else {
				var value = self.type.toBuffer( values );
				return Dimensions.walkDimensions( function ( offset, value ) {
					var valueBuffer = self.type.toBuffer( value );
					valueBuffer.copy( buffer, offset );
				}, dim, values );
			}
		}
	}

	function toBuffer( values, index ) {
		var buffer = new Buffer( self.size );

		var dim = Dimensions.parseDimensionsArguments( self, arguments, 1, false );
		writeBuffer( buffer, values, dim );
		return buffer;
	}


	function indexAtOffset( offset ) {
		if ( offset < self.offset )
			return;

		if ( offset >= self.offset + self.size )
			return;

		offset -= self.offset;

		var ret = [];
		var stride = self.size;

		for ( var i = 0; i < self.dims.length; i ++ ) {
			var dim = self.dims[i];
			stride /= dim;

			var index = Math.floor( offset / stride );
			ret[i] = index;
			offset -= index * stride;
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

		if ( v.comment ) {
			line += ('  // '+v.comment).varComment;
		}
		line += '\n';
		write( line );

		if ( self.type.members ) {
			_.map( self.type.members, function ( member ) {
				member.printPretty( write, prefix + ( v.name ? v.name+'.' : '.' ) );
			} );
		}

		function prettyHexShort ( num ) {
			return _s.pad( num.toString( 16 ), 4, '0' );
		}
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