import { Test, TestingModule } from '@nestjs/testing';
import { PractitionersController } from './practitioners.controller';
import { PractitionersService } from './practitioners.service';
import { Practitioner } from '../../common/interfaces/fhir.interface';
import { FHIR_RESOURCE_TYPES } from '../../common/constants/fhir-resource-types';

describe('PractitionersController', () => {
  let controller: PractitionersController;
  let service: PractitionersService;

  const mockPractitionersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PractitionersController],
      providers: [
        {
          provide: PractitionersService,
          useValue: mockPractitionersService,
        },
      ],
    }).compile();

    controller = module.get<PractitionersController>(PractitionersController);
    service = module.get<PractitionersService>(PractitionersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new practitioner', () => {
      const practitionerData: Practitioner = {
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        identifier: [
          {
            system: 'http://example.com/license',
            value: 'MD-12345',
          },
        ],
        name: [
          {
            given: ['Dr. Jane'],
            family: 'Smith',
          },
        ],
        active: true,
      };

      const expectedResult: Practitioner = {
        ...practitionerData,
        id: 'test-practitioner-id',
        meta: {
          versionId: '1',
          lastUpdated: new Date().toISOString(),
        },
      };

      mockPractitionersService.create.mockReturnValue(expectedResult);

      const result = controller.create(practitionerData);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(practitionerData);
    });
  });

  describe('findAll', () => {
    it('should return all practitioners', () => {
      const expectedResult = {
        resourceType: 'Bundle',
        type: 'searchset',
        total: 0,
        entry: [],
      };

      mockPractitionersService.findAll.mockReturnValue(expectedResult);

      const result = controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a practitioner by id', () => {
      const practitionerId = 'test-practitioner-id';
      const expectedResult: Practitioner = {
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        id: practitionerId,
        identifier: [
          {
            system: 'http://example.com/license',
            value: 'MD-12345',
          },
        ],
        name: [
          {
            given: ['Dr. Jane'],
            family: 'Smith',
          },
        ],
        active: true,
      };

      mockPractitionersService.findOne.mockReturnValue(expectedResult);

      const result = controller.findOne(practitionerId);

      expect(result).toEqual(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith(practitionerId);
    });
  });
});
