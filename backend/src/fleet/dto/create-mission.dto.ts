import { IsDateString, IsEnum, IsString } from 'class-validator';
import { MissionType } from '../entities/mission.entity';

export class CreateMissionDto {
  @IsString()
  name: string;

  @IsEnum(MissionType)
  type: MissionType;

  @IsString()
  pilotName: string;

  @IsString()
  siteLocation: string;

  @IsDateString()
  scheduledStart: string;

  @IsDateString()
  scheduledEnd: string;

  @IsString()
  droneId: string;
}
