import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, SelectQueryBuilder } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';

import {
  Consent,
  ConsentProvision,
  User,
  FHIR_RESOURCE_TYPES,
  FHIR_ACTIONS,
} from '@carecore/shared';
import { ConsentEntity } from '../../entities/consent.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { ROLES } from '../../common/constants/roles';
import { PatientContextService } from '../../common/services/patient-context.service';
import { ScopePermissionService } from '../auth/services/scope-permission.service';
import {
  CreateConsentDto,
  UpdateConsentDto,
  ShareConsentWithPractitionerDto,
} from '../../common/dto/fhir-consent.dto';

/**
 * Consents Core Service
 *
 * Contains all business logic, security, and database access for Consents.
 * This service is shared between FHIR and optimized client endpoints.
 *
 * Responsibilities:
 * - Database queries and filtering
 * - Role-based access control (RBAC)
 * - Patient context filtering
 * - Access validation
 * - Security checks
 * - Consent expiration validation
 * - Sharing logic with practitioners
 *
 * Returns: ConsentEntity[] (no transformation)
 */
@Injectable()
export class ConsentsCoreService {
  constructor(
    @InjectRepository(ConsentEntity)
    private consentRepository: Repository<ConsentEntity>,
    @InjectRepository(PatientEntity)
    private patientRepository: Repository<PatientEntity>,
    private readonly patientContextService: PatientContextService,
    private readonly scopePermissionService: ScopePermissionService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(ConsentsCoreService.name);
  }

  /**
   * Converts Consent resource to ConsentEntity
   */
  private consentToEntity(consent: Consent): ConsentEntity {
    const entity = new ConsentEntity();
    entity.fhirResource = consent;
    entity.resourceType = FHIR_RESOURCE_TYPES.CONSENT;
    entity.status = consent.status;
    entity.consentId = consent.id || '';
    entity.patientReference = consent.patient?.reference || '';
    return entity;
  }

