import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, SelectQueryBuilder } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';
import { randomUUID, createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'path';

import { DocumentReferenceEntity } from '../../entities/document-reference.entity';
import { PatientEntity } from '../../entities/patient.entity';
import {
  User,
  FHIR_RESOURCE_TYPES,
  FHIR_ACTIONS,
  DocumentReference,
  FhirAttachment,
} from '@carecore/shared';
import { PatientContextService } from '../../common/services/patient-context.service';
import { ScopePermissionService } from '../auth/services/scope-permission.service';
import { ROLES } from '../../common/constants/roles';
import {
  CreateDocumentReferenceDto,
  UpdateDocumentReferenceDto,
} from '../../common/dto/fhir-document-reference.dto';

/**
 * Documents Core Service
 *
 * Contains all business logic, security, and database access for DocumentReferences.
 * This service is shared between FHIR and optimized client endpoints.
 *
 * Responsibilities:
 * - Database queries and filtering
 * - Role-based access control (RBAC)
 * - Patient context filtering
 * - Access validation
 * - Security checks
 * - Attachment storage (temporary local storage)
 *
 * Returns: DocumentReferenceEntity[] (no transformation)
 */
@Injectable()
export class DocumentsCoreService {
  private readonly storageDir: string;

  constructor(
    @InjectRepository(DocumentReferenceEntity)
    private documentRepository: Repository<DocumentReferenceEntity>,
    @InjectRepository(PatientEntity)
    private patientRepository: Repository<PatientEntity>,
    private readonly patientContextService: PatientContextService,
    private readonly scopePermissionService: ScopePermissionService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(DocumentsCoreService.name);
    // TEMPORARY: Local storage path (not committed to git, see .gitignore)
    // TODO: Migrate to cloud storage (S3/MinIO) for production
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
   * Searches documents with filters and pagination
   * Applies role-based and patient context filtering
   * Returns entities without transformation
   *
   * @param params - Search parameters (page, limit, subject, status, sort)
   * @param user - Current authenticated user (for access control)
   * @returns Entities and total count
   */
  async findDocumentsByQuery(
    params: {
      page?: number;
      limit?: number;
      subject?: string;
      status?: string;
      sort?: string;
    },
    user?: User,
  ): Promise<{ entities: DocumentReferenceEntity[]; total: number }> {
    const { page = 1, limit = 10, subject, status, sort } = params;
    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .where('document.deletedAt IS NULL');

    // Apply patient context filtering (security)
    await this.applyPatientContextFilter(queryBuilder, user);

    // Filter by subject (using indexed field) - only if not already filtered by patient context
    const patientReference = this.patientContextService.getPatientReference(user);
    if (subject && !patientReference) {
      queryBuilder.andWhere('document.subjectReference = :subject', {
        subject: subject.includes('/') ? subject : `Patient/${subject}`,
      });
    }

    // Filter by status (using indexed field)
    if (status) {
      queryBuilder.andWhere('document.status = :status', { status });
    }

    // Apply sorting if provided
    this.applySorting(queryBuilder, sort);

    // Get total count
    const total = await queryBuilder.getCount();

    // Pagination
    const entities = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    this.logger.debug({ total, page, limit, userId: user?.id }, 'Documents queried');

    return { entities, total };
  }

  /**
   * Gets all documents for a user
   * Simplified version for optimized endpoints (no FHIR filters)
   * Applies role-based and patient context filtering
   *
   * @param user - Current authenticated user
   * @returns Entities and total count
   */
  async findAll(user?: User): Promise<{ entities: DocumentReferenceEntity[]; total: number }> {
    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .where('document.deletedAt IS NULL');

    // Apply patient context filtering (security)
    await this.applyPatientContextFilter(queryBuilder, user);

    // Default sort by createdAt descending
    queryBuilder.orderBy('document.createdAt', 'DESC');

    const entities = await queryBuilder.getMany();

    return { entities, total: entities.length };
  }

  /**
   * Gets a document by database UUID
   * Validates access based on user role and patient context
   *
   * @param id - Database UUID
   * @param user - Current authenticated user
   * @returns DocumentReferenceEntity
   * @throws NotFoundException if document not found
   * @throws ForbiddenException if user doesn't have access
   */
  async findDocumentById(id: string, user?: User): Promise<DocumentReferenceEntity> {
    const entity = await this.documentRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(`DocumentReference with ID ${id} not found`);
    }

    // Validate access (security check)
    await this.validateAccess(entity, user);

    return entity;
  }

  /**
   * Gets a document by FHIR documentReferenceId
   * Validates access based on user role and patient context
   *
   * @param documentReferenceId - FHIR resource ID
   * @param user - Current authenticated user
   * @returns DocumentReferenceEntity
   * @throws NotFoundException if document not found
   * @throws ForbiddenException if user doesn't have access
   */
  async findDocumentByDocumentReferenceId(
    documentReferenceId: string,
    user?: User,
  ): Promise<DocumentReferenceEntity> {
    const entity = await this.documentRepository.findOne({
      where: { documentReferenceId, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(
        `DocumentReference with documentReferenceId ${documentReferenceId} not found`,
      );
    }

    // Validate access (security check)
    await this.validateAccess(entity, user);

    return entity;
  }

  /**
   * Creates a new DocumentReference
   * Validates access and stores attachments
   *
   * @param document - DocumentReference to create
   * @param user - Current authenticated user (for future access validation)
   * @returns Created DocumentReferenceEntity
   */
  async create(
    document: CreateDocumentReferenceDto,
    user?: User,
  ): Promise<DocumentReferenceEntity> {
    // TODO: Add access validation if needed (e.g., check if user can create documents for a patient)
    // For now, access is validated at the controller level via ScopesGuard

    const normalized = await this.normalizeResource(document);
    const entity = this.documentRepository.create(this.resourceToEntity(normalized));
    const saved = await this.documentRepository.save(entity);

    this.logger.info(
      { documentReferenceId: saved.documentReferenceId, userId: user?.id },
      'DocumentReference created',
    );

    return saved;
  }

  /**
   * Updates an existing DocumentReference
   * Validates access and stores attachments
   *
   * @param documentReferenceId - FHIR resource ID
   * @param document - DocumentReference to update
   * @param user - Current authenticated user
   * @returns Updated DocumentReferenceEntity
   */
  async update(
    documentReferenceId: string,
    document: UpdateDocumentReferenceDto,
    user?: User,
  ): Promise<DocumentReferenceEntity> {
    const existing = await this.documentRepository.findOne({
      where: { documentReferenceId, deletedAt: IsNull() },
    });

    if (!existing) {
      throw new NotFoundException(`DocumentReference with ID ${documentReferenceId} not found`);
    }

    // Validate access (security check)
    await this.validateAccess(existing, user);

    const normalized = await this.normalizeResource(document, existing.fhirResource);
    const updatedEntity = {
      ...existing,
      ...this.resourceToEntity(normalized),
    };

    const saved = await this.documentRepository.save(updatedEntity);

    this.logger.info({ documentReferenceId }, 'DocumentReference updated');

    return saved;
  }

  /**
   * Soft deletes a DocumentReference
   * Validates access before deletion
   *
   * @param documentReferenceId - FHIR resource ID
   * @param user - Current authenticated user
   */
  async remove(documentReferenceId: string, user?: User): Promise<void> {
    const existing = await this.documentRepository.findOne({
      where: { documentReferenceId, deletedAt: IsNull() },
    });

    if (!existing) {
      throw new NotFoundException(`DocumentReference with ID ${documentReferenceId} not found`);
    }

    // Validate access (security check)
    await this.validateAccess(existing, user);

    await this.documentRepository.update({ documentReferenceId }, { deletedAt: new Date() });

    this.logger.info({ documentReferenceId }, 'DocumentReference deleted');
  }

  /**
   * Applies patient context filtering to query builder
   * Implements role-based access control (RBAC)
   *
   * @param queryBuilder - TypeORM query builder
   * @param user - Current authenticated user
   */
  private async applyPatientContextFilter(
    queryBuilder: SelectQueryBuilder<DocumentReferenceEntity>,
    user?: User,
  ): Promise<void> {
    if (!user) {
      // No user means no restrictions (shouldn't happen in protected endpoints)
      return;
    }

    // Admin can see all documents (bypasses patient context)
    if (this.patientContextService.shouldBypassFiltering(user)) {
      return; // No filter needed
    }

    // Apply patient context filtering using unified service
    const patientReference = this.patientContextService.getPatientReference(user);
    if (patientReference) {
      // Token has patient context - filter to that patient only
      queryBuilder.andWhere('document.subjectReference = :tokenPatientRef', {
        tokenPatientRef: patientReference,
      });
      this.logger.debug({ patientReference }, 'Filtering documents by patient context');
      return;
    }

    // For keycloakUserId, we need to find the patientId first
    const keycloakUserId = this.patientContextService.getKeycloakUserId(user);
    if (keycloakUserId) {
      // Find patient records for this user
      const patientEntities = await this.patientRepository.find({
        where: { keycloakUserId, deletedAt: IsNull() },
      });
      if (patientEntities.length > 0) {
        const patientReferences = patientEntities.map((p) => `Patient/${p.patientId}`);
        queryBuilder.andWhere('document.subjectReference IN (:...references)', {
          references: patientReferences,
        });
        this.logger.debug(
          { keycloakUserId, patientCount: patientEntities.length },
          'Filtering documents by Keycloak user ID',
        );
      } else {
        // No patient records for this user, return empty
        queryBuilder.andWhere('1 = 0');
      }
      return;
    }

    // Practitioners can see all documents (for now)
    // TODO: In the future, filter by assigned patients or consent
    if (user.roles?.includes(ROLES.PRACTITIONER)) {
      return; // No filter needed
    }

    // Other roles need explicit scope permissions
    // Check if user has document:read scope
    const hasScopePermission = this.scopePermissionService.hasResourcePermission(
      user,
      FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
      FHIR_ACTIONS.READ,
    );

    if (!hasScopePermission) {
      // No access - return empty results
      queryBuilder.andWhere('1 = 0');
    }
  }

  /**
   * Validates that user has access to a document
   * Implements role-based and scope-based access control
   *
   * @param entity - Document entity to validate
   * @param user - Current authenticated user
   * @throws ForbiddenException if user doesn't have access
   */
  private async validateAccess(entity: DocumentReferenceEntity, user?: User): Promise<void> {
    if (!user) {
      // No user means no restrictions (shouldn't happen in protected endpoints)
      return;
    }

    // Admin can access all documents (bypasses patient context)
    if (this.patientContextService.shouldBypassFiltering(user)) {
      return;
    }

    // Use PatientContextService to determine access
    const patientId = this.patientContextService.getPatientId(user);
    if (patientId) {
      // Token is scoped to a specific patient - only allow access to documents for that patient
      const documentPatientId = entity.subjectReference?.replace(/^Patient\//, '');
      if (documentPatientId !== patientId) {
        throw new ForbiddenException(
          'You do not have permission to access this document. Patients can only access their own documents.',
        );
      }
      return;
    }

    // Check if document belongs to user's patient records
    const keycloakUserId = this.patientContextService.getKeycloakUserId(user);
    if (keycloakUserId) {
      // Need to check if document's patient belongs to this user
      const documentPatientId = entity.subjectReference?.replace(/^Patient\//, '');
      if (documentPatientId) {
        const patientEntity = await this.patientRepository.findOne({
          where: { patientId: documentPatientId, keycloakUserId, deletedAt: IsNull() },
        });
        if (!patientEntity) {
          throw new ForbiddenException(
            'You do not have permission to access this document. Patients can only access their own documents.',
          );
        }
      }
      return;
    }

    // Practitioners can access all documents (for now)
    // TODO: In the future, filter by assigned patients or consent
    if (user.roles?.includes(ROLES.PRACTITIONER)) {
      return;
    }

    // Check scope-based permissions
    const hasScopePermission = this.scopePermissionService.hasResourcePermission(
      user,
      FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
      FHIR_ACTIONS.READ,
    );

    if (!hasScopePermission) {
      throw new ForbiddenException('You do not have permission to access this document');
    }
  }

  /**
   * Applies sorting to query builder based on FHIR sort parameter
   *
   * @param queryBuilder - TypeORM query builder
   * @param sort - FHIR sort parameter (e.g., "-date" for descending by date)
   */
  private applySorting(
    queryBuilder: SelectQueryBuilder<DocumentReferenceEntity>,
    sort?: string,
  ): void {
    if (sort) {
      // Parse FHIR sort parameter (e.g., "-date" means descending by date)
      const isDescending = sort.startsWith('-');
      const sortField = isDescending ? sort.substring(1) : sort;

      // Map FHIR field names to database fields
      if (sortField === 'date') {
        // Sort by date in JSONB
        queryBuilder.orderBy(`document."fhirResource"->'date'`, isDescending ? 'DESC' : 'ASC');
      } else if (sortField === 'status') {
        queryBuilder.orderBy('document.status', isDescending ? 'DESC' : 'ASC');
      } else {
        // Default sort by createdAt if field not recognized
        queryBuilder.orderBy('document.createdAt', isDescending ? 'DESC' : 'ASC');
      }
    } else {
      // Default sort by createdAt descending
      queryBuilder.orderBy('document.createdAt', 'DESC');
    }
  }
}
