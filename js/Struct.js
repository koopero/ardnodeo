const 
	_ = require('underscore')
;

exports.createPacker = function ( members ) {
	var size = members.size;

	return function ( value ) {
		var buffer = new Buffer( size );
		buffer.fill( 0 );

		if ( !value )
			return value;

		members.forEach( function ( member ) {
			var key = member.name;
			var v = value[key];
			if ( v === undefined )
				return;

			member.writeBuffer( buffer, v );
		} )

		return buffer;
	}
}

exports.createWriter = function ( members ) {
	return function ( target, value, offset ) {
		if ( !value )
			return value;

		var realTarget;

		if ( !offset ) {
			realTarget = target;
		} else if ( Buffer.isBuffer( target ) ) {
			realTarget = target.slice( offset );;
		} else if ( 'function' == typeof target ) {
			realTarget = function ( targetOffset, value ) {
				target( offset + targetOffset, value );
			}
		} else {
			throw new Error("target must be Buffer or function(  ");
		}

		members.forEach( function ( member ) {
			var key = member.name;
			var v = value[key];
			if ( v === undefined )
				return;

			member.write( realTarget, v );
		} )

	}
}

exports.createUnpacker = function ( members ) {

	return function ( buffer, offset ) {
		offset = offset || 0;
		buffer = buffer.slice( offset );

		var unpacked = Object.create( null );

		members.forEach( function ( member ) {
			var key = member.name;
			unpacked[key] = member.readBuffer( buffer )
		} )

		return unpacked;
	};
}