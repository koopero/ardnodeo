/**
	Timecode

	A helper class to statefully translate raw milli and micro
	timecodes from as arduino into a single numeric timecode.
*/

module.exports = Timecode;
Timecode.Reader = TimecodeReader;
function Timecode () {

}

Timecode.prototype.valueOf = function () {
	return this.seconds;
}

Timecode.prototype.inspect = function () {
	return '[TC: '+Number(this.seconds).toFixed( 6 )+' ]';
}

function TimecodeReader () {
	var self = this;

	self.millis = NaN;
	self.micros = NaN;
	self.jsTime = NaN;

	Object.defineProperty( self, 'readBuffer', {
		value: readBuffer
	} );

	function readBuffer ( buffer ) {

		var 
			jsTime = new Date().getTime();
			millis = buffer.readUInt32LE( 0 ),
			micros = buffer.readUInt32LE( 4 ),
			diffMillis = millis - self.millis,
			diffMicros = micros - self.micros,
			diffJsTime = jsTime - self.jsTime
		;

		self.millis = millis;
		self.micros = micros;
		self.jsTime = jsTime;

		//console.log ( diffMillis, diffMicros, diffJsTime );
		

		var tc = new Timecode();
		tc.millis = millis;
		tc.micros = micros;
		tc.seconds = tc.micros / 1000000;
		return tc;
	}

	return self;
}
