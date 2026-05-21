import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { Vehicle } from 'src/generated/prisma';

/**
 * Fuel types from co2.csv that are compatible with biodiesel blends.
 * 'D' = Diesel. Vehicles running on diesel can accept biodiesel blends (B5–B100).
 */
const BIODIESEL_COMPATIBLE_FUEL_TYPES = ['D', 'diesel', 'Diesel'];

@Injectable()
export class VehicleService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create ──────────────────────────────────────────────────────────────

  async create(dto: CreateVehicleDto): Promise<Vehicle> {
    const is_biodiesel_compatible =
      dto.is_biodiesel_compatible ??
      BIODIESEL_COMPATIBLE_FUEL_TYPES.includes(dto.fuel_type);

    return this.prisma.vehicle.create({
      data: { ...dto, is_biodiesel_compatible },
    });
  }

  // ─── Find ─────────────────────────────────────────────────────────────────

  async findById(plate: string): Promise<Vehicle> {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { plate },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${plate} not found.`);
    }
    return vehicle;
  }

  async findAll(): Promise<Vehicle[]> {
    return this.prisma.vehicle.findMany({ orderBy: { brand: 'asc' } });
  }
}
