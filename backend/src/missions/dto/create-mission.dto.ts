import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, Min, MinLength } from 'class-validator';
import { MissionStatus, MissionType } from '../../common/enums';

export class CreateMissionDto {
  @IsNotEmpty()
  @MinLength(3)
  name: string;

  @IsEnum(MissionType)
  type: MissionType;

  @IsNumber()
  droneId: number;

  @IsNotEmpty()
  pilotName: string;

  @IsNotEmpty()
  siteLocation: string;

  @IsDateString()
  plannedStart: string;

  @IsDateString()
  plannedEnd: string;

  @IsEnum(MissionStatus)
  @IsOptional()
  status?: MissionStatus;

  @IsOptional()
  @IsNumber()
  @Min(0)
  flightHoursLogged?: number;

  @IsOptional()
  abortReason?: string;
}
