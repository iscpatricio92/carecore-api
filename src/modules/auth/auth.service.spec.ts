import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
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

  describe('validateStateToken', () => {
    it('should validate matching state tokens', () => {
      const stateToken = 'valid-state-token';
      service.validateStateToken(stateToken, stateToken);

      expect(mockLogger.debug).toHaveBeenCalledWith('State token validated successfully');
    });

    it('should throw UnauthorizedException when received state is missing', () => {
      expect(() => {
        service.validateStateToken('', 'stored-token');
      }).toThrow(UnauthorizedException);
      expect(mockLogger.warn).toHaveBeenCalledWith('State token missing in callback');
    });

    it('should throw UnauthorizedException when stored state is missing', () => {
      expect(() => {
        service.validateStateToken('received-token', undefined);
      }).toThrow(UnauthorizedException);
      expect(mockLogger.warn).toHaveBeenCalledWith('State token missing in callback');
    });

    it('should throw UnauthorizedException when state tokens do not match', () => {
      expect(() => {
        service.validateStateToken('received-token', 'different-token');
      }).toThrow(UnauthorizedException);
      expect(mockLogger.warn).toHaveBeenCalledWith('State token mismatch - possible CSRF attack');
    });
  });

  describe('exchangeCodeForTokens', () => {
    const mockKeycloakUrl = 'http://localhost:8080';
    const mockKeycloakRealm = 'carecore';
    const mockClientId = 'carecore-api';
    const mockClientSecret = 'secret-123';
    const mockCode = 'auth-code-123';
    const mockRedirectUri = 'http://localhost:3000/api/auth/callback';

    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          KEYCLOAK_URL: mockKeycloakUrl,
          KEYCLOAK_REALM: mockKeycloakRealm,
          KEYCLOAK_CLIENT_ID: mockClientId,
          KEYCLOAK_CLIENT_SECRET: mockClientSecret,
        };
        return config[key] || null;
      });
    });

    it('should throw BadRequestException if KEYCLOAK_URL is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          KEYCLOAK_CLIENT_ID: mockClientId,
          KEYCLOAK_CLIENT_SECRET: mockClientSecret,
        };
        return config[key] || null;
      });

      await expect(service.exchangeCodeForTokens(mockCode, mockRedirectUri)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockLogger.error).toHaveBeenCalledWith('KEYCLOAK_URL is not configured');
    });

    it('should throw BadRequestException if KEYCLOAK_CLIENT_ID is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          KEYCLOAK_URL: mockKeycloakUrl,
          KEYCLOAK_CLIENT_SECRET: mockClientSecret,
        };
        return config[key] || null;
      });

      await expect(service.exchangeCodeForTokens(mockCode, mockRedirectUri)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockLogger.error).toHaveBeenCalledWith('KEYCLOAK_CLIENT_ID is not configured');
    });

    it('should throw BadRequestException if KEYCLOAK_CLIENT_SECRET is not configured', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          KEYCLOAK_URL: mockKeycloakUrl,
          KEYCLOAK_CLIENT_ID: mockClientId,
        };
        return config[key] || null;
      });

      await expect(service.exchangeCodeForTokens(mockCode, mockRedirectUri)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockLogger.error).toHaveBeenCalledWith('KEYCLOAK_CLIENT_SECRET is not configured');
    });

    it('should throw BadRequestException if code is empty', async () => {
      await expect(service.exchangeCodeForTokens('', mockRedirectUri)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Authorization code is required');
    });

    it('should successfully exchange code for tokens', async () => {
      const mockTokenResponse = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-123',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await service.exchangeCodeForTokens(mockCode, mockRedirectUri);

      expect(result).toEqual({
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });
      expect(mockLogger.debug).toHaveBeenCalled();
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

    it('should handle missing refresh_token in response', async () => {
      const mockTokenResponse = {
        access_token: 'access-token-123',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await service.exchangeCodeForTokens(mockCode, mockRedirectUri);

      expect(result.refreshToken).toBe('');
    });

    it('should use default values for expires_in and token_type', async () => {
      const mockTokenResponse = {
        access_token: 'access-token-123',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await service.exchangeCodeForTokens(mockCode, mockRedirectUri);

      expect(result.expiresIn).toBe(3600);
      expect(result.tokenType).toBe('Bearer');
    });

    it('should throw UnauthorizedException when response is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Invalid code',
      });

      await expect(service.exchangeCodeForTokens(mockCode, mockRedirectUri)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when access_token is missing', async () => {
      const mockTokenResponse = {
        refresh_token: 'refresh-token-123',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      await expect(service.exchangeCodeForTokens(mockCode, mockRedirectUri)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.exchangeCodeForTokens(mockCode, mockRedirectUri)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getUserInfoFromKeycloak', () => {
    const mockKeycloakUrl = 'http://localhost:8080';
    const mockKeycloakRealm = 'carecore';
    const mockAccessToken = 'access-token-123';

    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          KEYCLOAK_URL: mockKeycloakUrl,
          KEYCLOAK_REALM: mockKeycloakRealm,
        };
        return config[key] || null;
      });
    });

    it('should throw BadRequestException if KEYCLOAK_URL is not configured', async () => {
      mockConfigService.get.mockImplementation(() => null);

      await expect(service.getUserInfoFromKeycloak(mockAccessToken)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully get user info from Keycloak', async () => {
      const mockUserInfo = {
        sub: 'user-123',
        preferred_username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        given_name: 'Test',
        family_name: 'User',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockUserInfo,
      });

      const result = await service.getUserInfoFromKeycloak(mockAccessToken);

      expect(result).toEqual({
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        name: 'Test User',
        givenName: 'Test',
        familyName: 'User',
      });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/protocol/openid-connect/userinfo'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
          },
        }),
      );
    });

    it('should use sub as username if preferred_username is missing', async () => {
      const mockUserInfo = {
        sub: 'user-123',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockUserInfo,
      });

      const result = await service.getUserInfoFromKeycloak(mockAccessToken);

      expect(result.username).toBe('user-123');
    });

    it('should handle missing sub field', async () => {
      const mockUserInfo = {
        preferred_username: 'testuser',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockUserInfo,
      });

      const result = await service.getUserInfoFromKeycloak(mockAccessToken);

      expect(result.id).toBe('');
      expect(result.username).toBe('testuser');
    });

    it('should handle missing both sub and preferred_username', async () => {
      const mockUserInfo = {};

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockUserInfo,
      });

      const result = await service.getUserInfoFromKeycloak(mockAccessToken);

      expect(result.id).toBe('');
      expect(result.username).toBe('');
    });

    it('should handle missing optional fields', async () => {
      const mockUserInfo = {
        sub: 'user-123',
        preferred_username: 'testuser',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockUserInfo,
      });

      const result = await service.getUserInfoFromKeycloak(mockAccessToken);

      expect(result.email).toBeUndefined();
      expect(result.name).toBeUndefined();
    });

    it('should throw UnauthorizedException when response is not ok', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(service.getUserInfoFromKeycloak(mockAccessToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.getUserInfoFromKeycloak(mockAccessToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('handleCallback', () => {
    const mockKeycloakUrl = 'http://localhost:8080';
    const mockKeycloakRealm = 'carecore';
    const mockClientId = 'carecore-api';
    const mockClientSecret = 'secret-123';
    const mockCode = 'auth-code-123';
    const mockState = 'state-token-123';
    const mockStoredState = 'state-token-123';
    const mockRedirectUri = 'http://localhost:3000/api/auth/callback';

    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          KEYCLOAK_URL: mockKeycloakUrl,
          KEYCLOAK_REALM: mockKeycloakRealm,
          KEYCLOAK_CLIENT_ID: mockClientId,
          KEYCLOAK_CLIENT_SECRET: mockClientSecret,
        };
        return config[key] || null;
      });
    });

    it('should successfully handle callback', async () => {
      const mockTokenResponse = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-123',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      const mockUserInfo = {
        sub: 'user-123',
        preferred_username: 'testuser',
        email: 'test@example.com',
      };

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockUserInfo,
        });

      const result = await service.handleCallback(
        mockCode,
        mockState,
        mockStoredState,
        mockRedirectUri,
      );

      expect(result).toHaveProperty('accessToken', 'access-token-123');
      expect(result).toHaveProperty('refreshToken', 'refresh-token-123');
      expect(result).toHaveProperty('user');
      expect(result.user.id).toBe('user-123');
      expect(result.user.username).toBe('testuser');
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when state tokens do not match', async () => {
      await expect(
        service.handleCallback(mockCode, 'different-state', mockStoredState, mockRedirectUri),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    it('should throw error as not implemented', async () => {
      await expect(service.refreshToken('refresh-token')).rejects.toThrow('Not implemented');
      expect(mockLogger.warn).toHaveBeenCalledWith('refreshToken() not yet implemented');
    });
  });

  describe('logout', () => {
    it('should log warning as not implemented', async () => {
      await service.logout('refresh-token');
      expect(mockLogger.warn).toHaveBeenCalledWith('logout() not yet implemented');
    });
  });

  describe('getUserInfo', () => {
    it('should throw error as not implemented', async () => {
      await expect(service.getUserInfo('access-token')).rejects.toThrow('Not implemented');
      expect(mockLogger.warn).toHaveBeenCalledWith('getUserInfo() not yet implemented');
    });
  });
});
