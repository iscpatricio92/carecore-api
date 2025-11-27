import { Test, TestingModule } from '@nestjs/testing';
import { FhirController } from './fhir.controller';
import { FhirService } from './fhir.service';
import { CreatePatientDto, UpdatePatientDto } from '../../common/dto/fhir-patient.dto';

describe('FhirController', () => {
  let controller: FhirController;
  let service: FhirService;

  const mockFhirService = {
    getCapabilityStatement: jest.fn(),
    createPatient: jest.fn(),
    getPatient: jest.fn(),
    searchPatients: jest.fn(),
    updatePatient: jest.fn(),
    deletePatient: jest.fn(),
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
        resourceType: 'Patient',
        id: 'test-id',
        ...createDto,
      };

      mockFhirService.createPatient.mockResolvedValue(expectedResult);

      const result = await controller.createPatient(createDto);

      expect(result).toEqual(expectedResult);
      expect(service.createPatient).toHaveBeenCalledWith(createDto);
    });
  });

  describe('getPatient', () => {
    it('should return a patient by id', async () => {
      const patientId = 'test-id';
      const expectedResult = {
        resourceType: 'Patient',
        id: patientId,
        name: [{ given: ['John'], family: 'Doe' }],
      };

      mockFhirService.getPatient.mockResolvedValue(expectedResult);

      const result = await controller.getPatient(patientId);

      expect(result).toEqual(expectedResult);
      expect(service.getPatient).toHaveBeenCalledWith(patientId);
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

      const result = await controller.searchPatients(pagination);

      expect(result).toEqual(expectedResult);
      expect(service.searchPatients).toHaveBeenCalledWith(pagination);
    });

    it('should search patients with filters', async () => {
      const pagination = { page: 1, limit: 10 };
      const name = 'John';
      const identifier = '123';

      const expectedResult = {
        total: 1,
        entries: [
          {
            resourceType: 'Patient',
            id: 'test-id',
            name: [{ given: ['John'], family: 'Doe' }],
          },
        ],
      };

      mockFhirService.searchPatients.mockResolvedValue(expectedResult);

      const result = await controller.searchPatients(pagination, name, identifier);

      expect(result).toEqual(expectedResult);
      expect(service.searchPatients).toHaveBeenCalledWith({
        ...pagination,
        name,
        identifier,
      });
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
        resourceType: 'Patient',
        id: patientId,
        gender: 'female',
      };

      mockFhirService.updatePatient.mockResolvedValue(expectedResult);

      const result = await controller.updatePatient(patientId, updateDto);

      expect(result).toEqual(expectedResult);
      expect(service.updatePatient).toHaveBeenCalledWith(patientId, updateDto);
    });
  });

  describe('deletePatient', () => {
    it('should delete a patient', async () => {
      const patientId = 'test-id';

      mockFhirService.deletePatient.mockResolvedValue(undefined);

      await controller.deletePatient(patientId);

      expect(service.deletePatient).toHaveBeenCalledWith(patientId);
    });
  });
});
