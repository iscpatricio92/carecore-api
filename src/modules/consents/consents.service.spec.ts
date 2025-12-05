import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';

import { ConsentsService } from './consents.service';
import { ConsentEntity } from '../../entities/consent.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { CreateConsentDto, UpdateConsentDto } from '../../common/dto/fhir-consent.dto';
import { Consent } from '../../common/interfaces/fhir.interface';
import { ROLES } from '../../common/constants/roles';
import { User } from '../auth/interfaces/user.interface';

const mockLogger: Record<string, jest.Mock> = {
  setContext: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('ConsentsService', () => {
  let service: ConsentsService;
  let consentRepository: jest.Mocked<Repository<ConsentEntity>>;
  let patientRepository: jest.Mocked<Repository<PatientEntity>>;

  const adminUser: User = { id: 'admin-1', username: 'admin', roles: [ROLES.ADMIN], email: '' };
  const patientUser: User = {
    id: 'patient-1',
    username: 'patient',
    roles: [ROLES.PATIENT],
    email: '',
  };
  const practitionerUser: User = {
    id: 'pract-1',
    username: 'pract',
    roles: [ROLES.PRACTITIONER],
    email: '',
  };

  const baseConsent: Consent = {
    resourceType: 'Consent',
    id: 'consent-1',
    status: 'active',
    patient: { reference: 'Patient/p1' },
    meta: { versionId: '1', lastUpdated: new Date().toISOString() },
  } as Consent;

  const consentEntityFactory = (overrides: Partial<ConsentEntity> = {}): ConsentEntity =>
    ({
      id: 1,
      consentId: baseConsent.id,
      resourceType: 'Consent',
      status: baseConsent.status,
      patientReference: baseConsent.patient?.reference || '',
      fhirResource: baseConsent,
      deletedAt: null,
      ...overrides,
    }) as ConsentEntity;

  beforeEach(async () => {
    consentRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<ConsentEntity>>;

    patientRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
    } as unknown as jest.Mocked<Repository<PatientEntity>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentsService,
        { provide: getRepositoryToken(ConsentEntity), useValue: consentRepository },
        { provide: getRepositoryToken(PatientEntity), useValue: patientRepository },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<ConsentsService>(ConsentsService);
  });

  describe('create', () => {
    const dto: CreateConsentDto = {
      status: 'active',
      patient: { reference: 'Patient/p1' },
    } as CreateConsentDto;

    it('should create consent for admin', async () => {
      consentRepository.save.mockResolvedValue(consentEntityFactory());
      const result = await service.create(dto, adminUser);
      expect(result.resourceType).toBe('Consent');
      expect(consentRepository.save).toHaveBeenCalled();
    });

    it('should validate patient ownership for patient users', async () => {
      patientRepository.findOne.mockResolvedValue({
        patientId: 'p1',
        keycloakUserId: patientUser.id,
      } as PatientEntity);
      consentRepository.save.mockResolvedValue(consentEntityFactory());

      const result = await service.create(dto, patientUser);
      expect(result.id).toBeDefined();
      expect(patientRepository.findOne).toHaveBeenCalled();
    });

    it('should throw forbidden when patient reference missing for patient user', async () => {
      await expect(
        service.create({ status: 'active' } as CreateConsentDto, patientUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAll', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const queryBuilder: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    beforeEach(() => {
      consentRepository.createQueryBuilder.mockReset();
      queryBuilder.where = jest.fn().mockReturnThis();
      queryBuilder.andWhere = jest.fn().mockReturnThis();
      queryBuilder.getMany = jest.fn();
      consentRepository.createQueryBuilder.mockReturnValue(queryBuilder);
    });

    it('should return all consents for admin', async () => {
      queryBuilder.getMany.mockResolvedValue([consentEntityFactory()]);
      const result = await service.findAll(adminUser);
      expect(result.total).toBe(1);
      expect(queryBuilder.getMany).toHaveBeenCalled();
    });

    it('should filter by patient for patient users', async () => {
      patientRepository.find.mockResolvedValue([
        { patientId: 'p1', keycloakUserId: patientUser.id } as PatientEntity,
      ]);
      queryBuilder.getMany.mockResolvedValue([consentEntityFactory()]);

      const result = await service.findAll(patientUser);
      expect(result.total).toBe(1);
      expect(patientRepository.find).toHaveBeenCalled();
    });

    it('should return empty when patient has no records', async () => {
      patientRepository.find.mockResolvedValue([]);
      queryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findAll(patientUser);
      expect(result.total).toBe(0);
    });

    it('should filter active consents for practitioner', async () => {
      queryBuilder.getMany.mockResolvedValue([
        consentEntityFactory({ status: 'active' }),
        consentEntityFactory({ status: 'draft' }),
      ]);

      const result = await service.findAll(practitionerUser);
      expect(result.total).toBe(2);
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('consent.status = :status', {
        status: 'active',
      });
    });
  });

  describe('findOne', () => {
    it('should return consent when found and access allowed', async () => {
      consentRepository.findOne.mockResolvedValue(consentEntityFactory());
      const result = await service.findOne('consent-1', adminUser);
      expect(result.id).toBe('consent-1');
    });

    it('should throw NotFound when consent does not exist', async () => {
      consentRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('missing', adminUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw Forbidden when user has no access', async () => {
      consentRepository.findOne.mockResolvedValue(consentEntityFactory());
      // patientRepository will return undefined leading to access denied
      await expect(service.findOne('consent-1', patientUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateDto: UpdateConsentDto = { status: 'inactive' } as UpdateConsentDto;

    it('should update consent and bump version', async () => {
      const existing = consentEntityFactory();
      consentRepository.findOne.mockResolvedValue(existing);
      consentRepository.save.mockImplementation(async (entity) => entity as ConsentEntity);

      const result = await service.update('consent-1', updateDto, adminUser);
      expect(result.meta?.versionId).toBe('2');
      expect(result.status).toBe('inactive');
    });

    it('should throw NotFound when consent does not exist', async () => {
      consentRepository.findOne.mockResolvedValue(null);
      await expect(service.update('missing', updateDto, adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw Forbidden when user has no access', async () => {
      consentRepository.findOne.mockResolvedValue(consentEntityFactory());
      await expect(service.update('consent-1', updateDto, patientUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete consent when allowed', async () => {
      const entity = consentEntityFactory();
      consentRepository.findOne.mockResolvedValue(entity);
      consentRepository.save.mockResolvedValue(entity);

      await service.remove('consent-1', adminUser);
      expect(entity.deletedAt).toBeInstanceOf(Date);
      expect(consentRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFound when consent does not exist', async () => {
      consentRepository.findOne.mockResolvedValue(null);
      await expect(service.remove('missing', adminUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw Forbidden when user has no access', async () => {
      consentRepository.findOne.mockResolvedValue(consentEntityFactory());
      await expect(service.remove('consent-1', patientUser)).rejects.toThrow(ForbiddenException);
    });
  });
});
