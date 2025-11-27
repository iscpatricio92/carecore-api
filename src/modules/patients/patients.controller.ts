import { Body, Controller, Get, Header, Param, Post } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

import { PatientsService } from './patients.service';
import { Patient } from '@/common/interfaces/fhir.interface';

@ApiTags('Patients')
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Header('Content-Type', 'application/fhir+json')
  create(@Body() patient: Patient) {
    return this.patientsService.create(patient);
  }

  @Get()
  @ApiOperation({ summary: 'Get all patients' })
  @Header('Content-Type', 'application/fhir+json')
  findAll() {
    return this.patientsService.findAll();
  }

  @Get(':id')
  @Header('Content-Type', 'application/fhir+json')
  findOne(@Param('id') id: string) {
    return this.patientsService.findOne(id);
  }
}
