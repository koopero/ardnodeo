#include "types.h"

#define LED_PIN 13
#define NUM_BUTTONS 2

struct Vec3_int16 {
	union {
		struct {
			int16_t x;
			int16_t y;
			int16_t z;
		};
		int16_t raw[3];
	};
};

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