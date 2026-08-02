import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InitialSchemaMigration1754000000000 } from './database/migrations/1754000000000-initial-schema';
import { AlignMissionScheduleColumns1754100000000 } from './database/migrations/1754100000000-align-mission-schedule-columns';
import { FixLegacyMissionSchema1754200000000 } from './database/migrations/1754200000000-fix-legacy-mission-schema';
import { Drone } from './fleet/entities/drone.entity';
import { MaintenanceLog } from './fleet/entities/maintenance-log.entity';
import { Mission } from './fleet/entities/mission.entity';
import { FleetModule } from './fleet/fleet.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
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
    }),
    FleetModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
