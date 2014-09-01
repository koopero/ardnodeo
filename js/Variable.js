const
	events = require('events'),
	util = require('util')
; 

const
	Types = require('./Types')
;

module.exports = Variable;

util.inherits( Variable, events.EventEmitter );
function Variable ( name, opt ) {
	if ( 'string' != typeof name )
		throw new TypeError ( 'Invalid var name' );

	if ( 'number' != typeof opt.offset )
		throw new TypeError ( 'Invalid or unspecified offset' );

	if ( 'string' == typeof opt.type )
		opt.type = Types[opt.type];

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

	_method( 'offsetIndex', offsetIndex );

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

	function offsetIndex( offset ) {
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