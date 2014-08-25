
var Source = require('./Source'),
    pathlib = require('path');

var headerFile = pathlib.resolve( __dirname, '../arduino_lib/Ardnodeo.h');
var headerData = Source.loadFile( headerFile );
var section = Source.isolateSection( headerData, "ARDNODEO_PROTOCOL" );

var Protocol = Source.getEnums( section );

module.exports = Protocol;