import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { DriverService } from './driver.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function getCO2Baseline(vehicleData: any): Promise<number> {
  const jsonData = JSON.stringify(vehicleData);
  // Chama o script python passando o JSON do veículo
  const { stdout } = await execAsync(`python3 ml/pipeline/predict.py '${jsonData}'`);
  return parseFloat(stdout.trim());
}

async function processFuelingEvent(eventData, vehicleSpecs) {
   // 1. Pega a predição de CO2 Fóssil
   const co2FossilPredicted = await getCO2Baseline({
       Engine_Size_L: vehicleSpecs.engineSize,
       Cylinders: vehicleSpecs.cylinders,
       Transmission: vehicleSpecs.transmission,
       Fuel_Type: vehicleSpecs.fuelType,
       Fuel_Consumption_Comb_L_per_100_km: vehicleSpecs.consumption,
       Vehicle_type: vehicleSpecs.vehicleType
   });
   // 2. Calcula economia
   const co2SavedGkm = co2FossilPredicted - eventData.co2BiofuelActual;
   // 3. Calcula os pontos
   const efficiencyMultiplier = 1 / vehicleSpecs.consumption;
   const points = co2SavedGkm * efficiencyMultiplier * eventData.litersConsumed * BASE_RATE;
   return points;
}
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
