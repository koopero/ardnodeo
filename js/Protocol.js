module.exports = {
  pinMode: 1,
  digitalWrite: 2,
  analogWrite: 3,
  poke: 4,
  setFlags: 5,
  reset: 6,
  received: 1,
  status: 5,
 

  Return: {
  	Boot: 1,
  	Tick: 2,
  	AnalogRead: 4

  },

  PinMode: {
    OUTPUT: 0,
    INPUT: 1,
    InputPullup: 2
  },

  Options: {
    Tick: 2 
  }
  
}
