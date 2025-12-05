import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { PractitionersService } from './practitioners.service';
import { Practitioner } from '@/common/interfaces/fhir.interface';

@ApiTags('Practitioners')
@Controller('practitioners')
export class PractitionersController {
  constructor(private readonly practitionersService: PractitionersService) {}

  @Post()
  @Header('Content-Type', 'application/fhir+json')
  create(@Body() practitioner: Practitioner) {
    return this.practitionersService.create(practitioner);
  }

  @Get()
  @ApiOperation({ summary: 'Get all practitioners' })
  @Header('Content-Type', 'application/fhir+json')
  findAll() {
    return this.practitionersService.findAll();
  }

  @Get(':id')
  @Header('Content-Type', 'application/fhir+json')
  findOne(@Param('id') id: string) {
    return this.practitionersService.findOne(id);
  }
}
