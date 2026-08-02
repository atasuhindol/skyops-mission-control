import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FleetHealthController } from './fleet-health.controller';
import { FleetHealthService } from './fleet-health.service';
import { Drone } from '../drones/drone.entity';
import { Mission } from '../missions/mission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Drone, Mission])],
  controllers: [FleetHealthController],
  providers: [FleetHealthService],
})
export class FleetHealthModule {}
