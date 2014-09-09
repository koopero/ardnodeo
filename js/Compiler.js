const 
	_ = require('underscore'),
	_s = require('underscore.string'),
	path = require('path'),
	prettyjson = require('prettyjson'),
	Parse = require('./Parse'),
	SourceCache = require('./SourceCache'),
	Struct = require('./Struct'),
	Type = require('./Type'),
	Variable = require('./Variable')
;


module.exports = Compiler;

function Compiler () {
	var self = this;

	// Private vars
	var 
		typeNames = [],
		typeDeclaration = {},
		typeCompiled = {},
		defines = {},
		cache = new SourceCache()
	;

	//
	//	Load primitives
	//
	_.map( require('./Primitives'), function ( primitive, typeName ) {
		declareType( typeName, primitive );
	});


	//
	//	Object setup
	//
	
	__publicProperty( 'typeNames', 			typeNames );

	__publicMethod  ( 'loadSource', 		loadSource );
	__publicMethod  ( 'define',				define );
	__publicMethod  ( 'compileVar', 		compileVar );
	__publicMethod  ( 'compileMembers', 	compileMembers );
	__publicMethod  ( 'compileType', 		compileType );
	
	__publicMethod  ( 'declareType', 		declareType );
	__publicMethod  ( 'getTypeDeclaration', getTypeDeclaration );


	function parse( dec, parser ) {
		if ( 'string' == typeof dec )
			dec = parser( dec, self );

		return dec;
	}

	//
	//	Definitions
	//

	function define( key, value, hide ) {
		if ( value !== undefined ) {
			defines[key] = value;
		}


		return defines[key];
	}

	//
	//	Loading Files
	//

	function loadSource( file, opt ) {
		opt = opt || {};
		_.defaults( opt, {
			removeComments: false,
			maxLevels: 8 
		});

		var loaded = {};

		_loadSource( file, opt );

		function _loadSource( file, opt ) {
			// Prevent loading single file multiple times
			if ( loaded[file] )
				return;
			else
				loaded[file] = true;

			_.defaults( opt, {
				removeComments: false
			});

			var source = cache.readFile( file );
			var dir = path.dirname( file );
				
			var parse = source;

			//
			// Remove Comments
			//

			if ( opt.removeComments )
				parse = Parse.removeComments( parse );

			//
			// Load includes
			//
			var includes = Parse.includes( parse );
			if ( includes.length ) {
				var includeOpt = _.clone( opt );
				includeOpt.maxLevels = opt.maxLevels - 1;


				includes.forEach( function ( includeFile ) {
					var filesToTry = possibleIncludeFiles( includeFile, dir );
					for ( var i in filesToTry ) {
						var file = filesToTry[i];
						_loadSource( file, includeOpt ); 
					}
				});
				
			}


			//
			// Get all #define
			//
			var defines = Parse.defines( source );
			_.map( defines, function ( value, key ) {
				define( key, value );
			} );

			//
			// Gather type declaration offsets
			//
			var declarationOffsets = Parse.gatherRegexOffsets( parse, Parse.REGEX.gatherTypedefs, Parse.REGEX.gatherStructs );
			
			Parse.forEachOffset( parse, declarationOffsets, function ( parse, offset ) {
				var parsed = Parse.typeDeclaration( parse );
				//console.log( "dec", parsed, parsed.input );
				declareType( parsed );
			});

			
		}


		//console.log( parse );
	}

	function possibleIncludeFiles ( include, dir ) {
		var ret = [];

		var fileName = include.file;
		var quoteType = include.quoteType;

		// Current directory
		add( path.resolve( dir, fileName ) );
		// TODO: Add other directories, most importantly Documents/Arduino/libraries

		return ret;

		function add( tryFile ) {
			ret.push( tryFile )
		}
	}


	//
	//	Compilers
	//

	function compileType( dec ) {
		//console.log( "COMPILE TYPE", dec );

		var typeName;
		if ( 'string' == typeof dec ) {
			typeName = dec;
			dec = getTypeDeclaration( typeName );
		} else {
			typeName = dec.typeName;
		}

		if ( typeCompiled[typeName] )
			return typeCompiled[typeName];

		var resolvedTypeName = typeName;
		while ( dec ) {
			//console.log( "Walk type", dec );

			if ( dec.groupType )
				break;

			if ( dec.type ) {
				dec = dec.type;
				break;
			}
		
			if ( dec.typeName ) {
				resolvedTypeName = dec.typeName;
				dec = getTypeDeclaration( resolvedTypeName ); 
				continue;
			}

			//console.log( "Can't compile type", dec );
			throw new Error("Can't find final declaration" );
		};
			

		if ( !dec )
			throw new Error( "Type not declared" );

		switch ( dec.parseType ) {
			case 'group':
				var members = compileGroup( dec );
				var type = new Type();
				type.size = members.size;
				type.name = typeName;
				type.isGroup = true;
				type.members = members;
				type.fromBuffer = Struct.createUnpacker( members );
				type.toBuffer = Struct.createPacker( members );
				type.writeBuffer = Struct.createWriter( members );

			return type;
		}

		console.log( "Can't compile type", dec );

		return CompileError( "Type format not compiled" );
	}

	function compileVar( dec, offset ) {
		dec = parse( dec, Parse.member );
		offset = parseInt( offset ) || 0;
		if ( 'string' == typeof dec )
			dec = Parse.member( dec, self );

		//console.log( "compileVar", dec, offset );

		var varOpt = {};
		varOpt.type = compileType( dec.memberType );

		if ( !varOpt.type )
			throw new Error( "Type not found! "+JSON.stringify( dec ) );

		varOpt.offset = parseInt(offset) || 0;
		varOpt.name = dec.name;
		varOpt.dims = compileDims( dec.dims )
		varOpt.comment = dec.comment;
		
		return new Variable( varOpt.name, varOpt );
	}

	function compileMembers( members, offset ) {
		if ( offset === undefined )
			offset = 0;

		members = parse( members, Parse.members );
		
		var size = 0;
		members = members.map( function ( member ) {
			var variable = compileVar( member, offset || 0 );
			if ( offset !== null )
				offset += variable.size;

			size = variable.offset + variable.size;
			return variable;
		});

		members = flattenMembers( members );

		if ( !isNaN( offset ) )
			members.size = size;

		members.printPretty = function ( ) {
			this.map( function ( variable ) {
				variable.printPretty();
			});
		}

		return members;

		function flattenMembers( members ) {
			var ret = [];
			members.forEach( function ( member ) {
				if ( member.name ) {
					ret.push( member );
				} else {
					var subMembers = member.type.members;
					
					subMembers = subMembers.map( function ( subMember ) {
						var varOpt = _.clone( subMember );
						varOpt.offset += member.offset;

						return new Variable( varOpt.name, varOpt );
					});



					ret = ret.concat( flattenMembers( subMembers ) );
				}
			});
			return ret;
		}
	}

	function compileGroup( dec ) {
		dec = parse( dec, Parse.group );

		var offset = dec.groupType == 'struct' ? 0 : null;
		var members = compileMembers( dec.members, offset );

		return members;
	}

	function compileDims( dims ) {
		if ( !dims )
			return [];

		return dims.dims.map( function ( dim ) {
			var num = parseInt( dim );
			if ( !isNaN( num ) && num >= 0 )
				return num;

			var defined = define( dim );
			if ( defined ) {
				num = Parse.integer( defined );

				if ( !isNaN( num ) && num >= 0 )
					return num;
			}

			throw new Error( "Invalid dimension "+dim );
		} );
	}

	//
	//	Error handling
	//

	function CompileError( ) {
	}


	//
	//	Type declaration
	//


	function declareType( typeName, type ) {
		if ( 'string' == typeof typeName && !type ) {
			// called with signature declareType( source )

			var parseDeclaration = Parse.typeDeclaration( typeName, self );
			return declareType( parseDeclaration.typeName, parseDeclaration.type );
		}

		if ( 'object' == typeof typeName ) {
			// called with signature declareType( type )

			var type = typeName;
			//console.log("type", type );
			typeName = type.typeName || type.name;
			if ( 'string' != typeof typeName || !typeName.length )
				throw new Error( "Invalid name in declaration" );

			return declareType( typeName, type );
		}


		// called with signature declareType( typeName, type )
		typeNames.push( typeName );
		var declaration;
		if ( type instanceof Type ) {
			typeCompiled[typeName] = type;
			declaration = {
				typeName: typeName,
				primitive: true
			};
		} else {
			declaration = type;
		}

		//console.log( "DECLARE", typeName, declaration );

		typeDeclaration[typeName] = declaration;

		return declaration;
	}

	function getTypeDeclaration( typeName ) {
		return typeDeclaration[typeName];
	}

	//
	//	Object setup helpers
	//
	function __publicMethod( methodName, method ) {
		Object.defineProperty( self, methodName, {
			value: method
		});
	}

	function __publicProperty( methodName, method ) {
		Object.defineProperty( self, methodName, {
			enumerable: true,
			value: method
		});
	}
}
