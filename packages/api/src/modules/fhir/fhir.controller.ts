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
import * as jwt from 'jsonwebtoken';

import { FhirService } from './fhir.service';
import { SmartFhirService } from './services/smart-fhir.service';
import { ConsentsService } from '../consents/consents.service';
import { DocumentsService } from '../documents/documents.service';
import { Public } from '../auth/decorators/public.decorator';
import { PinoLogger } from 'nestjs-pino';
import { AuditService } from '../audit/audit.service';
import { KeycloakAdminService } from '../auth/services/keycloak-admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopesGuard } from '../auth/guards/scopes.guard';
import { MFARequiredGuard } from '../auth/guards/mfa-required.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { InsufficientScopesException } from '../auth/exceptions/insufficient-scopes.exception';
import {
  User,
  Patient,
  Practitioner,
  Encounter,
  Consent,
  DocumentReference,
  FHIR_SCOPES,
} from '@carecore/shared';
import { ROLES } from '../../common/constants/roles';
import { CreatePatientDto, UpdatePatientDto } from '../../common/dto/fhir-patient.dto';
import {
  CreatePractitionerDto,
  UpdatePractitionerDto,
} from '../../common/dto/fhir-practitioner.dto';
import { CreateEncounterDto, UpdateEncounterDto } from '../../common/dto/fhir-encounter.dto';
import {
  CreateConsentDto,
  UpdateConsentDto,
  ShareConsentWithPractitionerDto,
} from '../../common/dto/fhir-consent.dto';
import {
  CreateDocumentReferenceDto,
  UpdateDocumentReferenceDto,
} from '../../common/dto/fhir-document-reference.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { SmartFhirAuthDto } from '../../common/dto/smart-fhir-auth.dto';
import { SmartFhirTokenDto } from '../../common/dto/smart-fhir-token.dto';
import { SmartFhirLaunchDto } from '../../common/dto/smart-fhir-launch.dto';
import { FhirErrorService } from '../../common/services/fhir-error.service';

@ApiTags('FHIR')
@Controller('fhir')
@UseGuards(JwtAuthGuard) // Protect all FHIR endpoints by default
export class FhirController {
  constructor(
    private readonly fhirService: FhirService,
    private readonly smartFhirService: SmartFhirService,
    private readonly consentsService: ConsentsService,
    private readonly documentsService: DocumentsService,
    private readonly logger: PinoLogger,
    private readonly auditService: AuditService,
    private readonly keycloakAdminService: KeycloakAdminService,
  ) {
    this.logger.setContext(FhirController.name);
  }

  @Get('metadata')
  @Public()
  @ApiOperation({ summary: 'FHIR CapabilityStatement (metadata)' })
  @ApiResponse({ status: 200, description: 'CapabilityStatement returned successfully' })
  getMetadata() {
    return this.fhirService.getCapabilityStatement();
  }

