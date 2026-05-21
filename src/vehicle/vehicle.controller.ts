import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { VehicleService } from './vehicle.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';

@Controller('vehicles')
export class VehicleController {
  constructor(private readonly vehicleService: VehicleService) {}

  /** Register a new vehicle in the platform database. */
  @Post()
  create(@Body() dto: CreateVehicleDto) {
    return this.vehicleService.create(dto);
  }

  /** Retrieve all registered vehicles. */
  @Get()
  findAll() {
    return this.vehicleService.findAll();
  }

  /** Retrieve a single vehicle by UUID. */
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.vehicleService.findById(id);
  }
}
