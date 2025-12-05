import { Test, TestingModule } from '@nestjs/testing';

import { ConsentsController } from './consents.controller';
import { ConsentsService } from './consents.service';
import { CreateConsentDto, UpdateConsentDto } from '../../common/dto/fhir-consent.dto';
import { Consent } from '../../common/interfaces/fhir.interface';
import { User } from '../auth/interfaces/user.interface';
import { ROLES } from '../../common/constants/roles';
import { FHIR_RESOURCE_TYPES } from '../../common/constants/fhir-resource-types';

const mockUser: User = {
  id: 'user-1',
  username: 'patient',
  email: '',
  roles: [ROLES.PATIENT],
};

const mockConsent: Consent = {
  resourceType: FHIR_RESOURCE_TYPES.CONSENT,
  id: 'consent-1',
  status: 'active',
  patient: { reference: 'Patient/p1' },
  scope: { coding: [] },
  category: [{ coding: [] }],
} as Consent;

describe('ConsentsController', () => {
  let controller: ConsentsController;
  const consentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  } as unknown as jest.Mocked<ConsentsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsentsController],
      providers: [{ provide: ConsentsService, useValue: consentsService }],
    }).compile();

    controller = module.get<ConsentsController>(ConsentsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate to service', async () => {
      const dto = { status: 'active' } as CreateConsentDto;
      consentsService.create = jest.fn().mockResolvedValue(mockConsent);

      const result = await controller.create(dto, mockUser);

      expect(result).toEqual(mockConsent);
      expect(consentsService.create).toHaveBeenCalledWith(dto, mockUser);
    });
  });

  describe('findAll', () => {
    it('should return list of consents', async () => {
      const response = { total: 1, entries: [mockConsent] };
      consentsService.findAll = jest.fn().mockResolvedValue(response);

      const result = await controller.findAll(mockUser);

      expect(result).toEqual(response);
      expect(consentsService.findAll).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('findOne', () => {
    it('should return consent by id', async () => {
      consentsService.findOne = jest.fn().mockResolvedValue(mockConsent);

      const result = await controller.findOne('consent-1', mockUser);

      expect(result).toEqual(mockConsent);
      expect(consentsService.findOne).toHaveBeenCalledWith('consent-1', mockUser);
    });
  });

  describe('update', () => {
    it('should update consent', async () => {
      const dto = { status: 'inactive' } as UpdateConsentDto;
      const updated = { ...mockConsent, status: 'inactive' } as Consent;
      consentsService.update = jest.fn().mockResolvedValue(updated);

      const result = await controller.update('consent-1', dto, mockUser);

      expect(result).toEqual(updated);
      expect(consentsService.update).toHaveBeenCalledWith('consent-1', dto, mockUser);
    });
  });

  describe('remove', () => {
    it('should remove consent', async () => {
      consentsService.remove = jest.fn().mockResolvedValue(undefined);

      await controller.remove('consent-1', mockUser);

      expect(consentsService.remove).toHaveBeenCalledWith('consent-1', mockUser);
    });
  });
});
