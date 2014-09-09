const 
	assert = require('assert'),
	util = require('util'),
	Parse = require('../js/Parse'),
	Test = require('./Test')
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
				"type": {
					"parseType":"group",
					"groupType":"struct"
				},
				"typeName":"gyro_t",
				"parseType":"typeDeclaration",
				'after': 'bar'
			});
		});

		
	});


	describe('include', function () {
		it('will extract include directives', function () {
			var source = joinLines( [
				'#include <somefile.h>',
				'',
				'#include "someotherfile.h"'
			]);
		});
	});

	describe('integer', function () {
		it('will parse the same way as C', function () {
			assert.equal( 42, Parse.integer( '42' ) );
			assert.equal( 42, Parse.integer( '052' ) );
			assert.equal( 42, Parse.integer( '0x2a' ) );
			assert.equal( 42, Parse.integer( '0X2A' ) );
			assert.equal( 42, Parse.integer( '0b101010' ) );
		})
	});

	describe('enums', function () {
		it('will extract enums for a string', function () {
			var source = "foo=barr  one=1,two=2 /* A comment just to fuck things up */ forty  = 0x24";
			assertCompare( Parse.enums( source ), {
				one: 1,
				two: 2,
				forty: 40
			});
		});
	});

	describe('defines', function () {
		it('will load from source', function () {
			var source = Test.loadSource( 'sketch.ino' );

			var results = Parse.defines( source );
			deepCompare( results, {
				'LED_PIN': '13'
			});
		});
	});


	describe('gatherRegexOffsets', function () {
		it('will work', function () {
			var source = 'aaa1aaaa2aa3';
			var result = Parse.gatherRegexOffsets( source, /\d/g );
			assert.deepEqual( result, [ 3, 8, 11 ] );
		});
	});

	describe('forEachOffset', function () {
		it('will work', function () {
			var source = '0123456789ABCDEF';

			var result = Parse.forEachOffset( source, [ 1, 3, 7, 13 ], function ( str, offset ) {
				assert.equal( str.length, source.length - offset );
				assert.equal( parseInt( str[0], 16 ), offset );
				return str[0]
			});

			assert.deepEqual( [ '1', '3', '7', 'D' ], result );
		});
	});

	describe('removeComments', function () {
		it('will remove end of line comments', function () {
			var source = 'foo;//comment \nbar';
			var result = Parse.removeComments( source );
			assert.equal( result, 'foo;\nbar' );
		});
	});

	describe('removeComments', function () {
		it('will remove /* style */ comments', function () {
			var source = 'foo/*comment*/;\n/*\n\n\n*/bar';
			var result = Parse.removeComments( source );
			assert.equal( result, 'foo;\nbar' );
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
