import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { DriverService } from './driver.service';
import { CreateDriverDto } from './dto/create-driver.dto';

@Controller('drivers')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  /**
   * POST /drivers
   * Register a new driver with an optional vehicle and station.
   * Eligibility for the loyalty program is computed automatically.
   */
  @Post()
  create(@Body() dto: CreateDriverDto) {
    return this.driverService.create(dto);
  }

  /**
   * GET /drivers/:id
   * Retrieve a driver's profile, point balance, vehicle info, and enrolled station.
   */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.driverService.findById(id);
  }

  /**
   * GET /drivers/:id/events
   * Retrieve the full fueling-event history for a driver, newest first.
   */
  @Get(':id/events')
  findEvents(@Param('id') id: string) {
    return this.driverService.findEvents(id);
  }
}
