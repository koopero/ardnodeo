const
	assert = require('chai').assert
;


module.exports = VariableList;

function VariableList ( list ) {
	assert.isArray ( list, "Input must be array" );

	var self = this;
	
	__hide( 'array', list );
	__hide( 'forEach', forEach );

	__hide( 'printPretty', function () {
		forEach( function ( variable ) {
			variable.printPretty();
		});
	} );

	forEach( function ( variable, name ) {
		if ( name )
			self[name] = variable;
	});

	function forEach( cb ) {
		list.forEach( function ( variable ) {
			cb( variable, variable.name )
		});
	}

	//
	//
	//
	function __hide( key, value ) {
		Object.defineProperty( self, key, {
			value: value
		});
	}
}
