import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { FleetModule } from '../src/fleet/fleet.module';
import { Drone, DroneModel, DroneStatus } from '../src/fleet/entities/drone.entity';
import { Mission, MissionStatus, MissionType } from '../src/fleet/entities/mission.entity';
import { MaintenanceLog } from '../src/fleet/entities/maintenance-log.entity';
import { InitialSchemaMigration1754000000000 } from '../src/database/migrations/1754000000000-initial-schema';

describe('Mission Lifecycle Integration Test', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let droneData: Drone;
  let missionData: Mission;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'password',
          database: process.env.DB_NAME || 'skyops_mission_control',
          entities: [Drone, Mission, MaintenanceLog],
          migrations: [InitialSchemaMigration1754000000000],
          migrationsRun: true,
          synchronize: false,
          dropSchema: true,
          logging: false,
        }),
        FleetModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    dataSource = moduleFixture.get<DataSource>(DataSource);

    await app.init();
  });

  afterAll(async () => {
    await dataSource.destroy();
    await app.close();
  });

  describe('Complete Mission Lifecycle', () => {
    it('should complete full lifecycle: Create drone -> Schedule mission -> Progress mission -> Complete mission', async () => {
      const fleetService = app.get('FleetService');

      // Step 1: Create a drone
      const droneDto = {
        identifier: 'DRONE-INT-001',
        serialNumber: 'SKY-TEST-0001',
        model: DroneModel.PHANTOM_4,
        status: DroneStatus.AVAILABLE,
        totalFlightHours: 10,
      };

      droneData = await fleetService.createDrone(droneDto);

      expect(droneData).toBeDefined();
      expect(droneData.id).toBeDefined();
      expect(droneData.identifier).toBe('DRONE-INT-001');
      expect(droneData.status).toBe(DroneStatus.AVAILABLE);
      expect(droneData.totalFlightHours).toBe(10);

      // Step 2: Schedule a mission
      const missionDto = {
        name: 'Integration Test Mission',
        type: MissionType.WIND_TURBINE_INSPECTION,
        pilotName: 'Integration Pilot',
        siteLocation: 'Integration Site',
        scheduledStart: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        droneId: droneData.id,
      };

      missionData = await fleetService.createMission(missionDto);

      expect(missionData).toBeDefined();
      expect(missionData.id).toBeDefined();
      expect(missionData.status).toBe(MissionStatus.PLANNED);
      expect(missionData.name).toBe('Integration Test Mission');
      expect(missionData.drone?.id).toBe(droneData.id);

      // Step 3: Verify drone is still AVAILABLE before mission progress
      let drone = await fleetService.getDrone(droneData.id);
      expect(drone.status).toBe(DroneStatus.AVAILABLE);

      // Step 4: Transition to PRE_FLIGHT_CHECK
      const updateToPreFlight = {
        status: MissionStatus.PRE_FLIGHT_CHECK,
      };

      let mission = await fleetService.updateMission(missionData.id, updateToPreFlight);
      expect(mission.status).toBe(MissionStatus.PRE_FLIGHT_CHECK);

      // Step 5: Transition to IN_PROGRESS
      const updateToInProgress = {
        status: MissionStatus.IN_PROGRESS,
      };

      mission = await fleetService.updateMission(missionData.id, updateToInProgress);
      expect(mission.status).toBe(MissionStatus.IN_PROGRESS);
      expect(mission.actualStart).toBeDefined();

      // Step 6: Verify drone status changed to IN_MISSION
      drone = await fleetService.getDrone(droneData.id);
      expect(drone.status).toBe(DroneStatus.IN_MISSION);

      // Step 7: Complete the mission with flight hours
      const updateToCompleted = {
        status: MissionStatus.COMPLETED,
        flightHoursLogged: 2,
      };

      mission = await fleetService.updateMission(missionData.id, updateToCompleted);
      expect(mission.status).toBe(MissionStatus.COMPLETED);
      expect(mission.actualEnd).toBeDefined();
      expect(mission.flightHoursLogged).toBe(2);

      // Step 8: Verify drone status returned to AVAILABLE
      drone = await fleetService.getDrone(droneData.id);
      expect(drone.status).toBe(DroneStatus.AVAILABLE);

      // Step 9: Verify drone flight hours increased
      expect(drone.totalFlightHours).toBe(12);

      // Step 10: Verify mission appears in drone's mission history
      expect(drone.missions).toContainEqual(
        expect.objectContaining({
          id: missionData.id,
          status: MissionStatus.COMPLETED,
        }),
      );
    });

    it('should handle mission abort gracefully', async () => {
      const fleetService = app.get('FleetService');

      // Create drone
      const droneDto = {
        identifier: 'DRONE-INT-002',
        serialNumber: 'SKY-TEST-0002',
        model: DroneModel.MATRICE_300,
        status: DroneStatus.AVAILABLE,
        totalFlightHours: 20,
      };

      const drone = await fleetService.createDrone(droneDto);

      // Schedule mission
      const missionDto = {
        name: 'Abort Test Mission',
        type: MissionType.SOLAR_PANEL_SURVEY,
        pilotName: 'Abort Pilot',
        siteLocation: 'Abort Site',
        scheduledStart: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        droneId: drone.id,
      };

      const mission = await fleetService.createMission(missionDto);

      // Progress to IN_PROGRESS
      await fleetService.updateMission(mission.id, {
        status: MissionStatus.PRE_FLIGHT_CHECK,
      });

      await fleetService.updateMission(mission.id, {
        status: MissionStatus.IN_PROGRESS,
      });

      let droneStatus = await fleetService.getDrone(drone.id);
      expect(droneStatus.status).toBe(DroneStatus.IN_MISSION);

      // Abort mission
      const abortedMission = await fleetService.updateMission(mission.id, {
        status: MissionStatus.ABORTED,
        abortReason: 'Weather conditions deteriorated',
      });

      expect(abortedMission.status).toBe(MissionStatus.ABORTED);
      expect(abortedMission.abortReason).toBe('Weather conditions deteriorated');

      // Verify drone returned to AVAILABLE
      droneStatus = await fleetService.getDrone(drone.id);
      expect(droneStatus.status).toBe(DroneStatus.AVAILABLE);

      // Flight hours should NOT increase on abort
      expect(droneStatus.totalFlightHours).toBe(20);
    });

    it('should track maintenance across mission lifecycle', async () => {
      const fleetService = app.get('FleetService');

      // Create drone
      const droneDto = {
        identifier: 'DRONE-INT-003',
        serialNumber: 'SKY-TEST-0003',
        model: DroneModel.MAVIC_3_ENTERPRISE,
        status: DroneStatus.AVAILABLE,
        totalFlightHours: 45,
      };

      const drone = await fleetService.createDrone(droneDto);

      // Create maintenance log
      const maintenanceDto = {
        droneId: drone.id,
        type: 'ROUTINE_CHECK',
        technicianName: 'Maintenance Tech',
        notes: 'Full system check',
        datePerformed: new Date().toISOString(),
        flightHoursAtMaintenance: 45,
      };

      const maintenance = await fleetService.createMaintenanceLog(maintenanceDto);
      expect(maintenance).toBeDefined();

      // Verify drone status set to MAINTENANCE
      let droneStatus = await fleetService.getDrone(drone.id);
      expect(droneStatus.status).toBe(DroneStatus.MAINTENANCE);
      expect(droneStatus.lastMaintenanceDate).toBeDefined();
      expect(droneStatus.nextMaintenanceDueDate).toBeDefined();

      // Schedule mission after maintenance
      const missionDto = {
        name: 'Post-Maintenance Mission',
        type: MissionType.POWER_LINE_PATROL,
        pilotName: 'Post-Maintenance Pilot',
        siteLocation: 'Post-Maintenance Site',
        scheduledStart: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
        droneId: drone.id,
      };

      // Should fail because drone is in MAINTENANCE status
      await expect(fleetService.createMission(missionDto)).rejects.toThrow();
    });

    it('should prevent mission scheduling in the past', async () => {
      const fleetService = app.get('FleetService');

      const droneDto = {
        identifier: 'DRONE-INT-004',
        serialNumber: 'SKY-TEST-0004',
        model: DroneModel.PHANTOM_4,
        status: DroneStatus.AVAILABLE,
        totalFlightHours: 5,
      };

      const drone = await fleetService.createDrone(droneDto);

      const pastMissionDto = {
        name: 'Past Mission',
        type: MissionType.WIND_TURBINE_INSPECTION,
        pilotName: 'Past Pilot',
        siteLocation: 'Past Site',
        scheduledStart: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
        droneId: drone.id,
      };

      await expect(fleetService.createMission(pastMissionDto)).rejects.toThrow();
    });

    it('should prevent mission with end time before start time', async () => {
      const fleetService = app.get('FleetService');

      const droneDto = {
        identifier: 'DRONE-INT-005',
        serialNumber: 'SKY-TEST-0005',
        model: DroneModel.PHANTOM_4,
        status: DroneStatus.AVAILABLE,
        totalFlightHours: 5,
      };

      const drone = await fleetService.createDrone(droneDto);

      const invalidMissionDto = {
        name: 'Invalid Mission',
        type: MissionType.WIND_TURBINE_INSPECTION,
        pilotName: 'Invalid Pilot',
        siteLocation: 'Invalid Site',
        scheduledStart: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        droneId: drone.id,
      };

      await expect(fleetService.createMission(invalidMissionDto)).rejects.toThrow();
    });

    it('should aggregate fleet health metrics correctly', async () => {
      const fleetService = app.get('FleetService');

      // Create multiple drones
      const drone1Dto = {
        identifier: 'DRONE-HEALTH-001',
        serialNumber: 'SKY-HEAL-0001',
        model: DroneModel.PHANTOM_4,
        status: DroneStatus.AVAILABLE,
        totalFlightHours: 30,
      };

      const drone2Dto = {
        identifier: 'DRONE-HEALTH-002',
        serialNumber: 'SKY-HEAL-0002',
        model: DroneModel.MATRICE_300,
        status: DroneStatus.IN_MISSION,
        totalFlightHours: 55,
      };

      await fleetService.createDrone(drone1Dto);
      await fleetService.createDrone(drone2Dto);

      // Get fleet health
      const health = await fleetService.getFleetHealth();

      expect(health.totalDrones).toBeGreaterThanOrEqual(2);
      expect(health.breakdownByStatus).toBeDefined();
      expect(health.averageFlightHoursPerDrone).toBeGreaterThan(0);
      expect(health.overdueMaintenance).toBeDefined();

      // Drone with 55 hours should be in overdue maintenance
      expect(health.overdueMaintenance.some((d) => d.totalFlightHours >= 50)).toBe(true);
    });

    it('should detect overlapping missions on same drone', async () => {
      const fleetService = app.get('FleetService');

      const droneDto = {
        identifier: 'DRONE-INT-006',
        serialNumber: 'SKY-TEST-0006',
        model: DroneModel.PHANTOM_4,
        status: DroneStatus.AVAILABLE,
        totalFlightHours: 15,
      };

      const drone = await fleetService.createDrone(droneDto);

      // Schedule first mission
      const mission1Dto = {
        name: 'Mission 1',
        type: MissionType.WIND_TURBINE_INSPECTION,
        pilotName: 'Pilot 1',
        siteLocation: 'Site 1',
        scheduledStart: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
        droneId: drone.id,
      };

      const mission1 = await fleetService.createMission(mission1Dto);
      expect(mission1).toBeDefined();

      // Try to schedule overlapping mission
      const mission2Dto = {
        name: 'Mission 2 (Overlapping)',
        type: MissionType.SOLAR_PANEL_SURVEY,
        pilotName: 'Pilot 2',
        siteLocation: 'Site 2',
        scheduledStart: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        scheduledEnd: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
        droneId: drone.id,
      };

      await expect(fleetService.createMission(mission2Dto)).rejects.toThrow();
    });
  });
});
