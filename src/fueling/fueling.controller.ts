import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { FuelingService } from './fueling.service';
import { CreateFuelingDto } from './dto/create-fueling.dto';

@Controller('fueling')
export class FuelingController {
  constructor(private readonly fuelingService: FuelingService) {}

  @Post('event')
  @HttpCode(HttpStatus.CREATED)
  async createFuelingEvent(@Body() createFuelingDto: CreateFuelingDto) {
    return this.fuelingService.processFuelingEvent(createFuelingDto);
  }
}
