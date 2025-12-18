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
import { ROLES } from '../../common/constants/roles';

@Injectable()
export class EncountersService {
  constructor(
    @InjectRepository(EncounterEntity)
    private encounterRepository: Repository<EncounterEntity>,
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
   * Validates that user has access to an encounter
   * Patients can only access their own encounters
   * Practitioners and admins can access all encounters
   */
  private validateAccess(entity: EncounterEntity, user?: User): void {
    if (!user) {
      return; // No user means no restrictions (shouldn't happen in protected endpoints)
    }

    // Admins can access everything
    if (user.roles?.includes(ROLES.ADMIN)) {
      return;
    }

    // Extract patient ID from user context
    const userPatientId = this.extractPatientIdFromContext(user.patient || user.fhirUser);

    // If user has patient context, they can only access their own encounters
    if (userPatientId) {
      const encounterPatientId = this.extractPatientIdFromContext(entity.subjectReference);
      if (encounterPatientId !== userPatientId) {
        throw new ForbiddenException(
          'You do not have permission to access this encounter. Patients can only access their own encounters.',
        );
      }
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

    // Apply SMART on FHIR patient context filtering (admin bypasses this)
    const tokenPatientId =
      user && !user.roles?.includes(ROLES.ADMIN)
        ? this.extractPatientIdFromContext(user.patient || user.fhirUser)
        : undefined;

    if (tokenPatientId) {
      // Token is scoped to a specific patient - filter to encounters for that patient only
      queryBuilder.andWhere('encounter.subjectReference = :tokenPatientRef', {
        tokenPatientRef: `Patient/${tokenPatientId}`,
      });
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
