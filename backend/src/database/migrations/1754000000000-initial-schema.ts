import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchemaMigration1754000000000 implements MigrationInterface {
  name = 'InitialSchemaMigration1754000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS drones (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        identifier VARCHAR NOT NULL UNIQUE,
        "serialNumber" VARCHAR NOT NULL UNIQUE,
        model VARCHAR NOT NULL DEFAULT 'PHANTOM_4',
        status VARCHAR NOT NULL DEFAULT 'AVAILABLE',
        "totalFlightHours" INTEGER NOT NULL DEFAULT 0,
        "lastMaintenanceDate" DATE,
        "nextMaintenanceDueDate" DATE,
        "registrationTimestamp" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS missions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR NOT NULL,
        type VARCHAR NOT NULL DEFAULT 'WIND_TURBINE_INSPECTION',
        "pilotName" VARCHAR NOT NULL,
        "siteLocation" VARCHAR NOT NULL,
        status VARCHAR NOT NULL DEFAULT 'PLANNED',
        "scheduledStart" TIMESTAMP NOT NULL,
        "scheduledEnd" TIMESTAMP NOT NULL,
        "actualStart" TIMESTAMP,
        "actualEnd" TIMESTAMP,
        "flightHoursLogged" INTEGER NOT NULL DEFAULT 0,
        "abortReason" VARCHAR,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "droneId" UUID,
        CONSTRAINT FK_missions_drone FOREIGN KEY ("droneId") REFERENCES drones(id) ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS maintenance_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "droneId" UUID NOT NULL,
        type VARCHAR NOT NULL DEFAULT 'ROUTINE_CHECK',
        "technicianName" VARCHAR NOT NULL,
        notes TEXT,
        "datePerformed" TIMESTAMP NOT NULL,
        "flightHoursAtMaintenance" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT FK_maintenance_logs_drone FOREIGN KEY ("droneId") REFERENCES drones(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_missions_drone_id ON missions("droneId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS IDX_maintenance_logs_drone_id ON maintenance_logs("droneId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS maintenance_logs');
    await queryRunner.query('DROP TABLE IF EXISTS missions');
    await queryRunner.query('DROP TABLE IF EXISTS drones');
  }
}
