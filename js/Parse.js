const
	_ = require('underscore'),
	_s = require('underscore.string'),
	colors = require('colors')
	Primitives = require('./Primitives')
;

colors.setTheme( {
	parseErrorSubject: 'red',
	parseErrorContext: 'yellow'
});

const REGEX = {
	sectionNamed: "\\/\\/\\s*\\#SECTION_NAME([\\s\\S]*)\\/\\/\\s*\\#\\/SECTION_NAME", // Regex source, not RegExp

	gatherTypedefs: /typedef\s+/g,
	gatherStructs: /struct\s+[a-zA-Z_]/g,
	commentsLine: /\/\/.*?$/mg,
	commentsMulti: /\/\*[\s\S]*?\*\//g,

	commentLine: /^\s*\/\/.*?$/m,
	commentMulti: /^\s*\/\*[\s\S]*?\*\//,

	defines: /^\#define\s*([a-zA-Z_][a-zA-Z0-9_]+)\s*(.*)\s*$/gm,
	complicatedDefine: /^\s*[\(]/,
	includes: /^#include\s+(["<].*?[">])\s*$/gm,
	enums: /(\w+)\s*=\s*((0[bx])?\d+)/gi,
	groupStart: /^([a-zA-Z_][a-zA-Z0-9_]*)*\s*\{/,
	typeName: /^\s*([a-zA-Z_]+[a-zA-Z0-9_]*)\s*/,
	whitespace: /^\s+/,
	memberName: /[a-zA-Z_]+[a-zA-Z0-9]*/,
	arrayDimensions: /^(\[.*\])*/,
	endLine: /^\s*;(\s*\/\/\s*(.*)\s*$)?/m,

	ArdnodeoData: /ArdnodeoData\s*<\s*([a-zA-Z_]+[a-zA-Z0-9_]*)\s*>\s*\((.*?)\)/
}

var Parse = exports;
Parse.REGEX = REGEX;


Parse.ArdnodeoData = function ( source ) {
	var match = REGEX.ArdnodeoData.exec( source );
	if ( match ) {
		return {
			typeName: match[1],
			varName: match[2]
		}
	}
}

Parse.typeDeclaration = function ( source ) {
	var 
		parse = source,
		ret = {}
	;

	parse = stripWhitespaceAndComments( parse );

	var isTypedef = startsWith( parse, 'typedef' );
	if ( isTypedef ) {
		parse = isTypedef;
	}

	var type =  Parse.type( parse );
	ret.type = type;
	ret.typeName = type.typeName;
	parse = type.after;

	if ( !isTypedef && ret.typeName ) {
		return parsedResult( 'typeDeclaration', ret, source, parse );
	}
	
	var nameMatch = parseRegex( parse, REGEX.typeName );
	if ( nameMatch ) {

		// Unfortunately, we've ignored any named structs
		// in the typedef, such as:
		// typedef struct foo { ... } bar;

		ret.typeName = nameMatch[1];
		parse = nameMatch.after;
	} else if ( !ret.typeName ) {
		return ParseError( 'typeDeclaration', "Type not named", parse, source );
	}

	var endOfLine = Parse.endOfLine( parse );
	parse = endOfLine.after;

	return parsedResult( 'typeDeclaration', ret, source, parse );

}

Parse.type = function ( source ) {

	var parse = source;

	parse = stripWhitespaceAndComments( parse );
	
	//
	//	Struct
	//

	var structParse = Parse.group( parse, 'struct' );
	if ( structParse ) {
		return structParse;
	}

	//
	//	Union
	//
	var unionParse = Parse.group( parse, 'union' );
	if ( unionParse ) {
		return unionParse;
	}


	parse = stripWhitespaceAndComments( parse );

	//
	//	Test for the names of primitives,
	//	since they are the only type names
	//	that can have spaces in them,
	//	aka: `unsigned char`
	//
	for ( var primitiveName in Primitives ) {
		if ( match = matchTokenLeft( parse, primitiveName ) ) {
			return parsedResult( 'type', {
				typeName: primitiveName
			}, source, match[1] );
		}
	}

	var nameMatch = parseRegex( parse, REGEX.typeName );

	if ( !nameMatch ) {
		throw new Error( "Invalid type name ("+source+")" );
	}

	return parsedResult( 'type', {
		typeName: nameMatch[1]
	}, source, nameMatch.after );
}


Parse.member = function ( source ) {

	var parse = source;

	var ret = {};

	// Get the type
	var type = Parse.type( parse );
	parse = type.after;
	ret.memberType = type;


	// If the is a group, check for endline, indicating anonymous
	// struct or union
	if ( type.parseType == 'group' ) {

		var endLine = Parse.endOfLine( parse, true );
		if ( endLine ) {
			ret.comment = endLine.comment;
			parse = endLine.after;
			return parsedResult( 'member', ret, source, parse );
		}
	}


	var nameMatch = parseRegex( parse, REGEX.memberName );
	if ( !nameMatch )
		throw new Error( "Invalid member name ("+parse+")");

	ret.name = nameMatch[0];

	parse = nameMatch.after;

	// Parse dimensions in format `[ whatever ][ whatever ]`
	var dimMatch = Parse.dims( parse );
	if ( dimMatch ) {
		ret.dims = dimMatch;
		parse = dimMatch.after;
	}

	var endOfLine = Parse.endOfLine( parse );

	ret.comment = endOfLine.comment;
	parse = endOfLine.after;

	return parsedResult( 'member', ret, source, parse );
}

Parse.group = function ( source, groupType ) {
	var parse = source,
		ret = {};

	ret.groupType = groupType;

	parse = stripWhitespaceAndComments( parse );
	parse = startsWith( parse, groupType );

	if ( !parse )
		return false;

	parse = stripWhitespaceAndComments( parse );


	var match = parseRegex( parse, REGEX.groupStart );
	if ( !match )
		throw new Error("Invalid group description" );

	ret.typeName = match[1];
	parse = match.after;

	var inBraces = Parse.untilRightBrace( parse );
	ret.members = Parse.members( inBraces.inside );

	return parsedResult( 'group', ret, source, inBraces.after );
}

Parse.members = function ( source ) {
	var parse = source;

	var members = [];
	do {
		parse = stripWhitespaceAndComments( parse );
		if ( !parse.length )
			break;

		var member = Parse.member( parse );
		if ( member ) {
			members.push( member );
			parse = member.after;
			continue;
		}
	} while ( parse.length );

	return members;
}

Parse.endOfLine = function ( source, silent ) {
	var ret = {};
	
	var match = REGEX.endLine.exec( source );
	if ( !match )
		if ( silent )
			return;
		else {
			return ParseError( 'endOfLine', "Expected ;", source );
		}

	ret.comment = _s.trim( match[2] || "" );	

	return parsedResult( 'endOfLine', ret, source, source.substr( match[0].length ) );
}

Parse.untilRightBrace = function ( source ) {
	var open = '{',
		close = '}',
		index = 0,
		level = 1,
		p = 0;

	do {
		var openInd = source.indexOf( open, index );
		var closeInd = source.indexOf( close, index );


		if ( openInd != -1 && openInd < closeInd ) {
			index = openInd + 1;
			level ++;
		} else if ( closeInd != -1 ) {
			index = closeInd + 1;
			level --;
		} else if ( level != 0 ) {
			throw new Error( "Level mismatch");
		}

		p ++;
	} while ( level );

	return parsedResult( 'untilRightBrace', {
		inside: source.substr( 0, index - 1),
		end: close 
	}, source, source.substr( index ) );
}

Parse.dims = function ( source ) {
	var match = parseRegex( source, REGEX.arrayDimensions );

	var dims = [];
	var dim = match[1];

	if ( dim ) {
		dim = dim.replace( /\s/, '' );
		dim = _s.trim( dim, '[]');
		var dims = dim.split( '][' );
		return parsedResult( 'dims', { 
			dims: dims
		}, source, match.after );
	}
};

Parse.section = function ( source, section ) {
	var regexSrc = REGEX.sectionNamed;

	// Needs to be done twice!
	regexSrc = regexSrc.replace( "SECTION_NAME", section );
	regexSrc = regexSrc.replace( "SECTION_NAME", section );
	
	var regex = new RegExp( regexSrc, 'g' );
	var match = regex.exec( source );

	//console.log( "GOT", section, regexSrc, regex, match );

	return match ? match[1] : '';
}

/**
	Greedily parse everything that looks like [name]=[number].
	Used to extract enum declarations such as:

		foo = 0x45,
		bar = 0b11
*/

Parse.enums = function ( source ) {
	var ret = {};
	source.replace( REGEX.enums, function ( match, name, num ) {
		ret[name] = parseInt( num );
	});

	return ret;		
}

/**
	Parse a string to an integer in the same fashion as
	a C compiler, including horrendous octal and binary numbers.
*/
Parse.integer = function ( str ) {
	if ( str[0] == '0' ) {
		if ( str[1] == 'x' || str[1] == 'X' )
			return parseInt( str );

		if ( str[1] == 'b' )
			return parseInt( str.substr( 2 ), 2 );

		// Octal fucking numbers. God help us.
		return parseInt( str.substr( 1 ), 8 );
	}

	return parseInt( str );
}

Parse.includes = function ( source ) {
	var ret = [];
	source.replace( REGEX.includes, function ( match, quotedFile ) {
		var leftQuote = quotedFile.substr( 0, 1 );
		var rightQuote = quotedFile.substr( -1 );
		var fileName = quotedFile.substr( 1, quotedFile.length - 2);
		ret.push( {
			file: fileName,
			quoteType: leftQuote
		})
	});

	return ret;

}

Parse.defines = function ( source ) {
	var ret = {};

	source.replace( REGEX.defines, function ( match, key, value ) {
		// Intentionally drop more complicated defines
		// such as macros.
		if ( !REGEX.complicatedDefine.test( value ) ) 
			ret[key] = value;
	});

	return ret;
}

Parse.gatherRegexOffsets = function ( source, regexMany ) {
	var offsets = [];

	for ( var i = 1; i < arguments.length; i ++ ) {
		var regex = arguments[i];
		source.replace( regex, function ( match, offset ) {
			offsets.push( offset );
		});
	}

	offsets.sort( function ( a, b ) {
		return a < b ? -1 : 1;
	});

	return offsets;
};

Parse.forEachOffset = function ( source, offsets, callback ) {
	return offsets.map( function ( offset ) { 
		return callback( source.substr( offset ), offset );
	});
};

Parse.removeComments = function ( source ) {
	var parse = source;
	parse = parse.replace( REGEX.commentsLine, '' );
	parse = parse.replace( REGEX.commentsMulti, '' );
	return parse;
}


function ParseError ( module, message, source, context ) {
	var error = new Error( module+": "+message );

	if ( source && context ) {
		var sourceOffset = context.indexOf( source );

		process.stderr.write( context.substr( 0, sourceOffset ).parseErrorContext );
		process.stderr.write( _s.truncate( source, 64 ).parseErrorSubject );
	}


	//console.log( "SOURCE\n\n",source );
	//console.log( "CONTEXT\n\n\n", context );

	throw error;
}

/**
	Return a prettier object with the results of a parse.
	The properties `input` and `after` are set
	as unemunerable to make for less verbose tracing of
	results.
*/

function parsedResult ( parseType, result, input, after ) {
	result.parseType = parseType;
	hide( 'after', after );
	hide( 'input', input );

	return result;

	function hide( propertyName, value ) {
		Object.defineProperty( result, propertyName, {
			enumerable: false,
			value: value
		})
	}

}


Parse.stripWhitespaceAndComments = stripWhitespaceAndComments;

function stripWhitespaceAndComments( source ) {
	var parse = source;
	var match;

	while ( true ) {
		var lineCommentMatch = REGEX.commentLine.exec( parse )
		
		if ( lineCommentMatch && lineCommentMatch.index == 0 ) {
			//console.log( "lineCommentMatch", lineCommentMatch );
			parse = parse.substr( lineCommentMatch[0].length );
			continue;
		}

		var whitespaceMatch = REGEX.whitespace.exec( parse );
		if ( whitespaceMatch ) {
			parse = parse.substr( whitespaceMatch[0].length );
			continue;
		}

		match = REGEX.commentMulti.exec( parse );
		if ( match ) {
			parse = parse.substr( match[0].length );
			continue
		}


		break;
	}


	return parse;

}

function parseRegex ( source, regex ) {
	var ret = regex.exec( source );
	if ( !ret )
		return

	var split = ret[0].length + ret.index;
	ret.after = source.substr( split );

	return ret;
}


function startsWith ( haystack, needle ) {
	if ( haystack.substr( 0, needle.length ) == needle ) {
		return haystack.substr( needle.length );
	}
}

/**
	Match any haystack that begins with needle followed by whitespace.
	Return [ needle, everything after whitespace ]
*/

function matchTokenLeft( haystack, needle ) {
	var k = needle.length,
		whitespace,
		match;

	if ( haystack.substr( 0, k ) != needle )
		return false;

	whitespace = haystack.substr( k );

	match = REGEX.whitespace.exec( whitespace );
	if ( !match )
		return false; 

	k += match[0].length;
	
	return [ haystack.substr( 0, needle.length ), haystack.substr( k ) ];
}


