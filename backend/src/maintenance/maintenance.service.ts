import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DroneStatus } from '../common/enums';
import { Drone } from '../drones/drone.entity';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto';
import { ListMaintenanceLogsDto } from './dto/list-maintenance-logs.dto';
import { MaintenanceLog } from './maintenance-log.entity';

@Injectable()
export class MaintenanceService {
  constructor(
    @InjectRepository(MaintenanceLog)
    private readonly maintenanceLogRepository: Repository<MaintenanceLog>,
    @InjectRepository(Drone)
    private readonly droneRepository: Repository<Drone>,
  ) {}

  async findAll(query: ListMaintenanceLogsDto) {
    const { page = 1, limit = 10, droneId } = query;
    const qb = this.maintenanceLogRepository.createQueryBuilder('log');
    qb.leftJoinAndSelect('log.drone', 'drone');

    if (droneId) {
      qb.andWhere('log.droneId = :droneId', { droneId });
    }

    const [items, total] = await qb.orderBy('log.datePerformed', 'DESC').skip((page - 1) * limit).take(limit).getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(dto: CreateMaintenanceLogDto) {
    const drone = await this.droneRepository.findOne({ where: { id: dto.droneId } });
    if (!drone) {
      throw new NotFoundException('Drone not found');
    }

    if (Math.abs(dto.flightHoursAtMaintenance - drone.totalFlightHours) > 5) {
      throw new BadRequestException('Recorded flight hours are inconsistent with the drone total');
    }

    const log = this.maintenanceLogRepository.create({
      ...dto,
      datePerformed: new Date(dto.datePerformed),
      drone,
    });

    drone.lastMaintenanceDate = new Date(dto.datePerformed);
    drone.nextMaintenanceDueDate = this.addDays(new Date(dto.datePerformed), 90);
    drone.status = DroneStatus.AVAILABLE;
    drone.lastMaintenanceFlightHours = dto.flightHoursAtMaintenance;
    await this.droneRepository.save(drone);

    return this.maintenanceLogRepository.save(log);
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }
}
