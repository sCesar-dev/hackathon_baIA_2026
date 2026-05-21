import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { StationService } from './station.service';
import { CreateStationDto } from './dto/create-station.dto';

@Controller('stations')
export class StationController {
  constructor(private readonly stationService: StationService) {}

  /**
   * POST /stations
   * Register a new fuel station as a B2B partner.
   * Returns the station record including the generated API key (store it!).
   */
  @Post()
  create(@Body() dto: CreateStationDto) {
    return this.stationService.create(dto);
  }

  /**
   * GET /stations
   * List all active partner stations.
   */
  @Get()
  findAll() {
    return this.stationService.findAll();
  }

  /**
   * GET /stations/:id
   * Retrieve a station profile by UUID.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.stationService.findById(id);
  }
}
