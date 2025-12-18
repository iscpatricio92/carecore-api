import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, SelectQueryBuilder } from 'typeorm';
import { PinoLogger } from 'nestjs-pino';

import { EncounterEntity } from '../../entities/encounter.entity';
import { PatientEntity } from '../../entities/patient.entity';
import { User, FHIR_RESOURCE_TYPES, FHIR_ACTIONS } from '@carecore/shared';
import { PatientContextService } from '../../common/services/patient-context.service';
import { ScopePermissionService } from '../auth/services/scope-permission.service';
import { ROLES } from '../../common/constants/roles';

/**
 * Encounters Core Service
 *
 * Contains all business logic, security, and database access for Encounters.
 * This service is shared between FHIR and optimized client endpoints.
 *
 * Responsibilities:
 * - Database queries and filtering
 * - Role-based access control (RBAC)
 * - Patient context filtering
 * - Access validation
 * - Security checks
 *
 * Returns: EncounterEntity[] (no transformation)
 */
@Injectable()
export class EncountersCoreService {
  constructor(
    @InjectRepository(EncounterEntity)
    private encounterRepository: Repository<EncounterEntity>,
    @InjectRepository(PatientEntity)
    private patientRepository: Repository<PatientEntity>,
    private readonly patientContextService: PatientContextService,
    private readonly scopePermissionService: ScopePermissionService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(EncountersCoreService.name);
  }

  /**
   * Searches encounters with filters and pagination
   * Applies role-based and patient context filtering
   * Returns entities without transformation
   *
   * @param params - Search parameters (page, limit, subject, status, date, sort)
   * @param user - Current authenticated user (for access control)
   * @returns Entities and total count
   */
  async findEncountersByQuery(
    params: {
      page?: number;
      limit?: number;
      subject?: string;
      status?: string;
      date?: string;
      sort?: string;
    },
    user?: User,
  ): Promise<{ entities: EncounterEntity[]; total: number }> {
    const { page = 1, limit = 10, subject, status, date, sort } = params;
    const queryBuilder = this.encounterRepository
      .createQueryBuilder('encounter')
      .where('encounter.deletedAt IS NULL');

    // Apply patient context filtering (security)
    await this.applyPatientContextFilter(queryBuilder, user);

    // Filter by subject (using indexed field) - only if not already filtered by patient context
    const patientReference = this.patientContextService.getPatientReference(user);
    if (subject && !patientReference) {
      queryBuilder.andWhere('encounter.subjectReference = :subject', {
        subject: subject.includes('/') ? subject : `Patient/${subject}`,
      });
    }

    // Filter by status (using indexed field)
    if (status) {
      queryBuilder.andWhere('encounter.status = :status', { status });
    }

    // Filter by date (search in JSONB)
    if (date) {
      const searchDateStr = date.split('T')[0]; // Get YYYY-MM-DD part
      queryBuilder.andWhere(`DATE(encounter."fhirResource"->'period'->>'start') = :date`, {
        date: searchDateStr,
      });
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

    this.logger.debug({ total, page, limit, userId: user?.id }, 'Encounters queried');

    return { entities, total };
  }

  /**
   * Gets all encounters for a user
   * Simplified version for optimized endpoints (no FHIR filters)
   * Applies role-based and patient context filtering
   *
   * @param user - Current authenticated user
   * @returns Entities and total count
   */
  async findAll(user?: User): Promise<{ entities: EncounterEntity[]; total: number }> {
    const queryBuilder = this.encounterRepository
      .createQueryBuilder('encounter')
      .where('encounter.deletedAt IS NULL');

    // Apply patient context filtering (security)
    await this.applyPatientContextFilter(queryBuilder, user);

    // Default sort by createdAt descending
    queryBuilder.orderBy('encounter.createdAt', 'DESC');

    const entities = await queryBuilder.getMany();

    return { entities, total: entities.length };
  }

  /**
   * Gets an encounter by database UUID
   * Validates access based on user role and patient context
   *
   * @param id - Database UUID
   * @param user - Current authenticated user
   * @returns EncounterEntity
   * @throws NotFoundException if encounter not found
   * @throws ForbiddenException if user doesn't have access
   */
  async findEncounterById(id: string, user?: User): Promise<EncounterEntity> {
    const entity = await this.encounterRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(`Encounter with ID ${id} not found`);
    }

    // Validate access (security check)
    await this.validateAccess(entity, user);

    return entity;
  }

