import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, Matches, MaxLength, Min, MinLength } from 'class-validator';
import { DroneModel, DroneStatus } from '../../common/enums';

export class UpdateDroneDto {
  @IsOptional()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  identifier?: string;

  @IsOptional()
  @Matches(/^SKY-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  serialNumber?: string;

  @IsOptional()
  @IsEnum(DroneModel)
  model?: DroneModel;

  @IsOptional()
  @IsEnum(DroneStatus)
  status?: DroneStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalFlightHours?: number;

  @IsOptional()
  @IsDateString()
  lastMaintenanceDate?: string;

  @IsOptional()
  @IsDateString()
  nextMaintenanceDueDate?: string;
}
