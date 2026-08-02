import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlignMissionScheduleColumns1754100000000 implements MigrationInterface {
  name = 'AlignMissionScheduleColumns1754100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'missions' AND column_name = 'plannedStart'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'missions' AND column_name = 'scheduledStart'
        ) THEN
          ALTER TABLE missions RENAME COLUMN "plannedStart" TO "scheduledStart";
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'missions' AND column_name = 'plannedEnd'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'missions' AND column_name = 'scheduledEnd'
        ) THEN
          ALTER TABLE missions RENAME COLUMN "plannedEnd" TO "scheduledEnd";
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'missions' AND column_name = 'createdAt'
        ) THEN
          ALTER TABLE missions ADD COLUMN "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'maintenance_logs' AND column_name = 'createdAt'
        ) THEN
          ALTER TABLE maintenance_logs ADD COLUMN "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'missions' AND column_name = 'scheduledStart'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'missions' AND column_name = 'plannedStart'
        ) THEN
          ALTER TABLE missions RENAME COLUMN "scheduledStart" TO "plannedStart";
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'missions' AND column_name = 'scheduledEnd'
        )
        AND NOT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'missions' AND column_name = 'plannedEnd'
        ) THEN
          ALTER TABLE missions RENAME COLUMN "scheduledEnd" TO "plannedEnd";
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'missions' AND column_name = 'createdAt'
        ) THEN
          ALTER TABLE missions DROP COLUMN "createdAt";
        END IF;

        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_name = 'maintenance_logs' AND column_name = 'createdAt'
        ) THEN
          ALTER TABLE maintenance_logs DROP COLUMN "createdAt";
        END IF;
      END
      $$;
    `);
  }
}
