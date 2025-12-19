import { EncounterEntity } from '../../../entities/encounter.entity';
import {
  EncounterDto,
  EncounterListItemDto,
  EncounterDetailDto,
} from '../../../common/dto/encounter.dto';

/**
 * Encounter to Client Mapper
 *
 * Pure functions for transforming EncounterEntity to optimized DTOs for mobile/web clients.
 * These functions have no side effects and are easily testable.
 */
export class EncounterToClientMapper {
  /**
   * Transforms a single EncounterEntity to EncounterDetailDto
   *
   * @param entity - EncounterEntity from database
   * @returns EncounterDetailDto for client consumption
   */
  static toDto(entity: EncounterEntity): EncounterDto {
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
   * Transforms a single EncounterEntity to EncounterDetailDto
   * (Alias for toDto for clarity)
   *
   * @param entity - EncounterEntity from database
   * @returns EncounterDetailDto for client consumption
   */
  static toDetailDto(entity: EncounterEntity): EncounterDetailDto {
    return this.toDto(entity) as EncounterDetailDto;
  }

  /**
   * Transforms a single EncounterEntity to EncounterListItemDto
   * (Optimized for list views - fewer fields)
   *
   * @param entity - EncounterEntity from database
   * @returns EncounterListItemDto for list views
   */
  static toListItem(entity: EncounterEntity): EncounterListItemDto {
    return {
      id: entity.id,
      encounterId: entity.encounterId,
      status: entity.status,
      subjectReference: entity.subjectReference,
      createdAt: entity.createdAt,
    };
  }

  /**
   * Transforms an array of EncounterEntity to EncounterListItemDto array
   *
   * @param entities - Array of EncounterEntity from database
   * @returns Array of EncounterListItemDto for list views
   */
  static toListItemList(entities: EncounterEntity[]): EncounterListItemDto[] {
    return entities.map((entity) => this.toListItem(entity));
  }

  /**
   * Transforms an array of EncounterEntity to EncounterDetailDto array
   *
   * @param entities - Array of EncounterEntity from database
   * @returns Array of EncounterDetailDto
   */
  static toDtoList(entities: EncounterEntity[]): EncounterDetailDto[] {
    return entities.map((entity) => this.toDetailDto(entity));
  }
}
