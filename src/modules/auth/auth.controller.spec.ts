import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
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

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './interfaces/user.interface';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    generateStateToken: jest.fn(),
    getAuthorizationUrl: jest.fn(),
    handleCallback: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    getUserInfo: jest.fn(),
  };

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

  const mockUser: User = {
    id: 'user-123',
    keycloakUserId: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    roles: ['patient', 'user'],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
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

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should redirect to authorization URL', async () => {
      const mockRequest = {
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
        query: {},
      } as unknown as Request;

      const mockResponse = {
        redirect: jest.fn(),
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockStateToken = 'state-token-123';
      mockAuthService.generateStateToken.mockReturnValue(mockStateToken);
      mockAuthService.getAuthorizationUrl.mockReturnValue('http://keycloak/auth');

      await controller.login(mockRequest, mockResponse, undefined);

      expect(mockAuthService.generateStateToken).toHaveBeenCalled();
      expect(mockAuthService.getAuthorizationUrl).toHaveBeenCalledWith(
        mockStateToken,
        'http://localhost:3000/api/auth/callback',
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'oauth_state',
        mockStateToken,
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 10 * 60 * 1000,
          path: '/api/auth',
        }),
      );
      expect(mockResponse.redirect).toHaveBeenCalledWith('http://keycloak/auth');
    });

    it('should return JSON when returnUrl=true', async () => {
      const mockRequest = {
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
        query: { returnUrl: 'true' },
      } as unknown as Request;

      const mockResponse = {
        redirect: jest.fn(),
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockStateToken = 'state-token-123';
      mockAuthService.generateStateToken.mockReturnValue(mockStateToken);
      mockAuthService.getAuthorizationUrl.mockReturnValue('http://keycloak/auth');

      await controller.login(mockRequest, mockResponse, 'true');

      expect(mockAuthService.generateStateToken).toHaveBeenCalled();
      expect(mockResponse.cookie).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({
        authorizationUrl: 'http://keycloak/auth',
        state: mockStateToken,
        message: expect.stringContaining('Visit this URL'),
      });
      expect(mockResponse.redirect).not.toHaveBeenCalled();
    });

    it('should handle BadRequestException from getAuthorizationUrl', async () => {
      const mockRequest = {
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
      } as unknown as Request;

      const mockResponse = {
        redirect: jest.fn(),
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockStateToken = 'state-token-123';
      mockAuthService.generateStateToken.mockReturnValue(mockStateToken);
      mockAuthService.getAuthorizationUrl.mockImplementation(() => {
        throw new BadRequestException('Keycloak URL is not configured');
      });

      await controller.login(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Keycloak URL is not configured',
      });
    });

    it('should handle generic errors', async () => {
      const mockRequest = {
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
      } as unknown as Request;

      const mockResponse = {
        redirect: jest.fn(),
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      const mockStateToken = 'state-token-123';
      mockAuthService.generateStateToken.mockReturnValue(mockStateToken);
      mockAuthService.getAuthorizationUrl.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      await controller.login(mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Unexpected error',
      });
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('callback', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL' || key === 'CLIENT_URL') {
          return 'http://localhost:3001';
        }
        return null;
      });
    });

    it('should handle callback successfully and redirect to frontend', async () => {
      const mockRequest = {
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
        cookies: {
          oauth_state: 'state123',
        },
      } as unknown as Request;

      const mockResponse = {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      mockAuthService.handleCallback.mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        expiresIn: 3600,
        tokenType: 'Bearer',
        user: mockUser,
      });

      await controller.callback('code123', 'state123', mockRequest, mockResponse);

      expect(mockAuthService.handleCallback).toHaveBeenCalledWith(
        'code123',
        'state123',
        'state123',
        'http://localhost:3000/api/auth/callback',
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'access-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 3600000,
          path: '/',
        }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'refresh-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        }),
      );
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('oauth_state', {
        path: '/api/auth',
      });
      expect(mockResponse.redirect).toHaveBeenCalledWith('http://localhost:3001?auth=success');
    });

    it('should return error if code is missing', async () => {
      const mockRequest = {
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
      } as unknown as Request;

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await controller.callback('', 'state123', mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Authorization code and state are required',
      });
    });

    it('should return error if state is missing', async () => {
      const mockRequest = {
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
      } as unknown as Request;

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await controller.callback('code123', '', mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Authorization code and state are required',
      });
    });

    it('should redirect to frontend with error on callback failure', async () => {
      const mockRequest = {
        protocol: 'http',
        get: jest.fn().mockReturnValue('localhost:3000'),
        cookies: {
          oauth_state: 'state123',
        },
      } as unknown as Request;

      const mockResponse = {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      mockAuthService.handleCallback.mockRejectedValue(
        new UnauthorizedException('Invalid state token'),
      );

      await controller.callback('code123', 'state123', mockRequest, mockResponse);

      expect(mockResponse.redirect).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3001?auth=error&message='),
      );
    });
  });

  describe('refresh', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL' || key === 'CLIENT_URL') {
          return 'http://localhost:3001';
        }
        return null;
      });
    });

    it('should refresh token successfully from body', async () => {
      const mockRequest = {
        cookies: {},
      } as unknown as Request;

      const mockResponse = {
        cookie: jest.fn(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });

      await controller.refresh('refresh-token', mockRequest, mockResponse);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('refresh-token');
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'new-token',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          maxAge: 3600000,
          path: '/',
        }),
      );
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'refresh_token',
        'new-refresh',
        expect.objectContaining({
          httpOnly: true,
          secure: false,
          sameSite: 'lax',
          path: '/',
        }),
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });
    });

    it('should refresh token successfully from cookie', async () => {
      const mockRequest = {
        cookies: {
          refresh_token: 'refresh-token-from-cookie',
        },
      } as unknown as Request;

      const mockResponse = {
        cookie: jest.fn(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
        expiresIn: 3600,
        tokenType: 'Bearer',
      });

      await controller.refresh(undefined, mockRequest, mockResponse);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('refresh-token-from-cookie');
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should return 400 if refresh token is missing', async () => {
      const mockRequest = {
        cookies: {},
      } as unknown as Request;

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await controller.refresh(undefined, mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Refresh token is required. Provide it in the request body or as a cookie.',
      });
    });

    it('should handle UnauthorizedException', async () => {
      const mockRequest = {
        cookies: {},
      } as unknown as Request;

      const mockResponse = {
        cookie: jest.fn(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      mockAuthService.refreshToken.mockRejectedValue(
        new UnauthorizedException('Refresh token is invalid or expired'),
      );

      await controller.refresh('invalid-token', mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Refresh token is invalid or expired',
        error: 'Refresh token is invalid or expired',
      });
    });

    it('should handle BadRequestException', async () => {
      const mockRequest = {
        cookies: {},
      } as unknown as Request;

      const mockResponse = {
        cookie: jest.fn(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      mockAuthService.refreshToken.mockRejectedValue(
        new BadRequestException('Keycloak URL is not configured'),
      );

      await controller.refresh('refresh-token', mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Keycloak URL is not configured',
        error: 'Keycloak URL is not configured',
      });
    });

    it('should not update refresh token cookie if same token is returned', async () => {
      const mockRequest = {
        cookies: {},
      } as unknown as Request;

      const mockResponse = {
        cookie: jest.fn(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      const refreshToken = 'same-refresh-token';
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: refreshToken, // Same token
        expiresIn: 3600,
        tokenType: 'Bearer',
      });

      await controller.refresh(refreshToken, mockRequest, mockResponse);

      // Should set access_token cookie
      expect(mockResponse.cookie).toHaveBeenCalledWith(
        'access_token',
        'new-token',
        expect.any(Object),
      );
      // Should NOT set refresh_token cookie if same token
      expect(mockResponse.cookie).not.toHaveBeenCalledWith(
        'refresh_token',
        expect.any(String),
        expect.any(Object),
      );
    });
  });

  describe('logout', () => {
    it('should logout successfully from body', async () => {
      const mockRequest = {
        cookies: {},
      } as unknown as Request;

      const mockResponse = {
        clearCookie: jest.fn(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout('refresh-token', mockRequest, mockResponse);

      expect(mockAuthService.logout).toHaveBeenCalledWith('refresh-token');
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('access_token', expect.any(Object));
      expect(mockResponse.clearCookie).toHaveBeenCalledWith('refresh_token', expect.any(Object));
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Logged out successfully',
      });
    });

    it('should logout successfully from cookie', async () => {
      const mockRequest = {
        cookies: {
          refresh_token: 'refresh-token-from-cookie',
        },
      } as unknown as Request;

      const mockResponse = {
        clearCookie: jest.fn(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      mockAuthService.logout.mockResolvedValue(undefined);

      await controller.logout(undefined, mockRequest, mockResponse);

      expect(mockAuthService.logout).toHaveBeenCalledWith('refresh-token-from-cookie');
      expect(mockResponse.json).toHaveBeenCalled();
    });

    it('should return 400 if refresh token is missing', async () => {
      const mockRequest = {
        cookies: {},
      } as unknown as Request;

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await controller.logout(undefined, mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Refresh token is required. Provide it in the request body or as a cookie.',
      });
    });

    it('should handle BadRequestException', async () => {
      const mockRequest = {
        cookies: {},
      } as unknown as Request;

      const mockResponse = {
        clearCookie: jest.fn(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      mockAuthService.logout.mockRejectedValue(
        new BadRequestException('Keycloak URL is not configured'),
      );

      await controller.logout('refresh-token', mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Keycloak URL is not configured',
        error: 'Keycloak URL is not configured',
      });
    });

    it('should handle generic errors', async () => {
      const mockRequest = {
        cookies: {},
      } as unknown as Request;

      const mockResponse = {
        clearCookie: jest.fn(),
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;

      mockAuthService.logout.mockRejectedValue(new Error('Network error'));

      await controller.logout('refresh-token', mockRequest, mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Network error',
        error: 'Network error',
      });
    });
  });

  describe('getUser', () => {
    it('should return current user', async () => {
      const result = await controller.getUser(mockUser);

      expect(result).toEqual(mockUser);
    });
  });
});
