/**
 * FHIR Resource Type Constants
 *
 * Defines all FHIR resource types supported in the CareCore system.
 * These constants ensure type safety and prevent typos when working with FHIR resources.
 *
 * @see {@link https://www.hl7.org/fhir/resourcelist.html FHIR Resource List}
 */

/**
 * FHIR Resource Types
 *
 * These constants represent the resource types defined in FHIR R4 specification.
 * Use these constants instead of string literals to ensure type safety and consistency.
 */
export const FHIR_RESOURCE_TYPES = {
  /**
   * Patient Resource
   * Demographics and other administrative information about a person receiving care
   * @see https://www.hl7.org/fhir/patient.html
   */
  PATIENT: 'Patient',

  /**
   * Practitioner Resource
   * A person who is directly or indirectly involved in the provisioning of healthcare
   * @see https://www.hl7.org/fhir/practitioner.html
   */
  PRACTITIONER: 'Practitioner',

  /**
   * Encounter Resource
   * An interaction between a patient and healthcare provider(s) for the purpose of providing healthcare service(s)
   * @see https://www.hl7.org/fhir/encounter.html
   */
  ENCOUNTER: 'Encounter',

  /**
   * Consent Resource
   * A record of a healthcare consumer's choices or choices made on their behalf
   * @see https://www.hl7.org/fhir/consent.html
   */
  CONSENT: 'Consent',

  /**
   * DocumentReference Resource
   * A reference to a document of any kind for any purpose
   * @see https://www.hl7.org/fhir/documentreference.html
   */
  DOCUMENT_REFERENCE: 'DocumentReference',

  /**
   * Observation Resource
   * Measurements and simple assertions made about a patient, device or other subject
   * @see https://www.hl7.org/fhir/observation.html
   */
  OBSERVATION: 'Observation',

  /**
   * Condition Resource
   * A clinical condition, problem, diagnosis, or other event, situation, issue, or clinical concept
   * @see https://www.hl7.org/fhir/condition.html
   */
  CONDITION: 'Condition',

  /**
   * Medication Resource
   * Information about a medication that is used to support knowledge about medications
   * @see https://www.hl7.org/fhir/medication.html
   */
  MEDICATION: 'Medication',

  /**
   * Procedure Resource
   * An action that is or was performed on or for a patient
   * @see https://www.hl7.org/fhir/procedure.html
   */
  PROCEDURE: 'Procedure',
} as const;

/**
 * Type for FHIR resource type values
 */
export type FhirResourceType = (typeof FHIR_RESOURCE_TYPES)[keyof typeof FHIR_RESOURCE_TYPES];

/**
 * Array of all FHIR resource type values
 * Useful for validation and iteration
 */
export const ALL_FHIR_RESOURCE_TYPES: readonly FhirResourceType[] =
  Object.values(FHIR_RESOURCE_TYPES);

/**
 * Check if a string is a valid FHIR resource type
 * @param resourceType - String to check
 * @returns true if the string is a valid FHIR resource type
 */
export function isValidFhirResourceType(resourceType: string): resourceType is FhirResourceType {
  return ALL_FHIR_RESOURCE_TYPES.includes(resourceType as FhirResourceType);
}

/**
 * Map from module/endpoint names to FHIR resource types
 * Used for URL parsing and routing
 */
export const MODULE_TO_RESOURCE_TYPE: Record<string, FhirResourceType> = {
  patients: FHIR_RESOURCE_TYPES.PATIENT,
  practitioners: FHIR_RESOURCE_TYPES.PRACTITIONER,
  encounters: FHIR_RESOURCE_TYPES.ENCOUNTER,
  consents: FHIR_RESOURCE_TYPES.CONSENT,
  documents: FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
} as const;
