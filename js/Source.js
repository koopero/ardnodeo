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



function removeComments ( source ) {
	source = source.replace( REGEX.COMMENTS_MULTILINE, '' );
	//source = source.replace( REGEX.COMMENTS_LINE, '' );
	
	return source;	
}


function ParseError ( error, subject ) {
	return new Error ( error + " "+subject );
}

function beginsWith ( haystack, needle ) {
	if ( haystack.substr( 0, needle.length ) == needle )
		return haystack.substr( needle.length );
}