const 
	fs = require('fs'),
	path = require('path'),
	_ = require('underscore'),
	_s = require('underscore.string'),
	Types = require('./Types'),
	Variable = require('./Variable')
;

const REGEX = {
	DEFINE: /\#define\s*([a-zA-Z_][a-zA-Z0-9_]+)\s*(.*)/g,
	SECTION: "\\/\\/\\s*\\#SECTION_NAME([\\s\\S]*)\\/\\/\\s*\\#\\/SECTION_NAME",
	VAR_LINE: /\s*(.*?);\s*(\/\/\s*(.*?)$)?/mg,
	VAR_DEC: /\s*([a-zA-Z_][a-zA-Z0-9]+)\s*((\[(.*)\])*)$/,
	COMMENTS_MULTILINE: /\/\*.*?\*\//mg,
	COMMENTS_LINE: /\/\/.*?$/mg,
	ENUM_DEC: /(\w+)\s*=\s*(\d+)/g,
	isStruct: /struct\s+([a-zA-Z_][a-zA-Z0-9]+)\s*\{/

}

exports.REGEX = REGEX;




exports.file = function ( file ) {
	var text = loadFile ( file );

	return parseSource( text );
}

exports.loadFile = loadFile;
function loadFile ( file ) {
	return fs.readFileSync( file, { encoding: 'utf8' } );
}

exports.isolateSection = isolateSection;
function isolateSection ( source, section ) {
	var regexSrc = REGEX.SECTION;

	// Needs to be done twice!
	regexSrc = regexSrc.replace( "SECTION_NAME", section );
	regexSrc = regexSrc.replace( "SECTION_NAME", section );
	
	var regex = new RegExp( regexSrc, 'g' );
	var match = regex.exec( source );

	//console.log( "GOT", section, regexSrc, regex, match );

	return match ? match[1] : '';
}

exports.getEnums = getEnums;
function getEnums( source ) {
	var ret = {};
	source.replace( REGEX.ENUM_DEC, function ( match, name, num ) {
		ret[name] = parseInt( num );
	});

	return ret;
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


	var varsDeclaration = isolateSection( source, "ARDNODEO_VARS" );

	if ( varsDeclaration ) {
		parsed.vars = parseVarsDeclaration( varsDeclaration, parsed );
	}


	return parsed;
}



function parseVarsDeclaration ( source, parsed ) {
	var offset = 0;
	var vars = {};

	source = removeComments( source );


	var match;
	while ( match = REGEX.VAR_LINE.exec( source ) ) {
		var line = match[1];
		var _var = parseVar( line, parsed );
		if ( _var ) {
			_var.comment = match[3];
			_var.offset = offset;
			

			_var = new Variable( _var.name, _var );
			offset += _var.size;

			vars[ _var.name] = _var;			
		}
	}

	return vars;
}

function removeComments ( source ) {
	source = source.replace( REGEX.COMMENTS_MULTILINE, '' );
	//source = source.replace( REGEX.COMMENTS_LINE, '' );
	
	return source;	
}

function parseVar ( line, parsed ) {
	line = _s.trim( line );
	if ( !line || !line.length )
		return;

	var v = {};

	for ( var typeName in Types ) {
		var rest = beginsWith( line, typeName );
		if ( rest ) {
			v.type = Types[typeName];
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
		});
	}

	return v;
}

function ParseError ( error, subject ) {
	return new Error ( error + " "+subject );
}

function beginsWith ( haystack, needle ) {
	if ( haystack.substr( 0, needle.length ) == needle )
		return haystack.substr( needle.length );
}