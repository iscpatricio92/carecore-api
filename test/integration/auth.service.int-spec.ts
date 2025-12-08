import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';

import { AuthService } from '@/modules/auth/auth.service';
import { DocumentStorageService } from '@/modules/auth/services/document-storage.service';
import { KeycloakAdminService } from '@/modules/auth/services/keycloak-admin.service';

// Evita cargar ESM de @keycloak/keycloak-admin-client en tests de integración
jest.mock('@keycloak/keycloak-admin-client', () => {
  return jest.fn(() => ({}));
});

describe('AuthService (integration)', () => {
  let authService: AuthService;
  let configMock: jest.Mocked<ConfigService>;
  let loggerMock: jest.Mocked<PinoLogger>;
  let fetchMock: jest.Mock;

  beforeAll(async () => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    configMock = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'KEYCLOAK_URL':
            return 'http://keycloak.test';
          case 'KEYCLOAK_REALM':
            return 'carecore';
          case 'KEYCLOAK_CLIENT_ID':
            return 'client-id';
          case 'KEYCLOAK_CLIENT_SECRET':
            return 'client-secret';
          default:
            return undefined;
        }
      }),
    } as unknown as jest.Mocked<ConfigService>;

    loggerMock = {
      setContext: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: configMock },
        { provide: PinoLogger, useValue: loggerMock },
        {
          provide: DocumentStorageService,
          useValue: {
            validateFile: jest.fn(),
            storeVerificationDocument: jest.fn(),
            getDocumentPath: jest.fn(),
            deleteDocument: jest.fn(),
          },
        },
        {
          provide: KeycloakAdminService,
          useValue: {
            userHasMFA: jest.fn(),
            generateTOTPSecret: jest.fn(),
            verifyTOTPCode: jest.fn(),
            removeTOTPCredential: jest.fn(),
          },
        },
        {
          provide: 'PractitionerVerificationEntityRepository',
          useValue: {},
        },
      ],
    }).compile();

    authService = moduleRef.get<AuthService>(AuthService);
  });

  beforeEach(() => {
    fetchMock.mockReset();
    configMock.get.mockImplementation((key: string) => {
      switch (key) {
        case 'KEYCLOAK_URL':
          return 'http://keycloak.test';
        case 'KEYCLOAK_REALM':
          return 'carecore';
        case 'KEYCLOAK_CLIENT_ID':
          return 'client-id';
        case 'KEYCLOAK_CLIENT_SECRET':
          return 'client-secret';
        default:
          return undefined;
      }
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should throw if KEYCLOAK_URL missing', () => {
      configMock.get.mockImplementation((key: string) => {
        if (key === 'KEYCLOAK_URL') return '';
        if (key === 'KEYCLOAK_REALM') return 'carecore';
        if (key === 'KEYCLOAK_CLIENT_ID') return 'client-id';
        return undefined;
      });

      expect(() => authService.getAuthorizationUrl('state-1', 'http://localhost/cb')).toThrow(
        BadRequestException,
      );
    });

    it('should throw if client id missing', () => {
      configMock.get.mockImplementation((key: string) => {
        if (key === 'KEYCLOAK_URL') return 'http://keycloak.test';
        if (key === 'KEYCLOAK_REALM') return 'carecore';
        if (key === 'KEYCLOAK_CLIENT_ID') return '';
        return undefined;
      });

      expect(() => authService.getAuthorizationUrl('state-2', 'http://localhost/cb')).toThrow(
        BadRequestException,
      );
    });

    it('should build auth URL when inputs valid', () => {
      configMock.get.mockImplementation((key: string) => {
        switch (key) {
          case 'KEYCLOAK_URL':
            return 'http://keycloak.test';
          case 'KEYCLOAK_REALM':
            return 'carecore';
          case 'KEYCLOAK_CLIENT_ID':
            return 'client-id';
          default:
            return undefined;
        }
      });

      const url = authService.getAuthorizationUrl('state-3', 'http://localhost/cb');
      expect(url).toContain('http://keycloak.test/realms/carecore/protocol/openid-connect/auth');
      expect(url).toContain('client_id=client-id');
      expect(url).toContain('state=state-3');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%2Fcb');
    });
  });

  describe('validateStateToken', () => {
    it('should throw when state missing', () => {
      expect(() => authService.validateStateToken('', undefined)).toThrow(UnauthorizedException);
    });

    it('should throw when mismatch', () => {
      expect(() => authService.validateStateToken('a', 'b')).toThrow(UnauthorizedException);
    });

    it('should pass when matches', () => {
      expect(() => authService.validateStateToken('x', 'x')).not.toThrow();
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should throw when code is missing', async () => {
      await expect(authService.exchangeCodeForTokens('', 'http://localhost/cb')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw when client secret missing', async () => {
      configMock.get.mockImplementation((key: string) => {
        if (key === 'KEYCLOAK_URL') return 'http://keycloak.test';
        if (key === 'KEYCLOAK_REALM') return 'carecore';
        if (key === 'KEYCLOAK_CLIENT_ID') return 'client-id';
        if (key === 'KEYCLOAK_CLIENT_SECRET') return '';
        return undefined;
      });

      await expect(
        authService.exchangeCodeForTokens('code-1', 'http://localhost/cb'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw Unauthorized when Keycloak returns error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'error',
      });

      await expect(
        authService.exchangeCodeForTokens('code-2', 'http://localhost/cb'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on success', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'access',
          refresh_token: 'refresh',
          expires_in: 300,
          token_type: 'Bearer',
        }),
      });

      const result = await authService.exchangeCodeForTokens('code-3', 'http://localhost/cb');
      expect(result.accessToken).toBe('access');
      expect(result.refreshToken).toBe('refresh');
      expect(result.expiresIn).toBe(300);
      expect(result.tokenType).toBe('Bearer');
    });
  });

  describe('refreshToken', () => {
    it('should throw when refresh token missing', async () => {
      await expect(authService.refreshToken('')).rejects.toThrow(BadRequestException);
    });

    it('should throw when client secret missing', async () => {
      configMock.get.mockImplementation((key: string) => {
        if (key === 'KEYCLOAK_URL') return 'http://keycloak.test';
        if (key === 'KEYCLOAK_REALM') return 'carecore';
        if (key === 'KEYCLOAK_CLIENT_ID') return 'client-id';
        if (key === 'KEYCLOAK_CLIENT_SECRET') return '';
        return undefined;
      });

      await expect(authService.refreshToken('rt-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw Unauthorized when refresh fails', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'invalid token',
      });

      await expect(authService.refreshToken('rt-2')).rejects.toThrow(UnauthorizedException);
    });

    it('should return tokens on refresh success', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: 'new-access',
          refresh_token: 'new-refresh',
          expires_in: 600,
          token_type: 'Bearer',
        }),
      });

      const result = await authService.refreshToken('rt-3');
      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
      expect(result.expiresIn).toBe(600);
      expect(result.tokenType).toBe('Bearer');
    });
  });

  describe('logout', () => {
    it('should throw when refresh token missing', async () => {
      await expect(authService.logout('')).rejects.toThrow(BadRequestException);
    });

    it('should throw when client secret missing', async () => {
      configMock.get.mockImplementation((key: string) => {
        if (key === 'KEYCLOAK_URL') return 'http://keycloak.test';
        if (key === 'KEYCLOAK_REALM') return 'carecore';
        if (key === 'KEYCLOAK_CLIENT_ID') return 'client-id';
        if (key === 'KEYCLOAK_CLIENT_SECRET') return '';
        return undefined;
      });

      await expect(authService.logout('rt-4')).rejects.toThrow(BadRequestException);
    });

    it('should resolve even if revoke fails (Keycloak not critical)', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => 'invalid',
      });

      await expect(authService.logout('rt-5')).resolves.toBeUndefined();
    });

    it('should resolve on successful revoke', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
      });

      await expect(authService.logout('rt-6')).resolves.toBeUndefined();
    });
  });

  describe('getUserInfoFromKeycloak', () => {
    it('should throw when KEYCLOAK_URL missing', async () => {
      configMock.get.mockImplementation((key: string) => {
        if (key === 'KEYCLOAK_URL') return '';
        if (key === 'KEYCLOAK_REALM') return 'carecore';
        return undefined;
      });

      await expect(authService.getUserInfoFromKeycloak('token-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw Unauthorized when Keycloak responds with error', async () => {
      fetchMock.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'unauthorized',
      });

      await expect(authService.getUserInfoFromKeycloak('token-2')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should return user info on success', async () => {
      fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
          sub: 'user-123',
          preferred_username: 'jdoe',
          email: 'jdoe@test.com',
          name: 'John Doe',
          given_name: 'John',
          family_name: 'Doe',
        }),
      });

      const user = await authService.getUserInfoFromKeycloak('token-3');
      expect(user.id).toBe('user-123');
      expect(user.username).toBe('jdoe');
      expect(user.email).toBe('jdoe@test.com');
      expect(user.givenName).toBe('John');
      expect(user.familyName).toBe('Doe');
    });
  });
});
