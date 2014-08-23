const fs   = require('fs');
const path = require('path');	
const _ = require('underscore');
const _s = require('underscore.string');
const Types = require('./Types');


const REGEX = {
	DEFINE: /\#define\s*([a-zA-Z_][a-zA-Z0-9_]+)\s*(.*)/g,
	VARS_DECLARATION: /\/\/\s*\#ARDNODEO_VARS([\s\S]*)\/\/\s*\#\/ARDNODEO_VARS/,
	VAR_DEC: /\s*([a-zA-Z_][a-zA-Z0-9]+)\s*((\[(.*)\])*)$/,

}

exports.file = function ( file ) {
	var text = fs.readFileSync( file, { encoding: 'utf8' } );

	return parseSource( text );
}


function parseSource ( source ) {
	var parsed = {
		define: {}
	};

	var match;
	while ( match = REGEX.DEFINE.exec( source ) ) {
		var key = match[1];
		var value = match[2];
		var numVal = parseFloat( value );
		if ( !isNaN( numVal ) )
			value = numVal;

		parsed.define[key] = value;
	}

	console.log(parsed);


	var varsDeclaration = REGEX.VARS_DECLARATION.exec( source );
	if ( varsDeclaration ) {
		parsed.vars = parseVarsDeclaration( varsDeclaration[1], parsed );
	}


	return parsed;
}

function parseVarsDeclaration ( source, parsed ) {
	var offset = 0;
	var vars = {};

	var lines = source.split(';');

	lines.forEach( function ( line ) {
		var _var = parseVar( line, parsed );
		if ( _var ) {
			_var.offset = offset;
			offset += _var.size;
			vars[ _var.name] = _var;
		}
	});

	return vars;
}

function parseVar ( line, parsed ) {
	line = _s.trim( line );
	if ( !line || !line.length )
		return;

	var v = {};

	for ( var typeName in Types.aliases ) {
		var rest = beginsWith( line, typeName );
		if ( rest ) {
			v.type = Types.aliases[typeName];
			break;
		}
	}
	if ( !v.type )
		throw ParseError( "unknown type", line );

	var match = REGEX.VAR_DEC.exec( rest );
	if ( !match ) {
		throw ParseError( "can't understand declaration", line );
	}

	v.name = match[1];
	v.length = 1;
	v.dims = [];
	var dim = match[4];

	if ( dim ) {
		dim = dim.replace( /\s/, '' );

		var dims = dim.split( '][' );
		dims.forEach( function ( dim ) {

			if ( parsed.define[dim] )
				dim = parsed.define[dim];

			dim = parseInt( dim );
			if ( isNaN( dim ) )
				throw ParseError( "can't understand array dimension", dim );

			v.dims.push( dim );
			v.length *= dim;
		});
	}

	v.size = v.length * v.type.size;

	return v;
}


function parseStructLine ( line ) {
	
}

function parseStruct ( ) {
	
}

function isolateDeclaration ( v ) {
	
}

function beginsWith ( haystack, needle ) {
	if ( haystack.substr( 0, needle.length ) == needle )
		return haystack.substr( needle.length );
}