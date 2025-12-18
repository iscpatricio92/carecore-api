import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { DocumentsService } from './documents.service';
import { DocumentsCoreService } from './documents-core.service';
import { DocumentReferenceEntity } from '../../entities/document-reference.entity';
import {
  CreateDocumentReferenceDto,
  UpdateDocumentReferenceDto,
} from '../../common/dto/fhir-document-reference.dto';
import { DocumentReference, FHIR_RESOURCE_TYPES } from '@carecore/shared';

const mockLogger: Record<string, jest.Mock> = {
  setContext: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('DocumentsService', () => {
  let service: DocumentsService;
  let mockDocumentsCoreService: jest.Mocked<DocumentsCoreService>;

  const documentEntityFactory = (
    overrides: Partial<DocumentReferenceEntity> = {},
  ): DocumentReferenceEntity =>
    ({
      id: 'db-uuid',
      documentReferenceId: 'doc-1',
      resourceType: FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
      status: 'current',
      subjectReference: 'Patient/123',
      fhirResource: {
        resourceType: FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
        id: 'doc-1',
        status: 'current',
        content: [],
        subject: { reference: 'Patient/123' },
        meta: { versionId: '1', lastUpdated: new Date().toISOString() },
      } as DocumentReference,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    }) as DocumentReferenceEntity;

  beforeEach(async () => {
    mockDocumentsCoreService = {
      create: jest.fn(),
      findAll: jest.fn(),
      findDocumentsByQuery: jest.fn(),
      findDocumentById: jest.fn(),
      findDocumentByDocumentReferenceId: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    } as unknown as jest.Mocked<DocumentsCoreService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: DocumentsCoreService,
          useValue: mockDocumentsCoreService,
        },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new document with generated ID', async () => {
      const documentData: CreateDocumentReferenceDto = {
        status: 'current',
        content: [
          {
            attachment: {
              contentType: 'application/pdf',
              url: 'https://example.com/document.pdf',
            },
          },
        ],
        subject: { reference: 'Patient/123' },
        type: { coding: [{ system: 'http://loinc.org', code: '34133-9' }] },
      };

      const entity = documentEntityFactory({
        fhirResource: {
          ...documentData,
          id: 'generated-id',
          resourceType: FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
          meta: { versionId: '1', lastUpdated: new Date().toISOString() },
        } as DocumentReference,
        documentReferenceId: 'generated-id',
      });

      mockDocumentsCoreService.create.mockResolvedValue(entity);

      const result = await service.create(documentData);

      expect(result.resourceType).toBe(FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE);
      expect(result.id).toBeDefined();
      expect(result.status).toBe('current');
      expect(result.meta?.versionId).toBe('1');
      expect(mockDocumentsCoreService.create).toHaveBeenCalledWith(documentData, undefined);
    });

    it('should store base64 attachment to disk', async () => {
      const base64Data = Buffer.from('test content').toString('base64');
      const documentData: CreateDocumentReferenceDto = {
        status: 'current',
        content: [
          {
            attachment: {
              contentType: 'application/pdf',
              data: base64Data,
            },
          },
        ],
        subject: { reference: 'Patient/123' },
        type: { coding: [{ system: 'http://loinc.org', code: '34133-9' }] },
      };

      const entity = documentEntityFactory({
        fhirResource: {
          ...documentData,
          id: 'generated-id',
          resourceType: FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
          meta: { versionId: '1', lastUpdated: new Date().toISOString() },
          content: [
            {
              attachment: {
                contentType: 'application/pdf',
                url: 'file:///path/to/file.pdf',
                size: 12,
                hash: 'sha256:abc123',
                data: undefined,
              },
            },
          ],
        } as DocumentReference,
        documentReferenceId: 'generated-id',
      });

      mockDocumentsCoreService.create.mockResolvedValue(entity);

      const result = await service.create(documentData);

      expect(result.content?.[0].attachment?.data).toBeUndefined();
      expect(result.content?.[0].attachment?.url).toBeDefined();
      expect(result.content?.[0].attachment?.size).toBeDefined();
      expect(result.content?.[0].attachment?.hash).toBeDefined();
      expect(mockDocumentsCoreService.create).toHaveBeenCalledWith(documentData, undefined);
    });

    it('should handle document with empty content array', async () => {
      const documentData: CreateDocumentReferenceDto = {
        status: 'current',
        content: [],
        subject: { reference: 'Patient/123' },
        type: { coding: [{ system: 'http://loinc.org', code: '34133-9' }] },
      };

      const entity = documentEntityFactory({
        fhirResource: {
          ...documentData,
          id: 'generated-id',
          resourceType: FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
          meta: { versionId: '1', lastUpdated: new Date().toISOString() },
        } as DocumentReference,
        documentReferenceId: 'generated-id',
      });

      mockDocumentsCoreService.create.mockResolvedValue(entity);

      const result = await service.create(documentData);

      expect(result).toBeDefined();
      expect(result.resourceType).toBe(FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE);
    });
  });

  describe('findAll', () => {
    it('should return an empty bundle', async () => {
      mockDocumentsCoreService.findAll.mockResolvedValue({ entities: [], total: 0 });

      const result = await service.findAll();

      expect(result.resourceType).toBe('Bundle');
      expect(result.type).toBe('searchset');
      expect(result.total).toBe(0);
      expect(result.entry).toEqual([]);
      expect(mockDocumentsCoreService.findAll).toHaveBeenCalledWith(undefined);
    });

    it('should return bundle with documents', async () => {
      const entity = documentEntityFactory();
      mockDocumentsCoreService.findAll.mockResolvedValue({ entities: [entity], total: 1 });

      const result = await service.findAll();

      expect(result.total).toBe(1);
      expect(result.entry[0].fullUrl).toBe('DocumentReference/doc-1');
      expect(result.entry[0].resource.id).toBe('doc-1');
    });
  });

  describe('findOne', () => {
    it('should return a document by id', async () => {
      const entity = documentEntityFactory();
      mockDocumentsCoreService.findDocumentByDocumentReferenceId.mockResolvedValue(entity);

      const result = await service.findOne('doc-1');

      expect(result.id).toBe('doc-1');
      expect(result.status).toBe('current');
      expect(mockDocumentsCoreService.findDocumentByDocumentReferenceId).toHaveBeenCalledWith(
        'doc-1',
        undefined,
      );
    });

    it('should throw NotFoundException when not found', async () => {
      mockDocumentsCoreService.findDocumentByDocumentReferenceId.mockRejectedValue(
        new NotFoundException('DocumentReference with documentReferenceId missing not found'),
      );

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update an existing document', async () => {
      const existingEntity = documentEntityFactory();
      const updatedEntity = documentEntityFactory({
        status: 'superseded',
        fhirResource: {
          ...existingEntity.fhirResource,
          status: 'superseded',
          meta: { versionId: '2', lastUpdated: new Date().toISOString() },
        } as DocumentReference,
      });

      mockDocumentsCoreService.findDocumentByDocumentReferenceId.mockResolvedValue(existingEntity);
      mockDocumentsCoreService.update.mockResolvedValue(updatedEntity);

      const updateDto: UpdateDocumentReferenceDto = {
        status: 'superseded',
      };

      const result = await service.update('doc-1', updateDto);

      expect(result.status).toBe('superseded');
      expect(result.meta?.versionId).toBe('2');
      expect(mockDocumentsCoreService.update).toHaveBeenCalledWith('doc-1', updateDto, undefined);
    });

    it('should throw NotFoundException when document does not exist', async () => {
      mockDocumentsCoreService.update.mockRejectedValue(
        new NotFoundException('DocumentReference not found'),
      );

      const updateDto: UpdateDocumentReferenceDto = {
        status: 'superseded',
      };

      await expect(service.update('missing', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should increment versionId on update', async () => {
      const existingEntity = documentEntityFactory({
        fhirResource: {
          ...documentEntityFactory().fhirResource,
          meta: { versionId: '5', lastUpdated: '2024-01-01T00:00:00Z' },
        } as DocumentReference,
      });
      const updatedEntity = documentEntityFactory({
        fhirResource: {
          ...existingEntity.fhirResource,
          meta: { versionId: '6', lastUpdated: new Date().toISOString() },
        } as DocumentReference,
      });

      mockDocumentsCoreService.findDocumentByDocumentReferenceId.mockResolvedValue(existingEntity);
      mockDocumentsCoreService.update.mockResolvedValue(updatedEntity);

      const result = await service.update('doc-1', { status: 'superseded' });

      expect(result.meta?.versionId).toBe('6');
    });
  });

  describe('remove', () => {
    it('should soft delete a document', async () => {
      mockDocumentsCoreService.remove.mockResolvedValue(undefined);

      await service.remove('doc-1');

      expect(mockDocumentsCoreService.remove).toHaveBeenCalledWith('doc-1', undefined);
    });

    it('should throw NotFoundException when document does not exist', async () => {
      mockDocumentsCoreService.remove.mockRejectedValue(
        new NotFoundException('DocumentReference with documentReferenceId missing not found'),
      );

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('searchDocuments', () => {
    it('should search documents with parameters', async () => {
      const entity = documentEntityFactory();
      mockDocumentsCoreService.findDocumentsByQuery.mockResolvedValue({
        entities: [entity],
        total: 1,
      });

      const result = await service.searchDocuments(
        {
          _count: '10',
          _sort: '-date',
          subject: 'Patient/123',
          status: 'current',
        },
        undefined,
      );

      expect(result.total).toBe(1);
      expect(result.entry).toHaveLength(1);
      expect(mockDocumentsCoreService.findDocumentsByQuery).toHaveBeenCalledWith(
        {
          page: 1,
          limit: 10,
          subject: 'Patient/123',
          status: 'current',
          sort: '-date',
        },
        undefined,
      );
    });
  });
});
