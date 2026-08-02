import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreateDroneDto } from './dto/create-drone.dto';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateDroneDto } from './dto/update-drone.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { FleetService } from './fleet.service';

@Controller('fleet')
export class FleetController {
  constructor(private readonly fleetService: FleetService) {}

  @Get('drones')
  getDrones(@Query('page') page: number, @Query('limit') limit: number, @Query('search') search?: string) {
    return this.fleetService.getDrones(Number(page) || 1, Number(limit) || 10, search);
  }

  @Post('drones')
  createDrone(@Body() dto: CreateDroneDto) {
    return this.fleetService.createDrone(dto);
  }

  @Get('drones/:id')
  getDrone(@Param('id') id: string) {
    return this.fleetService.getDrone(id);
  }

  @Patch('drones/:id')
  updateDrone(@Param('id') id: string, @Body() dto: UpdateDroneDto) {
    return this.fleetService.updateDrone(id, dto);
  }

  @Delete('drones/:id')
  deleteDrone(@Param('id') id: string) {
    return this.fleetService.deleteDrone(id);
  }

  @Get('missions')
  getMissions(
    @Query('page') page: number,
    @Query('limit') limit: number,
    @Query('status') status?: string,
    @Query('droneId') droneId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.fleetService.getMissions(Number(page) || 1, Number(limit) || 10, status, droneId, startDate, endDate);
  }

  @Post('missions')
  createMission(@Body() dto: CreateMissionDto) {
    return this.fleetService.createMission(dto);
  }

  @Patch('missions/:id')
  updateMission(@Param('id') id: string, @Body() dto: UpdateMissionDto) {
    return this.fleetService.updateMission(id, dto);
  }

  @Get('maintenance-logs')
  getMaintenanceLogs(@Query('page') page: number, @Query('limit') limit: number) {
    return this.fleetService.getMaintenanceLogs(Number(page) || 1, Number(limit) || 10);
  }

  @Post('maintenance-logs')
  createMaintenanceLog(@Body() dto: CreateMaintenanceLogDto) {
    return this.fleetService.createMaintenanceLog(dto);
  }

  @Get('fleet-health')
  getFleetHealth() {
    return this.fleetService.getFleetHealth();
  }
}
