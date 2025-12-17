import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';

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
    },
    roles: {
      find: jest.fn(),
    },
  })),
}));

// Mock qrcode
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));

import { AuthService } from './auth.service';
import { DocumentStorageService } from './services/document-storage.service';
import { KeycloakAdminService } from './services/keycloak-admin.service';
import { FhirService } from '../fhir/fhir.service';
import { EncryptionService } from '@/common/services/encryption.service';
import {
  PractitionerVerificationEntity,
  VerificationStatus,
} from '../../entities/practitioner-verification.entity';
import { ReviewStatus } from './dto/review-verification.dto';
import { DocumentType } from './dto/verify-practitioner.dto';
import { NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';

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

  const mockDocumentStorageService = {
    storeVerificationDocument: jest.fn(),
    validateFile: jest.fn(),
    getDocumentPath: jest.fn(),
    deleteDocument: jest.fn(),
  };

  const mockKeycloakAdminService = {
    findUserById: jest.fn(),
    getUserRoles: jest.fn(),
    addRoleToUser: jest.fn(),
    removeRoleFromUser: jest.fn(),
    updateUserRoles: jest.fn(),
    userHasRole: jest.fn(),
    userHasMFA: jest.fn(),
    generateTOTPSecret: jest.fn(),
    verifyAndEnableTOTP: jest.fn(),
    verifyTOTPCode: jest.fn(),
    removeTOTPCredential: jest.fn(),
    createUser: jest.fn(),
    checkUserExists: jest.fn(),
  };

  const mockFhirService = {
    validatePatientIdentifierUniqueness: jest.fn(),
    createPatient: jest.fn(),
  };

  const mockEncryptionService = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  };

  const mockVerificationRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
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
        {
          provide: DocumentStorageService,
          useValue: mockDocumentStorageService,
        },
        {
          provide: KeycloakAdminService,
          useValue: mockKeycloakAdminService,
        },
        {
          provide: getRepositoryToken(PractitionerVerificationEntity),
          useValue: mockVerificationRepository,
        },
        {
          provide: FhirService,
          useValue: mockFhirService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
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
      expect(url.searchParams.get('scope')).toBe('openid profile email fhirUser');
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

    it('should throw UnauthorizedException when received state is only whitespace', () => {
      expect(() => {
        service.validateStateToken('   ', 'stored-token');
      }).toThrow(UnauthorizedException);
      expect(mockLogger.warn).toHaveBeenCalledWith('State token missing in callback');
    });

    it('should throw UnauthorizedException when stored state is only whitespace', () => {
      expect(() => {
        service.validateStateToken('received-token', '   ');
      }).toThrow(UnauthorizedException);
      expect(mockLogger.warn).toHaveBeenCalledWith('State token missing in callback');
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

    it('should throw BadRequestException if code is only whitespace', async () => {
      await expect(service.exchangeCodeForTokens('   ', mockRedirectUri)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Authorization code is required');
    });

    it('should throw BadRequestException if redirectUri is empty', async () => {
      await expect(service.exchangeCodeForTokens(mockCode, '')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Redirect URI is required');
    });

    it('should throw BadRequestException if redirectUri is only whitespace', async () => {
      await expect(service.exchangeCodeForTokens(mockCode, '   ')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockLogger.error).toHaveBeenCalledWith('Redirect URI is required');
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

    it('should handle Keycloak returning 500 error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(service.exchangeCodeForTokens(mockCode, mockRedirectUri)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 500,
        }),
        'Failed to exchange code for tokens',
      );
    });

    it('should handle Keycloak returning 503 Service Unavailable', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable',
      });

      await expect(service.exchangeCodeForTokens(mockCode, mockRedirectUri)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle malformed JSON response from Keycloak', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

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

    it('should throw BadRequestException if accessToken is empty', async () => {
      await expect(service.getUserInfoFromKeycloak('')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if accessToken is only whitespace', async () => {
      await expect(service.getUserInfoFromKeycloak('   ')).rejects.toThrow(BadRequestException);
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

    it('should handle Keycloak returning 500 error', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(service.getUserInfoFromKeycloak(mockAccessToken)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 500,
        }),
        'Failed to get user info from Keycloak',
      );
    });

    it('should handle Keycloak returning 401 Unauthorized', async () => {
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

    it('should handle malformed JSON response from Keycloak', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

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

    it('should throw BadRequestException when code is empty', async () => {
      await expect(
        service.handleCallback('', mockState, mockStoredState, mockRedirectUri),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when code is only whitespace', async () => {
      await expect(
        service.handleCallback('   ', mockState, mockStoredState, mockRedirectUri),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when redirectUri is empty', async () => {
      await expect(
        service.handleCallback(mockCode, mockState, mockStoredState, ''),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when redirectUri is only whitespace', async () => {
      await expect(
        service.handleCallback(mockCode, mockState, mockStoredState, '   '),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate error from exchangeCodeForTokens', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Invalid code',
      });

      await expect(
        service.handleCallback(mockCode, mockState, mockStoredState, mockRedirectUri),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should propagate error from getUserInfoFromKeycloak', async () => {
      const mockTokenResponse = {
        access_token: 'access-token-123',
        refresh_token: 'refresh-token-123',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: async () => 'Invalid token',
        });

      await expect(
        service.handleCallback(mockCode, mockState, mockStoredState, mockRedirectUri),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshToken', () => {
    const mockKeycloakUrl = 'http://localhost:8080';
    const mockKeycloakRealm = 'carecore';
    const mockClientId = 'carecore-api';
    const mockClientSecret = 'secret-123';
    const mockRefreshToken = 'refresh-token-123';

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

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(BadRequestException);
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

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalledWith('KEYCLOAK_CLIENT_ID is not configured');
    });

    it('should throw BadRequestException if KEYCLOAK_CLIENT_SECRET is not configured (confidential client)', async () => {
      // When no clientId is provided, it uses confidential client which requires client_secret
      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          KEYCLOAK_URL: mockKeycloakUrl,
          KEYCLOAK_CLIENT_ID: mockClientId,
          // KEYCLOAK_CLIENT_SECRET is missing
        };
        return config[key] || null;
      });

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalledWith('KEYCLOAK_CLIENT_SECRET is not configured');
    });

    it('should not require KEYCLOAK_CLIENT_SECRET for public client (with clientId)', async () => {
      // When clientId is provided (public client), client_secret is not required
      const publicClientId = 'carecore-mobile';
      const mockKeycloakPublicUrl = 'http://localhost:8080';
      const mockTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      mockConfigService.get.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          KEYCLOAK_URL: mockKeycloakUrl,
          KEYCLOAK_PUBLIC_URL: mockKeycloakPublicUrl,
          KEYCLOAK_REALM: mockKeycloakRealm,
          // KEYCLOAK_CLIENT_SECRET is not needed for public clients
        };
        return config[key] || null;
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await service.refreshToken(mockRefreshToken, publicClientId);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });

      // Verify that the request uses KEYCLOAK_URL for HTTP requests (not KEYCLOAK_PUBLIC_URL)
      // KEYCLOAK_PUBLIC_URL is only used for issuer validation, not for HTTP requests
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const tokenUrl = fetchCall[0];
      expect(tokenUrl).toContain(mockKeycloakUrl); // Should use KEYCLOAK_URL, not KEYCLOAK_PUBLIC_URL

      // Verify that the request body does NOT include client_secret
      const bodyString = fetchCall[1].body.toString();
      expect(bodyString).toContain(`client_id=${publicClientId}`);
      expect(bodyString).not.toContain('client_secret');
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: publicClientId,
          isPublicClient: true,
          publicUrlConfigured: true, // KEYCLOAK_PUBLIC_URL is configured but not used for HTTP
        }),
        'Refreshing access token',
      );
    });

    it('should throw BadRequestException if refresh token is empty', async () => {
      await expect(service.refreshToken('')).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalledWith('Refresh token is required');
    });

    it('should successfully refresh token (confidential client)', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await service.refreshToken(mockRefreshToken);

      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId: mockClientId,
          isPublicClient: false,
        }),
        'Refreshing access token',
      );

      // Verify that the request body includes client_secret for confidential client
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      const bodyString = fetchCall[1].body.toString();
      expect(bodyString).toContain(`client_id=${mockClientId}`);
      expect(bodyString).toContain(`client_secret=${mockClientSecret}`);

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

    it('should use old refresh token if new one is not provided', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await service.refreshToken(mockRefreshToken);

      expect(result.refreshToken).toBe(mockRefreshToken);
    });

    it('should use default values for expires_in and token_type when missing (covers lines 422-423)', async () => {
      const mockTokenResponse = {
        access_token: 'new-access-token',
        // Missing expires_in and token_type
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const result = await service.refreshToken(mockRefreshToken);

      expect(result.expiresIn).toBe(3600);
      expect(result.tokenType).toBe('Bearer');
    });

    it('should throw UnauthorizedException when response is not ok (400)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Invalid refresh token',
      });

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when response is not ok (401)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException when response is not ok with other status codes (covers lines 406-408)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      });

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 500,
          error: 'Internal server error',
        }),
        'Failed to refresh token',
      );
    });

    it('should throw UnauthorizedException when access_token is missing', async () => {
      const mockTokenResponse = {
        refresh_token: 'new-refresh-token',
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockTokenResponse,
      });

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle fetch errors', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      await expect(service.refreshToken(mockRefreshToken)).rejects.toThrow(UnauthorizedException);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    const mockKeycloakUrl = 'http://localhost:8080';
    const mockKeycloakRealm = 'carecore';
    const mockClientId = 'carecore-api';
    const mockClientSecret = 'secret-123';
    const mockRefreshToken = 'refresh-token-123';

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

      await expect(service.logout(mockRefreshToken)).rejects.toThrow(BadRequestException);
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

      await expect(service.logout(mockRefreshToken)).rejects.toThrow(BadRequestException);
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

      await expect(service.logout(mockRefreshToken)).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalledWith('KEYCLOAK_CLIENT_SECRET is not configured');
    });

    it('should throw BadRequestException if refresh token is empty', async () => {
      await expect(service.logout('')).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalledWith('Refresh token is required for logout');
    });

    it('should successfully revoke tokens in Keycloak (204 No Content)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      await service.logout(mockRefreshToken);

      expect(mockLogger.debug).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/protocol/openid-connect/logout'),
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );
    });

    it('should successfully revoke tokens in Keycloak (200 OK)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      await service.logout(mockRefreshToken);

      expect(mockLogger.debug).toHaveBeenCalledWith('Tokens successfully revoked in Keycloak');
    });

    it('should continue with logout even if Keycloak returns error (400)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'Invalid refresh token',
      });

      // Should not throw - logout should succeed even if Keycloak fails
      await expect(service.logout(mockRefreshToken)).resolves.not.toThrow();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should continue with logout even if Keycloak returns error (401)', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      // Should not throw - logout should succeed even if Keycloak fails
      await expect(service.logout(mockRefreshToken)).resolves.not.toThrow();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should continue with logout even if fetch fails', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      // Should not throw - logout should succeed even if Keycloak is unreachable
      await expect(service.logout(mockRefreshToken)).resolves.not.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getUserInfo', () => {
    it('should throw error as not implemented', async () => {
      await expect(service.getUserInfo('access-token')).rejects.toThrow('Not implemented');
      expect(mockLogger.warn).toHaveBeenCalledWith('getUserInfo() not yet implemented');
    });
  });

  describe('requestVerification', () => {
    const mockFile = {
      buffer: Buffer.from('test'),
      originalname: 'cedula.pdf',
      mimetype: 'application/pdf',
      size: 1024,
    } as Express.Multer.File;

    const mockDto = {
      practitionerId: 'practitioner-123',
      documentType: DocumentType.CEDULA,
      additionalInfo: 'Test info',
    };

    it('should create verification request successfully', async () => {
      const mockVerification = {
        id: 'verification-123',
        status: 'pending',
        practitionerId: 'practitioner-123',
      };

      mockDocumentStorageService.storeVerificationDocument.mockResolvedValue(
        'practitioner-123/cedula_123.pdf',
      );
      mockVerificationRepository.create.mockReturnValue(mockVerification);
      mockVerificationRepository.save.mockResolvedValue(mockVerification);

      const result = await service.requestVerification(mockDto, mockFile, 'user-123');

      expect(result).toEqual({
        verificationId: 'verification-123',
        status: 'pending',
        message: 'Verification request submitted successfully',
        estimatedReviewTime: '2-3 business days',
      });
      expect(mockDocumentStorageService.storeVerificationDocument).toHaveBeenCalledWith(
        mockFile,
        'practitioner-123',
        'cedula',
      );
      expect(mockVerificationRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if file is missing', async () => {
      await expect(
        service.requestVerification(mockDto, null as unknown as Express.Multer.File, 'user-123'),
      ).rejects.toThrow(BadRequestException);
      expect(mockDocumentStorageService.storeVerificationDocument).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if practitionerId is missing', async () => {
      const invalidDto = { ...mockDto, practitionerId: '' };

      await expect(service.requestVerification(invalidDto, mockFile, 'user-123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should set additionalInfo to null when not provided (covers line 566)', async () => {
      const mockVerification = {
        id: 'verification-123',
        status: 'pending',
        practitionerId: 'practitioner-123',
      };

      const dtoWithoutAdditionalInfo = {
        practitionerId: 'practitioner-123',
        documentType: DocumentType.CEDULA,
        // No additionalInfo
      };

      mockDocumentStorageService.storeVerificationDocument.mockResolvedValue(
        'practitioner-123/cedula_123.pdf',
      );
      mockVerificationRepository.create.mockReturnValue(mockVerification);
      mockVerificationRepository.save.mockResolvedValue(mockVerification);

      await service.requestVerification(dtoWithoutAdditionalInfo, mockFile, 'user-123');

      expect(mockVerificationRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          additionalInfo: null,
        }),
      );
    });
  });

  describe('listVerifications', () => {
    it('should return paginated list of verifications', async () => {
      const mockVerifications = [
        {
          id: 'verification-1',
          practitionerId: 'practitioner-123',
          status: 'pending',
          documentType: 'cedula',
          documentPath: 'path/to/doc.pdf',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
        getMany: jest.fn().mockResolvedValue(mockVerifications),
      };

      mockVerificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.listVerifications({ page: 1, limit: 10 });

      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
      expect(mockQueryBuilder.getCount).toHaveBeenCalled();
      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
    });

    it('should filter by status when provided', async () => {
      const mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
        getMany: jest.fn().mockResolvedValue([]),
      };

      mockVerificationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      await service.listVerifications({
        status: VerificationStatus.PENDING,
        page: 1,
        limit: 10,
      });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('verification.status = :status', {
        status: VerificationStatus.PENDING,
      });
    });
  });

  describe('getVerificationById', () => {
    it('should return verification details', async () => {
      const mockVerification = {
        id: 'verification-123',
        practitionerId: 'practitioner-123',
        status: 'pending',
        documentType: 'cedula',
        documentPath: 'path/to/doc.pdf',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockVerificationRepository.findOne.mockResolvedValue(mockVerification);

      const result = await service.getVerificationById('verification-123');

      expect(result.id).toBe('verification-123');
      expect(mockVerificationRepository.findOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException if verification not found', async () => {
      mockVerificationRepository.findOne.mockResolvedValue(null);

      await expect(service.getVerificationById('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.getVerificationById('non-existent')).rejects.toThrow(
        'Verification with ID non-existent not found',
      );
    });
  });

  describe('reviewVerification', () => {
    it('should approve verification successfully', async () => {
      const mockVerification = {
        id: 'verification-123',
        status: VerificationStatus.PENDING,
        practitionerId: 'practitioner-123',
        keycloakUserId: 'keycloak-user-123',
      };

      mockVerificationRepository.findOne.mockResolvedValue(mockVerification);
      mockVerificationRepository.save.mockResolvedValue({
        ...mockVerification,
        status: VerificationStatus.APPROVED,
        reviewedBy: 'admin-123',
        reviewedAt: new Date(),
      });
      mockKeycloakAdminService.addRoleToUser.mockResolvedValue(true);

      const result = await service.reviewVerification(
        'verification-123',
        { status: ReviewStatus.APPROVED },
        'admin-123',
      );

      expect(result.status).toBe(VerificationStatus.APPROVED);
      expect(mockKeycloakAdminService.addRoleToUser).toHaveBeenCalled();
    });

    it('should log warning when role addition fails after approval (covers lines 742-750)', async () => {
      const mockVerification = {
        id: 'verification-123',
        status: VerificationStatus.PENDING,
        practitionerId: 'practitioner-123',
        keycloakUserId: 'keycloak-user-123',
      };

      mockVerificationRepository.findOne.mockResolvedValue(mockVerification);
      mockVerificationRepository.save.mockResolvedValue({
        ...mockVerification,
        status: VerificationStatus.APPROVED,
        reviewedBy: 'admin-123',
        reviewedAt: new Date(),
      });
      mockKeycloakAdminService.addRoleToUser.mockResolvedValue(false);

      const result = await service.reviewVerification(
        'verification-123',
        { status: ReviewStatus.APPROVED },
        'admin-123',
      );

      expect(result.status).toBe(VerificationStatus.APPROVED);
      expect(mockKeycloakAdminService.addRoleToUser).toHaveBeenCalledWith(
        'keycloak-user-123',
        'practitioner-verified',
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          verificationId: 'verification-123',
          keycloakUserId: 'keycloak-user-123',
        },
        'Failed to add practitioner-verified role in Keycloak. Verification was approved in database but role update failed.',
      );
    });

    it('should reject verification successfully', async () => {
      const mockVerification = {
        id: 'verification-123',
        status: VerificationStatus.PENDING,
        practitionerId: 'practitioner-123',
        keycloakUserId: 'keycloak-user-123',
      };

      mockVerificationRepository.findOne.mockResolvedValue(mockVerification);
      mockVerificationRepository.save.mockResolvedValue({
        ...mockVerification,
        status: VerificationStatus.REJECTED,
        reviewedBy: 'admin-123',
        reviewedAt: new Date(),
        rejectionReason: 'Invalid document',
      });
      mockKeycloakAdminService.removeRoleFromUser.mockResolvedValue(true);

      const result = await service.reviewVerification(
        'verification-123',
        { status: ReviewStatus.REJECTED, rejectionReason: 'Invalid document' },
        'admin-123',
      );

      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(mockKeycloakAdminService.addRoleToUser).not.toHaveBeenCalled();
      expect(mockKeycloakAdminService.removeRoleFromUser).toHaveBeenCalledWith(
        'keycloak-user-123',
        'practitioner-verified',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          verificationId: 'verification-123',
          keycloakUserId: 'keycloak-user-123',
        },
        'Removed practitioner-verified role from user in Keycloak',
      );
    });

    it('should handle rejection when role removal succeeds (covers lines 761-777)', async () => {
      const mockVerification = {
        id: 'verification-123',
        status: VerificationStatus.PENDING,
        practitionerId: 'practitioner-123',
        keycloakUserId: 'keycloak-user-123',
      };

      mockVerificationRepository.findOne.mockResolvedValue(mockVerification);
      mockVerificationRepository.save.mockResolvedValue({
        ...mockVerification,
        status: VerificationStatus.REJECTED,
        reviewedBy: 'admin-123',
        reviewedAt: new Date(),
        rejectionReason: 'Invalid document',
      });
      mockKeycloakAdminService.removeRoleFromUser.mockResolvedValue(true);

      const result = await service.reviewVerification(
        'verification-123',
        { status: ReviewStatus.REJECTED, rejectionReason: 'Invalid document' },
        'admin-123',
      );

      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(mockKeycloakAdminService.removeRoleFromUser).toHaveBeenCalledWith(
        'keycloak-user-123',
        'practitioner-verified',
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        {
          verificationId: 'verification-123',
          keycloakUserId: 'keycloak-user-123',
        },
        'Removed practitioner-verified role from user in Keycloak',
      );
    });

    it('should handle rejection when role does not exist (covers lines 761-777)', async () => {
      const mockVerification = {
        id: 'verification-123',
        status: VerificationStatus.PENDING,
        practitionerId: 'practitioner-123',
        keycloakUserId: 'keycloak-user-123',
      };

      mockVerificationRepository.findOne.mockResolvedValue(mockVerification);
      mockVerificationRepository.save.mockResolvedValue({
        ...mockVerification,
        status: VerificationStatus.REJECTED,
        reviewedBy: 'admin-123',
        reviewedAt: new Date(),
        rejectionReason: 'Invalid document',
      });
      mockKeycloakAdminService.removeRoleFromUser.mockResolvedValue(false);

      const result = await service.reviewVerification(
        'verification-123',
        { status: ReviewStatus.REJECTED, rejectionReason: 'Invalid document' },
        'admin-123',
      );

      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(mockKeycloakAdminService.removeRoleFromUser).toHaveBeenCalledWith(
        'keycloak-user-123',
        'practitioner-verified',
      );
      // Should not log info when role didn't exist
      expect(mockLogger.info).not.toHaveBeenCalledWith(
        expect.objectContaining({
          verificationId: 'verification-123',
        }),
        'Removed practitioner-verified role from user in Keycloak',
      );
    });

    it('should handle Keycloak errors gracefully during review (covers lines 779-789)', async () => {
      const mockVerification = {
        id: 'verification-123',
        status: VerificationStatus.PENDING,
        practitionerId: 'practitioner-123',
        keycloakUserId: 'keycloak-user-123',
      };

      mockVerificationRepository.findOne.mockResolvedValue(mockVerification);
      mockVerificationRepository.save.mockResolvedValue({
        ...mockVerification,
        status: VerificationStatus.APPROVED,
        reviewedBy: 'admin-123',
        reviewedAt: new Date(),
      });
      mockKeycloakAdminService.addRoleToUser.mockRejectedValue(
        new Error('Keycloak connection failed'),
      );

      // Should not throw - database update succeeds, Keycloak error is logged but doesn't fail
      const result = await service.reviewVerification(
        'verification-123',
        { status: ReviewStatus.APPROVED },
        'admin-123',
      );

      expect(result.status).toBe(VerificationStatus.APPROVED);
      expect(mockLogger.error).toHaveBeenCalledWith(
        {
          error: expect.any(Error),
          verificationId: 'verification-123',
          keycloakUserId: 'keycloak-user-123',
          status: VerificationStatus.APPROVED,
        },
        'Error updating Keycloak roles during verification review',
      );
    });

    it('should log warning when keycloakUserId is not set (covers lines 791-797)', async () => {
      const mockVerification = {
        id: 'verification-123',
        status: VerificationStatus.PENDING,
        practitionerId: 'practitioner-123',
        keycloakUserId: null,
      };

      mockVerificationRepository.findOne.mockResolvedValue(mockVerification);
      mockVerificationRepository.save.mockResolvedValue({
        ...mockVerification,
        status: VerificationStatus.APPROVED,
        reviewedBy: 'admin-123',
        reviewedAt: new Date(),
      });

      const result = await service.reviewVerification(
        'verification-123',
        { status: ReviewStatus.APPROVED },
        'admin-123',
      );

      expect(result.status).toBe(VerificationStatus.APPROVED);
      expect(mockKeycloakAdminService.addRoleToUser).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        {
          verificationId: 'verification-123',
        },
        'Cannot update Keycloak roles: keycloakUserId is not set',
      );
    });

    it('should throw NotFoundException if verification not found', async () => {
      mockVerificationRepository.findOne.mockResolvedValue(null);

      await expect(
        service.reviewVerification('non-existent', { status: ReviewStatus.APPROVED }, 'admin-123'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.reviewVerification('non-existent', { status: ReviewStatus.APPROVED }, 'admin-123'),
      ).rejects.toThrow('Verification with ID non-existent not found');
    });

    it('should throw BadRequestException if verification is not pending', async () => {
      const mockVerification = {
        id: 'verification-123',
        status: VerificationStatus.APPROVED,
      };

      mockVerificationRepository.findOne.mockResolvedValue(mockVerification);

      await expect(
        service.reviewVerification(
          'verification-123',
          { status: ReviewStatus.APPROVED },
          'admin-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if rejection reason is missing', async () => {
      const mockVerification = {
        id: 'verification-123',
        status: VerificationStatus.PENDING,
      };

      mockVerificationRepository.findOne.mockResolvedValue(mockVerification);

      await expect(
        service.reviewVerification(
          'verification-123',
          { status: ReviewStatus.REJECTED },
          'admin-123',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('setupMFA', () => {
    it('should setup MFA successfully', async () => {
      const mockSecret = 'JBSWY3DPEHPK3PXP';
      const mockQrCode = 'data:image/png;base64,...';

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'KEYCLOAK_REALM') return 'carecore';
        return null;
      });
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.generateTOTPSecret.mockResolvedValue({ secret: mockSecret });
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQrCode);

      const result = await service.setupMFA('user-123', 'user@example.com');

      expect(result.secret).toBe(mockSecret);
      expect(result.qrCode).toBe(mockQrCode);
      expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('user-123');
      expect(mockKeycloakAdminService.generateTOTPSecret).toHaveBeenCalledWith('user-123');
    });

    it('should throw BadRequestException if MFA already configured', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);

      await expect(service.setupMFA('user-123', 'user@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if TOTP secret generation fails', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.generateTOTPSecret.mockResolvedValue(null);

      await expect(service.setupMFA('user-123', 'user@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if QR code generation fails', async () => {
      const mockSecret = 'JBSWY3DPEHPK3PXP';

      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'KEYCLOAK_REALM') return 'carecore';
        return null;
      });
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.generateTOTPSecret.mockResolvedValue({ secret: mockSecret });
      (QRCode.toDataURL as jest.Mock).mockRejectedValue(new Error('QR code generation failed'));

      await expect(service.setupMFA('user-123', 'user@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should use default KEYCLOAK_REALM when not configured (covers line 837)', async () => {
      const mockSecret = 'JBSWY3DPEHPK3PXP';
      const mockQrCode = 'data:image/png;base64,...';

      mockConfigService.get.mockImplementation((_key: string) => {
        // KEYCLOAK_REALM not configured, should default to 'carecore'
        return null;
      });
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.generateTOTPSecret.mockResolvedValue({ secret: mockSecret });
      (QRCode.toDataURL as jest.Mock).mockResolvedValue(mockQrCode);

      const result = await service.setupMFA('user-123', 'user@example.com');

      expect(result.secret).toBe(mockSecret);
      expect(result.qrCode).toBe(mockQrCode);
      // Verify that the default realm 'carecore' is used in the QR code URL
      expect(QRCode.toDataURL).toHaveBeenCalledWith(
        expect.stringContaining('CareCore%20(carecore)'),
        expect.any(Object),
      );
    });
  });

  describe('verifyMFASetup', () => {
    it('should verify and enable MFA successfully', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.verifyAndEnableTOTP.mockResolvedValue(true);

      const result = await service.verifyMFASetup('user-123', '123456');

      expect(result.success).toBe(true);
      expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('user-123');
      expect(mockKeycloakAdminService.verifyAndEnableTOTP).toHaveBeenCalledWith(
        'user-123',
        '123456',
      );
    });

    it('should throw BadRequestException if MFA already enabled (covers lines 878-879)', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);

      await expect(service.verifyMFASetup('user-123', '123456')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('user-123');
      expect(mockKeycloakAdminService.verifyAndEnableTOTP).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if code is invalid', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.verifyAndEnableTOTP.mockResolvedValue(false);

      await expect(service.verifyMFASetup('user-123', '000000')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('disableMFA', () => {
    it('should disable MFA successfully', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);
      mockKeycloakAdminService.verifyTOTPCode.mockResolvedValue(true);
      mockKeycloakAdminService.removeTOTPCredential.mockResolvedValue(true);

      const result = await service.disableMFA('user-123', '123456');

      expect(result.success).toBe(true);
      expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('user-123');
      expect(mockKeycloakAdminService.verifyTOTPCode).toHaveBeenCalledWith('user-123', '123456');
      expect(mockKeycloakAdminService.removeTOTPCredential).toHaveBeenCalledWith('user-123');
    });

    it('should throw BadRequestException if code is invalid (covers lines 915-918)', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);
      mockKeycloakAdminService.verifyTOTPCode.mockResolvedValue(false);

      await expect(service.disableMFA('user-123', '000000')).rejects.toThrow(BadRequestException);
      expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('user-123');
      expect(mockKeycloakAdminService.verifyTOTPCode).toHaveBeenCalledWith('user-123', '000000');
      expect(mockKeycloakAdminService.removeTOTPCredential).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if MFA not enabled', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);

      await expect(service.disableMFA('user-123', '123456')).rejects.toThrow(BadRequestException);
      expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('user-123');
      expect(mockKeycloakAdminService.verifyTOTPCode).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if removing TOTP credential fails (covers lines 923-924)', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);
      mockKeycloakAdminService.verifyTOTPCode.mockResolvedValue(true);
      mockKeycloakAdminService.removeTOTPCredential.mockResolvedValue(false);

      await expect(service.disableMFA('user-123', '123456')).rejects.toThrow(BadRequestException);
      expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('user-123');
      expect(mockKeycloakAdminService.verifyTOTPCode).toHaveBeenCalledWith('user-123', '123456');
      expect(mockKeycloakAdminService.removeTOTPCredential).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getMFAStatus', () => {
    it('should return MFA status successfully', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);
      mockKeycloakAdminService.findUserById.mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
      });
      mockKeycloakAdminService.getUserRoles.mockResolvedValue(['patient']);

      const result = await service.getMFAStatus('user-123');

      expect(result.mfaEnabled).toBe(true);
      expect(result.mfaRequired).toBeDefined();
      expect(mockKeycloakAdminService.userHasMFA).toHaveBeenCalledWith('user-123');
    });

    it('should return message when MFA is enabled and user has no critical role', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(true);
      mockKeycloakAdminService.findUserById.mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
      });
      mockKeycloakAdminService.getUserRoles.mockResolvedValue(['patient']);

      const result = await service.getMFAStatus('user-123');

      expect(result.mfaEnabled).toBe(true);
      expect(result.mfaRequired).toBe(false);
      expect(result.message).toBe('MFA is enabled and active');
    });

    it('should return message when MFA is not enabled and user has no critical role (covers line 966)', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.findUserById.mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
      });
      mockKeycloakAdminService.getUserRoles.mockResolvedValue(['patient']);

      const result = await service.getMFAStatus('user-123');

      expect(result.mfaEnabled).toBe(false);
      expect(result.mfaRequired).toBe(false);
      expect(result.message).toBe('MFA is optional for your role');
    });

    it('should return mfaRequired true for admin role', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.findUserById.mockResolvedValue({
        id: 'user-123',
        username: 'admin',
      });
      mockKeycloakAdminService.getUserRoles.mockResolvedValue(['admin']);

      const result = await service.getMFAStatus('user-123');

      expect(result.mfaRequired).toBe(true);
    });

    it('should return mfaRequired true for practitioner role', async () => {
      mockKeycloakAdminService.userHasMFA.mockResolvedValue(false);
      mockKeycloakAdminService.findUserById.mockResolvedValue({
        id: 'user-123',
        username: 'practitioner',
      });
      mockKeycloakAdminService.getUserRoles.mockResolvedValue(['practitioner']);

      const result = await service.getMFAStatus('user-123');

      expect(result.mfaRequired).toBe(true);
    });

    it('should throw NotFoundException if user not found', async () => {
      mockKeycloakAdminService.findUserById.mockResolvedValue(null);

      await expect(service.getMFAStatus('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.getMFAStatus('non-existent')).rejects.toThrow(
        'User with ID non-existent not found in Keycloak',
      );
    });
  });

  describe('registerPatient', () => {
    const mockRegisterDto = {
      username: 'newpatient',
      email: 'lucero@example.com',
      password: 'SecurePassword123!',
      name: [
        {
          given: ['Lucero'],
          family: 'Garcia',
        },
      ],
      identifier: [
        {
          system: 'http://hl7.org/fhir/sid/us-ssn',
          value: '123-45-6789',
        },
      ],
      gender: 'male' as const,
      birthDate: '1990-01-15',
      address: [
        {
          use: 'home' as const,
          line: ['123 Main St'],
          city: 'Anytown',
          state: 'CA',
          postalCode: '12345',
          country: 'US',
        },
      ],
      telecom: [
        {
          system: 'phone' as const,
          value: '+1-555-123-4567',
          use: 'mobile' as const,
        },
      ],
    };

    beforeEach(() => {
      mockKeycloakAdminService.checkUserExists.mockResolvedValue({
        usernameExists: false,
        emailExists: false,
      });
      mockFhirService.validatePatientIdentifierUniqueness.mockResolvedValue(true);
      mockKeycloakAdminService.createUser.mockResolvedValue('keycloak-user-id-123');
      mockKeycloakAdminService.addRoleToUser.mockResolvedValue(true);
      mockEncryptionService.encrypt.mockImplementation(
        async (value: string) => `encrypted-${value}`,
      );
      mockFhirService.createPatient.mockResolvedValue({
        resourceType: 'Patient',
        id: 'patient-id-123',
        name: mockRegisterDto.name,
        identifier: mockRegisterDto.identifier,
        gender: mockRegisterDto.gender,
        birthDate: mockRegisterDto.birthDate,
      });
    });

    it('should successfully register a new patient', async () => {
      const result = await service.registerPatient(mockRegisterDto);

      expect(result).toHaveProperty('userId', 'keycloak-user-id-123');
      expect(result).toHaveProperty('patientId', 'patient-id-123');
      expect(result).toHaveProperty('username', 'newpatient');
      expect(result).toHaveProperty('email', 'lucero@example.com');
      expect(result.message).toBe(
        'Patient registered successfully. Please check your email to verify your account.',
      );

      expect(mockKeycloakAdminService.checkUserExists).toHaveBeenCalledWith(
        'newpatient',
        'lucero@example.com',
      );
      expect(mockFhirService.validatePatientIdentifierUniqueness).toHaveBeenCalledWith(
        mockRegisterDto.identifier,
      );
      expect(mockKeycloakAdminService.createUser).toHaveBeenCalled();
      expect(mockKeycloakAdminService.addRoleToUser).toHaveBeenCalledWith(
        'keycloak-user-id-123',
        'patient',
      );
      expect(mockFhirService.createPatient).toHaveBeenCalled();
    });

    it('should throw BadRequestException if username already exists', async () => {
      mockKeycloakAdminService.checkUserExists.mockResolvedValue({
        usernameExists: true,
        emailExists: false,
      });

      await expect(service.registerPatient(mockRegisterDto)).rejects.toThrow(BadRequestException);
      await expect(service.registerPatient(mockRegisterDto)).rejects.toThrow(
        'Username already exists',
      );

      expect(mockKeycloakAdminService.createUser).not.toHaveBeenCalled();
      expect(mockFhirService.createPatient).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      mockKeycloakAdminService.checkUserExists.mockResolvedValue({
        usernameExists: false,
        emailExists: true,
      });

      await expect(service.registerPatient(mockRegisterDto)).rejects.toThrow(BadRequestException);
      await expect(service.registerPatient(mockRegisterDto)).rejects.toThrow(
        'Email already exists',
      );

      expect(mockKeycloakAdminService.createUser).not.toHaveBeenCalled();
      expect(mockFhirService.createPatient).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if identifier already exists', async () => {
      mockFhirService.validatePatientIdentifierUniqueness.mockRejectedValue(
        new BadRequestException('A patient with this identifier already exists'),
      );

      await expect(service.registerPatient(mockRegisterDto)).rejects.toThrow(BadRequestException);
      await expect(service.registerPatient(mockRegisterDto)).rejects.toThrow(
        'identifier already exists',
      );

      expect(mockKeycloakAdminService.createUser).not.toHaveBeenCalled();
      expect(mockFhirService.createPatient).not.toHaveBeenCalled();
    });

    it('should encrypt sensitive identifiers (SSN)', async () => {
      await service.registerPatient(mockRegisterDto);

      // Verify encryption was called for SSN
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('123-45-6789');
    });

    it('should encrypt phone numbers but not emails', async () => {
      await service.registerPatient(mockRegisterDto);

      // Verify encryption was called for phone number
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('+1-555-123-4567');
    });

    it('should encrypt address lines and postal codes', async () => {
      await service.registerPatient(mockRegisterDto);

      // Verify encryption was called for address line and postal code
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('123 Main St');
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith('12345');
    });

    it('should handle encryption failures gracefully', async () => {
      mockEncryptionService.encrypt.mockRejectedValueOnce(new Error('Encryption failed'));

      // Should still succeed, storing as plaintext
      const result = await service.registerPatient(mockRegisterDto);
      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle Keycloak user creation failure', async () => {
      mockKeycloakAdminService.createUser.mockResolvedValue(null);

      await expect(service.registerPatient(mockRegisterDto)).rejects.toThrow(BadRequestException);
      await expect(service.registerPatient(mockRegisterDto)).rejects.toThrow(
        'Failed to create user in Keycloak',
      );
    });

    it('should continue even if role assignment fails', async () => {
      mockKeycloakAdminService.addRoleToUser.mockResolvedValue(false);

      const result = await service.registerPatient(mockRegisterDto);

      expect(result).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockFhirService.createPatient).toHaveBeenCalled();
    });

    it('should register patient without identifiers', async () => {
      const registerDtoWithoutIdentifiers = {
        ...mockRegisterDto,
        identifier: undefined,
      };

      const result = await service.registerPatient(registerDtoWithoutIdentifiers);

      expect(result).toBeDefined();
      expect(mockFhirService.validatePatientIdentifierUniqueness).not.toHaveBeenCalled();
      expect(mockFhirService.createPatient).toHaveBeenCalled();
    });
  });
});
