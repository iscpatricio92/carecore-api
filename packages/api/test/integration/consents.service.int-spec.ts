import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm';

import { FHIR_RESOURCE_TYPES, FHIR_ACTIONS, User } from '@carecore/shared';
import { ROLES } from '@/common/constants/roles';
import { ConsentProvisionDto, CreateConsentDto } from '@/common/dto/fhir-consent.dto';
import { ConsentEntity } from '@/entities/consent.entity';
import { PatientEntity } from '@/entities/patient.entity';
import { ConsentsService } from '@/modules/consents/consents.service';
import { ScopePermissionService } from '@/modules/auth/services/scope-permission.service';
import { AuditService } from '@/modules/audit/audit.service';

describe('ConsentsService (integration)', () => {
  let service: ConsentsService;
  let consentRepo: jest.Mocked<Repository<ConsentEntity>>;
  let patientRepo: jest.Mocked<Repository<PatientEntity>>;
  let scopeService: jest.Mocked<ScopePermissionService>;
  const loggerMock = {
    setContext: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } as unknown as PinoLogger;

  const auditMock = {
    logCreate: jest.fn(),
    logAccess: jest.fn(),
    logUpdate: jest.fn(),
    logDelete: jest.fn(),
  } as unknown as AuditService;

  const patientUser = (id: string): User => ({
    id,
    keycloakUserId: id,
    roles: [ROLES.PATIENT],
    scopes: [],
    username: id,
  });

  beforeAll(async () => {
    consentRepo = {
      save: jest.fn(async (e) => e),
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<ConsentEntity>>;

    patientRepo = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<PatientEntity>>;

    scopeService = {
      hasResourcePermission: jest.fn().mockReturnValue(false),
      roleGrantsPermission: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<ScopePermissionService>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        ConsentsService,
        { provide: 'ConsentEntityRepository', useValue: consentRepo },
        { provide: 'PatientEntityRepository', useValue: patientRepo },
        { provide: PinoLogger, useValue: loggerMock },
        { provide: AuditService, useValue: auditMock },
        { provide: ScopePermissionService, useValue: scopeService },
      ],
    }).compile();

    service = moduleRef.get(ConsentsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    auditMock.logCreate = jest.fn().mockResolvedValue(undefined);
    auditMock.logAccess = jest.fn().mockResolvedValue(undefined);
    auditMock.logUpdate = jest.fn().mockResolvedValue(undefined);
    auditMock.logDelete = jest.fn().mockResolvedValue(undefined);
  });

  describe('create', () => {
    const baseDto: CreateConsentDto = {
      status: 'active',
      patient: { reference: 'Patient/p-1' },
      scope: { coding: [{ system: 'test', code: 'c1', display: 'test' }] },
      category: [{ coding: [{ system: 'test', code: 'c1' }] }],
      provision: { type: 'permit' } as ConsentProvisionDto,
    };

    it('should forbid patient without patient reference', async () => {
      const dto = { ...baseDto, patient: undefined } as unknown as CreateConsentDto;
      await expect(service.create(dto, patientUser('u1'))).rejects.toThrow(ForbiddenException);
    });

    it('should forbid patient with invalid reference format', async () => {
      const dto = { ...baseDto, patient: { reference: 'InvalidRef' } };
      await expect(service.create(dto as CreateConsentDto, patientUser('u1'))).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should fail when patient not found', async () => {
      patientRepo.findOne.mockResolvedValue(null);
      await expect(service.create(baseDto, patientUser('u1'))).rejects.toThrow(NotFoundException);
    });

    it('should allow admin even without patient record', async () => {
      patientRepo.findOne.mockResolvedValue(null);
      consentRepo.save.mockResolvedValueOnce({
        id: '1',
        consentId: 'c1',
        resourceType: FHIR_RESOURCE_TYPES.CONSENT,
        status: 'active',
        patientReference: 'Patient/p-1',
        fhirResource: { ...baseDto, id: 'c1', resourceType: FHIR_RESOURCE_TYPES.CONSENT },
      } as ConsentEntity);

      const admin: User = {
        id: 'admin',
        keycloakUserId: 'admin',
        roles: [ROLES.ADMIN],
        scopes: [],
        username: 'admin',
      };
      const result = await service.create(baseDto, admin);
      expect(result.resourceType).toBe(FHIR_RESOURCE_TYPES.CONSENT);
      expect(consentRepo.save).toHaveBeenCalled();
    });
  });

  describe('canAccessConsent (indirect via scope check)', () => {
    const consentEntity = {
      patientReference: 'Patient/p-1',
      status: 'active',
    } as ConsentEntity;

    it('patient can access own consent', async () => {
      patientRepo.findOne.mockResolvedValue({
        patientId: 'p-1',
        keycloakUserId: 'u1',
      } as PatientEntity);
      const user = patientUser('u1');
      const hasAccess = await (
        service as unknown as {
          canAccessConsent: (u: User, c: ConsentEntity, a: string) => Promise<boolean>;
        }
      ).canAccessConsent(user, consentEntity, FHIR_ACTIONS.READ);
      expect(hasAccess).toBe(true);
    });

    it('patient denied when patient not found', async () => {
      patientRepo.findOne.mockResolvedValue(null);
      const user = patientUser('u1');
      const hasAccess = await (
        service as unknown as {
          canAccessConsent: (u: User, c: ConsentEntity, a: string) => Promise<boolean>;
        }
      ).canAccessConsent(user, consentEntity, FHIR_ACTIONS.READ);
      expect(hasAccess).toBe(false);
    });
  });
});
