import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Headers,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateFuelingEventDto } from './dto/create-fueling-event.dto';

/**
 * EventsController
 *
 * Sits under /stations/:stationId/events, mirroring the spec's B2B endpoint.
 * Stations authenticate by passing their API key in the x-api-key header.
 *
 * POST /stations/:stationId/events
 *   Body: { driver_id, liters_dispensed }
 *   Headers: x-api-key: <station_api_key>
 *   → Runs prediction model, credits points, returns event summary
 *
 * GET /stations/:stationId/events
 *   → Returns all fueling events recorded at this station
 */
@Controller('stations/:stationId/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  registerEvent(
    @Param('stationId') stationId: string,
    @Body() dto: CreateFuelingEventDto,
    @Headers('x-api-key') apiKey: string,
  ) {
    return this.eventsService.registerEvent(stationId, dto, apiKey);
  }

  @Get()
  findByStation(@Param('stationId') stationId: string) {
    return this.eventsService.findByStation(stationId);
  }
}
