const
	fs = require('fs')
;

module.exports = SourceCache;

function SourceCache () {
	var self = this,
		cache = {};

	self.readFile = function ( file ) {
		var data = cache[file];
		if ( data === undefined ) 
			data = cache[file] = fs.readFileSync( file, { encoding: 'utf8' } );

		return data;
	}
}