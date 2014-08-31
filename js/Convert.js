var onecolor = require('onecolor');


exports.Buffer = {
	bool: function ( buffer, offset ) {
		return buffer[ offset || 0 ] != 0;
	},
	int8_t: function ( buffer, offset ) {
		return buffer.readInt8( offset || 0 );
	},
	uint8_t: function ( buffer, offset ) {
		return buffer.readUInt8( offset || 0 );
	},
	int16_t: function ( buffer, offset ) {
		return buffer.readInt16LE( offset || 0 );
	},
	uint16_t: function ( buffer, offset ) {
		return buffer.readUInt16LE( offset || 0 );
	},
	int32_t: function ( buffer, offset ) {
		return buffer.readInt32LE( offset || 0 );
	},
	uint32_t: function ( buffer, offset ) {
		return buffer.readUInt32LE( offset || 0 );
	},
	float: function ( buffer, offset ) {
		return buffer.readFloatLE( offset || 0 );
	},
	clamp8: function ( buffer, offset ) {
		var v = buffer.readUInt8( offset || 0 );
		return v / 255;
	},
	clamp10: function ( buffer, offset ) {
		var v = buffer.readUInt16LE( offset || 0 );
		return v / 1024;
	},
	clamp12: function ( buffer, offset ) {
		var v = buffer.readUInt16LE( offset || 0 );
		return v / 4096;
	},
	CRGB: function ( buffer, offset ) {
		offset = offset || 0;

		var r = buffer.readUInt8(offset+0);
		var g = buffer.readUInt8(offset+1);
		var b = buffer.readUInt8(offset+2);

		return new onecolor.RGB( r / 255, g / 255, b / 255 );
	},
	timecode: function ( buffer, offset ) {
		offset = offset || 0;
		
		return 
			buffer.readUInt32LE( offset + 0 ) / 1000;
	}
}

exports.bool = {
	Buffer: function ( v ) {
		var ret = new Buffer( 1 );
		ret[0] = v ? 1 : 0;
		return ret;		
	} 
}

exports.int8_t = {
	Buffer: function ( v ) {
		var buffer = new Buffer( 1 );
		buffer.writeInt8( v, 0, true );
		return buffer;
	}
}


exports.uint8_t = {
	Buffer: function ( v ) {
		var buffer = new Buffer( 1 );
		buffer.writeUInt8( v, 0, true );
		return buffer;		
	}
}


exports.int16_t = {
	Buffer: function ( v ) {
		var buffer = new Buffer( 2 );
		buffer.writeInt16LE( v, 0, true );
		return buffer;		
	}
}


exports.uint16_t = {
	Buffer: function ( v ) {
		var buffer = new Buffer( 2 );
		buffer.writeUInt16LE( v, 0, true );
		return buffer;				
	}
}


exports.int32_t = {
	Buffer: function ( v ) {
		var buffer = new Buffer( 4 );
		buffer.writeInt32LE( v, 0, true );
		return buffer;				
	}
}


exports.uint32_t = {
	Buffer: function ( v ) {
		var buffer = new Buffer( 4 );
		buffer.writeUInt32LE( v, 0, true );
		return buffer;			
	}
}

exports.float = {
	Buffer: function ( v ) {
		var buffer = new Buffer( 4 );
		buffer.writeFloatLE( v, 0, true );
		return buffer;			
	}
}

exports.clamp8 = {
	Buffer: function ( v ) {
		return uint8ToBuffer( clamp8( v ) );
	}
}

exports.clamp10 = {
	Buffer: function ( v ) {
		v = clamp( v );
		return uint16ToBuffer( v * 1023 );
	}
}

exports.clamp12 = {
	Buffer: function ( v ) {
		v = clamp( v );
		return uint16ToBuffer( v * 4095 );
	}
}

exports.CRGB = {
	Buffer: function ( c ) {
		c = onecolor( c );

		if ( !c ) 
			return;

		var buf = new Buffer( 3 );
		buf[0] = clamp8( c.red() );
		buf[1] = clamp8( c.green() );
		buf[2] = clamp8( c.blue() );

		return buf;	
	}
}

function clamp( v ) {
	v = parseFloat( v ) || 0;
	v = v < 0 ? 0 : v > 1 ? 1 : v;
	return v;	
}

function clamp8( v ) {
	return clamp( v ) * 255;
}

function uint8ToBuffer ( v ) {
	v = Math.floor( v ) & 0xff;
	var buffer = new Buffer( 1 );
	buffer[0] = v;
	return buffer;
}

function uint16ToBuffer ( v ) {
	v = Math.floor( v ) & 0xffff;
	var buffer = new Buffer( 2 );
	buffer.writeUInt16LE( v, 0 );
	return buffer;
}

