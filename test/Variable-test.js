const 
	assert = require('chai').assert,
	Compiler = require('../js/Compiler'),
	Test = require('./Test'),
	Variable = require('../js/Variable'),
	VariableList = require('../js/VariableList')
;

describe('Variable', function () {
	describe('constructor', function () {
		it('will produce a list of strides per dimension for an array', function () {
			var compiler = new Compiler();
			var array = compiler.compileVar('float matrix[4][3];');

			assert.isArray( array.stride );
			assert.equal( array.stride[1], 4 );
			assert.equal( array.stride[0], 12 );
		});

		it('will produce a property `end`', function () {
			var compiler = new Compiler();
			var array = compiler.compileVar('float matrix[4][3];', 2);
			assert.equal( array.end, 4 * 4 * 3 + 2 );
		});

	});

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
		});

		it('should work with non-standard strides', function () {
			var compiler = new Compiler();
			var varOpt = compiler.compileVarOpt( 'clamp12 array[3][2];' );
			varOpt.stride = [20];
			varOpt.offset = 2;
			var array = new Variable( varOpt );

			assert.deepEqual( array.indexAtOffset( 0 ), undefined );
			assert.deepEqual( array.indexAtOffset( 2 ), [ 0, 0 ] );
			assert.deepEqual( array.indexAtOffset( 3 ), [ 0, 0 ] );
			assert.deepEqual( array.indexAtOffset( 4 ), [ 0, 1 ] );

			assert.deepEqual( array.indexAtOffset( 22 ), [ 1, 0 ] );
			
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

	describe('write', function () {
		it('should write a struct to a buffer', function () {
			var compiler = new Compiler();
			var variable = compiler.compileVar( 'struct { char a; char b; char c; } foo;' );

			var buffer = new Buffer( 3 );
			buffer.fill( 0 );

			variable.write( buffer, { a: 15, b: 20, c: 45 } );
			assert.equal( buffer[0], 15 );
			assert.equal( buffer[1], 20 );
			assert.equal( buffer[2], 45 );
		});

		it('should write a struct to a callback', function () {
			var compiler = new Compiler();
			var variable = compiler.compileVar( 'struct { char a; char b; char c; } foo;' );

			var callback = function ( buffer, offset ) {
				assert( Buffer.isBuffer( buffer ) );
				assert.equal( buffer[0], offset * 16 );
			};

			variable.write( callback, { a: 0, b: 16, c: 32 } );
		});


		it('should write an array index', function () {
			var compiler = new Compiler();
			var variable = compiler.compileVar( 'char foo[5];' );

			var buffer = new Buffer( 5 );
			buffer.fill( 0 );

			variable.write( buffer, 5, 2 );
			assert.equal( buffer[0], 0 );
			assert.equal( buffer[1], 0 );
			assert.equal( buffer[2], 5 );

			variable.write( buffer, 6, [1] );
			assert.equal( buffer[1], 6 );
		});

		it('should fill an array', function () {
			var compiler = new Compiler();
			var variable = compiler.compileVar( 'char foo[5];' );

			var buffer = new Buffer( 5 );
			buffer.fill( 0 );

			variable.write( buffer, 25 );
			assert.equal( buffer[0], 25 );
			assert.equal( buffer[1], 25 );
			assert.equal( buffer[2], 25 );
		});

		it('should write a structure to a buffer sparsely', function () {
			var compiler = new Compiler();
			var variable = compiler.compileVar( 'struct { char a; char b; char c; } foo;' );

			var buffer = new Buffer( 3 );
			buffer.fill( 60 );

			variable.write( buffer, { c: 80 } );
			assert.equal( buffer[0], 60 );
			assert.equal( buffer[1], 60 );
			assert.equal( buffer[2], 80 );
		});
	});

	describe('#flatten', function () {
		it('should flatten', function () {
			var file = Test.sourcePath( 'types.h' );
			var c = new Compiler();
			c.loadSource(  file );

			var variable = c.compileVar( 'sensorReading reading[5];')

			var members = variable.flatten();

			assert.instanceOf( members, VariableList );

			members.printPretty();
		});
	});

});















