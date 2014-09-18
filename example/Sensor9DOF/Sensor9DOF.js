//try {
	var config = require('js-yaml').safeLoad( require('fs').readFileSync( 'config.yaml', 'utf8' ) );
//} catch ( e ) {

//}


var _ = require('underscore');

var plotly = require('plotly')( config.plotly.user, config.plotly.apiKey );
var token = config.plotly.streamToken;
var data = [{ 
	"x":[], 
	"y":[],
	stream:{ token: token, maxPoints: 200 }
}];
var graphOptions = {fileopt : "overwrite", filename : config.plotly.filename };

var plotlyStream;

plotly.plot(data, graphOptions, function (err, msg) {
	if (err) return console.log(err)
	console.log(msg);
	
	plotlyStream = plotly.stream( token, function ( err, msg ) {
		console.log( 'stream.cb', err, msg );
	} );

});

/*
setInterval( function () {
	if ( plotlyStream ) {
		var data = {
			x: Math.random(),
			y: Math.random()
		};
		var json = JSON.stringify( data );
		plotlyStream.write( json+'\n' );
	}
}, 100 );
*/

//return;


var Ardnodeo = require('../../js/index');
var arduino = Ardnodeo.Bootstrap();
arduino.source( 'Sensor9DOF.ino' );

var accel = arduino.vars['sensor.accel'];

var startTime = new Date().getTime();

accel.on('change', function ( value ) {
	var t = Number( arduino.timecode );
	
	var data = {
		x: t,
		y: value.x
	}

	var json = JSON.stringify( data );
	
	if ( plotlyStream ) {
		plotlyStream.write( json+'\n');
	}

})

arduino.on('timecode', function ( tc ) {
	var t = Number( arduino.timecode );
//	console.log( t, arduino.timecode );
});



require( '../../js/Prompt' )( arduino );