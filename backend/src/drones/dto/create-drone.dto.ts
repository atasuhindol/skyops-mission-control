import { IsDateString, IsEnum, IsNotEmpty, Matches, MaxLength, Min, MinLength, IsNumber, IsOptional } from 'class-validator';
import { DroneModel, DroneStatus } from '../../common/enums';

export class CreateDroneDto {
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  identifier: string;

  @IsNotEmpty()
  @Matches(/^SKY-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  serialNumber: string;

  @IsEnum(DroneModel)
  model: DroneModel;

  @IsEnum(DroneStatus)
  @IsOptional()
  status?: DroneStatus;

  @IsNumber()
  @Min(0)
  @IsOptional()
  totalFlightHours?: number;

  @IsDateString()
  @IsOptional()
  lastMaintenanceDate?: string;

  @IsDateString()
  @IsOptional()
  nextMaintenanceDueDate?: string;
}
