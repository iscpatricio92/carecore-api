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
  UseGuards,
  Req,
  Res,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request, Response } from 'express';

import { FhirService } from './fhir.service';
import { SmartFhirService } from './services/smart-fhir.service';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopesGuard } from '../auth/guards/scopes.guard';
import { MFARequiredGuard } from '../auth/guards/mfa-required.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/interfaces/user.interface';
import { ROLES } from '../../common/constants/roles';
import { FHIR_SCOPES } from '../../common/constants/fhir-scopes';
import { CreatePatientDto, UpdatePatientDto } from '../../common/dto/fhir-patient.dto';
import {
  CreatePractitionerDto,
  UpdatePractitionerDto,
} from '../../common/dto/fhir-practitioner.dto';
import { CreateEncounterDto, UpdateEncounterDto } from '../../common/dto/fhir-encounter.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SmartFhirAuthDto } from '../../common/dto/smart-fhir-auth.dto';
import { Patient, Practitioner, Encounter } from '../../common/interfaces/fhir.interface';
import { FhirErrorService } from '../../common/services/fhir-error.service';

@ApiTags('FHIR')
@Controller('fhir')
@UseGuards(JwtAuthGuard) // Protect all FHIR endpoints by default
export class FhirController {
  constructor(
    private readonly fhirService: FhirService,
    private readonly smartFhirService: SmartFhirService,
  ) {}

  @Get('metadata')
  @Public()
  @ApiOperation({ summary: 'FHIR CapabilityStatement (metadata)' })
  @ApiResponse({ status: 200, description: 'CapabilityStatement returned successfully' })
  getMetadata() {
    return this.fhirService.getCapabilityStatement();
  }

  /**
   * SMART on FHIR Authorization Endpoint
   * Implements OAuth2 Authorization Code Flow for SMART on FHIR applications
   * This endpoint validates OAuth2 parameters and redirects to Keycloak for user authentication
   */
  @Get('auth')
  @Public()
  @ApiOperation({
    summary: 'SMART on FHIR Authorization Endpoint',
    description:
      'OAuth2 Authorization Code Flow endpoint for SMART on FHIR applications. Validates client credentials and redirects to Keycloak for user authentication.',
  })
  @ApiQuery({
    name: 'client_id',
    required: true,
    description: 'Client ID of the SMART on FHIR application',
    example: 'app-123',
  })
  @ApiQuery({
    name: 'response_type',
    required: true,
    description: 'Must be "code" for Authorization Code flow',
    example: 'code',
  })
  @ApiQuery({
    name: 'redirect_uri',
    required: true,
    description: 'Redirect URI where the authorization code will be sent',
    example: 'https://app.com/callback',
  })
  @ApiQuery({
    name: 'scope',
    required: true,
    description: 'Space-separated list of scopes (e.g., "patient:read patient:write")',
    example: 'patient:read patient:write',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    description: 'CSRF protection token',
    example: 'abc123xyz',
  })
  @ApiQuery({
    name: 'aud',
    required: false,
    description: 'Audience - URL of the FHIR server (SMART on FHIR extension)',
    example: 'https://fhir.example.com',
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect to Keycloak for authentication',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters - returns FHIR OperationOutcome',
  })
  @ApiResponse({
    status: 401,
    description: 'Client not found or unauthorized - returns FHIR OperationOutcome',
  })
  async authorize(
    @Query() params: SmartFhirAuthDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Validate OAuth2 parameters
      await this.smartFhirService.validateAuthParams(params);

      // Get our callback URL where Keycloak will redirect after authentication
      const callbackUrl = this.smartFhirService.getCallbackUrl(req);

      // Generate state token if not provided (for CSRF protection)
      const stateToken = params.state || this.smartFhirService.generateStateToken();

      // Build Keycloak authorization URL
      const authUrl = this.smartFhirService.buildAuthorizationUrl(params, stateToken, callbackUrl);

      // Redirect to Keycloak for authentication
      res.redirect(authUrl);
    } catch (error) {
      // Handle errors and return FHIR OperationOutcome
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        const operationOutcome = error.getResponse();
        res.status(error.getStatus()).json(operationOutcome);
        return;
      }

