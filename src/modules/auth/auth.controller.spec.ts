import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './interfaces/user.interface';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    getAuthorizationUrl: jest.fn(),
    handleCallback: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    getUserInfo: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-123',
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
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should redirect to authorization URL', async () => {
      const mockResponse = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      mockAuthService.getAuthorizationUrl.mockReturnValue('http://keycloak/auth');

      await controller.login(mockResponse);

      expect(mockAuthService.getAuthorizationUrl).toHaveBeenCalled();
      expect(mockResponse.redirect).toHaveBeenCalledWith('http://keycloak/auth');
    });

    it('should return error if authorization URL is empty', async () => {
      const mockResponse = {
        redirect: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      mockAuthService.getAuthorizationUrl.mockReturnValue('');

      await controller.login(mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Authentication service not configured',
      });
    });
  });

  describe('callback', () => {
    it('should handle callback successfully', async () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      mockAuthService.handleCallback.mockResolvedValue({
        accessToken: 'token',
        refreshToken: 'refresh',
        user: mockUser,
      });

      await controller.callback('code123', 'state123', mockResponse);

      expect(mockAuthService.handleCallback).toHaveBeenCalledWith('code123', 'state123');
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
    });

    it('should return error if code is missing', async () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      await controller.callback('', 'state123', mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Authorization code is required',
      });
    });

    it('should handle callback errors', async () => {
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      } as unknown as Response;

      mockAuthService.handleCallback.mockRejectedValue(new Error('Callback failed'));

      await controller.callback('code123', 'state123', mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Failed to process authentication callback',
        error: 'Callback failed',
      });
    });
  });

  describe('refresh', () => {
    it('should refresh token successfully', async () => {
      mockAuthService.refreshToken.mockResolvedValue({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
      });

      const result = await controller.refresh('refresh-token');

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('refresh-token');
      expect(result).toEqual({
        accessToken: 'new-token',
        refreshToken: 'new-refresh',
      });
    });

    it('should throw error if refresh token is missing', async () => {
      await expect(controller.refresh('')).rejects.toThrow('Refresh token is required');
    });
  });

  describe('logout', () => {
    it('should logout successfully', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const result = await controller.logout('refresh-token');

      expect(mockAuthService.logout).toHaveBeenCalledWith('refresh-token');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should throw error if refresh token is missing', async () => {
      await expect(controller.logout('')).rejects.toThrow('Refresh token is required');
    });
  });

  describe('getUser', () => {
    it('should return current user', async () => {
      const result = await controller.getUser(mockUser);

      expect(result).toEqual(mockUser);
    });
  });
});
