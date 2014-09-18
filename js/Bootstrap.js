const 
	_s = require('underscore.string'),
	fs = require('fs'),
	pathlib = require('path'),
	Ardnodeo = require('./Ardnodeo')
;


module.exports = Bootstrap;
function Bootstrap ( opt, cb ) {
	if ( 'function' == typeof opt ) {
		cb = opt;
		opt = {};
	}

	var pref = loadPreferences();
	var serialOpt = {
		port: pref['serial.port']
	}

	var ard = new Ardnodeo( opt );
	ard.setConnection( serialOpt );

	if ( cb ) {
		setImmediate( function () {
			cb( null, ard );
		})
	}

	return ard;
}

const PREFERENCE_LOCATIONS = [ 'Library/Arduino15/preferences.txt', 'Library/Arduino/preferences.txt']

function loadPreferences () {
	if ( Bootstrap.preferences )
		return Bootstrap.preferences;

	var homeDir = process.env.HOME || process.env.HOMEPATH || process.env.USERPROFILE;

	var prefTxt;

	for ( var i in PREFERENCE_LOCATIONS ) {

		var path = PREFERENCE_LOCATIONS[i];
		path = pathlib.resolve( homeDir, path );

		try {
			fs.statSync( path );
			prefTxt = fs.readFileSync( path, { encoding: 'utf8' } );
		} catch ( e ) {
			continue;
		}
		break;
	}

	if ( !prefTxt ) 
		throw new Error( "Arduino preferences.txt not found" );

	var prefLines = prefTxt.split('\n');
	var prefs = {};
	prefLines.forEach( function ( line ) {
		var match = /(.*?)=(.*)\s*/.exec( line );
		if ( match ) 
			prefs[match[1]] = match[2];
	}) ;

	Bootstrap.preferences = prefs;
	return prefs;
}