const 
	assert = require('assert')
;

const
	Compiler = require('../js/Compiler'),
	Variable = require('../js/Variable')
;
describe('Variable', function () {
	describe('indexAtOffset', function () {
		it('should work with a single variable', function () {
			var compiler = new Compiler();
			var single = compiler.compileVar( 'float single;', 3 );

			assert.deepEqual( single.indexAtOffset( 1 ), undefined );
			assert.deepEqual( single.indexAtOffset( 2 ), undefined );
			assert.deepEqual( single.indexAtOffset( 3 ), [] );
			assert.deepEqual( single.indexAtOffset( 4 ), [] );
			assert.deepEqual( single.indexAtOffset( 5 ), [] );
			assert.deepEqual( single.indexAtOffset( 6 ), [] );
			assert.deepEqual( single.indexAtOffset( 7 ), undefined );
		});

		it('should work with arrays', function () {
			var compiler = new Compiler();
			var array = compiler.compileVar( 'clamp12 array[5];', 2 );

			assert.deepEqual( array.indexAtOffset( 0 ), undefined );
			assert.deepEqual( array.indexAtOffset( 2 ), [ 0 ] );
			assert.deepEqual( array.indexAtOffset( 3 ), [ 0 ] );
			assert.deepEqual( array.indexAtOffset( 4 ), [ 1 ] );
			assert.deepEqual( array.indexAtOffset( 10 ), [ 4 ] );
			assert.deepEqual( array.indexAtOffset( 12 ), undefined );
		})
	});

	describe('readBuffer', function () {
		it('should read a single float', function () {
			var compiler = new Compiler();
			var single = compiler.compileVar( 'float single;', 3 );

			var value = Math.floor( Math.random() * 10000000);
			var buffer = new Buffer( 100 );
			buffer.writeFloatLE( value, 3 );

			assert.equal( value, single.readBuffer( buffer ) );
		});

		it('should read multiple bools', function () {
			var compiler = new Compiler();
			var variable = compiler.compileVar( 'bool bool[6];' );

			var buffer = new Buffer( [ 0, 1, 0, 1, 0, 1] );
			assert.deepEqual( [ false, true, false, true, false, true ], variable.readBuffer( buffer ) );
		});

		it('should read a struct', function () {
			var compiler = new Compiler();
			var variable = compiler.compileVar( 'struct { char a; char b; char c; } foo;' );

			var buffer = new Buffer( [ 10, 20, 40 ] );
			assert.deepEqual( { a: 10, b: 20, c: 40 }, variable.readBuffer( buffer ) );
		});

		it('should read a union', function () {
			var compiler = new Compiler();
			var variable = compiler.compileVar( 'union { char a; char b; char c; } foo;', 4 );

			var buffer = new Buffer( [ 0,0,0,0,13 ] );
			assert.deepEqual( { a: 13, b: 13, c: 13 }, variable.readBuffer( buffer ) );
		});
	});

	describe('writeBuffer', function () {
		it('should write a struct', function () {
			var compiler = new Compiler();
			var variable = compiler.compileVar( 'struct { char a; char b; char c; } foo;' );

			var buffer = new Buffer( 3 );
			buffer.fill( 0 );

			variable.writeBuffer( buffer, { a: 15, b: 20, c: 45 } );
			assert.equal( buffer[0], 15 );
			assert.equal( buffer[1], 20 );
			assert.equal( buffer[2], 45 );
		});

		it('should write an array index', function () {
			var compiler = new Compiler();
			var variable = compiler.compileVar( 'char foo[5];' );

			var buffer = new Buffer( 5 );
			buffer.fill( 0 );

			variable.writeBuffer( buffer, 5, 2 );
			assert.equal( buffer[0], 0 );
			assert.equal( buffer[1], 0 );
			assert.equal( buffer[2], 5 );

			variable.writeBuffer( buffer, 6, [1] );
			assert.equal( buffer[1], 6 );
		});

		it('should fill an array', function () {
			var compiler = new Compiler();
			var variable = compiler.compileVar( 'char foo[5];' );

			var buffer = new Buffer( 5 );
			buffer.fill( 0 );

			variable.writeBuffer( buffer, 25 );
			assert.equal( buffer[0], 25 );
			assert.equal( buffer[1], 25 );
			assert.equal( buffer[2], 25 );
		});

		it('should set a structure sparsely', function () {
			var compiler = new Compiler();
			var variable = compiler.compileVar( 'struct { char a; char b; char c; } foo;' );

			var buffer = new Buffer( 3 );
			buffer.fill( 60 );

			variable.writeBuffer( buffer, { c: 80 } );
			assert.equal( buffer[0], 60 );
			assert.equal( buffer[1], 60 );
			assert.equal( buffer[2], 80 );
		});
	});

});