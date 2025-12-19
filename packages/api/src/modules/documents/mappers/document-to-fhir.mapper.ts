import { DocumentReferenceEntity } from '../../../entities/document-reference.entity';
import { DocumentReference } from '@carecore/shared';

/**
 * Document to FHIR Mapper
 *
 * Pure functions for transforming DocumentReferenceEntity to FHIR DocumentReference resource.
 * These functions have no side effects and are easily testable.
 */
export class DocumentToFhirMapper {
  /**
   * Transforms a single DocumentReferenceEntity to FHIR DocumentReference resource
   *
   * @param entity - DocumentReferenceEntity from database
   * @returns FHIR DocumentReference resource
   * @throws Error if entity is missing fhirResource
   */
  static toFhir(entity: DocumentReferenceEntity): DocumentReference {
    if (!entity.fhirResource) {
      throw new Error('DocumentReference entity missing fhirResource');
    }
    return entity.fhirResource;
  }

  /**
   * Transforms an array of DocumentReferenceEntity to FHIR DocumentReference resources
   *
   * @param entities - Array of DocumentReferenceEntity from database
   * @returns Array of FHIR DocumentReference resources
   */
  static toFhirList(entities: DocumentReferenceEntity[]): DocumentReference[] {
    return entities.map((entity) => this.toFhir(entity));
  }
}
