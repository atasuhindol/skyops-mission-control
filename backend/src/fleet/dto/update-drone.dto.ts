import { IsEnum, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { DroneModel, DroneStatus } from '../entities/drone.entity';

export class UpdateDroneDto {
  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsString()
  @Matches(/^SKY-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  serialNumber?: string;

  @IsOptional()
  @IsEnum(DroneModel)
  model?: DroneModel;

  @IsOptional()
  @IsEnum(DroneStatus)
  status?: DroneStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalFlightHours?: number;

  @IsOptional()
  @IsString()
  lastMaintenanceDate?: string;
}
