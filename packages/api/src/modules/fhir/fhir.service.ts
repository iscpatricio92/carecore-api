import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, SelectQueryBuilder } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PinoLogger } from 'nestjs-pino';

import { Patient, Practitioner, Encounter, User } from '@carecore/shared';
import { FHIR_RESOURCE_TYPES, FHIR_ACTIONS, ALL_FHIR_SCOPES } from '@carecore/shared';
import { CreatePatientDto, UpdatePatientDto } from '../../common/dto/fhir-patient.dto';
import {
  CreatePractitionerDto,
  UpdatePractitionerDto,
} from '../../common/dto/fhir-practitioner.dto';
import { CreateEncounterDto, UpdateEncounterDto } from '../../common/dto/fhir-encounter.dto';
import { FhirErrorService } from '../../common/services/fhir-error.service';
import { PatientEntity } from '../../entities/patient.entity';
import { PractitionerEntity } from '../../entities/practitioner.entity';
import { EncounterEntity } from '../../entities/encounter.entity';
import { ROLES } from '../../common/constants/roles';
import { AuditService } from '../audit/audit.service';
import { ScopePermissionService } from '../auth/services/scope-permission.service';

/**
 * FHIR service for managing FHIR R4 resources
 * Uses TypeORM entities for database persistence
 */
@Injectable()
export class FhirService {
  constructor(
    @InjectRepository(PatientEntity)
    private patientRepository: Repository<PatientEntity>,
    @InjectRepository(PractitionerEntity)
    private practitionerRepository: Repository<PractitionerEntity>,
    @InjectRepository(EncounterEntity)
    private encounterRepository: Repository<EncounterEntity>,
    private configService: ConfigService,
    private readonly logger: PinoLogger,
    private readonly auditService: AuditService,
    private readonly scopePermissionService: ScopePermissionService,
  ) {
    this.logger.setContext(FhirService.name);
  }

  /**
   * Validate uniqueness of patient identifiers
   * Checks if any identifier (SSN, medical record number, etc.) already exists
   * @param identifiers Array of patient identifiers to validate
   * @returns True if all identifiers are unique, throws BadRequestException if duplicate found
   */
  async validatePatientIdentifierUniqueness(
    identifiers?: Array<{ system?: string; value?: string }>,
  ): Promise<boolean> {
    if (!identifiers || identifiers.length === 0) {
      return true; // No identifiers to validate
    }

    // Check each identifier for uniqueness
    for (const identifier of identifiers) {
      if (!identifier.value) {
        continue; // Skip empty values
      }

      // Search for existing patients with this identifier
      const existingPatients = await this.patientRepository
        .createQueryBuilder('patient')
        .where('patient.deletedAt IS NULL')
        .andWhere(`patient."fhirResource"->'identifier' @> :identifier`, {
          identifier: JSON.stringify([{ system: identifier.system, value: identifier.value }]),
        })
        .getCount();

      if (existingPatients > 0) {
        const identifierType = identifier.system || 'identifier';
        this.logger.warn(
          { identifier: identifier.value, system: identifier.system },
          `Duplicate patient identifier found: ${identifierType}`,
        );
        throw new BadRequestException(
          `A patient with this ${identifierType} (${identifier.value}) already exists`,
        );
      }
    }

    return true;
  }

