import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository, IsNull, SelectQueryBuilder } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';

import { EncountersCoreService } from './encounters-core.service';
import { EncounterEntity } from '../../entities/encounter.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { User } from '@carecore/shared';
import { ROLES } from '../../common/constants/roles';
import { PatientContextService } from '../../common/services/patient-context.service';
import { ScopePermissionService } from '../auth/services/scope-permission.service';

describe('EncountersCoreService', () => {
  let service: EncountersCoreService;
  let encounterRepository: jest.Mocked<Repository<EncounterEntity>>;
  let patientRepository: jest.Mocked<Repository<PatientEntity>>;
  let mockPatientContextService: jest.Mocked<PatientContextService>;
  let mockScopePermissionService: jest.Mocked<ScopePermissionService>;
  let mockLogger: jest.Mocked<PinoLogger>;

  beforeEach(async () => {
    encounterRepository = {
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<EncounterEntity>>;

    patientRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<PatientEntity>>;

    mockPatientContextService = {
      shouldBypassFiltering: jest.fn(),
      getPatientReference: jest.fn(),
      getKeycloakUserId: jest.fn(),
      getPatientId: jest.fn(),
      extractPatientIdFromReference: jest.fn(),
    } as unknown as jest.Mocked<PatientContextService>;

    mockScopePermissionService = {
      hasResourcePermission: jest.fn(),
    } as unknown as jest.Mocked<ScopePermissionService>;

    mockLogger = {
      setContext: jest.fn(),
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<PinoLogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncountersCoreService,
        {
          provide: getRepositoryToken(EncounterEntity),
          useValue: encounterRepository,
        },
        {
          provide: getRepositoryToken(PatientEntity),
          useValue: patientRepository,
        },
        {
          provide: PatientContextService,
          useValue: mockPatientContextService,
        },
        {
          provide: ScopePermissionService,
          useValue: mockScopePermissionService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<EncountersCoreService>(EncountersCoreService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    let mockQueryBuilder: {
      where: jest.Mock;
      andWhere: jest.Mock;
      orderBy: jest.Mock;
      getMany: jest.Mock;
    };

    beforeEach(() => {
      mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };
      encounterRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<EncounterEntity>,
      );
    });

    it('should return empty list when no encounters exist', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);
      mockPatientContextService.shouldBypassFiltering.mockReturnValue(false);
      mockPatientContextService.getPatientReference.mockReturnValue(undefined);
      mockPatientContextService.getKeycloakUserId.mockReturnValue(undefined);

      const result = await service.findAll();

      expect(result.entities).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('encounter.deletedAt IS NULL');
    });

    it('should return list with encounters', async () => {
      const entity1 = new EncounterEntity();
      entity1.id = 'db-uuid-1';
      entity1.encounterId = 'encounter-1';
      entity1.status = 'finished';
      entity1.subjectReference = 'Patient/patient-1';
      entity1.createdAt = new Date('2024-01-01');
      entity1.updatedAt = new Date('2024-01-01');

      const entity2 = new EncounterEntity();
      entity2.id = 'db-uuid-2';
      entity2.encounterId = 'encounter-2';
      entity2.status = 'in-progress';
      entity2.subjectReference = 'Patient/patient-2';
      entity2.createdAt = new Date('2024-01-02');
      entity2.updatedAt = new Date('2024-01-02');

      mockQueryBuilder.getMany.mockResolvedValue([entity1, entity2]);
      mockPatientContextService.shouldBypassFiltering.mockReturnValue(true); // Admin bypasses

      const result = await service.findAll();

      expect(result.entities).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.entities[0].encounterId).toBe('encounter-1');
      expect(result.entities[1].encounterId).toBe('encounter-2');
    });

    it('should filter by patient context when user is a patient', async () => {
      const user: User = {
        id: 'patient-user',
        keycloakUserId: 'patient-user',
        username: 'patient',
        email: 'patient@example.com',
        roles: [ROLES.PATIENT],
        patient: 'Patient/123',
      };

      const entity = new EncounterEntity();
      entity.id = 'db-uuid';
      entity.encounterId = 'encounter-1';
      entity.status = 'finished';
      entity.subjectReference = 'Patient/123';
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      mockQueryBuilder.getMany.mockResolvedValue([entity]);
      mockPatientContextService.shouldBypassFiltering.mockReturnValue(false);
      mockPatientContextService.getPatientReference.mockReturnValue('Patient/123');

      const result = await service.findAll(user);

      expect(result.entities).toHaveLength(1);
      expect(result.entities[0].subjectReference).toBe('Patient/123');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'encounter.subjectReference = :tokenPatientRef',
        { tokenPatientRef: 'Patient/123' },
      );
    });
  });

  describe('findEncounterById', () => {
    it('should return an encounter by database UUID', async () => {
      const entity = new EncounterEntity();
      entity.id = 'db-uuid';
      entity.encounterId = 'test-encounter-id';
      entity.status = 'finished';
      entity.subjectReference = 'Patient/test-patient-id';
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      encounterRepository.findOne.mockResolvedValue(entity);
      mockPatientContextService.shouldBypassFiltering.mockReturnValue(true); // Admin bypasses

      const result = await service.findEncounterById('db-uuid');

      expect(result).toBeDefined();
      expect(result.id).toBe('db-uuid');
      expect(result.encounterId).toBe('test-encounter-id');
      expect(encounterRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'db-uuid', deletedAt: IsNull() },
      });
    });

    it('should throw NotFoundException when encounter does not exist', async () => {
      encounterRepository.findOne.mockResolvedValue(null);

      await expect(service.findEncounterById('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findEncounterById('non-existent-id')).rejects.toThrow(
        'Encounter with ID non-existent-id not found',
      );
    });

    it('should allow admin to access any encounter', async () => {
      const user: User = {
        id: 'admin-user',
        keycloakUserId: 'admin-user',
        username: 'admin',
        email: 'admin@example.com',
        roles: [ROLES.ADMIN],
      };

      const entity = new EncounterEntity();
      entity.id = 'db-uuid';
      entity.encounterId = 'encounter-1';
      entity.subjectReference = 'Patient/other-patient';
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      encounterRepository.findOne.mockResolvedValue(entity);
      mockPatientContextService.shouldBypassFiltering.mockReturnValue(true); // Admin bypasses

      const result = await service.findEncounterById('db-uuid', user);

      expect(result).toBeDefined();
      expect(result.id).toBe('db-uuid');
    });
  });

  describe('findEncounterByEncounterId', () => {
    it('should return an encounter by FHIR encounterId', async () => {
      const entity = new EncounterEntity();
      entity.id = 'db-uuid';
      entity.encounterId = 'test-encounter-id';
      entity.status = 'finished';
      entity.subjectReference = 'Patient/test-patient-id';
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      encounterRepository.findOne.mockResolvedValue(entity);
      mockPatientContextService.shouldBypassFiltering.mockReturnValue(true); // Admin bypasses

      const result = await service.findEncounterByEncounterId('test-encounter-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('db-uuid');
      expect(result.encounterId).toBe('test-encounter-id');
      expect(encounterRepository.findOne).toHaveBeenCalledWith({
        where: { encounterId: 'test-encounter-id', deletedAt: IsNull() },
      });
    });

    it('should throw NotFoundException when encounter does not exist', async () => {
      encounterRepository.findOne.mockResolvedValue(null);

      await expect(service.findEncounterByEncounterId('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.findEncounterByEncounterId('non-existent-id')).rejects.toThrow(
        'Encounter with encounterId non-existent-id not found',
      );
    });
  });

  describe('findEncountersByQuery', () => {
    let mockQueryBuilder: {
      where: jest.Mock;
      andWhere: jest.Mock;
      orderBy: jest.Mock;
      getCount: jest.Mock;
      skip: jest.Mock;
      take: jest.Mock;
      getMany: jest.Mock;
    };

    beforeEach(() => {
      mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getCount: jest.fn(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
      };
      encounterRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as unknown as SelectQueryBuilder<EncounterEntity>,
      );
    });

    it('should return encounters with pagination', async () => {
      const entity1 = new EncounterEntity();
      entity1.id = 'db-uuid-1';
      entity1.encounterId = 'encounter-1';
      entity1.status = 'finished';
      entity1.createdAt = new Date();

      mockQueryBuilder.getCount.mockResolvedValue(10);
      mockQueryBuilder.getMany.mockResolvedValue([entity1]);
      mockPatientContextService.shouldBypassFiltering.mockReturnValue(true); // Admin bypasses

      const result = await service.findEncountersByQuery({ page: 1, limit: 10 });

      expect(result.entities).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });

    it('should filter by status', async () => {
      const entity = new EncounterEntity();
      entity.id = 'db-uuid';
      entity.encounterId = 'encounter-1';
      entity.status = 'finished';
      entity.createdAt = new Date();

      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([entity]);
      mockPatientContextService.shouldBypassFiltering.mockReturnValue(true);

      await service.findEncountersByQuery({ status: 'finished' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('encounter.status = :status', {
        status: 'finished',
      });
    });

    it('should apply sorting', async () => {
      const entity = new EncounterEntity();
      entity.id = 'db-uuid';
      entity.encounterId = 'encounter-1';
      entity.status = 'finished';
      entity.createdAt = new Date();

      mockQueryBuilder.getCount.mockResolvedValue(1);
      mockQueryBuilder.getMany.mockResolvedValue([entity]);
      mockPatientContextService.shouldBypassFiltering.mockReturnValue(true);

      await service.findEncountersByQuery({ sort: '-date' });

      expect(mockQueryBuilder.orderBy).toHaveBeenCalled();
    });
  });
});
