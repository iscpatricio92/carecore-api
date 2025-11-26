import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';

import { FhirService } from './fhir.service';
import { CreatePatientDto, UpdatePatientDto } from '../../common/dto/fhir-patient.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Patient } from '../../common/interfaces/fhir.interface';

@ApiTags('FHIR')
@Controller('fhir')
export class FhirController {
  constructor(private readonly fhirService: FhirService) {}

  @Get('metadata')
  @ApiOperation({ summary: 'FHIR CapabilityStatement (metadata)' })
  @ApiResponse({ status: 200, description: 'CapabilityStatement returned successfully' })
  getMetadata() {
    return this.fhirService.getCapabilityStatement();
  }

  // Patient endpoints
  @Post('Patient')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new Patient' })
  @ApiResponse({ status: 201, description: 'Patient created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  createPatient(@Body() createPatientDto: CreatePatientDto): Promise<Patient> {
    return this.fhirService.createPatient(createPatientDto);
  }

  @Get('Patient/:id')
  @ApiOperation({ summary: 'Get a Patient by ID' })
  @ApiParam({ name: 'id', description: 'Patient ID' })
  @ApiResponse({ status: 200, description: 'Patient found' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  getPatient(@Param('id') id: string): Promise<Patient> {
    return this.fhirService.getPatient(id);
  }

  @Get('Patient')
  @ApiOperation({ summary: 'Search Patients' })
  @ApiQuery({ name: 'name', required: false, description: 'Search by name' })
  @ApiQuery({ name: 'identifier', required: false, description: 'Search by identifier' })
  @ApiResponse({ status: 200, description: 'List of Patients' })
  searchPatients(
    @Query() pagination: PaginationDto,
    @Query('name') name?: string,
    @Query('identifier') identifier?: string,
  ): Promise<{ total: number; entries: Patient[] }> {
    return this.fhirService.searchPatients({ ...pagination, name, identifier });
  }

  @Put('Patient/:id')
  @ApiOperation({ summary: 'Update a Patient' })
  @ApiParam({ name: 'id', description: 'Patient ID' })
  @ApiResponse({ status: 200, description: 'Patient updated successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  updatePatient(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
  ): Promise<Patient> {
    return this.fhirService.updatePatient(id, updatePatientDto);
  }

  @Delete('Patient/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a Patient' })
  @ApiParam({ name: 'id', description: 'Patient ID' })
  @ApiResponse({ status: 204, description: 'Patient deleted successfully' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  deletePatient(@Param('id') id: string): Promise<void> {
    return this.fhirService.deletePatient(id);
  }
}
