import { IsNumber, IsPositive, IsString } from 'class-validator';

export class CreateFuelingDto {
  @IsString()
  driver_id: string;

  @IsNumber()
  @IsPositive()
  litros_consumidos: number;
}
