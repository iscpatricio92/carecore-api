import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';

import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { User } from '../interfaces/user.interface';

describe('RolesGuard', () => {
  let guard: RolesGuard;

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
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

    it('should allow access if no roles are required', () => {
      mockReflector.getAllAndOverride.mockReturnValue(undefined);

      const context = createMockContext({
        id: 'user-123',
        username: 'testuser',
        roles: ['user'],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should allow access if empty roles array is required', () => {
      mockReflector.getAllAndOverride.mockReturnValue([]);

      const context = createMockContext({
        id: 'user-123',
        username: 'testuser',
        roles: ['user'],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access if user has one of the required roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin', 'practitioner']);

      const context = createMockContext({
        id: 'user-123',
        username: 'testuser',
        roles: ['user', 'admin'],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access if user has all required roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin', 'practitioner']);

      const context = createMockContext({
        id: 'user-123',
        username: 'testuser',
        roles: ['admin', 'practitioner', 'user'],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException if user does not have required roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin']);

      const context = createMockContext({
        id: 'user-123',
        username: 'testuser',
        roles: ['user'],
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Insufficient permissions. Required roles: admin. User roles: user.',
      );
    });

    it('should throw ForbiddenException if user has no roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin']);

      const context = createMockContext({
        id: 'user-123',
        username: 'testuser',
        roles: [],
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Insufficient permissions. Required roles: admin. User roles: none.',
      );
    });

    it('should throw ForbiddenException if user roles is undefined', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin']);

      const context = createMockContext({
        id: 'user-123',
        username: 'testuser',
      } as User);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Insufficient permissions. Required roles: admin. User roles: none.',
      );
    });

    it('should throw ForbiddenException if user is not found', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin']);

      const context = createMockContext(undefined);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'User not found. Ensure JwtAuthGuard is applied before RolesGuard.',
      );
    });

    it('should handle multiple required roles correctly', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin', 'practitioner', 'nurse']);

      const context = createMockContext({
        id: 'user-123',
        username: 'testuser',
        roles: ['nurse'],
      });

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException with correct message for multiple required roles', () => {
      mockReflector.getAllAndOverride.mockReturnValue(['admin', 'practitioner']);

      const context = createMockContext({
        id: 'user-123',
        username: 'testuser',
        roles: ['user', 'nurse'],
      });

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Insufficient permissions. Required roles: admin, practitioner. User roles: user, nurse.',
      );
    });
  });
});
