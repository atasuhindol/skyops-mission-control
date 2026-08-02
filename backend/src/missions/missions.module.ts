import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Mission } from './mission.entity';
import { MissionsController } from './missions.controller';
import { MissionsService } from './missions.service';
import { Drone } from '../drones/drone.entity';
import { DronesModule } from '../drones/drones.module';

@Module({
  imports: [TypeOrmModule.forFeature([Mission, Drone]), DronesModule],
  controllers: [MissionsController],
  providers: [MissionsService],
  exports: [MissionsService],
})
export class MissionsModule {}
