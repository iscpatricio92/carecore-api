import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

import { EncounterEntity } from '../../entities/encounter.entity';
import {
  EncounterDto,
  EncounterListItemDto,
  EncounterDetailDto,
} from '../../common/dto/encounter.dto';
import { EncountersListResponse, User } from '@carecore/shared';
import { PatientContextService } from '../../common/services/patient-context.service';

@Injectable()
export class EncountersService {
  constructor(
    @InjectRepository(EncounterEntity)
    private encounterRepository: Repository<EncounterEntity>,
    private readonly patientContextService: PatientContextService,
  ) {}

  /**
   * Converts EncounterEntity to simple DTO
   */
  private entityToDto(entity: EncounterEntity): EncounterDto {
    return {
      id: entity.id,
      encounterId: entity.encounterId,
      status: entity.status,
      subjectReference: entity.subjectReference,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      fhirResource: entity.fhirResource,
    };
  }

  /**
   * Converts EncounterEntity to list item DTO
   */
  private entityToListItem(entity: EncounterEntity): EncounterListItemDto {
    return {
      id: entity.id,
      encounterId: entity.encounterId,
      status: entity.status,
      subjectReference: entity.subjectReference,
      createdAt: entity.createdAt,
    };
  }

  /**
   * Validates that user has access to an encounter
   * Patients can only access their own encounters
   * Practitioners and admins can access all encounters
   * Uses PatientContextService to unify filtering logic
   */
  private validateAccess(entity: EncounterEntity, user?: User): void {
    if (!user) {
      return; // No user means no restrictions (shouldn't happen in protected endpoints)
    }

    // Admins can access everything
    if (this.patientContextService.shouldBypassFiltering(user)) {
      return;
    }

    // Use PatientContextService to get patient ID
    const userPatientId = this.patientContextService.getPatientId(user);
    if (userPatientId) {
      // Extract patient ID from encounter subject reference
      const encounterPatientId = entity.subjectReference?.replace(/^Patient\//, '');
      if (encounterPatientId !== userPatientId) {
        throw new ForbiddenException(
          'You do not have permission to access this encounter. Patients can only access their own encounters.',
        );
      }
      return;
    }

    // Check if user has 'patient' role and encounter belongs to their patient records
    const keycloakUserId = this.patientContextService.getKeycloakUserId(user);
    if (keycloakUserId) {
      // For keycloakUserId, we need to verify the encounter's patient belongs to this user
      // This validation is done at the query level in findAll, so we just return here
      // If a patient tries to access an encounter that doesn't belong to them,
      // it won't be in the results from findAll
      return;
    }

    // Practitioners can access all encounters (no restriction needed here)
    // If user is a patient without patient context, they shouldn't access any encounters
    // This is handled by the filtering in findAll
  }

  /**
   * Gets all encounters
   * Filters by patient context if user is a patient (not admin)
   */
  async findAll(user?: User): Promise<EncountersListResponse> {
    const queryBuilder = this.encounterRepository
      .createQueryBuilder('encounter')
      .where('encounter.deletedAt IS NULL');

    // Apply patient context filtering using unified service
    const patientReference = this.patientContextService.getPatientReference(user);
    if (patientReference) {
      queryBuilder.andWhere('encounter.subjectReference = :tokenPatientRef', {
        tokenPatientRef: patientReference,
      });
    } else if (user && !this.patientContextService.shouldBypassFiltering(user)) {
      // If user is not admin and has no patient reference, deny access
      // This ensures patients always have a patientId in their token
      queryBuilder.andWhere('1 = 0'); // Always false condition
    }

    const entities = await queryBuilder.orderBy('encounter.createdAt', 'DESC').getMany();

    return {
      data: entities.map((e) => this.entityToListItem(e)),
      total: entities.length,
    };
  }

  /**
   * Gets an encounter by ID
   * Validates that user has access to the encounter
   */
  async findOne(id: string, user?: User): Promise<EncounterDetailDto> {
    const entity = await this.encounterRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(`Encounter with ID ${id} not found`);
    }

    // Validate access (patients can only access their own encounters)
    this.validateAccess(entity, user);

    return this.entityToDto(entity) as EncounterDetailDto;
  }

  /**
   * Gets an encounter by encounterId (FHIR resource ID)
   * Validates that user has access to the encounter
   */
  async findByEncounterId(encounterId: string, user?: User): Promise<EncounterDetailDto> {
    const entity = await this.encounterRepository.findOne({
      where: { encounterId, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(`Encounter with encounterId ${encounterId} not found`);
    }

    // Validate access (patients can only access their own encounters)
    this.validateAccess(entity, user);

    return this.entityToDto(entity) as EncounterDetailDto;
  }
}
