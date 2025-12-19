import { Test, TestingModule } from '@nestjs/testing';
import {
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
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
import { User } from '@carecore/shared';
import { MFARequiredGuard } from './guards/mfa-required.guard';
import { KeycloakAdminService } from './services/keycloak-admin.service';
import { DocumentType } from './dto/verify-practitioner.dto';
import { ReviewStatus } from './dto/review-verification.dto';
import { VerificationStatus } from '../../entities/practitioner-verification.entity';
import { RegisterPatientDto, RegisterPatientResponseDto } from './dto/register-patient.dto';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    generateStateToken: jest.fn(),
    getAuthorizationUrl: jest.fn(),
    handleCallback: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    getUserInfo: jest.fn(),
    requestVerification: jest.fn(),
    listVerifications: jest.fn(),
    getVerificationById: jest.fn(),
    reviewVerification: jest.fn(),
    setupMFA: jest.fn(),
    verifyMFASetup: jest.fn(),
    disableMFA: jest.fn(),
    getMFAStatus: jest.fn(),
    registerPatient: jest.fn(),
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

  const mockKeycloakAdminService = {
    userHasMFA: jest.fn(),
    findUserById: jest.fn(),
    getUserRoles: jest.fn(),
    addRoleToUser: jest.fn(),
    removeRoleFromUser: jest.fn(),
    updateUserRoles: jest.fn(),
    userHasRole: jest.fn(),
    generateTOTPSecret: jest.fn(),
    verifyTOTPCode: jest.fn(),
    verifyAndEnableTOTP: jest.fn(),
    removeTOTPCredential: jest.fn(),
  };

  const mockMFARequiredGuard = {
    canActivate: jest.fn().mockReturnValue(true),
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
        {
          provide: KeycloakAdminService,
          useValue: mockKeycloakAdminService,
        },
        {
          provide: MFARequiredGuard,
          useValue: mockMFARequiredGuard,
        },
      ],
    })
      .overrideGuard(MFARequiredGuard)
      .useValue(mockMFARequiredGuard)
      .compile();

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

      await controller.refresh('refresh-token', undefined, mockRequest, mockResponse);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith('refresh-token', undefined);
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

      await controller.refresh(undefined, undefined, mockRequest, mockResponse);

      expect(mockAuthService.refreshToken).toHaveBeenCalledWith(
        'refresh-token-from-cookie',
        undefined,
      );
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

      await controller.refresh(undefined, undefined, mockRequest, mockResponse);

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

      await controller.refresh('invalid-token', undefined, mockRequest, mockResponse);

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

      await controller.refresh('refresh-token', undefined, mockRequest, mockResponse);

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

      await controller.refresh(refreshToken, undefined, mockRequest, mockResponse);

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

  describe('verifyPractitioner', () => {
    it('should submit verification request successfully', async () => {
      const dto = {
        practitionerId: 'practitioner-123',
        documentType: DocumentType.CEDULA,
        additionalInfo: 'Test info',
      };
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'cedula.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      const expectedResult = {
        verificationId: 'verification-123',
        status: 'pending',
        message: 'Verification request submitted successfully',
        estimatedReviewTime: '2-3 business days',
      };

      mockAuthService.requestVerification.mockResolvedValue(expectedResult);

      const result = await controller.verifyPractitioner(dto, mockFile, mockUser);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.requestVerification).toHaveBeenCalledWith(dto, mockFile, mockUser.id);
    });

    it('should throw BadRequestException on validation error', async () => {
      const dto = {
        practitionerId: 'practitioner-123',
        documentType: DocumentType.CEDULA,
      };
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'cedula.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      mockAuthService.requestVerification.mockRejectedValue(
        new BadRequestException('Invalid file format'),
      );

      await expect(controller.verifyPractitioner(dto, mockFile, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw BadRequestException on generic error', async () => {
      const dto = {
        practitionerId: 'practitioner-123',
        documentType: DocumentType.CEDULA,
      };
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'cedula.pdf',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      mockAuthService.requestVerification.mockRejectedValue(new Error('Network error'));

      await expect(controller.verifyPractitioner(dto, mockFile, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('listVerifications', () => {
    it('should return list of verifications', async () => {
      const query = { page: 1, limit: 10, status: VerificationStatus.PENDING };
      const expectedResult = {
        data: [
          {
            id: 'verification-123',
            status: VerificationStatus.PENDING,
            practitionerId: 'practitioner-123',
            documentType: 'cedula' as const,
            documentPath: 'path/to/doc.pdf',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockAuthService.listVerifications.mockResolvedValue(expectedResult);

      const result = await controller.listVerifications(query);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.listVerifications).toHaveBeenCalledWith(query);
    });
  });

  describe('getVerification', () => {
    it('should return verification details', async () => {
      const verificationId = 'verification-123';
      const expectedResult = {
        id: verificationId,
        status: VerificationStatus.PENDING,
        practitionerId: 'practitioner-123',
        documentType: 'cedula' as const,
        documentPath: 'path/to/doc.pdf',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAuthService.getVerificationById.mockResolvedValue(expectedResult);

      const result = await controller.getVerification(verificationId);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.getVerificationById).toHaveBeenCalledWith(verificationId);
    });
  });

  describe('reviewVerification', () => {
    it('should review verification successfully', async () => {
      const verificationId = 'verification-123';
      const dto = {
        status: ReviewStatus.APPROVED,
      };
      const expectedResult = {
        verificationId,
        status: 'approved' as const,
        reviewedBy: mockUser.id,
        reviewedAt: new Date().toISOString(),
        message: 'Verification approved successfully',
      };

      mockAuthService.reviewVerification.mockResolvedValue(expectedResult);

      const result = await controller.reviewVerification(verificationId, dto, mockUser);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.reviewVerification).toHaveBeenCalledWith(
        verificationId,
        dto,
        mockUser.id,
      );
    });

    it('should throw BadRequestException on validation error', async () => {
      const verificationId = 'verification-123';
      const dto = {
        status: ReviewStatus.REJECTED,
        rejectionReason: 'Invalid document',
      };

      mockAuthService.reviewVerification.mockRejectedValue(
        new BadRequestException('Verification is not in pending status'),
      );

      await expect(controller.reviewVerification(verificationId, dto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw NotFoundException when verification not found', async () => {
      const verificationId = 'non-existent';
      const dto = {
        status: ReviewStatus.APPROVED,
      };

      mockAuthService.reviewVerification.mockRejectedValue(
        new NotFoundException('Verification not found'),
      );

      await expect(controller.reviewVerification(verificationId, dto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException on generic error', async () => {
      const verificationId = 'verification-123';
      const dto = {
        status: ReviewStatus.APPROVED,
      };

      mockAuthService.reviewVerification.mockRejectedValue(new Error('Network error'));

      await expect(controller.reviewVerification(verificationId, dto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('setupMFA', () => {
    it('should setup MFA successfully', async () => {
      const expectedResult = {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANS...',
        backupCodes: ['12345678', '87654321'],
      };

      mockAuthService.setupMFA.mockResolvedValue(expectedResult);

      const result = await controller.setupMFA(mockUser);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.setupMFA).toHaveBeenCalledWith(
        mockUser.keycloakUserId,
        mockUser.email || mockUser.username || 'user@example.com',
      );
    });

    it('should throw BadRequestException when MFA already configured', async () => {
      mockAuthService.setupMFA.mockRejectedValue(
        new BadRequestException('MFA is already configured for this user'),
      );

      await expect(controller.setupMFA(mockUser)).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw BadRequestException on generic error', async () => {
      mockAuthService.setupMFA.mockRejectedValue(new Error('Network error'));

      await expect(controller.setupMFA(mockUser)).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should use username when email is not available', async () => {
      const userWithoutEmail = { ...mockUser, email: undefined };
      const expectedResult = {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCode: 'data:image/png;base64,...',
        backupCodes: [],
      };

      mockAuthService.setupMFA.mockResolvedValue(expectedResult);

      await controller.setupMFA(userWithoutEmail);

      expect(mockAuthService.setupMFA).toHaveBeenCalledWith(
        userWithoutEmail.keycloakUserId,
        userWithoutEmail.username,
      );
    });
  });

  describe('verifyMFA', () => {
    it('should verify MFA successfully', async () => {
      const dto = { code: '123456' };
      const expectedResult = {
        success: true,
        message: 'MFA verified and enabled successfully',
        mfaEnabled: true,
      };

      mockAuthService.verifyMFASetup.mockResolvedValue(expectedResult);

      const result = await controller.verifyMFA(dto, mockUser);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.verifyMFASetup).toHaveBeenCalledWith(
        mockUser.keycloakUserId,
        dto.code,
      );
    });

    it('should throw BadRequestException on invalid code', async () => {
      const dto = { code: '000000' };

      mockAuthService.verifyMFASetup.mockRejectedValue(
        new BadRequestException('Invalid TOTP code'),
      );

      await expect(controller.verifyMFA(dto, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw BadRequestException on generic error', async () => {
      const dto = { code: '123456' };

      mockAuthService.verifyMFASetup.mockRejectedValue(new Error('Network error'));

      await expect(controller.verifyMFA(dto, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('disableMFA', () => {
    it('should disable MFA successfully', async () => {
      const dto = { code: '123456' };
      const expectedResult = {
        success: true,
        message: 'MFA disabled successfully',
        mfaEnabled: false,
      };

      mockAuthService.disableMFA.mockResolvedValue(expectedResult);

      const result = await controller.disableMFA(dto, mockUser);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.disableMFA).toHaveBeenCalledWith(mockUser.keycloakUserId, dto.code);
    });

    it('should throw BadRequestException on invalid code', async () => {
      const dto = { code: '000000' };

      mockAuthService.disableMFA.mockRejectedValue(new BadRequestException('Invalid TOTP code'));

      await expect(controller.disableMFA(dto, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw BadRequestException when MFA not enabled', async () => {
      const dto = { code: '123456' };

      mockAuthService.disableMFA.mockRejectedValue(
        new BadRequestException('MFA is not enabled for this user'),
      );

      await expect(controller.disableMFA(dto, mockUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on generic error', async () => {
      const dto = { code: '123456' };

      mockAuthService.disableMFA.mockRejectedValue(new Error('Network error'));

      await expect(controller.disableMFA(dto, mockUser)).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getMFAStatus', () => {
    it('should return MFA status successfully', async () => {
      const expectedResult = {
        enabled: true,
        required: false,
        configured: true,
      };

      mockAuthService.getMFAStatus.mockResolvedValue(expectedResult);

      const result = await controller.getMFAStatus(mockUser);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.getMFAStatus).toHaveBeenCalledWith(mockUser.keycloakUserId);
    });

    it('should throw NotFoundException when user not found', async () => {
      mockAuthService.getMFAStatus.mockRejectedValue(new NotFoundException('User not found'));

      await expect(controller.getMFAStatus(mockUser)).rejects.toThrow(NotFoundException);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw BadRequestException on generic error', async () => {
      mockAuthService.getMFAStatus.mockRejectedValue(new Error('Network error'));

      await expect(controller.getMFAStatus(mockUser)).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('register', () => {
    const mockRegisterDto: RegisterPatientDto = {
      username: 'newpatient',
      email: 'newpatient@example.com',
      password: 'SecurePassword123!',
      name: [
        {
          given: ['John'],
          family: 'Doe',
        },
      ],
      identifier: [
        {
          system: 'http://hl7.org/fhir/sid/us-ssn',
          value: '123-45-6789',
        },
      ],
      gender: 'male',
      birthDate: '1990-01-15',
    };

    const mockResponse: RegisterPatientResponseDto = {
      userId: 'keycloak-user-id-123',
      patientId: 'patient-id-123',
      username: 'newpatient',
      email: 'newpatient@example.com',
      message: 'Patient registered successfully',
    };

    it('should register a new patient successfully', async () => {
      mockAuthService.registerPatient.mockResolvedValue(mockResponse);

      const result = await controller.register(mockRegisterDto);

      expect(result).toEqual(mockResponse);
      expect(mockAuthService.registerPatient).toHaveBeenCalledWith(mockRegisterDto);
    });

    it('should throw BadRequestException if username already exists', async () => {
      mockAuthService.registerPatient.mockRejectedValue(
        new BadRequestException('Username already exists'),
      );

      await expect(controller.register(mockRegisterDto)).rejects.toThrow(BadRequestException);
      await expect(controller.register(mockRegisterDto)).rejects.toThrow('Username already exists');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw BadRequestException if email already exists', async () => {
      mockAuthService.registerPatient.mockRejectedValue(
        new BadRequestException('Email already exists'),
      );

      await expect(controller.register(mockRegisterDto)).rejects.toThrow(BadRequestException);
      await expect(controller.register(mockRegisterDto)).rejects.toThrow('Email already exists');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw BadRequestException if identifier already exists', async () => {
      mockAuthService.registerPatient.mockRejectedValue(
        new BadRequestException('A patient with this identifier already exists'),
      );

      await expect(controller.register(mockRegisterDto)).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should throw BadRequestException on generic error', async () => {
      mockAuthService.registerPatient.mockRejectedValue(new Error('Network error'));

      await expect(controller.register(mockRegisterDto)).rejects.toThrow(BadRequestException);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
