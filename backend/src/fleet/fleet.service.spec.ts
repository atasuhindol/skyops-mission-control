import { BadRequestException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { FleetService } from './fleet.service';
import { Drone, DroneModel, DroneStatus } from './entities/drone.entity';
import { Mission } from './entities/mission.entity';
import { MaintenanceLog } from './entities/maintenance-log.entity';

describe('FleetService', () => {
  let service: FleetService;

  const droneRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOneBy: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
    find: jest.fn(),
  };

  const missionRepo = {
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  const maintenanceRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findAndCount: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetService,
        { provide: getRepositoryToken(Drone), useValue: droneRepo },
        { provide: getRepositoryToken(Mission), useValue: missionRepo },
        { provide: getRepositoryToken(MaintenanceLog), useValue: maintenanceRepo },
      ],
    }).compile();

    service = module.get<FleetService>(FleetService);
    jest.clearAllMocks();
  });

  it('rejects invalid serial numbers', async () => {
    await expect(
      service.createDrone({
        identifier: 'Drone-1',
        serialNumber: 'bad-serial',
        model: DroneModel.PHANTOM_4,
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates a drone and computes a maintenance due date', async () => {
    droneRepo.create.mockReturnValue({
      identifier: 'Drone-2',
      serialNumber: 'SKY-1234-ABCD',
      model: DroneModel.PHANTOM_4,
      status: DroneStatus.AVAILABLE,
      totalFlightHours: 12,
      registrationTimestamp: new Date(),
    });
    droneRepo.save.mockResolvedValue({ id: '1', identifier: 'Drone-2', serialNumber: 'SKY-1234-ABCD' });

    await expect(
      service.createDrone({
        identifier: 'Drone-2',
        serialNumber: 'SKY-1234-ABCD',
        model: DroneModel.PHANTOM_4,
        totalFlightHours: 12,
      } as any),
    ).resolves.toEqual(expect.objectContaining({ id: '1' }));
  });
});
