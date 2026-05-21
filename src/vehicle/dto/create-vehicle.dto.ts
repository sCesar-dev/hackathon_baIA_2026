import {
  IsString,
  IsInt,
  IsBoolean,
  IsOptional,
  Min,
  IsNumber,
} from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  plate!: string; // vehicle license plate

  @IsString()
  brand!: string;

  @IsString()
  model!: string;

  @IsInt()
  @Min(1900)
  year!: number;

  @IsString()
  vehicle_type!: string;

  @IsNumber()
  @Min(0)
  engine_size_l!: number;

  @IsInt()
  @Min(1)
  cylinders!: number;

  @IsString()
  transmission!: string;

  /** Fuel type as stored in co2.csv  (e.g. 'D' for diesel, 'E' for ethanol) */
  @IsString()
  fuel_type!: string;

  @IsNumber()
  @Min(0)
  fuel_consumption_comb!: number;

  @IsBoolean()
  @IsOptional()
  is_biodiesel_compatible?: boolean;
}
