var Convert = require('./Convert');

var Types = {
	Uint8: {
		length: 1,
		toBuffer: Convert.Uint8ToBuffer
	},
	Uint16: {
		length: 1,
		toBuffer: Convert.Uint16ToBuffer
	},
	Clamp8: {
		length: 1,
		toBuffer: Convert.Clamp8ToBuffer
	},
	Clamp10: {
		length: 2,
		toBuffer: Convert.Clamp10ToBuffer
	}
}

module.exports = Types;