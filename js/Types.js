var _ = require('underscore');

var Convert = require('./Convert');

var Types = {
	Uint8: {
		size: 1,
		alias: [ 'unsigned char', 'uint8_t', 'byte' ],
		toBuffer: Convert.Uint8ToBuffer
	},
	Int8: {
		size: 1,
		alias: [ 'signed char', 'char', 'int8_t' ]
	},

	Uint16: {
		size: 2,
		alias: ['short', 'unsigned short', 'int16_t' ],
		toBuffer: Convert.Uint16ToBuffer
	},
	Int16: {
		size: 2,
		alias: ['short', 'signed short', 'int16_t' ]
	},

	Uint32: {
		size: 2,
		alias: ['unsigned long', 'uint32_t' ],
		toBuffer: Convert.Uint32ToBuffer
	},
	Int32: {
		size: 2,
		alias: ['long', 'signed long', 'int32_t' ]
	},


	"float": {
		size: 4,
		toBuffer: Convert.floatToBuffer
	},

	Clamp8: {
		size: 1,
		toBuffer: Convert.Clamp8ToBuffer
	},
	Clamp10: {
		size: 2,
		toBuffer: Convert.Clamp10ToBuffer
	},
	Clamp12: {
		size: 2,
		toBuffer: Convert.Clamp12ToBuffer
	},

	CRGB: {
		size: 3,
		toBuffer: Convert.ColourToRGBBuffer
	}
}

_.map( Types, function ( type, name ) {
	type.name = name;
	Object.defineProperty( type, 'inspect', {
		value: function () {
			return '[Type: '+name+']'
		}
	});
} );


var aliases = {};
_.map( Types, function ( type, name ) {
	aliases[name] = type;
	if ( type.alias ) {
		type.alias.forEach( function ( name ) {
			aliases[name] = type;
		});
	}
} );



Object.defineProperty( Types, 'aliases', {
	value: aliases
});

module.exports = Types;