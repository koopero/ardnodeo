const 
	assert = require('assert')
;

const
	Variable = require('../js/Variable')
;
describe('Variable', function () {
	describe('offsetIndex', function () {
		it('should work with a single variable', function () {
			var single = new Variable( 'var', {
				type: 'float',
				offset: 3
			});

			assert.deepEqual( single.offsetIndex( 1 ), undefined );
			assert.deepEqual( single.offsetIndex( 2 ), undefined );
			assert.deepEqual( single.offsetIndex( 3 ), [] );
			assert.deepEqual( single.offsetIndex( 4 ), [] );
			assert.deepEqual( single.offsetIndex( 5 ), [] );
			assert.deepEqual( single.offsetIndex( 6 ), [] );
			assert.deepEqual( single.offsetIndex( 7 ), undefined );
		});

		it('should work with arrays', function () {
			var array = new Variable( 'array', {
				type: 'clamp12', // size of 2
				offset: 2,
				dims: [ 5 ]
			});

			assert.deepEqual( array.offsetIndex( 0 ), undefined );
			assert.deepEqual( array.offsetIndex( 2 ), [ 0 ] );
			assert.deepEqual( array.offsetIndex( 3 ), [ 0 ] );
			assert.deepEqual( array.offsetIndex( 4 ), [ 1 ] );
			assert.deepEqual( array.offsetIndex( 10 ), [ 4 ] );
			assert.deepEqual( array.offsetIndex( 12 ), undefined );
		})
	});
});