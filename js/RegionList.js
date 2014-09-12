module.exports = RegionList;

function RegionList () {
	var self = this;
	var list = [];

	Object.defineProperty( self, 'length', {
		get: getLength
	});

	self.list = list;
	self.indexAt = indexAt;
	self.add = add;
	self.remove = remove;
	self.start = start;
	self.end = end;
	self.forEach = forEach;

	function getLength () {
		return list.length / 2;
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
				iStart = start(startIndex),
				iEnd   = end(startIndex)
			;

			debug( '<', startIndex, iStart, iEnd );

			if ( iEnd >= aStart )
				break;

		}

		if ( startIndex == k ) {
			debug( "bail 1");
			list.push( aStart );
			list.push( aEnd );
			return startIndex;
		}

		


		for ( endIndex = startIndex; endIndex < k; endIndex ++ ) {
			var 
				iStart = start(endIndex),
				iEnd   = end(endIndex)
			;

			debug( '>', endIndex, iStart, iEnd );

			if ( iEnd < aStart ) {

			}

			if ( iStart > aEnd ) {
				debug( "bail 2", startIndex, endIndex );
				//break;
				list.splice( startIndex * 2, ( endIndex - startIndex ) * 2, aStart, aEnd )
				return startIndex;
			}
		}

		debug( 'startIndex', startIndex );
		debug( 'endIndex', endIndex );
		debug( 'k', k )

		if ( startIndex < endIndex ) {
			debug( "slicing", list );
			list.splice( startIndex * 2 + 1, ( endIndex - startIndex - 1 ) * 2 );
			endIndex = startIndex;
			k = getLength();
		}


		list[ endIndex * 2 ] = Math.min( aStart, list[ endIndex * 2 ] );
		list[ endIndex * 2 + 1 ] = Math.max( aEnd, list[ endIndex * 2 + 1 ] );

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
				iStart = start(index),
				iEnd   = end(index)
			;

			debug( '<', index, iStart, iEnd );

			if ( iEnd < aStart )
				continue;


			if ( aStart > iStart && aEnd < iEnd ) {
				debug( 'bail on split' );
				list.splice( index * 2 + 1, 0, aStart, aEnd );
				return;
			}

			if ( aStart <= iStart && aEnd >= iEnd ) {
				list.splice( index * 2, 2 );
				index --;
				k = getLength();
				continue;
			}

			if ( aEnd > iStart && aEnd < iEnd ) {
				debug( 'bail left' );
				
				list[ index * 2 ] = aEnd;
				break;
			} 

			if ( iEnd > aStart ) {
				debug( 'bail right' );
				list[ index * 2 + 1 ] = aStart;
				break;
			}
			

			if ( iStart > aEnd )
				break;
		}

		debug( 'k', k )


	}

	function debug () {
		if ( self.debug )
			console.log.apply( console, arguments );
	}


	function start ( index ) {
		return list[index * 2];
	}

	function end ( index ) {
		return list[index * 2+1];
	}

	function forEach ( callback ) {
		var k = getLength();
		
		for ( var i = 0; i < k; i ++ ) {
			callback( start( i ), end( i ), i );
		};
	}

	function isEmpty() {

	}
}