import { DataSource } from 'typeorm';
import { DroneModel, DroneStatus, MissionStatus, MissionType } from '../common/enums';
import { Drone } from '../drones/drone.entity';
import { DronesService } from '../drones/drones.service';
import { Mission } from './mission.entity';
import { MissionsService } from './missions.service';
import { MaintenanceLog } from '../maintenance/maintenance-log.entity';

describe('Mission lifecycle integration', () => {
  let dataSource: DataSource;
  let missionsService: MissionsService;
  let dronesService: DronesService;

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
    dronesService = new DronesService(droneRepo, missionRepo);
    missionsService = new MissionsService(missionRepo, droneRepo, dronesService);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('moves a mission through the lifecycle and updates drone state', async () => {
    const drone = await dronesService.create({
      identifier: 'Lifecycle Drone',
      serialNumber: 'SKY-9999-ZZZZ',
      model: DroneModel.PHANTOM_4,
    } as any);

    const mission = await missionsService.create({
      name: 'Lifecycle mission',
      type: MissionType.WIND_TURBINE_INSPECTION,
      droneId: drone.id,
      pilotName: 'Pilot 7',
      siteLocation: 'Site 7',
      plannedStart: new Date(Date.now() + 3600000).toISOString(),
      plannedEnd: new Date(Date.now() + 7200000).toISOString(),
      status: MissionStatus.PLANNED,
    } as any);

    const preFlight = await missionsService.update(mission.id, { status: MissionStatus.PRE_FLIGHT_CHECK } as any);
    expect(preFlight.status).toBe(MissionStatus.PRE_FLIGHT_CHECK);

    const inProgress = await missionsService.update(preFlight.id, { status: MissionStatus.IN_PROGRESS } as any);
    const refreshedDrone = await dronesService.findOne(drone.id);
    expect(inProgress.status).toBe(MissionStatus.IN_PROGRESS);
    expect(refreshedDrone.status).toBe(DroneStatus.IN_MISSION);

    const completed = await missionsService.update(inProgress.id, { status: MissionStatus.COMPLETED, flightHoursLogged: 5 } as any);
    const completedDrone = await dronesService.findOne(drone.id);
    expect(completed.status).toBe(MissionStatus.COMPLETED);
    expect(completedDrone.totalFlightHours).toBe(5);
    expect(completedDrone.status).toBe(DroneStatus.AVAILABLE);
  });
});
