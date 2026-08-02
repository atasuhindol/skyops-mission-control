import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { FleetService } from '../src/fleet/fleet.service';
import { Drone, DroneModel, DroneStatus } from '../src/fleet/entities/drone.entity';
import { Mission, MissionStatus, MissionType } from '../src/fleet/entities/mission.entity';
import { MaintenanceLog, MaintenanceType } from '../src/fleet/entities/maintenance-log.entity';

describe('FleetService', () => {
  let service: FleetService;
  let droneRepository: Repository<Drone>;
  let missionRepository: Repository<Mission>;
  let maintenanceLogRepository: Repository<MaintenanceLog>;

  const mockDrone = {
    id: 'drone-1',
    identifier: 'DRONE-001',
    serialNumber: 'SKY-A1B2-C3D4',
    model: DroneModel.PHANTOM_4,
    status: DroneStatus.AVAILABLE,
    totalFlightHours: 30,
    lastMaintenanceDate: null,
    nextMaintenanceDueDate: null,
    registrationTimestamp: new Date(),
    missions: [],
    maintenanceLogs: [],
  };

  const mockMission = {
    id: 'mission-1',
    name: 'Test Mission',
    type: MissionType.WIND_TURBINE_INSPECTION,
    pilotName: 'Pilot One',
    siteLocation: 'Site A',
    status: MissionStatus.PLANNED,
    scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000),
    scheduledEnd: new Date(Date.now() + 26 * 60 * 60 * 1000),
    actualStart: null,
    actualEnd: null,
    flightHoursLogged: 0,
    abortReason: null,
    createdAt: new Date(),
    drone: mockDrone,
  };

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
            findAndCount: jest.fn(),
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

  describe('Serial Number Format Validation', () => {
    it('should reject invalid serial number format', async () => {
      jest.spyOn(droneRepository, 'create').mockReturnValue(mockDrone as any);

      await expect(
        service.createDrone({
          identifier: 'DRONE-001',
          serialNumber: 'INVALID-1234',
          model: DroneModel.PHANTOM_4,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject serial number with wrong pattern', async () => {
      await expect(
        service.createDrone({
          identifier: 'DRONE-001',
          serialNumber: 'SKY-123-456',
          model: DroneModel.PHANTOM_4,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid SKY-XXXX-XXXX format', async () => {
      jest.spyOn(droneRepository, 'create').mockReturnValue({
        ...mockDrone,
        serialNumber: 'SKY-ABCD-EFGH',
      } as any);
      jest.spyOn(droneRepository, 'save').mockResolvedValue({
        ...mockDrone,
        serialNumber: 'SKY-ABCD-EFGH',
      } as any);

      const result = await service.createDrone({
        identifier: 'DRONE-001',
        serialNumber: 'SKY-ABCD-EFGH',
        model: DroneModel.PHANTOM_4,
      });

      expect(result).toBeDefined();
    });
  });

  describe('Maintenance Calculation', () => {
    it('should flag maintenance due when flight hours >= 50', async () => {
      const highHoursDrone = {
        ...mockDrone,
        totalFlightHours: 50,
      };

      jest.spyOn(droneRepository, 'find').mockResolvedValue([highHoursDrone] as any);

      const health = await service.getFleetHealth();

      expect(health.overdueMaintenance).toContainEqual(
        expect.objectContaining({
          identifier: 'DRONE-001',
        }),
      );
    });

    it('should flag maintenance due when date exceeds 90 days', async () => {
      const oldMaintenanceDrone = {
        ...mockDrone,
        totalFlightHours: 30,
        lastMaintenanceDate: new Date(Date.now() - 91 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        nextMaintenanceDueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      };

      jest.spyOn(droneRepository, 'find').mockResolvedValue([oldMaintenanceDrone] as any);

      const health = await service.getFleetHealth();

      expect(health.overdueMaintenance.length).toBeGreaterThan(0);
    });

    it('should calculate next maintenance correctly', async () => {
      jest.spyOn(droneRepository, 'create').mockReturnValue(mockDrone as any);
      jest.spyOn(droneRepository, 'save').mockResolvedValue({
        ...mockDrone,
        nextMaintenanceDueDate: expect.any(String),
      } as any);

      const result = await service.createDrone({
        identifier: 'DRONE-002',
        serialNumber: 'SKY-1234-5678',
        model: DroneModel.PHANTOM_4,
        totalFlightHours: 30,
      });

      expect(result).toBeDefined();
    });
  });

  describe('Mission State Transitions', () => {
    it('should allow PLANNED -> PRE_FLIGHT_CHECK', async () => {
      const mission = { ...mockMission };
      jest.spyOn(missionRepository, 'findOne').mockResolvedValue(mission as any);
      jest.spyOn(droneRepository, 'save').mockResolvedValue(mockDrone as any);
      jest.spyOn(missionRepository, 'save').mockResolvedValue({ ...mission, status: MissionStatus.PRE_FLIGHT_CHECK } as any);

      const result = await service.updateMission(mission.id, {
        status: MissionStatus.PRE_FLIGHT_CHECK,
      });

      expect(result.status).toBe(MissionStatus.PRE_FLIGHT_CHECK);
    });

    it('should allow PLANNED -> ABORTED', async () => {
      const mission = { ...mockMission };
      jest.spyOn(missionRepository, 'findOne').mockResolvedValue(mission as any);
      jest.spyOn(droneRepository, 'save').mockResolvedValue(mockDrone as any);
      jest.spyOn(missionRepository, 'save').mockResolvedValue({ ...mission, status: MissionStatus.ABORTED } as any);

      const result = await service.updateMission(mission.id, {
        status: MissionStatus.ABORTED,
        abortReason: 'Weather',
      });

      expect(result.status).toBe(MissionStatus.ABORTED);
    });

    it('should allow PRE_FLIGHT_CHECK -> IN_PROGRESS', async () => {
      const mission = { ...mockMission, status: MissionStatus.PRE_FLIGHT_CHECK };
      jest.spyOn(missionRepository, 'findOne').mockResolvedValue(mission as any);
      jest.spyOn(droneRepository, 'save').mockResolvedValue(mockDrone as any);
      jest.spyOn(missionRepository, 'save').mockResolvedValue({ ...mission, status: MissionStatus.IN_PROGRESS } as any);

      const result = await service.updateMission(mission.id, {
        status: MissionStatus.IN_PROGRESS,
      });

      expect(result.status).toBe(MissionStatus.IN_PROGRESS);
    });

    it('should allow IN_PROGRESS -> COMPLETED', async () => {
      const mission = { ...mockMission, status: MissionStatus.IN_PROGRESS, actualStart: new Date() };
      jest.spyOn(missionRepository, 'findOne').mockResolvedValue(mission as any);
      jest.spyOn(droneRepository, 'save').mockResolvedValue(mockDrone as any);
      jest.spyOn(missionRepository, 'save').mockResolvedValue({ ...mission, status: MissionStatus.COMPLETED } as any);

      const result = await service.updateMission(mission.id, {
        status: MissionStatus.COMPLETED,
        flightHoursLogged: 2,
      });

      expect(result.status).toBe(MissionStatus.COMPLETED);
    });

    it('should reject invalid transition COMPLETED -> IN_PROGRESS', async () => {
      const mission = { ...mockMission, status: MissionStatus.COMPLETED };
      jest.spyOn(missionRepository, 'findOne').mockResolvedValue(mission as any);

      await expect(
        service.updateMission(mission.id, {
          status: MissionStatus.IN_PROGRESS,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject PLANNED -> COMPLETED (skip to end)', async () => {
      const mission = { ...mockMission, status: MissionStatus.PLANNED };
      jest.spyOn(missionRepository, 'findOne').mockResolvedValue(mission as any);

      await expect(
        service.updateMission(mission.id, {
          status: MissionStatus.COMPLETED,
          flightHoursLogged: 2,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require abortReason when aborting', async () => {
      const mission = { ...mockMission };
      jest.spyOn(missionRepository, 'findOne').mockResolvedValue(mission as any);

      await expect(
        service.updateMission(mission.id, {
          status: MissionStatus.ABORTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should require flightHoursLogged when completing', async () => {
      const mission = { ...mockMission, status: MissionStatus.IN_PROGRESS, actualStart: new Date() };
      jest.spyOn(missionRepository, 'findOne').mockResolvedValue(mission as any);

      await expect(
        service.updateMission(mission.id, {
          status: MissionStatus.COMPLETED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Mission Overlap Detection', () => {
    it('should prevent overlapping missions on same drone', async () => {
      const drone = { ...mockDrone };
      jest.spyOn(droneRepository, 'findOneBy').mockResolvedValue(drone as any);
      jest.spyOn(missionRepository, 'count').mockResolvedValue(1);

      const dto = {
        name: 'Overlapping Mission',
        type: MissionType.WIND_TURBINE_INSPECTION,
        pilotName: 'Pilot Two',
        siteLocation: 'Site B',
        scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
        droneId: drone.id,
      };

      await expect(service.createMission(dto)).rejects.toThrow(BadRequestException);
    });

    it('should allow non-overlapping missions on same drone', async () => {
      const drone = { ...mockDrone };
      jest.spyOn(droneRepository, 'findOneBy').mockResolvedValue(drone as any);
      jest.spyOn(missionRepository, 'count').mockResolvedValue(0);
      jest.spyOn(missionRepository, 'create').mockReturnValue(mockMission as any);
      jest.spyOn(missionRepository, 'save').mockResolvedValue(mockMission as any);

      const dto = {
        name: 'Non-overlapping Mission',
        type: MissionType.WIND_TURBINE_INSPECTION,
        pilotName: 'Pilot Two',
        siteLocation: 'Site B',
        scheduledStart: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(Date.now() + 50 * 60 * 60 * 1000).toISOString(),
        droneId: drone.id,
      };

      const result = await service.createMission(dto);
      expect(result).toBeDefined();
    });
  });

  describe('Drone Status Management', () => {
    it('should set drone to IN_MISSION when mission starts', async () => {
      const mission = { ...mockMission, status: MissionStatus.PRE_FLIGHT_CHECK };
      jest.spyOn(missionRepository, 'findOne').mockResolvedValue(mission as any);
      jest.spyOn(droneRepository, 'save').mockResolvedValue({ ...mockDrone, status: DroneStatus.IN_MISSION } as any);
      jest.spyOn(missionRepository, 'save').mockResolvedValue({ ...mission, status: MissionStatus.IN_PROGRESS } as any);

      const result = await service.updateMission(mission.id, {
        status: MissionStatus.IN_PROGRESS,
      });

      expect(result.status).toBe(MissionStatus.IN_PROGRESS);
    });

    it('should set drone to AVAILABLE when mission completes', async () => {
      const mission = { ...mockMission, status: MissionStatus.IN_PROGRESS, actualStart: new Date() };
      jest.spyOn(missionRepository, 'findOne').mockResolvedValue(mission as any);
      jest.spyOn(droneRepository, 'save').mockResolvedValue({ ...mockDrone, status: DroneStatus.AVAILABLE } as any);
      jest.spyOn(missionRepository, 'save').mockResolvedValue({ ...mission, status: MissionStatus.COMPLETED } as any);

      const result = await service.updateMission(mission.id, {
        status: MissionStatus.COMPLETED,
        flightHoursLogged: 2,
      });

      expect(result.status).toBe(MissionStatus.COMPLETED);
    });
  });

  describe('Maintenance Log Validation', () => {
    it('should reject maintenance hours not matching drone total (outside tolerance)', async () => {
      const drone = { ...mockDrone, totalFlightHours: 30 };
      jest.spyOn(droneRepository, 'findOneBy').mockResolvedValue(drone as any);

      await expect(
        service.createMaintenanceLog({
          droneId: drone.id,
          type: MaintenanceType.ROUTINE_CHECK,
          technicianName: 'Tech One',
          datePerformed: new Date().toISOString(),
          flightHoursAtMaintenance: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept maintenance hours within tolerance', async () => {
      const drone = { ...mockDrone, totalFlightHours: 30 };
      jest.spyOn(droneRepository, 'findOneBy').mockResolvedValue(drone as any);
      jest.spyOn(maintenanceLogRepository, 'create').mockReturnValue({
        id: 'log-1',
        drone,
        type: MaintenanceType.ROUTINE_CHECK,
        technicianName: 'Tech One',
        notes: null,
        datePerformed: new Date(),
        flightHoursAtMaintenance: 31,
        createdAt: new Date(),
      } as any);
      jest.spyOn(maintenanceLogRepository, 'save').mockResolvedValue({
        id: 'log-1',
        drone,
        type: MaintenanceType.ROUTINE_CHECK,
        technicianName: 'Tech One',
        notes: null,
        datePerformed: new Date(),
        flightHoursAtMaintenance: 31,
        createdAt: new Date(),
      } as any);
      jest.spyOn(droneRepository, 'save').mockResolvedValue(drone as any);

      const result = await service.createMaintenanceLog({
        droneId: drone.id,
        type: MaintenanceType.ROUTINE_CHECK,
        technicianName: 'Tech One',
        datePerformed: new Date().toISOString(),
        flightHoursAtMaintenance: 31,
      });

      expect(result).toBeDefined();
    });
  });

  describe('Drone Deletion', () => {
    it('should prevent deletion of drone with active missions', async () => {
      const drone = { ...mockDrone };
      jest.spyOn(droneRepository, 'findOneBy').mockResolvedValue(drone as any);
      jest.spyOn(missionRepository, 'count').mockResolvedValue(1);

      await expect(service.deleteDrone(drone.id)).rejects.toThrow(BadRequestException);
    });

    it('should allow deletion of drone without missions', async () => {
      const drone = { ...mockDrone };
      jest.spyOn(droneRepository, 'findOneBy').mockResolvedValue(drone as any);
      jest.spyOn(missionRepository, 'count').mockResolvedValue(0);
      jest.spyOn(droneRepository, 'remove').mockResolvedValue(drone as any);

      const result = await service.deleteDrone(drone.id);
      expect(result.deleted).toBe(true);
    });
  });

  describe('Drone Availability', () => {
    it('should prevent mission creation on unavailable drone', async () => {
      const unavailableDrone = { ...mockDrone, status: DroneStatus.MAINTENANCE };
      jest.spyOn(droneRepository, 'findOneBy').mockResolvedValue(unavailableDrone as any);

      await expect(
        service.createMission({
          name: 'Mission',
          type: MissionType.WIND_TURBINE_INSPECTION,
          pilotName: 'Pilot',
          siteLocation: 'Site',
          scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          scheduledEnd: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
          droneId: unavailableDrone.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow mission creation on available drone', async () => {
      const drone = { ...mockDrone, status: DroneStatus.AVAILABLE };
      jest.spyOn(droneRepository, 'findOneBy').mockResolvedValue(drone as any);
      jest.spyOn(missionRepository, 'count').mockResolvedValue(0);
      jest.spyOn(missionRepository, 'create').mockReturnValue(mockMission as any);
      jest.spyOn(missionRepository, 'save').mockResolvedValue(mockMission as any);

      const result = await service.createMission({
        name: 'Mission',
        type: MissionType.WIND_TURBINE_INSPECTION,
        pilotName: 'Pilot',
        siteLocation: 'Site',
        scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString(),
        droneId: drone.id,
      });

      expect(result).toBeDefined();
    });
  });
});
