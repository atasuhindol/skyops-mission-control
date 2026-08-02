import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Drone, DroneModel, DroneStatus } from '../fleet/entities/drone.entity';
import { MaintenanceLog, MaintenanceType } from '../fleet/entities/maintenance-log.entity';
import { Mission, MissionStatus, MissionType } from '../fleet/entities/mission.entity';
import { InitialSchemaMigration1754000000000 } from './migrations/1754000000000-initial-schema';
import { AlignMissionScheduleColumns1754100000000 } from './migrations/1754100000000-align-mission-schedule-columns';
import { FixLegacyMissionSchema1754200000000 } from './migrations/1754200000000-fix-legacy-mission-schema';

async function seed() {
  const dataSource = new DataSource({
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
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  await dataSource.runMigrations();

  const droneRepository = dataSource.getRepository(Drone);
  const missionRepository = dataSource.getRepository(Mission);
  const maintenanceLogRepository = dataSource.getRepository(MaintenanceLog);

  const targetDroneCount = Number(process.env.SEED_DRONE_COUNT || 20);
  const existingDroneCount = await droneRepository.count();

  const dronesToCreate = Math.max(0, targetDroneCount - existingDroneCount);
  if (dronesToCreate > 0) {
    await droneRepository.save(
      Array.from({ length: dronesToCreate }, (_, offset) => {
        const index = existingDroneCount + offset;
        const status = index % 4 === 0 ? DroneStatus.AVAILABLE : index % 4 === 1 ? DroneStatus.IN_MISSION : index % 4 === 2 ? DroneStatus.MAINTENANCE : DroneStatus.RETIRED;
        const hours = 10 + index * 6;
        const lastMaintenanceDate = new Date(Date.now() - (index % 5) * 30 * 24 * 60 * 60 * 1000);
        const nextMaintenanceDueDate = new Date(Date.now() + (index % 3) * 4 * 24 * 60 * 60 * 1000);
        return droneRepository.create({
          identifier: `DRONE-${String(index + 1).padStart(3, '0')}`,
          serialNumber: `SKY-${String(index + 1).padStart(4, '0')}-${String(index + 11).padStart(4, '0')}`,
          model: index % 3 === 0 ? DroneModel.PHANTOM_4 : index % 3 === 1 ? DroneModel.MATRICE_300 : DroneModel.MAVIC_3_ENTERPRISE,
          status,
          totalFlightHours: hours,
          lastMaintenanceDate: lastMaintenanceDate.toISOString().split('T')[0],
          nextMaintenanceDueDate: nextMaintenanceDueDate.toISOString().split('T')[0],
          registrationTimestamp: new Date(Date.now() - index * 7 * 24 * 60 * 60 * 1000),
        });
      }),
    );
  }

  const allDrones = [...(await droneRepository.find({ order: { registrationTimestamp: 'ASC' } }))];

  const targetMissionCount = Number(process.env.SEED_MISSION_COUNT || 50);
  const existingMissionCount = await missionRepository.count();
  const missionsToCreate = Math.max(0, targetMissionCount - existingMissionCount);

  if (missionsToCreate > 0 && allDrones.length > 0) {
    await missionRepository.save(
      Array.from({ length: missionsToCreate }, (_, offset) => {
        const index = existingMissionCount + offset;
        const drone = allDrones[index % allDrones.length];
        const start = new Date(Date.now() + index * 60 * 60 * 1000);
        const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        const type = index % 3 === 0 ? MissionType.WIND_TURBINE_INSPECTION : index % 3 === 1 ? MissionType.SOLAR_PANEL_SURVEY : MissionType.POWER_LINE_PATROL;
        const status = index % 4 === 0 ? MissionStatus.PLANNED : index % 4 === 1 ? MissionStatus.PRE_FLIGHT_CHECK : index % 4 === 2 ? MissionStatus.IN_PROGRESS : MissionStatus.COMPLETED;

        return missionRepository.create({
          name: `Mission ${index + 1}`,
          type,
          pilotName: `Pilot ${index + 1}`,
          siteLocation: `Site ${index + 1}`,
          status,
          scheduledStart: start,
          scheduledEnd: end,
          actualStart: index % 4 === 2 ? start : null,
          actualEnd: index % 4 === 3 ? end : null,
          flightHoursLogged: index % 4 === 3 ? 2 : 0,
          abortReason: null,
          drone,
        });
      }),
    );
  }

  const targetMaintenanceLogCount = Number(process.env.SEED_MAINTENANCE_LOG_COUNT || 30);
  const existingMaintenanceLogCount = await maintenanceLogRepository.count();
  const maintenanceLogsToCreate = Math.max(0, targetMaintenanceLogCount - existingMaintenanceLogCount);

  if (maintenanceLogsToCreate > 0 && allDrones.length > 0) {
    await maintenanceLogRepository.save(
      Array.from({ length: maintenanceLogsToCreate }, (_, offset) => {
        const index = existingMaintenanceLogCount + offset;
        const drone = allDrones[index % allDrones.length];
        const datePerformed = new Date(Date.now() - index * 10 * 24 * 60 * 60 * 1000);
        return maintenanceLogRepository.create({
          drone,
          type:
            index % 5 === 0
              ? MaintenanceType.ROUTINE_CHECK
              : index % 5 === 1
                ? MaintenanceType.BATTERY_REPLACEMENT
                : index % 5 === 2
                  ? MaintenanceType.MOTOR_REPAIR
                  : index % 5 === 3
                    ? MaintenanceType.FIRMWARE_UPDATE
                    : MaintenanceType.FULL_OVERHAUL,
          technicianName: `Technician ${index + 1}`,
          notes: `Maintenance note ${index + 1}`,
          datePerformed,
          flightHoursAtMaintenance: drone.totalFlightHours,
        });
      }),
    );
  }

  console.log(
    `Seed data created or updated. Drones: ${allDrones.length}, Missions: ${existingMissionCount + missionsToCreate}, Maintenance logs: ${existingMaintenanceLogCount + maintenanceLogsToCreate}`,
  );
  await dataSource.destroy();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
