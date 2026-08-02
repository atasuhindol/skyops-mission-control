import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { InitialSchemaMigration1754000000000 } from './database/migrations/1754000000000-initial-schema';
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
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'skyops',
      entities: [Drone, Mission, MaintenanceLog],
      migrations: [InitialSchemaMigration1754000000000],
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
