import { IsUUID, IsNumber, IsPositive, IsString } from 'class-validator';

/**
 * Payload sent by the fuel station POS system when a biodiesel
 * transaction occurs for an enrolled driver.
 *
 * The station_id is taken from the route param (:stationId),
 * not from the body, to match the spec's endpoint design.
 */
export class CreateFuelingEventDto {
  /** UUID of the driver performing the fueling. */
  @IsString()
  plate!: string;

  /** Volume of biofuel dispensed in this transaction (liters). */
  @IsNumber()
  @IsPositive()
  liters_dispensed!: number;
}
