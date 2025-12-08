import {
  FHIR_SCOPES,
  ALL_FHIR_SCOPES,
  isValidFhirScope,
  SCOPE_PERMISSIONS_MAP,
  type FhirScope,
} from './fhir-scopes';
import { FHIR_RESOURCE_TYPES } from './fhir-resource-types';
import { FHIR_ACTIONS } from './fhir-actions';

describe('FHIR Scopes Constants', () => {
  describe('FHIR_SCOPES', () => {
    it('should have all expected patient scopes', () => {
      expect(FHIR_SCOPES.PATIENT_READ).toBe('patient:read');
      expect(FHIR_SCOPES.PATIENT_WRITE).toBe('patient:write');
    });

    it('should have all expected practitioner scopes', () => {
      expect(FHIR_SCOPES.PRACTITIONER_READ).toBe('practitioner:read');
      expect(FHIR_SCOPES.PRACTITIONER_WRITE).toBe('practitioner:write');
    });

    it('should have all expected encounter scopes', () => {
      expect(FHIR_SCOPES.ENCOUNTER_READ).toBe('encounter:read');
      expect(FHIR_SCOPES.ENCOUNTER_WRITE).toBe('encounter:write');
    });

    it('should have all expected document scopes', () => {
      expect(FHIR_SCOPES.DOCUMENT_READ).toBe('document:read');
      expect(FHIR_SCOPES.DOCUMENT_WRITE).toBe('document:write');
    });

    it('should have all expected consent scopes', () => {
      expect(FHIR_SCOPES.CONSENT_READ).toBe('consent:read');
      expect(FHIR_SCOPES.CONSENT_WRITE).toBe('consent:write');
      expect(FHIR_SCOPES.CONSENT_SHARE).toBe('consent:share');
    });

    it('should have all scopes as strings', () => {
      Object.values(FHIR_SCOPES).forEach((scope) => {
        expect(typeof scope).toBe('string');
        expect(scope.length).toBeGreaterThan(0);
      });
    });

    it('should have scopes in format "resource:action"', () => {
      Object.values(FHIR_SCOPES).forEach((scope) => {
        expect(scope).toMatch(/^[a-z]+:[a-z]+$/);
        const [resource, action] = scope.split(':');
        expect(resource).toBeDefined();
        expect(action).toBeDefined();
      });
    });
  });

  describe('ALL_FHIR_SCOPES', () => {
    it('should be an array', () => {
      expect(Array.isArray(ALL_FHIR_SCOPES)).toBe(true);
    });

    it('should contain all scopes', () => {
      expect(ALL_FHIR_SCOPES).toHaveLength(11);
      expect(ALL_FHIR_SCOPES).toContain(FHIR_SCOPES.PATIENT_READ);
      expect(ALL_FHIR_SCOPES).toContain(FHIR_SCOPES.PATIENT_WRITE);
      expect(ALL_FHIR_SCOPES).toContain(FHIR_SCOPES.PRACTITIONER_READ);
      expect(ALL_FHIR_SCOPES).toContain(FHIR_SCOPES.PRACTITIONER_WRITE);
      expect(ALL_FHIR_SCOPES).toContain(FHIR_SCOPES.ENCOUNTER_READ);
      expect(ALL_FHIR_SCOPES).toContain(FHIR_SCOPES.ENCOUNTER_WRITE);
      expect(ALL_FHIR_SCOPES).toContain(FHIR_SCOPES.DOCUMENT_READ);
      expect(ALL_FHIR_SCOPES).toContain(FHIR_SCOPES.DOCUMENT_WRITE);
      expect(ALL_FHIR_SCOPES).toContain(FHIR_SCOPES.CONSENT_READ);
      expect(ALL_FHIR_SCOPES).toContain(FHIR_SCOPES.CONSENT_WRITE);
      expect(ALL_FHIR_SCOPES).toContain(FHIR_SCOPES.CONSENT_SHARE);
    });

    it('should be readonly array (TypeScript type check)', () => {
      // TypeScript ensures this is readonly, runtime check is not possible
      // but we can verify it's an array
      expect(Array.isArray(ALL_FHIR_SCOPES)).toBe(true);
    });

    it('should not have duplicates', () => {
      const uniqueScopes = new Set(ALL_FHIR_SCOPES);
      expect(uniqueScopes.size).toBe(ALL_FHIR_SCOPES.length);
    });
  });

  describe('isValidFhirScope', () => {
    it('should return true for valid scopes', () => {
      expect(isValidFhirScope('patient:read')).toBe(true);
      expect(isValidFhirScope('patient:write')).toBe(true);
      expect(isValidFhirScope('practitioner:read')).toBe(true);
      expect(isValidFhirScope('practitioner:write')).toBe(true);
      expect(isValidFhirScope('encounter:read')).toBe(true);
      expect(isValidFhirScope('encounter:write')).toBe(true);
      expect(isValidFhirScope('document:read')).toBe(true);
      expect(isValidFhirScope('document:write')).toBe(true);
      expect(isValidFhirScope('consent:read')).toBe(true);
      expect(isValidFhirScope('consent:write')).toBe(true);
      expect(isValidFhirScope('consent:share')).toBe(true);
    });

    it('should return false for invalid scopes', () => {
      expect(isValidFhirScope('Patient:read')).toBe(false); // uppercase
      expect(isValidFhirScope('patient:Read')).toBe(false); // uppercase action
      expect(isValidFhirScope('patient:delete')).toBe(false); // invalid action
      expect(isValidFhirScope('invalid:read')).toBe(false); // invalid resource
      expect(isValidFhirScope('patient')).toBe(false); // missing action
      expect(isValidFhirScope(':read')).toBe(false); // missing resource
      expect(isValidFhirScope('patient:')).toBe(false); // missing action
      expect(isValidFhirScope('')).toBe(false);
      expect(isValidFhirScope('patient:read ')).toBe(false); // trailing space
      expect(isValidFhirScope(' patient:read')).toBe(false); // leading space
    });

    it('should return false for non-string values', () => {
      expect(isValidFhirScope(null as unknown as string)).toBe(false);
      expect(isValidFhirScope(undefined as unknown as string)).toBe(false);
      expect(isValidFhirScope(123 as unknown as string)).toBe(false);
      expect(isValidFhirScope(true as unknown as string)).toBe(false);
      expect(isValidFhirScope({} as unknown as string)).toBe(false);
      expect(isValidFhirScope([] as unknown as string)).toBe(false);
    });

    it('should work as a type guard', () => {
      const testValue: unknown = 'patient:read';
      if (isValidFhirScope(testValue as unknown as string)) {
        // TypeScript should narrow the type here
        const scope: FhirScope = testValue as FhirScope;
        expect(scope).toBe('patient:read');
      } else {
        fail('Type guard should have passed');
      }
    });

    it('should handle all scopes from constant', () => {
      ALL_FHIR_SCOPES.forEach((scope) => {
        expect(isValidFhirScope(scope)).toBe(true);
      });
    });
  });

  describe('SCOPE_PERMISSIONS_MAP', () => {
    it('should map all scopes to permissions', () => {
      expect(SCOPE_PERMISSIONS_MAP).toHaveProperty(FHIR_SCOPES.PATIENT_READ);
      expect(SCOPE_PERMISSIONS_MAP).toHaveProperty(FHIR_SCOPES.PATIENT_WRITE);
      expect(SCOPE_PERMISSIONS_MAP).toHaveProperty(FHIR_SCOPES.PRACTITIONER_READ);
      expect(SCOPE_PERMISSIONS_MAP).toHaveProperty(FHIR_SCOPES.PRACTITIONER_WRITE);
      expect(SCOPE_PERMISSIONS_MAP).toHaveProperty(FHIR_SCOPES.ENCOUNTER_READ);
      expect(SCOPE_PERMISSIONS_MAP).toHaveProperty(FHIR_SCOPES.ENCOUNTER_WRITE);
      expect(SCOPE_PERMISSIONS_MAP).toHaveProperty(FHIR_SCOPES.DOCUMENT_READ);
      expect(SCOPE_PERMISSIONS_MAP).toHaveProperty(FHIR_SCOPES.DOCUMENT_WRITE);
      expect(SCOPE_PERMISSIONS_MAP).toHaveProperty(FHIR_SCOPES.CONSENT_READ);
      expect(SCOPE_PERMISSIONS_MAP).toHaveProperty(FHIR_SCOPES.CONSENT_WRITE);
      expect(SCOPE_PERMISSIONS_MAP).toHaveProperty(FHIR_SCOPES.CONSENT_SHARE);
    });

    it('should map patient scopes correctly', () => {
      expect(SCOPE_PERMISSIONS_MAP[FHIR_SCOPES.PATIENT_READ]).toEqual({
        resource: FHIR_RESOURCE_TYPES.PATIENT,
        action: FHIR_ACTIONS.READ,
      });
      expect(SCOPE_PERMISSIONS_MAP[FHIR_SCOPES.PATIENT_WRITE]).toEqual({
        resource: FHIR_RESOURCE_TYPES.PATIENT,
        action: FHIR_ACTIONS.WRITE,
      });
    });

    it('should map practitioner scopes correctly', () => {
      expect(SCOPE_PERMISSIONS_MAP[FHIR_SCOPES.PRACTITIONER_READ]).toEqual({
        resource: FHIR_RESOURCE_TYPES.PRACTITIONER,
        action: FHIR_ACTIONS.READ,
      });
      expect(SCOPE_PERMISSIONS_MAP[FHIR_SCOPES.PRACTITIONER_WRITE]).toEqual({
        resource: FHIR_RESOURCE_TYPES.PRACTITIONER,
        action: FHIR_ACTIONS.WRITE,
      });
    });

    it('should map encounter scopes correctly', () => {
      expect(SCOPE_PERMISSIONS_MAP[FHIR_SCOPES.ENCOUNTER_READ]).toEqual({
        resource: FHIR_RESOURCE_TYPES.ENCOUNTER,
        action: FHIR_ACTIONS.READ,
      });
      expect(SCOPE_PERMISSIONS_MAP[FHIR_SCOPES.ENCOUNTER_WRITE]).toEqual({
        resource: FHIR_RESOURCE_TYPES.ENCOUNTER,
        action: FHIR_ACTIONS.WRITE,
      });
    });

    it('should map document scopes correctly', () => {
      expect(SCOPE_PERMISSIONS_MAP[FHIR_SCOPES.DOCUMENT_READ]).toEqual({
        resource: FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
        action: FHIR_ACTIONS.READ,
      });
      expect(SCOPE_PERMISSIONS_MAP[FHIR_SCOPES.DOCUMENT_WRITE]).toEqual({
        resource: FHIR_RESOURCE_TYPES.DOCUMENT_REFERENCE,
        action: FHIR_ACTIONS.WRITE,
      });
    });

    it('should map consent scopes correctly', () => {
      expect(SCOPE_PERMISSIONS_MAP[FHIR_SCOPES.CONSENT_READ]).toEqual({
        resource: FHIR_RESOURCE_TYPES.CONSENT,
        action: FHIR_ACTIONS.READ,
      });
      expect(SCOPE_PERMISSIONS_MAP[FHIR_SCOPES.CONSENT_WRITE]).toEqual({
        resource: FHIR_RESOURCE_TYPES.CONSENT,
        action: FHIR_ACTIONS.WRITE,
      });
      expect(SCOPE_PERMISSIONS_MAP[FHIR_SCOPES.CONSENT_SHARE]).toEqual({
        resource: FHIR_RESOURCE_TYPES.CONSENT,
        action: FHIR_ACTIONS.SHARE,
      });
    });

    it('should have all permissions with valid resource types', () => {
      Object.values(SCOPE_PERMISSIONS_MAP).forEach((permission) => {
        expect(permission).toHaveProperty('resource');
        expect(permission).toHaveProperty('action');
        expect(typeof permission.resource).toBe('string');
        expect(typeof permission.action).toBe('string');
      });
    });

    it('should have all permissions with valid actions', () => {
      Object.values(SCOPE_PERMISSIONS_MAP).forEach((permission) => {
        expect([FHIR_ACTIONS.READ, FHIR_ACTIONS.WRITE, FHIR_ACTIONS.SHARE]).toContain(
          permission.action,
        );
      });
    });

    it('should have one entry for each scope', () => {
      expect(Object.keys(SCOPE_PERMISSIONS_MAP).length).toBe(ALL_FHIR_SCOPES.length);
    });
  });
});
