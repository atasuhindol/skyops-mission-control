import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DroneStatus, DroneModel } from '../common/enums';
import { Drone } from './drone.entity';
import { DronesService } from './drones.service';
import { Mission } from '../missions/mission.entity';
import { MaintenanceLog } from '../maintenance/maintenance-log.entity';

describe('DronesService', () => {
  let dataSource: DataSource;
  let service: DronesService;

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
    service = new DronesService(droneRepo, missionRepo);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('rejects drones with invalid serial numbers', async () => {
    await expect(
      service.create({
        identifier: 'Drone One',
        serialNumber: 'INVALID',
        model: DroneModel.MATRICE_300,
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('creates a drone and assigns available status by default', async () => {
    const drone = await service.create({
      identifier: 'Drone Alpha',
      serialNumber: 'SKY-1234-ABCD',
      model: DroneModel.PHANTOM_4,
    } as any);

    expect(drone.status).toBe(DroneStatus.AVAILABLE);
    expect(drone.totalFlightHours).toBe(0);
    expect(drone.nextMaintenanceDueDate).toBeTruthy();
  });
});
