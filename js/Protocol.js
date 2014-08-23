module.exports = {

  Command: {
    Null: 0,
    PinMode: 1,
    DigitalWrite: 2,
    AnalogWrite: 3,
    MemWrite: 4,
    setFlags: 5
  },

  Return: {
  	Boot: 1,
  	Tick: 2,
  	AnalogRead: 4
  },

  PinMode: {
    Output: 0,
    Input: 1,
    InputPullup: 2
  },

  Options: {
    Tick: 2 
  }
  
}
