import { Body, Controller, Get, Post, Query, ValidationPipe } from '@nestjs/common';
import { MaintenanceService } from './maintenance.service';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto';
import { ListMaintenanceLogsDto } from './dto/list-maintenance-logs.dto';

@Controller('maintenance-logs')
export class MaintenanceController {
  constructor(private readonly maintenanceService: MaintenanceService) {}

  @Get()
  findAll(@Query(new ValidationPipe({ transform: true })) query: ListMaintenanceLogsDto) {
    return this.maintenanceService.findAll(query);
  }

  @Post()
  create(@Body(new ValidationPipe({ whitelist: true })) dto: CreateMaintenanceLogDto) {
    return this.maintenanceService.create(dto);
  }
}
