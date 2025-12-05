import { Test, TestingModule } from '@nestjs/testing';
import { FhirController } from './fhir.controller';
import { FhirService } from './fhir.service';
import { CreatePatientDto, UpdatePatientDto } from '../../common/dto/fhir-patient.dto';
import {
  CreatePractitionerDto,
  UpdatePractitionerDto,
} from '../../common/dto/fhir-practitioner.dto';
import { CreateEncounterDto, UpdateEncounterDto } from '../../common/dto/fhir-encounter.dto';
import { User } from '../auth/interfaces/user.interface';
import { FHIR_RESOURCE_TYPES } from '../../common/constants/fhir-resource-types';

describe('FhirController', () => {
  let controller: FhirController;
  let service: FhirService;

  const mockUser: User = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    roles: ['patient'],
  };

  const mockFhirService = {
    getCapabilityStatement: jest.fn(),
    createPatient: jest.fn(),
    getPatient: jest.fn(),
    searchPatients: jest.fn(),
    updatePatient: jest.fn(),
    deletePatient: jest.fn(),
    createPractitioner: jest.fn(),
    getPractitioner: jest.fn(),
    searchPractitioners: jest.fn(),
    updatePractitioner: jest.fn(),
    deletePractitioner: jest.fn(),
    createEncounter: jest.fn(),
    getEncounter: jest.fn(),
    searchEncounters: jest.fn(),
    updateEncounter: jest.fn(),
    deleteEncounter: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FhirController],
      providers: [
        {
          provide: FhirService,
          useValue: mockFhirService,
        },
      ],
    }).compile();

    controller = module.get<FhirController>(FhirController);
    service = module.get<FhirService>(FhirService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetadata', () => {
    it('should return CapabilityStatement', () => {
      const expectedResult = {
        resourceType: 'CapabilityStatement',
        status: 'active',
      };

      mockFhirService.getCapabilityStatement.mockReturnValue(expectedResult);

      const result = controller.getMetadata();

      expect(result).toEqual(expectedResult);
      expect(service.getCapabilityStatement).toHaveBeenCalled();
    });
  });

  describe('createPatient', () => {
    it('should create a new patient', async () => {
      const createDto: CreatePatientDto = {
        name: [{ given: ['John'], family: 'Doe' }],
      };

      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        id: 'test-id',
        ...createDto,
      };

      mockFhirService.createPatient.mockResolvedValue(expectedResult);

      const result = await controller.createPatient(createDto, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.createPatient).toHaveBeenCalledWith(createDto, mockUser);
    });
  });

  describe('getPatient', () => {
    it('should return a patient by id', async () => {
      const patientId = 'test-id';
      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        id: patientId,
        name: [{ given: ['John'], family: 'Doe' }],
      };

      mockFhirService.getPatient.mockResolvedValue(expectedResult);

      const result = await controller.getPatient(patientId, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.getPatient).toHaveBeenCalledWith(patientId, mockUser);
    });
  });

  describe('searchPatients', () => {
    it('should search patients with pagination', async () => {
      const pagination = { page: 1, limit: 10 };
      const expectedResult = {
        total: 0,
        entries: [],
      };

      mockFhirService.searchPatients.mockResolvedValue(expectedResult);

      const result = await controller.searchPatients(pagination, undefined, undefined, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.searchPatients).toHaveBeenCalledWith(pagination, mockUser);
    });

    it('should search patients with filters', async () => {
      const pagination = { page: 1, limit: 10 };
      const name = 'John';
      const identifier = '123';

      const expectedResult = {
        total: 1,
        entries: [
          {
            resourceType: FHIR_RESOURCE_TYPES.PATIENT,
            id: 'test-id',
            name: [{ given: ['John'], family: 'Doe' }],
          },
        ],
      };

      mockFhirService.searchPatients.mockResolvedValue(expectedResult);

      const result = await controller.searchPatients(pagination, name, identifier, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.searchPatients).toHaveBeenCalledWith(
        {
          ...pagination,
          name,
          identifier,
        },
        mockUser,
      );
    });
  });

  describe('updatePatient', () => {
    it('should update a patient', async () => {
      const patientId = 'test-id';
      const updateDto: UpdatePatientDto = {
        name: [{ given: ['Jane'], family: 'Doe' }],
        gender: 'female',
      };

      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        id: patientId,
        gender: 'female',
      };

      mockFhirService.updatePatient.mockResolvedValue(expectedResult);

      const result = await controller.updatePatient(patientId, updateDto, mockUser);

      expect(result).toEqual(expectedResult);
      expect(service.updatePatient).toHaveBeenCalledWith(patientId, updateDto, mockUser);
    });
  });

  describe('deletePatient', () => {
    it('should delete a patient', async () => {
      const patientId = 'test-id';

      mockFhirService.deletePatient.mockResolvedValue(undefined);

      await controller.deletePatient(patientId, mockUser);

      expect(service.deletePatient).toHaveBeenCalledWith(patientId, mockUser);
    });
  });

  // ========== Practitioner Tests ==========

  describe('createPractitioner', () => {
    it('should create a new practitioner', async () => {
      const createDto: CreatePractitionerDto = {
        identifier: [{ system: 'http://example.com/license', value: 'MD-123' }],
        name: [{ given: ['Dr. Jane'], family: 'Smith' }],
      };

      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        id: 'test-id',
        ...createDto,
      };

      mockFhirService.createPractitioner.mockResolvedValue(expectedResult);

      const result = await controller.createPractitioner(createDto);

      expect(result).toEqual(expectedResult);
      expect(service.createPractitioner).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getPractitioner', () => {
    it('should return a practitioner by id', async () => {
      const practitionerId = 'test-id';
      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        id: practitionerId,
        name: [{ given: ['Dr. Jane'], family: 'Smith' }],
      };

      mockFhirService.getPractitioner.mockResolvedValue(expectedResult);

      const result = await controller.getPractitioner(practitionerId);

      expect(result).toEqual(expectedResult);
      expect(service.getPractitioner).toHaveBeenCalledWith(practitionerId);
    });
  });

  describe('searchPractitioners', () => {
    it('should search practitioners with pagination and filters', async () => {
      const pagination = { page: 1, limit: 10 };
      const name = 'Jane';
      const identifier = 'MD-123';

      const expectedResult = {
        total: 1,
        entries: [
          {
            resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
            id: 'test-id',
            name: [{ given: ['Dr. Jane'], family: 'Smith' }],
          },
        ],
      };

      mockFhirService.searchPractitioners.mockResolvedValue(expectedResult);

      const result = await controller.searchPractitioners(pagination, name, identifier);

      expect(result).toEqual(expectedResult);
      expect(service.searchPractitioners).toHaveBeenCalledWith({
        ...pagination,
        name,
        identifier,
      });
    });
  });

  describe('updatePractitioner', () => {
    it('should update a practitioner', async () => {
      const practitionerId = 'test-id';
      const updateDto: UpdatePractitionerDto = {
        identifier: [{ system: 'http://example.com/license', value: 'MD-123' }],
        name: [{ given: ['Dr. Jane'], family: 'Smith' }],
        active: false,
      };

      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        id: practitionerId,
        active: false,
      };

      mockFhirService.updatePractitioner.mockResolvedValue(expectedResult);

      const result = await controller.updatePractitioner(practitionerId, updateDto);

      expect(result).toEqual(expectedResult);
      expect(service.updatePractitioner).toHaveBeenCalledWith(practitionerId, updateDto);
    });
  });

  describe('deletePractitioner', () => {
    it('should delete a practitioner', async () => {
      const practitionerId = 'test-id';

      mockFhirService.deletePractitioner.mockResolvedValue(undefined);

      await controller.deletePractitioner(practitionerId);

      expect(service.deletePractitioner).toHaveBeenCalledWith(practitionerId);
    });
  });

  // ========== Encounter Tests ==========

  describe('createEncounter', () => {
    it('should create a new encounter', async () => {
      const createDto: CreateEncounterDto = {
        status: 'finished',
        class: { code: 'AMB', display: 'ambulatory' },
        subject: { reference: 'Patient/123' },
        period: { start: '2024-01-15T10:00:00Z' },
      };

      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        id: 'test-id',
        ...createDto,
      };

      mockFhirService.createEncounter.mockResolvedValue(expectedResult);

      const result = await controller.createEncounter(createDto);

      expect(result).toEqual(expectedResult);
      expect(service.createEncounter).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getEncounter', () => {
    it('should return an encounter by id', async () => {
      const encounterId = 'test-id';
      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        id: encounterId,
        status: 'finished',
      };

      mockFhirService.getEncounter.mockResolvedValue(expectedResult);

      const result = await controller.getEncounter(encounterId);

      expect(result).toEqual(expectedResult);
      expect(service.getEncounter).toHaveBeenCalledWith(encounterId);
    });
  });

  describe('searchEncounters', () => {
    it('should search encounters with pagination and filters', async () => {
      const pagination = { page: 1, limit: 10 };
      const subject = 'Patient/123';
      const status = 'finished';
      const date = '2024-01-15';

      const expectedResult = {
        total: 1,
        entries: [
          {
            resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
            id: 'test-id',
            status: 'finished',
            subject: { reference: 'Patient/123' },
          },
        ],
      };

      mockFhirService.searchEncounters.mockResolvedValue(expectedResult);

      const result = await controller.searchEncounters(pagination, subject, status, date);

      expect(result).toEqual(expectedResult);
      expect(service.searchEncounters).toHaveBeenCalledWith({
        ...pagination,
        subject,
        status,
        date,
      });
    });
  });

  describe('updateEncounter', () => {
    it('should update an encounter', async () => {
      const encounterId = 'test-id';
      const updateDto: UpdateEncounterDto = {
        status: 'finished',
        class: { code: 'AMB', display: 'ambulatory' },
        subject: { reference: 'Patient/123' },
        period: { start: '2024-01-15T10:00:00Z', end: '2024-01-15T10:30:00Z' },
      };

      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        id: encounterId,
        status: 'finished',
      };

      mockFhirService.updateEncounter.mockResolvedValue(expectedResult);

      const result = await controller.updateEncounter(encounterId, updateDto);

      expect(result).toEqual(expectedResult);
      expect(service.updateEncounter).toHaveBeenCalledWith(encounterId, updateDto);
    });
  });

  describe('deleteEncounter', () => {
    it('should delete an encounter', async () => {
      const encounterId = 'test-id';

      mockFhirService.deleteEncounter.mockResolvedValue(undefined);

      await controller.deleteEncounter(encounterId);

      expect(service.deleteEncounter).toHaveBeenCalledWith(encounterId);
    });
  });
});
