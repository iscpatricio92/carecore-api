import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';

import { EncountersService } from './encounters.service';
import { EncounterEntity } from '../../entities/encounter.entity';
import { User } from '@carecore/shared';
import { ROLES } from '../../common/constants/roles';

describe('EncountersService', () => {
  let service: EncountersService;
  let repository: jest.Mocked<Repository<EncounterEntity>>;

  beforeEach(async () => {
    repository = {
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as unknown as jest.Mocked<Repository<EncounterEntity>>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncountersService,
        {
          provide: getRepositoryToken(EncounterEntity),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<EncountersService>(EncountersService);
  });

  afterEach(() => {
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
      repository.createQueryBuilder.mockReturnValue(mockQueryBuilder as never);
    });

    it('should return an empty list when no encounters exist', async () => {
      mockQueryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(repository.createQueryBuilder).toHaveBeenCalled();
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

      const result = await service.findAll();

      expect(result.total).toBe(2);
      expect(result.data.length).toBe(2);
      expect(result.data[0].encounterId).toBe('encounter-1');
      expect(result.data[1].encounterId).toBe('encounter-2');
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

      const result = await service.findAll(user);

      expect(result.total).toBe(1);
      expect(result.data[0].subjectReference).toBe('Patient/123');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'encounter.subjectReference = :tokenPatientRef',
        { tokenPatientRef: 'Patient/123' },
      );
    });

    it('should not filter by patient context when user is admin', async () => {
      const user: User = {
        id: 'admin-user',
        keycloakUserId: 'admin-user',
        username: 'admin',
        email: 'admin@example.com',
        roles: [ROLES.ADMIN],
      };

      const entity1 = new EncounterEntity();
      entity1.id = 'db-uuid-1';
      entity1.encounterId = 'encounter-1';
      entity1.subjectReference = 'Patient/123';
      entity1.createdAt = new Date();
      entity1.updatedAt = new Date();

      const entity2 = new EncounterEntity();
      entity2.id = 'db-uuid-2';
      entity2.encounterId = 'encounter-2';
      entity2.subjectReference = 'Patient/456';
      entity2.createdAt = new Date();
      entity2.updatedAt = new Date();

      mockQueryBuilder.getMany.mockResolvedValue([entity1, entity2]);

      const result = await service.findAll(user);

      expect(result.total).toBe(2);
      // Admin should not have patient filter applied
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should extract patient ID from fhirUser context', async () => {
      const user: User = {
        id: 'patient-user',
        keycloakUserId: 'patient-user',
        username: 'patient',
        email: 'patient@example.com',
        roles: [ROLES.PATIENT],
        fhirUser: 'Patient/789',
      };

      const entity = new EncounterEntity();
      entity.id = 'db-uuid';
      entity.encounterId = 'encounter-1';
      entity.subjectReference = 'Patient/789';
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      mockQueryBuilder.getMany.mockResolvedValue([entity]);

      await service.findAll(user);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'encounter.subjectReference = :tokenPatientRef',
        { tokenPatientRef: 'Patient/789' },
      );
    });
  });

  describe('findOne', () => {
    it('should return an encounter by id', async () => {
      const entity = new EncounterEntity();
      entity.id = 'db-uuid';
      entity.encounterId = 'test-encounter-id';
      entity.status = 'finished';
      entity.subjectReference = 'Patient/test-patient-id';
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      repository.findOne.mockResolvedValue(entity);

      const result = await service.findOne('db-uuid');

      expect(result).toBeDefined();
      expect(result.id).toBe('db-uuid');
      expect(result.encounterId).toBe('test-encounter-id');
      expect(result.status).toBe('finished');
      expect(result.subjectReference).toBe('Patient/test-patient-id');
      expect(repository.findOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException when encounter does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
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

      repository.findOne.mockResolvedValue(entity);

      const result = await service.findOne('db-uuid', user);

      expect(result).toBeDefined();
      expect(result.id).toBe('db-uuid');
    });

    it('should allow patient to access their own encounter', async () => {
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
      entity.subjectReference = 'Patient/123';
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      repository.findOne.mockResolvedValue(entity);

      const result = await service.findOne('db-uuid', user);

      expect(result).toBeDefined();
      expect(result.id).toBe('db-uuid');
    });

    it('should throw ForbiddenException when patient tries to access another patient encounter', async () => {
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
      entity.subjectReference = 'Patient/456'; // Different patient
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      repository.findOne.mockResolvedValue(entity);

      await expect(service.findOne('db-uuid', user)).rejects.toThrow(ForbiddenException);
      await expect(service.findOne('db-uuid', user)).rejects.toThrow(
        'You do not have permission to access this encounter. Patients can only access their own encounters.',
      );
    });
  });

  describe('findByEncounterId', () => {
    it('should return an encounter by encounterId', async () => {
      const entity = new EncounterEntity();
      entity.id = 'db-uuid';
      entity.encounterId = 'test-encounter-id';
      entity.status = 'finished';
      entity.subjectReference = 'Patient/test-patient-id';
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      repository.findOne.mockResolvedValue(entity);

      const result = await service.findByEncounterId('test-encounter-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('db-uuid');
      expect(result.encounterId).toBe('test-encounter-id');
      expect(result.status).toBe('finished');
      expect(repository.findOne).toHaveBeenCalled();
    });

    it('should throw NotFoundException when encounter does not exist', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.findByEncounterId('non-existent-id')).rejects.toThrow(NotFoundException);
      await expect(service.findByEncounterId('non-existent-id')).rejects.toThrow(
        'Encounter with encounterId non-existent-id not found',
      );
    });

    it('should validate access when user is provided', async () => {
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
      entity.subjectReference = 'Patient/456'; // Different patient
      entity.createdAt = new Date();
      entity.updatedAt = new Date();

      repository.findOne.mockResolvedValue(entity);

      await expect(service.findByEncounterId('encounter-1', user)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
