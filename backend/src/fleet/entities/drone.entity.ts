import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { MaintenanceLog } from './maintenance-log.entity';
import { Mission } from './mission.entity';

export enum DroneModel {
  PHANTOM_4 = 'PHANTOM_4',
  MATRICE_300 = 'MATRICE_300',
  MAVIC_3_ENTERPRISE = 'MAVIC_3_ENTERPRISE',
}

export enum DroneStatus {
  AVAILABLE = 'AVAILABLE',
  IN_MISSION = 'IN_MISSION',
  MAINTENANCE = 'MAINTENANCE',
  RETIRED = 'RETIRED',
}

@Entity({ name: 'drones' })
export class Drone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  identifier: string;

  @Column({ unique: true })
  serialNumber: string;

  @Column({ type: 'varchar', default: DroneModel.PHANTOM_4 })
  model: DroneModel;

  @Column({ type: 'varchar', default: DroneStatus.AVAILABLE })
  status: DroneStatus;

  @Column({ type: 'int', default: 0 })
  totalFlightHours: number;

  @Column({ type: 'date', nullable: true })
  lastMaintenanceDate: string | null;

  @Column({ type: 'date', nullable: true })
  nextMaintenanceDueDate: string | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  registrationTimestamp: Date;

  @OneToMany(() => Mission, (mission) => mission.drone, { cascade: true })
  missions: Mission[];

  @OneToMany(() => MaintenanceLog, (maintenanceLog) => maintenanceLog.drone, { cascade: true })
  maintenanceLogs: MaintenanceLog[];
}
