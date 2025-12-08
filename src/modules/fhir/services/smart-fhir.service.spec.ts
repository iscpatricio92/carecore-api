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
});