  /**
   * SMART on FHIR Launch Endpoint
   * Handles the launch sequence when an application is launched from a clinical context (EHR)
   * Validates launch token, extracts context, and redirects to authorization flow
   */
  @Get('authorize')
  @Public()
  @ApiOperation({
    summary: 'SMART on FHIR Launch Endpoint',
    description:
      'Handles the launch sequence for SMART on FHIR applications. Validates launch token, extracts clinical context (patient, encounter, etc.), and redirects to the authorization flow.',
  })
  @ApiQuery({
    name: 'iss',
    required: true,
    description: 'Issuer - URL of the FHIR server',
    example: 'https://carecore.example.com',
  })
  @ApiQuery({
    name: 'launch',
    required: true,
    description: 'Launch context token - opaque token provided by the EHR',
    example: 'xyz123',
  })
  @ApiQuery({
    name: 'client_id',
    required: true,
    description: 'Client ID of the SMART on FHIR application',
    example: 'app-123',
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
  @ApiResponse({
    status: 302,
    description: 'Redirect to authorization endpoint with launch context',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters - returns FHIR OperationOutcome',
  })
  @ApiResponse({
    status: 401,
    description: 'Client not found or unauthorized - returns FHIR OperationOutcome',
  })
  async launch(
    @Query() params: SmartFhirLaunchDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Validate launch parameters
      await this.smartFhirService.validateLaunchParams(params);

      // Validate and decode launch token to extract context
      const launchContext = await this.smartFhirService.validateAndDecodeLaunchToken(params.launch);

      // Store launch context temporarily (will be retrieved during token exchange)
      this.smartFhirService.storeLaunchContext(params.launch, launchContext);

      // Build authorization URL with launch context
      // We'll encode the launch token in the state parameter to retrieve context later
      const stateToken = this.smartFhirService.generateStateToken();
      const stateData = {
        state: params.state || stateToken,
        clientRedirectUri: params.redirect_uri,
        launchToken: params.launch, // Include launch token in state to retrieve context later
      };
      const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64url');

      // Build authorization parameters
      const authParams: SmartFhirAuthDto = {
        client_id: params.client_id,
        response_type: 'code',
        redirect_uri: params.redirect_uri,
        scope: params.scope,
        state: encodedState,
        aud: params.iss,
      };

      // Get callback URL
      const callbackUrl = this.smartFhirService.getCallbackUrl(req);

      // Build Keycloak authorization URL
      const authUrl = this.smartFhirService.buildAuthorizationUrl(
        authParams,
        encodedState,
        callbackUrl,
      );

      // Get client name for audit logging
      let clientName: string | null = null;
      try {
        const client = await this.keycloakAdminService.findClientById(params.client_id);
        clientName = client?.name || null;
      } catch (error) {
        // Log error but don't fail the request
        this.logger.warn(
          { clientId: params.client_id, error },
          'Failed to get client name for audit',
        );
      }

      // Audit log for launch sequence
      const scopes = params.scope ? params.scope.split(' ').filter((s) => s.length > 0) : [];
      this.auditService
        .logSmartLaunch({
          clientId: params.client_id,
          clientName,
          launchToken: params.launch,
          launchContext: launchContext as unknown as Record<string, unknown>,
          scopes,
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.get('user-agent') || null,
          statusCode: 302,
        })
        .catch((error) => {
          this.logger.error({ error }, 'Failed to log audit for SMART launch');
        });

      // Redirect to authorization endpoint
      res.redirect(authUrl);
    } catch (error) {
      // Get client name for audit logging (even on error)
      let clientName: string | null = null;
      try {
        const client = await this.keycloakAdminService.findClientById(params.client_id);
        clientName = client?.name || null;
      } catch {
        // Ignore errors when getting client name
      }

      // Audit log for failed launch
      const scopes = params.scope ? params.scope.split(' ').filter((s) => s.length > 0) : [];
      const statusCode =
        error instanceof BadRequestException
          ? 400
          : error instanceof UnauthorizedException
            ? 401
            : 500;
      this.auditService
        .logSmartLaunch({
          clientId: params.client_id,
          clientName,
          launchToken: params.launch,
          launchContext: {},
          scopes,
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.get('user-agent') || null,
          statusCode,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .catch((err) => {
          this.logger.error({ error: err }, 'Failed to log audit for SMART launch error');
        });

      // Handle errors and return FHIR OperationOutcome
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        const operationOutcome = error.getResponse();
        res.status(error.getStatus()).json(operationOutcome);
        return;
      }

      // Unexpected error - return generic OperationOutcome
      const operationOutcome = FhirErrorService.createOperationOutcome(
        500,
        'An unexpected error occurred during launch sequence.',
        error instanceof Error ? error.message : 'Unknown error',
      );
      res.status(500).json(operationOutcome);
    }
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

      // Get client name for audit logging
      let clientName: string | null = null;
      try {
        const client = await this.keycloakAdminService.findClientById(params.client_id);
        clientName = client?.name || null;
      } catch (error) {
        // Log error but don't fail the request
        this.logger.warn(
          { clientId: params.client_id, error },
          'Failed to get client name for audit',
        );
      }

      // Audit log for authorization request
      const scopes = params.scope ? params.scope.split(' ').filter((s) => s.length > 0) : [];
      this.auditService
        .logSmartAuth({
          clientId: params.client_id,
          clientName,
          redirectUri: params.redirect_uri,
          scopes,
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.get('user-agent') || null,
          statusCode: 302,
        })
        .catch((error) => {
          this.logger.error({ error }, 'Failed to log audit for SMART auth');
        });

      // Redirect to Keycloak for authentication
      res.redirect(authUrl);
    } catch (error) {
      // Get client name for audit logging (even on error)
      let clientName: string | null = null;
      try {
        const client = await this.keycloakAdminService.findClientById(params.client_id);
        clientName = client?.name || null;
      } catch {
        // Ignore errors when getting client name
      }

      // Audit log for failed authorization
      const scopes = params.scope ? params.scope.split(' ').filter((s) => s.length > 0) : [];
      const statusCode =
        error instanceof BadRequestException
          ? 400
          : error instanceof UnauthorizedException
            ? 401
            : 500;
      this.auditService
        .logSmartAuth({
          clientId: params.client_id,
          clientName,
          redirectUri: params.redirect_uri,
          scopes,
          ipAddress: req.ip || req.socket.remoteAddress || null,
          userAgent: req.get('user-agent') || null,
          statusCode,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .catch((err) => {
          this.logger.error({ error: err }, 'Failed to log audit for SMART auth error');
        });

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

  /**
   * SMART on FHIR Token Endpoint
   * Implements OAuth2 Token Exchange for SMART on FHIR applications
   * This endpoint exchanges authorization codes for access tokens
   */
  @Post('token')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'SMART on FHIR Token Endpoint',
    description:
      'OAuth2 Token Exchange endpoint for SMART on FHIR applications. Exchanges authorization codes or refresh tokens for access tokens.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token response with access_token, refresh_token, and metadata',
    schema: {
      type: 'object',
      properties: {
        access_token: { type: 'string', example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...' },
        token_type: { type: 'string', example: 'Bearer' },
        expires_in: { type: 'number', example: 3600 },
        refresh_token: { type: 'string', example: 'refresh-token-xyz' },
        scope: { type: 'string', example: 'patient:read patient:write' },
        patient: { type: 'string', example: '123', description: 'Patient context (SMART on FHIR)' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters - returns OAuth2 error response',
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'invalid_request' },
        error_description: { type: 'string', example: 'Missing required parameter: code' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid client or authorization code - returns OAuth2 error response',
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'invalid_client' },
        error_description: { type: 'string', example: 'Client authentication failed' },
      },
    },
  })
  async token(
    @Body() params: SmartFhirTokenDto,
    @Query('code') codeFromQuery?: string,
    @Query('state') stateFromQuery?: string,
    @Req() req?: Request,
  ): Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
    patient?: string;
  }> {
    try {
      // Handle both POST body and GET query parameters (for Keycloak callback)
      // Keycloak redirects to this endpoint with code and state in query params
      const tokenParams: SmartFhirTokenDto = {
        grant_type: params.grant_type || 'authorization_code',
        code: params.code || codeFromQuery,
        redirect_uri: params.redirect_uri,
        client_id: params.client_id,
        client_secret: params.client_secret,
        refresh_token: params.refresh_token,
      };

      // If code and state come from query params (Keycloak callback), decode state to get client redirect_uri
      // Also check if launch token is present to retrieve launch context
      let launchContext = null;
      if (codeFromQuery && stateFromQuery && !tokenParams.redirect_uri) {
        const stateData = this.smartFhirService.decodeStateToken(stateFromQuery);
        if (stateData) {
          tokenParams.code = codeFromQuery;
          tokenParams.redirect_uri = stateData.clientRedirectUri;

          // If launch token is present in state, retrieve launch context
          if ('launchToken' in stateData && typeof stateData.launchToken === 'string') {
            launchContext = this.smartFhirService.getLaunchContext(stateData.launchToken);
            // Remove launch context after use (one-time use)
            if (launchContext) {
              this.smartFhirService.removeLaunchContext(stateData.launchToken);
            }
          }
        }
      }

      // Validate token request parameters
      await this.smartFhirService.validateTokenParams(tokenParams);

      // Get our callback URL (where Keycloak redirected to)
      const callbackUrl = req
        ? this.smartFhirService.getCallbackUrl(req)
        : 'http://localhost:3000/api/fhir/token';

      // Exchange code for tokens
      const tokenResponse = await this.smartFhirService.exchangeCodeForTokens(
        tokenParams,
        callbackUrl,
      );

      // If launch context is available, include patient context in token response
      // Launch context takes precedence over context extracted from scopes
      if (launchContext?.patient) {
        tokenResponse.patient = launchContext.patient;
      }

      // Get client name for audit logging
      let clientName: string | null = null;
      try {
        const client = await this.keycloakAdminService.findClientById(tokenParams.client_id);
        clientName = client?.name || null;
      } catch (error) {
        // Log error but don't fail the request
        this.logger.warn(
          { clientId: tokenParams.client_id, error },
          'Failed to get client name for audit',
        );
      }

      // Extract clientId from token if available (for audit logging)
      let tokenClientId: string | null = tokenParams.client_id;
      try {
        if (tokenResponse.access_token) {
          // Decode token without verification to extract claims
          const decoded = jwt.decode(tokenResponse.access_token, { complete: false });
          if (decoded && typeof decoded === 'object' && 'azp' in decoded) {
            // azp (authorized party) is the client ID that requested the token
            tokenClientId = decoded.azp as string;
          } else if (decoded && typeof decoded === 'object' && 'aud' in decoded) {
            // aud (audience) can also contain the client ID
            const aud = decoded.aud;
            tokenClientId = Array.isArray(aud) ? aud[0] : (aud as string);
          }
        }
      } catch (error) {
        // If token decoding fails, use client_id from params
        this.logger.debug({ error }, 'Failed to extract clientId from token, using params');
      }

      // Audit log for token exchange
      const scopes = tokenResponse.scope
        ? tokenResponse.scope.split(' ').filter((s) => s.length > 0)
        : [];
      this.auditService
        .logSmartToken({
          clientId: tokenClientId || tokenParams.client_id,
          clientName,
          grantType: tokenParams.grant_type || 'authorization_code',
          launchContext: launchContext
            ? (launchContext as unknown as Record<string, unknown>)
            : null,
          scopes,
          ipAddress: req?.ip || req?.socket.remoteAddress || null,
          userAgent: req?.get('user-agent') || null,
          statusCode: 200,
        })
        .catch((error) => {
          this.logger.error({ error }, 'Failed to log audit for SMART token');
        });

      return tokenResponse;
    } catch (error) {
      // Get client name for audit logging (even on error)
      let clientName: string | null = null;
      const clientId = params.client_id;
      try {
        if (clientId) {
          const client = await this.keycloakAdminService.findClientById(clientId);
          clientName = client?.name || null;
        }
      } catch {
        // Ignore errors when getting client name
      }

      // Audit log for failed token exchange
      const statusCode =
        error instanceof BadRequestException
          ? 400
          : error instanceof UnauthorizedException
            ? 401
            : 500;
      this.auditService
        .logSmartToken({
          clientId: clientId || null,
          clientName,
          grantType: params.grant_type || 'authorization_code',
          launchContext: null,
          scopes: null,
          ipAddress: req?.ip || req?.socket.remoteAddress || null,
          userAgent: req?.get('user-agent') || null,
          statusCode,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
        })
        .catch((err) => {
          this.logger.error({ error: err }, 'Failed to log audit for SMART token error');
        });

      // Handle OAuth2 errors (they already have the correct format)
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        const errorResponse = error.getResponse();
        // If it's already an OAuth2 error format (has error_description), return it directly
        if (
          typeof errorResponse === 'object' &&
          errorResponse !== null &&
          'error_description' in errorResponse
        ) {
          throw error;
        }
        // Otherwise, convert to OAuth2 error format
        const errorMessage =
          typeof errorResponse === 'string'
            ? errorResponse
            : (errorResponse as { message?: string })?.message || 'Invalid request parameters';
        throw new BadRequestException({
          error: 'invalid_request',
          error_description: errorMessage,
        });
      }

      // Unexpected error - return generic OAuth2 error
      this.logger.error({ error }, 'Unexpected error in token endpoint');
      throw new BadRequestException({
        error: 'server_error',
        error_description: 'An unexpected error occurred during token exchange',
      });
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
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get an Encounter by ID' })
  @ApiParam({ name: 'id', description: 'Encounter ID' })
  @ApiResponse({ status: 200, description: 'Encounter found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (encounter:read or patient:read required)',
  })
  @ApiResponse({ status: 404, description: 'Encounter not found' })
  getEncounter(@Param('id') id: string, @CurrentUser() user: User): Promise<Encounter> {
    // Validate that user has at least one of the allowed scopes
    // Patients can access their own encounters with patient:read (semantically correct)
    // Practitioners and admins can access with encounter:read
    const allowedScopes = [FHIR_SCOPES.ENCOUNTER_READ, FHIR_SCOPES.PATIENT_READ];
    const userScopes = user?.scopes || [];
    const hasAllowedScope = allowedScopes.some((scope) => userScopes.includes(scope));

    if (!hasAllowedScope) {
      throw new InsufficientScopesException(allowedScopes, userScopes);
    }

    return this.fhirService.getEncounter(id, user);
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
  @ApiQuery({
    name: '_count',
    required: false,
    description: 'Number of results per page (FHIR standard parameter)',
  })
  @ApiQuery({
    name: '_sort',
    required: false,
    description: 'Sort order (FHIR standard parameter, e.g., -date for descending by date)',
  })
  @ApiResponse({ status: 200, description: 'List of Encounters' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (encounter:read or patient:read required)',
  })
  searchEncounters(
    @Query() pagination: PaginationDto,
    @Query('subject') subject?: string,
    @Query('status') status?: string,
    @Query('date') date?: string,
    @Query('_count') _count?: string,
    @Query('_sort') _sort?: string,
    @CurrentUser() user?: User,
  ): Promise<{ total: number; entries: Encounter[] }> {
    // Validate that user has at least one of the allowed scopes
    // Patients can access their own encounters with patient:read (semantically correct)
    // Practitioners and admins can access with encounter:read
    const allowedScopes = [FHIR_SCOPES.ENCOUNTER_READ, FHIR_SCOPES.PATIENT_READ];
    const userScopes = user?.scopes || [];
    const hasAllowedScope = allowedScopes.some((scope) => userScopes.includes(scope));

    if (!hasAllowedScope) {
      throw new InsufficientScopesException(allowedScopes, userScopes);
    }

    // Convert FHIR standard parameters to internal format
    const limit = _count ? parseInt(_count, 10) : pagination.limit;
    const page = pagination.page || 1;

    return this.fhirService.searchEncounters(
      {
        page,
        limit,
        subject,
        status,
        date,
        sort: _sort, // Pass sort parameter to service
      },
      user,
    );
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

  // Consent endpoints
  @Get('Consent')
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.CONSENT_READ)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Search Consents' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (active, inactive, etc.)',
  })
  @ApiQuery({
    name: '_count',
    required: false,
    description: 'Number of results per page (FHIR standard parameter)',
  })
  @ApiQuery({
    name: '_sort',
    required: false,
    description: 'Sort order (FHIR standard parameter)',
  })
  @ApiResponse({ status: 200, description: 'List of Consents' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (consent:read required)',
  })
  searchConsents(
    @Query('status') status?: string,
    @Query('_count') _count?: string,
    @Query('_sort') _sort?: string,
    @CurrentUser() user?: User,
  ): Promise<{ total: number; entries: Consent[] }> {
    return this.consentsService.searchConsents(
      {
        _count,
        _sort,
        status,
      },
      user,
    );
  }

  @Get('Consent/:id')
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.CONSENT_READ)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a Consent by ID' })
  @ApiParam({ name: 'id', description: 'Consent ID' })
  @ApiResponse({ status: 200, description: 'Consent found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (consent:read required)',
  })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  getConsent(@Param('id') id: string, @CurrentUser() user?: User): Promise<Consent> {
    return this.consentsService.findOne(id, user);
  }

  @Post('Consent')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.CONSENT_WRITE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new Consent' })
  @ApiResponse({ status: 201, description: 'Consent created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (consent:write required)',
  })
  createConsent(
    @Body() createConsentDto: CreateConsentDto,
    @CurrentUser() user?: User,
  ): Promise<Consent> {
    return this.consentsService.create(createConsentDto, user);
  }

  @Put('Consent/:id')
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.CONSENT_WRITE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a Consent' })
  @ApiParam({ name: 'id', description: 'Consent ID' })
  @ApiResponse({ status: 200, description: 'Consent updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (consent:write required)',
  })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  updateConsent(
    @Param('id') id: string,
    @Body() updateConsentDto: UpdateConsentDto,
    @CurrentUser() user?: User,
  ): Promise<Consent> {
    return this.consentsService.update(id, updateConsentDto, user);
  }

  @Delete('Consent/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.CONSENT_WRITE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a Consent' })
  @ApiParam({ name: 'id', description: 'Consent ID' })
  @ApiResponse({ status: 204, description: 'Consent deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (consent:write required)',
  })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  deleteConsent(@Param('id') id: string, @CurrentUser() user?: User): Promise<void> {
    return this.consentsService.remove(id, user);
  }

  @Post('Consent/:id/share')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.CONSENT_WRITE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Share consent with a practitioner',
    description:
      'Shares a consent with a practitioner for a specific number of days. Creates a provision that expires after the specified number of days.',
  })
  @ApiParam({ name: 'id', description: 'Consent ID' })
  @ApiResponse({ status: 200, description: 'Consent shared successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (consent:write required)',
  })
  @ApiResponse({ status: 404, description: 'Consent not found' })
  shareConsent(
    @Param('id') id: string,
    @Body() shareDto: ShareConsentWithPractitionerDto,
    @CurrentUser() user?: User,
  ): Promise<Consent> {
    return this.consentsService.shareWithPractitioner(id, shareDto, user);
  }

  // DocumentReference endpoints
  @Get('DocumentReference')
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.DOCUMENT_READ)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Search DocumentReferences' })
  @ApiQuery({
    name: '_count',
    required: false,
    description: 'Number of results per page (FHIR standard parameter)',
  })
  @ApiQuery({
    name: '_sort',
    required: false,
    description: 'Sort order (FHIR standard parameter, e.g., -date for descending by date)',
  })
  @ApiResponse({ status: 200, description: 'List of DocumentReferences' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (document:read required)',
  })
  searchDocumentReferences(
    @Query('_count') _count?: string,
    @Query('_sort') _sort?: string,
    @Query('subject') subject?: string,
    @Query('status') status?: string,
    @CurrentUser() user?: User,
  ): Promise<{
    resourceType: string;
    type: string;
    total: number;
    entry: { fullUrl: string; resource: DocumentReference }[];
  }> {
    return this.documentsService.searchDocuments(
      {
        _count,
        _sort,
        subject,
        status,
      },
      user,
    );
  }

  @Get('DocumentReference/:id')
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.DOCUMENT_READ)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get a DocumentReference by ID' })
  @ApiParam({ name: 'id', description: 'DocumentReference ID' })
  @ApiResponse({ status: 200, description: 'DocumentReference found' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (document:read required)',
  })
  @ApiResponse({ status: 404, description: 'DocumentReference not found' })
  getDocumentReference(
    @Param('id') id: string,
    @CurrentUser() user?: User,
  ): Promise<DocumentReference> {
    return this.documentsService.findOne(id, user);
  }

  @Post('DocumentReference')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.DOCUMENT_WRITE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Create a new DocumentReference' })
  @ApiResponse({ status: 201, description: 'DocumentReference created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (document:write required)',
  })
  createDocumentReference(
    @Body() createDocumentDto: CreateDocumentReferenceDto,
    @CurrentUser() user?: User,
  ): Promise<DocumentReference> {
    return this.documentsService.create(createDocumentDto, user);
  }

  @Put('DocumentReference/:id')
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.DOCUMENT_WRITE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Update a DocumentReference' })
  @ApiParam({ name: 'id', description: 'DocumentReference ID' })
  @ApiResponse({ status: 200, description: 'DocumentReference updated successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (document:write required)',
  })
  @ApiResponse({ status: 404, description: 'DocumentReference not found' })
  updateDocumentReference(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentReferenceDto,
    @CurrentUser() user?: User,
  ): Promise<DocumentReference> {
    return this.documentsService.update(id, updateDocumentDto, user);
  }

  @Delete('DocumentReference/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(ScopesGuard)
  @Scopes(FHIR_SCOPES.DOCUMENT_WRITE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete a DocumentReference' })
  @ApiParam({ name: 'id', description: 'DocumentReference ID' })
  @ApiResponse({ status: 204, description: 'DocumentReference deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - JWT token required' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient scopes (document:write required)',
  })
  @ApiResponse({ status: 404, description: 'DocumentReference not found' })
  deleteDocumentReference(@Param('id') id: string, @CurrentUser() user?: User): Promise<void> {
    return this.documentsService.remove(id, user);
  }
}
