import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PredictionService } from '../prediction/prediction.service';
import { StationService } from '../station/station.service';
import { CreateFuelingEventDto } from './dto/create-fueling-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly predictionService: PredictionService,
    private readonly stationService: StationService,
  ) {}

  async registerEvent(
    station_id: string,
    dto: CreateFuelingEventDto,
    apiKey: string,
  ) {
    // Step 1 — validate station + API key
    const station = await this.stationService.validateApiKey(station_id, apiKey);
    if (!station) {
      throw new UnauthorizedException('Invalid API key or station is inactive.');
    }

    // Step 2 — resolve vehicle by plate
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { plate: dto.plate },
    });
    if (!vehicle) {
      throw new NotFoundException(
        `No vehicle found with plate "${dto.plate}". ` +
        `The driver must register before fueling.`,
      );
    }

    if (!vehicle.is_biodiesel_compatible) {
      throw new BadRequestException(
        `Vehicle "${dto.plate}" is not biodiesel-compatible and cannot earn BioPoints.`,
      );
    }

    // Step 3 — resolve driver from vehicle
    const driver = await this.prisma.driver.findFirst({
      where: { plate: vehicle.plate },
    });
    if (!driver) {
      throw new NotFoundException(
        `Vehicle "${dto.plate}" is not linked to any registered driver.`,
      );
    }

    if (!driver.is_eligible) {
      throw new BadRequestException(
        `Driver linked to plate "${dto.plate}" is not eligible for BioPoints.`,
      );
    }

    // Step 4 — call Python model
    const prediction = await this.predictionService.predict({
      engine_size_l: vehicle.engine_size_l,
      cylinders: vehicle.cylinders,
      transmission: vehicle.transmission,
      fuel_type: vehicle.fuel_type,
      fuel_consumption_comb_l_per_100km: vehicle.fuel_consumption_comb,
      vehicle_type: vehicle.vehicle_type,
      liters_dispensed: dto.liters_dispensed,
    });

    // Step 5 — persist event
    const event = await this.prisma.fuelingEvent.create({
      data: {
        driver_id: driver.driver_id,
        station_id,
        plate: vehicle.plate,
        liters_dispensed: dto.liters_dispensed,
        co2_fossil_predicted_g_km: prediction.co2_fossil_predicted_g_km,
        co2_biofuel_actual_g_km: prediction.co2_biofuel_actual_g_km,
        co2_saved_g_km: prediction.co2_saved_g_km,
        efficiency_multiplier: prediction.efficiency_multiplier,
        points_awarded: prediction.points_awarded,
      },
      include: { driver: true, station: true, vehicle: true },
    });

    // Step 6 — credit points to driver balance
    await this.prisma.driver.update({
      where: { driver_id: driver.driver_id },
      data: { point_balance: { increment: prediction.points_awarded } },
    });

    return {
      ...event,
      message: `${prediction.points_awarded.toFixed(2)} BioPoints awarded to ${driver.full_name} (plate: ${dto.plate}).`,
    };
  }

  async findByStation(station_id: string) {
    await this.stationService.findById(station_id);
    return this.prisma.fuelingEvent.findMany({
      where: { station_id },
      orderBy: { event_timestamp: 'desc' },
      include: { driver: true, vehicle: true },
    });
  }
}