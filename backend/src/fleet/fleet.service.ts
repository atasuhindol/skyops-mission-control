import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThanOrEqual, Repository } from 'typeorm';
import { CreateDroneDto } from './dto/create-drone.dto';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateDroneDto } from './dto/update-drone.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { Drone, DroneStatus } from './entities/drone.entity';
import { MaintenanceLog } from './entities/maintenance-log.entity';
import { Mission, MissionStatus } from './entities/mission.entity';

@Injectable()
export class FleetService {
  constructor(
    @InjectRepository(Drone) private readonly droneRepository: Repository<Drone>,
    @InjectRepository(Mission) private readonly missionRepository: Repository<Mission>,
    @InjectRepository(MaintenanceLog) private readonly maintenanceLogRepository: Repository<MaintenanceLog>,
  ) {}

  async getDrones(page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;
    const query = this.droneRepository.createQueryBuilder('drone');

    if (search) {
      query.where('drone.identifier LIKE :search OR drone.serialNumber LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [items, total] = await query.orderBy('drone.registrationTimestamp', 'DESC').skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit };
  }

  async getDrone(id: string) {
    const drone = await this.droneRepository.findOne({
      where: { id },
      relations: { missions: true, maintenanceLogs: true },
    });

    if (!drone) {
      throw new NotFoundException('Drone not found');
    }

    return drone;
  }

  async createDrone(dto: CreateDroneDto) {
    this.ensureSerialNumber(dto.serialNumber);
    const drone = this.droneRepository.create({
      ...dto,
      status: dto.status ?? DroneStatus.AVAILABLE,
      totalFlightHours: dto.totalFlightHours ?? 0,
      registrationTimestamp: new Date(),
      lastMaintenanceDate: dto.lastMaintenanceDate ? dto.lastMaintenanceDate : null,
      nextMaintenanceDueDate: this.calculateNextMaintenanceDueDate(dto.lastMaintenanceDate ?? null, dto.totalFlightHours ?? 0),
    });
    return this.droneRepository.save(drone);
  }

  async updateDrone(id: string, dto: UpdateDroneDto) {
    const drone = await this.droneRepository.findOneBy({ id });
    if (!drone) {
      throw new NotFoundException('Drone not found');
    }

    if (dto.serialNumber) {
      this.ensureSerialNumber(dto.serialNumber);
    }

    if (dto.totalFlightHours !== undefined || dto.lastMaintenanceDate !== undefined) {
      const totalFlightHours = dto.totalFlightHours ?? drone.totalFlightHours;
      const lastMaintenanceDate = dto.lastMaintenanceDate ?? drone.lastMaintenanceDate;
      drone.nextMaintenanceDueDate = this.calculateNextMaintenanceDueDate(lastMaintenanceDate, totalFlightHours);
    }

    Object.assign(drone, dto);
    return this.droneRepository.save(drone);
  }

  async deleteDrone(id: string) {
    const drone = await this.droneRepository.findOneBy({ id });
    if (!drone) {
      throw new NotFoundException('Drone not found');
    }

    const activeMissionCount = await this.missionRepository.count({ where: { drone: { id } } });
    if (activeMissionCount > 0) {
      throw new BadRequestException('Cannot retire a drone with assigned missions');
    }

    await this.droneRepository.remove(drone);
    return { deleted: true };
  }

  async getMissions(page = 1, limit = 10, status?: string, droneId?: string, startDate?: string, endDate?: string) {
    const skip = (page - 1) * limit;
    const query = this.missionRepository.createQueryBuilder('mission').leftJoinAndSelect('mission.drone', 'drone');

    if (status) {
      query.andWhere('mission.status = :status', { status });
    }

    if (droneId) {
      query.andWhere('drone.id = :droneId', { droneId });
    }

    if (startDate) {
      query.andWhere('mission.scheduledStart >= :startDate', { startDate });
    }

    if (endDate) {
      query.andWhere('mission.scheduledEnd <= :endDate', { endDate });
    }

    const [items, total] = await query.orderBy('mission.scheduledStart', 'ASC').skip(skip).take(limit).getManyAndCount();
    return { items, total, page, limit };
  }

  async createMission(dto: CreateMissionDto) {
    const drone = await this.droneRepository.findOneBy({ id: dto.droneId });
    if (!drone) {
      throw new NotFoundException('Drone not found');
    }

    if (drone.status !== DroneStatus.AVAILABLE) {
      throw new BadRequestException('Selected drone is not available');
    }

    const scheduledStart = new Date(dto.scheduledStart);
    const scheduledEnd = new Date(dto.scheduledEnd);
    if (scheduledStart < new Date()) {
      throw new BadRequestException('Mission cannot be scheduled in the past');
    }

    if (scheduledEnd <= scheduledStart) {
      throw new BadRequestException('Mission end must be after the start');
    }

    const overlap = await this.missionRepository.count({
      where: [
        {
          drone: { id: dto.droneId },
          scheduledStart: LessThanOrEqual(scheduledEnd),
          scheduledEnd: Between(scheduledStart, scheduledEnd),
        },
      ],
    });

    if (overlap > 0) {
      throw new BadRequestException('Drone already has an overlapping mission');
    }

    const mission = this.missionRepository.create({
      ...dto,
      scheduledStart,
      scheduledEnd,
      status: MissionStatus.PLANNED,
      drone,
    });

    return this.missionRepository.save(mission);
  }

  async updateMission(id: string, dto: UpdateMissionDto) {
    const mission = await this.missionRepository.findOne({
      where: { id },
      relations: { drone: true },
    });

    if (!mission || !mission.drone) {
      throw new NotFoundException('Mission not found');
    }

    const nextStatus = dto.status ?? mission.status;
    if (!this.isValidTransition(mission.status, nextStatus)) {
      throw new BadRequestException(`Invalid mission transition from ${mission.status} to ${nextStatus}`);
    }

    if (nextStatus === MissionStatus.ABORTED && !dto.abortReason) {
      throw new BadRequestException('Abort reason is required');
    }

    if (nextStatus === MissionStatus.COMPLETED && dto.flightHoursLogged === undefined) {
      throw new BadRequestException('Flight hours logged are required for completion');
    }

    Object.assign(mission, dto, {
      status: nextStatus,
      actualStart: dto.actualStart ? new Date(dto.actualStart) : mission.actualStart,
      actualEnd: dto.actualEnd ? new Date(dto.actualEnd) : mission.actualEnd,
      abortReason: dto.abortReason ?? mission.abortReason,
    });

    if (nextStatus === MissionStatus.IN_PROGRESS && !mission.actualStart) {
      mission.actualStart = new Date();
    }

    if (nextStatus === MissionStatus.COMPLETED) {
      mission.actualEnd = mission.actualEnd ?? new Date();
      mission.flightHoursLogged = dto.flightHoursLogged ?? mission.flightHoursLogged;
      mission.drone.totalFlightHours += mission.flightHoursLogged;
      mission.drone.nextMaintenanceDueDate = this.calculateNextMaintenanceDueDate(
        mission.drone.lastMaintenanceDate,
        mission.drone.totalFlightHours,
      );
      mission.drone.status = DroneStatus.AVAILABLE;
    }

    if (nextStatus === MissionStatus.ABORTED) {
      mission.drone.status = DroneStatus.AVAILABLE;
    }

    if (nextStatus === MissionStatus.IN_PROGRESS) {
      mission.drone.status = DroneStatus.IN_MISSION;
    }

    await this.droneRepository.save(mission.drone);
    return this.missionRepository.save(mission);
  }

  async createMaintenanceLog(dto: CreateMaintenanceLogDto) {
    const drone = await this.droneRepository.findOneBy({ id: dto.droneId });
    if (!drone) {
      throw new NotFoundException('Drone not found');
    }

    if (dto.flightHoursAtMaintenance < drone.totalFlightHours - 1 || dto.flightHoursAtMaintenance > drone.totalFlightHours + 1) {
      throw new BadRequestException('Recorded maintenance hours must match the drone total flight hours within tolerance');
    }

    const maintenanceLog = this.maintenanceLogRepository.create({
      ...dto,
      datePerformed: new Date(dto.datePerformed),
      drone,
    });

    drone.status = DroneStatus.MAINTENANCE;
    drone.lastMaintenanceDate = this.formatDate(maintenanceLog.datePerformed);
    drone.nextMaintenanceDueDate = this.calculateNextMaintenanceDueDate(drone.lastMaintenanceDate, drone.totalFlightHours);

    await this.droneRepository.save(drone);
    return this.maintenanceLogRepository.save(maintenanceLog);
  }

  async getMaintenanceLogs(page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [items, total] = await this.maintenanceLogRepository.findAndCount({
      relations: { drone: true },
      order: { datePerformed: 'DESC' },
      skip,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async getFleetHealth() {
    const drones = await this.droneRepository.find();
    const now = new Date();
    const total = drones.length;
    const byStatus = drones.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const overdueMaintenance = drones.filter((drone) => this.isMaintenanceDue(drone, now));
    const next24HoursMissions = await this.missionRepository.count({
      where: {
        scheduledStart: Between(new Date(), new Date(Date.now() + 24 * 60 * 60 * 1000)),
      },
    });

    const averageFlightHours = total > 0 ? drones.reduce((sum, drone) => sum + drone.totalFlightHours, 0) / total : 0;

    return {
      totalDrones: total,
      breakdownByStatus: byStatus,
      overdueMaintenance: overdueMaintenance.map((drone) => ({
        id: drone.id,
        identifier: drone.identifier,
        serialNumber: drone.serialNumber,
        nextMaintenanceDueDate: drone.nextMaintenanceDueDate,
      })),
      missionsInNext24Hours: next24HoursMissions,
      averageFlightHoursPerDrone: Number(averageFlightHours.toFixed(1)),
    };
  }

  private ensureSerialNumber(serialNumber: string) {
    const pattern = /^SKY-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    if (!pattern.test(serialNumber)) {
      throw new BadRequestException('Serial number must follow SKY-XXXX-XXXX');
    }
  }

  private calculateNextMaintenanceDueDate(lastMaintenanceDate: string | null, totalFlightHours: number) {
    const baseDate = lastMaintenanceDate ? new Date(lastMaintenanceDate) : new Date();
    const ninetyDaysLater = new Date(baseDate);
    ninetyDaysLater.setDate(ninetyDaysLater.getDate() + 90);

    if (totalFlightHours >= 50) {
      return this.formatDate(new Date());
    }

    return this.formatDate(ninetyDaysLater);
  }

  private isMaintenanceDue(drone: Drone, now: Date) {
    const dueDate = drone.nextMaintenanceDueDate ? new Date(drone.nextMaintenanceDueDate) : null;
    return drone.totalFlightHours >= 50 || (dueDate ? dueDate <= now : false);
  }

  private formatDate(date: Date) {
    return date.toISOString().split('T')[0];
  }

  private isValidTransition(from: MissionStatus, to: MissionStatus) {
    const transitions: Record<MissionStatus, MissionStatus[]> = {
      [MissionStatus.PLANNED]: [MissionStatus.PRE_FLIGHT_CHECK, MissionStatus.ABORTED],
      [MissionStatus.PRE_FLIGHT_CHECK]: [MissionStatus.IN_PROGRESS, MissionStatus.ABORTED],
      [MissionStatus.IN_PROGRESS]: [MissionStatus.COMPLETED, MissionStatus.ABORTED],
      [MissionStatus.COMPLETED]: [],
      [MissionStatus.ABORTED]: [],
    };

    return transitions[from]?.includes(to) ?? false;
  }
}
