const
	fs = require('fs'),
	Parse = require('./Parse'),
    path = require('path')
;

var headerFile = path.resolve( __dirname, '../arduino_lib/Ardnodeo.h');
var headerData = fs.readFileSync( headerFile, { encoding: 'utf8' } );
var section = Parse.section( headerData, "ARDNODEO_PROTOCOL" );

var Protocol = Parse.enums( section );

module.exports = Protocol;