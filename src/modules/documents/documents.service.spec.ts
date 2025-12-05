import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import * as fs from 'node:fs';
import * as path from 'path';

import { DocumentsService } from './documents.service';
import { DocumentReferenceEntity } from '../../entities/document-reference.entity';
import {
  CreateDocumentReferenceDto,
  UpdateDocumentReferenceDto,
} from '../../common/dto/fhir-document-reference.dto';

// Mock fs module
jest.mock('node:fs', () => ({
  promises: {
    mkdir: jest.fn(),
    writeFile: jest.fn(),
  },
}));

describe('DocumentsService', () => {
  let service: DocumentsService;
  let repo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };

  const mockMkdir = fs.promises.mkdir as jest.Mock;
  const mockWriteFile = fs.promises.writeFile as jest.Mock;

  beforeEach(async () => {
    repo = {
      create: jest.fn((data) => data),
      save: jest.fn(async (data) => ({ ...data, id: 'db-uuid', createdAt: new Date() })),
      find: jest.fn(async () => []),
      findOne: jest.fn(async () => null),
      update: jest.fn(async () => ({ affected: 1 })),
    };

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    // Set test storage path
    process.env.DOCUMENTS_STORAGE_PATH = path.join(__dirname, '../../../../test-storage');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: getRepositoryToken(DocumentReferenceEntity),
          useValue: repo,
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.DOCUMENTS_STORAGE_PATH;
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

      const savedEntity = {
        id: 'db-uuid',
        resourceType: 'DocumentReference',
        fhirResource: {
          ...documentData,
          id: 'generated-id',
          resourceType: 'DocumentReference',
          meta: { versionId: '1', lastUpdated: expect.any(String) },
        },
        status: 'current',
        documentReferenceId: 'generated-id',
        subjectReference: 'Patient/123',
        createdAt: new Date(),
      };

      repo.save.mockResolvedValue(savedEntity);

      const result = await service.create(documentData);

      expect(repo.create).toHaveBeenCalled();
      expect(repo.save).toHaveBeenCalled();
      expect(result.resourceType).toBe('DocumentReference');
      expect(result.id).toBeDefined();
      expect(result.status).toBe('current');
      expect(result.meta?.versionId).toBe('1');
      expect(result.meta?.lastUpdated).toBeDefined();
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

      const savedEntity = {
        id: 'db-uuid',
        resourceType: 'DocumentReference',
        fhirResource: {
          ...documentData,
          id: 'generated-id',
          resourceType: 'DocumentReference',
          meta: { versionId: '1', lastUpdated: expect.any(String) },
          content: [
            {
              attachment: {
                contentType: 'application/pdf',
                url: expect.stringContaining('file://'),
                size: expect.any(Number),
                hash: expect.stringContaining('sha256:'),
                data: undefined,
              },
            },
          ],
        },
        status: 'current',
        documentReferenceId: 'generated-id',
        subjectReference: 'Patient/123',
        createdAt: new Date(),
      };

      repo.save.mockResolvedValue(savedEntity);

      const result = await service.create(documentData);

      expect(mockMkdir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
      expect(result.content?.[0].attachment?.data).toBeUndefined();
      expect(result.content?.[0].attachment?.url).toBeDefined();
      expect(result.content?.[0].attachment?.size).toBeDefined();
      expect(result.content?.[0].attachment?.hash).toBeDefined();
    });

    it('should handle document with empty content array', async () => {
      const documentData: CreateDocumentReferenceDto = {
        status: 'current',
        content: [],
        subject: { reference: 'Patient/123' },
        type: { coding: [{ system: 'http://loinc.org', code: '34133-9' }] },
      };

      const savedEntity = {
        id: 'db-uuid',
        resourceType: 'DocumentReference',
        fhirResource: {
          ...documentData,
          id: 'generated-id',
          resourceType: 'DocumentReference',
          meta: { versionId: '1', lastUpdated: expect.any(String) },
        },
        status: 'current',
        documentReferenceId: 'generated-id',
        subjectReference: 'Patient/123',
        createdAt: new Date(),
      };

      repo.save.mockResolvedValue(savedEntity);

      const result = await service.create(documentData);

      expect(result).toBeDefined();
      expect(result.resourceType).toBe('DocumentReference');
    });
  });

  describe('findAll', () => {
    it('should return an empty bundle', async () => {
      repo.find.mockResolvedValueOnce([]);

      const result = await service.findAll();

      expect(result.resourceType).toBe('Bundle');
      expect(result.type).toBe('searchset');
      expect(result.total).toBe(0);
      expect(result.entry).toEqual([]);
    });

    it('should return bundle with documents', async () => {
      repo.find.mockResolvedValueOnce([
        {
          fhirResource: {
            resourceType: 'DocumentReference',
            id: 'doc-1',
            status: 'current',
            content: [],
          },
          documentReferenceId: 'doc-1',
        },
      ]);

      const result = await service.findAll();

      expect(result.total).toBe(1);
      expect(result.entry[0].fullUrl).toBe('DocumentReference/doc-1');
      expect(result.entry[0].resource.id).toBe('doc-1');
    });
  });

  describe('findOne', () => {
    it('should return a document by id', async () => {
      repo.findOne.mockResolvedValueOnce({
        fhirResource: {
          resourceType: 'DocumentReference',
          id: 'doc-1',
          status: 'current',
          content: [],
        },
        documentReferenceId: 'doc-1',
      });

      const result = await service.findOne('doc-1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { documentReferenceId: 'doc-1', deletedAt: IsNull() },
      });
      expect(result.id).toBe('doc-1');
      expect(result.status).toBe('current');
    });

    it('should throw NotFoundException when not found', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
      await expect(service.findOne('missing')).rejects.toThrow(
        'DocumentReference with ID missing not found',
      );
    });
  });

  describe('update', () => {
    it('should update an existing document', async () => {
      const existingEntity = {
        id: 'db-uuid',
        resourceType: 'DocumentReference',
        fhirResource: {
          resourceType: 'DocumentReference',
          id: 'doc-1',
          status: 'current',
          meta: { versionId: '1', lastUpdated: '2024-01-01T00:00:00Z' },
          content: [],
        },
        documentReferenceId: 'doc-1',
        status: 'current',
        subjectReference: 'Patient/123',
      };

      const updateDto: UpdateDocumentReferenceDto = {
        status: 'superseded',
      };

      repo.findOne.mockResolvedValueOnce(existingEntity).mockResolvedValueOnce({
        ...existingEntity,
        fhirResource: {
          ...existingEntity.fhirResource,
          status: 'superseded',
          meta: { versionId: '2', lastUpdated: expect.any(String) },
        },
        status: 'superseded',
      });

      repo.save.mockResolvedValue({
        ...existingEntity,
        fhirResource: {
          ...existingEntity.fhirResource,
          status: 'superseded',
          meta: { versionId: '2', lastUpdated: expect.any(String) },
        },
        status: 'superseded',
      });

      const result = await service.update('doc-1', updateDto);

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { documentReferenceId: 'doc-1', deletedAt: IsNull() },
      });
      expect(repo.save).toHaveBeenCalled();
      expect(result.status).toBe('superseded');
      expect(result.meta?.versionId).toBe('2');
    });

    it('should throw NotFoundException when document does not exist', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      const updateDto: UpdateDocumentReferenceDto = {
        status: 'superseded',
      };

      await expect(service.update('missing', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should increment versionId on update', async () => {
      const existingEntity = {
        id: 'db-uuid',
        resourceType: 'DocumentReference',
        fhirResource: {
          resourceType: 'DocumentReference',
          id: 'doc-1',
          status: 'current',
          meta: { versionId: '5', lastUpdated: '2024-01-01T00:00:00Z' },
          content: [],
        },
        documentReferenceId: 'doc-1',
        status: 'current',
      };

      repo.findOne.mockResolvedValueOnce(existingEntity);
      repo.save.mockResolvedValue({
        ...existingEntity,
        fhirResource: {
          ...existingEntity.fhirResource,
          meta: { versionId: '6', lastUpdated: expect.any(String) },
        },
      });

      const result = await service.update('doc-1', { status: 'superseded' });

      expect(result.meta?.versionId).toBe('6');
    });
  });

  describe('remove', () => {
    it('should soft delete a document', async () => {
      const existingEntity = {
        id: 'db-uuid',
        resourceType: 'DocumentReference',
        fhirResource: {
          resourceType: 'DocumentReference',
          id: 'doc-1',
          status: 'current',
          content: [],
        },
        documentReferenceId: 'doc-1',
        status: 'current',
        deletedAt: null,
      };

      repo.findOne.mockResolvedValueOnce(existingEntity);
      repo.update.mockResolvedValueOnce({ affected: 1 });

      await service.remove('doc-1');

      expect(repo.findOne).toHaveBeenCalledWith({
        where: { documentReferenceId: 'doc-1', deletedAt: IsNull() },
      });
      expect(repo.update).toHaveBeenCalledWith(
        { documentReferenceId: 'doc-1' },
        { deletedAt: expect.any(Date) },
      );
    });

    it('should throw NotFoundException when document does not exist', async () => {
      repo.findOne.mockResolvedValueOnce(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
      await expect(service.remove('missing')).rejects.toThrow(
        'DocumentReference with ID missing not found',
      );
    });
  });
});
