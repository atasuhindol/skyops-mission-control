import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, ValidationPipe } from '@nestjs/common';
import { DronesService } from './drones.service';
import { CreateDroneDto } from './dto/create-drone.dto';
import { UpdateDroneDto } from './dto/update-drone.dto';
import { ListDronesDto } from './dto/list-drones.dto';

@Controller('drones')
export class DronesController {
  constructor(private readonly dronesService: DronesService) {}

  @Get()
  findAll(@Query(new ValidationPipe({ transform: true })) query: ListDronesDto) {
    return this.dronesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dronesService.findOne(id);
  }

  @Post()
  create(@Body(new ValidationPipe({ whitelist: true })) dto: CreateDroneDto) {
    return this.dronesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body(new ValidationPipe({ whitelist: true })) dto: UpdateDroneDto) {
    return this.dronesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.dronesService.remove(id);
  }
}
