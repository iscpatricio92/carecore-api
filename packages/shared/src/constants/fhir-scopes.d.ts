export declare const FHIR_SCOPES: {
  readonly PATIENT_READ: 'patient:read';
  readonly PATIENT_WRITE: 'patient:write';
  readonly PRACTITIONER_READ: 'practitioner:read';
  readonly PRACTITIONER_WRITE: 'practitioner:write';
  readonly ENCOUNTER_READ: 'encounter:read';
  readonly ENCOUNTER_WRITE: 'encounter:write';
  readonly DOCUMENT_READ: 'document:read';
  readonly DOCUMENT_WRITE: 'document:write';
  readonly CONSENT_READ: 'consent:read';
  readonly CONSENT_WRITE: 'consent:write';
  readonly CONSENT_SHARE: 'consent:share';
};
export type FhirScope = (typeof FHIR_SCOPES)[keyof typeof FHIR_SCOPES];
export declare const ALL_FHIR_SCOPES: readonly FhirScope[];
export declare function isValidFhirScope(scope: string): scope is FhirScope;
export declare const SCOPE_PERMISSIONS_MAP: Record<
  FhirScope,
  {
    resource: string;
    action: string;
  }
>;
//# sourceMappingURL=fhir-scopes.d.ts.map
