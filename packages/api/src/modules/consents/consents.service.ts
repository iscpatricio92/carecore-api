import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

import { Consent, User, FHIR_RESOURCE_TYPES } from '@carecore/shared';
import {
  CreateConsentDto,
  UpdateConsentDto,
  ShareConsentWithPractitionerDto,
} from '../../common/dto/fhir-consent.dto';
import { ConsentsCoreService } from './consents-core.service';
import { ConsentToFhirMapper } from './mappers/consent-to-fhir.mapper';
import { AuditService } from '../audit/audit.service';

/**
 * Consents Service (Application Service - Thin Layer)
 *
 * This service is a thin orchestration layer that:
 * - Calls ConsentsCoreService for business logic and data access
 * - Uses ConsentToFhirMapper for transformation
 * - Handles audit logging
 * - Returns FHIR resources for FHIR endpoints
 *
 * All security, validation, and business logic is in ConsentsCoreService.
 */
@Injectable()
export class ConsentsService {
  constructor(
    private readonly coreService: ConsentsCoreService,
    private readonly auditService: AuditService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ConsentsService.name);
  }

  /**
   * Creates a new Consent
   * Uses Core Service for business logic and mapper for transformation
   * Handles audit logging
   *
   * @param createConsentDto - Consent to create
   * @param user - Current authenticated user
   * @returns Created FHIR Consent
   */
  async create(createConsentDto: CreateConsentDto, user?: User): Promise<Consent> {
    // Use Core Service to create entity (with security validation)
    const entity = await this.coreService.create(createConsentDto, user);

    // Transform Entity → FHIR using mapper
    const consent = ConsentToFhirMapper.toFhir(entity);

    // Audit log
    this.auditService
      .logCreate({
        resourceType: FHIR_RESOURCE_TYPES.CONSENT,
        resourceId: entity.consentId,
        user: user || null,
        changes: { resource: consent },
      })
      .catch((error) => {
        this.logger.error({ error }, 'Failed to log audit for consent creation');
      });

    return consent;
  }

  /**
   * Gets all Consents
   * Uses Core Service for business logic and mapper for transformation
   *
   * @param user - Current authenticated user
   * @returns List of FHIR Consents
   */
  async findAll(user?: User): Promise<{ total: number; entries: Consent[] }> {
    // Use Core Service to get entities (with security filtering)
    const { entities, total } = await this.coreService.findAll(user);

    // Transform Entity → FHIR using mapper
    const entries = ConsentToFhirMapper.toFhirList(entities);

    this.logger.debug(
      { total: entries.length, userId: user?.id, roles: user?.roles },
      'Consents found',
    );

    return {
      total,
      entries,
    };
  }

  /**
   * Gets a Consent by ID
   * Uses Core Service for business logic and mapper for transformation
   *
   * @param id - FHIR resource ID
   * @param user - Current authenticated user
   * @returns FHIR Consent
   */
  async findOne(id: string, user?: User): Promise<Consent> {
    // Use Core Service to get entity (with security validation)
    const entity = await this.coreService.findConsentByConsentId(id, user);

    // Transform Entity → FHIR using mapper
    return ConsentToFhirMapper.toFhir(entity);
  }

  /**
   * Searches consents with FHIR query parameters
   * Uses Core Service for business logic and mapper for transformation
   *
   * @param params - Search parameters (_count, _sort, status)
   * @param user - Current authenticated user
   * @returns List of FHIR Consents
   */
  async searchConsents(
    params: {
      _count?: string;
      _sort?: string;
      status?: string;
    },
    user?: User,
  ): Promise<{ total: number; entries: Consent[] }> {
    // Parse FHIR parameters
    const page = 1; // FHIR doesn't use page, but we need it for pagination
    const limit = params._count ? parseInt(params._count, 10) : 10;
    const sort = params._sort;

    // Use Core Service to get entities (with security filtering and query params)
    const { entities, total } = await this.coreService.findConsentsByQuery(
      {
        page,
        limit,
        status: params.status,
        sort,
      },
      user,
    );

    // Transform Entity → FHIR using mapper
    const entries = ConsentToFhirMapper.toFhirList(entities);

    this.logger.debug(
      { total: entries.length, userId: user?.id, roles: user?.roles },
      'Consents searched',
    );

    return {
      total,
      entries,
    };
  }

  /**
   * Updates an existing Consent
   * Uses Core Service for business logic and mapper for transformation
   * Handles audit logging
   *
   * @param id - FHIR resource ID
   * @param updateConsentDto - Consent to update
   * @param user - Current authenticated user
   * @returns Updated FHIR Consent
   */
  async update(id: string, updateConsentDto: UpdateConsentDto, user?: User): Promise<Consent> {
    // Get existing consent for audit logging
    const existingEntity = await this.coreService.findConsentByConsentId(id, user);
    const existingConsent = ConsentToFhirMapper.toFhir(existingEntity);

    // Use Core Service to update entity (with security validation)
    const entity = await this.coreService.update(id, updateConsentDto, user);

    // Transform Entity → FHIR using mapper
    const updatedConsent = ConsentToFhirMapper.toFhir(entity);

    // Audit log with changes
    this.auditService
      .logUpdate({
        resourceType: FHIR_RESOURCE_TYPES.CONSENT,
        resourceId: id,
        user: user || null,
        changes: {
          before: existingConsent,
          after: updatedConsent,
        },
      })
      .catch((error) => {
        this.logger.error({ error }, 'Failed to log audit for consent update');
      });

    return updatedConsent;
  }

  /**
   * Soft deletes a Consent
   * Uses Core Service for business logic and security validation
   * Handles audit logging
   *
   * @param id - FHIR resource ID
   * @param user - Current authenticated user
   */
  async remove(id: string, user?: User): Promise<void> {
    // Use Core Service to delete (with security validation)
    await this.coreService.remove(id, user);

    // Audit log
    this.auditService
      .logDelete({
        resourceType: FHIR_RESOURCE_TYPES.CONSENT,
        resourceId: id,
        user: user || null,
      })
      .catch((error) => {
        this.logger.error({ error }, 'Failed to log audit for consent deletion');
      });
  }

  /**
   * Shares a consent with a practitioner for a specific number of days
   * Uses Core Service for business logic and mapper for transformation
   *
   * @param id - FHIR resource ID
   * @param shareDto - Sharing parameters (practitioner reference, days)
   * @param user - Current authenticated user
   * @returns Updated FHIR Consent
   */
  async shareWithPractitioner(
    id: string,
    shareDto: ShareConsentWithPractitionerDto,
    user?: User,
  ): Promise<Consent> {
    // Use Core Service to share (with security validation)
    const entity = await this.coreService.shareWithPractitioner(id, shareDto, user);

    // Transform Entity → FHIR using mapper
    return ConsentToFhirMapper.toFhir(entity);
  }
}
