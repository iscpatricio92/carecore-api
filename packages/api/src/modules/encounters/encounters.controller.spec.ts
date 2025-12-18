import { Test, TestingModule } from '@nestjs/testing';
import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';
import { EncounterDetailDto } from '../../common/dto/encounter.dto';
import { User } from '@carecore/shared';
import { ROLES } from '../../common/constants/roles';

describe('EncountersController', () => {
  let controller: EncountersController;
  let service: EncountersService;

  const mockEncountersService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByEncounterId: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EncountersController],
      providers: [
        {
          provide: EncountersService,
          useValue: mockEncountersService,
        },
      ],
    }).compile();

    controller = module.get<EncountersController>(EncountersController);
    service = module.get<EncountersService>(EncountersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all encounters', async () => {
      const expectedResult = {
        data: [],
        total: 0,
      };

      mockEncountersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should pass user to service when provided', async () => {
      const user: User = {
        id: 'patient-user',
        keycloakUserId: 'patient-user',
        username: 'patient',
        email: 'patient@example.com',
        roles: [ROLES.PATIENT],
        patient: 'Patient/123',
      };

      const expectedResult = {
        data: [
          {
            id: 'db-uuid',
            encounterId: 'encounter-1',
            status: 'finished',
            subjectReference: 'Patient/123',
            createdAt: new Date(),
          },
        ],
        total: 1,
      };

      mockEncountersService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll(undefined, undefined, user);

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalledWith(user);
    });
  });

  describe('findOne', () => {
    it('should return an encounter by id', async () => {
      const encounterId = 'test-encounter-id';
      const expectedResult = {
        id: 'db-uuid',
        encounterId: 'test-encounter-id',
        status: 'finished',
        subjectReference: 'Patient/test-patient-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        fhirResource: undefined,
      } as EncounterDetailDto;

      mockEncountersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(encounterId);

      expect(result).toEqual(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith(encounterId, undefined);
    });

    it('should pass user to service when provided', async () => {
      const user: User = {
        id: 'patient-user',
        keycloakUserId: 'patient-user',
        username: 'patient',
        email: 'patient@example.com',
        roles: [ROLES.PATIENT],
        patient: 'Patient/123',
      };

      const encounterId = 'test-encounter-id';
      const expectedResult = {
        id: 'db-uuid',
        encounterId: 'test-encounter-id',
        status: 'finished',
        subjectReference: 'Patient/123',
        createdAt: new Date(),
        updatedAt: new Date(),
        fhirResource: undefined,
      } as EncounterDetailDto;

      mockEncountersService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(encounterId, user);

      expect(result).toEqual(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith(encounterId, user);
    });

    it('should try findByEncounterId when findOne throws NotFoundException', async () => {
      const encounterId = 'test-encounter-id';
      const expectedResult = {
        id: 'db-uuid',
        encounterId: 'test-encounter-id',
        status: 'finished',
        subjectReference: 'Patient/test-patient-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        fhirResource: undefined,
      } as EncounterDetailDto;

      const { NotFoundException } = await import('@nestjs/common');
      mockEncountersService.findOne.mockRejectedValue(
        new NotFoundException('Encounter with ID test-encounter-id not found'),
      );
      mockEncountersService.findByEncounterId.mockResolvedValue(expectedResult);

      const result = await controller.findOne(encounterId);

      expect(result).toEqual(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith(encounterId, undefined);
      expect(service.findByEncounterId).toHaveBeenCalledWith(encounterId, undefined);
    });

    it('should re-throw ForbiddenException when patient tries to access another patient encounter', async () => {
      const user: User = {
        id: 'patient-user',
        keycloakUserId: 'patient-user',
        username: 'patient',
        email: 'patient@example.com',
        roles: [ROLES.PATIENT],
        patient: 'Patient/123',
      };

      const encounterId = 'test-encounter-id';
      const { ForbiddenException } = await import('@nestjs/common');
      const forbiddenError = new ForbiddenException(
        'You do not have permission to access this encounter. Patients can only access their own encounters.',
      );

      mockEncountersService.findOne.mockRejectedValue(forbiddenError);

      await expect(controller.findOne(encounterId, user)).rejects.toThrow(ForbiddenException);
      expect(service.findByEncounterId).not.toHaveBeenCalled();
    });
  });
});
