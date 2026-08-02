import { IsEnum, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { DroneModel, DroneStatus } from '../entities/drone.entity';

export class CreateDroneDto {
  @IsString()
  identifier: string;

  @IsString()
  @Matches(/^SKY-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
  serialNumber: string;

  @IsEnum(DroneModel)
  model: DroneModel;

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
