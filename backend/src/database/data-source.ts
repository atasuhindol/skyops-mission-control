import { DataSource } from 'typeorm';
import { Drone } from '../drones/drone.entity';
import { Mission } from '../missions/mission.entity';
import { MaintenanceLog } from '../maintenance/maintenance-log.entity';
import { InitialSchemaMigration1754000000000 } from './migrations/1754000000000-initial-schema';
import { AlignMissionScheduleColumns1754100000000 } from './migrations/1754100000000-align-mission-schedule-columns';
import { FixLegacyMissionSchema1754200000000 } from './migrations/1754200000000-fix-legacy-mission-schema';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'skyops_mission_control',
  entities: [Drone, Mission, MaintenanceLog],
  migrations: [
    InitialSchemaMigration1754000000000,
    AlignMissionScheduleColumns1754100000000,
    FixLegacyMissionSchema1754200000000,
  ],
  migrationsRun: true,
  synchronize: false,
  logging: false,
});
