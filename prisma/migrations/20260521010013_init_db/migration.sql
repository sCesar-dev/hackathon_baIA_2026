-- CreateTable
CREATE TABLE "Vehicle" (
    "vehicle_id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "engine_size_l" DOUBLE PRECISION NOT NULL,
    "cylinders" INTEGER NOT NULL,
    "transmission" TEXT NOT NULL,
    "fuel_type" TEXT NOT NULL,
    "fuel_consumption_comb" DOUBLE PRECISION NOT NULL,
    "is_biodiesel_compatible" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("vehicle_id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "driver_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "vehicle_id" TEXT,
    "enrolled_station_id" TEXT,
    "is_eligible" BOOLEAN NOT NULL DEFAULT false,
    "point_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("driver_id")
);

-- CreateTable
CREATE TABLE "Station" (
    "station_id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Salvador',
    "state" TEXT NOT NULL DEFAULT 'Bahia',
    "api_key" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("station_id")
);

-- CreateTable
CREATE TABLE "FuelingEvent" (
    "event_id" TEXT NOT NULL,
    "driver_id" TEXT NOT NULL,
    "station_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "liters_dispensed" DOUBLE PRECISION NOT NULL,
    "co2_fossil_predicted_g_km" DOUBLE PRECISION NOT NULL,
    "co2_biofuel_actual_g_km" DOUBLE PRECISION NOT NULL,
    "co2_saved_g_km" DOUBLE PRECISION NOT NULL,
    "efficiency_multiplier" DOUBLE PRECISION NOT NULL,
    "points_awarded" DOUBLE PRECISION NOT NULL,
    "event_timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelingEvent_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Driver_cpf_key" ON "Driver"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_email_key" ON "Driver"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Station_cnpj_key" ON "Station"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "Station_api_key_key" ON "Station"("api_key");

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("vehicle_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_enrolled_station_id_fkey" FOREIGN KEY ("enrolled_station_id") REFERENCES "Station"("station_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelingEvent" ADD CONSTRAINT "FuelingEvent_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "Driver"("driver_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelingEvent" ADD CONSTRAINT "FuelingEvent_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "Station"("station_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelingEvent" ADD CONSTRAINT "FuelingEvent_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "Vehicle"("vehicle_id") ON DELETE RESTRICT ON UPDATE CASCADE;
