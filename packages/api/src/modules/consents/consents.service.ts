import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PinoLogger } from 'nestjs-pino';

import {
  Consent,
  ConsentProvision,
  User,
  FHIR_RESOURCE_TYPES,
  FHIR_ACTIONS,
} from '@carecore/shared';
import {
  CreateConsentDto,
  UpdateConsentDto,
  ShareConsentWithPractitionerDto,
} from '../../common/dto/fhir-consent.dto';
import { ConsentEntity } from '../../entities/consent.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { ROLES } from '../../common/constants/roles';
import { AuditService } from '../audit/audit.service';
import { ScopePermissionService } from '../auth/services/scope-permission.service';

/**
 * Consents Service
 * Manages FHIR Consent resources with role-based access control
 * Patients can only manage their own consents
 */
@Injectable()
export class ConsentsService {
  constructor(
    @InjectRepository(ConsentEntity)
    private consentRepository: Repository<ConsentEntity>,
    @InjectRepository(PatientEntity)
    private patientRepository: Repository<PatientEntity>,
    private readonly logger: PinoLogger,
    private readonly auditService: AuditService,
    private readonly scopePermissionService: ScopePermissionService,
  ) {
    this.logger.setContext(ConsentsService.name);
  }

  // ========== Helper Methods ==========

