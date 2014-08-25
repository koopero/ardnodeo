module.exports = Prompt;

var _ = require('underscore');
	Ardnodeo = require('./index');

function Prompt( ard ) {



	var prompt = require('repl').start( {
		prompt: "ard >"
	});

	prompt.on('exit', function () {
		ard.close();
	});

	ard.on('line', function ( line ) {
		console.log( line );
	} );

	_.extend( prompt.context, Ardnodeo, ard, { a: ard } );

	prompt.context.help = function () {
		console.log( "Help?");
	}

}

