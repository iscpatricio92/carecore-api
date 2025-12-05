import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
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

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateStateToken', () => {
    it('should generate a base64url encoded token', () => {
      const token = service.generateStateToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(0);
      // Base64url doesn't contain +, /, or = characters
      expect(token).not.toMatch(/[+/=]/);
    });

    it('should generate unique tokens', () => {
      const token1 = service.generateStateToken();
      const token2 = service.generateStateToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('getAuthorizationUrl', () => {
    const mockKeycloakUrl = 'http://localhost:8080';
    const mockKeycloakRealm = 'carecore';
    const mockClientId = 'carecore-api';
    const mockStateToken = 'state-token-123';
    const mockRedirectUri = 'http://localhost:3000/api/auth/callback';

    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          KEYCLOAK_URL: mockKeycloakUrl,
          KEYCLOAK_REALM: mockKeycloakRealm,
          KEYCLOAK_CLIENT_ID: mockClientId,
        };
        return config[key] || null;
      });
    });

    it('should generate authorization URL with correct parameters', () => {
      const authUrl = service.getAuthorizationUrl(mockStateToken, mockRedirectUri);

      expect(authUrl).toBeDefined();
      expect(authUrl).toContain(mockKeycloakUrl);
      expect(authUrl).toContain(mockKeycloakRealm);
      expect(authUrl).toContain('/protocol/openid-connect/auth');

      const url = new URL(authUrl);
      expect(url.searchParams.get('client_id')).toBe(mockClientId);
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toBe('openid profile email');
      expect(url.searchParams.get('redirect_uri')).toBe(mockRedirectUri);
      expect(url.searchParams.get('state')).toBe(mockStateToken);
    });

    it('should use default realm if not configured', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          KEYCLOAK_URL: mockKeycloakUrl,
          KEYCLOAK_CLIENT_ID: mockClientId,
        };
        return config[key] || null;
      });

      const authUrl = service.getAuthorizationUrl(mockStateToken, mockRedirectUri);

      expect(authUrl).toContain('/realms/carecore/');
    });

    it('should throw BadRequestException if KEYCLOAK_URL is not configured', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          KEYCLOAK_CLIENT_ID: mockClientId,
        };
        return config[key] || null;
      });

      expect(() => {
        service.getAuthorizationUrl(mockStateToken, mockRedirectUri);
      }).toThrow(BadRequestException);

      expect(mockLogger.error).toHaveBeenCalledWith('KEYCLOAK_URL is not configured');
    });

    it('should throw BadRequestException if KEYCLOAK_CLIENT_ID is not configured', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          KEYCLOAK_URL: mockKeycloakUrl,
        };
        return config[key] || null;
      });

      expect(() => {
        service.getAuthorizationUrl(mockStateToken, mockRedirectUri);
      }).toThrow(BadRequestException);

      expect(mockLogger.error).toHaveBeenCalledWith('KEYCLOAK_CLIENT_ID is not configured');
    });

    it('should throw BadRequestException if state token is empty', () => {
      expect(() => {
        service.getAuthorizationUrl('', mockRedirectUri);
      }).toThrow(BadRequestException);

      expect(mockLogger.error).toHaveBeenCalledWith('State token is required');
    });

    it('should throw BadRequestException if redirect URI is empty', () => {
      expect(() => {
        service.getAuthorizationUrl(mockStateToken, '');
      }).toThrow(BadRequestException);

      expect(mockLogger.error).toHaveBeenCalledWith('Redirect URI is required');
    });
  });
});
