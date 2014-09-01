const
	_ = require('underscore'),
	_s = require('underscore.string'),
	colors = require('colors'),
	Ardnodeo = require('./index')
;

colors.setTheme( {
	varType: 'green',
	varName: 'bold',
	varOffset: 'grey',
	varDimBracket: 'red',
	varDim: 'yellow',
	varComment: 'cyan'
});

module.exports = Prompt;

function Prompt( ard ) {


	showVars( process.stdout, ard.vars );


	var prompt = require('repl').start( {
		prompt: "   ."
	});

	prompt.on('exit', function () {
		ard.close();
	});

	ard.on('line', function ( line ) {
		console.log( line );
	} );

	ard.on('status', function ( status ) {
		var statusLine = '\r';
		statusLine += status.open ? '+' : '-';
		statusLine += status.bufferFull ? 'f' : ' ';
		statusLine += ' .';

		prompt.prompt = statusLine;
		prompt.rli._promptLength = 4;


		process.stdout.write( statusLine );
	});

	//


	_.extend( prompt.context, Ardnodeo, ard, { a: ard, p: prompt } );

	prompt.context.help = function () {
		console.log( "Help?");
	}

}


function showVars ( out, vars ) {

	vars = _.values( vars );
	vars.sort( function ( a, b ) {
		if ( a.offset < b.offset )
			return -1;

		if ( a.offset > b.offset )
			return 1;
		
		return 0;
	});


	var memLength = 0;

	for ( var k in vars ) {
		var v = vars[k];
		var line = '';
		line += prettyHexShort( v.offset ).varOffset;
		line += ' ';
		line += _s.pad( v.type.name, 8, ' ' ).varType;
		line += ' ';
		line += v.name.varName;

		for ( var dim in v.dims ) {
			line +='['.varDimBracket+String(v.dims[dim]).varDim+']'.varDimBracket;
		}

		if ( v.comment ) {
			line += ('  // '+v.comment).varComment;
		}


		line += '\n';
		out.write( line );

		memLength = v.offset + v.size;
	}

	line = '';
	line += prettyHexShort( memLength ).varOffset;
	line += ' ';
	line += 'end'.red;
	line += '\n';
	
	out.write( line );

	out.write('\n');
}

function prettyHexShort ( num ) {
	return _s.pad( num.toString( 16 ), 4, '0' );
}
