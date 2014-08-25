var onecolor = require('onecolor');

function clamp( v ) {
	v = parseFloat( v ) || 0;
	v = v < 0 ? 0 : v > 1 ? 1 : v;
	return v;	
}

exports.NumberToClamp8 = NumberToClamp8;
function NumberToClamp8  ( v ) {
	v = clamp( v );
	v = Math.floor( v * 255 );
	return v;
}

exports.NumberToClamp8 = NumberToClamp10;
function NumberToClamp10  ( v ) {
	v = clamp( v );
	v = Math.floor( v * 1023 );
	return v;
}

exports.Uint8ToBuffer = Uint8ToBuffer;
function Uint8ToBuffer ( v ) {
	v = Math.floor( v ) & 0xff;
	var buffer = new Buffer( 1 );
	buffer[0] = v;
	return buffer;
}

exports.uint16ToBuffer = uint16ToBuffer;
function uint16ToBuffer ( v ) {
	v = Math.floor( v ) & 0xffff;
	var buffer = new Buffer( 2 );
	buffer.writeUInt16LE( v, 0 );
	return buffer;
}

exports.Clamp8ToBuffer = Clamp8ToBuffer;
function Clamp8ToBuffer ( v ) {
	return Uint8ToBuffer( NumberToClamp8 ( v ) );
}

exports.Clamp10ToBuffer = Clamp10ToBuffer;
function Clamp10ToBuffer ( v ) {
	return Uint8ToBuffer( NumberToClamp10 ( v ) );
}

exports.ColourToRGBBuffer = ColourToRGBBuffer;
function ColourToRGBBuffer ( c ) {
	c = onecolor( c );

	if ( !c ) 
		return;

	var buf = new Buffer( 3 );
	buf[0] = NumberToClamp8( c.red() );
	buf[1] = NumberToClamp8( c.green() );
	buf[2] = NumberToClamp8( c.blue() );

	return buf;
}

function RGBToBuffer( r, g, b ) {
	var buf = new Buffer( 3 );
	buf[0] = NumberToClamp8( r );
	buf[1] = NumberToClamp8( g );
	buf[2] = NumberToClamp8( b );

	return buf;
}

