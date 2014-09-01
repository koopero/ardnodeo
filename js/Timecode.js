/**
	Timecode

	A helper class to statefully translate raw milli and micro
	timecodes from as arduino into a single numeric timecode.
*/

module.exports = Timecode;

function Timecode () {
	var self = this;

	self.millis = NaN;
	self.micros = NaN;
	
	Object.defineProperty( self, 'readBuffer', {
		value: readBuffer
	} );

	function readBuffer ( buffer ) {
		self.millis = buffer.readUInt32LE( 0 );
		self.micros = buffer.readUInt32LE( 4 );
	}

	return self;
}
