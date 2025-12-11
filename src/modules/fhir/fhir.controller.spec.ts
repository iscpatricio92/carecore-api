// Mock @keycloak/keycloak-admin-client before importing services that use it
jest.mock('@keycloak/keycloak-admin-client', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    auth: jest.fn(),
    users: {
      findOne: jest.fn(),
      listRealmRoleMappings: jest.fn(),
      addRealmRoleMappings: jest.fn(),
      delRealmRoleMappings: jest.fn(),
      getCredentials: jest.fn(),
      deleteCredential: jest.fn(),
    },
    roles: {
      find: jest.fn(),
    },
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { FhirController } from './fhir.controller';
import { FhirService } from './fhir.service';
import { SmartFhirService } from './services/smart-fhir.service';
import { CreatePatientDto, UpdatePatientDto } from '../../common/dto/fhir-patient.dto';
import {
  CreatePractitionerDto,
  UpdatePractitionerDto,
} from '../../common/dto/fhir-practitioner.dto';
import { CreateEncounterDto, UpdateEncounterDto } from '../../common/dto/fhir-encounter.dto';
import { SmartFhirAuthDto } from '../../common/dto/smart-fhir-auth.dto';
import { SmartFhirTokenDto } from '../../common/dto/smart-fhir-token.dto';
import { SmartFhirLaunchDto } from '../../common/dto/smart-fhir-launch.dto';
import { User } from '../auth/interfaces/user.interface';
import { FHIR_RESOURCE_TYPES } from '../../common/constants/fhir-resource-types';
import { MFARequiredGuard } from '../auth/guards/mfa-required.guard';
import { KeycloakAdminService } from '../auth/services/keycloak-admin.service';

describe('FhirController', () => {
  let controller: FhirController;
  let service: FhirService;

  const mockUser: User = {
    id: 'user-123',
    keycloakUserId: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    roles: ['patient'],
  };

  const mockFhirService = {
    getCapabilityStatement: jest.fn(),
    createPatient: jest.fn(),
    getPatient: jest.fn(),
    searchPatients: jest.fn(),
    updatePatient: jest.fn(),
    deletePatient: jest.fn(),
    createPractitioner: jest.fn(),
    getPractitioner: jest.fn(),
    searchPractitioners: jest.fn(),
    updatePractitioner: jest.fn(),
    deletePractitioner: jest.fn(),
    createEncounter: jest.fn(),
    getEncounter: jest.fn(),
    searchEncounters: jest.fn(),
    updateEncounter: jest.fn(),
    deleteEncounter: jest.fn(),
  };

  const mockSmartFhirService = {
    validateAuthParams: jest.fn(),
    generateStateToken: jest.fn(),
    buildAuthorizationUrl: jest.fn(),
    getCallbackUrl: jest.fn(),
    validateTokenParams: jest.fn(),
    exchangeCodeForTokens: jest.fn(),
    decodeStateToken: jest.fn(),
    validateLaunchParams: jest.fn(),
    validateAndDecodeLaunchToken: jest.fn(),
    storeLaunchContext: jest.fn(),
    getLaunchContext: jest.fn(),
    removeLaunchContext: jest.fn(),
  };

  const mockKeycloakAdminService = {
    userHasMFA: jest.fn(),
    findUserById: jest.fn(),
    getUserRoles: jest.fn(),
    addRoleToUser: jest.fn(),
    removeRoleFromUser: jest.fn(),
    updateUserRoles: jest.fn(),
    userHasRole: jest.fn(),
    generateTOTPSecret: jest.fn(),
    verifyTOTPCode: jest.fn(),
    verifyAndEnableTOTP: jest.fn(),
    removeTOTPCredential: jest.fn(),
  };

  const mockMFARequiredGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockLogger = {
    setContext: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FhirController],
      providers: [
        {
          provide: FhirService,
          useValue: mockFhirService,
        },
        {
          provide: SmartFhirService,
          useValue: mockSmartFhirService,
        },
        {
          provide: KeycloakAdminService,
          useValue: mockKeycloakAdminService,
        },
        {
          provide: MFARequiredGuard,
          useValue: mockMFARequiredGuard,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    })
      .overrideGuard(MFARequiredGuard)
      .useValue(mockMFARequiredGuard)
      .compile();

    controller = module.get<FhirController>(FhirController);
    service = module.get<FhirService>(FhirService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetadata', () => {
    it('should return CapabilityStatement', () => {
      const expectedResult = {
        resourceType: 'CapabilityStatement',
        status: 'active',
      };

      mockFhirService.getCapabilityStatement.mockReturnValue(expectedResult);

      const result = controller.getMetadata();

      expect(result).toEqual(expectedResult);
      expect(service.getCapabilityStatement).toHaveBeenCalled();
    });
  });

  describe('createPatient', () => {
    it('should create a new patient', async () => {
      const createDto: CreatePatientDto = {
        name: [{ given: ['John'], family: 'Doe' }],
      };

      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        id: 'test-id',
        ...createDto,
      };

      mockFhirService.createPatient.mockResolvedValue(expectedResult);

      const result = await controller.createPatient(createDto, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.createPatient).toHaveBeenCalledWith(createDto, mockUser);
    });
  });

  describe('getPatient', () => {
    it('should return a patient by id', async () => {
      const patientId = 'test-id';
      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        id: patientId,
        name: [{ given: ['John'], family: 'Doe' }],
      };

      mockFhirService.getPatient.mockResolvedValue(expectedResult);

      const result = await controller.getPatient(patientId, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getPatient).toHaveBeenCalledWith(patientId, mockUser);
    });
  });

  describe('searchPatients', () => {
    it('should search patients with pagination', async () => {
      const pagination = { page: 1, limit: 10 };
      const expectedResult = {
        total: 0,
        entries: [],
      };

      mockFhirService.searchPatients.mockResolvedValue(expectedResult);

      const result = await controller.searchPatients(pagination, undefined, undefined, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.searchPatients).toHaveBeenCalledWith(pagination, mockUser);
    });

    it('should search patients with filters', async () => {
      const pagination = { page: 1, limit: 10 };
      const name = 'John';
      const identifier = '123';

      const expectedResult = {
        total: 1,
        entries: [
          {
            resourceType: FHIR_RESOURCE_TYPES.PATIENT,
            id: 'test-id',
            name: [{ given: ['John'], family: 'Doe' }],
          },
        ],
      };

      mockFhirService.searchPatients.mockResolvedValue(expectedResult);

      const result = await controller.searchPatients(pagination, name, identifier, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.searchPatients).toHaveBeenCalledWith(
        {
          ...pagination,
          name,
          identifier,
        },
        mockUser,
      );
    });
  });

  describe('updatePatient', () => {
    it('should update a patient', async () => {
      const patientId = 'test-id';
      const updateDto: UpdatePatientDto = {
        name: [{ given: ['Jane'], family: 'Doe' }],
        gender: 'female',
      };

      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        id: patientId,
        gender: 'female',
      };

      mockFhirService.updatePatient.mockResolvedValue(expectedResult);

      const result = await controller.updatePatient(patientId, updateDto, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.updatePatient).toHaveBeenCalledWith(patientId, updateDto, mockUser);
    });
  });

  describe('deletePatient', () => {
    it('should delete a patient', async () => {
      const patientId = 'test-id';

      mockFhirService.deletePatient.mockResolvedValue(undefined);

      await controller.deletePatient(patientId, mockUser);

      expect(service.deletePatient).toHaveBeenCalledWith(patientId, mockUser);
    });
  });

  // ========== Practitioner Tests ==========

  describe('createPractitioner', () => {
    it('should create a new practitioner', async () => {
      const createDto: CreatePractitionerDto = {
        identifier: [{ system: 'http://example.com/license', value: 'MD-123' }],
        name: [{ given: ['Dr. Jane'], family: 'Smith' }],
      };

      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        id: 'test-id',
        ...createDto,
      };

      mockFhirService.createPractitioner.mockResolvedValue(expectedResult);

      const result = await controller.createPractitioner(createDto);

      expect(result).toEqual(expectedResult);
      expect(service.createPractitioner).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getPractitioner', () => {
    it('should return a practitioner by id', async () => {
      const practitionerId = 'test-id';
      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        id: practitionerId,
        name: [{ given: ['Dr. Jane'], family: 'Smith' }],
      };

      mockFhirService.getPractitioner.mockResolvedValue(expectedResult);

      const result = await controller.getPractitioner(practitionerId);

      expect(result).toEqual(expectedResult);
      expect(service.getPractitioner).toHaveBeenCalledWith(practitionerId);
    });
  });

  describe('searchPractitioners', () => {
    it('should search practitioners with pagination and filters', async () => {
      const pagination = { page: 1, limit: 10 };
      const name = 'Jane';
      const identifier = 'MD-123';

      const expectedResult = {
        total: 1,
        entries: [
          {
            resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
            id: 'test-id',
            name: [{ given: ['Dr. Jane'], family: 'Smith' }],
          },
        ],
      };

      mockFhirService.searchPractitioners.mockResolvedValue(expectedResult);

      const result = await controller.searchPractitioners(pagination, name, identifier);

      expect(result).toEqual(expectedResult);
      expect(service.searchPractitioners).toHaveBeenCalledWith({
        ...pagination,
        name,
        identifier,
      });
    });
  });

  describe('updatePractitioner', () => {
    it('should update a practitioner', async () => {
      const practitionerId = 'test-id';
      const updateDto: UpdatePractitionerDto = {
        identifier: [{ system: 'http://example.com/license', value: 'MD-123' }],
        name: [{ given: ['Dr. Jane'], family: 'Smith' }],
        active: false,
      };

      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        id: practitionerId,
        active: false,
      };

      mockFhirService.updatePractitioner.mockResolvedValue(expectedResult);

      const result = await controller.updatePractitioner(practitionerId, updateDto);

      expect(result).toEqual(expectedResult);
      expect(service.updatePractitioner).toHaveBeenCalledWith(practitionerId, updateDto);
    });
  });

  describe('deletePractitioner', () => {
    it('should delete a practitioner', async () => {
      const practitionerId = 'test-id';

      mockFhirService.deletePractitioner.mockResolvedValue(undefined);

      await controller.deletePractitioner(practitionerId);

      expect(service.deletePractitioner).toHaveBeenCalledWith(practitionerId);
    });
  });

  // ========== Encounter Tests ==========

  describe('createEncounter', () => {
    it('should create a new encounter', async () => {
      const createDto: CreateEncounterDto = {
        status: 'finished',
        class: { code: 'AMB', display: 'ambulatory' },
        subject: { reference: 'Patient/123' },
        period: { start: '2024-01-15T10:00:00Z' },
      };

      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        id: 'test-id',
        ...createDto,
      };

      mockFhirService.createEncounter.mockResolvedValue(expectedResult);

      const result = await controller.createEncounter(createDto);

      expect(result).toEqual(expectedResult);
      expect(service.createEncounter).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getEncounter', () => {
    it('should return an encounter by id', async () => {
      const encounterId = 'test-id';
      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        id: encounterId,
        status: 'finished',
      };

      mockFhirService.getEncounter.mockResolvedValue(expectedResult);

      const result = await controller.getEncounter(encounterId, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getEncounter).toHaveBeenCalledWith(encounterId, mockUser);
    });
  });

  describe('searchEncounters', () => {
    it('should search encounters with pagination and filters', async () => {
      const pagination = { page: 1, limit: 10 };
      const subject = 'Patient/123';
      const status = 'finished';
      const date = '2024-01-15';

      const expectedResult = {
        total: 1,
        entries: [
          {
            resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
            id: 'test-id',
            status: 'finished',
            subject: { reference: 'Patient/123' },
          },
        ],
      };

      mockFhirService.searchEncounters.mockResolvedValue(expectedResult);

      const result = await controller.searchEncounters(pagination, subject, status, date, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.searchEncounters).toHaveBeenCalledWith(
        {
          ...pagination,
          subject,
          status,
          date,
        },
        mockUser,
      );
    });
  });

  describe('updateEncounter', () => {
    it('should update an encounter', async () => {
      const encounterId = 'test-id';
      const updateDto: UpdateEncounterDto = {
        status: 'finished',
        class: { code: 'AMB', display: 'ambulatory' },
        subject: { reference: 'Patient/123' },
        period: { start: '2024-01-15T10:00:00Z', end: '2024-01-15T10:30:00Z' },
      };

      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        id: encounterId,
        status: 'finished',
      };

      mockFhirService.updateEncounter.mockResolvedValue(expectedResult);

      const result = await controller.updateEncounter(encounterId, updateDto);

      expect(result).toEqual(expectedResult);
      expect(service.updateEncounter).toHaveBeenCalledWith(encounterId, updateDto);
    });
  });

  describe('deleteEncounter', () => {
    it('should delete an encounter', async () => {
      const encounterId = 'test-id';

      mockFhirService.deleteEncounter.mockResolvedValue(undefined);

      await controller.deleteEncounter(encounterId);

      expect(service.deleteEncounter).toHaveBeenCalledWith(encounterId);
    });
  });

  describe('authorize', () => {
    const mockAuthParams: SmartFhirAuthDto = {
      client_id: 'app-123',
      response_type: 'code',
      redirect_uri: 'https://app.com/callback',
      scope: 'patient:read patient:write',
      state: 'abc123',
    };

    const mockRequest = {
      protocol: 'https',
      get: jest.fn((header: string) => {
        if (header === 'host') return 'api.example.com';
        return undefined;
      }),
    };

    let mockResponse: {
      redirect: jest.Mock;
      status: jest.Mock;
      json: jest.Mock;
    };

    beforeEach(() => {
      mockResponse = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
    });

    it('should redirect to Keycloak authorization URL on valid request', async () => {
      const callbackUrl = 'https://api.example.com/api/fhir/token';
      const authUrl = 'https://keycloak.example.com/auth?client_id=app-123';

      mockSmartFhirService.validateAuthParams.mockResolvedValue(undefined);
      mockSmartFhirService.getCallbackUrl.mockReturnValue(callbackUrl);
      mockSmartFhirService.generateStateToken.mockReturnValue('state123');
      mockSmartFhirService.buildAuthorizationUrl.mockReturnValue(authUrl);

      await controller.authorize(
        mockAuthParams,
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      expect(mockSmartFhirService.validateAuthParams).toHaveBeenCalledWith(mockAuthParams);
      expect(mockSmartFhirService.getCallbackUrl).toHaveBeenCalledWith(mockRequest);
      expect(mockSmartFhirService.buildAuthorizationUrl).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith(authUrl);
    });

    it('should generate state token if not provided', async () => {
      const paramsWithoutState = { ...mockAuthParams, state: undefined };
      const callbackUrl = 'https://api.example.com/api/fhir/token';
      const authUrl = 'https://keycloak.example.com/auth';

      mockSmartFhirService.validateAuthParams.mockResolvedValue(undefined);
      mockSmartFhirService.getCallbackUrl.mockReturnValue(callbackUrl);
      mockSmartFhirService.generateStateToken.mockReturnValue('generated-state');
      mockSmartFhirService.buildAuthorizationUrl.mockReturnValue(authUrl);

      await controller.authorize(
        paramsWithoutState,
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      expect(mockSmartFhirService.generateStateToken).toHaveBeenCalled();
    });

    it('should return BadRequestException with OperationOutcome on validation error', async () => {
      const error = new BadRequestException({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'invalid', details: { text: 'Invalid parameters' } }],
      });

      mockSmartFhirService.validateAuthParams.mockRejectedValue(error);

      await controller.authorize(
        mockAuthParams,
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(error.getResponse());
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it('should return UnauthorizedException with OperationOutcome on client not found', async () => {
      const error = new UnauthorizedException({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'security', details: { text: 'Client not found' } }],
      });

      mockSmartFhirService.validateAuthParams.mockRejectedValue(error);

      await controller.authorize(
        mockAuthParams,
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(error.getResponse());
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it('should return 500 with OperationOutcome on unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockSmartFhirService.validateAuthParams.mockRejectedValue(unexpectedError);

      await controller.authorize(
        mockAuthParams,
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalled();
      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall.resourceType).toBe('OperationOutcome');
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });
  });

  describe('token', () => {
    const mockTokenParams: SmartFhirTokenDto = {
      grant_type: 'authorization_code',
      code: 'auth-code-123',
      redirect_uri: 'https://app.com/callback',
      client_id: 'app-123',
      client_secret: 'secret-123',
    };

    const mockTokenResponse = {
      access_token: 'access-token-123',
      token_type: 'Bearer',
      expires_in: 3600,
      refresh_token: 'refresh-token-123',
      scope: 'patient:read patient:write',
      patient: '123',
    };

    const mockRequest = {
      protocol: 'https',
      get: jest.fn((header: string) => {
        if (header === 'host') return 'api.example.com';
        return undefined;
      }),
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should exchange authorization code for tokens successfully', async () => {
      mockSmartFhirService.validateTokenParams.mockResolvedValue(undefined);
      mockSmartFhirService.exchangeCodeForTokens.mockResolvedValue(mockTokenResponse);
      mockSmartFhirService.getCallbackUrl.mockReturnValue('https://api.example.com/api/fhir/token');

      const result = await controller.token(
        mockTokenParams,
        undefined,
        undefined,
        mockRequest as unknown as Request,
      );

      expect(mockSmartFhirService.validateTokenParams).toHaveBeenCalledWith(mockTokenParams);
      expect(mockSmartFhirService.exchangeCodeForTokens).toHaveBeenCalledWith(
        mockTokenParams,
        'https://api.example.com/api/fhir/token',
      );
      expect(result).toEqual(mockTokenResponse);
    });

    it('should handle code and state from query parameters (Keycloak callback)', async () => {
      const codeFromQuery = 'code-from-query';
      const stateFromQuery = Buffer.from(
        JSON.stringify({ state: 'abc123', clientRedirectUri: 'https://app.com/callback' }),
      ).toString('base64url');

      const decodedState = { state: 'abc123', clientRedirectUri: 'https://app.com/callback' };
      mockSmartFhirService.decodeStateToken.mockReturnValue(decodedState);
      mockSmartFhirService.validateTokenParams.mockResolvedValue(undefined);
      mockSmartFhirService.exchangeCodeForTokens.mockResolvedValue(mockTokenResponse);
      mockSmartFhirService.getCallbackUrl.mockReturnValue('https://api.example.com/api/fhir/token');

      const paramsWithoutCode = { ...mockTokenParams, code: undefined, redirect_uri: undefined };
      const result = await controller.token(
        paramsWithoutCode,
        codeFromQuery,
        stateFromQuery,
        mockRequest as unknown as Request,
      );

      expect(mockSmartFhirService.decodeStateToken).toHaveBeenCalledWith(stateFromQuery);
      expect(mockSmartFhirService.validateTokenParams).toHaveBeenCalledWith(
        expect.objectContaining({
          code: codeFromQuery,
          redirect_uri: 'https://app.com/callback',
        }),
      );
      expect(result).toEqual(mockTokenResponse);
    });

    it('should retrieve and remove launch context when launchToken is present in state', async () => {
      const codeFromQuery = 'code-from-query';
      const launchToken = 'launch-token-xyz';
      const stateFromQuery = Buffer.from(
        JSON.stringify({
          state: 'abc123',
          clientRedirectUri: 'https://app.com/callback',
          launchToken: launchToken,
        }),
      ).toString('base64url');

      const decodedState = {
        state: 'abc123',
        clientRedirectUri: 'https://app.com/callback',
        launchToken: launchToken,
      };

      const mockLaunchContext = {
        patient: 'Patient/999',
        encounter: 'Encounter/888',
        timestamp: Date.now(),
      };

      mockSmartFhirService.decodeStateToken.mockReturnValue(decodedState);
      mockSmartFhirService.getLaunchContext.mockReturnValue(mockLaunchContext);
      mockSmartFhirService.validateTokenParams.mockResolvedValue(undefined);
      mockSmartFhirService.exchangeCodeForTokens.mockResolvedValue(mockTokenResponse);
      mockSmartFhirService.getCallbackUrl.mockReturnValue('https://api.example.com/api/fhir/token');

      const paramsWithoutCode = { ...mockTokenParams, code: undefined, redirect_uri: undefined };
      await controller.token(
        paramsWithoutCode,
        codeFromQuery,
        stateFromQuery,
        mockRequest as unknown as Request,
      );

      // Verify launch context was retrieved
      expect(mockSmartFhirService.getLaunchContext).toHaveBeenCalledWith(launchToken);
      // Verify launch context was removed after use (one-time use)
      expect(mockSmartFhirService.removeLaunchContext).toHaveBeenCalledWith(launchToken);
    });

    it('should not remove launch context when getLaunchContext returns null', async () => {
      const codeFromQuery = 'code-from-query';
      const launchToken = 'launch-token-xyz';
      const stateFromQuery = Buffer.from(
        JSON.stringify({
          state: 'abc123',
          clientRedirectUri: 'https://app.com/callback',
          launchToken: launchToken,
        }),
      ).toString('base64url');

      const decodedState = {
        state: 'abc123',
        clientRedirectUri: 'https://app.com/callback',
        launchToken: launchToken,
      };

      // getLaunchContext returns null (context expired or not found)
      mockSmartFhirService.decodeStateToken.mockReturnValue(decodedState);
      mockSmartFhirService.getLaunchContext.mockReturnValue(null);
      mockSmartFhirService.validateTokenParams.mockResolvedValue(undefined);
      mockSmartFhirService.exchangeCodeForTokens.mockResolvedValue(mockTokenResponse);
      mockSmartFhirService.getCallbackUrl.mockReturnValue('https://api.example.com/api/fhir/token');

      const paramsWithoutCode = { ...mockTokenParams, code: undefined, redirect_uri: undefined };
      await controller.token(
        paramsWithoutCode,
        codeFromQuery,
        stateFromQuery,
        mockRequest as unknown as Request,
      );

      // Verify launch context was retrieved
      expect(mockSmartFhirService.getLaunchContext).toHaveBeenCalledWith(launchToken);
      // Verify launch context was NOT removed since it was null
      expect(mockSmartFhirService.removeLaunchContext).not.toHaveBeenCalled();
    });

    it('should include patient from launch context in token response', async () => {
      const codeFromQuery = 'code-from-query';
      const launchToken = 'launch-token-xyz';
      const stateFromQuery = Buffer.from(
        JSON.stringify({
          state: 'abc123',
          clientRedirectUri: 'https://app.com/callback',
          launchToken: launchToken,
        }),
      ).toString('base64url');

      const decodedState = {
        state: 'abc123',
        clientRedirectUri: 'https://app.com/callback',
        launchToken: launchToken,
      };

      const mockLaunchContext = {
        patient: 'Patient/999',
        encounter: 'Encounter/888',
        timestamp: Date.now(),
      };

      // Token response without patient (from scopes)
      const tokenResponseWithoutPatient = {
        access_token: 'access-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh-token-123',
        scope: 'patient:read patient:write',
      };

      mockSmartFhirService.decodeStateToken.mockReturnValue(decodedState);
      mockSmartFhirService.getLaunchContext.mockReturnValue(mockLaunchContext);
      mockSmartFhirService.validateTokenParams.mockResolvedValue(undefined);
      mockSmartFhirService.exchangeCodeForTokens.mockResolvedValue(tokenResponseWithoutPatient);
      mockSmartFhirService.getCallbackUrl.mockReturnValue('https://api.example.com/api/fhir/token');

      const paramsWithoutCode = { ...mockTokenParams, code: undefined, redirect_uri: undefined };
      const result = await controller.token(
        paramsWithoutCode,
        codeFromQuery,
        stateFromQuery,
        mockRequest as unknown as Request,
      );

      // Verify patient from launch context is included in response
      expect(result.patient).toBe('Patient/999');
      expect(result).toEqual({
        ...tokenResponseWithoutPatient,
        patient: 'Patient/999',
      });
    });

    it('should not include patient if launch context has no patient', async () => {
      const codeFromQuery = 'code-from-query';
      const launchToken = 'launch-token-xyz';
      const stateFromQuery = Buffer.from(
        JSON.stringify({
          state: 'abc123',
          clientRedirectUri: 'https://app.com/callback',
          launchToken: launchToken,
        }),
      ).toString('base64url');

      const decodedState = {
        state: 'abc123',
        clientRedirectUri: 'https://app.com/callback',
        launchToken: launchToken,
      };

      // Launch context without patient
      const mockLaunchContext = {
        encounter: 'Encounter/888',
        timestamp: Date.now(),
      };

      const tokenResponseWithoutPatient = {
        access_token: 'access-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh-token-123',
        scope: 'patient:read patient:write',
        patient: '123', // Patient from scopes
      };

      mockSmartFhirService.decodeStateToken.mockReturnValue(decodedState);
      mockSmartFhirService.getLaunchContext.mockReturnValue(mockLaunchContext);
      mockSmartFhirService.validateTokenParams.mockResolvedValue(undefined);
      mockSmartFhirService.exchangeCodeForTokens.mockResolvedValue(tokenResponseWithoutPatient);
      mockSmartFhirService.getCallbackUrl.mockReturnValue('https://api.example.com/api/fhir/token');

      const paramsWithoutCode = { ...mockTokenParams, code: undefined, redirect_uri: undefined };
      const result = await controller.token(
        paramsWithoutCode,
        codeFromQuery,
        stateFromQuery,
        mockRequest as unknown as Request,
      );

      // Verify patient from token response (scopes) is preserved since launch context has no patient
      expect(result.patient).toBe('123');
    });

    it('should handle refresh_token grant type', async () => {
      const refreshParams: SmartFhirTokenDto = {
        grant_type: 'refresh_token',
        refresh_token: 'refresh-token-123',
        client_id: 'app-123',
        client_secret: 'secret-123',
      };

      mockSmartFhirService.validateTokenParams.mockResolvedValue(undefined);
      mockSmartFhirService.exchangeCodeForTokens.mockResolvedValue(mockTokenResponse);
      mockSmartFhirService.getCallbackUrl.mockReturnValue('https://api.example.com/api/fhir/token');

      const result = await controller.token(
        refreshParams,
        undefined,
        undefined,
        mockRequest as unknown as Request,
      );

      expect(mockSmartFhirService.validateTokenParams).toHaveBeenCalledWith(refreshParams);
      expect(result).toEqual(mockTokenResponse);
    });

    it('should return BadRequestException with OAuth2 error format on validation error', async () => {
      const error = new BadRequestException({
        error: 'invalid_request',
        error_description: 'Missing required parameter: code',
      });

      mockSmartFhirService.validateTokenParams.mockRejectedValue(error);

      await expect(
        controller.token(mockTokenParams, undefined, undefined, mockRequest as unknown as Request),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return UnauthorizedException with OAuth2 error format on client error', async () => {
      const error = new UnauthorizedException({
        error: 'invalid_client',
        error_description: 'Client not found',
      });

      mockSmartFhirService.validateTokenParams.mockRejectedValue(error);

      await expect(
        controller.token(mockTokenParams, undefined, undefined, mockRequest as unknown as Request),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should convert non-OAuth2 errors to OAuth2 format', async () => {
      // Create a BadRequestException with a plain string message (non-OAuth2 format)
      // When BadRequestException is created with a string, getResponse() returns { message, statusCode }
      // The controller should convert this to OAuth2 format
      const error = new BadRequestException('Plain error message');
      mockSmartFhirService.validateTokenParams.mockRejectedValue(error);

      try {
        await controller.token(
          mockTokenParams,
          undefined,
          undefined,
          mockRequest as unknown as Request,
        );
        fail('Should have thrown BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        const errorResponse = (e as BadRequestException).getResponse();
        // The controller should convert non-OAuth2 errors to OAuth2 format
        // The converted error should have 'error' and 'error_description' properties
        expect(errorResponse).toHaveProperty('error');
        expect(errorResponse).toHaveProperty('error_description');
        const oauthError = errorResponse as { error: string; error_description: string };
        expect(oauthError.error).toBe('invalid_request');
        expect(oauthError.error_description).toBe('Plain error message');
      }
    });

    it('should handle unexpected errors and return OAuth2 server_error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockSmartFhirService.validateTokenParams.mockRejectedValue(unexpectedError);

      await expect(
        controller.token(mockTokenParams, undefined, undefined, mockRequest as unknown as Request),
      ).rejects.toThrow(BadRequestException);

      try {
        await controller.token(
          mockTokenParams,
          undefined,
          undefined,
          mockRequest as unknown as Request,
        );
      } catch (e) {
        const errorResponse = (e as BadRequestException).getResponse();
        expect(errorResponse).toHaveProperty('error', 'server_error');
        expect(errorResponse).toHaveProperty('error_description');
      }
    });

    it('should use default callback URL when request is not provided', async () => {
      mockSmartFhirService.validateTokenParams.mockResolvedValue(undefined);
      mockSmartFhirService.exchangeCodeForTokens.mockResolvedValue(mockTokenResponse);
      mockSmartFhirService.getCallbackUrl.mockReturnValue('http://localhost:3000/api/fhir/token');

      const result = await controller.token(mockTokenParams, undefined, undefined, undefined);

      expect(mockSmartFhirService.exchangeCodeForTokens).toHaveBeenCalledWith(
        mockTokenParams,
        'http://localhost:3000/api/fhir/token',
      );
      expect(result).toEqual(mockTokenResponse);
    });
  });

  describe('launch', () => {
    const mockLaunchParams: SmartFhirLaunchDto = {
      iss: 'https://carecore.example.com',
      launch: 'xyz123',
      client_id: 'app-123',
      redirect_uri: 'https://app.com/callback',
      scope: 'patient:read patient:write',
      state: 'abc123',
    };

    const mockLaunchContext = {
      patient: 'Patient/123',
      encounter: 'Encounter/456',
      timestamp: Date.now(),
    };

    const mockRequest = {
      protocol: 'https',
      get: jest.fn((header: string) => {
        if (header === 'host') return 'api.example.com';
        return undefined;
      }),
    };

    let mockResponse: {
      redirect: jest.Mock;
      status: jest.Mock;
      json: jest.Mock;
    };

    beforeEach(() => {
      mockResponse = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      jest.clearAllMocks();
      mockSmartFhirService.getCallbackUrl.mockReturnValue('https://api.example.com/api/fhir/token');
      mockSmartFhirService.generateStateToken.mockReturnValue('generated-state-token');
      mockSmartFhirService.buildAuthorizationUrl.mockReturnValue(
        'https://keycloak.example.com/auth?client_id=app-123',
      );
    });

    it('should redirect to authorization endpoint with launch context', async () => {
      mockSmartFhirService.validateLaunchParams.mockResolvedValue(undefined);
      mockSmartFhirService.validateAndDecodeLaunchToken.mockResolvedValue(mockLaunchContext);
      mockSmartFhirService.storeLaunchContext.mockImplementation(() => {});

      await controller.launch(
        mockLaunchParams,
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      expect(mockSmartFhirService.validateLaunchParams).toHaveBeenCalledWith(mockLaunchParams);
      expect(mockSmartFhirService.validateAndDecodeLaunchToken).toHaveBeenCalledWith('xyz123');
      expect(mockSmartFhirService.storeLaunchContext).toHaveBeenCalledWith(
        'xyz123',
        mockLaunchContext,
      );
      expect(mockSmartFhirService.buildAuthorizationUrl).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith(
        'https://keycloak.example.com/auth?client_id=app-123',
      );
    });

    it('should include launch token in state parameter', async () => {
      mockSmartFhirService.validateLaunchParams.mockResolvedValue(undefined);
      mockSmartFhirService.validateAndDecodeLaunchToken.mockResolvedValue(mockLaunchContext);
      mockSmartFhirService.storeLaunchContext.mockImplementation(() => {});

      await controller.launch(
        mockLaunchParams,
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      // Verify that buildAuthorizationUrl was called with state containing launch token
      expect(mockSmartFhirService.buildAuthorizationUrl).toHaveBeenCalled();
      const callArgs = mockSmartFhirService.buildAuthorizationUrl.mock.calls[0];
      const stateParam = callArgs[1]; // Second argument is the state token

      // Decode state to verify it contains launch token
      const decodedState = JSON.parse(Buffer.from(stateParam, 'base64url').toString('utf-8'));
      expect(decodedState.launchToken).toBe('xyz123');
      expect(decodedState.clientRedirectUri).toBe('https://app.com/callback');
    });

    it('should return BadRequestException with OperationOutcome on validation error', async () => {
      const error = new BadRequestException({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'invalid', diagnostics: 'Invalid launch token' }],
      });
      mockSmartFhirService.validateLaunchParams.mockRejectedValue(error);

      await controller.launch(
        mockLaunchParams,
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(error.getResponse());
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it('should return UnauthorizedException with OperationOutcome on client error', async () => {
      const error = new UnauthorizedException({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'invalid', diagnostics: 'Client not found' }],
      });
      mockSmartFhirService.validateLaunchParams.mockRejectedValue(error);

      await controller.launch(
        mockLaunchParams,
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith(error.getResponse());
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it('should return generic OperationOutcome on unexpected error', async () => {
      const unexpectedError = new Error('Unexpected error');
      mockSmartFhirService.validateLaunchParams.mockRejectedValue(unexpectedError);

      await controller.launch(
        mockLaunchParams,
        mockRequest as unknown as Request,
        mockResponse as unknown as Response,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalled();
      const jsonCall = mockResponse.json.mock.calls[0][0];
      expect(jsonCall).toHaveProperty('resourceType', 'OperationOutcome');
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });
  });
});
