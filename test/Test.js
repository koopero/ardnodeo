const
	fs = require('fs'),
	path = require('path')
;

var cachedFiles = {};

exports.loadSource = function ( file ) {
	var data = cachedFiles[file];

	if ( !data )
		cachedFiles[file] = data = fs.readFileSync( path.resolve( __dirname, 'source', file ), { encoding: 'utf8' } );
	
	return data;
}