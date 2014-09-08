const 
	assert = require('assert'),
	Compiler = require('../js/Compiler'),
	Dimensions = require('../js/Dimensions'),
	Variable = require('../js/Variable' )
;


describe( 'Dimensions', function () {

	var fakeOffset = 6;

	//
	//	Fake variables. Offsets don't really matter.
	//
	var compiler = new Compiler();
	var newVar = compiler.compileVar;
	var variables = {
		'single': newVar( 'float single;', fakeOffset ),
		'array': newVar( 'char array[13];', fakeOffset ),
		'matrix': newVar( 'float matrix[3][4];', fakeOffset )
	};

	//
	//	Fake versions of varRead, varReadLocal and varWrite
	//
	var read = function ( varName, indexes, cb ) {
		return Dimensions.parseDimensionsArguments( variables[varName], arguments, 1, true );
	};
	var readLocal = function ( varName, indexes ) {
		return Dimensions.parseDimensionsArguments( variables[varName], arguments, 1, false );
	};
	var write = function ( varName, value, indexes, cb ) {
		return Dimensions.parseDimensionsArguments( variables[varName], arguments, 2, true );
	};

	describe( 'parseDimensionsArguments', function () {
		//
		//	Actual tests
		//

		it('should default to all dimensions', function () {
			var result;

			result = read( 'single' );
			assert.deepEqual( result.indexes, [] );

			result = read('array');
			assert.deepEqual( result.indexes, [ undefined ] );

			result = write('matrix',null);
			assert.deepEqual( result.indexes, [ undefined, undefined ] );
		});

		it('should parse proper indexes', function () {
			var result;

			result = read('array', 1 );
			assert.deepEqual( result.indexes, [ 1 ] );

			result = write('array', null, [1] );
			assert.deepEqual( result.indexes, [ 1 ] );


			result = read('matrix', 2 );
			assert.deepEqual( result.indexes, [ 2, undefined ] );

			result = read('matrix', null, 3 );
			assert.deepEqual( result.indexes, [ undefined, 3 ] );
			
			result = read('matrix', [ 3, 4 ] );
			assert.deepEqual( result.indexes, [ 3, 4 ] );
			
		});


		it('should throw on too many dimensions', function () {
			var expectException = /too many/

			assert.throws( 
				function () {
					read( 'array', 1, 2 );
				},
				expectException
			);

			assert.throws( 
				function () {
					read( 'matrix', [ 1, 2, 3 ] );
				},
				expectException
			);
		});

		it('should throw on invalid indexes', function () {
			assert.throws( 
				function () {
					read( '', 'foo' );
				},
				TypeError
			);

			assert.throws( 
				function () {
					readLocal( '', function () {} );
				},
				TypeError
			);
		});
	});

	describe( 'walkDimensions', function () {
		it('should walk single indexes', function () {
			var parse,
				calls;

			parse = read( 'single' );
			calls = 0;

			var result = Dimensions.walkDimensions( function ( offset ) {
				assert.equal( offset, fakeOffset );
				calls ++;
				return 5;
			}, parse );

			assert.equal( result, 5 );
			assert.equal( calls, 1 );

			parse = read( 'array', 1 );
			calls = 0;

			var result = Dimensions.walkDimensions( function ( offset ) {
				assert.equal( offset, fakeOffset + 1 );
				calls ++;
				return 5;
			}, parse );

			assert.equal( result, 5 );
			assert.equal( calls, 1 );
		});

		it('should walk entire arrays', function () {
			var parse,
				calls,
				retValue = 6;

			parse = read( 'array' );
			calls = 0;

			var result = Dimensions.walkDimensions( function ( offset ) {
				calls ++;
				return retValue;
			}, parse );

			assert.equal( calls, variables.array.length );	
			assert( Array.isArray( result ) );
			assert.equal( result.length, variables.array.length );
			assert.equal( result[1], retValue );
		});

		it('should pass along constant value', function () {
			var parse,
				calls,
				setValue = 7;

			parse = write( 'array', setValue );
			calls = 0;

			Dimensions.walkDimensions( function ( offset, value ) {
				assert.equal( value, setValue );
				calls ++;
			}, parse, setValue );

			assert.equal( calls, variables.array.length );	
		});

		it('should pass along array values', function () {
			var parse,
				calls,
				setValue = [ 33, 44, 55 ];

			parse = write( 'array', setValue );
			calls = 0;

			Dimensions.walkDimensions( function ( offset, value ) {
				var index = offset - fakeOffset;
				assert.equal( value, setValue[index] );
				calls ++;
			}, parse, setValue );

			assert.equal( calls, setValue.length );	
		});

	});
});