  /**
   * Converts ConsentEntity to Consent resource
   */
  private entityToConsent(entity: ConsentEntity): Consent {
    if (!entity.fhirResource) {
      throw new Error('Consent entity missing fhirResource');
    }
    return entity.fhirResource;
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
   * Checks if user has permission to access a consent
   * Combines role-based and scope-based authorization
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
    if (user.roles.includes(ROLES.ADMIN)) {
      return true;
    }

    // Patient can only access their own consents
    if (user.roles.includes(ROLES.PATIENT)) {
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
    if (user.roles.includes(ROLES.PRACTITIONER)) {
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
              patientEntity.keycloakUserId === user.id || user.roles.includes(ROLES.PRACTITIONER)
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
   * @param user - Current authenticated user
   * @param patientReference - Patient reference from consent
   * @throws ForbiddenException if patient doesn't own the consent
   */
  private async validatePatientOwnership(user: User, patientReference?: string): Promise<void> {
    // Admin can create consents for any patient
    if (user.roles.includes(ROLES.ADMIN)) {
      return;
    }

    // Patient can only create consents for themselves
    if (user.roles.includes(ROLES.PATIENT)) {
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

  // ========== CRUD Methods ==========

  /**
   * Creates a new Consent
   * Patients can only create consents for themselves
   * Validates user has 'consent:write' scope or appropriate role
   */
  async create(createConsentDto: CreateConsentDto, user?: User): Promise<Consent> {
    // Validate user has permission to create consents
    if (user) {
      // Check role-based permissions first
      const hasRolePermission =
        user.roles.includes(ROLES.ADMIN) ||
        user.roles.includes(ROLES.PATIENT) ||
        user.roles.includes(ROLES.PRACTITIONER);

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

    // Audit log
    this.auditService
      .logCreate({
        resourceType: FHIR_RESOURCE_TYPES.CONSENT,
        resourceId: consentId,
        user: user || null,
        changes: { resource: consent },
      })
      .catch((error) => {
        this.logger.error({ error }, 'Failed to log audit for consent creation');
      });

    return this.entityToConsent(savedEntity);
  }

  /**
   * Gets all Consents with optional filtering
   * Applies role-based access control
   */
  async findAll(user?: User): Promise<{ total: number; entries: Consent[] }> {
    const queryBuilder = this.consentRepository
      .createQueryBuilder('consent')
      .where('consent.deletedAt IS NULL');

    // Apply role-based filtering
    if (user) {
      // Admin can see all consents
      if (user.roles.includes(ROLES.ADMIN)) {
        // No filter needed
      }
      // Patient can only see their own consents
      else if (user.roles.includes(ROLES.PATIENT)) {
        // Find patient records owned by this user
        const patientEntities = await this.patientRepository.find({
          where: { keycloakUserId: user.id, deletedAt: IsNull() },
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
        }
      }
      // Practitioners can see active consents
      else if (user.roles.includes(ROLES.PRACTITIONER)) {
        queryBuilder.andWhere('consent.status = :status', { status: 'active' });
      }
      // Other roles see nothing
      else {
        queryBuilder.andWhere('1 = 0'); // Always false
      }
    }

    const entities = await queryBuilder.getMany();

    // Validate and update expired consents
    await this.validateExpiredConsents(entities);

    // Re-fetch entities after potential updates
    const updatedEntities = await queryBuilder.getMany();
    const entries = updatedEntities.map((entity) => this.entityToConsent(entity));

    this.logger.debug(
      { total: entries.length, userId: user?.id, roles: user?.roles },
      'Consents found',
    );

    return {
      total: entries.length,
      entries,
    };
  }

  /**
   * Gets a Consent by ID
   * Applies role-based access control
   */
  async findOne(id: string, user?: User): Promise<Consent> {
    const entity = await this.consentRepository.findOne({
      where: { consentId: id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(`Consent with ID ${id} not found`);
    }

    // Check access permissions (read operation)
    if (user && !(await this.canAccessConsent(user, entity, FHIR_ACTIONS.READ))) {
      this.logger.warn(
        { consentId: id, userId: user.id, roles: user.roles, scopes: user.scopes },
        'Access denied to consent',
      );
      throw new ForbiddenException('You do not have permission to access this consent');
    }

    // Validate and update if expired
    await this.validateAndUpdateExpiredConsent(entity);

    // Re-fetch entity after potential update
    const updatedEntity = await this.consentRepository.findOne({
      where: { consentId: id, deletedAt: IsNull() },
    });

    if (!updatedEntity) {
      throw new NotFoundException(`Consent with ID ${id} not found`);
    }

    return this.entityToConsent(updatedEntity);
  }

  /**
   * Updates a Consent
   * Patients can only update their own consents
   */
  async update(id: string, updateConsentDto: UpdateConsentDto, user?: User): Promise<Consent> {
    const entity = await this.consentRepository.findOne({
      where: { consentId: id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(`Consent with ID ${id} not found`);
    }

    // Check access permissions (write operation)
    if (user && !(await this.canAccessConsent(user, entity, FHIR_ACTIONS.WRITE))) {
      this.logger.warn(
        { consentId: id, userId: user.id, roles: user.roles, scopes: user.scopes },
        'Access denied to update consent',
      );
      throw new ForbiddenException('You do not have permission to update this consent');
    }

    // Validate patient ownership if updating patient reference
    if (user && updateConsentDto.patient?.reference) {
      await this.validatePatientOwnership(user, updateConsentDto.patient.reference);
    }

    const existingConsent = this.entityToConsent(entity);
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
    this.logger.info({ consentId: id, userId: user?.id }, 'Consent updated');

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

    return this.entityToConsent(savedEntity);
  }

  /**
   * Deletes (soft delete) a Consent
   * Patients can only delete their own consents
   */
  async remove(id: string, user?: User): Promise<void> {
    const entity = await this.consentRepository.findOne({
      where: { consentId: id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(`Consent with ID ${id} not found`);
    }

    // Check access permissions (write operation for delete)
    if (user && !(await this.canAccessConsent(user, entity, FHIR_ACTIONS.WRITE))) {
      this.logger.warn(
        { consentId: id, userId: user.id, roles: user.roles, scopes: user.scopes },
        'Access denied to delete consent',
      );
      throw new ForbiddenException('You do not have permission to delete this consent');
    }

    entity.deletedAt = new Date();
    await this.consentRepository.save(entity);
    this.logger.info({ consentId: id, userId: user?.id }, 'Consent deleted');

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
   * Creates or updates the consent with a provision that includes the practitioner
   * and sets an expiration date based on the number of days
   */
  async shareWithPractitioner(
    id: string,
    shareDto: ShareConsentWithPractitionerDto,
    user?: User,
  ): Promise<Consent> {
    const entity = await this.consentRepository.findOne({
      where: { consentId: id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(`Consent with ID ${id} not found`);
    }

    // Check access permissions - share operation requires consent:share scope or patient/admin role
    if (user && !(await this.canAccessConsent(user, entity, FHIR_ACTIONS.SHARE))) {
      this.logger.warn(
        { consentId: id, userId: user.id, roles: user.roles, scopes: user.scopes },
        'Access denied to share consent',
      );
      throw new ForbiddenException('You do not have permission to share this consent');
    }

    const existingConsent = this.entityToConsent(entity);
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
        consentId: id,
        userId: user?.id,
        practitionerReference: shareDto.practitionerReference,
        days: shareDto.days,
        expirationDate: expirationDate.toISOString(),
      },
      'Consent shared with practitioner',
    );

    return this.entityToConsent(savedEntity);
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
    const consent = this.entityToConsent(entity);

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
}