  /**
   * Extracts patient ID from patient reference
   * Format: "Patient/{id}" or just "{id}"
   */
  private extractPatientId(patientReference?: string): string | null {
    if (!patientReference) return null;
    // Remove "Patient/" prefix if present
    return patientReference.replace(/^Patient\//, '');
  }

  /**
   * Checks if a consent has expired based on its provision period
   * Returns true if expired, false otherwise
   */
  private isConsentExpired(consent: Consent): boolean {
    if (!consent.provision?.period?.end) {
      return false; // No expiration date set
    }

    const expirationDate = new Date(consent.provision.period.end);
    const now = new Date();
    return now > expirationDate;
  }

  /**
   * Validates and updates expired consents
   * Sets status to 'inactive' if the consent has expired
   */
  private async validateAndUpdateExpiredConsent(entity: ConsentEntity): Promise<void> {
    const consent = entity.fhirResource;

    if (this.isConsentExpired(consent) && consent.status === 'active') {
      const now = new Date().toISOString();
      const updatedConsent: Consent = {
        ...consent,
        status: 'inactive',
        meta: {
          ...consent.meta,
          versionId: String(parseInt(consent.meta?.versionId || '1', 10) + 1),
          lastUpdated: now,
        },
      };

      entity.fhirResource = updatedConsent;
      entity.status = 'inactive';
      await this.consentRepository.save(entity);

      this.logger.info(
        { consentId: entity.consentId, expirationDate: consent.provision?.period?.end },
        'Consent expired and set to inactive',
      );
    }
  }

  /**
   * Validates expiration for all consents in a list
   * Used in findAll to ensure expired consents are marked as inactive
   */
  private async validateExpiredConsents(entities: ConsentEntity[]): Promise<void> {
    const validationPromises = entities.map((entity) =>
      this.validateAndUpdateExpiredConsent(entity),
    );
    await Promise.all(validationPromises);
  }

  /**
   * Checks if user has permission to access a consent
   * Combines role-based and scope-based authorization
   *
   * @param user - Current authenticated user
   * @param consentEntity - Consent entity to check access for
   * @param action - Action type ('read', 'write', or 'share')
   * @returns true if user has access, false otherwise
   */
  private async canAccessConsent(
    user: User,
    consentEntity: ConsentEntity,
    action: string = FHIR_ACTIONS.READ,
  ): Promise<boolean> {
    // Check role-based permissions first (more permissive)
    // Admin can access all consents
    if (user.roles?.includes(ROLES.ADMIN)) {
      return true;
    }

    // Patient can only access their own consents
    if (user.roles?.includes(ROLES.PATIENT)) {
      const patientId = this.extractPatientId(consentEntity.patientReference);
      if (!patientId) {
        return false;
      }

      // Find the patient entity to check keycloakUserId
      const patientEntity = await this.patientRepository.findOne({
        where: { patientId, deletedAt: IsNull() },
      });

      if (!patientEntity) {
        return false;
      }

      // Check if the patient belongs to the user
      return patientEntity.keycloakUserId === user.id;
    }

    // Practitioners can access consents for their assigned patients
    // For now, allow practitioners to see all active consents
    // TODO: Filter by assigned patients or explicit consent
    if (user.roles?.includes(ROLES.PRACTITIONER)) {
      return consentEntity.status === 'active';
    }

    // Check scope-based permissions for other roles
    // If role grants permission, allow access
    if (
      this.scopePermissionService.roleGrantsPermission(user, FHIR_RESOURCE_TYPES.CONSENT, action)
    ) {
      return true;
    }

    // Check if user has required scopes
    const hasScopePermission = this.scopePermissionService.hasResourcePermission(
      user,
      FHIR_RESOURCE_TYPES.CONSENT,
      action,
    );

    if (hasScopePermission) {
      // For scope-based access, still need to check resource ownership for write operations
      // Read operations with scopes can access any consent (subject to consent rules)
      if (action === FHIR_ACTIONS.WRITE || action === FHIR_ACTIONS.SHARE) {
        // Write/share operations require ownership or practitioner role
        const patientId = this.extractPatientId(consentEntity.patientReference);
        if (patientId) {
          const patientEntity = await this.patientRepository.findOne({
            where: { patientId, deletedAt: IsNull() },
          });
          if (patientEntity) {
            return (
              patientEntity.keycloakUserId === user.id || user.roles?.includes(ROLES.PRACTITIONER)
            );
          }
        }
      }
      return true;
    }

    // Other roles need explicit consent
    return false;
  }

  /**
   * Validates that a consent belongs to the patient making the request
   *
   * @param user - Current authenticated user
   * @param patientReference - Patient reference from consent
   * @throws ForbiddenException if patient doesn't own the consent
   */
  private async validatePatientOwnership(user: User, patientReference?: string): Promise<void> {
    // Admin can create consents for any patient
    if (user.roles?.includes(ROLES.ADMIN)) {
      return;
    }

    // Patient can only create consents for themselves
    if (user.roles?.includes(ROLES.PATIENT)) {
      if (!patientReference) {
        throw new ForbiddenException('Patient reference is required for patient users');
      }

      const patientId = this.extractPatientId(patientReference);
      if (!patientId) {
        throw new ForbiddenException('Invalid patient reference format');
      }

      // Query PatientEntity to verify keycloakUserId matches user.id
      const patientEntity = await this.patientRepository.findOne({
        where: { patientId, deletedAt: IsNull() },
      });

      if (!patientEntity) {
        throw new NotFoundException(`Patient with ID ${patientId} not found`);
      }

      if (patientEntity.keycloakUserId !== user.id) {
        this.logger.warn(
          { userId: user.id, patientId, keycloakUserId: patientEntity.keycloakUserId },
          'Patient ownership validation failed',
        );
        throw new ForbiddenException('You can only create consents for your own patient record');
      }

      this.logger.debug(
        { userId: user.id, patientReference },
        'Patient ownership validated successfully',
      );
    }
  }

  /**
   * Searches consents with filters and pagination
   * Applies role-based and patient context filtering
   * Returns entities without transformation
   *
   * @param params - Search parameters (page, limit, status, sort)
   * @param user - Current authenticated user (for access control)
   * @returns Entities and total count
   */
  async findConsentsByQuery(
    params: {
      page?: number;
      limit?: number;
      status?: string;
      sort?: string;
    },
    user?: User,
  ): Promise<{ entities: ConsentEntity[]; total: number }> {
    const { page = 1, limit = 10, status, sort } = params;
    const queryBuilder = this.consentRepository
      .createQueryBuilder('consent')
      .where('consent.deletedAt IS NULL');

    // Apply patient context filtering (security)
    await this.applyPatientContextFilter(queryBuilder, user);

    // Filter by status (using indexed field)
    if (status) {
      queryBuilder.andWhere('consent.status = :status', { status });
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

    // Validate and update expired consents
    await this.validateExpiredConsents(entities);

    // Re-fetch entities after potential updates
    const updatedEntities = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    this.logger.debug({ total, page, limit, userId: user?.id }, 'Consents queried');

    return { entities: updatedEntities, total };
  }

  /**
   * Gets all consents for a user
   * Simplified version for optimized endpoints (no FHIR filters)
   * Applies role-based and patient context filtering
   *
   * @param user - Current authenticated user
   * @returns Entities and total count
   */
  async findAll(user?: User): Promise<{ entities: ConsentEntity[]; total: number }> {
    const queryBuilder = this.consentRepository
      .createQueryBuilder('consent')
      .where('consent.deletedAt IS NULL');

    // Apply patient context filtering (security)
    await this.applyPatientContextFilter(queryBuilder, user);

    // Default sort by createdAt descending
    queryBuilder.orderBy('consent.createdAt', 'DESC');

    const entities = await queryBuilder.getMany();

    // Validate and update expired consents
    await this.validateExpiredConsents(entities);

    // Re-fetch entities after potential updates
    const updatedEntities = await queryBuilder.orderBy('consent.createdAt', 'DESC').getMany();

    return { entities: updatedEntities, total: updatedEntities.length };
  }

  /**
   * Gets a consent by database UUID
   * Validates access based on user role and patient context
   *
   * @param id - Database UUID
   * @param user - Current authenticated user
   * @returns ConsentEntity
   * @throws NotFoundException if consent not found
   * @throws ForbiddenException if user doesn't have access
   */
  async findConsentById(id: string, user?: User): Promise<ConsentEntity> {
    const entity = await this.consentRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(`Consent with ID ${id} not found`);
    }

    // Validate access (security check)
    if (user && !(await this.canAccessConsent(user, entity, FHIR_ACTIONS.READ))) {
      throw new ForbiddenException('You do not have permission to access this consent');
    }

    // Validate and update if expired
    await this.validateAndUpdateExpiredConsent(entity);

    // Re-fetch entity after potential update
    const updatedEntity = await this.consentRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!updatedEntity) {
      throw new NotFoundException(`Consent with ID ${id} not found`);
    }

    return updatedEntity;
  }

