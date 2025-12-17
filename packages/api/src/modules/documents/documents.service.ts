import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { randomUUID, createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'path';

import { DocumentReference, FhirAttachment, FHIR_RESOURCE_TYPES } from '@carecore/shared';
import { DocumentReferenceEntity } from '../../entities/document-reference.entity';
import {
  CreateDocumentReferenceDto,
  UpdateDocumentReferenceDto,
} from '../../common/dto/fhir-document-reference.dto';

/**
 * DocumentsService
 *
 * Persists FHIR DocumentReference resources using TypeORM and stores attachments
 * on local disk (default: .tmp/storage/documents - TEMPORARY, not committed to git).
 *
 * TODO: Migrate to cloud storage (S3/MinIO) in the future for production.
 *
 * Attachments provided as base64 (`content.attachment.data`) are saved to disk
 * and the resource is updated with the generated URL, size, and hash to avoid
 * storing binary data in the DB.
 *
 * Storage path is configurable via DOCUMENTS_STORAGE_PATH environment variable.
 */
@Injectable()
export class DocumentsService {
  private readonly storageDir: string;

  constructor(
    @InjectRepository(DocumentReferenceEntity)
    private readonly documentRepository: Repository<DocumentReferenceEntity>,
  ) {
    // TEMPORARY: Local storage path (not committed to git, see .gitignore)
    // TODO: Migrate to cloud storage (S3/MinIO) for production
    // Configurable via DOCUMENTS_STORAGE_PATH env var, defaults to .tmp/storage/documents
    const baseDir = process.env.DOCUMENTS_STORAGE_PATH || '.tmp/storage/documents';
    this.storageDir = path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);
  }

  /**
   * Ensure storage directory exists
   */
  private async ensureStorageDir(): Promise<void> {
    await fs.mkdir(this.storageDir, { recursive: true });
  }

  /**
   * Store an attachment on disk if it contains base64 data
   * Returns a new attachment object with url/size/hash populated and data removed
   */
  private async storeAttachment(
    attachment: Partial<FhirAttachment>,
  ): Promise<Record<string, unknown>> {
    const data = typeof attachment?.data === 'string' ? attachment.data : undefined;
    if (!data) {
      return attachment;
    }

    const buffer = Buffer.from(data, 'base64');
    const hash = createHash('sha256').update(buffer).digest('hex');

    const contentType =
      attachment && typeof attachment.contentType === 'string' ? attachment.contentType : '';
    const extension = contentType?.split('/')[1] || 'bin';
    const fileName = `${randomUUID()}.${extension}`;

    await this.ensureStorageDir();
    const filePath = path.join(this.storageDir, fileName);
    await fs.writeFile(filePath, buffer);

    // TEMPORARY: Local file URL (file://)
    // TODO: Replace with cloud storage URL (S3/MinIO presigned URL) when migrating
    const fileUrl = attachment.url || `file://${filePath}`;

    return {
      ...attachment,
      data: undefined, // remove inline data to avoid storing large blobs in DB
      url: fileUrl,
      size: buffer.length,
      hash: attachment.hash || `sha256:${hash}`,
    };
  }

  /**
   * Normalize a DocumentReference resource:
   * - Ensure resourceType/id/meta
   * - Persist attachments to disk when data is present
   */
  private async normalizeResource(
    resource: CreateDocumentReferenceDto | UpdateDocumentReferenceDto,
    existing?: DocumentReference,
  ): Promise<DocumentReference> {
    const id = (resource as DocumentReference)?.id || existing?.id || randomUUID();
    const now = new Date().toISOString();

    // Clone to avoid mutating input
    const cloned: DocumentReference = {
      ...(existing || {}),
      ...(resource as DocumentReference),
      id,
      resourceType: FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
      meta: {
        ...(existing?.meta || {}),
        ...(resource as DocumentReference).meta,
        lastUpdated: now,
        versionId: existing?.meta?.versionId
          ? (parseInt(existing.meta.versionId, 10) + 1).toString()
          : '1',
      },
    };

    // Persist attachments with data
    if (Array.isArray(cloned.content)) {
      const updatedContent = [];
      for (const item of cloned.content) {
        const newAttachment = await this.storeAttachment(item.attachment || {});
        updatedContent.push({
          ...item,
          attachment: newAttachment,
        });
      }
      cloned.content = updatedContent;
    }

    return cloned;
  }

  /**
   * Map entity to FHIR resource
   */
  private entityToResource(entity: DocumentReferenceEntity): DocumentReference {
    return entity.fhirResource;
  }

  /**
   * Map resource to entity fields for indexing
   */
  private resourceToEntity(resource: DocumentReference): Partial<DocumentReferenceEntity> {
    return {
      resourceType: FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
      fhirResource: resource,
      status: resource.status,
      documentReferenceId: resource.id,
      subjectReference: resource.subject?.reference,
    };
  }

  /**
   * Create a DocumentReference (persists JSONB + stores attachments)
   */
  async create(document: CreateDocumentReferenceDto): Promise<DocumentReference> {
    const normalized = await this.normalizeResource(document);
    const entity = this.documentRepository.create(this.resourceToEntity(normalized));
    const saved = await this.documentRepository.save(entity);
    return this.entityToResource(saved);
  }

  /**
   * List DocumentReferences (no pagination yet; returns Bundle-style structure)
   */
  async findAll(): Promise<{
    resourceType: string;
    type: string;
    total: number;
    entry: { fullUrl: string; resource: DocumentReference }[];
  }> {
    const documents = await this.documentRepository.find({
      where: { deletedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });

    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total: documents.length,
      entry: documents.map((entity) => ({
        fullUrl: `DocumentReference/${entity.documentReferenceId}`,
        resource: this.entityToResource(entity),
      })),
    };
  }

  /**
   * Get a single DocumentReference by FHIR id
   */
  async findOne(id: string): Promise<DocumentReference> {
    const entity = await this.documentRepository.findOne({
      where: { documentReferenceId: id, deletedAt: IsNull() },
    });
    if (!entity) {
      throw new NotFoundException(`DocumentReference with ID ${id} not found`);
    }
    return this.entityToResource(entity);
  }

  /**
   * Update a DocumentReference (full replace semantics)
   */
  async update(id: string, document: UpdateDocumentReferenceDto): Promise<DocumentReference> {
    const existing = await this.documentRepository.findOne({
      where: { documentReferenceId: id, deletedAt: IsNull() },
    });
    if (!existing) {
      throw new NotFoundException(`DocumentReference with ID ${id} not found`);
    }

    const normalized = await this.normalizeResource(document, this.entityToResource(existing));
    const updatedEntity = {
      ...existing,
      ...this.resourceToEntity(normalized),
    };

    const saved = await this.documentRepository.save(updatedEntity);
    return this.entityToResource(saved);
  }

  /**
   * Soft delete a DocumentReference
   */
  async remove(id: string): Promise<void> {
    const existing = await this.documentRepository.findOne({
      where: { documentReferenceId: id, deletedAt: IsNull() },
    });
    if (!existing) {
      throw new NotFoundException(`DocumentReference with ID ${id} not found`);
    }
    await this.documentRepository.update({ documentReferenceId: id }, { deletedAt: new Date() });
  }
}
