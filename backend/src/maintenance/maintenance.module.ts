import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceLog } from './maintenance-log.entity';
import { Drone } from '../drones/drone.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MaintenanceLog, Drone])],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}
