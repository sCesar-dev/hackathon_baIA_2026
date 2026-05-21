import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PredictionModule } from '../prediction/prediction.module';
import { DriverModule } from '../driver/driver.module';
import { StationModule } from '../station/station.module';

@Module({
  imports: [PredictionModule, DriverModule, StationModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
