import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { User } from '../interfaces/user.interface';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  const mockGetAllAndOverride = jest.fn();
  const mockReflector = {
    getAllAndOverride: mockGetAllAndOverride,
  } as unknown as Reflector;

  const mockUser: User = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    roles: ['patient', 'user'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    const mockContext = {
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;

    it('should allow access for public routes', () => {
      mockGetAllAndOverride.mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockGetAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
    });

    it('should call parent canActivate for protected routes', () => {
      mockGetAllAndOverride.mockReturnValue(false);

      // Mock parent canActivate
      const parentCanActivate = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(mockGetAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [
        mockContext.getHandler(),
        mockContext.getClass(),
      ]);
      expect(parentCanActivate).toHaveBeenCalledWith(mockContext);

      parentCanActivate.mockRestore();
    });

    it('should call parent canActivate when route is not marked as public', () => {
      mockGetAllAndOverride.mockReturnValue(undefined);

      const parentCanActivate = jest
        .spyOn(Object.getPrototypeOf(JwtAuthGuard.prototype), 'canActivate')
        .mockReturnValue(true);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
      expect(parentCanActivate).toHaveBeenCalledWith(mockContext);

      parentCanActivate.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('should return user when authentication succeeds', () => {
      const result = guard.handleRequest(null, mockUser, undefined);

      expect(result).toBe(mockUser);
    });

    it('should throw UnauthorizedException when there is an error', () => {
      const error = new Error('Token expired');

      expect(() => {
        guard.handleRequest(error, false, undefined);
      }).toThrow(UnauthorizedException);

      expect(() => {
        guard.handleRequest(error, false, undefined);
      }).toThrow('Token expired');
    });

    it('should throw UnauthorizedException when user is false', () => {
      expect(() => {
        guard.handleRequest(null, false, undefined);
      }).toThrow(UnauthorizedException);

      expect(() => {
        guard.handleRequest(null, false, undefined);
      }).toThrow('Invalid or expired token');
    });

    it('should throw UnauthorizedException when user is null', () => {
      expect(() => {
        guard.handleRequest(null, null as unknown as false, undefined);
      }).toThrow(UnauthorizedException);
    });

    it('should use info message when error is null but user is false', () => {
      const info = 'Token expired';

      expect(() => {
        guard.handleRequest(null, false, info);
      }).toThrow(UnauthorizedException);

      expect(() => {
        guard.handleRequest(null, false, info);
      }).toThrow('Token expired');
    });

    it('should use error message when both error and info are present', () => {
      const error = new Error('Custom error');
      const info = 'Token expired';

      expect(() => {
        guard.handleRequest(error, false, info);
      }).toThrow(UnauthorizedException);

      expect(() => {
        guard.handleRequest(error, false, info);
      }).toThrow('Custom error');
    });

    it('should handle Error object in info parameter', () => {
      const infoError = new Error('Info error');

      expect(() => {
        guard.handleRequest(null, false, infoError);
      }).toThrow(UnauthorizedException);

      expect(() => {
        guard.handleRequest(null, false, infoError);
      }).toThrow('Info error');
    });
  });
});
