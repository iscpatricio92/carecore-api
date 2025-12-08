import {
  FHIR_RESOURCE_TYPES,
  ALL_FHIR_RESOURCE_TYPES,
  isValidFhirResourceType,
  MODULE_TO_RESOURCE_TYPE,
  type FhirResourceType,
} from './fhir-resource-types';

describe('FHIR Resource Types Constants', () => {
  describe('FHIR_RESOURCE_TYPES', () => {
    it('should have all expected resource types', () => {
      expect(FHIR_RESOURCE_TYPES.PATIENT).toBe('Patient');
      expect(FHIR_RESOURCE_TYPES.PRACTITIONER).toBe('Practitioner');
      expect(FHIR_RESOURCE_TYPES.ENCOUNTER).toBe('Encounter');
      expect(FHIR_RESOURCE_TYPES.CONSENT).toBe('Consent');
      expect(FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE).toBe('DocumentReference');
      expect(FHIR_RESOURCE_TYPES.OBSERVATION).toBe('Observation');
      expect(FHIR_RESOURCE_TYPES.CONDITION).toBe('Condition');
      expect(FHIR_RESOURCE_TYPES.MEDICATION).toBe('Medication');
      expect(FHIR_RESOURCE_TYPES.PROCEDURE).toBe('Procedure');
    });

    it('should have all resource types as strings', () => {
      Object.values(FHIR_RESOURCE_TYPES).forEach((resourceType) => {
        expect(typeof resourceType).toBe('string');
        expect(resourceType.length).toBeGreaterThan(0);
      });
    });

    it('should have resource types starting with capital letter', () => {
      Object.values(FHIR_RESOURCE_TYPES).forEach((resourceType) => {
        expect(resourceType[0]).toBe(resourceType[0].toUpperCase());
      });
    });
  });

  describe('ALL_FHIR_RESOURCE_TYPES', () => {
    it('should be an array', () => {
      expect(Array.isArray(ALL_FHIR_RESOURCE_TYPES)).toBe(true);
    });

    it('should contain all resource types', () => {
      expect(ALL_FHIR_RESOURCE_TYPES).toHaveLength(9);
      expect(ALL_FHIR_RESOURCE_TYPES).toContain(FHIR_RESOURCE_TYPES.PATIENT);
      expect(ALL_FHIR_RESOURCE_TYPES).toContain(FHIR_RESOURCE_TYPES.PRACTITIONER);
      expect(ALL_FHIR_RESOURCE_TYPES).toContain(FHIR_RESOURCE_TYPES.ENCOUNTER);
      expect(ALL_FHIR_RESOURCE_TYPES).toContain(FHIR_RESOURCE_TYPES.CONSENT);
      expect(ALL_FHIR_RESOURCE_TYPES).toContain(FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE);
      expect(ALL_FHIR_RESOURCE_TYPES).toContain(FHIR_RESOURCE_TYPES.OBSERVATION);
      expect(ALL_FHIR_RESOURCE_TYPES).toContain(FHIR_RESOURCE_TYPES.CONDITION);
      expect(ALL_FHIR_RESOURCE_TYPES).toContain(FHIR_RESOURCE_TYPES.MEDICATION);
      expect(ALL_FHIR_RESOURCE_TYPES).toContain(FHIR_RESOURCE_TYPES.PROCEDURE);
    });

    it('should be readonly array (TypeScript type check)', () => {
      // TypeScript ensures this is readonly, runtime check is not possible
      // but we can verify it's an array
      expect(Array.isArray(ALL_FHIR_RESOURCE_TYPES)).toBe(true);
    });

    it('should not have duplicates', () => {
      const uniqueTypes = new Set(ALL_FHIR_RESOURCE_TYPES);
      expect(uniqueTypes.size).toBe(ALL_FHIR_RESOURCE_TYPES.length);
    });
  });

  describe('isValidFhirResourceType', () => {
    it('should return true for valid resource types', () => {
      expect(isValidFhirResourceType('Patient')).toBe(true);
      expect(isValidFhirResourceType('Practitioner')).toBe(true);
      expect(isValidFhirResourceType('Encounter')).toBe(true);
      expect(isValidFhirResourceType('Consent')).toBe(true);
      expect(isValidFhirResourceType('DocumentReference')).toBe(true);
      expect(isValidFhirResourceType('Observation')).toBe(true);
      expect(isValidFhirResourceType('Condition')).toBe(true);
      expect(isValidFhirResourceType('Medication')).toBe(true);
      expect(isValidFhirResourceType('Procedure')).toBe(true);
    });

    it('should return false for invalid resource types', () => {
      expect(isValidFhirResourceType('InvalidResource')).toBe(false);
      expect(isValidFhirResourceType('patient')).toBe(false); // lowercase
      expect(isValidFhirResourceType('PATIENT')).toBe(false); // uppercase
      expect(isValidFhirResourceType('')).toBe(false);
      expect(isValidFhirResourceType('Patient ')).toBe(false); // trailing space
      expect(isValidFhirResourceType(' Patient')).toBe(false); // leading space
    });

    it('should return false for non-string values', () => {
      expect(isValidFhirResourceType(null as unknown as string)).toBe(false);
      expect(isValidFhirResourceType(undefined as unknown as string)).toBe(false);
      expect(isValidFhirResourceType(123 as unknown as string)).toBe(false);
      expect(isValidFhirResourceType(true as unknown as string)).toBe(false);
      expect(isValidFhirResourceType({} as unknown as string)).toBe(false);
      expect(isValidFhirResourceType([] as unknown as string)).toBe(false);
    });

    it('should work as a type guard', () => {
      const testValue: unknown = 'Patient';
      if (isValidFhirResourceType(testValue as unknown as string)) {
        // TypeScript should narrow the type here
        const resourceType: FhirResourceType = testValue as FhirResourceType;
        expect(resourceType).toBe('Patient');
      } else {
        fail('Type guard should have passed');
      }
    });

    it('should handle all resource types from constant', () => {
      ALL_FHIR_RESOURCE_TYPES.forEach((resourceType) => {
        expect(isValidFhirResourceType(resourceType)).toBe(true);
      });
    });
  });

  describe('MODULE_TO_RESOURCE_TYPE', () => {
    it('should map module names to resource types', () => {
      expect(MODULE_TO_RESOURCE_TYPE.patients).toBe(FHIR_RESOURCE_TYPES.PATIENT);
      expect(MODULE_TO_RESOURCE_TYPE.practitioners).toBe(FHIR_RESOURCE_TYPES.PRACTITIONER);
      expect(MODULE_TO_RESOURCE_TYPE.encounters).toBe(FHIR_RESOURCE_TYPES.ENCOUNTER);
      expect(MODULE_TO_RESOURCE_TYPE.consents).toBe(FHIR_RESOURCE_TYPES.CONSENT);
      expect(MODULE_TO_RESOURCE_TYPE.documents).toBe(FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE);
    });

    it('should have all mappings as valid resource types', () => {
      Object.values(MODULE_TO_RESOURCE_TYPE).forEach((resourceType) => {
        expect(isValidFhirResourceType(resourceType)).toBe(true);
      });
    });

    it('should have lowercase module names', () => {
      Object.keys(MODULE_TO_RESOURCE_TYPE).forEach((moduleName) => {
        expect(moduleName).toBe(moduleName.toLowerCase());
      });
    });

    it('should have all expected module mappings', () => {
      expect(Object.keys(MODULE_TO_RESOURCE_TYPE)).toHaveLength(5);
      expect(MODULE_TO_RESOURCE_TYPE).toHaveProperty('patients');
      expect(MODULE_TO_RESOURCE_TYPE).toHaveProperty('practitioners');
      expect(MODULE_TO_RESOURCE_TYPE).toHaveProperty('encounters');
      expect(MODULE_TO_RESOURCE_TYPE).toHaveProperty('consents');
      expect(MODULE_TO_RESOURCE_TYPE).toHaveProperty('documents');
    });

    it('should not have duplicate resource type values', () => {
      const resourceTypes = Object.values(MODULE_TO_RESOURCE_TYPE);
      const uniqueTypes = new Set(resourceTypes);
      expect(uniqueTypes.size).toBe(resourceTypes.length);
    });
  });
});
