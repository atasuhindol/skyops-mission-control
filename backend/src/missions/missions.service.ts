import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DroneStatus, MissionStatus } from '../common/enums';
import { Drone } from '../drones/drone.entity';
import { DronesService } from '../drones/drones.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { ListMissionsDto } from './dto/list-missions.dto';
import { Mission } from './mission.entity';

@Injectable()
export class MissionsService {
  constructor(
    @InjectRepository(Mission)
    private readonly missionRepository: Repository<Mission>,
    @InjectRepository(Drone)
    private readonly droneRepository: Repository<Drone>,
    private readonly dronesService: DronesService,
  ) {}

  async findAll(query: ListMissionsDto) {
    const { page = 1, limit = 10, status, droneId, from, to } = query;
    const qb = this.missionRepository.createQueryBuilder('mission');
    qb.leftJoinAndSelect('mission.drone', 'drone');

    if (status) {
      qb.andWhere('mission.status = :status', { status });
    }
    if (droneId) {
      qb.andWhere('mission.droneId = :droneId', { droneId });
    }
    if (from) {
      qb.andWhere('mission.plannedStart >= :from', { from });
    }
    if (to) {
      qb.andWhere('mission.plannedEnd <= :to', { to });
    }

    const [items, total] = await qb
      .orderBy('mission.plannedStart', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const mission = await this.missionRepository.findOne({ where: { id }, relations: { drone: true } });
    if (!mission) {
      throw new NotFoundException('Mission not found');
    }
    return mission;
  }

  async create(dto: CreateMissionDto) {
    const drone = await this.droneRepository.findOne({ where: { id: dto.droneId } });
    if (!drone) {
      throw new NotFoundException('Drone not found');
    }
    if (drone.status !== DroneStatus.AVAILABLE) {
      throw new BadRequestException('Only available drones can be assigned to missions');
    }

    const plannedStart = new Date(dto.plannedStart);
    const plannedEnd = new Date(dto.plannedEnd);
    if (plannedStart < new Date()) {
      throw new BadRequestException('Missions cannot be scheduled in the past');
    }
    if (plannedEnd <= plannedStart) {
      throw new BadRequestException('Planned end must be after planned start');
    }

    const existingOverlap = await this.missionRepository
      .createQueryBuilder('mission')
      .where('mission.droneId = :droneId', { droneId: dto.droneId })
      .andWhere('mission.plannedStart < :plannedEnd', { plannedEnd })
      .andWhere('mission.plannedEnd > :plannedStart', { plannedStart })
      .getCount();
    if (existingOverlap > 0) {
      throw new BadRequestException('Drone already has an overlapping mission');
    }

    const mission = this.missionRepository.create({
      ...dto,
      plannedStart,
      plannedEnd,
      status: dto.status ?? MissionStatus.PLANNED,
      drone,
    });

    return this.missionRepository.save(mission);
  }

  async update(id: number, dto: UpdateMissionDto) {
    const mission = await this.findOne(id);
    const nextStatus = dto.status ?? mission.status;
    this.assertTransition(mission.status, nextStatus);

    if (nextStatus === MissionStatus.IN_PROGRESS) {
      mission.actualStart = mission.actualStart ?? new Date();
      const drone = await this.droneRepository.findOne({ where: { id: mission.droneId } });
      if (drone) {
        drone.status = DroneStatus.IN_MISSION;
        await this.droneRepository.save(drone);
      }
    }

    if (nextStatus === MissionStatus.COMPLETED) {
      if (dto.flightHoursLogged == null) {
        throw new BadRequestException('Completed missions require flightHoursLogged');
      }
      mission.actualEnd = mission.actualEnd ?? new Date();
      mission.flightHoursLogged = dto.flightHoursLogged;
      const drone = await this.droneRepository.findOne({ where: { id: mission.droneId } });
      if (drone) {
        drone.totalFlightHours += dto.flightHoursLogged;
        drone.lastMaintenanceFlightHours += dto.flightHoursLogged;
        if (drone.totalFlightHours >= 50 || drone.lastMaintenanceFlightHours >= 50) {
          await this.dronesService.markMaintenanceDue(drone);
        } else {
          await this.dronesService.markAvailable(drone);
        }
      }
    }

    if (nextStatus === MissionStatus.ABORTED) {
      if (!dto.abortReason) {
        throw new BadRequestException('Aborting a mission requires a reason');
      }
      mission.abortReason = dto.abortReason;
      const drone = await this.droneRepository.findOne({ where: { id: mission.droneId } });
      if (drone) {
        await this.dronesService.markAvailable(drone);
      }
    }

    if (nextStatus === MissionStatus.PRE_FLIGHT_CHECK) {
      mission.actualStart = mission.actualStart ?? null;
    }

    mission.status = nextStatus;
    return this.missionRepository.save(mission);
  }

  private assertTransition(current: MissionStatus, next: MissionStatus) {
    const allowed = {
      [MissionStatus.PLANNED]: [MissionStatus.PRE_FLIGHT_CHECK, MissionStatus.ABORTED],
      [MissionStatus.PRE_FLIGHT_CHECK]: [MissionStatus.IN_PROGRESS, MissionStatus.ABORTED],
      [MissionStatus.IN_PROGRESS]: [MissionStatus.COMPLETED, MissionStatus.ABORTED],
      [MissionStatus.COMPLETED]: [],
      [MissionStatus.ABORTED]: [],
    } as Record<MissionStatus, MissionStatus[]>;

    if (!allowed[current].includes(next)) {
      throw new BadRequestException(`Invalid mission transition from ${current} to ${next}`);
    }
  }
}
