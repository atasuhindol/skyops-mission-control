import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DroneModel, DroneStatus, MissionStatus, MissionType } from '../common/enums';
import { Drone } from '../drones/drone.entity';
import { DronesService } from '../drones/drones.service';
import { Mission } from './mission.entity';
import { MissionsService } from './missions.service';
import { MaintenanceLog } from '../maintenance/maintenance-log.entity';

describe('MissionsService', () => {
  let dataSource: DataSource;
  let missionsService: MissionsService;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [Drone, Mission, MaintenanceLog],
      synchronize: true,
      dropSchema: true,
    });
    await dataSource.initialize();
    const droneRepo = dataSource.getRepository(Drone);
    const missionRepo = dataSource.getRepository(Mission);
    const dronesService = new DronesService(droneRepo, missionRepo);
    missionsService = new MissionsService(missionRepo, droneRepo, dronesService);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('detects overlapping missions for the same drone', async () => {
    const drone = await dataSource.getRepository(Drone).save({
      identifier: 'Drone Beta',
      serialNumber: 'SKY-3333-CCCC',
      model: DroneModel.MATRICE_300,
      status: DroneStatus.AVAILABLE,
      registrationTimestamp: new Date(),
      lastMaintenanceDate: new Date(),
    });

    await missionsService.create({
      name: 'Existing mission',
      type: MissionType.WIND_TURBINE_INSPECTION,
      droneId: drone.id,
      pilotName: 'Pilot 1',
      siteLocation: 'Site 1',
      plannedStart: new Date(Date.now() + 3600000).toISOString(),
      plannedEnd: new Date(Date.now() + 7200000).toISOString(),
      status: MissionStatus.PLANNED,
    } as any);

    await expect(
      missionsService.create({
        name: 'Overlap mission',
        type: MissionType.POWER_LINE_PATROL,
        droneId: drone.id,
        pilotName: 'Pilot 2',
        siteLocation: 'Site 2',
        plannedStart: new Date(Date.now() + 5400000).toISOString(),
        plannedEnd: new Date(Date.now() + 9000000).toISOString(),
        status: MissionStatus.PLANNED,
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('prevents invalid mission state transitions', async () => {
    const drone = await dataSource.getRepository(Drone).save({
      identifier: 'Drone Gamma',
      serialNumber: 'SKY-4444-DDDD',
      model: DroneModel.MAVIC_3_ENTERPRISE,
      status: DroneStatus.AVAILABLE,
      registrationTimestamp: new Date(),
      lastMaintenanceDate: new Date(),
    });

    const mission = await missionsService.create({
      name: 'Transition mission',
      type: MissionType.SOLAR_PANEL_SURVEY,
      droneId: drone.id,
      pilotName: 'Pilot 3',
      siteLocation: 'Site 3',
      plannedStart: new Date(Date.now() + 1000 * 60 * 60 * 3).toISOString(),
      plannedEnd: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
      status: MissionStatus.PLANNED,
    } as any);

    await expect(missionsService.update(mission.id, { status: MissionStatus.COMPLETED } as any)).rejects.toThrow(BadRequestException);
  });
});
