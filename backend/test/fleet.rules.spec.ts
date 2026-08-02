import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FleetService } from '../src/fleet/fleet.service';
import { Drone, DroneModel, DroneStatus } from '../src/fleet/entities/drone.entity';
import { Mission, MissionStatus, MissionType } from '../src/fleet/entities/mission.entity';
import { MaintenanceLog } from '../src/fleet/entities/maintenance-log.entity';

describe('FleetService Business Rules', () => {
  let service: FleetService;
  let droneRepository: Repository<Drone>;
  let missionRepository: Repository<Mission>;
  let maintenanceLogRepository: Repository<MaintenanceLog>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FleetService,
        {
          provide: getRepositoryToken(Drone),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            remove: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Mission),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MaintenanceLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findAndCount: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<FleetService>(FleetService);
    droneRepository = module.get<Repository<Drone>>(getRepositoryToken(Drone));
    missionRepository = module.get<Repository<Mission>>(getRepositoryToken(Mission));
    maintenanceLogRepository = module.get<Repository<MaintenanceLog>>(getRepositoryToken(MaintenanceLog));
  });

  describe('Serial Number Format Validation (SKY-XXXX-XXXX)', () => {
    const validFormats = [
      'SKY-0000-0000',
      'SKY-ABCD-EFGH',
      'SKY-1234-5678',
      'SKY-XXXX-XXXX',
      'SKY-abcd-efgh',
      'SKY-A1B2-C3D4',
    ];

    const invalidFormats = [
      'SKY-123-456',
      'sky-1234-5678',
      'SKY1234-5678',
      'SKY-1234_5678',
      'SKY-12345-678',
      'SKYABCD-EFGH',
      'INVALID-1234-5678',
      'SKY-',
      '',
    ];

    validFormats.forEach((format) => {
      it(`should accept valid format: ${format}`, async () => {
        jest.spyOn(droneRepository, 'create').mockReturnValue({
          id: 'drone-1',
          identifier: 'TEST',
          serialNumber: format,
          model: DroneModel.PHANTOM_4,
          status: DroneStatus.AVAILABLE,
          totalFlightHours: 0,
          lastMaintenanceDate: null,
          nextMaintenanceDueDate: null,
          registrationTimestamp: new Date(),
          missions: [],
          maintenanceLogs: [],
        } as any);
        jest.spyOn(droneRepository, 'save').mockResolvedValue({
          id: 'drone-1',
          serialNumber: format,
        } as any);

        const result = await service.createDrone({
          identifier: 'TEST',
          serialNumber: format,
          model: DroneModel.PHANTOM_4,
        });

        expect(result).toBeDefined();
      });
    });

    invalidFormats.forEach((format) => {
      it(`should reject invalid format: ${format}`, async () => {
        await expect(
          service.createDrone({
            identifier: 'TEST',
            serialNumber: format,
            model: DroneModel.PHANTOM_4,
          }),
        ).rejects.toThrow(BadRequestException);
      });
    });
  });

  describe('Maintenance Calculation (50 hours OR 90 days)', () => {
    it('should flag maintenance due when flight hours reach exactly 50', async () => {
      const drone50Hours = {
        id: 'drone-50h',
        identifier: 'DRONE-50H',
        serialNumber: 'SKY-0000-0000',
        model: DroneModel.PHANTOM_4,
        status: DroneStatus.AVAILABLE,
        totalFlightHours: 50,
        lastMaintenanceDate: new Date().toISOString().split('T')[0],
        nextMaintenanceDueDate: new Date().toISOString().split('T')[0],
        registrationTimestamp: new Date(),
        missions: [],
        maintenanceLogs: [],
      };

      jest.spyOn(droneRepository, 'find').mockResolvedValue([drone50Hours] as any);

      const health = await service.getFleetHealth();

      expect(health.overdueMaintenance).toContainEqual(
        expect.objectContaining({
          identifier: 'DRONE-50H',
        }),
      );
    });

    it('should flag maintenance due when flight hours exceed 50', async () => {
      const drone75Hours = {
        id: 'drone-75h',
        identifier: 'DRONE-75H',
        serialNumber: 'SKY-0000-0001',
        model: DroneModel.PHANTOM_4,
        status: DroneStatus.AVAILABLE,
        totalFlightHours: 75,
        lastMaintenanceDate: null,
        nextMaintenanceDueDate: null,
        registrationTimestamp: new Date(),
        missions: [],
        maintenanceLogs: [],
      };

      jest.spyOn(droneRepository, 'find').mockResolvedValue([drone75Hours] as any);

      const health = await service.getFleetHealth();

      expect(health.overdueMaintenance).toContainEqual(
        expect.objectContaining({
          identifier: 'DRONE-75H',
        }),
      );
    });

    it('should NOT flag maintenance due when flight hours are below 50 and within 90 days', async () => {
      const recentlyMaintainedDrone = {
        id: 'drone-recent',
        identifier: 'DRONE-RECENT',
        serialNumber: 'SKY-0000-0002',
        model: DroneModel.PHANTOM_4,
        status: DroneStatus.AVAILABLE,
        totalFlightHours: 30,
        lastMaintenanceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        nextMaintenanceDueDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        registrationTimestamp: new Date(),
        missions: [],
        maintenanceLogs: [],
      };

      jest.spyOn(droneRepository, 'find').mockResolvedValue([recentlyMaintainedDrone] as any);

      const health = await service.getFleetHealth();

      expect(health.overdueMaintenance).not.toContainEqual(
        expect.objectContaining({
          identifier: 'DRONE-RECENT',
        }),
      );
    });

    it('should flag maintenance due at exactly 90 days after last maintenance', async () => {
      const ninetyDaysDrone = {
        id: 'drone-90d',
        identifier: 'DRONE-90D',
        serialNumber: 'SKY-0000-0003',
        model: DroneModel.PHANTOM_4,
        status: DroneStatus.AVAILABLE,
        totalFlightHours: 30,
        lastMaintenanceDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        nextMaintenanceDueDate: new Date(Date.now()).toISOString().split('T')[0],
        registrationTimestamp: new Date(),
        missions: [],
        maintenanceLogs: [],
      };

      jest.spyOn(droneRepository, 'find').mockResolvedValue([ninetyDaysDrone] as any);

      const health = await service.getFleetHealth();

      expect(health.overdueMaintenance).toContainEqual(
        expect.objectContaining({
          identifier: 'DRONE-90D',
        }),
      );
    });

    it('should flag maintenance due beyond 90 days after last maintenance', async () => {
      const overDueDrone = {
        id: 'drone-overdue',
        identifier: 'DRONE-OVERDUE',
        serialNumber: 'SKY-0000-0004',
        model: DroneModel.PHANTOM_4,
        status: DroneStatus.AVAILABLE,
        totalFlightHours: 30,
        lastMaintenanceDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        nextMaintenanceDueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        registrationTimestamp: new Date(),
        missions: [],
        maintenanceLogs: [],
      };

      jest.spyOn(droneRepository, 'find').mockResolvedValue([overDueDrone] as any);

      const health = await service.getFleetHealth();

      expect(health.overdueMaintenance).toContainEqual(
        expect.objectContaining({
          identifier: 'DRONE-OVERDUE',
        }),
      );
    });
  });

  describe('Mission State Transitions (Strict State Machine)', () => {
    const baseChain: Array<[MissionStatus, MissionStatus, boolean]> = [
      [MissionStatus.PLANNED, MissionStatus.PRE_FLIGHT_CHECK, true],
      [MissionStatus.PLANNED, MissionStatus.ABORTED, true],
      [MissionStatus.PLANNED, MissionStatus.IN_PROGRESS, false],
      [MissionStatus.PLANNED, MissionStatus.COMPLETED, false],
      [MissionStatus.PRE_FLIGHT_CHECK, MissionStatus.IN_PROGRESS, true],
      [MissionStatus.PRE_FLIGHT_CHECK, MissionStatus.ABORTED, true],
      [MissionStatus.PRE_FLIGHT_CHECK, MissionStatus.PLANNED, false],
      [MissionStatus.PRE_FLIGHT_CHECK, MissionStatus.COMPLETED, false],
      [MissionStatus.IN_PROGRESS, MissionStatus.COMPLETED, true],
      [MissionStatus.IN_PROGRESS, MissionStatus.ABORTED, true],
      [MissionStatus.IN_PROGRESS, MissionStatus.PLANNED, false],
      [MissionStatus.IN_PROGRESS, MissionStatus.PRE_FLIGHT_CHECK, false],
      [MissionStatus.COMPLETED, MissionStatus.PLANNED, false],
      [MissionStatus.COMPLETED, MissionStatus.PRE_FLIGHT_CHECK, false],
      [MissionStatus.COMPLETED, MissionStatus.IN_PROGRESS, false],
      [MissionStatus.COMPLETED, MissionStatus.ABORTED, false],
      [MissionStatus.ABORTED, MissionStatus.PLANNED, false],
      [MissionStatus.ABORTED, MissionStatus.PRE_FLIGHT_CHECK, false],
      [MissionStatus.ABORTED, MissionStatus.IN_PROGRESS, false],
      [MissionStatus.ABORTED, MissionStatus.COMPLETED, false],
    ];

    baseChain.forEach(([fromStatus, toStatus, shouldSucceed]) => {
      const drone = {
        id: 'drone-1',
        identifier: 'DRONE-001',
        serialNumber: 'SKY-0000-0000',
        model: DroneModel.PHANTOM_4,
        status: DroneStatus.AVAILABLE,
        totalFlightHours: 30,
        lastMaintenanceDate: null,
        nextMaintenanceDueDate: null,
        registrationTimestamp: new Date(),
        missions: [],
        maintenanceLogs: [],
      };

      const mission = {
        id: 'mission-1',
        name: 'Test Mission',
        type: MissionType.WIND_TURBINE_INSPECTION,
        pilotName: 'Pilot',
        siteLocation: 'Site',
        status: fromStatus,
        scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
        scheduledEnd: new Date(Date.now() + 26 * 60 * 60 * 1000),
        actualStart: null,
        actualEnd: null,
        flightHoursLogged: 0,
        abortReason: null,
        createdAt: new Date(),
        drone,
      };

      const description = shouldSucceed
        ? `should allow ${fromStatus} -> ${toStatus}`
        : `should reject ${fromStatus} -> ${toStatus}`;

      if (shouldSucceed) {
        it(description, async () => {
          jest.spyOn(missionRepository, 'findOne').mockResolvedValue(mission as any);
          jest.spyOn(droneRepository, 'save').mockResolvedValue(drone as any);

          if (toStatus === MissionStatus.COMPLETED) {
            jest.spyOn(missionRepository, 'save').mockResolvedValue({
              ...mission,
              status: toStatus,
              actualEnd: new Date(),
            } as any);

            const result = await service.updateMission(mission.id, {
              status: toStatus,
              flightHoursLogged: 2,
            });

            expect(result.status).toBe(toStatus);
          } else if (toStatus === MissionStatus.ABORTED) {
            jest.spyOn(missionRepository, 'save').mockResolvedValue({
              ...mission,
              status: toStatus,
            } as any);

            const result = await service.updateMission(mission.id, {
              status: toStatus,
              abortReason: 'Test abort',
            });

            expect(result.status).toBe(toStatus);
          } else {
            jest.spyOn(missionRepository, 'save').mockResolvedValue({
              ...mission,
              status: toStatus,
            } as any);

            const result = await service.updateMission(mission.id, {
              status: toStatus,
            });

            expect(result.status).toBe(toStatus);
          }
        });
      } else {
        it(description, async () => {
          jest.spyOn(missionRepository, 'findOne').mockResolvedValue(mission as any);

          await expect(
            service.updateMission(mission.id, {
              status: toStatus,
            }),
          ).rejects.toThrow(BadRequestException);
        });
      }
    });
  });

  describe('Mission Overlap Detection', () => {
    const drone = {
      id: 'drone-1',
      identifier: 'DRONE-001',
      serialNumber: 'SKY-0000-0000',
      model: DroneModel.PHANTOM_4,
      status: DroneStatus.AVAILABLE,
      totalFlightHours: 30,
      lastMaintenanceDate: null,
      nextMaintenanceDueDate: null,
      registrationTimestamp: new Date(),
      missions: [],
      maintenanceLogs: [],
    };

    it('should prevent missions that completely overlap', async () => {
      jest.spyOn(droneRepository, 'findOneBy').mockResolvedValue(drone as any);
      jest.spyOn(missionRepository, 'count').mockResolvedValue(1);

      const start1 = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const end1 = new Date(Date.now() + 26 * 60 * 60 * 1000);

      await expect(
        service.createMission({
          name: 'Mission 1',
          type: MissionType.WIND_TURBINE_INSPECTION,
          pilotName: 'Pilot',
          siteLocation: 'Site',
          scheduledStart: start1.toISOString(),
          scheduledEnd: end1.toISOString(),
          droneId: drone.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should prevent missions that partially overlap (existing mission starts first)', async () => {
      jest.spyOn(droneRepository, 'findOneBy').mockResolvedValue(drone as any);
      jest.spyOn(missionRepository, 'count').mockResolvedValue(1);

      const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const end = new Date(Date.now() + 30 * 60 * 60 * 1000);

      await expect(
        service.createMission({
          name: 'Overlapping Mission',
          type: MissionType.WIND_TURBINE_INSPECTION,
          pilotName: 'Pilot',
          siteLocation: 'Site',
          scheduledStart: start.toISOString(),
          scheduledEnd: end.toISOString(),
          droneId: drone.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow missions that do not overlap (sequential)', async () => {
      jest.spyOn(droneRepository, 'findOneBy').mockResolvedValue(drone as any);
      jest.spyOn(missionRepository, 'count').mockResolvedValue(0);

      const mission = {
        id: 'mission-1',
        name: 'Sequential Mission',
        type: MissionType.WIND_TURBINE_INSPECTION,
        pilotName: 'Pilot',
        siteLocation: 'Site',
        status: MissionStatus.PLANNED,
        scheduledStart: new Date(Date.now() + 48 * 60 * 60 * 1000),
        scheduledEnd: new Date(Date.now() + 50 * 60 * 60 * 1000),
        actualStart: null,
        actualEnd: null,
        flightHoursLogged: 0,
        abortReason: null,
        createdAt: new Date(),
        drone,
      };

      jest.spyOn(missionRepository, 'create').mockReturnValue(mission as any);
      jest.spyOn(missionRepository, 'save').mockResolvedValue(mission as any);

      const start = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const end = new Date(Date.now() + 50 * 60 * 60 * 1000);

      const result = await service.createMission({
        name: 'Sequential Mission',
        type: MissionType.WIND_TURBINE_INSPECTION,
        pilotName: 'Pilot',
        siteLocation: 'Site',
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        droneId: drone.id,
      });

      expect(result).toBeDefined();
    });

    it('should allow missions with exact boundary matching (one ends when other starts)', async () => {
      jest.spyOn(droneRepository, 'findOneBy').mockResolvedValue(drone as any);
      jest.spyOn(missionRepository, 'count').mockResolvedValue(0);

      const mission = {
        id: 'mission-1',
        name: 'Adjacent Mission',
        type: MissionType.WIND_TURBINE_INSPECTION,
        pilotName: 'Pilot',
        siteLocation: 'Site',
        status: MissionStatus.PLANNED,
        scheduledStart: new Date(Date.now() + 26 * 60 * 60 * 1000),
        scheduledEnd: new Date(Date.now() + 28 * 60 * 60 * 1000),
        actualStart: null,
        actualEnd: null,
        flightHoursLogged: 0,
        abortReason: null,
        createdAt: new Date(),
        drone,
      };

      jest.spyOn(missionRepository, 'create').mockReturnValue(mission as any);
      jest.spyOn(missionRepository, 'save').mockResolvedValue(mission as any);

      const start = new Date(Date.now() + 26 * 60 * 60 * 1000);
      const end = new Date(Date.now() + 28 * 60 * 60 * 1000);

      const result = await service.createMission({
        name: 'Adjacent Mission',
        type: MissionType.WIND_TURBINE_INSPECTION,
        pilotName: 'Pilot',
        siteLocation: 'Site',
        scheduledStart: start.toISOString(),
        scheduledEnd: end.toISOString(),
        droneId: drone.id,
      });

      expect(result).toBeDefined();
    });
  });
});
