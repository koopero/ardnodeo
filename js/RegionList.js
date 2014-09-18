module.exports = RegionList;

function RegionList () {
	var self = this;
	//var list = [];

	var starts = [],
		ends = [];

	Object.defineProperty( self, 'length', {
		get: getLength
	});

	//self.list = list;
	self.indexAt = indexAt;
	self.add = add;
	self.remove = remove;
	self.start = start;
	self.end = end;
	self.intersects = intersects;
	self.forEach = forEach;

	function getLength () {
		return starts.length;
	}

	function indexAt ( pos ) {
		var k = getLength();

		for ( var index = 0 ; index < k; index ++ ) {
			var iEnd = endIndex( index );

		}
	}

	function add ( aStart, aEnd ) {
		if ( aStart instanceof RegionList ) {
			aStart.forEach( function ( start, end ) {
				add( start, end );
			});
			return;
		}

		debug( '+', aStart, aEnd );

		var 
			startIndex,
			endIndex,
			k = getLength()
		;

		for ( startIndex = 0; startIndex < k; startIndex ++ ) {
			var 
				iStart = starts[startIndex],
				iEnd   = ends[startIndex]
			;

			debug( '<', startIndex, iStart, iEnd );

			if ( iEnd >= aStart )
				break;

		}

		if ( startIndex == k ) {
			debug( "bail 1");
			starts.push( aStart );
			ends.push( aEnd );
			return startIndex;
		}

		


		for ( endIndex = startIndex; endIndex < k; endIndex ++ ) {
			var 
				iStart = starts[endIndex],
				iEnd   = ends[endIndex]
			;

			debug( '>', endIndex, iStart, iEnd );

			if ( iEnd < aStart ) {

			}

			if ( iStart > aEnd ) {
				debug( "bail 2", startIndex, endIndex );
				//break;
				starts.splice( startIndex, endIndex-startIndex, aStart );
				ends.splice( startIndex, endIndex-startIndex, aEnd );

				return startIndex;
			}
		}

		debug( 'startIndex', startIndex );
		debug( 'endIndex', endIndex );
		debug( 'k', k )

		if ( startIndex < endIndex ) {
			//debug( "slicing", list );
			//starts.splice( startIndex, )
			starts.splice( startIndex+1, endIndex - startIndex - 1 );
			ends.splice( startIndex, endIndex - startIndex - 1 );
			
			//list.splice( startIndex * 2 + 1, ( endIndex - startIndex - 1 ) * 2 );
			endIndex = startIndex;
			k = getLength();
		}


		starts[ endIndex ] = Math.min( aStart, starts[ endIndex ] );
		ends[ endIndex ] = Math.max( aEnd, ends[ endIndex ] );

		return endIndex;
	}


	function remove ( aStart, aEnd ) {
		if ( aStart instanceof RegionList ) {
			aStart.forEach( function ( start, end ) {
				remove( start, end );
			});
			return;
		}

		debug( '-', aStart, aEnd );

		var 
			index,
			k = getLength()
		;

		for ( index = 0; index < k; index ++ ) {
			var 
				iStart = starts[index],
				iEnd   = ends[index]
			;

			debug( '<', index, iStart, iEnd );

			if ( iEnd < aStart )
				continue;


			if ( aStart > iStart && aEnd < iEnd ) {
				debug( 'bail on split' );
				starts.splice( index + 1, 0, aEnd );
				ends.splice( index, 0, aStart ); 
				//list.splice( index * 2 + 1, 0, aStart, aEnd );
				return;
			}

			if ( aStart <= iStart && aEnd >= iEnd ) {
				starts.splice( index, 1 );
				ends.splice( index, 1 );
				index --;
				k = getLength();
				continue;
			}

			if ( aEnd > iStart && aEnd < iEnd ) {
				debug( 'bail left' );
				
				starts[ index ] = aEnd;
				break;
			} 

			if ( iEnd > aStart ) {
				debug( 'bail right' );
				ends[ index ] = aStart;
				break;
			}
			

			if ( iStart > aEnd )
				break;
		}

		debug( 'k', k )


	}

	function intersects ( start, end ) {
		var k = getLength();

		for ( var i = 0; i < k; i ++ ) {
			var 
				iStart = starts[i],
				iEnd = ends[i]
			;

			if ( start >= iStart && start < iEnd )
				return true;

		}

		return false;
	}

	function debug () {
		if ( self.debug )
			console.log.apply( console, arguments );
	}


	function start ( index ) {
		if ( index === undefined )
			index = 0;

		if ( index < 0 )
			index += getLength();

		return starts[index];
	}

	function end ( index ) {
		if ( index === undefined )
			index = -1;

		if ( index < 0 )
			index += getLength();

		return ends[index];
	}

	function forEach ( callback ) {
		var k = getLength();
		
		for ( var i = 0; i < k; i ++ ) {
			callback( starts[ i ], ends[i], i );
		};
	}

	function isEmpty() {

	}
}