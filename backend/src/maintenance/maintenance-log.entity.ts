import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Drone } from '../drones/drone.entity';
import { MaintenanceType } from '../common/enums';

@Entity('maintenance_logs')
export class MaintenanceLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  droneId: number;

  @Column({ type: 'varchar' })
  type: MaintenanceType;

  @Column()
  technicianName: string;

  @Column({ type: 'varchar', nullable: true })
  notes: string | null;

  @Column({ type: 'datetime' })
  datePerformed: Date;

  @Column({ type: 'int' })
  flightHoursAtMaintenance: number;

  @ManyToOne(() => Drone, (drone) => drone.maintenanceLogs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'droneId' })
  drone: Drone;
}
