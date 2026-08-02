import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from 'typeorm';

export class CreateSkyOpsSchema1710000000000 implements MigrationInterface {
  name = 'CreateSkyOpsSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'drones',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'identifier', type: 'varchar', isNullable: false, isUnique: true },
          { name: 'serialNumber', type: 'varchar', isNullable: false, isUnique: true },
          { name: 'model', type: 'varchar', isNullable: false },
          { name: 'status', type: 'varchar', isNullable: false, default: "'AVAILABLE'" },
          { name: 'totalFlightHours', type: 'int', isNullable: false, default: 0 },
          { name: 'lastMaintenanceDate', type: 'datetime', isNullable: true },
          { name: 'nextMaintenanceDueDate', type: 'datetime', isNullable: true },
          { name: 'registrationTimestamp', type: 'datetime', isNullable: false },
          { name: 'lastMaintenanceFlightHours', type: 'int', isNullable: false, default: 0 },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'missions',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'name', type: 'varchar', isNullable: false },
          { name: 'type', type: 'varchar', isNullable: false },
          { name: 'status', type: 'varchar', isNullable: false },
          { name: 'pilotName', type: 'varchar', isNullable: false },
          { name: 'siteLocation', type: 'varchar', isNullable: false },
          { name: 'plannedStart', type: 'datetime', isNullable: false },
          { name: 'plannedEnd', type: 'datetime', isNullable: false },
          { name: 'actualStart', type: 'datetime', isNullable: true },
          { name: 'actualEnd', type: 'datetime', isNullable: true },
          { name: 'flightHoursLogged', type: 'float', isNullable: true },
          { name: 'abortReason', type: 'varchar', isNullable: true },
          { name: 'droneId', type: 'int', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createTable(
      new Table({
        name: 'maintenance_logs',
        columns: [
          { name: 'id', type: 'integer', isPrimary: true, isGenerated: true, generationStrategy: 'increment' },
          { name: 'droneId', type: 'int', isNullable: false },
          { name: 'type', type: 'varchar', isNullable: false },
          { name: 'technicianName', type: 'varchar', isNullable: false },
          { name: 'notes', type: 'varchar', isNullable: true },
          { name: 'datePerformed', type: 'datetime', isNullable: false },
          { name: 'flightHoursAtMaintenance', type: 'int', isNullable: false },
        ],
      }),
      true,
    );

    await queryRunner.createForeignKey(
      'missions',
      new TableForeignKey({
        columnNames: ['droneId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'drones',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'maintenance_logs',
      new TableForeignKey({
        columnNames: ['droneId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'drones',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createIndex(
      'missions',
      new TableIndex({ name: 'IDX_MISSIONS_DRONE_ID', columnNames: ['droneId'] }),
    );
    await queryRunner.createIndex(
      'maintenance_logs',
      new TableIndex({ name: 'IDX_MAINTENANCE_LOGS_DRONE_ID', columnNames: ['droneId'] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('maintenance_logs');
    await queryRunner.dropTable('missions');
    await queryRunner.dropTable('drones');
  }
}
