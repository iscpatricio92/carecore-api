import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';

import { AuditService } from './audit.service';
import { AuditLogEntity } from '../../entities/audit-log.entity';
import { User } from '@carecore/shared';
import { ROLES } from '../../common/constants/roles';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepository: jest.Mocked<Repository<AuditLogEntity>>;
  let mockLogger: jest.Mocked<PinoLogger>;

  const mockUser: User = {
    id: 'user-123',
    keycloakUserId: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    roles: [ROLES.PATIENT],
  };

  beforeEach(async () => {
    mockLogger = {
      setContext: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>;

    auditLogRepository = {
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<AuditLogEntity>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: getRepositoryToken(AuditLogEntity),
          useValue: auditLogRepository,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logAccess', () => {
    it('should log read access successfully', async () => {
      const mockAuditLog = {
        id: 'audit-123',
        action: 'read',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        userId: mockUser.id,
        userRoles: mockUser.roles,
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as unknown as AuditLogEntity);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as unknown as AuditLogEntity);

      await service.logAccess({
        action: 'read',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        user: mockUser,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        requestMethod: 'GET',
        requestPath: '/api/patients/patient-123',
        statusCode: 200,
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        action: 'read',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        userId: mockUser.id,
        userRoles: mockUser.roles,
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        requestMethod: 'GET',
        requestPath: '/api/patients/patient-123',
        statusCode: 200,
        changes: null,
        errorMessage: null,
        // SMART on FHIR fields
        clientId: null,
        clientName: null,
        launchContext: null,
        scopes: null,
      });
      expect(auditLogRepository.save).toHaveBeenCalledWith(mockAuditLog);
    });

    it('should log search access successfully', async () => {
      const mockAuditLog = {
        id: 'audit-124',
        action: 'search',
        resourceType: 'Patient',
        resourceId: null,
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as unknown as AuditLogEntity);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as unknown as AuditLogEntity);

      await service.logAccess({
        action: 'search',
        resourceType: 'Patient',
        user: mockUser,
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        action: 'search',
        resourceType: 'Patient',
        resourceId: null,
        userId: mockUser.id,
        userRoles: mockUser.roles,
        ipAddress: null,
        userAgent: null,
        requestMethod: null,
        requestPath: null,
        statusCode: null,
        changes: null,
        errorMessage: null,
        // SMART on FHIR fields
        clientId: null,
        clientName: null,
        launchContext: null,
        scopes: null,
      });
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should log access without user', async () => {
      const mockAuditLog = {
        id: 'audit-125',
        action: 'read',
        resourceType: 'Patient',
        userId: null,
        userRoles: null,
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as unknown as AuditLogEntity);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as unknown as AuditLogEntity);

      await service.logAccess({
        action: 'read',
        resourceType: 'Patient',
        resourceId: 'patient-123',
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        action: 'read',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        userId: null,
        userRoles: null,
        ipAddress: null,
        userAgent: null,
        requestMethod: null,
        requestPath: null,
        statusCode: null,
        changes: null,
        errorMessage: null,
        // SMART on FHIR fields
        clientId: null,
        clientName: null,
        launchContext: null,
        scopes: null,
      });
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should log access with error message', async () => {
      const mockAuditLog = {
        id: 'audit-126',
        action: 'read',
        resourceType: 'Patient',
        errorMessage: 'Not found',
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as unknown as AuditLogEntity);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as unknown as AuditLogEntity);

      await service.logAccess({
        action: 'read',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        user: mockUser,
        errorMessage: 'Not found',
        statusCode: 404,
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: 'Not found',
          statusCode: 404,
        }),
      );
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', async () => {
      const error = new Error('Database connection failed');
      auditLogRepository.create.mockReturnValue({} as unknown as AuditLogEntity);
      auditLogRepository.save.mockRejectedValue(error);

      await service.logAccess({
        action: 'read',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        user: mockUser,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Database connection failed',
        }),
        'Failed to create audit log for access',
      );
    });
  });

  describe('logCreate', () => {
    it('should log create successfully', async () => {
      const mockAuditLog = {
        id: 'audit-127',
        action: 'create',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        userId: mockUser.id,
        userRoles: mockUser.roles,
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as unknown as AuditLogEntity);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as unknown as AuditLogEntity);

      await service.logCreate({
        resourceType: 'Patient',
        resourceId: 'patient-123',
        user: mockUser,
        ipAddress: '192.168.1.1',
        requestMethod: 'POST',
        requestPath: '/api/patients',
        statusCode: 201,
        changes: { name: 'John Doe' },
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        action: 'create',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        userId: mockUser.id,
        userRoles: mockUser.roles,
        ipAddress: '192.168.1.1',
        userAgent: null,
        requestMethod: 'POST',
        requestPath: '/api/patients',
        statusCode: 201,
        changes: { name: 'John Doe' },
        errorMessage: null,
        // SMART on FHIR fields
        clientId: null,
        clientName: null,
        launchContext: null,
        scopes: null,
      });
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should log create without changes', async () => {
      const mockAuditLog = {
        id: 'audit-128',
        action: 'create',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        changes: null,
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as unknown as AuditLogEntity);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as unknown as AuditLogEntity);

      await service.logCreate({
        resourceType: 'Patient',
        resourceId: 'patient-123',
        user: mockUser,
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          changes: null,
        }),
      );
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', async () => {
      const error = new Error('Database error');
      auditLogRepository.create.mockReturnValue({} as unknown as AuditLogEntity);
      auditLogRepository.save.mockRejectedValue(error);

      await service.logCreate({
        resourceType: 'Patient',
        resourceId: 'patient-123',
        user: mockUser,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Database error',
        }),
        'Failed to create audit log for create',
      );
    });
  });

  describe('logUpdate', () => {
    it('should log update successfully', async () => {
      const mockAuditLog = {
        id: 'audit-129',
        action: 'update',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        userId: mockUser.id,
        changes: { name: { old: 'John', new: 'Jane' } },
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as unknown as AuditLogEntity);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as unknown as AuditLogEntity);

      await service.logUpdate({
        resourceType: 'Patient',
        resourceId: 'patient-123',
        user: mockUser,
        requestMethod: 'PUT',
        requestPath: '/api/patients/patient-123',
        statusCode: 200,
        changes: { name: { old: 'John', new: 'Jane' } },
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        action: 'update',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        userId: mockUser.id,
        userRoles: mockUser.roles,
        ipAddress: null,
        userAgent: null,
        requestMethod: 'PUT',
        requestPath: '/api/patients/patient-123',
        statusCode: 200,
        changes: { name: { old: 'John', new: 'Jane' } },
        errorMessage: null,
        // SMART on FHIR fields
        clientId: null,
        clientName: null,
        launchContext: null,
        scopes: null,
      });
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should log update with error message', async () => {
      const mockAuditLog = {
        id: 'audit-130',
        action: 'update',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        errorMessage: 'Validation failed',
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as unknown as AuditLogEntity);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as unknown as AuditLogEntity);

      await service.logUpdate({
        resourceType: 'Patient',
        resourceId: 'patient-123',
        user: mockUser,
        errorMessage: 'Validation failed',
        statusCode: 400,
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          errorMessage: 'Validation failed',
          statusCode: 400,
        }),
      );
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', async () => {
      const error = new Error('Database error');
      auditLogRepository.create.mockReturnValue({} as unknown as AuditLogEntity);
      auditLogRepository.save.mockRejectedValue(error);

      await service.logUpdate({
        resourceType: 'Patient',
        resourceId: 'patient-123',
        user: mockUser,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Database error',
        }),
        'Failed to create audit log for update',
      );
    });
  });

  describe('logDelete', () => {
    it('should log delete successfully', async () => {
      const mockAuditLog = {
        id: 'audit-131',
        action: 'delete',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        userId: mockUser.id,
        changes: null,
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as unknown as AuditLogEntity);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as unknown as AuditLogEntity);

      await service.logDelete({
        resourceType: 'Patient',
        resourceId: 'patient-123',
        user: mockUser,
        requestMethod: 'DELETE',
        requestPath: '/api/patients/patient-123',
        statusCode: 204,
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        action: 'delete',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        userId: mockUser.id,
        userRoles: mockUser.roles,
        ipAddress: null,
        userAgent: null,
        requestMethod: 'DELETE',
        requestPath: '/api/patients/patient-123',
        statusCode: 204,
        changes: null,
        errorMessage: null,
        // SMART on FHIR fields
        clientId: null,
        clientName: null,
        launchContext: null,
        scopes: null,
      });
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should log delete without user', async () => {
      const mockAuditLog = {
        id: 'audit-132',
        action: 'delete',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        userId: null,
        userRoles: null,
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as unknown as AuditLogEntity);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as unknown as AuditLogEntity);

      await service.logDelete({
        resourceType: 'Patient',
        resourceId: 'patient-123',
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: null,
          userRoles: null,
        }),
      );
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', async () => {
      const error = new Error('Database error');
      auditLogRepository.create.mockReturnValue({} as unknown as AuditLogEntity);
      auditLogRepository.save.mockRejectedValue(error);

      await service.logDelete({
        resourceType: 'Patient',
        resourceId: 'patient-123',
        user: mockUser,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Database error',
        }),
        'Failed to create audit log for delete',
      );
    });
  });

  describe('logAction', () => {
    it('should log custom action successfully', async () => {
      const mockAuditLog = {
        id: 'audit-133',
        action: 'share',
        resourceType: 'Consent',
        resourceId: 'consent-123',
        userId: mockUser.id,
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as unknown as AuditLogEntity);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as unknown as AuditLogEntity);

      await service.logAction({
        action: 'share',
        resourceType: 'Consent',
        resourceId: 'consent-123',
        user: mockUser,
        changes: { practitionerId: 'practitioner-123' },
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        action: 'share',
        resourceType: 'Consent',
        resourceId: 'consent-123',
        userId: mockUser.id,
        userRoles: mockUser.roles,
        ipAddress: null,
        userAgent: null,
        requestMethod: null,
        requestPath: null,
        statusCode: null,
        changes: { practitionerId: 'practitioner-123' },
        errorMessage: null,
        // SMART on FHIR fields
        clientId: null,
        clientName: null,
        launchContext: null,
        scopes: null,
      });
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should log action without resourceId', async () => {
      const mockAuditLog = {
        id: 'audit-134',
        action: 'export',
        resourceType: 'Patient',
        resourceId: null,
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as unknown as AuditLogEntity);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as unknown as AuditLogEntity);

      await service.logAction({
        action: 'export',
        resourceType: 'Patient',
        user: mockUser,
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'export',
          resourceType: 'Patient',
          resourceId: null,
        }),
      );
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', async () => {
      const error = new Error('Database error');
      auditLogRepository.create.mockReturnValue({} as unknown as AuditLogEntity);
      auditLogRepository.save.mockRejectedValue(error);

      await service.logAction({
        action: 'custom',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        user: mockUser,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Database error',
        }),
        'Failed to create audit log',
      );
    });

    it('should handle non-Error objects in catch block', async () => {
      const error = 'String error';
      auditLogRepository.create.mockReturnValue({} as unknown as AuditLogEntity);
      auditLogRepository.save.mockRejectedValue(error);

      await service.logAction({
        action: 'custom',
        resourceType: 'Patient',
        resourceId: 'patient-123',
        user: mockUser,
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'String error',
        }),
        'Failed to create audit log',
      );
    });
  });

  describe('logSmartAuth', () => {
    it('should log SMART authorization request successfully', async () => {
      const mockAuditLog = {
        id: 'audit-135',
        action: 'smart_auth',
        resourceType: 'SMART-on-FHIR',
        clientId: 'app-123',
        clientName: 'Lab System App',
        scopes: ['patient:read', 'patient:write'],
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as unknown as AuditLogEntity);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as unknown as AuditLogEntity);

      await service.logSmartAuth({
        clientId: 'app-123',
        clientName: 'Lab System App',
        redirectUri: 'https://app.com/callback',
        scopes: ['patient:read', 'patient:write'],
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        statusCode: 302,
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'smart_auth',
          resourceType: 'SMART-on-FHIR',
          clientId: 'app-123',
          clientName: 'Lab System App',
          scopes: ['patient:read', 'patient:write'],
          requestMethod: 'GET',
          requestPath: '/api/fhir/auth',
          statusCode: 302,
        }),
      );
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', async () => {
      const error = new Error('Database error');
      auditLogRepository.create.mockReturnValue({} as unknown as AuditLogEntity);
      auditLogRepository.save.mockRejectedValue(error);

      await service.logSmartAuth({
        clientId: 'app-123',
        redirectUri: 'https://app.com/callback',
        scopes: ['patient:read'],
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Database error',
        }),
        'Failed to create audit log for SMART auth',
      );
    });
  });

  describe('logSmartToken', () => {
    it('should log SMART token exchange successfully', async () => {
      const mockAuditLog = {
        id: 'audit-136',
        action: 'smart_token',
        resourceType: 'SMART-on-FHIR',
        clientId: 'app-123',
        scopes: ['patient:read'],
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as unknown as AuditLogEntity);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as unknown as AuditLogEntity);

      await service.logSmartToken({
        clientId: 'app-123',
        clientName: 'Lab System App',
        grantType: 'authorization_code',
        launchContext: { patient: 'Patient/123' },
        scopes: ['patient:read'],
        ipAddress: '192.168.1.1',
        statusCode: 200,
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'smart_token',
          resourceType: 'SMART-on-FHIR',
          clientId: 'app-123',
          clientName: 'Lab System App',
          launchContext: { patient: 'Patient/123' },
          scopes: ['patient:read'],
          requestMethod: 'POST',
          requestPath: '/api/fhir/token',
          statusCode: 200,
        }),
      );
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', async () => {
      const error = new Error('Database error');
      auditLogRepository.create.mockReturnValue({} as unknown as AuditLogEntity);
      auditLogRepository.save.mockRejectedValue(error);

      await service.logSmartToken({
        clientId: 'app-123',
        grantType: 'authorization_code',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Database error',
        }),
        'Failed to create audit log for SMART token',
      );
    });
  });

  describe('logSmartLaunch', () => {
    it('should log SMART launch sequence successfully', async () => {
      const mockAuditLog = {
        id: 'audit-137',
        action: 'smart_launch',
        resourceType: 'SMART-on-FHIR',
        clientId: 'app-123',
        launchContext: { patient: 'Patient/123', encounter: 'Encounter/456' },
        scopes: ['patient:read'],
      };

      auditLogRepository.create.mockReturnValue(mockAuditLog as unknown as AuditLogEntity);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as unknown as AuditLogEntity);

      await service.logSmartLaunch({
        clientId: 'app-123',
        clientName: 'Lab System App',
        launchToken: 'xyz123',
        launchContext: { patient: 'Patient/123', encounter: 'Encounter/456' },
        scopes: ['patient:read'],
        ipAddress: '192.168.1.1',
        statusCode: 302,
      });

      expect(auditLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'smart_launch',
          resourceType: 'SMART-on-FHIR',
          clientId: 'app-123',
          clientName: 'Lab System App',
          launchContext: { patient: 'Patient/123', encounter: 'Encounter/456' },
          scopes: ['patient:read'],
          requestMethod: 'GET',
          requestPath: '/api/fhir/authorize',
          statusCode: 302,
        }),
      );
      expect(auditLogRepository.save).toHaveBeenCalled();
    });

    it('should handle errors gracefully without throwing', async () => {
      const error = new Error('Database error');
      auditLogRepository.create.mockReturnValue({} as unknown as AuditLogEntity);
      auditLogRepository.save.mockRejectedValue(error);

      await service.logSmartLaunch({
        clientId: 'app-123',
        launchToken: 'xyz123',
        launchContext: {},
        scopes: ['patient:read'],
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Database error',
        }),
        'Failed to create audit log for SMART launch',
      );
    });
  });
});
