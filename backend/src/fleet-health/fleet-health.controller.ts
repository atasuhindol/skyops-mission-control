import { Controller, Get } from '@nestjs/common';
import { FleetHealthService } from './fleet-health.service';

@Controller('fleet-health')
export class FleetHealthController {
  constructor(private readonly fleetHealthService: FleetHealthService) {}

  @Get()
  getSummary() {
    return this.fleetHealthService.getSummary();
  }
}
