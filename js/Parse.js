const
	_ = require('underscore'),
	_s = require('underscore.string')
;


const REGEX = {
	SECTION: "\\/\\/\\s*\\#SECTION_NAME([\\s\\S]*)\\/\\/\\s*\\#\\/SECTION_NAME",
	VAR_LINE: /\s*(.*?);\s*(\/\/\s*(.*?)$)?/mg,

	typeDeclarations: [ /typedef\s+/g, /struct\s+[a-zA-Z_]/g ],
	commentsLine: /\/\/.*?$/mg,
	commentsMulti: /\/\*[\s\S]*?\*\//g,

	defines: /^\#define\s*([a-zA-Z_][a-zA-Z0-9_]+)\s*(.*)\s*$/gm,

	includes: /^#include\s+(["<].*?[">])\s*$/,
	enums: /(\w+)\s*=\s*((0[bx])?\d+)/gi,
	groupStart: /^([a-zA-Z_][a-zA-Z0-9_]*)*\s*\{/,
	whitespace: /^\s+/,
	memberName: /[a-zA-Z_]+[a-zA-Z0-9]*/,
	arrayDimensions: /^(\[.*\])*/,
	endLine: /^\s*;(\s*\/\/\s*(.*)\s*$)?/m,
	VAR_DEC: /\s*([a-zA-Z_][a-zA-Z0-9]+)\s*((\[(.*)\])*)$/,

}

var Parse = exports;

Parse.typeDeclaration = function ( source, compiler ) {
	var 
		parse = source,
		ret = {}
	;

	parse = stripWhitespaceAndComments( parse );

	var isTypedef = startsWith( parse, 'typedef' );
	if ( isTypedef ) {
		throw new Error ( "Not supported, yet")
		parse = isTypedef;
		var typeParse = Parse.type();
	}

	var type = Parse.type( parse, compiler );
	if ( type ) {
		ret.type = type;
		ret.typeName = type.typeName;
	}
	//TODO: Finish!

	return parsedResult( 'typeDeclaration', ret, source, parse, compiler );

}

Parse.type = function ( source, compiler ) {
	compiler = defaultCompiler( compiler );


	//
	//	Struct
	//

	var structParse = Parse.group( source, 'struct', compiler );
	if ( structParse ) {
		return structParse;
	}

	//
	//	Union
	//
	var unionParse = Parse.group( source, 'union', compiler );
	if ( unionParse ) {
		return unionParse;
	}


	var afterWhitespace = _s.ltrim( source );
	//
	//	Already defined type names
	//

	for ( var i in compiler.typeNames ) {
		var typeName = compiler.typeNames[i];

		if ( match = matchTokenLeft( afterWhitespace, typeName ) ) {
			return parsedResult( 'type', {
				parseType: 'type',
				typeName: match[0]
			}, source, match[1], compiler );
		}
	}

	throw new Error( "Type not found ("+source+")" )
}

Parse.member = function ( source, compiler ) {
	compiler = defaultCompiler( compiler );

	var parse = source;

	var ret = {};

	// Get the type
	var type = Parse.type( parse, compiler );
	parse = type.after;
	ret.memberType = type;


	// If the is a group, check for endline, indicating anonymous
	// struct or union
	if ( type.parseType == 'group' ) {

		var endLine = Parse.endOfLine( parse, true );
		if ( endLine ) {
			ret.comment = endLine.comment;
			parse = endLine.after;
			return parsedResult( 'member', ret, source, parse, compiler );
		}
	}


	var nameMatch = parseRegex( parse, REGEX.memberName );
	if ( !match )
		throw new Error( "Invalid member name")

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

	return parsedResult( 'member', ret, source, parse, compiler );
}

Parse.group = function ( source, groupType, compiler ) {
	compiler = defaultCompiler( compiler );
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
	ret.members = Parse.members( inBraces.inside, compiler );

	return parsedResult( 'group', ret, source, inBraces.after, compiler );
}

Parse.members = function ( source, compiler ) {
	var parse = source;

	compiler = defaultCompiler( compiler );
	var members = [];
	do {
		parse = stripWhitespaceAndComments( parse );
		if ( !parse.length )
			break;

		var member = Parse.member( parse, compiler );
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
			throw new Error( "Expected ;");
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
	a C compiler, including horrendous octal numbers.
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

	source.replace( REGEX.enums, function ( match, quotedFile ) {
		console.log( quotedFile );
	});

	return ret;

}

Parse.defines = function ( source ) {
	var ret = {};

	source.replace( REGEX.defines, function ( key, value ) {
		ret[key] = value;
	});

	return ret;
}

Parse.gatherRegexOffsets = function ( source, regex ) {
	var offsets = [];

	source.replace( regex, function ( match, offset ) {
		offsets.push( offset );
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


/**
	Return a prettier object with the results of a parse.
	The properties `input`, `compiler` and `after` are set
	as unemunerable to make for less verbose tracing of
	results.
*/

function parsedResult ( parseType, result, input, after, compiler ) {
	result.parseType = parseType;
	hide( 'after', after );
	hide( 'input', input );
	hide( 'compiler', compiler );

	return result;

	function hide( propertyName, value ) {
		Object.defineProperty( result, propertyName, {
			enumerable: false,
			value: value
		})
	}

}

function defaultCompiler( compiler ) {
	var Compiler = require('./Compiler');

	if ( compiler instanceof Compiler )
		return compiler;

	return new Compiler( compiler );
}

function stripWhitespaceAndComments( source ) {
	
	// TODO: Do comments

	return _s.ltrim( source );

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


