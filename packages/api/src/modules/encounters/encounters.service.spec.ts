import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { EncountersService } from './encounters.service';
import { Encounter, FHIR_RESOURCE_TYPES } from '@carecore/shared';

describe('EncountersService', () => {
  let service: EncountersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EncountersService],
    }).compile();

    service = module.get<EncountersService>(EncountersService);
    // Clear encounters array before each test
    (service as unknown as { encounters: Encounter[] }).encounters = [];
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new encounter with generated ID', () => {
      const encounterData: Encounter = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        status: 'finished',
        class: {
          code: 'AMB',
          display: 'ambulatory',
        },
        subject: {
          reference: 'Patient/test-patient-id',
        },
      };

      const result = service.create(encounterData);

      expect(result).toBeDefined();
      expect(result.resourceType).toBe(FHIR_RESOURCE_TYPES.ENCOUNTER);
      expect(result.id).toBeDefined();
      expect(result.status).toBe('finished');
      expect(result.class).toEqual(encounterData.class);
      expect(result.subject).toEqual(encounterData.subject);
      expect(result.meta?.versionId).toBe('1');
      expect(result.meta?.lastUpdated).toBeDefined();
    });

    it('should create an encounter with provided ID', () => {
      const encounterData: Encounter = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        id: 'custom-encounter-id',
        status: 'in-progress',
        class: {
          code: 'AMB',
          display: 'ambulatory',
        },
        subject: {
          reference: 'Patient/test-patient-id',
        },
      };

      const result = service.create(encounterData);

      expect(result.id).toBe('custom-encounter-id');
    });

    it('should preserve existing meta data', () => {
      const encounterData: Encounter = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        id: 'test-id',
        status: 'planned',
        class: {
          code: 'AMB',
          display: 'ambulatory',
        },
        meta: {
          versionId: '2',
          lastUpdated: '2024-01-01T00:00:00Z',
        },
        subject: {
          reference: 'Patient/test-patient-id',
        },
      };

      const result = service.create(encounterData);

      expect(result.meta?.versionId).toBe('1'); // Should be overridden
      expect(result.meta?.lastUpdated).toBeDefined(); // Should be updated
    });

    it('should add encounter to internal array', () => {
      const encounterData: Encounter = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        status: 'finished',
        class: {
          code: 'AMB',
          display: 'ambulatory',
        },
        subject: {
          reference: 'Patient/test-patient-id',
        },
      };

      service.create(encounterData);
      const findAllResult = service.findAll();

      expect(findAllResult.total).toBe(1);
      expect(findAllResult.entry.length).toBe(1);
    });
  });

  describe('findAll', () => {
    it('should return an empty bundle', () => {
      const result = service.findAll();

      expect(result).toBeDefined();
      expect(result.resourceType).toBe('Bundle');
      expect(result.type).toBe('searchset');
      expect(result.total).toBe(0);
      expect(result.entry).toEqual([]);
    });

    it('should return bundle with encounters', () => {
      const encounter1: Encounter = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        id: 'encounter-1',
        status: 'finished',
        class: {
          code: 'AMB',
          display: 'ambulatory',
        },
        subject: {
          reference: 'Patient/patient-1',
        },
      };
      const encounter2: Encounter = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        id: 'encounter-2',
        status: 'in-progress',
        class: {
          code: 'AMB',
          display: 'ambulatory',
        },
        subject: {
          reference: 'Patient/patient-2',
        },
      };

      service.create(encounter1);
      service.create(encounter2);

      const result = service.findAll();

      expect(result.total).toBe(2);
      expect(result.entry.length).toBe(2);
      expect(result.entry[0].fullUrl).toBe('urn:uuid:encounter-1');
      expect(result.entry[0].resource).toEqual(expect.objectContaining({ id: 'encounter-1' }));
      expect(result.entry[1].fullUrl).toBe('urn:uuid:encounter-2');
      expect(result.entry[1].resource).toEqual(expect.objectContaining({ id: 'encounter-2' }));
    });
  });

  describe('findOne', () => {
    it('should return an encounter by id', () => {
      const encounterData: Encounter = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        id: 'test-encounter-id',
        status: 'finished',
        class: {
          code: 'AMB',
          display: 'ambulatory',
        },
        subject: {
          reference: 'Patient/test-patient-id',
        },
      };

      service.create(encounterData);
      const result = service.findOne('test-encounter-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('test-encounter-id');
      expect(result.status).toBe('finished');
      expect(result.subject).toEqual(encounterData.subject);
    });

    it('should throw NotFoundException when encounter does not exist', () => {
      expect(() => service.findOne('non-existent-id')).toThrow(NotFoundException);
      expect(() => service.findOne('non-existent-id')).toThrow(
        'Encounter with ID non-existent-id not found',
      );
    });

    it('should find encounter created without explicit ID', () => {
      const encounterData: Encounter = {
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        status: 'finished',
        class: {
          code: 'AMB',
          display: 'ambulatory',
        },
        subject: {
          reference: 'Patient/test-patient-id',
        },
      };

      const created = service.create(encounterData);
      const result = service.findOne(created.id!);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });
  });
});
