import { EncounterEntity } from '../../../entities/encounter.entity';
import { Encounter } from '@carecore/shared';

/**
 * Encounter to FHIR Mapper
 *
 * Pure functions for transforming EncounterEntity to FHIR Encounter resource.
 * These functions have no side effects and are easily testable.
 */
export class EncounterToFhirMapper {
  /**
   * Transforms a single EncounterEntity to FHIR Encounter resource
   *
   * @param entity - EncounterEntity from database
   * @returns FHIR Encounter resource
   * @throws Error if entity is missing fhirResource
   */
  static toFhir(entity: EncounterEntity): Encounter {
    if (!entity.fhirResource) {
      throw new Error('Encounter entity missing fhirResource');
    }
    return entity.fhirResource;
  }

  /**
   * Transforms an array of EncounterEntity to FHIR Encounter resources
   *
   * @param entities - Array of EncounterEntity from database
   * @returns Array of FHIR Encounter resources
   */
  static toFhirList(entities: EncounterEntity[]): Encounter[] {
    return entities.map((entity) => this.toFhir(entity));
  }
}
