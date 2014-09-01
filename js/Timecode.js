/**
	Timecode

	A helper class to statefully translate raw milli and micro
	timecodes from as arduino into a single numeric timecode.
*/

module.exports = Timecode;
Timecode.Reader = TimecodeReader;
function Timecode () {

}

Timecode.prototype.inspect = function () {
	return '[TC: '+Number(this.seconds).toFixed( 6 )+' ]';
}

function TimecodeReader () {
	var self = this;

	self.millis = NaN;
	self.micros = NaN;
	
	Object.defineProperty( self, 'readBuffer', {
		value: readBuffer
	} );

	function readBuffer ( buffer ) {
		self.millis = buffer.readUInt32LE( 0 );
		self.micros = buffer.readUInt32LE( 4 );
		
		var tc = new Timecode();
		tc.millis = self.millis;
		tc.micros = self.micros;
		tc.seconds = tc.micros / 1000000;
		return tc;
	}

	return self;
}
