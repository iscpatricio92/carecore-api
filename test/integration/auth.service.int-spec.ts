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

  beforeAll(async () => {
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
});