  /**
   * Gets a consent by FHIR consentId
   * Validates access based on user role and patient context
   *
   * @param consentId - FHIR resource ID
   * @param user - Current authenticated user
   * @returns ConsentEntity
   * @throws NotFoundException if consent not found
   * @throws ForbiddenException if user doesn't have access
   */
  async findConsentByConsentId(consentId: string, user?: User): Promise<ConsentEntity> {
    const entity = await this.consentRepository.findOne({
      where: { consentId, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(`Consent with consentId ${consentId} not found`);
    }

    // Validate access (security check)
    if (user && !(await this.canAccessConsent(user, entity, FHIR_ACTIONS.READ))) {
      throw new ForbiddenException('You do not have permission to access this consent');
    }

    // Validate and update if expired
    await this.validateAndUpdateExpiredConsent(entity);

    // Re-fetch entity after potential update
    const updatedEntity = await this.consentRepository.findOne({
      where: { consentId, deletedAt: IsNull() },
    });

    if (!updatedEntity) {
      throw new NotFoundException(`Consent with consentId ${consentId} not found`);
    }

    return updatedEntity;
  }

  /**
   * Creates a new Consent
   * Validates access and patient ownership
   *
   * @param consent - Consent to create
   * @param user - Current authenticated user
   * @returns Created ConsentEntity
   */
  async create(createConsentDto: CreateConsentDto, user?: User): Promise<ConsentEntity> {
    // Validate user has permission to create consents
    if (user) {
      // Check role-based permissions first
      const hasRolePermission =
        user.roles?.includes(ROLES.ADMIN) ||
        user.roles?.includes(ROLES.PATIENT) ||
        user.roles?.includes(ROLES.PRACTITIONER);

      // Check scope-based permissions
      const hasScopePermission = this.scopePermissionService.hasResourcePermission(
        user,
        FHIR_RESOURCE_TYPES.CONSENT,
        FHIR_ACTIONS.WRITE,
      );

      if (!hasRolePermission && !hasScopePermission) {
        this.logger.warn(
          { userId: user.id, roles: user.roles, scopes: user.scopes },
          'Access denied to create consent',
        );
        throw new ForbiddenException(
          'You do not have permission to create consents. Required: consent:write scope or patient/practitioner/admin role',
        );
      }

      // Validate patient ownership if user is a patient
      await this.validatePatientOwnership(user, createConsentDto.patient?.reference);
    }

    const consentId = uuidv4();
    const now = new Date().toISOString();

    const consent: Consent = {
      resourceType: FHIR_RESOURCE_TYPES.CONSENT,
      id: consentId,
      meta: {
        versionId: '1',
        lastUpdated: now,
      },
      ...createConsentDto,
    };

    const entity = this.consentToEntity(consent);
    const savedEntity = await this.consentRepository.save(entity);

    this.logger.info({ consentId, userId: user?.id }, 'Consent created');

    return savedEntity;
  }

  /**
   * Updates an existing Consent
   * Validates access and patient ownership
   *
   * @param consentId - FHIR resource ID
   * @param consent - Consent to update
   * @param user - Current authenticated user
   * @returns Updated ConsentEntity
   */
  async update(
    consentId: string,
    updateConsentDto: UpdateConsentDto,
    user?: User,
  ): Promise<ConsentEntity> {
    const entity = await this.consentRepository.findOne({
      where: { consentId, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(`Consent with ID ${consentId} not found`);
    }

    // Check access permissions (write operation)
    if (user && !(await this.canAccessConsent(user, entity, FHIR_ACTIONS.WRITE))) {
      this.logger.warn(
        { consentId, userId: user.id, roles: user.roles, scopes: user.scopes },
        'Access denied to update consent',
      );
      throw new ForbiddenException('You do not have permission to update this consent');
    }

    // Validate patient ownership if updating patient reference
    if (user && updateConsentDto.patient?.reference) {
      await this.validatePatientOwnership(user, updateConsentDto.patient.reference);
    }

    const existingConsent = entity.fhirResource;
    const now = new Date().toISOString();
    const currentVersion = parseInt(existingConsent.meta?.versionId || '1', 10);

    const updatedConsent: Consent = {
      ...existingConsent,
      ...updateConsentDto,
      meta: {
        ...existingConsent.meta,
        versionId: String(currentVersion + 1),
        lastUpdated: now,
      },
    };

    entity.fhirResource = updatedConsent;
    entity.status = updatedConsent.status;
    entity.patientReference = updatedConsent.patient?.reference || entity.patientReference;

    const savedEntity = await this.consentRepository.save(entity);

    this.logger.info({ consentId, userId: user?.id }, 'Consent updated');

    return savedEntity;
  }

  /**
   * Soft deletes a Consent
   * Validates access before deletion
   *
   * @param consentId - FHIR resource ID
   * @param user - Current authenticated user
   */
  async remove(consentId: string, user?: User): Promise<void> {
    const entity = await this.consentRepository.findOne({
      where: { consentId, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(`Consent with ID ${consentId} not found`);
    }

    // Check access permissions (write operation for delete)
    if (user && !(await this.canAccessConsent(user, entity, FHIR_ACTIONS.WRITE))) {
      this.logger.warn(
        { consentId, userId: user.id, roles: user.roles, scopes: user.scopes },
        'Access denied to delete consent',
      );
      throw new ForbiddenException('You do not have permission to delete this consent');
    }

    entity.deletedAt = new Date();
    await this.consentRepository.save(entity);

    this.logger.info({ consentId, userId: user?.id }, 'Consent deleted');
  }

  /**
   * Shares a consent with a practitioner for a specific number of days
   * Creates or updates the consent with a provision that includes the practitioner
   * and sets an expiration date based on the number of days
   *
   * @param consentId - FHIR resource ID
   * @param shareDto - Sharing parameters (practitioner reference, days)
   * @param user - Current authenticated user
   * @returns Updated ConsentEntity
   */
  async shareWithPractitioner(
    consentId: string,
    shareDto: ShareConsentWithPractitionerDto,
    user?: User,
  ): Promise<ConsentEntity> {
    const entity = await this.consentRepository.findOne({
      where: { consentId, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(`Consent with ID ${consentId} not found`);
    }

    // Check access permissions - share operation requires consent:share scope or patient/admin role
    if (user && !(await this.canAccessConsent(user, entity, FHIR_ACTIONS.SHARE))) {
      this.logger.warn(
        { consentId, userId: user.id, roles: user.roles, scopes: user.scopes },
        'Access denied to share consent',
      );
      throw new ForbiddenException('You do not have permission to share this consent');
    }

    const existingConsent = entity.fhirResource;
    const now = new Date();
    const expirationDate = new Date(now);
    expirationDate.setDate(expirationDate.getDate() + shareDto.days);

    // Create or update provision with practitioner
    const provision: ConsentProvision = {
      type: 'permit',
      period: {
        start: existingConsent.dateTime || now.toISOString(),
        end: expirationDate.toISOString(),
      },
      actor: [
        {
          role: {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                code: 'PRCP',
                display: 'Primary Care Provider',
              },
            ],
            text: 'Practitioner',
          },
          reference: {
            reference: shareDto.practitionerReference,
            display: shareDto.practitionerDisplay,
          },
        },
      ],
    };

    // Merge with existing provision if it exists
    const updatedConsent: Consent = {
      ...existingConsent,
      provision: existingConsent.provision
        ? {
            ...existingConsent.provision,
            ...provision,
            // Merge actors if they exist
            actor: [...(existingConsent.provision.actor || []), ...(provision.actor || [])],
          }
        : provision,
      meta: {
        ...existingConsent.meta,
        versionId: String(parseInt(existingConsent.meta?.versionId || '1', 10) + 1),
        lastUpdated: now.toISOString(),
      },
    };

    entity.fhirResource = updatedConsent;
    entity.status = 'active'; // Ensure status is active when sharing
    entity.patientReference = updatedConsent.patient?.reference || entity.patientReference;

    const savedEntity = await this.consentRepository.save(entity);

    this.logger.info(
      {
        consentId,
        userId: user?.id,
        practitionerReference: shareDto.practitionerReference,
        days: shareDto.days,
        expirationDate: expirationDate.toISOString(),
      },
      'Consent shared with practitioner',
    );

    return savedEntity;
  }

  /**
   * Applies patient context filtering to query builder
   * Implements role-based access control (RBAC)
   *
   * @param queryBuilder - TypeORM query builder
   * @param user - Current authenticated user
   */
  private async applyPatientContextFilter(
    queryBuilder: SelectQueryBuilder<ConsentEntity>,
    user?: User,
  ): Promise<void> {
    if (!user) {
      // No user means no restrictions (shouldn't happen in protected endpoints)
      return;
    }

    // Admin can see all consents (bypasses patient context)
    if (this.patientContextService.shouldBypassFiltering(user)) {
      return; // No filter needed
    }

    // Apply patient context filtering using unified service
    const filterCriteria = this.patientContextService.getPatientFilterCriteria(user);

    // Admin can see all consents (no filter)
    if (!filterCriteria) {
      if (!this.patientContextService.shouldBypassFiltering(user)) {
        // Non-admin user without criteria - deny access
        queryBuilder.andWhere('1 = 0');
      }
      return;
    }

    if (filterCriteria.type === 'patientId') {
      // Filter by patient ID from SMART on FHIR context
      queryBuilder.andWhere('consent.patientReference = :patientReference', {
        patientReference: `Patient/${filterCriteria.value}`,
      });
      this.logger.debug({ patientId: filterCriteria.value }, 'Filtering consents by patient ID');
      return;
    }

    if (filterCriteria.type === 'keycloakUserId') {
      // Find patient records owned by this user
      const patientEntities = await this.patientRepository.find({
        where: { keycloakUserId: filterCriteria.value, deletedAt: IsNull() },
      });

      if (patientEntities.length === 0) {
        // No patient records for this user, return empty
        queryBuilder.andWhere('1 = 0');
      } else {
        // Filter consents by patient references
        const patientIds = patientEntities.map((p) => p.patientId);
        const patientReferences = patientIds.map((id) => `Patient/${id}`);
        queryBuilder.andWhere('consent.patientReference IN (:...references)', {
          references: patientReferences,
        });
        this.logger.debug(
          { keycloakUserId: filterCriteria.value, patientCount: patientEntities.length },
          'Filtering consents by Keycloak user ID',
        );
      }
      return;
    }

    if (filterCriteria.type === 'active') {
      // Practitioners can see active consents
      queryBuilder.andWhere('consent.status = :status', { status: 'active' });
      this.logger.debug({}, 'Filtering consents by active status for practitioner');
      return;
    }

    // Other roles need explicit scope permissions
    // Check if user has consent:read scope
    const hasScopePermission = this.scopePermissionService.hasResourcePermission(
      user,
      FHIR_RESOURCE_TYPES.CONSENT,
      FHIR_ACTIONS.READ,
    );

    if (!hasScopePermission) {
      // No access - return empty results
      queryBuilder.andWhere('1 = 0');
    }
  }

  /**
   * Applies sorting to query builder based on FHIR sort parameter
   *
   * @param queryBuilder - TypeORM query builder
   * @param sort - FHIR sort parameter (e.g., "-date" for descending by date)
   */
  private applySorting(queryBuilder: SelectQueryBuilder<ConsentEntity>, sort?: string): void {
    if (sort) {
      // Parse FHIR sort parameter (e.g., "-date" means descending by date)
      const isDescending = sort.startsWith('-');
      const sortField = isDescending ? sort.substring(1) : sort;

      // Map FHIR field names to database fields
      if (sortField === 'date') {
        // Sort by dateTime in JSONB
        queryBuilder.orderBy(`consent."fhirResource"->'dateTime'`, isDescending ? 'DESC' : 'ASC');
      } else if (sortField === 'status') {
        queryBuilder.orderBy('consent.status', isDescending ? 'DESC' : 'ASC');
      } else {
        // Default sort by createdAt if field not recognized
        queryBuilder.orderBy('consent.createdAt', isDescending ? 'DESC' : 'ASC');
      }
    } else {
      // Default sort by createdAt descending
      queryBuilder.orderBy('consent.createdAt', 'DESC');
    }
  }
}
