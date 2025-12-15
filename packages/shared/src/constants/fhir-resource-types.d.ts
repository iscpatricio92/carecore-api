export declare const FHIR_RESOURCE_TYPES: {
  readonly PATIENT: 'Patient';
  readonly PRACTITIONER: 'Practitioner';
  readonly ENCOUNTER: 'Encounter';
  readonly CONSENT: 'Consent';
  readonly DOCUMENT_REFERENCE: 'DocumentReference';
  readonly OBSERVATION: 'Observation';
  readonly CONDITION: 'Condition';
  readonly MEDICATION: 'Medication';
  readonly PROCEDURE: 'Procedure';
};
export type FhirResourceType = (typeof FHIR_RESOURCE_TYPES)[keyof typeof FHIR_RESOURCE_TYPES];
export declare const ALL_FHIR_RESOURCE_TYPES: readonly FhirResourceType[];
export declare function isValidFhirResourceType(
  resourceType: string,
): resourceType is FhirResourceType;
export declare const MODULE_TO_RESOURCE_TYPE: Record<string, FhirResourceType>;
//# sourceMappingURL=fhir-resource-types.d.ts.map
