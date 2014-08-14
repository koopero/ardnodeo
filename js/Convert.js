exports.NumberToUint8 = function ( v ) {
	v = parseFloat( v ) || 0;
	v = v < 0 ? 0 : v > 1 ? 1 : v;
	v = Math.floor( v * 255 );
	return v;
}