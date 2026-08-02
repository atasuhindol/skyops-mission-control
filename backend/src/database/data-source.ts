import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { Drone } from '../drones/drone.entity';
import { Mission } from '../missions/mission.entity';
import { MaintenanceLog } from '../maintenance/maintenance-log.entity';

const databasePath = path.resolve(__dirname, 'skyops.sqlite');
const migrationDirectory = path.resolve(__dirname, 'migrations');
const migrations = fs.existsSync(migrationDirectory)
  ? fs
      .readdirSync(migrationDirectory)
      .filter((fileName) => /\.(js|ts)$/.test(fileName))
      .sort()
      .map((fileName) => path.join(migrationDirectory, fileName))
  : [];

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: databasePath,
  entities: [Drone, Mission, MaintenanceLog],
  migrations,
  migrationsRun: true,
  synchronize: false,
  logging: false,
});
