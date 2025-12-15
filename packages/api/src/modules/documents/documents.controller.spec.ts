import { Test, TestingModule } from '@nestjs/testing';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import {
  CreateDocumentReferenceDto,
  UpdateDocumentReferenceDto,
} from '../../common/dto/fhir-document-reference.dto';
import { FHIR_RESOURCE_TYPES } from '@carecore/shared';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let service: DocumentsService;

  const mockDocumentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        {
          provide: DocumentsService,
          useValue: mockDocumentsService,
        },
      ],
    }).compile();

    controller = module.get<DocumentsController>(DocumentsController);
    service = module.get<DocumentsService>(DocumentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a new document', async () => {
      const documentData: CreateDocumentReferenceDto = {
        status: 'current',
        type: { coding: [{ system: 'http://loinc.org', code: '34133-9' }] },
        subject: { reference: 'Patient/123' },
        content: [
          {
            attachment: {
              contentType: 'application/pdf',
              url: 'https://example.com/document.pdf',
            },
          },
        ],
      };

      const expectedResult = {
        ...documentData,
        id: 'test-document-id',
        resourceType: FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
        meta: {
          versionId: '1',
          lastUpdated: new Date().toISOString(),
        },
      };

      mockDocumentsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(documentData);

      expect(result).toEqual(expectedResult);
      expect(service.create).toHaveBeenCalledWith(documentData);
    });
  });

  describe('findAll', () => {
    it('should return all documents', async () => {
      const expectedResult = {
        resourceType: 'Bundle',
        type: 'searchset',
        total: 0,
        entry: [],
      };

      mockDocumentsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(service.findAll).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a document by id', async () => {
      const documentId = 'test-document-id';
      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
        id: documentId,
        status: 'current',
        content: [
          {
            attachment: {
              contentType: 'application/pdf',
              url: 'https://example.com/document.pdf',
            },
          },
        ],
      };

      mockDocumentsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(documentId);

      expect(result).toEqual(expectedResult);
      expect(service.findOne).toHaveBeenCalledWith(documentId);
    });
  });

  describe('update', () => {
    it('should update a document', async () => {
      const documentId = 'doc-1';
      const updateDto: UpdateDocumentReferenceDto = {
        status: 'superseded',
      };
      const expectedResult = {
        resourceType: FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
        id: documentId,
        status: 'superseded',
        content: [],
      };

      mockDocumentsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(documentId, updateDto);

      expect(result).toEqual(expectedResult);
      expect(service.update).toHaveBeenCalledWith(documentId, updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a document', async () => {
      mockDocumentsService.remove.mockResolvedValue(undefined);

      await controller.remove('doc-1');

      expect(service.remove).toHaveBeenCalledWith('doc-1');
    });
  });
});
