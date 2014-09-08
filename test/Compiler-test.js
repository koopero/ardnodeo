const
	assert = require('chai').assert,
	Compiler = require('../js/Compiler'),
	Type = require('../js/Type'),
	Variable = require('../js/Variable')
;

describe('Compiler', function () {
	it('comes preloaded with type names', function () {
		var compiler = new Compiler();
		assert( Array.isArray( compiler.typeNames ) );
		assert( compiler.typeNames.indexOf( 'uint8_t' ) != -1 );
	});


	describe('declareType', function () {
		it('will remember a type declaration', function () {
			var compiler = new Compiler();
			compiler.declareType( "struct Vector3c8 { char x; char y; char x; };");


			var type = compiler.getTypeDeclaration( 'Vector3c8' );
			//console.log( "Type is\n", JSON.stringify( type, null, 2 ) );
		});
	});

	describe('compileVar', function () {
		it('will compile a primitive type', function () {
			var compiler = new Compiler();
			var compiled = compiler.compileVar( 'unsigned char foo; // Hello' );

			assert.instanceOf( compiled, Variable );
			assert.instanceOf( compiled.type, Type );
			assert.equal( compiled.size, 1 );
			assert.equal( compiled.name, 'foo' );
			assert.equal( compiled.comment, 'Hello' );
			//compiled.printPretty();
		});

		it('will compile an array', function () {
			var compiler = new Compiler();
			var compiled = compiler.compileVar( 'clamp10 array[3];' );

			assert.instanceOf( compiled, Variable );
			assert.instanceOf( compiled.type, Type );
			assert.equal( compiled.size, 6 );
			assert.equal( compiled.name, 'array' );
			//compiled.printPretty();
		});

		it('will compile a struct', function () {
			var compiler = new Compiler();
			var compiled = compiler.compileVar( 'struct { float bar; float baz; } foo;' );
			
			assert.isFunction( compiled.toBuffer );
		});

		it('will compile a predeclared struct', function () {
			var compiler = new Compiler();
			compiler.declareType( "struct SuperVector { float x; char y; short x; struct { char foo; char bar; }; };");

			var declaration = compiler.getTypeDeclaration( 'SuperVector' );

			var compiled = compiler.compileVar( 'SuperVector foo;' );
			assert.isFunction( compiled.toBuffer );
		});

		it('will flatten anonymous struct', function () {
			var compiler = new Compiler();
			var compiled = compiler.compileVar( 'struct { float bar; struct { float baz; float blah; }; } foo;' );
			assert.equal( compiled.type.members.length, 3 );
		});

		it('will flatten anonymous union', function () {
			var compiler = new Compiler();
			var compiled = compiler.compileVar( 'struct { float bar; union { float baz; float blah; }; } foo;' );
			assert.equal( compiled.type.members.length, 3 );
			assert.equal( compiled.type.members[2].offset, 4 );
		});


	});

	describe('compileMembers', function () {
		it('will compile a list of primitive variables', function () {
			var compiler = new Compiler();
			var compiled = compiler.compileMembers( 'clamp8 foo; clamp10 bar; float baz; // Comment for baz' );
			//compiled.printPretty();
		});

	});

	/*
	describe('compileType', function () {
		it('will compile a primitive type', function () {
			var compiler = new Compiler();
			var compiled = compiler.compileType( 'unsigned char' );
			assert.equal( compiled.size, 1 );
			assert.equal( compiled.name, 'uint8_t' );
			assert.isFunction( compiled.toBuffer );
		});

		it('will compile a struct', function () {
			var compiler = new Compiler();
			compiler.declareType( "struct Vector3c8 { char x; char y; char x; };");
			var compiled = compiler.compileType( 'Vector3c8' );

			assert.isFunction( compiled.toBuffer );
		});
	});
	*/
});

