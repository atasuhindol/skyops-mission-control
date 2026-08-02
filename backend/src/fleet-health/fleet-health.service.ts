import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Drone } from '../drones/drone.entity';
import { Mission } from '../missions/mission.entity';
import { DroneStatus } from '../common/enums';

@Injectable()
export class FleetHealthService {
  constructor(
    @InjectRepository(Drone)
    private readonly droneRepository: Repository<Drone>,
    @InjectRepository(Mission)
    private readonly missionRepository: Repository<Mission>,
  ) {}

  async getSummary() {
    const drones = await this.droneRepository.find();
    const now = new Date();
    const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const missionsInNext24Hours = await this.missionRepository
      .createQueryBuilder('mission')
      .where('mission.plannedStart >= :now', { now })
      .andWhere('mission.plannedStart <= :next24Hours', { next24Hours })
      .getCount();

    const overdue = drones.filter((drone) => drone.nextMaintenanceDueDate && drone.nextMaintenanceDueDate < now);
    const breakdown = drones.reduce<Record<DroneStatus, number>>((acc, drone) => {
      acc[drone.status] = (acc[drone.status] ?? 0) + 1;
      return acc;
    }, {
      [DroneStatus.AVAILABLE]: 0,
      [DroneStatus.IN_MISSION]: 0,
      [DroneStatus.MAINTENANCE]: 0,
      [DroneStatus.RETIRED]: 0,
    });

    const averageFlightHours = drones.length > 0 ? drones.reduce((acc, drone) => acc + drone.totalFlightHours, 0) / drones.length : 0;

    return {
      totalDrones: drones.length,
      statusBreakdown: breakdown,
      overdueMaintenance: overdue,
      missionsInNext24Hours,
      averageFlightHours,
    };
  }
}
