import { Body, Controller, Get, Header, Param, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { PatientsService } from './patients.service';
import { Patient } from '@carecore/shared';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Patients')
@Controller('patients')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
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
