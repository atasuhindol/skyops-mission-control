import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { MaintenanceType } from '../../common/enums';

export class CreateMaintenanceLogDto {
  @IsNumber()
  droneId: number;

  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @IsNotEmpty()
  technicianName: string;

  @IsOptional()
  notes?: string;

  @IsDateString()
  datePerformed: string;

  @IsNumber()
  @Min(0)
  flightHoursAtMaintenance: number;
}
