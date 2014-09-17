struct Vec3_int16 
{
	union {
		struct {
			int16_t x;
			int16_t y;
			int16_t z;
		};
		int16_t raw[3];
	};
};


struct sensorReading 
{
	Vec3_int16 accel[2];
	Vec3_int16 gyro;
	Vec3_int16 mag;

	int16_t temperature;
};



