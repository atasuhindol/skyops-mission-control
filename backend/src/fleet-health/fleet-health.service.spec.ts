import { DataSource } from 'typeorm';
import { DroneModel, DroneStatus } from '../common/enums';
import { Drone } from '../drones/drone.entity';
import { Mission } from '../missions/mission.entity';
import { FleetHealthService } from './fleet-health.service';
import { MaintenanceLog } from '../maintenance/maintenance-log.entity';

describe('FleetHealthService', () => {
  let dataSource: DataSource;
  let service: FleetHealthService;

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
    service = new FleetHealthService(droneRepo, missionRepo);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('returns a fleet summary with status breakdown and averages', async () => {
    await dataSource.getRepository(Drone).save([
      {
        identifier: 'Fleet One',
        serialNumber: 'SKY-1111-AAAA',
        model: DroneModel.PHANTOM_4,
        status: DroneStatus.AVAILABLE,
        totalFlightHours: 40,
        registrationTimestamp: new Date(),
        lastMaintenanceDate: new Date(),
        nextMaintenanceDueDate: new Date(Date.now() - 86400000),
      },
      {
        identifier: 'Fleet Two',
        serialNumber: 'SKY-2222-BBBB',
        model: DroneModel.MATRICE_300,
        status: DroneStatus.MAINTENANCE,
        totalFlightHours: 20,
        registrationTimestamp: new Date(),
        lastMaintenanceDate: new Date(),
        nextMaintenanceDueDate: new Date(Date.now() + 86400000),
      },
    ]);

    const summary = await service.getSummary();
    expect(summary.totalDrones).toBe(2);
    expect(summary.statusBreakdown[DroneStatus.AVAILABLE]).toBe(1);
    expect(summary.overdueMaintenance).toHaveLength(1);
    expect(summary.averageFlightHours).toBe(30);
  });
});
