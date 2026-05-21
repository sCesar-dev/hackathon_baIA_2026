import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { DriverModule } from './driver/driver.module';
import { StationModule } from './station/station.module';
import { PredictionModule } from './prediction/prediction.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    // Global — PrismaService is available to every module without re-importing
    PrismaModule,

    // Domain modules
    VehicleModule,
    DriverModule,
    StationModule,

    // ML / scoring
    PredictionModule,

    // Fueling event pipeline (depends on Driver, Station, Prediction)
    EventsModule,
  ],
})
export class AppModule {}
