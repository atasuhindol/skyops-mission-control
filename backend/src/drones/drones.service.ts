import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DroneStatus, MissionStatus } from '../common/enums';
import { Drone } from './drone.entity';
import { CreateDroneDto } from './dto/create-drone.dto';
import { UpdateDroneDto } from './dto/update-drone.dto';
import { ListDronesDto } from './dto/list-drones.dto';
import { Mission } from '../missions/mission.entity';

const serialRegex = /^SKY-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

@Injectable()
export class DronesService {
  constructor(
    @InjectRepository(Drone)
    private readonly droneRepository: Repository<Drone>,
    @InjectRepository(Mission)
    private readonly missionRepository: Repository<Mission>,
  ) {}

  async findAll(query: ListDronesDto) {
    const { page = 1, limit = 10, status } = query;
    const qb = this.droneRepository.createQueryBuilder('drone');

    if (status) {
      qb.where('drone.status = :status', { status });
    }

    const [items, total] = await qb
      .orderBy('drone.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: number) {
    const drone = await this.droneRepository.findOne({ where: { id }, relations: { missions: true, maintenanceLogs: true } });
    if (!drone) {
      throw new NotFoundException('Drone not found');
    }
    return drone;
  }

  async create(dto: CreateDroneDto) {
    this.ensureValidSerial(dto.serialNumber);

    const existing = await this.droneRepository.findOne({ where: [{ identifier: dto.identifier }, { serialNumber: dto.serialNumber }] });
    if (existing) {
      throw new BadRequestException('Drone identifier or serial number already exists');
    }

    const registrationTimestamp = new Date();
    const drone = this.droneRepository.create({
      ...dto,
      registrationTimestamp,
      lastMaintenanceDate: dto.lastMaintenanceDate ? new Date(dto.lastMaintenanceDate) : registrationTimestamp,
      nextMaintenanceDueDate: dto.nextMaintenanceDueDate ? new Date(dto.nextMaintenanceDueDate) : this.addDays(registrationTimestamp, 90),
      status: dto.status ?? DroneStatus.AVAILABLE,
      totalFlightHours: dto.totalFlightHours ?? 0,
      lastMaintenanceFlightHours: dto.totalFlightHours ?? 0,
    });

    return this.droneRepository.save(drone);
  }

  async update(id: number, dto: UpdateDroneDto) {
    const drone = await this.findOne(id);
    if (dto.serialNumber) {
      this.ensureValidSerial(dto.serialNumber);
    }
    if (dto.status === DroneStatus.RETIRED) {
      const upcomingMissions = await this.missionRepository.count({
        where: {
          droneId: id,
          status: MissionStatus.PLANNED,
        },
      });
      if (upcomingMissions > 0) {
        throw new BadRequestException('A drone with upcoming missions cannot be retired');
      }
    }

    Object.assign(drone, dto);
    if (dto.lastMaintenanceDate) {
      drone.lastMaintenanceDate = new Date(dto.lastMaintenanceDate);
    }
    if (dto.nextMaintenanceDueDate) {
      drone.nextMaintenanceDueDate = new Date(dto.nextMaintenanceDueDate);
    }
    return this.droneRepository.save(drone);
  }

  async remove(id: number) {
    const drone = await this.findOne(id);
    await this.droneRepository.remove(drone);
    return { deleted: true };
  }

  async markMaintenanceDue(drone: Drone) {
    drone.status = DroneStatus.MAINTENANCE;
    drone.nextMaintenanceDueDate = new Date();
    return this.droneRepository.save(drone);
  }

  async markAvailable(drone: Drone) {
    if (drone.status === DroneStatus.RETIRED) {
      return drone;
    }
    drone.status = DroneStatus.AVAILABLE;
    return this.droneRepository.save(drone);
  }

  private addDays(date: Date, days: number) {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private ensureValidSerial(serialNumber: string) {
    if (!serialRegex.test(serialNumber)) {
      throw new BadRequestException('Serial number must follow the SKY-XXXX-XXXX format');
    }
  }
}
