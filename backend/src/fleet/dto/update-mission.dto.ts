import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { MissionStatus } from '../entities/mission.entity';

export class UpdateMissionDto {
  @IsOptional()
  @IsEnum(MissionStatus)
  status?: MissionStatus;

  @IsOptional()
  @IsDateString()
  actualStart?: string;

  @IsOptional()
  @IsDateString()
  actualEnd?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  flightHoursLogged?: number;

  @IsOptional()
  @IsString()
  abortReason?: string;
}