  getCapabilityStatement() {
    const baseUrl =
      this.configService.get<string>('FHIR_BASE_URL') || 'http://localhost:3000/api/fhir';

    // Build SMART on FHIR OAuth2 endpoints
    // baseUrl already includes /api/fhir, so we just append /auth and /token
    // Remove trailing slash from baseUrl if present
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const authorizeUrl = `${cleanBaseUrl}/auth`;
    const tokenUrl = `${cleanBaseUrl}/token`;

    return {
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: new Date().toISOString(),
      publisher: 'CareCore',
      kind: 'instance',
      software: {
        name: 'CareCore API',
        version: '1.0.0',
      },
      implementation: {
        url: baseUrl,
        description: 'CareCore FHIR R4 API',
      },
      fhirVersion: '4.0.1',
      format: ['application/fhir+json', 'application/json'],
      rest: [
        {
          mode: 'server',
          security: {
            extension: [
              {
                url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris',
                extension: [
                  {
                    url: 'authorize',
                    valueUri: authorizeUrl,
                  },
                  {
                    url: 'token',
                    valueUri: tokenUrl,
                  },
                ],
              },
            ],
            service: [
              {
                coding: [
                  {
                    system: 'http://hl7.org/fhir/restful-security-service',
                    code: 'SMART-on-FHIR',
                    display: 'SMART on FHIR',
                  },
                ],
                text: 'OAuth2 using SMART-on-FHIR profile (see http://docs.smarthealthit.org)',
              },
            ],
            cors: true,
          },
          resource: [
            {
              type: FHIR_RESOURCE_TYPES.PATIENT,
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
                { code: 'update' },
                { code: 'delete' },
              ],
              searchParam: [
                { name: 'name', type: 'string' },
                { name: 'identifier', type: 'token' },
              ],
            },
            {
              type: FHIR_RESOURCE_TYPES.PRACTITIONER,
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
                { code: 'update' },
                { code: 'delete' },
              ],
              searchParam: [
                { name: 'name', type: 'string' },
                { name: 'identifier', type: 'token' },
              ],
            },
            {
              type: FHIR_RESOURCE_TYPES.ENCOUNTER,
              interaction: [
                { code: 'read' },
                { code: 'search-type' },
                { code: 'create' },
                { code: 'update' },
                { code: 'delete' },
              ],
              searchParam: [
                { name: 'subject', type: 'reference' },
                { name: 'status', type: 'token' },
                { name: 'date', type: 'date' },
              ],
            },
          ],
        },
      ],
      // SMART on FHIR specific extensions
      extension: [
        {
          url: 'http://fhir-registry.smarthealthit.org/StructureDefinition/capabilities',
          extension: [
            {
              url: 'supported-scopes',
              valueString: ALL_FHIR_SCOPES.join(' '),
            },
            {
              url: 'launch-types',
              valueString: 'standalone launch ehr-launch',
            },
          ],
        },
      ],
    };
  }

  // ========== Helper Methods ==========

  /**
   * Converts PatientEntity to Patient resource
   */
  private entityToPatient(entity: PatientEntity): Patient {
    if (!entity.fhirResource) {
      throw new Error('Patient entity missing fhirResource');
    }
    return entity.fhirResource;
  }

  /**
   * Converts Patient resource to PatientEntity
   */
  private patientToEntity(patient: Patient): PatientEntity {
    const entity = new PatientEntity();
    entity.fhirResource = patient;
    entity.resourceType = FHIR_RESOURCE_TYPES.PATIENT;
    entity.active = patient.active ?? true;
    entity.patientId = patient.id || '';
    return entity;
  }

  /**
   * Converts PractitionerEntity to Practitioner resource
   */
  private entityToPractitioner(entity: PractitionerEntity): Practitioner {
    if (!entity.fhirResource) {
      throw new Error('Practitioner entity missing fhirResource');
    }
    return entity.fhirResource;
  }

  /**
   * Converts Practitioner resource to PractitionerEntity
   */
  private practitionerToEntity(practitioner: Practitioner): PractitionerEntity {
    const entity = new PractitionerEntity();
    entity.fhirResource = practitioner;
    entity.resourceType = FHIR_RESOURCE_TYPES.PRACTITIONER;
    entity.active = practitioner.active ?? true;
    entity.practitionerId = practitioner.id || '';
    return entity;
  }

  /**
   * Converts EncounterEntity to Encounter resource
   */
  private entityToEncounter(entity: EncounterEntity): Encounter {
    if (!entity.fhirResource) {
      throw new Error('Encounter entity missing fhirResource');
    }
    return entity.fhirResource;
  }

  /**
   * Converts Encounter resource to EncounterEntity
   */
  private encounterToEntity(encounter: Encounter): EncounterEntity {
    const entity = new EncounterEntity();
    entity.fhirResource = encounter;
    entity.resourceType = FHIR_RESOURCE_TYPES.ENCOUNTER;
    entity.status = encounter.status;
    entity.encounterId = encounter.id || '';
    entity.subjectReference = encounter.subject?.reference || '';
    return entity;
  }

  // ========== Authorization Helper Methods ==========

  /**
   * Extracts patient ID from SMART on FHIR patient context
   * Handles formats like "Patient/123" or just "123"
   * @param patientContext - Patient context from token (can be "Patient/123" or "123")
   * @returns Patient ID or undefined if not a valid patient context
   */
  private extractPatientIdFromContext(patientContext?: string): string | undefined {
    if (!patientContext) {
      return undefined;
    }

    // Remove "Patient/" prefix if present
    return patientContext.replace(/^Patient\//, '');
  }

  /**
   * Checks if user has permission to access a patient resource
   * Combines role-based and scope-based authorization
   * Also considers SMART on FHIR patient context for automatic filtering
   * @param user - Current authenticated user
   * @param patientEntity - Patient entity to check access for
   * @param action - Action type ('read' or 'write')
   * @returns true if user has access, false otherwise
   */
  private canAccessPatient(
    user: User,
    patientEntity: PatientEntity,
    action: string = FHIR_ACTIONS.READ,
  ): boolean {
    // Admin can access all patients (bypasses patient context)
    if (user.roles.includes(ROLES.ADMIN)) {
      return true;
    }

    // Check SMART on FHIR patient context
    // If token has patient context, user can only access that specific patient
    const tokenPatientId = this.extractPatientIdFromContext(user.patient);
    if (tokenPatientId) {
      // Token is scoped to a specific patient - only allow access to that patient
      return patientEntity.patientId === tokenPatientId;
    }

    // Patient can only access their own records
    if (user.roles.includes(ROLES.PATIENT)) {
      return patientEntity.keycloakUserId === user.id;
    }

    // Practitioners can access all active patients (for now)
    // TODO: In the future, filter by assigned patients or consent
    if (user.roles.includes(ROLES.PRACTITIONER)) {
      return patientEntity.active === true;
    }

    // Check scope-based permissions for other roles
    // If role grants permission, allow access
    if (
      this.scopePermissionService.roleGrantsPermission(user, FHIR_RESOURCE_TYPES.PATIENT, action)
    ) {
      return true;
    }

    // Check if user has required scopes
    const hasScopePermission = this.scopePermissionService.hasResourcePermission(
      user,
      FHIR_RESOURCE_TYPES.PATIENT,
      action,
    );

    if (hasScopePermission) {
      // For scope-based access, still need to check resource ownership for write operations
      // Read operations with scopes can access any patient (subject to consent)
      if (action === FHIR_ACTIONS.WRITE) {
        // Write operations require ownership or practitioner role
        return patientEntity.keycloakUserId === user.id || user.roles.includes(ROLES.PRACTITIONER);
      }
      return true;
    }

    // Other roles (viewer, lab, insurer) need explicit consent
    // For now, deny access (will be implemented with Consent resource)
    return false;
  }

  /**
   * Applies role-based and SMART on FHIR patient context filtering to patient query builder
   * @param queryBuilder - TypeORM query builder
   * @param user - Current authenticated user
   */
  private applyPatientAccessFilter(
    queryBuilder: SelectQueryBuilder<PatientEntity>,
    user: User,
  ): void {
    // Admin can see all patients (bypasses patient context)
    if (user.roles.includes(ROLES.ADMIN)) {
      return; // No filter needed
    }

    // Check SMART on FHIR patient context
    // If token has patient context, filter to that specific patient only
    const tokenPatientId = this.extractPatientIdFromContext(user.patient);
    if (tokenPatientId) {
      // Token is scoped to a specific patient - filter to that patient only
      queryBuilder.andWhere('patient.patientId = :tokenPatientId', {
        tokenPatientId,
      });
      this.logger.debug({ tokenPatientId }, 'Filtering patients by SMART on FHIR patient context');
      return;
    }

    // Patient can only see their own records
    if (user.roles.includes(ROLES.PATIENT)) {
      queryBuilder.andWhere('patient.keycloakUserId = :keycloakUserId', {
        keycloakUserId: user.id,
      });
      return;
    }

    // Practitioners can see all active patients (for now)
    // TODO: In the future, filter by assigned patients or consent
    if (user.roles.includes(ROLES.PRACTITIONER)) {
      queryBuilder.andWhere('patient.active = :active', { active: true });
      return;
    }

    // Other roles (viewer, lab, insurer) need explicit consent
    // For now, return empty results (will be implemented with Consent resource)
    queryBuilder.andWhere('patient.id = :id', { id: '0' }); // Always false condition
  }

  // ========== Patient Methods ==========

  /**
   * Creates a new Patient
   * If user has 'patient' role, automatically links the patient to the user
   * Validates user has 'patient:write' scope or appropriate role
   */
  async createPatient(createPatientDto: CreatePatientDto, user?: User): Promise<Patient> {
    // Validate user has permission to create patients
    if (user) {
      // Check role-based permissions first
      const hasRolePermission =
        user.roles.includes(ROLES.ADMIN) ||
        user.roles.includes(ROLES.PATIENT) ||
        user.roles.includes(ROLES.PRACTITIONER);

      // Check scope-based permissions
      const hasScopePermission = this.scopePermissionService.hasResourcePermission(
        user,
        FHIR_RESOURCE_TYPES.PATIENT,
        FHIR_ACTIONS.WRITE,
      );

      if (!hasRolePermission && !hasScopePermission) {
        this.logger.warn(
          { userId: user.id, roles: user.roles, scopes: user.scopes },
          'Access denied to create patient',
        );
        throw new ForbiddenException(
          'You do not have permission to create patients. Required: patient:write scope or patient/practitioner/admin role',
        );
      }
    }

    const patientId = uuidv4();
    const now = new Date().toISOString();

    const patient: Patient = {
      resourceType: FHIR_RESOURCE_TYPES.PATIENT,
      id: patientId,
      meta: {
        versionId: '1',
        lastUpdated: now,
      },
      ...createPatientDto,
    };

    const entity = this.patientToEntity(patient);

    // If user has 'patient' role, link the patient to the user
    if (user && user.roles.includes(ROLES.PATIENT)) {
      entity.keycloakUserId = user.id;
      this.logger.debug({ patientId, userId: user.id }, 'Patient linked to Keycloak user');
    }

    const savedEntity = await this.patientRepository.save(entity);
    this.logger.info({ patientId }, 'Patient created');

    // Audit log
    this.auditService
      .logCreate({
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        resourceId: patientId,
        user: user || null,
        changes: { resource: patient },
      })
      .catch((error) => {
        this.logger.error({ error }, 'Failed to log audit for patient creation');
      });

    return this.entityToPatient(savedEntity);
  }

  /**
   * Gets a Patient by ID (FHIR resource ID, not database UUID)
   * Applies role-based access control
   */
  async getPatient(id: string, user?: User): Promise<Patient> {
    const entity = await this.patientRepository.findOne({
      where: { patientId: id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(
        FhirErrorService.createNotFoundError(FHIR_RESOURCE_TYPES.PATIENT, id),
      );
    }

    // Check access permissions (read operation)
    if (user && !this.canAccessPatient(user, entity, FHIR_ACTIONS.READ)) {
      this.logger.warn(
        { patientId: id, userId: user.id, roles: user.roles, scopes: user.scopes },
        'Access denied to patient',
      );
      throw new ForbiddenException('You do not have permission to access this patient');
    }

    return this.entityToPatient(entity);
  }

  /**
   * Searches Patients with optional filters
   * Applies role-based access control
   */
  async searchPatients(
    params: {
      page?: number;
      limit?: number;
      name?: string;
      identifier?: string;
    },
    user?: User,
  ): Promise<{ total: number; entries: Patient[] }> {
    const { page = 1, limit = 10, name, identifier } = params;
    const queryBuilder = this.patientRepository
      .createQueryBuilder('patient')
      .where('patient.deletedAt IS NULL');

    // Apply role-based access filtering
    if (user) {
      this.applyPatientAccessFilter(queryBuilder, user);
    }

    // Filter by name (search in JSONB)
    if (name) {
      const searchName = name.toLowerCase();
      queryBuilder.andWhere(
        `LOWER(patient."fhirResource"->'name'->0->>'family') LIKE :name OR LOWER(patient."fhirResource"->'name'->0->>'given'->>0) LIKE :name`,
        { name: `%${searchName}%` },
      );
    }

    // Filter by identifier (search in JSONB)
    if (identifier) {
      queryBuilder.andWhere(`patient."fhirResource"->'identifier' @> :identifier`, {
        identifier: JSON.stringify([{ value: identifier }]),
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Pagination
    const entities = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const entries = entities.map((entity) => this.entityToPatient(entity));

    this.logger.debug(
      { total, page, limit, userId: user?.id, roles: user?.roles },
      'Patients searched',
    );

    return { total, entries };
  }

  /**
   * Updates an existing Patient
   * Applies role-based access control
   */
  async updatePatient(
    id: string,
    updatePatientDto: UpdatePatientDto,
    user?: User,
  ): Promise<Patient> {
    const entity = await this.patientRepository.findOne({
      where: { patientId: id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(
        FhirErrorService.createNotFoundError(FHIR_RESOURCE_TYPES.PATIENT, id),
      );
    }

    // Check access permissions (write operation)
    if (user && !this.canAccessPatient(user, entity, FHIR_ACTIONS.WRITE)) {
      this.logger.warn(
        { patientId: id, userId: user.id, roles: user.roles, scopes: user.scopes },
        'Access denied to update patient',
      );
      throw new ForbiddenException('You do not have permission to update this patient');
    }

    const existingPatient = this.entityToPatient(entity);
    const now = new Date().toISOString();
    const currentVersion = parseInt(existingPatient.meta?.versionId || '1', 10);

    const updatedPatient: Patient = {
      ...existingPatient,
      ...updatePatientDto,
      id, // Ensure ID doesn't change
      meta: {
        ...existingPatient.meta,
        versionId: String(currentVersion + 1),
        lastUpdated: now,
      },
    };

    const updatedEntity = this.patientToEntity(updatedPatient);
    updatedEntity.id = entity.id; // Preserve database UUID
    updatedEntity.createdAt = entity.createdAt; // Preserve creation date

    const savedEntity = await this.patientRepository.save(updatedEntity);
    this.logger.info({ patientId: id }, 'Patient updated');

    // Audit log with changes
    this.auditService
      .logUpdate({
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        resourceId: id,
        user: user || null,
        changes: {
          before: existingPatient,
          after: updatedPatient,
        },
      })
      .catch((error) => {
        this.logger.error({ error }, 'Failed to log audit for patient update');
      });

    return this.entityToPatient(savedEntity);
  }

  /**
   * Deletes (soft delete) a Patient
   * Applies role-based access control
   */
  async deletePatient(id: string, user?: User): Promise<void> {
    const entity = await this.patientRepository.findOne({
      where: { patientId: id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(
        FhirErrorService.createNotFoundError(FHIR_RESOURCE_TYPES.PATIENT, id),
      );
    }

    // Check access permissions
    if (user && !this.canAccessPatient(user, entity)) {
      this.logger.warn(
        { patientId: id, userId: user.id, roles: user.roles },
        'Access denied to delete patient',
      );
      throw new ForbiddenException('You do not have permission to delete this patient');
    }

    entity.deletedAt = new Date();
    await this.patientRepository.save(entity);
    this.logger.info({ patientId: id }, 'Patient deleted');

    // Audit log
    this.auditService
      .logDelete({
        resourceType: FHIR_RESOURCE_TYPES.PATIENT,
        resourceId: id,
        user: user || null,
      })
      .catch((error) => {
        this.logger.error({ error }, 'Failed to log audit for patient deletion');
      });
  }

  // ========== Practitioner Methods ==========

  /**
   * Creates a new Practitioner
   */
  async createPractitioner(createPractitionerDto: CreatePractitionerDto): Promise<Practitioner> {
    const practitionerId = uuidv4();
    const now = new Date().toISOString();

    const practitioner: Practitioner = {
      resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
      id: practitionerId,
      meta: {
        versionId: '1',
        lastUpdated: now,
      },
      ...createPractitionerDto,
    };

    const entity = this.practitionerToEntity(practitioner);
    const savedEntity = await this.practitionerRepository.save(entity);
    this.logger.info({ practitionerId }, 'Practitioner created');

    // Audit log
    this.auditService
      .logCreate({
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        resourceId: practitionerId,
        changes: { resource: practitioner },
      })
      .catch((error) => {
        this.logger.error({ error }, 'Failed to log audit for practitioner creation');
      });

    return this.entityToPractitioner(savedEntity);
  }

  /**
   * Gets a Practitioner by ID (FHIR resource ID, not database UUID)
   */
  async getPractitioner(id: string): Promise<Practitioner> {
    const entity = await this.practitionerRepository.findOne({
      where: { practitionerId: id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(
        FhirErrorService.createNotFoundError(FHIR_RESOURCE_TYPES.PRACTITIONER, id),
      );
    }

    return this.entityToPractitioner(entity);
  }

  /**
   * Searches Practitioners with optional filters
   */
  async searchPractitioners(params: {
    page?: number;
    limit?: number;
    name?: string;
    identifier?: string;
  }): Promise<{ total: number; entries: Practitioner[] }> {
    const { page = 1, limit = 10, name, identifier } = params;
    const queryBuilder = this.practitionerRepository
      .createQueryBuilder('practitioner')
      .where('practitioner.deletedAt IS NULL');

    // Filter by name (search in JSONB)
    if (name) {
      const searchName = name.toLowerCase();
      queryBuilder.andWhere(
        `LOWER(practitioner."fhirResource"->'name'->0->>'family') LIKE :name OR LOWER(practitioner."fhirResource"->'name'->0->>'given'->>0) LIKE :name`,
        { name: `%${searchName}%` },
      );
    }

    // Filter by identifier (search in JSONB)
    if (identifier) {
      queryBuilder.andWhere(`practitioner."fhirResource"->'identifier' @> :identifier`, {
        identifier: JSON.stringify([{ value: identifier }]),
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Pagination
    const entities = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const entries = entities.map((entity) => this.entityToPractitioner(entity));

    this.logger.debug({ total, page, limit }, 'Practitioners searched');

    return { total, entries };
  }

  /**
   * Updates an existing Practitioner
   */
  async updatePractitioner(
    id: string,
    updatePractitionerDto: UpdatePractitionerDto,
  ): Promise<Practitioner> {
    const entity = await this.practitionerRepository.findOne({
      where: { practitionerId: id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(
        FhirErrorService.createNotFoundError(FHIR_RESOURCE_TYPES.PRACTITIONER, id),
      );
    }

    const existingPractitioner = this.entityToPractitioner(entity);
    const now = new Date().toISOString();
    const currentVersion = parseInt(existingPractitioner.meta?.versionId || '1', 10);

    const updatedPractitioner: Practitioner = {
      ...existingPractitioner,
      ...updatePractitionerDto,
      id, // Ensure ID doesn't change
      meta: {
        ...existingPractitioner.meta,
        versionId: String(currentVersion + 1),
        lastUpdated: now,
      },
    };

    const updatedEntity = this.practitionerToEntity(updatedPractitioner);
    updatedEntity.id = entity.id; // Preserve database UUID
    updatedEntity.createdAt = entity.createdAt; // Preserve creation date

    const savedEntity = await this.practitionerRepository.save(updatedEntity);
    this.logger.info({ practitionerId: id }, 'Practitioner updated');

    // Audit log with changes
    this.auditService
      .logUpdate({
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        resourceId: id,
        changes: {
          before: existingPractitioner,
          after: updatedPractitioner,
        },
      })
      .catch((error) => {
        this.logger.error({ error }, 'Failed to log audit for practitioner update');
      });

    return this.entityToPractitioner(savedEntity);
  }

  /**
   * Deletes a Practitioner (soft delete)
   */
  async deletePractitioner(id: string): Promise<void> {
    const entity = await this.practitionerRepository.findOne({
      where: { practitionerId: id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(
        FhirErrorService.createNotFoundError(FHIR_RESOURCE_TYPES.PRACTITIONER, id),
      );
    }

    entity.deletedAt = new Date();
    await this.practitionerRepository.save(entity);
    this.logger.info({ practitionerId: id }, 'Practitioner deleted');

    // Audit log
    this.auditService
      .logDelete({
        resourceType: FHIR_RESOURCE_TYPES.PRACTITIONER,
        resourceId: id,
      })
      .catch((error) => {
        this.logger.error({ error }, 'Failed to log audit for practitioner deletion');
      });
  }

  // ========== Encounter Methods ==========

  /**
   * Creates a new Encounter
   */
  async createEncounter(createEncounterDto: CreateEncounterDto): Promise<Encounter> {
    const encounterId = uuidv4();
    const now = new Date().toISOString();

    const encounter: Encounter = {
      resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
      id: encounterId,
      meta: {
        versionId: '1',
        lastUpdated: now,
      },
      ...createEncounterDto,
    };

    const entity = this.encounterToEntity(encounter);
    const savedEntity = await this.encounterRepository.save(entity);
    this.logger.info({ encounterId }, 'Encounter created');

    // Audit log
    this.auditService
      .logCreate({
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        resourceId: encounterId,
        changes: { resource: encounter },
      })
      .catch((error) => {
        this.logger.error({ error }, 'Failed to log audit for encounter creation');
      });

    return this.entityToEncounter(savedEntity);
  }

  /**
   * Checks if user has permission to access an encounter resource
   * Validates that encounter belongs to patient context if present
   * @param user - Current authenticated user
   * @param encounterEntity - Encounter entity to check access for
   * @returns true if user has access, false otherwise
   */
  private canAccessEncounter(user: User, encounterEntity: EncounterEntity): boolean {
    // Admin can access all encounters (bypasses patient context)
    if (user.roles.includes(ROLES.ADMIN)) {
      return true;
    }

    // Check SMART on FHIR patient context
    const tokenPatientId = this.extractPatientIdFromContext(user.patient);
    if (tokenPatientId) {
      // Token is scoped to a specific patient - only allow access to encounters for that patient
      const encounterPatientId = encounterEntity.subjectReference?.replace(/^Patient\//, '');
      return encounterPatientId === tokenPatientId;
    }

    // Practitioners can access all encounters (for now)
    // TODO: In the future, filter by assigned patients or consent
    if (user.roles.includes(ROLES.PRACTITIONER)) {
      return true;
    }

    // Patient can only access their own encounters
    // For now, we'll allow if the encounter references a patient
    // In a full implementation, we'd check if the patient's keycloakUserId matches
    if (user.roles.includes(ROLES.PATIENT)) {
      // TODO: Implement full patient ownership check by looking up patient entity
      return true; // Simplified for now - would need patient lookup
    }

    // Check scope-based permissions
    const hasScopePermission = this.scopePermissionService.hasResourcePermission(
      user,
      FHIR_RESOURCE_TYPES.ENCOUNTER,
      FHIR_ACTIONS.READ,
    );

    return hasScopePermission;
  }

  /**
   * Gets an Encounter by ID (FHIR resource ID, not database UUID)
   * Applies patient context filtering if present
   */
  async getEncounter(id: string, user?: User): Promise<Encounter> {
    const entity = await this.encounterRepository.findOne({
      where: { encounterId: id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(
        FhirErrorService.createNotFoundError(FHIR_RESOURCE_TYPES.ENCOUNTER, id),
      );
    }

    // Check access permissions if user is provided
    if (user && !this.canAccessEncounter(user, entity)) {
      this.logger.warn(
        { encounterId: id, userId: user.id, patient: user.patient },
        'Access denied to encounter',
      );
      throw new ForbiddenException('You do not have permission to access this encounter');
    }

    return this.entityToEncounter(entity);
  }

  /**
   * Searches Encounters with optional filters
   * Applies patient context filtering if present in user token
   */
  async searchEncounters(
    params: {
      page?: number;
      limit?: number;
      subject?: string; // Patient reference
      status?: string;
      date?: string;
      sort?: string; // FHIR sort parameter (e.g., "-date" for descending by date)
    },
    user?: User,
  ): Promise<{ total: number; entries: Encounter[] }> {
    const { page = 1, limit = 10, subject, status, date, sort } = params;
    const queryBuilder = this.encounterRepository
      .createQueryBuilder('encounter')
      .where('encounter.deletedAt IS NULL');

    // Apply SMART on FHIR patient context filtering (admin bypasses this)
    const tokenPatientId =
      user && !user.roles.includes(ROLES.ADMIN)
        ? this.extractPatientIdFromContext(user.patient)
        : undefined;
    if (tokenPatientId) {
      // Token is scoped to a specific patient - filter to encounters for that patient only
      queryBuilder.andWhere('encounter.subjectReference = :tokenPatientRef', {
        tokenPatientRef: `Patient/${tokenPatientId}`,
      });
      this.logger.debug(
        { tokenPatientId },
        'Filtering encounters by SMART on FHIR patient context',
      );
    }

    // Filter by subject (using indexed field) - only if not already filtered by patient context
    if (subject && !tokenPatientId) {
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

    // Get total count
    const total = await queryBuilder.getCount();

    // Pagination
    const entities = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    const entries = entities.map((entity) => this.entityToEncounter(entity));

    this.logger.debug({ total, page, limit }, 'Encounters searched');

    return { total, entries };
  }

  /**
   * Updates an existing Encounter
   */
  async updateEncounter(id: string, updateEncounterDto: UpdateEncounterDto): Promise<Encounter> {
    const entity = await this.encounterRepository.findOne({
      where: { encounterId: id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(
        FhirErrorService.createNotFoundError(FHIR_RESOURCE_TYPES.ENCOUNTER, id),
      );
    }

    const existingEncounter = this.entityToEncounter(entity);
    const now = new Date().toISOString();
    const currentVersion = parseInt(existingEncounter.meta?.versionId || '1', 10);

    const updatedEncounter: Encounter = {
      ...existingEncounter,
      ...updateEncounterDto,
      id, // Ensure ID doesn't change
      meta: {
        ...existingEncounter.meta,
        versionId: String(currentVersion + 1),
        lastUpdated: now,
      },
    };

    const updatedEntity = this.encounterToEntity(updatedEncounter);
    updatedEntity.id = entity.id; // Preserve database UUID
    updatedEntity.createdAt = entity.createdAt; // Preserve creation date

    const savedEntity = await this.encounterRepository.save(updatedEntity);
    this.logger.info({ encounterId: id }, 'Encounter updated');

    // Audit log with changes
    this.auditService
      .logUpdate({
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        resourceId: id,
        changes: {
          before: existingEncounter,
          after: updatedEncounter,
        },
      })
      .catch((error) => {
        this.logger.error({ error }, 'Failed to log audit for encounter update');
      });

    return this.entityToEncounter(savedEntity);
  }

  /**
   * Deletes an Encounter (soft delete)
   */
  async deleteEncounter(id: string): Promise<void> {
    const entity = await this.encounterRepository.findOne({
      where: { encounterId: id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(
        FhirErrorService.createNotFoundError(FHIR_RESOURCE_TYPES.ENCOUNTER, id),
      );
    }

    entity.deletedAt = new Date();
    await this.encounterRepository.save(entity);
    this.logger.info({ encounterId: id }, 'Encounter deleted');

    // Audit log
    this.auditService
      .logDelete({
        resourceType: FHIR_RESOURCE_TYPES.ENCOUNTER,
        resourceId: id,
      })
      .catch((error) => {
        this.logger.error({ error }, 'Failed to log audit for encounter deletion');
      });
  }
}
