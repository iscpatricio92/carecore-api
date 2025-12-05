import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { Patient } from '../../common/interfaces/fhir.interface';
import { FHIR_RESOURCE_TYPES } from '../../common/constants/fhir-resource-types';

describe('PatientsService', () => {
  let service: PatientsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PatientsService],
    }).compile();

    service = module.get<PatientsService>(PatientsService);
    // Clear patients array before each test
    (service as unknown as { patients: Patient[] }).patients = [];
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new patient with generated ID', () => {
      const patientData: Patient = {
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        name: [{ given: ['John'], family: 'Doe' }],
        gender: 'male',
      };

      const result = service.create(patientData);

      expect(result).toBeDefined();
      expect(result.resourceType).toBe(FHIR_RESOURCE_TYPES.PATIENT);
      expect(result.id).toBeDefined();
      expect(result.name).toEqual(patientData.name);
      expect(result.gender).toBe('male');
      expect(result.meta?.versionId).toBe('1');
      expect(result.meta?.lastUpdated).toBeDefined();
    });

    it('should create a patient with provided ID', () => {
      const patientData: Patient = {
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        id: 'custom-patient-id',
        name: [{ given: ['Jane'], family: 'Smith' }],
      };

      const result = service.create(patientData);

      expect(result.id).toBe('custom-patient-id');
    });

    it('should preserve existing meta data', () => {
      const patientData: Patient = {
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        id: 'test-id',
        meta: {
          versionId: '2',
          lastUpdated: '2024-01-01T00:00:00Z',
        },
        name: [{ given: ['Test'], family: 'User' }],
      };

      const result = service.create(patientData);

      expect(result.meta?.versionId).toBe('1'); // Should be overridden
      expect(result.meta?.lastUpdated).toBeDefined(); // Should be updated
    });

    it('should add patient to internal array', () => {
      const patientData: Patient = {
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        name: [{ given: ['John'], family: 'Doe' }],
      };

      service.create(patientData);
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

    it('should return bundle with patients', () => {
      const patient1: Patient = {
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        id: 'patient-1',
        name: [{ given: ['John'], family: 'Doe' }],
      };
      const patient2: Patient = {
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        id: 'patient-2',
        name: [{ given: ['Jane'], family: 'Smith' }],
      };

      service.create(patient1);
      service.create(patient2);

      const result = service.findAll();

      expect(result.total).toBe(2);
      expect(result.entry.length).toBe(2);
      expect(result.entry[0].fullUrl).toBe('urn:uuid:patient-1');
      expect(result.entry[0].resource).toEqual(expect.objectContaining({ id: 'patient-1' }));
      expect(result.entry[1].fullUrl).toBe('urn:uuid:patient-2');
      expect(result.entry[1].resource).toEqual(expect.objectContaining({ id: 'patient-2' }));
    });
  });

  describe('findOne', () => {
    it('should return a patient by id', () => {
      const patientData: Patient = {
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        id: 'test-patient-id',
        name: [{ given: ['John'], family: 'Doe' }],
      };

      service.create(patientData);
      const result = service.findOne('test-patient-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('test-patient-id');
      expect(result.name).toEqual(patientData.name);
    });

    it('should throw NotFoundException when patient does not exist', () => {
      expect(() => service.findOne('non-existent-id')).toThrow(NotFoundException);
      expect(() => service.findOne('non-existent-id')).toThrow(
        'Patient with ID non-existent-id not found',
      );
    });

    it('should find patient created without explicit ID', () => {
      const patientData: Patient = {
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        name: [{ given: ['John'], family: 'Doe' }],
      };

      const created = service.create(patientData);
      const result = service.findOne(created.id!);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });
  });
});
