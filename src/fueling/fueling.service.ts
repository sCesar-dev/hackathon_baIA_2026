import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFuelingDto } from './dto/create-fueling.dto';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

@Injectable()
export class FuelingService {
  private readonly logger = new Logger(FuelingService.name);
  
  // Constants based on the formula requirement
  private readonly CO2_BIOFUEL = 0; // Or standard biofuel g/km value
  private readonly BASE_RATE = 10;

  constructor(private readonly prisma: PrismaService) {}

  async processFuelingEvent(dto: CreateFuelingDto) {
    const { driver_id, litros_consumidos } = dto;

    // 1 & 2. Buscar os dados do motorista e veículo associado no banco
    const driver = await this.prisma.driver.findUnique({
      where: { driver_id },
      include: { vehicle: true },
    });

    if (!driver) {
      throw new NotFoundException('Motorista não encontrado.');
    }

    if (!driver.vehicle) {
      throw new BadRequestException('Motorista não possui um veículo associado.');
    }

    const vehicle = driver.vehicle;

    // Build the JSON payload for the ML model matching train.py specs
    const vehicleSpecs = {
      Engine_Size_L: vehicle.engine_size_l,
      Cylinders: vehicle.cylinders,
      Transmission: vehicle.transmission,
      Fuel_Type: vehicle.fuel_type,
      Fuel_Consumption_Comb_L_per_100_km: vehicle.fuel_consumption_comb,
      Vehicle_type: vehicle.vehicle_type,
    };

    const jsonSpecs = JSON.stringify(vehicleSpecs);

    // 3. Executar o script python predict.py
    const scriptPath = path.resolve(process.cwd(), 'ml/pipeline/predict.py');
    let co2_fossil_predicted = 0;

    try {
      // Execute as a child process using Python
      // Enclose the JSON in single quotes to pass it as a single string argument
      const { stdout } = await execAsync(`python3 ${scriptPath} '${jsonSpecs}'`);
      co2_fossil_predicted = parseFloat(stdout.trim());
      
      if (isNaN(co2_fossil_predicted)) {
        throw new Error('Saída da predição não é um número válido');
      }
    } catch (error) {
      this.logger.error('Erro ao executar o modelo de predição Python', error);
      throw new BadRequestException('Falha na predição do modelo CO2');
    }

    // 4. Aplicar a fórmula de pontos:
    // Points = (co2_fossil_predicted - co2_biofuel) * (1 / Fuel_Consumption) * litros_consumidos * base_rate
    const fuelConsumption = vehicle.fuel_consumption_comb;
    const co2Saved = co2_fossil_predicted - this.CO2_BIOFUEL;
    const efficiencyMultiplier = 1 / fuelConsumption;
    
    let points = co2Saved * efficiencyMultiplier * litros_consumidos * this.BASE_RATE;

    // Garante que não sejam pontos negativos
    if (points < 0) points = 0;

    // Resolvendo a falta do station_id para o Prisma (tentamos pegar a estação que o motorista está cadastrado)
    let stationId = driver.enrolled_station_id;
    if (!stationId) {
      // Pega qualquer estação ativa como fallback para o hackathon
      const fallbackStation = await this.prisma.station.findFirst({
        where: { is_active: true }
      });
      if (!fallbackStation) {
         throw new BadRequestException('Nenhuma Station disponível no sistema para registrar o evento.');
      }
      stationId = fallbackStation.station_id;
    }

    // Salvar evento no Prisma
    const event = await this.prisma.fuelingEvent.create({
      data: {
        driver_id: driver.driver_id,
        station_id: stationId,
        plate: vehicle.plate,
        liters_dispensed: litros_consumidos,
        co2_fossil_predicted_g_km: co2_fossil_predicted,
        co2_biofuel_actual_g_km: this.CO2_BIOFUEL,
        co2_saved_g_km: co2Saved,
        efficiency_multiplier: efficiencyMultiplier,
        points_awarded: points,
      }
    });

    // Salvar essa transação de pontos no wallet do usuário
    await this.prisma.driver.update({
      where: { driver_id: driver.driver_id },
      data: {
        point_balance: {
          increment: points,
        }
      }
    });

    return {
      message: 'Abastecimento registrado com sucesso',
      points_awarded: points,
      event,
    };
  }
}
