export declare const FHIR_ACTIONS: {
  readonly READ: 'read';
  readonly WRITE: 'write';
  readonly SHARE: 'share';
};
export type FhirAction = (typeof FHIR_ACTIONS)[keyof typeof FHIR_ACTIONS];
export declare const ALL_FHIR_ACTIONS: readonly FhirAction[];
export declare function isValidFhirAction(action: string): action is FhirAction;
//# sourceMappingURL=fhir-actions.d.ts.map
