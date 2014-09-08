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
	return function ( buffer, value, offset ) {
		if ( !value )
			return value;

		buffer = buffer.slice( offset );

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