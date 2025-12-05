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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { FhirService } from './fhir.service';
import { Public } from '../auth/decorators/public.decorator';
import { CreatePatientDto, UpdatePatientDto } from '../../common/dto/fhir-patient.dto';
import {
  CreatePractitionerDto,
  UpdatePractitionerDto,
} from '../../common/dto/fhir-practitioner.dto';
import { CreateEncounterDto, UpdateEncounterDto } from '../../common/dto/fhir-encounter.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Patient, Practitioner, Encounter } from '../../common/interfaces/fhir.interface';

@ApiTags('FHIR')
@Controller('fhir')
export class FhirController {
  constructor(private readonly fhirService: FhirService) {}

  @Get('metadata')
  @Public()
  @ApiOperation({ summary: 'FHIR CapabilityStatement (metadata)' })
  @ApiResponse({ status: 200, description: 'CapabilityStatement returned successfully' })
  getMetadata() {
    return this.fhirService.getCapabilityStatement();
  }

  // Patient endpoints
  @Post('Patient')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new Patient' })
  @ApiResponse({ status: 201, description: 'Patient created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  createPatient(@Body() createPatientDto: CreatePatientDto): Promise<Patient> {
    return this.fhirService.createPatient(createPatientDto);
  }

  @Get('Patient/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a Patient by ID' })
  @ApiParam({ name: 'id', description: 'Patient ID' })
  @ApiResponse({ status: 200, description: 'Patient found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  getPatient(@Param('id') id: string): Promise<Patient> {
    return this.fhirService.getPatient(id);
  }

  @Get('Patient')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Search Patients' })
  @ApiQuery({ name: 'name', required: false, description: 'Search by name' })
  @ApiQuery({ name: 'identifier', required: false, description: 'Search by identifier' })
  @ApiResponse({ status: 200, description: 'List of Patients' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  searchPatients(
    @Query() pagination: PaginationDto,
    @Query('name') name?: string,
    @Query('identifier') identifier?: string,
  ): Promise<{ total: number; entries: Patient[] }> {
    return this.fhirService.searchPatients({ ...pagination, name, identifier });
  }

  @Put('Patient/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a Patient' })
  @ApiParam({ name: 'id', description: 'Patient ID' })
  @ApiResponse({ status: 200, description: 'Patient updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  updatePatient(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
  ): Promise<Patient> {
    return this.fhirService.updatePatient(id, updatePatientDto);
  }

  @Delete('Patient/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a Patient' })
  @ApiParam({ name: 'id', description: 'Patient ID' })
  @ApiResponse({ status: 204, description: 'Patient deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  deletePatient(@Param('id') id: string): Promise<void> {
    return this.fhirService.deletePatient(id);
  }

  // Practitioner endpoints
  @Post('Practitioner')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new Practitioner' })
  @ApiResponse({ status: 201, description: 'Practitioner created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  createPractitioner(@Body() createPractitionerDto: CreatePractitionerDto): Promise<Practitioner> {
    return this.fhirService.createPractitioner(createPractitionerDto);
  }

  @Get('Practitioner/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a Practitioner by ID' })
  @ApiParam({ name: 'id', description: 'Practitioner ID' })
  @ApiResponse({ status: 200, description: 'Practitioner found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Practitioner not found' })
  getPractitioner(@Param('id') id: string): Promise<Practitioner> {
    return this.fhirService.getPractitioner(id);
  }

  @Get('Practitioner')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Search Practitioners' })
  @ApiQuery({ name: 'name', required: false, description: 'Search by name' })
  @ApiQuery({
    name: 'identifier',
    required: false,
    description: 'Search by identifier (license)',
  })
  @ApiResponse({ status: 200, description: 'List of Practitioners' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  searchPractitioners(
    @Query() pagination: PaginationDto,
    @Query('name') name?: string,
    @Query('identifier') identifier?: string,
  ): Promise<{ total: number; entries: Practitioner[] }> {
    return this.fhirService.searchPractitioners({
      ...pagination,
      name,
      identifier,
    });
  }

  @Put('Practitioner/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a Practitioner' })
  @ApiParam({ name: 'id', description: 'Practitioner ID' })
  @ApiResponse({ status: 200, description: 'Practitioner updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Practitioner not found' })
  updatePractitioner(
    @Param('id') id: string,
    @Body() updatePractitionerDto: UpdatePractitionerDto,
  ): Promise<Practitioner> {
    return this.fhirService.updatePractitioner(id, updatePractitionerDto);
  }

  @Delete('Practitioner/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a Practitioner' })
  @ApiParam({ name: 'id', description: 'Practitioner ID' })
  @ApiResponse({ status: 204, description: 'Practitioner deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Practitioner not found' })
  deletePractitioner(@Param('id') id: string): Promise<void> {
    return this.fhirService.deletePractitioner(id);
  }

  // Encounter endpoints
  @Post('Encounter')
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new Encounter' })
  @ApiResponse({ status: 201, description: 'Encounter created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  createEncounter(@Body() createEncounterDto: CreateEncounterDto): Promise<Encounter> {
    return this.fhirService.createEncounter(createEncounterDto);
  }

  @Get('Encounter/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get an Encounter by ID' })
  @ApiParam({ name: 'id', description: 'Encounter ID' })
  @ApiResponse({ status: 200, description: 'Encounter found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  getEncounter(@Param('id') id: string): Promise<Encounter> {
    return this.fhirService.getEncounter(id);
  }

  @Get('Encounter')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Search Encounters' })
  @ApiQuery({
    name: 'subject',
    required: false,
    description: 'Search by Patient reference (e.g., Patient/123)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (planned, in-progress, finished, etc.)',
  })
  @ApiQuery({
    name: 'date',
    required: false,
    description: 'Filter by date (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, description: 'List of Encounters' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  searchEncounters(
    @Query() pagination: PaginationDto,
    @Query('subject') subject?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
  ): Promise<{ total: number; entries: Encounter[] }> {
    return this.fhirService.searchEncounters({
      ...pagination,
      subject,
      status,
      date,
    });
  }

  @Put('Encounter/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an Encounter' })
  @ApiParam({ name: 'id', description: 'Encounter ID' })
  @ApiResponse({ status: 200, description: 'Encounter updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  updateEncounter(
    @Param('id') id: string,
    @Body() updateEncounterDto: UpdateEncounterDto,
  ): Promise<Encounter> {
    return this.fhirService.updateEncounter(id, updateEncounterDto);
  }

  @Delete('Encounter/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete an Encounter' })
  @ApiParam({ name: 'id', description: 'Encounter ID' })
  @ApiResponse({ status: 204, description: 'Encounter deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  deleteEncounter(@Param('id') id: string): Promise<void> {
    return this.fhirService.deleteEncounter(id);
  }
}
