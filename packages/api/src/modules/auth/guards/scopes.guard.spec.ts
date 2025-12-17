import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';

import { ScopesGuard } from './scopes.guard';
import { InsufficientScopesException } from '../exceptions/insufficient-scopes.exception';
import { User } from '@carecore/shared';
import { SCOPES_KEY } from '../decorators/scopes.decorator';

describe('ScopesGuard', () => {
  let guard: ScopesGuard;
  let reflector: Reflector;
  let mockLogger: jest.Mocked<PinoLogger>;

  const mockUser: User = {
    id: 'user-123',
    keycloakUserId: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    roles: ['patient'],
    scopes: ['patient:read', 'patient:write', 'document:read'],
  };

  const mockExecutionContext = (user?: User, requiredScopes?: string[]) => {
    const request = {
      user,
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as ExecutionContext;

    // Mock reflector to return required scopes
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredScopes);

    return context;
  };

  beforeEach(() => {
    reflector = new Reflector();
    mockLogger = {
      setContext: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>;
    guard = new ScopesGuard(reflector, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('canActivate', () => {
    it('should allow access when no scopes are required', () => {
      const context = mockExecutionContext(mockUser, undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(SCOPES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
    });

    it('should allow access when required scopes array is empty', () => {
      const context = mockExecutionContext(mockUser, []);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when user has all required scopes', () => {
      const context = mockExecutionContext(mockUser, ['patient:read']);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
      expect(mockLogger.debug).toHaveBeenCalledWith(
        {
          userId: mockUser.id,
          username: mockUser.username,
          requiredScopes: ['patient:read'],
        },
        'Scope validation successful',
      );
    });

    it('should allow access when user has all required scopes (multiple)', () => {
      const context = mockExecutionContext(mockUser, ['patient:read', 'patient:write']);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw InsufficientScopesException when user is missing', () => {
      const context = mockExecutionContext(undefined, ['patient:read']);

      expect(() => guard.canActivate(context)).toThrow(InsufficientScopesException);

      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientScopesException);
        const scopeError = error as InsufficientScopesException;
        expect(scopeError.getStatus()).toBe(403);
        expect(scopeError.message).toContain('Insufficient scopes');
        expect(scopeError.getResponse()).toMatchObject({
          requiredScopes: ['patient:read'],
          userScopes: [],
        });
      }
    });

    it('should throw InsufficientScopesException when user has no scopes', () => {
      const userWithoutScopes: User = {
        ...mockUser,
        scopes: [],
      };
      const context = mockExecutionContext(userWithoutScopes, ['patient:read']);

      expect(() => guard.canActivate(context)).toThrow(InsufficientScopesException);

      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientScopesException);
        const scopeError = error as InsufficientScopesException;
        expect(scopeError.getResponse()).toMatchObject({
          requiredScopes: ['patient:read'],
          userScopes: [],
        });
      }
    });

    it('should throw InsufficientScopesException when user is missing one required scope', () => {
      const context = mockExecutionContext(mockUser, ['patient:read', 'consent:read']);

      expect(() => guard.canActivate(context)).toThrow(InsufficientScopesException);

      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientScopesException);
        const scopeError = error as InsufficientScopesException;
        expect(scopeError.getResponse()).toMatchObject({
          requiredScopes: ['patient:read', 'consent:read'],
          userScopes: ['patient:read', 'patient:write', 'document:read'],
        });
        expect(mockLogger.warn).toHaveBeenCalledWith(
          {
            userId: mockUser.id,
            username: mockUser.username,
            requiredScopes: ['patient:read', 'consent:read'],
            userScopes: ['patient:read', 'patient:write', 'document:read'],
            missingScopes: ['consent:read'],
          },
          'Scope validation failed - user missing required scopes',
        );
      }
    });

    it('should throw InsufficientScopesException when user is missing all required scopes', () => {
      const context = mockExecutionContext(mockUser, ['practitioner:read', 'practitioner:write']);

      expect(() => guard.canActivate(context)).toThrow(InsufficientScopesException);

      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientScopesException);
        const scopeError = error as InsufficientScopesException;
        expect(scopeError.getResponse()).toMatchObject({
          requiredScopes: ['practitioner:read', 'practitioner:write'],
          userScopes: ['patient:read', 'patient:write', 'document:read'],
        });
      }
    });

    it('should handle user with undefined scopes property', () => {
      const userWithoutScopesProperty: User = {
        ...mockUser,
        scopes: undefined,
      };
      const context = mockExecutionContext(userWithoutScopesProperty, ['patient:read']);

      expect(() => guard.canActivate(context)).toThrow(InsufficientScopesException);

      try {
        guard.canActivate(context);
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientScopesException);
        const scopeError = error as InsufficientScopesException;
        expect(scopeError.getResponse()).toMatchObject({
          requiredScopes: ['patient:read'],
          userScopes: [],
        });
      }
    });

    it('should validate exact scope matches', () => {
      const context = mockExecutionContext(mockUser, ['patient:read']);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should not allow partial scope matches', () => {
      const context = mockExecutionContext(mockUser, ['patient:delete']);

      expect(() => guard.canActivate(context)).toThrow(InsufficientScopesException);
    });

    it('should handle case-sensitive scope matching', () => {
      const context = mockExecutionContext(mockUser, ['Patient:read']);

      expect(() => guard.canActivate(context)).toThrow(InsufficientScopesException);
    });
  });
});
