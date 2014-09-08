const
	_ = require('underscore'),
	Parse = require('./Parse')
;

module.exports = Type;

function Type ( opt ) {
	var self = this;
	_.extend( self, opt );
}


