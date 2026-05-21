import { IsEmail, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  full_name!: string;

  /** Brazilian individual tax ID — CPF (11 digits, unformatted). */
  @IsString()
  cpf!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  /**
   * UUID of an already-registered Vehicle.
   * If the vehicle does not yet exist, create it first via POST /vehicles.
   */
  @IsOptional()
  plate?: string;

  /**
   * UUID of the Station through which the driver is enrolling.
   * The station must be active and registered.
   */
  @IsUUID()
  @IsOptional()
  enrolled_station_id?: string;
}