      // Unexpected error - return generic OperationOutcome
      const operationOutcome = FhirErrorService.createOperationOutcome(
        500,
        'An unexpected error occurred during authorization.',
        error instanceof Error ? error.message : 'Unknown error',
      );
      res.status(500).json(operationOutcome);
    }
  }

  // Patient endpoints
  @Post('Patient')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.PATIENT_WRITE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new Patient' })
  @ApiResponse({ status: 201, description: 'Patient created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (patient:write required)',
  })
  createPatient(
    @Body() createPatientDto: CreatePatientDto,
    @CurrentUser() user: User,
  ): Promise<Patient> {
    return this.fhirService.createPatient(createPatientDto, user);
  }

  @Get('Patient/:id')
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.PATIENT_READ)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a Patient by ID' })
  @ApiParam({ name: 'id', description: 'Patient ID' })
  @ApiResponse({ status: 200, description: 'Patient found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (patient:read required)',
  })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  getPatient(@Param('id') id: string, @CurrentUser() user: User): Promise<Patient> {
    return this.fhirService.getPatient(id, user);
  }

  @Get('Patient')
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.PATIENT_READ)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Search Patients' })
  @ApiQuery({ name: 'name', required: false, description: 'Search by name' })
  @ApiQuery({ name: 'identifier', required: false, description: 'Search by identifier' })
  @ApiResponse({ status: 200, description: 'List of Patients' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (patient:read required)',
  })
  searchPatients(
    @Query() pagination: PaginationDto,
    @Query('name') name?: string,
    @Query('identifier') identifier?: string,
    @CurrentUser() user?: User,
  ): Promise<{ total: number; entries: Patient[] }> {
    return this.fhirService.searchPatients({ ...pagination, name, identifier }, user);
  }

  @Put('Patient/:id')
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.PATIENT_WRITE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a Patient' })
  @ApiParam({ name: 'id', description: 'Patient ID' })
  @ApiResponse({ status: 200, description: 'Patient updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (patient:write required)',
  })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  updatePatient(
    @Param('id') id: string,
    @Body() updatePatientDto: UpdatePatientDto,
    @CurrentUser() user: User,
  ): Promise<Patient> {
    return this.fhirService.updatePatient(id, updatePatientDto, user);
  }

  @Delete('Patient/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.PATIENT_WRITE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a Patient' })
  @ApiParam({ name: 'id', description: 'Patient ID' })
  @ApiResponse({ status: 204, description: 'Patient deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (patient:write required)',
  })
  @ApiResponse({ status: 404, description: 'Patient not found' })
  deletePatient(@Param('id') id: string, @CurrentUser() user: User): Promise<void> {
    return this.fhirService.deletePatient(id, user);
  }

  // Practitioner endpoints
  @Post('Practitioner')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard, MFARequiredGuard)
  @Roles(ROLES.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new Practitioner' })
  @ApiResponse({ status: 201, description: 'Practitioner created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  createPractitioner(@Body() createPractitionerDto: CreatePractitionerDto): Promise<Practitioner> {
    return this.fhirService.createPractitioner(createPractitionerDto);
  }

  @Get('Practitioner/:id')
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.PRACTITIONER_READ)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a Practitioner by ID' })
  @ApiParam({ name: 'id', description: 'Practitioner ID' })
  @ApiResponse({ status: 200, description: 'Practitioner found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (practitioner:read required)',
  })
  @ApiResponse({ status: 404, description: 'Practitioner not found' })
  getPractitioner(@Param('id') id: string): Promise<Practitioner> {
    return this.fhirService.getPractitioner(id);
  }

  @Get('Practitioner')
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.PRACTITIONER_READ)
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (practitioner:read required)',
  })
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
  @UseGuards(RolesGuard, MFARequiredGuard)
  @Roles(ROLES.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a Practitioner' })
  @ApiParam({ name: 'id', description: 'Practitioner ID' })
  @ApiResponse({ status: 200, description: 'Practitioner updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Practitioner not found' })
  updatePractitioner(
    @Param('id') id: string,
    @Body() updatePractitionerDto: UpdatePractitionerDto,
  ): Promise<Practitioner> {
    return this.fhirService.updatePractitioner(id, updatePractitionerDto);
  }

  @Delete('Practitioner/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard, MFARequiredGuard)
  @Roles(ROLES.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a Practitioner' })
  @ApiParam({ name: 'id', description: 'Practitioner ID' })
  @ApiResponse({ status: 204, description: 'Practitioner deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Practitioner not found' })
  deletePractitioner(@Param('id') id: string): Promise<void> {
    return this.fhirService.deletePractitioner(id);
  }

  // Encounter endpoints
  @Post('Encounter')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(RolesGuard, MFARequiredGuard)
  @Roles(ROLES.PRACTITIONER, ROLES.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new Encounter' })
  @ApiResponse({ status: 201, description: 'Encounter created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Practitioner or Admin role required' })
  createEncounter(@Body() createEncounterDto: CreateEncounterDto): Promise<Encounter> {
    return this.fhirService.createEncounter(createEncounterDto);
  }

  @Get('Encounter/:id')
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.ENCOUNTER_READ)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get an Encounter by ID' })
  @ApiParam({ name: 'id', description: 'Encounter ID' })
  @ApiResponse({ status: 200, description: 'Encounter found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (encounter:read required)',
  })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  getEncounter(@Param('id') id: string): Promise<Encounter> {
    return this.fhirService.getEncounter(id);
  }

  @Get('Encounter')
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.ENCOUNTER_READ)
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
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (encounter:read required)',
  })
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
  @UseGuards(RolesGuard, MFARequiredGuard)
  @Roles(ROLES.PRACTITIONER, ROLES.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update an Encounter' })
  @ApiParam({ name: 'id', description: 'Encounter ID' })
  @ApiResponse({ status: 200, description: 'Encounter updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Practitioner or Admin role required' })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  updateEncounter(
    @Param('id') id: string,
    @Body() updateEncounterDto: UpdateEncounterDto,
  ): Promise<Encounter> {
    return this.fhirService.updateEncounter(id, updateEncounterDto);
  }

  @Delete('Encounter/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.ENCOUNTER_WRITE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete an Encounter' })
  @ApiParam({ name: 'id', description: 'Encounter ID' })
  @ApiResponse({ status: 204, description: 'Encounter deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (encounter:write required)',
  })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  deleteEncounter(@Param('id') id: string): Promise<void> {
    return this.fhirService.deleteEncounter(id);
  }
}
