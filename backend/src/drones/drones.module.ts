import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DronesController } from './drones.controller';
import { DronesService } from './drones.service';
import { Drone } from './drone.entity';
import { Mission } from '../missions/mission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Drone, Mission])],
  controllers: [DronesController],
  providers: [DronesService],
  exports: [DronesService],
})
export class DronesModule {}
