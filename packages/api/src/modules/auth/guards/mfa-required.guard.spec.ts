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
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import { MFARequiredGuard } from './mfa-required.guard';
import { KeycloakAdminService } from '../services/keycloak-admin.service';
import { User } from '@carecore/shared';
import { ROLES } from '../../../common/constants/roles';

describe('MFARequiredGuard', () => {
  let guard: MFARequiredGuard;
  let keycloakAdminService: jest.Mocked<KeycloakAdminService>;

  const mockKeycloakAdminService = {
    userHasMFA: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MFARequiredGuard,
        {
          provide: KeycloakAdminService,
          useValue: mockKeycloakAdminService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<MFARequiredGuard>(MFARequiredGuard);
    keycloakAdminService = module.get(KeycloakAdminService);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const createMockContext = (user?: Partial<User>): ExecutionContext => {
      const fullUser: User | undefined = user
        ? {
            id: user.id || 'user-123',
            keycloakUserId: user.keycloakUserId || user.id || 'user-123',
            username: user.username || 'testuser',
            email: user.email,
            roles: user.roles || [],
            name: user.name,
            givenName: user.givenName,
            familyName: user.familyName,
          }
        : undefined;
      return {
        switchToHttp: () => ({
          getRequest: () => ({
            user: fullUser,
          }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as ExecutionContext;
    };

    it('should allow access if no user is found (let JwtAuthGuard handle it)', async () => {
      const context = createMockContext(undefined);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(keycloakAdminService.userHasMFA).not.toHaveBeenCalled();
    });

    it('should allow access if user does not have critical role', async () => {
      const context = createMockContext({
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: [ROLES.PATIENT],
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(keycloakAdminService.userHasMFA).not.toHaveBeenCalled();
    });

    it('should allow access if user has critical role and MFA is enabled', async () => {
      keycloakAdminService.userHasMFA.mockResolvedValue(true);

      const context = createMockContext({
        id: 'admin-123',
        keycloakUserId: 'admin-123',
        username: 'admin',
        roles: [ROLES.ADMIN],
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(keycloakAdminService.userHasMFA).toHaveBeenCalledWith('admin-123');
    });

    it('should allow access if practitioner has critical role and MFA is enabled', async () => {
      keycloakAdminService.userHasMFA.mockResolvedValue(true);

      const context = createMockContext({
        id: 'practitioner-123',
        keycloakUserId: 'practitioner-123',
        username: 'practitioner',
        roles: [ROLES.PRACTITIONER],
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(keycloakAdminService.userHasMFA).toHaveBeenCalledWith('practitioner-123');
    });

    it('should throw ForbiddenException if admin has critical role but MFA is not enabled', async () => {
      keycloakAdminService.userHasMFA.mockResolvedValue(false);

      const context = createMockContext({
        id: 'admin-123',
        keycloakUserId: 'admin-123',
        username: 'admin',
        roles: [ROLES.ADMIN],
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'MFA is required for your role. Please configure MFA first.',
      );
      expect(keycloakAdminService.userHasMFA).toHaveBeenCalledWith('admin-123');
    });

    it('should throw ForbiddenException if practitioner has critical role but MFA is not enabled', async () => {
      keycloakAdminService.userHasMFA.mockResolvedValue(false);

      const context = createMockContext({
        id: 'practitioner-123',
        keycloakUserId: 'practitioner-123',
        username: 'practitioner',
        roles: [ROLES.PRACTITIONER],
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow(
        'MFA is required for your role. Please configure MFA first.',
      );
      expect(keycloakAdminService.userHasMFA).toHaveBeenCalledWith('practitioner-123');
    });

    it('should throw ForbiddenException with correct error structure', async () => {
      keycloakAdminService.userHasMFA.mockResolvedValue(false);

      const context = createMockContext({
        id: 'admin-123',
        keycloakUserId: 'admin-123',
        username: 'admin',
        roles: [ROLES.ADMIN],
      });

      try {
        await guard.canActivate(context);
        fail('Should have thrown ForbiddenException');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
        const exception = error as ForbiddenException;
        expect(exception.getResponse()).toMatchObject({
          statusCode: 403,
          message: 'MFA is required for your role. Please configure MFA first.',
          error: 'Forbidden',
          mfaSetupUrl: '/api/auth/mfa/setup',
        });
      }
    });

    it('should allow access if Keycloak service throws non-ForbiddenException error (fail open)', async () => {
      keycloakAdminService.userHasMFA.mockRejectedValue(new Error('Keycloak connection error'));

      const context = createMockContext({
        id: 'admin-123',
        keycloakUserId: 'admin-123',
        username: 'admin',
        roles: [ROLES.ADMIN],
      });

      // Mock console.error to avoid noise in test output
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error checking MFA status:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should re-throw ForbiddenException if Keycloak service throws it', async () => {
      const forbiddenError = new ForbiddenException('Custom forbidden error');
      keycloakAdminService.userHasMFA.mockRejectedValue(forbiddenError);

      const context = createMockContext({
        id: 'admin-123',
        keycloakUserId: 'admin-123',
        username: 'admin',
        roles: [ROLES.ADMIN],
      });

      await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
      await expect(guard.canActivate(context)).rejects.toThrow('Custom forbidden error');
    });

    it('should allow access if user has multiple roles including non-critical ones', async () => {
      keycloakAdminService.userHasMFA.mockResolvedValue(true);

      const context = createMockContext({
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'user',
        roles: [ROLES.PATIENT, ROLES.VIEWER],
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(keycloakAdminService.userHasMFA).not.toHaveBeenCalled();
    });

    it('should check MFA if user has both critical and non-critical roles', async () => {
      keycloakAdminService.userHasMFA.mockResolvedValue(true);

      const context = createMockContext({
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'user',
        roles: [ROLES.ADMIN, ROLES.PATIENT],
      });

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(keycloakAdminService.userHasMFA).toHaveBeenCalledWith('user-123');
    });
  });
});
