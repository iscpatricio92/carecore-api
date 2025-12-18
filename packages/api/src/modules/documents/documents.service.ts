import { Injectable } from '@nestjs/common';

import { DocumentReference } from '@carecore/shared';
import { DocumentsCoreService } from './documents-core.service';
import { DocumentToFhirMapper } from './mappers/document-to-fhir.mapper';
import {
  CreateDocumentReferenceDto,
  UpdateDocumentReferenceDto,
} from '../../common/dto/fhir-document-reference.dto';
import { User } from '@carecore/shared';

/**
 * Documents Service (Application Service - Thin Layer)
 *
 * This service is a thin orchestration layer that:
 * - Calls DocumentsCoreService for business logic and data access
 * - Uses DocumentToFhirMapper for transformation
 * - Returns FHIR resources for FHIR endpoints
 *
 * All security, validation, and business logic is in DocumentsCoreService.
 */
@Injectable()
export class DocumentsService {
  constructor(private readonly coreService: DocumentsCoreService) {}

  /**
   * Creates a new DocumentReference
   * Uses Core Service for business logic and mapper for transformation
   *
   * @param document - DocumentReference to create
   * @param user - Current authenticated user (optional, for future use)
   * @returns Created FHIR DocumentReference
   */
  async create(document: CreateDocumentReferenceDto, user?: User): Promise<DocumentReference> {
    // Use Core Service to create entity (with security validation and attachment storage)
    const entity = await this.coreService.create(document, user);

    // Transform Entity → FHIR using mapper
    return DocumentToFhirMapper.toFhir(entity);
  }

  /**
   * Gets all documents
   * Returns Bundle-style structure for FHIR compatibility
   * Uses Core Service for business logic and mapper for transformation
   *
   * @param user - Current authenticated user (optional, for future use)
   * @returns FHIR Bundle with DocumentReference entries
   */
  async findAll(user?: User): Promise<{
    resourceType: string;
    type: string;
    total: number;
    entry: { fullUrl: string; resource: DocumentReference }[];
  }> {
    // Use Core Service to get entities (with security filtering)
    const { entities, total } = await this.coreService.findAll(user);

    // Transform Entity → FHIR using mapper
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total,
      entry: entities.map((entity) => ({
        fullUrl: `DocumentReference/${entity.documentReferenceId}`,
        resource: DocumentToFhirMapper.toFhir(entity),
      })),
    };
  }

  /**
   * Searches documents with FHIR query parameters
   * Returns Bundle-style structure for FHIR compatibility
   * Uses Core Service for business logic and mapper for transformation
   *
   * @param params - Search parameters (_count, _sort, subject, status)
   * @param user - Current authenticated user
   * @returns FHIR Bundle with DocumentReference entries
   */
  async searchDocuments(
    params: {
      _count?: string;
      _sort?: string;
      subject?: string;
      status?: string;
    },
    user?: User,
  ): Promise<{
    resourceType: string;
    type: string;
    total: number;
    entry: { fullUrl: string; resource: DocumentReference }[];
  }> {
    // Parse FHIR parameters
    const page = 1; // FHIR doesn't use page, but we need it for pagination
    const limit = params._count ? parseInt(params._count, 10) : 10;
    const sort = params._sort;

    // Use Core Service to get entities (with security filtering and query params)
    const { entities, total } = await this.coreService.findDocumentsByQuery(
      {
        page,
        limit,
        subject: params.subject,
        status: params.status,
        sort,
      },
      user,
    );

    // Transform Entity → FHIR using mapper
    return {
      resourceType: 'Bundle',
      type: 'searchset',
      total,
      entry: entities.map((entity) => ({
        fullUrl: `DocumentReference/${entity.documentReferenceId}`,
        resource: DocumentToFhirMapper.toFhir(entity),
      })),
    };
  }

  /**
   * Gets a document by FHIR documentReferenceId
   * Uses Core Service for business logic and mapper for transformation
   *
   * @param id - FHIR resource ID
   * @param user - Current authenticated user (optional, for future use)
   * @returns FHIR DocumentReference
   */
  async findOne(id: string, user?: User): Promise<DocumentReference> {
    // Use Core Service to get entity (with security validation)
    const entity = await this.coreService.findDocumentByDocumentReferenceId(id, user);

    // Transform Entity → FHIR using mapper
    return DocumentToFhirMapper.toFhir(entity);
  }

  /**
   * Updates an existing DocumentReference
   * Uses Core Service for business logic and mapper for transformation
   *
   * @param id - FHIR resource ID
   * @param document - DocumentReference to update
   * @param user - Current authenticated user (optional, for future use)
   * @returns Updated FHIR DocumentReference
   */
  async update(
    id: string,
    document: UpdateDocumentReferenceDto,
    user?: User,
  ): Promise<DocumentReference> {
    // Use Core Service to update entity (with security validation and attachment storage)
    const entity = await this.coreService.update(id, document, user);

    // Transform Entity → FHIR using mapper
    return DocumentToFhirMapper.toFhir(entity);
  }

  /**
   * Soft deletes a DocumentReference
   * Uses Core Service for business logic and security validation
   *
   * @param id - FHIR resource ID
   * @param user - Current authenticated user (optional, for future use)
   */
  async remove(id: string, user?: User): Promise<void> {
    // Use Core Service to delete (with security validation)
    await this.coreService.remove(id, user);
  }
}
