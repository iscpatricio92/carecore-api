import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { FhirService } from './fhir.service';
import { CreatePatientDto, UpdatePatientDto } from '../../common/dto/fhir-patient.dto';
import {
  CreatePractitionerDto,
  UpdatePractitionerDto,
} from '../../common/dto/fhir-practitioner.dto';
import { CreateEncounterDto, UpdateEncounterDto } from '../../common/dto/fhir-encounter.dto';

describe('FhirService', () => {
  let service: FhirService;
  let logger: PinoLogger;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockLogger = {
    setContext: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FhirService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: PinoLogger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<FhirService>(FhirService);
    logger = module.get<PinoLogger>(PinoLogger);

    mockConfigService.get.mockReturnValue('http://localhost:3000/api/fhir');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCapabilityStatement', () => {
    it('should return CapabilityStatement', () => {
      const result = service.getCapabilityStatement();

      expect(result).toBeDefined();
      expect(result.resourceType).toBe('CapabilityStatement');
      expect(result.status).toBe('active');
      expect(result.fhirVersion).toBe('4.0.1');
      expect(result.software.name).toBe('CareCore API');
    });

    it('should use default base URL when not configured', () => {
      mockConfigService.get.mockReturnValue(null);

      const result = service.getCapabilityStatement();

      expect(result.implementation.url).toBe('http://localhost:3000/api/fhir');
    });
  });

  describe('createPatient', () => {
    it('should create a new patient', async () => {
      const createDto: CreatePatientDto = {
        name: [
          {
            given: ['John'],
            family: 'Doe',
          },
        ],
        gender: 'male',
      };

      const result = await service.createPatient(createDto);

      expect(result).toBeDefined();
      expect(result.resourceType).toBe('Patient');
      expect(result.id).toBeDefined();
      expect(result.name).toEqual(createDto.name);
      expect(result.meta?.versionId).toBe('1');
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('getPatient', () => {
    it('should return a patient by id', async () => {
      const createDto: CreatePatientDto = {
        name: [{ given: ['Jane'], family: 'Smith' }],
      };

      const created = await service.createPatient(createDto);
      const patientId = created.id || '';
      const result = await service.getPatient(patientId);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.name).toEqual(createDto.name);
    });

    it('should throw NotFoundException when patient does not exist', async () => {
      await expect(service.getPatient('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchPatients', () => {
    beforeEach(async () => {
      // Create test patients
      await service.createPatient({
        name: [{ given: ['John'], family: 'Doe' }],
        identifier: [{ system: 'http://example.com/id', value: '123' }],
      });
      await service.createPatient({
        name: [{ given: ['Jane'], family: 'Smith' }],
        identifier: [{ system: 'http://example.com/id', value: '456' }],
      });
    });

    it('should return all patients when no filters', async () => {
      const result = await service.searchPatients({});

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.entries).toBeDefined();
    });

    it('should filter patients by name', async () => {
      const result = await service.searchPatients({ name: 'John' });

      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.entries[0].name?.[0].given?.[0]).toBe('John');
    });

    it('should filter patients by identifier', async () => {
      const result = await service.searchPatients({ identifier: '123' });

      expect(result.entries.length).toBe(1);
      expect(result.entries[0].identifier?.[0].value).toBe('123');
    });

    it('should paginate results', async () => {
      const result = await service.searchPatients({ page: 1, limit: 1 });

      expect(result.entries.length).toBe(1);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('updatePatient', () => {
    it('should update an existing patient', async () => {
      const createDto: CreatePatientDto = {
        name: [{ given: ['John'], family: 'Doe' }],
        gender: 'male',
      };

      const created = await service.createPatient(createDto);
      const patientId = created.id || '';
      const updateDto: UpdatePatientDto = {
        name: [{ given: ['Jane'], family: 'Doe' }],
        gender: 'female',
      };

      const result = await service.updatePatient(patientId, updateDto);

      expect(result.gender).toBe('female');
      expect(result.meta?.versionId).toBe('2');
      expect(logger.info).toHaveBeenCalled();
    });

    it('should throw NotFoundException when patient does not exist', async () => {
      const updateDto: UpdatePatientDto = {
        name: [{ given: ['Test'], family: 'User' }],
        gender: 'male',
      };

      await expect(service.updatePatient('non-existent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deletePatient', () => {
    it('should delete a patient', async () => {
      const createDto: CreatePatientDto = {
        name: [{ given: ['John'], family: 'Doe' }],
      };

      const created = await service.createPatient(createDto);
      const patientId = created.id || '';
      await service.deletePatient(patientId);

      await expect(service.getPatient(patientId)).rejects.toThrow(NotFoundException);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should throw NotFoundException when patient does not exist', async () => {
      await expect(service.deletePatient('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ========== Practitioner Tests ==========

  describe('createPractitioner', () => {
    it('should create a new practitioner', async () => {
      const createDto: CreatePractitionerDto = {
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

      const result = await service.createPractitioner(createDto);

      expect(result).toBeDefined();
      expect(result.resourceType).toBe('Practitioner');
      expect(result.id).toBeDefined();
      expect(result.name).toEqual(createDto.name);
      expect(result.meta?.versionId).toBe('1');
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('getPractitioner', () => {
    it('should return a practitioner by id', async () => {
      const createDto: CreatePractitionerDto = {
        identifier: [{ system: 'http://example.com/license', value: 'MD-123' }],
        name: [{ given: ['Dr. John'], family: 'Doe' }],
      };

      const created = await service.createPractitioner(createDto);
      const practitionerId = created.id || '';
      const result = await service.getPractitioner(practitionerId);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.name).toEqual(createDto.name);
    });

    it('should throw NotFoundException when practitioner does not exist', async () => {
      await expect(service.getPractitioner('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchPractitioners', () => {
    beforeEach(async () => {
      await service.createPractitioner({
        identifier: [{ system: 'http://example.com/license', value: 'MD-123' }],
        name: [{ given: ['Dr. John'], family: 'Doe' }],
      });
      await service.createPractitioner({
        identifier: [{ system: 'http://example.com/license', value: 'MD-456' }],
        name: [{ given: ['Dr. Jane'], family: 'Smith' }],
      });
    });

    it('should return all practitioners when no filters', async () => {
      const result = await service.searchPractitioners({});

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.entries).toBeDefined();
    });

    it('should filter practitioners by name', async () => {
      const result = await service.searchPractitioners({ name: 'John' });

      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.entries[0].name?.[0].given?.[0]).toContain('John');
    });

    it('should filter practitioners by identifier', async () => {
      const result = await service.searchPractitioners({ identifier: 'MD-123' });

      expect(result.entries.length).toBe(1);
      expect(result.entries[0].identifier?.[0].value).toBe('MD-123');
    });

    it('should paginate results', async () => {
      const result = await service.searchPractitioners({ page: 1, limit: 1 });

      expect(result.entries.length).toBe(1);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('updatePractitioner', () => {
    it('should update an existing practitioner', async () => {
      const createDto: CreatePractitionerDto = {
        identifier: [{ system: 'http://example.com/license', value: 'MD-123' }],
        name: [{ given: ['Dr. John'], family: 'Doe' }],
        active: true,
      };

      const created = await service.createPractitioner(createDto);
      const practitionerId = created.id || '';
      const updateDto: UpdatePractitionerDto = {
        identifier: [{ system: 'http://example.com/license', value: 'MD-123' }],
        name: [{ given: ['Dr. Jane'], family: 'Smith' }],
        active: false,
      };

      const result = await service.updatePractitioner(practitionerId, updateDto);

      expect(result.active).toBe(false);
      expect(result.meta?.versionId).toBe('2');
      expect(logger.info).toHaveBeenCalled();
    });

    it('should throw NotFoundException when practitioner does not exist', async () => {
      const updateDto: UpdatePractitionerDto = {
        identifier: [{ system: 'http://example.com/license', value: 'MD-123' }],
        name: [{ given: ['Dr. Test'], family: 'User' }],
      };

      await expect(service.updatePractitioner('non-existent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deletePractitioner', () => {
    it('should delete a practitioner', async () => {
      const createDto: CreatePractitionerDto = {
        identifier: [{ system: 'http://example.com/license', value: 'MD-123' }],
        name: [{ given: ['Dr. John'], family: 'Doe' }],
      };

      const created = await service.createPractitioner(createDto);
      const practitionerId = created.id || '';
      await service.deletePractitioner(practitionerId);

      await expect(service.getPractitioner(practitionerId)).rejects.toThrow(NotFoundException);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should throw NotFoundException when practitioner does not exist', async () => {
      await expect(service.deletePractitioner('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ========== Encounter Tests ==========

  describe('createEncounter', () => {
    it('should create a new encounter', async () => {
      // First create a patient for the encounter
      const patient = await service.createPatient({
        name: [{ given: ['John'], family: 'Doe' }],
      });

      const createDto: CreateEncounterDto = {
        status: 'finished',
        class: {
          system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
          code: 'AMB',
          display: 'ambulatory',
        },
        subject: {
          reference: `Patient/${patient.id}`,
          display: 'John Doe',
        },
        period: {
          start: '2024-01-15T10:00:00Z',
          end: '2024-01-15T10:30:00Z',
        },
      };

      const result = await service.createEncounter(createDto);

      expect(result).toBeDefined();
      expect(result.resourceType).toBe('Encounter');
      expect(result.id).toBeDefined();
      expect(result.status).toBe('finished');
      expect(result.meta?.versionId).toBe('1');
      expect(logger.info).toHaveBeenCalled();
    });
  });

  describe('getEncounter', () => {
    it('should return an encounter by id', async () => {
      const patient = await service.createPatient({
        name: [{ given: ['John'], family: 'Doe' }],
      });

      const createDto: CreateEncounterDto = {
        status: 'finished',
        class: {
          code: 'AMB',
          display: 'ambulatory',
        },
        subject: {
          reference: `Patient/${patient.id}`,
        },
        period: {
          start: '2024-01-15T10:00:00Z',
        },
      };

      const created = await service.createEncounter(createDto);
      const encounterId = created.id || '';
      const result = await service.getEncounter(encounterId);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
      expect(result.status).toBe('finished');
    });

    it('should throw NotFoundException when encounter does not exist', async () => {
      await expect(service.getEncounter('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchEncounters', () => {
    let patientId: string;

    beforeEach(async () => {
      const patient = await service.createPatient({
        name: [{ given: ['John'], family: 'Doe' }],
      });
      patientId = patient.id || '';

      await service.createEncounter({
        status: 'finished',
        class: { code: 'AMB', display: 'ambulatory' },
        subject: { reference: `Patient/${patientId}` },
        period: { start: '2024-01-15T10:00:00Z', end: '2024-01-15T10:30:00Z' },
      });

      await service.createEncounter({
        status: 'planned',
        class: { code: 'AMB', display: 'ambulatory' },
        subject: { reference: `Patient/${patientId}` },
        period: { start: '2024-01-20T14:00:00Z' },
      });
    });

    it('should return all encounters when no filters', async () => {
      const result = await service.searchEncounters({});

      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.entries).toBeDefined();
    });

    it('should filter encounters by subject (patient)', async () => {
      const result = await service.searchEncounters({
        subject: `Patient/${patientId}`,
      });

      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.entries[0].subject?.reference).toContain(patientId);
    });

    it('should filter encounters by status', async () => {
      const result = await service.searchEncounters({ status: 'finished' });

      expect(result.entries.length).toBeGreaterThan(0);
      expect(result.entries[0].status).toBe('finished');
    });

    it('should filter encounters by date', async () => {
      const result = await service.searchEncounters({ date: '2024-01-15' });

      expect(result.entries.length).toBeGreaterThan(0);
      if (result.entries.length > 0) {
        expect(result.entries[0].period?.start).toContain('2024-01-15');
      }
    });

    it('should paginate results', async () => {
      const result = await service.searchEncounters({ page: 1, limit: 1 });

      expect(result.entries.length).toBe(1);
      expect(result.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('updateEncounter', () => {
    it('should update an existing encounter', async () => {
      const patient = await service.createPatient({
        name: [{ given: ['John'], family: 'Doe' }],
      });

      const createDto: CreateEncounterDto = {
        status: 'in-progress',
        class: { code: 'AMB', display: 'ambulatory' },
        subject: { reference: `Patient/${patient.id}` },
        period: { start: '2024-01-15T10:00:00Z' },
      };

      const created = await service.createEncounter(createDto);
      const encounterId = created.id || '';
      const updateDto: UpdateEncounterDto = {
        ...createDto,
        status: 'finished',
        period: {
          start: '2024-01-15T10:00:00Z',
          end: '2024-01-15T10:30:00Z',
        },
      };

      const result = await service.updateEncounter(encounterId, updateDto);

      expect(result.status).toBe('finished');
      expect(result.period?.end).toBeDefined();
      expect(result.meta?.versionId).toBe('2');
      expect(logger.info).toHaveBeenCalled();
    });

    it('should throw NotFoundException when encounter does not exist', async () => {
      const updateDto: UpdateEncounterDto = {
        status: 'finished',
        class: { code: 'AMB' },
        subject: { reference: 'Patient/123' },
        period: { start: '2024-01-15T10:00:00Z' },
      };

      await expect(service.updateEncounter('non-existent-id', updateDto)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteEncounter', () => {
    it('should delete an encounter', async () => {
      const patient = await service.createPatient({
        name: [{ given: ['John'], family: 'Doe' }],
      });

      const createDto: CreateEncounterDto = {
        status: 'finished',
        class: { code: 'AMB', display: 'ambulatory' },
        subject: { reference: `Patient/${patient.id}` },
        period: { start: '2024-01-15T10:00:00Z' },
      };

      const created = await service.createEncounter(createDto);
      const encounterId = created.id || '';
      await service.deleteEncounter(encounterId);

      await expect(service.getEncounter(encounterId)).rejects.toThrow(NotFoundException);
      expect(logger.info).toHaveBeenCalled();
    });

    it('should throw NotFoundException when encounter does not exist', async () => {
      await expect(service.deleteEncounter('non-existent-id')).rejects.toThrow(NotFoundException);
    });
  });
});
