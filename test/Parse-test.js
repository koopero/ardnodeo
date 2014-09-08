const 
	assert = require('assert'),
	util = require('util'),
	Parse = require('../js/Parse')
;
describe('Parse', function () {

	describe('endOfLine', function () {
		it('should parse', function () {
			assertCompare( 
				Parse.endOfLine( '; bar' ),
				
				{
					parseType: 'endOfLine',
					after: ' bar'
				}
			);

			assertCompare( 
				Parse.endOfLine( ' ; // comment\nnextline' ),
				{
					parseType: 'endOfLine',
					comment: 'comment',
					after: '\nnextline'
				}
			);
		})
	});

	describe('untilRightBrace', function ( ) {
		it('should deal with two levels', function () {
			assertCompare(
				Parse.untilRightBrace( " {inner}}; " ),
				{ 
					"inside":" {inner}",
					"after": "; "
				}
			);
		});

		it('should deal with 3 levels', function () {
			assertCompare(
				Parse.untilRightBrace( " {inner}}; " ),
				{ 
					"inside":  " {inner {foo}  }",
					"after": "; "
				}
			);
		})
	});

	describe('member', function ()  {

		it('will parse an regular declaration', function () {
			var source = "  uint8_t foo;bar";
			var parsed = Parse.member( source );

			//console.log( parsed );

			assertCompare( parsed, {
				"memberType": {
					"parseType":"type",
					"typeName":"uint8_t"
				},
				"name":"foo",
				"parseType":"member",
				'after': 'bar'
			});
		});

		it('will parse an anonymous group', function () {
			var source = "union { }; // Comment";
			var parsed = Parse.member( source );

			assertCompare( parsed, 
			{
				memberType: {
					parseType: 'group',
					groupType: 'union'
				}
			});
		});
		
	});


	describe('typeDeclaration', function ()  {

		it('will parse a real-worldish struct', function () {
			var source = joinLines( [
				'struct gyro_t {',
				'	union {',
				'		struct {',
				'			int16_t x;',
				'			int16_t y;',
				'			int16_t z;',
				'		};',
				'		int16_t raw[3];',
				'	};',
				'	int16_t temperature;',
				'};'
			]);

			var parsed = Parse.typeDeclaration( source );

			//console.log( parsed );

			assertCompare( parsed, {
				"memberType": {
					"parseType":"type",
					"typeName":"uint8_t"
				},
				"name":"foo",
				"parseType":"member",
				'after': 'bar'
			});
		});

		
	});

});

//
//	Test Utilities
//

function joinLines( lines ) {
	return lines.join('\n');
}

function assertCompare( a, b ) {
	if ( !deepCompare( a, b ) )
		throw new Error( "Expected: \n"+JSON.stringify( b, null, 2)+"\n\ngot\n\n"+JSON.stringify(a, null, 2));
}

function deepCompare( a, b ) {
	var aType = typeof a,
		bType = typeof b;

	if ( bType == 'undefined' )
		return true;

	if ( aType != bType )
		return false;

	if ( bType == 'object' ) {
		for ( var k in b )
			if ( !deepCompare( a[k], b[k] ) )
				return false;
	}

	return true;
}
