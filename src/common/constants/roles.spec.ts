import { ROLES, ALL_ROLES, isValidRole, type Role } from './roles';

describe('Roles Constants', () => {
  describe('ROLES', () => {
    it('should have all expected roles', () => {
      expect(ROLES.PATIENT).toBe('patient');
      expect(ROLES.PRACTITIONER).toBe('practitioner');
      expect(ROLES.VIEWER).toBe('viewer');
      expect(ROLES.LAB).toBe('lab');
      expect(ROLES.INSURER).toBe('insurer');
      expect(ROLES.SYSTEM).toBe('system');
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.AUDIT).toBe('audit');
    });

    it('should have all roles as strings', () => {
      Object.values(ROLES).forEach((role) => {
        expect(typeof role).toBe('string');
        expect(role.length).toBeGreaterThan(0);
      });
    });

    it('should have roles in lowercase', () => {
      Object.values(ROLES).forEach((role) => {
        expect(role).toBe(role.toLowerCase());
      });
    });
  });

  describe('ALL_ROLES', () => {
    it('should be an array', () => {
      expect(Array.isArray(ALL_ROLES)).toBe(true);
    });

    it('should contain all roles', () => {
      expect(ALL_ROLES).toHaveLength(8);
      expect(ALL_ROLES).toContain(ROLES.PATIENT);
      expect(ALL_ROLES).toContain(ROLES.PRACTITIONER);
      expect(ALL_ROLES).toContain(ROLES.VIEWER);
      expect(ALL_ROLES).toContain(ROLES.LAB);
      expect(ALL_ROLES).toContain(ROLES.INSURER);
      expect(ALL_ROLES).toContain(ROLES.SYSTEM);
      expect(ALL_ROLES).toContain(ROLES.ADMIN);
      expect(ALL_ROLES).toContain(ROLES.AUDIT);
    });

    it('should be readonly array (TypeScript type check)', () => {
      // TypeScript ensures this is readonly, runtime check is not possible
      // but we can verify it's an array
      expect(Array.isArray(ALL_ROLES)).toBe(true);
    });

    it('should not have duplicates', () => {
      const uniqueRoles = new Set(ALL_ROLES);
      expect(uniqueRoles.size).toBe(ALL_ROLES.length);
    });
  });

  describe('isValidRole', () => {
    it('should return true for valid roles', () => {
      expect(isValidRole('patient')).toBe(true);
      expect(isValidRole('practitioner')).toBe(true);
      expect(isValidRole('viewer')).toBe(true);
      expect(isValidRole('lab')).toBe(true);
      expect(isValidRole('insurer')).toBe(true);
      expect(isValidRole('system')).toBe(true);
      expect(isValidRole('admin')).toBe(true);
      expect(isValidRole('audit')).toBe(true);
    });

    it('should return false for invalid roles', () => {
      expect(isValidRole('Patient')).toBe(false); // uppercase
      expect(isValidRole('PATIENT')).toBe(false); // all uppercase
      expect(isValidRole('user')).toBe(false);
      expect(isValidRole('guest')).toBe(false);
      expect(isValidRole('')).toBe(false);
      expect(isValidRole('patient ')).toBe(false); // trailing space
      expect(isValidRole(' patient')).toBe(false); // leading space
    });

    it('should return false for non-string values', () => {
      expect(isValidRole(null as unknown as string)).toBe(false);
      expect(isValidRole(undefined as unknown as string)).toBe(false);
      expect(isValidRole(123 as unknown as string)).toBe(false);
      expect(isValidRole(true as unknown as string)).toBe(false);
      expect(isValidRole({} as unknown as string)).toBe(false);
      expect(isValidRole([] as unknown as string)).toBe(false);
    });

    it('should work as a type guard', () => {
      const testValue: unknown = 'patient';
      if (isValidRole(testValue as unknown as string)) {
        // TypeScript should narrow the type here
        const role: Role = testValue as Role;
        expect(role).toBe('patient');
      } else {
        fail('Type guard should have passed');
      }
    });

    it('should handle all roles from constant', () => {
      ALL_ROLES.forEach((role) => {
        expect(isValidRole(role)).toBe(true);
      });
    });
  });
});
