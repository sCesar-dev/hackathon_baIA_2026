import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateStationDto {
  @IsString()
  company_name!: string;

  /** Brazilian business tax ID — CNPJ (14 digits, unformatted). */
  @IsString()
  cnpj!: string;

  @IsString()
  address!: string;

  @IsString()
  @IsOptional()
  city?: string; // defaults to "Salvador" in the schema

  @IsString()
  @IsOptional()
  state?: string; // defaults to "Bahia" in the schema

  /**
   * If not supplied, the service generates a secure random API key.
   * Stations use this key to authenticate POST /stations/:id/events calls.
   */
  @IsString()
  @IsOptional()
  api_key?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
