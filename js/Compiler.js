const 
	_ = require('underscore'),
	prettyjson = require('prettyjson'),
	Parse = require('./Parse'),
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
		typeCompiled = {}
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

		while ( dec && dec.parseType == 'type' ) 
			dec = getTypeDeclaration( dec.typeName );

		if ( !dec )
			throw new Error( "Type not declared" );

		switch ( dec.parseType ) {
			case 'group':
				var members = compileGroup( dec );
				var type = new Type();
				type.size = members.size;
				type.name = dec.typeName;
				type.isGroup = true;
				type.members = members;
				type.fromBuffer = Struct.createUnpacker( members );
				type.toBuffer = Struct.createPacker( members );
				type.writeBuffer = Struct.createWriter( members );

			return type;
		}
	}

	function compileVar( dec, offset ) {
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
			var variable = compileVar( member, offset );
			offset += variable.size;
			size = variable.offset + variable.size;
			return variable;
		});

		if ( !isNaN( offset ) )
			members.size = size;

		members.printPretty = function ( ) {
			this.map( function ( variable ) {
				variable.printPretty();
			});
		}

		return members;
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

			num = parseInt( define( dim ) );

			if ( !isNaN( num ) && num >= 0 )
				return num;

			throw new Error( "Invalid dimensions" );
		} );
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
