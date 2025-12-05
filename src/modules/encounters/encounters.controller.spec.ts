import { Test, TestingModule } from '@nestjs/testing';
import { EncountersController } from './encounters.controller';
import { EncountersService } from './encounters.service';
import { Encounter } from '../../common/interfaces/fhir.interface';

describe('EncountersController', () => {
  let controller: EncountersController;
  let service: EncountersService;

  const mockEncountersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
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

  describe('create', () => {
    it('should create a new encounter', () => {
      const encounterData: Encounter = {
        resourceType: 'Encounter',
        status: 'finished',
        class: {
          code: 'AMB',
          display: 'ambulatory',
        },
        subject: {
          reference: 'Patient/test-patient-id',
        },
      };

      const expectedResult: Encounter = {
        ...encounterData,
        id: 'test-encounter-id',
        meta: {
          versionId: '1',
          lastUpdated: new Date().toISOString(),
        },
      };

      mockEncountersService.create.mockReturnValue(expectedResult);

      const result = controller.create(encounterData);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(encounterData);
    });
  });

  describe('findAll', () => {
    it('should return all encounters', () => {
      const expectedResult = {
        resourceType: 'Bundle',
        type: 'searchset',
        total: 0,
        entry: [],
      };

      mockEncountersService.findAll.mockReturnValue(expectedResult);

      const result = controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return an encounter by id', () => {
      const encounterId = 'test-encounter-id';
      const expectedResult: Encounter = {
        resourceType: 'Encounter',
        id: encounterId,
        status: 'finished',
        class: {
          code: 'AMB',
          display: 'ambulatory',
        },
        subject: {
          reference: 'Patient/test-patient-id',
        },
      };

      mockEncountersService.findOne.mockReturnValue(expectedResult);

      const result = controller.findOne(encounterId);

      expect(result).toEqual(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith(encounterId);
    });
  });
});
