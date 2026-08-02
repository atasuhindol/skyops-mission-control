import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Drone } from './drone.entity';

export enum MissionType {
  WIND_TURBINE_INSPECTION = 'WIND_TURBINE_INSPECTION',
  SOLAR_PANEL_SURVEY = 'SOLAR_PANEL_SURVEY',
  POWER_LINE_PATROL = 'POWER_LINE_PATROL',
}

export enum MissionStatus {
  PLANNED = 'PLANNED',
  PRE_FLIGHT_CHECK = 'PRE_FLIGHT_CHECK',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  ABORTED = 'ABORTED',
}

@Entity({ name: 'missions' })
export class Mission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column() name: string;

  @Column({ type: 'varchar', default: MissionType.WIND_TURBINE_INSPECTION })
  type: MissionType;

  @Column() pilotName: string;

  @Column() siteLocation: string;

  @Column({ type: 'varchar', default: MissionStatus.PLANNED })
  status: MissionStatus;

  @Column({ type: 'datetime' })
  scheduledStart: Date;

  @Column({ type: 'datetime' })
  scheduledEnd: Date;

  @Column({ type: 'datetime', nullable: true })
  actualStart: Date | null;

  @Column({ type: 'datetime', nullable: true })
  actualEnd: Date | null;

  @Column({ type: 'int', default: 0 })
  flightHoursLogged: number;

  @Column({ type: 'varchar', nullable: true })
  abortReason: string | null;

  @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Drone, (drone) => drone.missions, { onDelete: 'SET NULL', nullable: true })
  drone: Drone | null;
}
