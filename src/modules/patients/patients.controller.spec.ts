import { Test, TestingModule } from '@nestjs/testing';
import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';
import { Patient } from '../../common/interfaces/fhir.interface';

describe('PatientsController', () => {
  let controller: PatientsController;
  let service: PatientsService;

  const mockPatientsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PatientsController],
      providers: [
        {
          provide: PatientsService,
          useValue: mockPatientsService,
        },
      ],
    }).compile();

    controller = module.get<PatientsController>(PatientsController);
    service = module.get<PatientsService>(PatientsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new patient', () => {
      const patientData: Patient = {
        resourceType: 'Patient',
        name: [{ given: ['John'], family: 'Doe' }],
        gender: 'male',
      };

      const expectedResult: Patient = {
        ...patientData,
        id: 'test-patient-id',
        meta: {
          versionId: '1',
          lastUpdated: new Date().toISOString(),
        },
      };

      mockPatientsService.create.mockReturnValue(expectedResult);

      const result = controller.create(patientData);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(patientData);
    });
  });

  describe('findAll', () => {
    it('should return all patients', () => {
      const expectedResult = {
        resourceType: 'Bundle',
        type: 'searchset',
        total: 0,
        entry: [],
      };

      mockPatientsService.findAll.mockReturnValue(expectedResult);

      const result = controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a patient by id', () => {
      const patientId = 'test-patient-id';
      const expectedResult: Patient = {
        resourceType: 'Patient',
        id: patientId,
        name: [{ given: ['John'], family: 'Doe' }],
      };

      mockPatientsService.findOne.mockReturnValue(expectedResult);

      const result = controller.findOne(patientId);

      expect(result).toEqual(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith(patientId);
    });
  });
});
