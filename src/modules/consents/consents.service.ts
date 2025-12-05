import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PinoLogger } from 'nestjs-pino';

import { Consent } from '../../common/interfaces/fhir.interface';
import { CreateConsentDto, UpdateConsentDto } from '../../common/dto/fhir-consent.dto';
import { ConsentEntity } from '../../entities/consent.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { User } from '../auth/interfaces/user.interface';
import { ROLES } from '../../common/constants/roles';

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
    entity.resourceType = 'Consent';
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
   * @param user - Current authenticated user
   * @param consentEntity - Consent entity to check access for
   * @returns true if user has access, false otherwise
   */
  private async canAccessConsent(user: User, consentEntity: ConsentEntity): Promise<boolean> {
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
   */
  async create(createConsentDto: CreateConsentDto, user?: User): Promise<Consent> {
    // Validate patient ownership if user is a patient
    if (user) {
      await this.validatePatientOwnership(user, createConsentDto.patient?.reference);
    }

    const consentId = uuidv4();
    const now = new Date().toISOString();

    const consent: Consent = {
      resourceType: 'Consent',
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
    const entries = entities.map((entity) => this.entityToConsent(entity));

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

    // Check access permissions
    if (user && !(await this.canAccessConsent(user, entity))) {
      this.logger.warn(
        { consentId: id, userId: user.id, roles: user.roles },
        'Access denied to consent',
      );
      throw new ForbiddenException('You do not have permission to access this consent');
    }

    return this.entityToConsent(entity);
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

    // Check access permissions
    if (user && !(await this.canAccessConsent(user, entity))) {
      this.logger.warn(
        { consentId: id, userId: user.id, roles: user.roles },
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

    // Check access permissions
    if (user && !(await this.canAccessConsent(user, entity))) {
      this.logger.warn(
        { consentId: id, userId: user.id, roles: user.roles },
        'Access denied to delete consent',
      );
      throw new ForbiddenException('You do not have permission to delete this consent');
    }

    entity.deletedAt = new Date();
    await this.consentRepository.save(entity);
    this.logger.info({ consentId: id, userId: user?.id }, 'Consent deleted');
  }
}
