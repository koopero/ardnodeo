module.exports = Regulator;

function Regulator ( allow ) {
	this.queue = [];
	this.allow = parseInt( allow ) || 0;
}


Regulator.prototype.push = function ( buffer ) {
	this.queue.push( buffer );
}

Regulator.prototype.write = function ( write ) {
	if ( this.queue.length == 0 )
		return true;

	do {
		var next = this.queue[0];
		if ( next.length > this.allow )
			return false;

		this.queue.shift();
		this.allow -= next.length;

		write( next );
	} while ( this.queue.length && this.allow > 0 );

	this.allow = this.allow < 0 ? 0 : this.allow;

	return true;
}