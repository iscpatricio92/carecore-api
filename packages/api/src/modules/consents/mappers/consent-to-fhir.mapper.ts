import { ConsentEntity } from '../../../entities/consent.entity';
import { Consent } from '@carecore/shared';

/**
 * Consent to FHIR Mapper
 *
 * Pure functions for transforming ConsentEntity to FHIR Consent resource.
 * These functions have no side effects and are easily testable.
 */
export class ConsentToFhirMapper {
  /**
   * Transforms a single ConsentEntity to FHIR Consent resource
   *
   * @param entity - ConsentEntity from database
   * @returns FHIR Consent resource
   * @throws Error if entity is missing fhirResource
   */
  static toFhir(entity: ConsentEntity): Consent {
    if (!entity.fhirResource) {
      throw new Error('Consent entity missing fhirResource');
    }
    return entity.fhirResource;
  }

  /**
   * Transforms an array of ConsentEntity to FHIR Consent resources
   *
   * @param entities - Array of ConsentEntity from database
   * @returns Array of FHIR Consent resources
   */
  static toFhirList(entities: ConsentEntity[]): Consent[] {
    return entities.map((entity) => this.toFhir(entity));
  }
}
