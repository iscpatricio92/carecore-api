/**
 * Encounter-related interfaces for optimized endpoints
 *
 * These types are shared between mobile and web applications
 * for consuming optimized encounter endpoints (/api/encounters)
 *
 * These DTOs provide simplified, lightweight representations of Encounter resources
 * extracted directly from EncounterEntity without FHIR complexity
 */

/**
 * Encounter List Item DTO
 * Lightweight representation for list views
 */
export interface EncounterListItemDto {
  /**
   * Encounter ID (database UUID)
   */
  id: string;

  /**
   * Encounter identifier (FHIR resource ID)
   */
  encounterId: string;

  /**
   * Encounter status
   */
  status: string;

  /**
   * Patient reference (e.g., Patient/123)
   */
  subjectReference: string;

  /**
   * Creation date
   */
  createdAt: Date;
}

/**
 * Encounter Detail DTO
 * Complete encounter information for detail views
 */
export interface EncounterDetailDto {
  /**
   * Encounter ID (database UUID)
   */
  id: string;

  /**
   * Encounter identifier (FHIR resource ID)
   */
  encounterId: string;

  /**
   * Encounter status
   */
  status: string;

  /**
   * Patient reference (e.g., Patient/123)
   */
  subjectReference: string;

  /**
   * Creation timestamp
   */
  createdAt: Date;

  /**
   * Last update timestamp
   */
  updatedAt: Date;

  /**
   * Complete FHIR resource (if needed)
   */
  fhirResource?: unknown;
}

/**
 * Encounters List Response
 * Response format for GET /api/encounters
 */
export interface EncountersListResponse {
  /**
   * List of encounters
   */
  data: EncounterListItemDto[];

  /**
   * Total number of encounters
   */
  total: number;
}
