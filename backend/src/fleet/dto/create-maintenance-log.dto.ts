import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { MaintenanceType } from '../entities/maintenance-log.entity';

export class CreateMaintenanceLogDto {
  @IsString()
  droneId: string;

  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @IsString()
  technicianName: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  datePerformed: string;

  @IsInt()
  @Min(0)
  flightHoursAtMaintenance: number;
}
