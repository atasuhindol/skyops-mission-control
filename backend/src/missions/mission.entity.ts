import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Drone } from '../drones/drone.entity';
import { MissionStatus, MissionType } from '../common/enums';

@Entity('missions')
export class Mission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ type: 'varchar' })
  type: MissionType;

  @Column({ type: 'varchar' })
  status: MissionStatus;

  @Column()
  pilotName: string;

  @Column()
  siteLocation: string;

  @Column({ type: 'timestamp' })
  plannedStart: Date;

  @Column({ type: 'timestamp' })
  plannedEnd: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualStart: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  actualEnd: Date | null;

  @Column({ type: 'float', nullable: true })
  flightHoursLogged: number | null;

  @Column({ type: 'varchar', nullable: true })
  abortReason: string | null;

  @Column({ type: 'int' })
  droneId: number;

  @ManyToOne(() => Drone, (drone) => drone.missions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'droneId' })
  drone: Drone;
}
