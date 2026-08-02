import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, ValidationPipe } from '@nestjs/common';
import { MissionsService } from './missions.service';
import { CreateMissionDto } from './dto/create-mission.dto';
import { UpdateMissionDto } from './dto/update-mission.dto';
import { ListMissionsDto } from './dto/list-missions.dto';

@Controller('missions')
export class MissionsController {
  constructor(private readonly missionsService: MissionsService) {}

  @Get()
  findAll(@Query(new ValidationPipe({ transform: true })) query: ListMissionsDto) {
    return this.missionsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.missionsService.findOne(id);
  }

  @Post()
  create(@Body(new ValidationPipe({ whitelist: true })) dto: CreateMissionDto) {
    return this.missionsService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body(new ValidationPipe({ whitelist: true })) dto: UpdateMissionDto) {
    return this.missionsService.update(id, dto);
  }
}
