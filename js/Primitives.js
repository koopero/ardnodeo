const 
	_ = require('underscore'),
	Convert = require('./Convert'),
	Type = require('./Type')
;

var Primitives = {};
module.exports = Primitives;


//
//	Define primitives
//

addPrimitive( 'bool', 		1 );
addPrimitive( 'int8_t', 	1, [ 'signed char', 'char' ] );
addPrimitive( 'uint8_t', 	1, [ 'unsigned char', 'byte' ] );
addPrimitive( 'int16_t', 	2, [ 'short', 'signed short' ] );
addPrimitive( 'uint16_t', 	2, [ 'unsigned short' ]	);
addPrimitive( 'int32_t', 	4, [ 'long', 'signed long'] );
addPrimitive( 'uint32_t', 	4, [ 'unsigned long' ] );
addPrimitive( 'float', 		4 );
addPrimitive( 'clamp8', 	1, ['clamp8_t'] );
addPrimitive( 'clamp10', 	2, ['clamp10_t'] );
addPrimitive( 'clamp12', 	2, ['clamp12_t'] );
addPrimitive( 'CRGB', 		3 );


function addPrimitive( name, size, aliases ) {
	var type = new Type({
		name: name,
		size: size,
		toBuffer: Convert[name].Buffer,
		fromBuffer: Convert.Buffer[name]
	});

	if ( !aliases )
		aliases = [ name ];
	else
		aliases.push( name );

	aliases.forEach( function ( alias ) {
		Primitives[alias] = type;
	} );
};

