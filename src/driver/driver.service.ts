import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDriverDto } from './dto/create-driver.dto';
import { Driver } from 'src/generated/prisma';

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Registration ─────────────────────────────────────────────────────────

  /**
   * Register a new driver.
   *
   * Eligibility is set automatically:
   * - true  → the associated vehicle has is_biodiesel_compatible = true
   * - false → no vehicle linked, or vehicle is not compatible
   *
   * The driver is also auto-enrolled in the provided station's loyalty program
   * if enrolled_station_id is supplied and the station is active.
   */
  async create(dto: CreateDriverDto): Promise<Driver> {
    // 1 — Resolve vehicle eligibility
    let is_eligible = false;
    if (dto.plate) {
      const vehicle = await this.prisma.vehicle.findUnique({
        where: { plate: dto.plate },
      });
      if (!vehicle) {
        throw new NotFoundException(
          `Vehicle ${dto.plate} not found. Register the vehicle first.`,
        );
      }
      is_eligible = vehicle.is_biodiesel_compatible;
    }

    // 2 — Validate station (if provided)
    if (dto.enrolled_station_id) {
      const station = await this.prisma.station.findUnique({
        where: { station_id: dto.enrolled_station_id },
      });
      if (!station) {
        throw new NotFoundException(
          `Station ${dto.enrolled_station_id} not found.`,
        );
      }
      if (!station.is_active) {
        throw new BadRequestException(
          `Station ${dto.enrolled_station_id} is not currently active.`,
        );
      }
    }

    // 3 — Persist
    return this.prisma.driver.create({
      data: {
        full_name: dto.full_name,
        cpf: dto.cpf,
        email: dto.email,
        phone: dto.phone,
        plate: dto.plate ?? null,
        enrolled_station_id: dto.enrolled_station_id ?? null,
        is_eligible,
        point_balance: 0,
      },
      include: { vehicle: true, enrolled_station: true },
    });
  }

  // ─── Retrieval ─────────────────────────────────────────────────────────────

  async findById(driver_id: string): Promise<Driver> {
    const driver = await this.prisma.driver.findUnique({
      where: { driver_id },
      include: { vehicle: true, enrolled_station: true },
    });
    if (!driver) {
      throw new NotFoundException(`Driver ${driver_id} not found.`);
    }
    return driver;
  }

  /**
   * Return the full fueling-event history for a driver, most recent first.
   * Useful for a driver's loyalty dashboard.
   */
  async findEvents(driver_id: string) {
    await this.findById(driver_id); // guard — throws if not found
    return this.prisma.fuelingEvent.findMany({
      where: { driver_id },
      orderBy: { event_timestamp: 'desc' },
      include: { station: true, vehicle: true },
    });
  }

  /** Add points to a driver's balance (called internally after a fueling event). */
  async addPoints(driver_id: string, points: number): Promise<Driver> {
    return this.prisma.driver.update({
      where: { driver_id },
      data: { point_balance: { increment: points } },
    });
  }
}
