#include "types.h"

#define LED_PIN 13
#define NUM_BUTTONS 2

/*
	A rough approximation of a 9DOF sensor stick.
*/
typedef struct { 
	Vec3_int16 accelerometer;
	Vec3_int16 gyro;
	Vec3_int16 magnometer;

	int16_t temperature;
	bool buttons[NUM_BUTTONS];
} sensor_t;


struct settings {
	bool blink;
};