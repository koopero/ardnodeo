#include "types.h"

#define LED_PIN 13

typedef struct { 
	Vec3_int16 accelerometer;
	Vec3_int16 gyro;
	Vec3_int16 magnometer;

	int16_t temperature;
} sensor_data;
