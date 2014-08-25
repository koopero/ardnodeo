var _ = require('underscore');

var Convert = require('./Convert');

var Types = {};
module.exports = Types;

addType( 'bool', 		1 );
addType( 'int8_t', 		1, [ 'signed char', 'char' ] );
addType( 'uint8_t', 	1, [ 'unsigned char', 'byte' ] );
addType( 'int16_t', 	2, [ 'short', 'signed short' ] );
addType( 'uint16_t', 	2, [ 'unsigned short' ]	);
addType( 'int32_t', 	4, [ 'long', 'signed long'] );
addType( 'uint32_t', 	4, [ 'unsigned long' ] );
addType( 'float', 		4 );
addType( 'clamp8', 		1 );
addType( 'clamp10', 	2 );
addType( 'clamp12', 	2 );
addType( 'CRGB', 		3 );


function addType( name, size, aliases ) {
	var type = {
		name: name,
		size: size,
		toBuffer: Convert[name].Buffer,
		fromBuffer: Convert.Buffer[name]
	};

	Object.defineProperty( type, 'inspect', {
		value: function () {
			return '[Type: '+name+']'
		}
	});

	if ( !aliases )
		aliases = [ name ];
	else
		aliases.push( name );

	aliases.forEach( function ( alias ) {
		Types[alias] = type;
	} );
};

