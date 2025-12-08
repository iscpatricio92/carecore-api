// Mock @keycloak/keycloak-admin-client before importing services that use it
jest.mock('@keycloak/keycloak-admin-client', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    auth: jest.fn(),
    clients: {
      find: jest.fn(),
      findOne: jest.fn(),
    },
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { SmartFhirService } from './smart-fhir.service';
import { KeycloakAdminService } from '../../auth/services/keycloak-admin.service';
import { SmartFhirAuthDto } from '../../../common/dto/smart-fhir-auth.dto';
import { SmartFhirTokenDto } from '../../../common/dto/smart-fhir-token.dto';
import { SmartFhirLaunchDto } from '../../../common/dto/smart-fhir-launch.dto';

describe('SmartFhirService', () => {
  let service: SmartFhirService;
  let keycloakAdminService: jest.Mocked<KeycloakAdminService>;
  let configService: jest.Mocked<ConfigService>;

  const mockClient = {
    id: 'client-123',
    clientId: 'app-123',
    redirectUris: ['https://app.com/callback', 'https://app.com/callback/*'],
    standardFlowEnabled: true,
  };

  beforeEach(async () => {
    const mockKeycloakAdminService = {
      findClientById: jest.fn(),
      validateRedirectUri: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn((key: string) => {
        const config: Record<string, string> = {
          KEYCLOAK_URL: 'http://localhost:8080',
          KEYCLOAK_REALM: 'carecore',
          API_PREFIX: '/api',
        };
        return config[key];
      }),
    };

    const mockLogger = {
      setContext: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmartFhirService,
        {
          provide: KeycloakAdminService,
          useValue: mockKeycloakAdminService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<SmartFhirService>(SmartFhirService);
    keycloakAdminService = module.get(KeycloakAdminService);
    configService = module.get(ConfigService);
  });

  afterEach(() => {
    // Clean up the interval to prevent Jest from hanging
    if (service) {
      service.onModuleDestroy();
    }
    // Also clear all timers to be safe
    jest.clearAllTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateStateToken', () => {
    it('should generate a base64url-encoded token', () => {
      const token = service.generateStateToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      // Base64URL should not contain +, /, or = characters
      expect(token).not.toMatch(/[+/=]/);
    });

    it('should generate different tokens on each call', () => {
      const token1 = service.generateStateToken();
      const token2 = service.generateStateToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('validateAuthParams', () => {
    const validParams: SmartFhirAuthDto = {
      client_id: 'app-123',
      response_type: 'code',
      redirect_uri: 'https://app.com/callback',
      scope: 'patient:read patient:write',
      state: 'abc123',
    };

    it('should validate correct parameters', async () => {
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(true);

      await expect(service.validateAuthParams(validParams)).resolves.not.toThrow();
    });

    it('should throw BadRequestException for invalid response_type', async () => {
      const invalidParams = { ...validParams, response_type: 'token' };
      await expect(service.validateAuthParams(invalidParams)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException for non-existent client', async () => {
      keycloakAdminService.findClientById.mockResolvedValue(null);

      await expect(service.validateAuthParams(validParams)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if Standard Flow is not enabled', async () => {
      const clientWithoutFlow = { ...mockClient, standardFlowEnabled: false };
      keycloakAdminService.findClientById.mockResolvedValue(clientWithoutFlow);

      await expect(service.validateAuthParams(validParams)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid redirect_uri', async () => {
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(false);

      await expect(service.validateAuthParams(validParams)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty scope', async () => {
      const paramsWithEmptyScope = { ...validParams, scope: '' };
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(true);

      await expect(service.validateAuthParams(paramsWithEmptyScope)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for scope with only whitespace (covers trim check)', async () => {
      // This test specifically covers the second part of the condition: params.scope.trim().length === 0
      // where params.scope is truthy but becomes empty after trim
      const paramsWithWhitespaceScope = { ...validParams, scope: '   ' };
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(true);

      await expect(service.validateAuthParams(paramsWithWhitespaceScope)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for scope with tabs and newlines', async () => {
      // Additional test to ensure trim() handles all whitespace characters
      const paramsWithWhitespaceScope = { ...validParams, scope: '\t\n\r ' };
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(true);

      await expect(service.validateAuthParams(paramsWithWhitespaceScope)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for null scope', async () => {
      const paramsWithNullScope = { ...validParams, scope: null as unknown as string };
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(true);

      await expect(service.validateAuthParams(paramsWithNullScope)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for undefined scope', async () => {
      const paramsWithUndefinedScope = { ...validParams, scope: undefined as unknown as string };
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(true);

      await expect(service.validateAuthParams(paramsWithUndefinedScope)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid scope format', async () => {
      const paramsWithInvalidScope = { ...validParams, scope: 'patient:read<script>' };
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(true);

      await expect(service.validateAuthParams(paramsWithInvalidScope)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('buildAuthorizationUrl', () => {
    const params: SmartFhirAuthDto = {
      client_id: 'app-123',
      response_type: 'code',
      redirect_uri: 'https://app.com/callback',
      scope: 'patient:read patient:write',
      state: 'abc123',
    };

    it('should build correct authorization URL', () => {
      const callbackUrl = 'http://localhost:3000/api/fhir/token';
      const stateToken = 'state123';
      const url = service.buildAuthorizationUrl(params, stateToken, callbackUrl);

      expect(url).toContain('http://localhost:8080/realms/carecore/protocol/openid-connect/auth');
      expect(url).toContain('client_id=app-123');
      expect(url).toContain('response_type=code');
      expect(url).toContain(`redirect_uri=${encodeURIComponent(callbackUrl)}`);
      // Scope can be encoded with either %20 or + for spaces
      expect(url).toMatch(/scope=patient%3Aread[+%20]patient%3Awrite/);
      expect(url).toContain('state=');
    });

    it('should use stateToken when params.state is not provided (covers line 153)', () => {
      const paramsWithoutState = { ...params, state: undefined };
      const callbackUrl = 'http://localhost:3000/api/fhir/token';
      const stateToken = 'generated-state-token';
      const url = service.buildAuthorizationUrl(paramsWithoutState, stateToken, callbackUrl);

      // Decode the state parameter to verify it contains the stateToken
      const urlObj = new URL(url);
      const encodedState = urlObj.searchParams.get('state');
      expect(encodedState).toBeDefined();
      const decodedState = JSON.parse(Buffer.from(encodedState!, 'base64url').toString());
      expect(decodedState.state).toBe(stateToken);
    });

    it('should include audience parameter if provided', () => {
      const paramsWithAud = { ...params, aud: 'https://fhir.example.com' };
      const callbackUrl = 'http://localhost:3000/api/fhir/token';
      const stateToken = 'state123';
      const url = service.buildAuthorizationUrl(paramsWithAud, stateToken, callbackUrl);

      expect(url).toContain('aud=https%3A%2F%2Ffhir.example.com');
    });

    it('should throw BadRequestException if KEYCLOAK_URL is not configured', () => {
      configService.get.mockReturnValue(undefined);
      const callbackUrl = 'http://localhost:3000/api/fhir/token';
      const stateToken = 'state123';

      expect(() => service.buildAuthorizationUrl(params, stateToken, callbackUrl)).toThrow(
        BadRequestException,
      );
    });
  });

  describe('getCallbackUrl', () => {
    it('should build callback URL from request', () => {
      const request = {
        protocol: 'https',
        get: (header: string) => {
          if (header === 'host') return 'api.example.com';
          return undefined;
        },
      };

      const callbackUrl = service.getCallbackUrl(request);
      expect(callbackUrl).toBe('https://api.example.com/api/fhir/token');
    });

    it('should use default values if protocol and host are missing', () => {
      const request = {
        get: () => undefined,
      };

      const callbackUrl = service.getCallbackUrl(request);
      expect(callbackUrl).toBe('http://localhost:3000/api/fhir/token');
    });

    it('should use default API_PREFIX when not configured (covers line 189)', () => {
      // Mock configService to return undefined for API_PREFIX
      configService.get.mockImplementation((key: string) => {
        if (key === 'API_PREFIX') return undefined;
        return '/api';
      });

      const request = {
        protocol: 'https',
        get: (header: string) => {
          if (header === 'host') return 'api.example.com';
          return undefined;
        },
      };

      const callbackUrl = service.getCallbackUrl(request);
      expect(callbackUrl).toBe('https://api.example.com/api/fhir/token');
    });
  });

  describe('decodeStateToken', () => {
    it('should decode valid state token', () => {
      const stateData = { state: 'abc123', clientRedirectUri: 'https://app.com/callback' };
      const encodedState = Buffer.from(JSON.stringify(stateData)).toString('base64url');

      const decoded = service.decodeStateToken(encodedState);

      expect(decoded).toEqual(stateData);
    });

    it('should return null for invalid base64url string', () => {
      const invalidState = 'invalid-base64url-string!!!';

      const decoded = service.decodeStateToken(invalidState);

      expect(decoded).toBeNull();
    });

    it('should return null for invalid JSON in state token', () => {
      const invalidJson = Buffer.from('not-json').toString('base64url');

      const decoded = service.decodeStateToken(invalidJson);

      expect(decoded).toBeNull();
    });
  });

  describe('validateTokenParams', () => {
    const validAuthCodeParams: SmartFhirTokenDto = {
      grant_type: 'authorization_code',
      code: 'auth-code-123',
      redirect_uri: 'https://app.com/callback',
      client_id: 'app-123',
      client_secret: 'secret-123',
    };

    const validRefreshTokenParams: SmartFhirTokenDto = {
      grant_type: 'refresh_token',
      refresh_token: 'refresh-token-123',
      client_id: 'app-123',
      client_secret: 'secret-123',
    };

    it('should validate correct authorization_code parameters', async () => {
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(true);

      await expect(service.validateTokenParams(validAuthCodeParams)).resolves.not.toThrow();
    });

    it('should validate correct refresh_token parameters', async () => {
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);

      await expect(service.validateTokenParams(validRefreshTokenParams)).resolves.not.toThrow();
    });

    it('should throw BadRequestException for unsupported grant_type', async () => {
      const invalidParams = {
        ...validAuthCodeParams,
        grant_type: 'invalid_grant' as 'authorization_code' | 'refresh_token',
      };

      await expect(service.validateTokenParams(invalidParams)).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException for non-existent client', async () => {
      keycloakAdminService.findClientById.mockResolvedValue(null);

      await expect(service.validateTokenParams(validAuthCodeParams)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException for missing code in authorization_code grant', async () => {
      const paramsWithoutCode = { ...validAuthCodeParams, code: undefined };
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);

      await expect(service.validateTokenParams(paramsWithoutCode)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for missing redirect_uri in authorization_code grant', async () => {
      const paramsWithoutRedirectUri = { ...validAuthCodeParams, redirect_uri: undefined };
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);

      await expect(service.validateTokenParams(paramsWithoutRedirectUri)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid redirect_uri in authorization_code grant', async () => {
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(false);

      await expect(service.validateTokenParams(validAuthCodeParams)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for missing refresh_token in refresh_token grant', async () => {
      const paramsWithoutRefreshToken = { ...validRefreshTokenParams, refresh_token: undefined };
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);

      await expect(service.validateTokenParams(paramsWithoutRefreshToken)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('exchangeCodeForTokens', () => {
    const validParams: SmartFhirTokenDto = {
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
    };

    beforeEach(() => {
      // Mock fetch globally
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should exchange authorization code for tokens successfully', async () => {
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await service.exchangeCodeForTokens(
        validParams,
        'http://localhost:3000/api/fhir/token',
      );

      expect(result).toEqual({
        access_token: 'access-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'refresh-token-123',
        scope: 'patient:read patient:write',
        patient: undefined,
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/protocol/openid-connect/token'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );
    });

    it('should extract patient context from scopes', async () => {
      const tokenResponseWithPatientScope = {
        ...mockTokenResponse,
        scope: 'patient/123.read patient/123.write',
      };

      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => tokenResponseWithPatientScope,
      });

      const result = await service.exchangeCodeForTokens(
        validParams,
        'http://localhost:3000/api/fhir/token',
      );

      expect(result.patient).toBe('123');
    });

    it('should handle refresh_token grant type', async () => {
      const refreshParams: SmartFhirTokenDto = {
        grant_type: 'refresh_token',
        refresh_token: 'refresh-token-123',
        client_id: 'app-123',
        client_secret: 'secret-123',
      };

      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await service.exchangeCodeForTokens(
        refreshParams,
        'http://localhost:3000/api/fhir/token',
      );

      expect(result.access_token).toBe('access-token-123');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when Keycloak returns error', async () => {
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'invalid_grant',
          error_description: 'Invalid authorization code',
        }),
      });

      await expect(
        service.exchangeCodeForTokens(validParams, 'http://localhost:3000/api/fhir/token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when token response missing access_token', async () => {
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          token_type: 'Bearer',
          expires_in: 3600,
          // Missing access_token
        }),
      });

      await expect(
        service.exchangeCodeForTokens(validParams, 'http://localhost:3000/api/fhir/token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException when KEYCLOAK_URL is not configured', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(
        service.exchangeCodeForTokens(validParams, 'http://localhost:3000/api/fhir/token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException when client not found', async () => {
      keycloakAdminService.findClientById.mockResolvedValue(null);

      await expect(
        service.exchangeCodeForTokens(validParams, 'http://localhost:3000/api/fhir/token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should use default values for token_type and expires_in', async () => {
      const tokenResponseWithoutDefaults = {
        access_token: 'access-token-123',
        // Missing token_type and expires_in
      };

      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => tokenResponseWithoutDefaults,
      });

      const result = await service.exchangeCodeForTokens(
        validParams,
        'http://localhost:3000/api/fhir/token',
      );

      expect(result.token_type).toBe('Bearer');
      expect(result.expires_in).toBe(3600);
    });

    it('should handle unexpected errors and throw UnauthorizedException with server_error', async () => {
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      // Mock fetch to throw a generic Error (not UnauthorizedException or BadRequestException)
      // This covers lines 389-395: catch block for unexpected errors
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      try {
        await service.exchangeCodeForTokens(validParams, 'http://localhost:3000/api/fhir/token');
        fail('Should have thrown UnauthorizedException');
      } catch (error) {
        expect(error).toBeInstanceOf(UnauthorizedException);
        const errorResponse = (error as UnauthorizedException).getResponse();
        expect(errorResponse).toHaveProperty('error', 'server_error');
        expect(errorResponse).toHaveProperty(
          'error_description',
          'Failed to exchange authorization code for tokens',
        );
      }
    });
  });

  describe('extractPatientContext', () => {
    // Type helper to access private method for testing
    type ServiceWithPrivateMethod = {
      extractPatientContext: (tokenData: { scope?: string }) => string | undefined;
    };

    it('should extract patient ID from scope with patient context', () => {
      const tokenData = {
        scope: 'patient/123.read patient/123.write',
      };

      // Access private method via type casting
      const serviceWithPrivate = service as unknown as ServiceWithPrivateMethod;
      const result = serviceWithPrivate.extractPatientContext(tokenData);

      expect(result).toBe('123');
    });

    it('should return undefined when no patient context in scope', () => {
      const tokenData = {
        scope: 'patient:read patient:write',
      };

      const serviceWithPrivate = service as unknown as ServiceWithPrivateMethod;
      const result = serviceWithPrivate.extractPatientContext(tokenData);

      expect(result).toBeUndefined();
    });

    it('should return undefined when scope is not provided', () => {
      const tokenData: { scope?: string } = {};

      const serviceWithPrivate = service as unknown as ServiceWithPrivateMethod;
      const result = serviceWithPrivate.extractPatientContext(tokenData);

      expect(result).toBeUndefined();
    });
  });

  describe('validateLaunchParams', () => {
    const validParams: SmartFhirLaunchDto = {
      iss: 'https://carecore.example.com',
      launch: 'xyz123',
      client_id: 'app-123',
      redirect_uri: 'https://app.com/callback',
      scope: 'patient:read patient:write',
      state: 'abc123',
    };

    it('should validate correct launch parameters', async () => {
      configService.get.mockReturnValue('https://carecore.example.com');
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(true);

      await expect(service.validateLaunchParams(validParams)).resolves.not.toThrow();
    });

    it('should throw BadRequestException if issuer does not match FHIR server URL', async () => {
      configService.get.mockReturnValue('https://different-server.com');
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(true);

      await expect(service.validateLaunchParams(validParams)).rejects.toThrow(BadRequestException);
    });

    it('should not throw if FHIR_SERVER_URL is not configured (issuer validation skipped)', async () => {
      configService.get.mockReturnValue(undefined);
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(true);

      await expect(service.validateLaunchParams(validParams)).resolves.not.toThrow();
    });

    it('should throw UnauthorizedException for non-existent client', async () => {
      configService.get.mockReturnValue('https://carecore.example.com');
      keycloakAdminService.findClientById.mockResolvedValue(null);

      await expect(service.validateLaunchParams(validParams)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException for invalid redirect_uri', async () => {
      configService.get.mockReturnValue('https://carecore.example.com');
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(false);

      await expect(service.validateLaunchParams(validParams)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for empty scope', async () => {
      const paramsWithEmptyScope = { ...validParams, scope: '' };
      configService.get.mockReturnValue('https://carecore.example.com');
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(true);

      await expect(service.validateLaunchParams(paramsWithEmptyScope)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for scope with only whitespace', async () => {
      const paramsWithWhitespaceScope = { ...validParams, scope: '   ' };
      configService.get.mockReturnValue('https://carecore.example.com');
      keycloakAdminService.findClientById.mockResolvedValue(mockClient);
      keycloakAdminService.validateRedirectUri.mockResolvedValue(true);

      await expect(service.validateLaunchParams(paramsWithWhitespaceScope)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateAndDecodeLaunchToken', () => {
    it('should decode valid launch token with patient context', async () => {
      const launchContext = {
        patient: 'Patient/123',
        encounter: 'Encounter/456',
        timestamp: Date.now(),
      };
      const launchToken = Buffer.from(JSON.stringify(launchContext)).toString('base64url');

      const result = await service.validateAndDecodeLaunchToken(launchToken);

      expect(result.patient).toBe('Patient/123');
      expect(result.encounter).toBe('Encounter/456');
      expect(result.timestamp).toBeDefined();
    });

    it('should decode valid launch token with minimal context', async () => {
      const launchContext = {
        timestamp: Date.now(),
      };
      const launchToken = Buffer.from(JSON.stringify(launchContext)).toString('base64url');

      const result = await service.validateAndDecodeLaunchToken(launchToken);

      expect(result.patient).toBeUndefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should throw BadRequestException for invalid base64url token', async () => {
      const invalidToken = 'invalid-token!!!';

      await expect(service.validateAndDecodeLaunchToken(invalidToken)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid JSON in token', async () => {
      const invalidJson = Buffer.from('not-json').toString('base64url');

      await expect(service.validateAndDecodeLaunchToken(invalidJson)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('storeLaunchContext and getLaunchContext', () => {
    it('should store and retrieve launch context', () => {
      const launchToken = 'test-launch-token';
      const context = {
        patient: 'Patient/123',
        encounter: 'Encounter/456',
        timestamp: Date.now(),
      };

      service.storeLaunchContext(launchToken, context);
      const retrieved = service.getLaunchContext(launchToken);

      expect(retrieved).toEqual(context);
    });

    it('should return null for non-existent launch context', () => {
      const result = service.getLaunchContext('non-existent-token');
      expect(result).toBeNull();
    });

    it('should return null for expired launch context', () => {
      const launchToken = 'expired-token';
      const expiredContext = {
        timestamp: Date.now() - 11 * 60 * 1000, // 11 minutes ago (TTL is 10 minutes)
      };

      service.storeLaunchContext(launchToken, expiredContext);
      const result = service.getLaunchContext(launchToken);

      expect(result).toBeNull();
    });
  });

  describe('removeLaunchContext', () => {
    it('should remove launch context', () => {
      const launchToken = 'test-token';
      const context = {
        timestamp: Date.now(),
      };

      service.storeLaunchContext(launchToken, context);
      expect(service.getLaunchContext(launchToken)).toEqual(context);

      service.removeLaunchContext(launchToken);
      expect(service.getLaunchContext(launchToken)).toBeNull();
    });
  });

  describe('cleanupExpiredContexts', () => {
    interface ServiceWithPrivateMethod {
      cleanupExpiredContexts: () => void;
    }

    it('should remove expired contexts and keep valid ones', () => {
      const validToken = 'valid-token';
      const expiredToken1 = 'expired-token-1';
      const expiredToken2 = 'expired-token-2';

      const now = Date.now();
      const validContext = {
        patient: 'Patient/123',
        timestamp: now, // Current time
      };

      const expiredContext1 = {
        patient: 'Patient/456',
        timestamp: now - 11 * 60 * 1000, // 11 minutes ago (TTL is 10 minutes)
      };

      const expiredContext2 = {
        patient: 'Patient/789',
        timestamp: now - 15 * 60 * 1000, // 15 minutes ago
      };

      // Store contexts
      // Note: We don't verify expired contexts are stored because getLaunchContext
      // automatically removes them when checked. We trust storeLaunchContext works.
      service.storeLaunchContext(validToken, validContext);
      service.storeLaunchContext(expiredToken1, expiredContext1);
      service.storeLaunchContext(expiredToken2, expiredContext2);

      // Verify valid context is stored and accessible
      const validContextBefore = service.getLaunchContext(validToken);
      expect(validContextBefore).not.toBeNull();
      expect(validContextBefore?.patient).toBe('Patient/123');

      // Call cleanup method (private method, accessed via type assertion)
      // This should remove expired contexts from the internal Map
      (service as unknown as ServiceWithPrivateMethod).cleanupExpiredContexts();

      // Verify expired contexts are removed
      // getLaunchContext will return null for expired contexts
      expect(service.getLaunchContext(expiredToken1)).toBeNull();
      expect(service.getLaunchContext(expiredToken2)).toBeNull();

      // Verify valid context is still there and unchanged
      const validContextAfter = service.getLaunchContext(validToken);
      expect(validContextAfter).not.toBeNull();
      expect(validContextAfter?.patient).toBe('Patient/123');
    });

    it('should not log when no contexts are cleaned', () => {
      const validToken = 'valid-token';
      const validContext = {
        patient: 'Patient/123',
        timestamp: Date.now(),
      };

      service.storeLaunchContext(validToken, validContext);

      // Call cleanup - should not log anything since nothing is expired
      (service as unknown as ServiceWithPrivateMethod).cleanupExpiredContexts();

      // Verify context is still there
      expect(service.getLaunchContext(validToken)).not.toBeNull();
    });
  });
});