  /**
   * Gets an encounter by FHIR encounterId
   * Validates access based on user role and patient context
   *
   * @param encounterId - FHIR resource ID
   * @param user - Current authenticated user
   * @returns EncounterEntity
   * @throws NotFoundException if encounter not found
   * @throws ForbiddenException if user doesn't have access
   */
  async findEncounterByEncounterId(encounterId: string, user?: User): Promise<EncounterEntity> {
    const entity = await this.encounterRepository.findOne({
      where: { encounterId, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(`Encounter with encounterId ${encounterId} not found`);
    }

    // Validate access (security check)
    await this.validateAccess(entity, user);

    return entity;
  }

  /**
   * Applies patient context filtering to query builder
   * Implements role-based access control (RBAC)
   *
   * @param queryBuilder - TypeORM query builder
   * @param user - Current authenticated user
   */
  private async applyPatientContextFilter(
    queryBuilder: SelectQueryBuilder<EncounterEntity>,
    user?: User,
  ): Promise<void> {
    if (!user) {
      // No user means no restrictions (shouldn't happen in protected endpoints)
      return;
    }

    // Admin can see all encounters (bypasses patient context)
    if (this.patientContextService.shouldBypassFiltering(user)) {
      return; // No filter needed
    }

    // Apply patient context filtering using unified service
    const patientReference = this.patientContextService.getPatientReference(user);
    if (patientReference) {
      // Token has patient context - filter to that patient only
      queryBuilder.andWhere('encounter.subjectReference = :tokenPatientRef', {
        tokenPatientRef: patientReference,
      });
      this.logger.debug({ patientReference }, 'Filtering encounters by patient context');
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
        queryBuilder.andWhere('encounter.subjectReference IN (:...references)', {
          references: patientReferences,
        });
        this.logger.debug(
          { keycloakUserId, patientCount: patientEntities.length },
          'Filtering encounters by Keycloak user ID',
        );
      } else {
        // No patient records for this user, return empty
        queryBuilder.andWhere('1 = 0');
      }
      return;
    }

    // Practitioners can see all encounters (for now)
    // TODO: In the future, filter by assigned patients or consent
    if (user.roles?.includes(ROLES.PRACTITIONER)) {
      return; // No filter needed
    }

    // Other roles need explicit scope permissions
    // Check if user has encounter:read scope
    const hasScopePermission = this.scopePermissionService.hasResourcePermission(
      user,
      FHIR_RESOURCE_TYPES.ENCOUNTER,
      FHIR_ACTIONS.READ,
    );

    if (!hasScopePermission) {
      // No access - return empty results
      queryBuilder.andWhere('1 = 0');
    }
  }

  /**
   * Validates that user has access to an encounter
   * Implements role-based and scope-based access control
   *
   * @param entity - Encounter entity to validate
   * @param user - Current authenticated user
   * @throws ForbiddenException if user doesn't have access
   */
  private async validateAccess(entity: EncounterEntity, user?: User): Promise<void> {
    if (!user) {
      // No user means no restrictions (shouldn't happen in protected endpoints)
      return;
    }

    // Admin can access all encounters (bypasses patient context)
    if (this.patientContextService.shouldBypassFiltering(user)) {
      return;
    }

    // Use PatientContextService to determine access
    const patientId = this.patientContextService.getPatientId(user);
    if (patientId) {
      // Token is scoped to a specific patient - only allow access to encounters for that patient
      const encounterPatientId = entity.subjectReference?.replace(/^Patient\//, '');
      if (encounterPatientId !== patientId) {
        throw new ForbiddenException(
          'You do not have permission to access this encounter. Patients can only access their own encounters.',
        );
      }
      return;
    }

    // Check if encounter belongs to user's patient records
    const keycloakUserId = this.patientContextService.getKeycloakUserId(user);
    if (keycloakUserId) {
      // Need to check if encounter's patient belongs to this user
      const encounterPatientId = entity.subjectReference?.replace(/^Patient\//, '');
      if (encounterPatientId) {
        const patientEntity = await this.patientRepository.findOne({
          where: { patientId: encounterPatientId, keycloakUserId, deletedAt: IsNull() },
        });
        if (!patientEntity) {
          throw new ForbiddenException(
            'You do not have permission to access this encounter. Patients can only access their own encounters.',
          );
        }
      }
      return;
    }

    // Practitioners can access all encounters (for now)
    // TODO: In the future, filter by assigned patients or consent
    if (user.roles?.includes(ROLES.PRACTITIONER)) {
      return;
    }

    // Check scope-based permissions
    const hasScopePermission = this.scopePermissionService.hasResourcePermission(
      user,
      FHIR_RESOURCE_TYPES.ENCOUNTER,
      FHIR_ACTIONS.READ,
    );

    if (!hasScopePermission) {
      throw new ForbiddenException('You do not have permission to access this encounter');
    }
  }

  /**
   * Applies sorting to query builder based on FHIR sort parameter
   *
   * @param queryBuilder - TypeORM query builder
   * @param sort - FHIR sort parameter (e.g., "-date" for descending by date)
   */
  private applySorting(queryBuilder: SelectQueryBuilder<EncounterEntity>, sort?: string): void {
    if (sort) {
      // Parse FHIR sort parameter (e.g., "-date" means descending by date)
      const isDescending = sort.startsWith('-');
      const sortField = isDescending ? sort.substring(1) : sort;

      // Map FHIR field names to database fields
      if (sortField === 'date') {
        // Sort by period.start in JSONB
        queryBuilder.orderBy(
          `encounter."fhirResource"->'period'->>'start'`,
          isDescending ? 'DESC' : 'ASC',
        );
      } else if (sortField === 'status') {
        queryBuilder.orderBy('encounter.status', isDescending ? 'DESC' : 'ASC');
      } else {
        // Default sort by createdAt if field not recognized
        queryBuilder.orderBy('encounter.createdAt', isDescending ? 'DESC' : 'ASC');
      }
    } else {
      // Default sort by createdAt descending
      queryBuilder.orderBy('encounter.createdAt', 'DESC');
    }
  }
}
