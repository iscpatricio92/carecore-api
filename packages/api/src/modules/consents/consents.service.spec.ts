import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';

import { ConsentsService } from './consents.service';
import { ConsentsCoreService } from './consents-core.service';
import { ConsentEntity } from '../../entities/consent.entity';
import {
  CreateConsentDto,
  UpdateConsentDto,
  ShareConsentWithPractitionerDto,
} from '../../common/dto/fhir-consent.dto';
import { Consent, User, FHIR_RESOURCE_TYPES } from '@carecore/shared';
import { ROLES } from '../../common/constants/roles';
import { AuditService } from '../audit/audit.service';

const mockLogger: Record<string, jest.Mock> = {
  setContext: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('ConsentsService', () => {
  let service: ConsentsService;
  let mockConsentsCoreService: jest.Mocked<ConsentsCoreService>;

  const mockAuditService = {
    logAccess: jest.fn().mockResolvedValue(undefined),
    logCreate: jest.fn().mockResolvedValue(undefined),
    logUpdate: jest.fn().mockResolvedValue(undefined),
    logDelete: jest.fn().mockResolvedValue(undefined),
    logAction: jest.fn().mockResolvedValue(undefined),
  };

  const adminUser: User = {
    id: 'admin-1',
    keycloakUserId: 'admin-1',
    username: 'admin',
    roles: [ROLES.ADMIN],
    email: '',
  };
  const patientUser: User = {
    id: 'patient-1',
    keycloakUserId: 'patient-1',
    username: 'patient',
    roles: [ROLES.PATIENT],
    email: '',
  };
  const practitionerUser: User = {
    id: 'pract-1',
    keycloakUserId: 'pract-1',
    username: 'pract',
    roles: [ROLES.PRACTITIONER],
    email: '',
  };

  const baseConsent: Consent = {
    resourceType: FHIR_RESOURCE_TYPES.CONSENT,
    id: 'consent-1',
    status: 'active',
    patient: { reference: 'Patient/p1' },
    meta: { versionId: '1', lastUpdated: new Date().toISOString() },
  } as Consent;

  const consentEntityFactory = (overrides: Partial<ConsentEntity> = {}): ConsentEntity =>
    ({
      id: 'db-uuid-1',
      consentId: baseConsent.id,
      resourceType: FHIR_RESOURCE_TYPES.CONSENT,
      status: baseConsent.status,
      patientReference: baseConsent.patient?.reference || '',
      fhirResource: baseConsent,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as ConsentEntity;

  beforeEach(async () => {
    mockConsentsCoreService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findConsentsByQuery: jest.fn(),
      findConsentById: jest.fn(),
      findConsentByConsentId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      shareWithPractitioner: jest.fn(),
    } as unknown as jest.Mocked<ConsentsCoreService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentsService,
        {
          provide: ConsentsCoreService,
          useValue: mockConsentsCoreService,
        },
        { provide: PinoLogger, useValue: mockLogger },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ConsentsService>(ConsentsService);
  });

  beforeEach(() => {
    // Reset audit service mocks before each test to ensure they return Promises
    mockAuditService.logAccess.mockClear();
    mockAuditService.logCreate.mockClear();
    mockAuditService.logUpdate.mockClear();
    mockAuditService.logDelete.mockClear();
    mockAuditService.logAction.mockClear();

    mockAuditService.logAccess.mockResolvedValue(undefined);
    mockAuditService.logCreate.mockResolvedValue(undefined);
    mockAuditService.logUpdate.mockResolvedValue(undefined);
    mockAuditService.logDelete.mockResolvedValue(undefined);
    mockAuditService.logAction.mockResolvedValue(undefined);

    // Reset core service mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto: CreateConsentDto = {
      status: 'active',
      patient: { reference: 'Patient/p1' },
    } as CreateConsentDto;

    it('should create consent for admin', async () => {
      const entity = consentEntityFactory();
      mockConsentsCoreService.create.mockResolvedValue(entity);

      const result = await service.create(dto, adminUser);

      expect(result.resourceType).toBe(FHIR_RESOURCE_TYPES.CONSENT);
      expect(mockConsentsCoreService.create).toHaveBeenCalledWith(dto, adminUser);
      expect(mockAuditService.logCreate).toHaveBeenCalled();
    });

    it('should validate patient ownership for patient users', async () => {
      const entity = consentEntityFactory();
      mockConsentsCoreService.create.mockResolvedValue(entity);

      const result = await service.create(dto, patientUser);

      expect(result.id).toBeDefined();
      expect(mockConsentsCoreService.create).toHaveBeenCalledWith(dto, patientUser);
    });

    it('should throw forbidden when patient reference missing for patient user', async () => {
      mockConsentsCoreService.create.mockRejectedValue(
        new ForbiddenException('Patient reference is required for patient users'),
      );

      await expect(
        service.create({ status: 'active' } as CreateConsentDto, patientUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle audit log error gracefully', async () => {
      const entity = consentEntityFactory();
      mockConsentsCoreService.create.mockResolvedValue(entity);
      mockAuditService.logCreate.mockRejectedValue(new Error('Audit error'));

      const result = await service.create(dto, adminUser);

      expect(result).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        { error: expect.any(Error) },
        'Failed to log audit for consent creation',
      );
    });
  });

  describe('findAll', () => {
    it('should return all consents for admin', async () => {
      const entity = consentEntityFactory();
      mockConsentsCoreService.findAll.mockResolvedValue({ entities: [entity], total: 1 });

      const result = await service.findAll(adminUser);

      expect(result.total).toBe(1);
      expect(result.entries).toHaveLength(1);
      expect(mockConsentsCoreService.findAll).toHaveBeenCalledWith(adminUser);
    });

    it('should filter by patient for patient users', async () => {
      const entity = consentEntityFactory();
      mockConsentsCoreService.findAll.mockResolvedValue({ entities: [entity], total: 1 });

      const result = await service.findAll(patientUser);

      expect(result.total).toBe(1);
      expect(mockConsentsCoreService.findAll).toHaveBeenCalledWith(patientUser);
    });

    it('should return empty when patient has no records', async () => {
      mockConsentsCoreService.findAll.mockResolvedValue({ entities: [], total: 0 });

      const result = await service.findAll(patientUser);

      expect(result.total).toBe(0);
      expect(result.entries).toHaveLength(0);
    });

    it('should filter active consents for practitioner', async () => {
      const entity1 = consentEntityFactory({ status: 'active' });
      const entity2 = consentEntityFactory({ status: 'draft' });
      mockConsentsCoreService.findAll.mockResolvedValue({
        entities: [entity1, entity2],
        total: 2,
      });

      const result = await service.findAll(practitionerUser);

      expect(result.total).toBe(2);
      expect(mockConsentsCoreService.findAll).toHaveBeenCalledWith(practitionerUser);
    });
  });

  describe('findOne', () => {
    it('should return consent when found and access allowed', async () => {
      const entity = consentEntityFactory();
      mockConsentsCoreService.findConsentByConsentId.mockResolvedValue(entity);

      const result = await service.findOne('consent-1', adminUser);

      expect(result.id).toBe('consent-1');
      expect(mockConsentsCoreService.findConsentByConsentId).toHaveBeenCalledWith(
        'consent-1',
        adminUser,
      );
    });

    it('should throw NotFound when consent does not exist', async () => {
      mockConsentsCoreService.findConsentByConsentId.mockRejectedValue(
        new NotFoundException('Consent not found'),
      );

      await expect(service.findOne('missing', adminUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw Forbidden when user has no access', async () => {
      mockConsentsCoreService.findConsentByConsentId.mockRejectedValue(
        new ForbiddenException('You do not have permission to access this consent'),
      );

      await expect(service.findOne('consent-1', patientUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateConsentDto = { status: 'inactive' } as UpdateConsentDto;

    it('should update consent and bump version', async () => {
      const existingEntity = consentEntityFactory();
      const updatedEntity = consentEntityFactory({
        status: 'inactive',
        fhirResource: {
          ...baseConsent,
          status: 'inactive',
          meta: { ...baseConsent.meta, versionId: '2' },
        },
      });

      mockConsentsCoreService.findConsentByConsentId.mockResolvedValue(existingEntity);
      mockConsentsCoreService.update.mockResolvedValue(updatedEntity);

      const result = await service.update('consent-1', updateDto, adminUser);

      expect(result.meta?.versionId).toBe('2');
      expect(result.status).toBe('inactive');
      expect(mockConsentsCoreService.update).toHaveBeenCalledWith(
        'consent-1',
        updateDto,
        adminUser,
      );
      expect(mockAuditService.logUpdate).toHaveBeenCalled();
    });

    it('should throw NotFound when consent does not exist', async () => {
      mockConsentsCoreService.findConsentByConsentId.mockRejectedValue(
        new NotFoundException('Consent not found'),
      );

      await expect(service.update('missing', updateDto, adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw Forbidden when user has no access', async () => {
      mockConsentsCoreService.findConsentByConsentId.mockRejectedValue(
        new ForbiddenException('You do not have permission to update this consent'),
      );

      await expect(service.update('consent-1', updateDto, patientUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should handle audit log error gracefully', async () => {
      const existingEntity = consentEntityFactory();
      const updatedEntity = consentEntityFactory({
        status: 'inactive',
        fhirResource: {
          ...baseConsent,
          status: 'inactive',
          meta: { ...baseConsent.meta, versionId: '2' },
        },
      });

      mockConsentsCoreService.findConsentByConsentId.mockResolvedValue(existingEntity);
      mockConsentsCoreService.update.mockResolvedValue(updatedEntity);
      mockAuditService.logUpdate.mockRejectedValue(new Error('Audit error'));

      const result = await service.update('consent-1', updateDto, adminUser);

      expect(result).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        { error: expect.any(Error) },
        'Failed to log audit for consent update',
      );
    });
  });

  describe('remove', () => {
    it('should soft delete consent when allowed', async () => {
      mockConsentsCoreService.remove.mockResolvedValue(undefined);

      await service.remove('consent-1', adminUser);

      expect(mockConsentsCoreService.remove).toHaveBeenCalledWith('consent-1', adminUser);
      expect(mockAuditService.logDelete).toHaveBeenCalled();
    });

    it('should throw NotFound when consent does not exist', async () => {
      mockConsentsCoreService.remove.mockRejectedValue(new NotFoundException('Consent not found'));

      await expect(service.remove('missing', adminUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw Forbidden when user has no access', async () => {
      mockConsentsCoreService.remove.mockRejectedValue(
        new ForbiddenException('You do not have permission to delete this consent'),
      );

      await expect(service.remove('consent-1', patientUser)).rejects.toThrow(ForbiddenException);
    });

    it('should handle audit log error gracefully', async () => {
      mockConsentsCoreService.remove.mockResolvedValue(undefined);
      mockAuditService.logDelete.mockRejectedValue(new Error('Audit error'));

      await service.remove('consent-1', adminUser);

      expect(mockLogger.error).toHaveBeenCalledWith(
        { error: expect.any(Error) },
        'Failed to log audit for consent deletion',
      );
    });
  });

  describe('shareWithPractitioner', () => {
    const shareDto: ShareConsentWithPractitionerDto = {
      practitionerReference: 'Practitioner/practitioner-123',
      practitionerDisplay: 'Dr. Jane Smith',
      days: 30,
    };

    it('should share consent with practitioner successfully', async () => {
      const entity = consentEntityFactory({
        status: 'active',
        fhirResource: {
          ...baseConsent,
          dateTime: new Date().toISOString(),
          provision: {
            type: 'permit',
            period: {
              start: new Date().toISOString(),
              end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            },
            actor: [
              {
                reference: {
                  reference: 'Practitioner/practitioner-123',
                },
              },
            ],
          },
          meta: { ...baseConsent.meta, versionId: '2' },
        },
      });

      mockConsentsCoreService.shareWithPractitioner.mockResolvedValue(entity);

      const result = await service.shareWithPractitioner('consent-1', shareDto, adminUser);

      expect(result.provision).toBeDefined();
      expect(result.provision?.actor).toBeDefined();
      expect(result.provision?.actor?.[0]?.reference?.reference).toBe(
        'Practitioner/practitioner-123',
      );
      expect(result.meta?.versionId).toBe('2');
      expect(mockConsentsCoreService.shareWithPractitioner).toHaveBeenCalledWith(
        'consent-1',
        shareDto,
        adminUser,
      );
    });

    it('should throw NotFoundException if consent not found', async () => {
      mockConsentsCoreService.shareWithPractitioner.mockRejectedValue(
        new NotFoundException('Consent not found'),
      );

      await expect(
        service.shareWithPractitioner('non-existent', shareDto, adminUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access', async () => {
      mockConsentsCoreService.shareWithPractitioner.mockRejectedValue(
        new ForbiddenException('You do not have permission to share this consent'),
      );

      await expect(
        service.shareWithPractitioner('consent-1', shareDto, patientUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should merge with existing provision', async () => {
      const existingProvision = {
        type: 'permit' as const,
        actor: [
          {
            reference: {
              reference: 'Practitioner/practitioner-1',
            },
          },
        ],
      };

      const entity = consentEntityFactory({
        status: 'active',
        fhirResource: {
          ...baseConsent,
          provision: {
            ...existingProvision,
            actor: [
              ...existingProvision.actor,
              {
                reference: {
                  reference: 'Practitioner/practitioner-123',
                },
              },
            ],
          },
          dateTime: new Date().toISOString(),
          meta: { ...baseConsent.meta, versionId: '2' },
        },
      });

      mockConsentsCoreService.shareWithPractitioner.mockResolvedValue(entity);

      const result = await service.shareWithPractitioner('consent-1', shareDto, adminUser);

      expect(result.provision?.actor?.length).toBeGreaterThan(1);
      expect(mockConsentsCoreService.shareWithPractitioner).toHaveBeenCalledWith(
        'consent-1',
        shareDto,
        adminUser,
      );
    });
  });

  describe('searchConsents', () => {
    it('should search consents with parameters', async () => {
      const entity = consentEntityFactory();
      mockConsentsCoreService.findConsentsByQuery.mockResolvedValue({
        entities: [entity],
        total: 1,
      });

      const result = await service.searchConsents(
        {
          _count: '10',
          _sort: '-date',
          status: 'active',
        },
        adminUser,
      );

      expect(result.total).toBe(1);
      expect(result.entries).toHaveLength(1);
      expect(mockConsentsCoreService.findConsentsByQuery).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          status: 'active',
          sort: '-date',
        },
        adminUser,
      );
    });
  });
});
