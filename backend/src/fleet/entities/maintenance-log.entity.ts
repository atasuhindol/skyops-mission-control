import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Drone } from './drone.entity';

export enum MaintenanceType {
  ROUTINE_CHECK = 'ROUTINE_CHECK',
  BATTERY_REPLACEMENT = 'BATTERY_REPLACEMENT',
  MOTOR_REPAIR = 'MOTOR_REPAIR',
  FIRMWARE_UPDATE = 'FIRMWARE_UPDATE',
  FULL_OVERHAUL = 'FULL_OVERHAUL',
}

@Entity({ name: 'maintenance_logs' })
export class MaintenanceLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Drone, (drone) => drone.maintenanceLogs, { onDelete: 'CASCADE', nullable: false })
  drone: Drone;

  @Column({ type: 'varchar', default: MaintenanceType.ROUTINE_CHECK })
  type: MaintenanceType;

  @Column() technicianName: string;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'datetime' })
  datePerformed: Date;

  @Column({ type: 'int' })
  flightHoursAtMaintenance: number;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
