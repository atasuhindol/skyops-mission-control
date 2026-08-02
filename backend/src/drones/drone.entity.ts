import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { DroneModel, DroneStatus } from '../common/enums';
import { MaintenanceLog } from '../maintenance/maintenance-log.entity';
import { Mission } from '../missions/mission.entity';

@Entity('drones')
export class Drone {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  identifier: string;

  @Column({ unique: true })
  serialNumber: string;

  @Column({ type: 'varchar' })
  model: DroneModel;

  @Column({ type: 'varchar', default: DroneStatus.AVAILABLE })
  status: DroneStatus;

  @Column({ type: 'int', default: 0 })
  totalFlightHours: number;

  @Column({ type: 'timestamp', nullable: true })
  lastMaintenanceDate: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  nextMaintenanceDueDate: Date | null;

  @Column({ type: 'timestamp' })
  registrationTimestamp: Date;

  @Column({ type: 'int', default: 0 })
  lastMaintenanceFlightHours: number;

  @OneToMany(() => Mission, (mission) => mission.drone, { cascade: true })
  missions: Mission[];

  @OneToMany(() => MaintenanceLog, (log) => log.drone, { cascade: true })
  maintenanceLogs: MaintenanceLog[];
}
