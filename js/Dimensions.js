/**
	Utilities to deal with n-dimensional arrays
*/

exports.parseDimensionsArguments = function ( variable, args, argsStart, allowCallback ) {
	var ret = {};

	var lastArg = args.length - 1;
	if ( allowCallback && 'function' == typeof args[lastArg] ) {
		ret.callback = args[lastArg];
		lastArg --;
	}

	var firstArg = args[argsStart];

	if ( firstArg && firstArg.stride && firstArg.dims ) {
		return firstArg;
	} else if ( Array.isArray( firstArg ) ) {
		ret.indexes = firstArg;
	} else {
		ret.indexes = [];
		for ( var i = argsStart; i <= lastArg; i ++ ) {
			var arg = args[i];
			if ( arg === null )
				arg = undefined;
			ret.indexes [i-argsStart] = arg;
		}
	}

	assertIndexesArray( ret.indexes );

	ret.variable = variable;
	ret.dims = variable.dims;

	if ( ret.indexes.length > ret.dims.length )
		throw new Error( 'too many dimensions' );

	for ( var i = ret.indexes.length; i < ret.dims.length; i ++ )
		ret.indexes[i] = undefined;

	ret.size = variable.type.size;
	ret.stride = ret.size;

	for ( var i = 0; i < ret.dims.length; i ++ )
		ret.stride *= ret.dims[i];

	return ret;
}


exports.walkDimensions = function ( callback, parsed, value ) {
	var dims = parsed.dims,
		indexes = parsed.indexes;

	return walk( 0, parsed.variable.offset, parsed.stride, value );

	function walk ( d, offset, stride, value ) {
		var isLeaf = d == dims.length;
		if ( isLeaf ) {
			if ( Array.isArray( value ) )
				throw new TypeError( 'Too many dimensions in value' );

			return callback( offset, value );
		} else {
			var dim = dims[d];
			stride /= dim;
			var index = parseInt( indexes[d] );
			if ( isNaN( index ) ) {
				var ret = []

				if ( Array.isArray( value ) ) {
					for ( index = 0; index < dim && index < value.length; index ++ ) {
						var v = Array.isArray( value ) ? value[index] : value;
						ret[index] = walk( d + 1, offset + stride * index, stride, value[index] );
					}	
				} else {
					for ( index = 0; index < dim; index ++ ) {
						var v = Array.isArray( value ) ? value[index] : value;
						ret[index] = walk( d + 1, offset + stride * index, stride, value );
					}	
				}			

				return ret;
			} else {
				return walk( d + 1, offset + stride * index, stride, value );
			}
		}
	}
};

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
