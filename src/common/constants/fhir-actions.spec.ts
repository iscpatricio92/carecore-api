import { FHIR_ACTIONS, ALL_FHIR_ACTIONS, isValidFhirAction, type FhirAction } from './fhir-actions';

describe('FHIR Actions Constants', () => {
  describe('FHIR_ACTIONS', () => {
    it('should have all expected actions', () => {
      expect(FHIR_ACTIONS.READ).toBe('read');
      expect(FHIR_ACTIONS.WRITE).toBe('write');
      expect(FHIR_ACTIONS.SHARE).toBe('share');
    });

    it('should have all actions as strings', () => {
      Object.values(FHIR_ACTIONS).forEach((action) => {
        expect(typeof action).toBe('string');
        expect(action.length).toBeGreaterThan(0);
      });
    });

    it('should have actions in lowercase', () => {
      Object.values(FHIR_ACTIONS).forEach((action) => {
        expect(action).toBe(action.toLowerCase());
      });
    });
  });

  describe('ALL_FHIR_ACTIONS', () => {
    it('should be an array', () => {
      expect(Array.isArray(ALL_FHIR_ACTIONS)).toBe(true);
    });

    it('should contain all actions', () => {
      expect(ALL_FHIR_ACTIONS).toHaveLength(3);
      expect(ALL_FHIR_ACTIONS).toContain(FHIR_ACTIONS.READ);
      expect(ALL_FHIR_ACTIONS).toContain(FHIR_ACTIONS.WRITE);
      expect(ALL_FHIR_ACTIONS).toContain(FHIR_ACTIONS.SHARE);
    });

    it('should be readonly array (TypeScript type check)', () => {
      // TypeScript ensures this is readonly, runtime check is not possible
      // but we can verify it's an array
      expect(Array.isArray(ALL_FHIR_ACTIONS)).toBe(true);
    });

    it('should not have duplicates', () => {
      const uniqueActions = new Set(ALL_FHIR_ACTIONS);
      expect(uniqueActions.size).toBe(ALL_FHIR_ACTIONS.length);
    });
  });

  describe('isValidFhirAction', () => {
    it('should return true for valid actions', () => {
      expect(isValidFhirAction('read')).toBe(true);
      expect(isValidFhirAction('write')).toBe(true);
      expect(isValidFhirAction('share')).toBe(true);
    });

    it('should return false for invalid actions', () => {
      expect(isValidFhirAction('Read')).toBe(false); // uppercase
      expect(isValidFhirAction('READ')).toBe(false); // all uppercase
      expect(isValidFhirAction('delete')).toBe(false);
      expect(isValidFhirAction('update')).toBe(false);
      expect(isValidFhirAction('create')).toBe(false);
      expect(isValidFhirAction('')).toBe(false);
      expect(isValidFhirAction('read ')).toBe(false); // trailing space
      expect(isValidFhirAction(' read')).toBe(false); // leading space
    });

    it('should return false for non-string values', () => {
      expect(isValidFhirAction(null as unknown as string)).toBe(false);
      expect(isValidFhirAction(undefined as unknown as string)).toBe(false);
      expect(isValidFhirAction(123 as unknown as string)).toBe(false);
      expect(isValidFhirAction(true as unknown as string)).toBe(false);
      expect(isValidFhirAction({} as unknown as string)).toBe(false);
      expect(isValidFhirAction([] as unknown as string)).toBe(false);
    });

    it('should work as a type guard', () => {
      const testValue: unknown = 'read';
      if (isValidFhirAction(testValue as unknown as string)) {
        // TypeScript should narrow the type here
        const action: FhirAction = testValue as FhirAction;
        expect(action).toBe('read');
      } else {
        fail('Type guard should have passed');
      }
    });

    it('should handle all actions from constant', () => {
      ALL_FHIR_ACTIONS.forEach((action) => {
        expect(isValidFhirAction(action)).toBe(true);
      });
    });
  });
});
