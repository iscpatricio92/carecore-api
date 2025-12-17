import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PractitionersService } from './practitioners.service';
import { Practitioner, FHIR_RESOURCE_TYPES } from '@carecore/shared';

describe('PractitionersService', () => {
  let service: PractitionersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PractitionersService],
    }).compile();

    service = module.get<PractitionersService>(PractitionersService);
    // Clear practitioners array before each test
    (service as unknown as { practitioners: Practitioner[] }).practitioners = [];
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new practitioner with generated ID', () => {
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

      const result = service.create(practitionerData);

      expect(result).toBeDefined();
      expect(result.resourceType).toBe(FHIR_RESOURCE_TYPES.PRACTITIONER);
      expect(result.id).toBeDefined();
      expect(result.identifier).toEqual(practitionerData.identifier);
      expect(result.name).toEqual(practitionerData.name);
      expect(result.active).toBe(true);
      expect(result.meta?.versionId).toBe('1');
      expect(result.meta?.lastUpdated).toBeDefined();
    });

    it('should create a practitioner with provided ID', () => {
      const practitionerData: Practitioner = {
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        id: 'custom-practitioner-id',
        identifier: [
          {
            system: 'http://example.com/license',
            value: 'MD-12345',
          },
        ],
        name: [
          {
            given: ['Dr. John'],
            family: 'Doe',
          },
        ],
        active: true,
      };

      const result = service.create(practitionerData);

      expect(result.id).toBe('custom-practitioner-id');
    });

    it('should preserve existing meta data', () => {
      const practitionerData: Practitioner = {
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        id: 'test-id',
        identifier: [
          {
            system: 'http://example.com/license',
            value: 'MD-12345',
          },
        ],
        name: [
          {
            given: ['Dr. Test'],
            family: 'User',
          },
        ],
        meta: {
          versionId: '2',
          lastUpdated: '2024-01-01T00:00:00Z',
        },
        active: true,
      };

      const result = service.create(practitionerData);

      expect(result.meta?.versionId).toBe('1'); // Should be overridden
      expect(result.meta?.lastUpdated).toBeDefined(); // Should be updated
    });

    it('should add practitioner to internal array', () => {
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

      service.create(practitionerData);
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

    it('should return bundle with practitioners', () => {
      const practitioner1: Practitioner = {
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        id: 'practitioner-1',
        identifier: [
          {
            system: 'http://example.com/license',
            value: 'MD-001',
          },
        ],
        name: [
          {
            given: ['Dr. John'],
            family: 'Doe',
          },
        ],
        active: true,
      };
      const practitioner2: Practitioner = {
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        id: 'practitioner-2',
        identifier: [
          {
            system: 'http://example.com/license',
            value: 'MD-002',
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

      service.create(practitioner1);
      service.create(practitioner2);

      const result = service.findAll();

      expect(result.total).toBe(2);
      expect(result.entry.length).toBe(2);
      expect(result.entry[0].fullUrl).toBe('urn:uuid:practitioner-1');
      expect(result.entry[0].resource).toEqual(expect.objectContaining({ id: 'practitioner-1' }));
      expect(result.entry[1].fullUrl).toBe('urn:uuid:practitioner-2');
      expect(result.entry[1].resource).toEqual(expect.objectContaining({ id: 'practitioner-2' }));
    });
  });

  describe('findOne', () => {
    it('should return a practitioner by id', () => {
      const practitionerData: Practitioner = {
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        id: 'test-practitioner-id',
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

      service.create(practitionerData);
      const result = service.findOne('test-practitioner-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('test-practitioner-id');
      expect(result.identifier).toEqual(practitionerData.identifier);
      expect(result.name).toEqual(practitionerData.name);
    });

    it('should throw NotFoundException when practitioner does not exist', () => {
      expect(() => service.findOne('non-existent-id')).toThrow(NotFoundException);
      expect(() => service.findOne('non-existent-id')).toThrow(
        'Practitioner with ID non-existent-id not found',
      );
    });

    it('should find practitioner created without explicit ID', () => {
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

      const created = service.create(practitionerData);
      const result = service.findOne(created.id!);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });
  });
});
