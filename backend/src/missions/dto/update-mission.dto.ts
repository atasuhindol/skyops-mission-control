import { IsDateString, IsEnum, IsNumber, IsOptional, Min, MinLength } from 'class-validator';
import { MissionStatus, MissionType } from '../../common/enums';

export class UpdateMissionDto {
  @IsOptional()
  @MinLength(3)
  name?: string;

  @IsOptional()
  @IsEnum(MissionType)
  type?: MissionType;

  @IsOptional()
  @IsNumber()
  droneId?: number;

  @IsOptional()
  pilotName?: string;

  @IsOptional()
  siteLocation?: string;

  @IsOptional()
  @IsDateString()
  plannedStart?: string;

  @IsOptional()
  @IsDateString()
  plannedEnd?: string;

  @IsOptional()
  @IsEnum(MissionStatus)
  status?: MissionStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  flightHoursLogged?: number;

  @IsOptional()
  abortReason?: string;
}
