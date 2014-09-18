/**
	Provides information about the Arduino environment
*/

const
	os = require('os'),
	resolve = require('path').resolve
;

var HOME = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;
exports.HOME = HOME;
exports.lib  = resolveDirList( [
	'Documents/Arduino/libraries'
]);



function resolveDirList( list ) {
	return list.map( function ( dir ) {
		return resolve( HOME, dir );
	});
}
