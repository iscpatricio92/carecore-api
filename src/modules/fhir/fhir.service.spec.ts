import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { FhirService } from './fhir.service';
import { CreatePatientDto, UpdatePatientDto } from '../../common/dto/fhir-patient.dto';

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
});
