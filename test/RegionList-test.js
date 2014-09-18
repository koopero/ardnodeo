const
	assert = require('chai').assert,
	RegionList = require('../js/RegionList')
;

describe( "RegionList", function () {
	describe( "#add", function () {
		it("should add a region", function () {
			var list = new RegionList();

			assert.equal( list.length, 0 );

			assert.equal( list.add( 10, 20 ), 0 );

			assert.equal( list.start(0), 10 );
			assert.equal( list.end  (0), 20 );
			assert.equal( list.length, 1 );
		});


		it("should add two seperate regions in order", function () {
			var list = new RegionList();

			assert.equal( list.add( 10, 20 ), 0 );
			assert.equal( list.add( 30, 40 ), 1 );
			

			assert.equal( list.start(0), 10 );
			assert.equal( list.end  (0), 20 );
			assert.equal( list.start(1), 30 );
			assert.equal( list.end  (1), 40 );
			assert.equal( list.length, 2 );
		});

		it("should add two seperate regions out of order", function () {
			var list = new RegionList();

			assert.equal( list.add( 30, 40 ), 0 );
			assert.equal( list.add( 10, 20 ), 0 );
			
			assert.equal( list.start(0), 10 );
			assert.equal( list.end  (0), 20 );
			assert.equal( list.start(1), 30 );
			assert.equal( list.end  (1), 40 );
			assert.equal( list.length, 2 );
		});

		it("should add a region that adds to start of an existing region", function () {
			var list = new RegionList();

			assert.equal( list.add( 20, 40 ), 0 );
			assert.equal( list.add( 10, 30 ), 0 );
			
			assert.equal( list.start(0), 10 );
			assert.equal( list.end  (0), 40 );
			assert.equal( list.length, 1 );
		});

		it("should add a region that adds to end of an existing region", function () {
			var list = new RegionList();

			assert.equal( list.add( 0, 10 ), 0 );
			assert.equal( list.add( 20, 40 ), 1 );
			assert.equal( list.add( 30, 50 ), 1 );
			
			assert.equal( list.start(1), 20 );
			assert.equal( list.end  (1), 50 );
			assert.equal( list.length, 2 );
		});

		it("should add a region that bridges two regions", function () {
			var list = new RegionList();

			assert.equal( list.add( 10, 20 ), 0 );
			assert.equal( list.add( 30, 40 ), 1 );

			assert.equal( list.add( 20, 30 ), 0 );
			
			assert.equal( list.start(0), 10 );
			assert.equal( list.end  (0), 40 );
			assert.equal( list.length, 1 );
		});


		it("should add a region that overlaps a region", function () {
			var list = new RegionList();

			assert.equal( list.add( 20, 30 ), 0 );
			assert.equal( list.add( 10, 40 ), 0 );

			assert.equal( list.start(0), 10 );
			assert.equal( list.end  (0), 40 );
			assert.equal( list.length, 1 );
		});


		it("should not add a region in the middle of another region", function () {
			var list = new RegionList();

			assert.equal( list.add( 10, 40 ), 0 );
			assert.equal( list.add( 20, 30 ), 0 );

			assert.equal( list.start(0), 10 );
			assert.equal( list.end  (0), 40 );
			assert.equal( list.length, 1 );
		});

		it("should add a region that overlaps two regions", function () {
			var list = new RegionList();

			assert.equal( list.add( 20, 30 ), 0 );
			assert.equal( list.add( 40, 50 ), 1 );
			assert.equal( list.add( 70, 80 ), 2 );
			
			assert.equal( list.add( 20, 60 ), 0 );
			
			assert.equal( list.start(0), 20 );
			assert.equal( list.end  (0), 60 );
			assert.equal( list.start(1), 70 );
			assert.equal( list.end  (1), 80 );
			assert.equal( list.length, 2 );
		});

		it("should remove one list from another", function () {
			var remove = new RegionList();
			remove.add( 10, 20 );
			remove.add( 30, 40 );
			
			var from = new RegionList();
			from.add( 0, 50 );

			from.remove( remove );

			assert.equal( from.length, 3 );
			assert.equal( from.start(0), 0 );
			assert.equal( from.end  (0), 10 );

			assert.equal( from.start(1), 20 );
			assert.equal( from.end  (1), 30 );

			assert.equal( from.start(2), 40 );
			assert.equal( from.end  (2), 50 );

		});
	});

	describe("#remove", function () {
		it("should remove a region", function () {
			var list = new RegionList();

			list.add( 10, 20 );
			//console.log( "before", list.list );
			//list.debug = true;
			list.remove( 10, 20 );

			assert.equal( list.length, 0 );
		});

		it("should remove a few regions", function () {
			var list = new RegionList();

			list.add( 10, 20 );
			list.add( 30, 40 );
			list.add( 50, 60 );
			//console.log( "before", list.list );
			//list.debug = true;
			list.remove( 30, 60 );
			//console.log( "after", list.list );

			assert.equal( list.length, 1 );
			assert.equal( list.start(0), 10 );
			assert.equal( list.end  (0), 20 );
		});

		it("should trim a region right", function () {
			var list = new RegionList();

			list.add( 10, 30 );
			//console.log( "before", list.list );
			//list.debug = true;
			list.remove( 20, 30 );
			//console.log( "after", list.list );

			assert.equal( list.length, 1 );
			assert.equal( list.start(0), 10 );
			assert.equal( list.end  (0), 20 );
		});

		it("should trim a region left", function () {
			var list = new RegionList();

			list.add( 20, 40 );
			//console.log( "before", list.list );
			//list.debug = true;
			list.remove( 10, 30 );
			//console.log( "after", list.list );

			assert.equal( list.length, 1 );
			assert.equal( list.start(0), 30 );
			assert.equal( list.end  (0), 40 );
		});


		it("should split a region", function () {
			var list = new RegionList();

			list.add( 10, 60 );
			assert.equal( list.length, 1 );


			//console.log( "before", list.list );
			//list.debug = true;
			list.remove( 30, 50 );
			//console.log( "after", list.list );
			

			assert.equal( list.length, 2 );
			assert.equal( list.start(0), 10 );
			assert.equal( list.end  (0), 30 );

			assert.equal( list.start(1), 50 );
			assert.equal( list.end  (1), 60 );
			
		});
	});

	describe('start', function () {
		it('should return undefined on empty list', function () {
			var list = new RegionList();
			assert.equal( list.start(), undefined );
		});

		it('should return the start of an entire list', function () {
			var list = new RegionList();
			list.add( 10, 20 );

			assert.equal( list.start(), 10 );
		});

		it('should return the start of a region, relative to the start of the list', function () {
			var list = new RegionList();
			list.add( 10, 20 );
			list.add( 30, 40 );
			list.add( 50, 60 );

			assert.equal( list.start( 1 ), 30 );
			assert.equal( list.start( 2 ), 50 );
		});


		it('should return the start of a region, relative to the end of the list', function () {
			var list = new RegionList();
			list.add( 10, 20 );
			list.add( 30, 40 );
			list.add( 50, 60 );

			assert.equal( list.start( -1 ), 50 );
			assert.equal( list.start( -2 ), 30 );
		});

	});

	describe('end', function () {
		it('should return undefined on empty list', function () {
			var list = new RegionList();
			assert.equal( list.end(), undefined );
		});

		it('should return the end of an entire list', function () {
			var list = new RegionList();
			list.add( 10, 20 );
			list.add( 30, 40 );


			assert.equal( list.end(), 40 );
		});
	});

	describe('intersects', function () {
		it('should work with a single offset', function () {
			var list = new RegionList();
			list.add( 10, 20 );
			list.add( 30, 40 );

			assert( !list.intersects(  9 ) );
			assert(  list.intersects( 10 ) );
			assert(  list.intersects( 15 ) );
			assert( !list.intersects( 20 ) );

			assert(  list.intersects( 30 ) );
			assert( !list.intersects( 40 ) );

		});
	});

	xdescribe("#indexAt", function () {
		it('should return undefined when the list is empty', function () {
			var list = new RegionList();

			assert.isUndefined( list.indexAt( 0 ) );
		});

		it('should return the proper index', function () {
			var list = new RegionList();

			list.add( 10, 20 );
			list.add( 30, 40 );
			list.add( 50, 60 );

			assert.isUndefined( list.indexAt( 61 ) );
			assert.equal( list.indexAt( 59 ), 2 );
			assert.equal( list.indexAt( 50 ), 2 );
			assert.equal( list.indexAt( 41 ), 2 );
		});
	});
});