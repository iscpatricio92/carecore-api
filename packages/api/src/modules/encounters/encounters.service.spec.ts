import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

import { EncountersService } from './encounters.service';
import { EncountersCoreService } from './encounters-core.service';
import { EncounterEntity } from '../../entities/encounter.entity';
import { User } from '@carecore/shared';
import { ROLES } from '../../common/constants/roles';

describe('EncountersService', () => {
  let service: EncountersService;
  let coreService: jest.Mocked<EncountersCoreService>;

  const mockCoreService = {
    findAll: jest.fn(),
    findEncounterById: jest.fn(),
    findEncounterByEncounterId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncountersService,
        {
          provide: EncountersCoreService,
          useValue: mockCoreService,
        },
      ],
    }).compile();

    service = module.get<EncountersService>(EncountersService);
    coreService = module.get(EncountersCoreService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an empty list when no encounters exist', async () => {
      mockCoreService.findAll.mockResolvedValue({ entities: [], total: 0 });

      const result = await service.findAll();

      expect(result).toBeDefined();
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(coreService.findAll).toHaveBeenCalledWith(undefined);
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

      mockCoreService.findAll.mockResolvedValue({ entities: [entity1, entity2], total: 2 });

      const result = await service.findAll();

      expect(result.total).toBe(2);
      expect(result.data.length).toBe(2);
      expect(result.data[0].encounterId).toBe('encounter-1');
      expect(result.data[1].encounterId).toBe('encounter-2');
      expect(coreService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should pass user to core service', async () => {
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

      mockCoreService.findAll.mockResolvedValue({ entities: [entity], total: 1 });

      const result = await service.findAll(user);

      expect(result.total).toBe(1);
      expect(result.data[0].subjectReference).toBe('Patient/123');
      expect(coreService.findAll).toHaveBeenCalledWith(user);
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

      mockCoreService.findEncounterById.mockResolvedValue(entity);

      const result = await service.findOne('db-uuid');

      expect(result).toBeDefined();
      expect(result.id).toBe('db-uuid');
      expect(result.encounterId).toBe('test-encounter-id');
      expect(result.status).toBe('finished');
      expect(result.subjectReference).toBe('Patient/test-patient-id');
      expect(coreService.findEncounterById).toHaveBeenCalledWith('db-uuid', undefined);
    });

    it('should throw NotFoundException when encounter does not exist', async () => {
      mockCoreService.findEncounterById.mockRejectedValue(
        new NotFoundException('Encounter with ID non-existent-id not found'),
      );

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(coreService.findEncounterById).toHaveBeenCalledWith('non-existent-id', undefined);
    });

    it('should pass user to core service', async () => {
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

      mockCoreService.findEncounterById.mockResolvedValue(entity);

      const result = await service.findOne('db-uuid', user);

      expect(result).toBeDefined();
      expect(result.id).toBe('db-uuid');
      expect(coreService.findEncounterById).toHaveBeenCalledWith('db-uuid', user);
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

      mockCoreService.findEncounterById.mockRejectedValue(
        new ForbiddenException(
          'You do not have permission to access this encounter. Patients can only access their own encounters.',
        ),
      );

      await expect(service.findOne('db-uuid', user)).rejects.toThrow(ForbiddenException);
      expect(coreService.findEncounterById).toHaveBeenCalledWith('db-uuid', user);
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

      mockCoreService.findEncounterByEncounterId.mockResolvedValue(entity);

      const result = await service.findByEncounterId('test-encounter-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('db-uuid');
      expect(result.encounterId).toBe('test-encounter-id');
      expect(result.status).toBe('finished');
      expect(coreService.findEncounterByEncounterId).toHaveBeenCalledWith(
        'test-encounter-id',
        undefined,
      );
    });

    it('should throw NotFoundException when encounter does not exist', async () => {
      mockCoreService.findEncounterByEncounterId.mockRejectedValue(
        new NotFoundException('Encounter with encounterId non-existent-id not found'),
      );

      await expect(service.findByEncounterId('non-existent-id')).rejects.toThrow(NotFoundException);
      expect(coreService.findEncounterByEncounterId).toHaveBeenCalledWith(
        'non-existent-id',
        undefined,
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

      mockCoreService.findEncounterByEncounterId.mockRejectedValue(
        new ForbiddenException(
          'You do not have permission to access this encounter. Patients can only access their own encounters.',
        ),
      );

      await expect(service.findByEncounterId('encounter-1', user)).rejects.toThrow(
        ForbiddenException,
      );
      expect(coreService.findEncounterByEncounterId).toHaveBeenCalledWith('encounter-1', user);
    });
  });
});
