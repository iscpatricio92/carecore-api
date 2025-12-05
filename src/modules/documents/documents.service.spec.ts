import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentReference } from '../../common/interfaces/fhir.interface';

describe('DocumentsService', () => {
  let service: DocumentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DocumentsService],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    // Clear documents array before each test
    (service as unknown as { documents: DocumentReference[] }).documents = [];
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new document with generated ID', () => {
      const documentData: DocumentReference = {
        resourceType: 'DocumentReference',
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

      const result = service.create(documentData);

      expect(result).toBeDefined();
      expect(result.resourceType).toBe('DocumentReference');
      expect(result.id).toBeDefined();
      expect(result.status).toBe('current');
      expect(result.content).toEqual(documentData.content);
      expect(result.meta?.versionId).toBe('1');
      expect(result.meta?.lastUpdated).toBeDefined();
    });

    it('should create a document with provided ID', () => {
      const documentData: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'custom-document-id',
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

      const result = service.create(documentData);

      expect(result.id).toBe('custom-document-id');
    });

    it('should preserve existing meta data', () => {
      const documentData: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'test-id',
        status: 'current',
        meta: {
          versionId: '2',
          lastUpdated: '2024-01-01T00:00:00Z',
        },
        content: [
          {
            attachment: {
              contentType: 'application/pdf',
              url: 'https://example.com/document.pdf',
            },
          },
        ],
      };

      const result = service.create(documentData);

      expect(result.meta?.versionId).toBe('1'); // Should be overridden
      expect(result.meta?.lastUpdated).toBeDefined(); // Should be updated
    });

    it('should add document to internal array', () => {
      const documentData: DocumentReference = {
        resourceType: 'DocumentReference',
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

      service.create(documentData);
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

    it('should return bundle with documents', () => {
      const document1: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'document-1',
        status: 'current',
        content: [
          {
            attachment: {
              contentType: 'application/pdf',
              url: 'https://example.com/document1.pdf',
            },
          },
        ],
      };
      const document2: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'document-2',
        status: 'superseded',
        content: [
          {
            attachment: {
              contentType: 'application/pdf',
              url: 'https://example.com/document2.pdf',
            },
          },
        ],
      };

      service.create(document1);
      service.create(document2);

      const result = service.findAll();

      expect(result.total).toBe(2);
      expect(result.entry.length).toBe(2);
      expect(result.entry[0].fullUrl).toBe('urn:uuid:document-1');
      expect(result.entry[0].resource).toEqual(expect.objectContaining({ id: 'document-1' }));
      expect(result.entry[1].fullUrl).toBe('urn:uuid:document-2');
      expect(result.entry[1].resource).toEqual(expect.objectContaining({ id: 'document-2' }));
    });
  });

  describe('findOne', () => {
    it('should return a document by id', () => {
      const documentData: DocumentReference = {
        resourceType: 'DocumentReference',
        id: 'test-document-id',
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

      service.create(documentData);
      const result = service.findOne('test-document-id');

      expect(result).toBeDefined();
      expect(result.id).toBe('test-document-id');
      expect(result.status).toBe('current');
      expect(result.content).toEqual(documentData.content);
    });

    it('should throw NotFoundException when document does not exist', () => {
      expect(() => service.findOne('non-existent-id')).toThrow(NotFoundException);
      expect(() => service.findOne('non-existent-id')).toThrow(
        'DocumentReference with ID non-existent-id not found',
      );
    });

    it('should find document created without explicit ID', () => {
      const documentData: DocumentReference = {
        resourceType: 'DocumentReference',
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

      const created = service.create(documentData);
      const result = service.findOne(created.id!);

      expect(result).toBeDefined();
      expect(result.id).toBe(created.id);
    });
  });
});
