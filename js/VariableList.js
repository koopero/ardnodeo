const
	assert = require('chai').assert
;


module.exports = VariableList;

function VariableList ( list ) {
	assert.isArray ( list, "Input must be array" );

	var self = this;
	self.array = list;

	self.printPretty = function () {
		list.forEach( function ( variable ) {
			variable.printPretty();
		});
	};
}