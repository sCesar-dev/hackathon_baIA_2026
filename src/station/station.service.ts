import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStationDto } from './dto/create-station.dto';
import { randomBytes } from 'crypto';
import { Station } from 'src/generated/prisma';

@Injectable()
export class StationService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Registration ─────────────────────────────────────────────────────────

  /**
   * Register a new fuel station as a B2B partner.
   *
   * Generates a cryptographically random API key if one is not provided.
   * The key is returned once at creation — stations must store it securely.
   */
  async create(dto: CreateStationDto): Promise<Station> {
    const existingCnpj = await this.prisma.station.findUnique({
      where: { cnpj: dto.cnpj },
    });
    if (existingCnpj) {
      throw new ConflictException(
        `A station with CNPJ ${dto.cnpj} is already registered.`,
      );
    }

    const api_key = dto.api_key ?? randomBytes(32).toString('hex');

    return this.prisma.station.create({
      data: {
        company_name: dto.company_name,
        cnpj: dto.cnpj,
        address: dto.address,
        city: dto.city ?? 'Salvador',
        state: dto.state ?? 'Bahia',
        api_key,
        is_active: dto.is_active ?? true,
      },
    });
  }

  // ─── Retrieval ─────────────────────────────────────────────────────────────

  async findById(station_id: string): Promise<Station> {
    const station = await this.prisma.station.findUnique({
      where: { station_id },
    });
    if (!station) {
      throw new NotFoundException(`Station ${station_id} not found.`);
    }
    return station;
  }

  async findAll(): Promise<Station[]> {
    return this.prisma.station.findMany({
      where: { is_active: true },
      orderBy: { created_at: 'desc' },
    });
  }

  /**
   * Validate a station's API key.
   * Used by the events guard to authenticate station requests.
   */
  async validateApiKey(
    station_id: string,
    api_key: string,
  ): Promise<Station | null> {
    return this.prisma.station.findFirst({
      where: { station_id, api_key, is_active: true },
    });
  }
}
