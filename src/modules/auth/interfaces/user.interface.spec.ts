import { User } from './user.interface';

/**
 * Type guard to check if an object is a valid User
 */
function isValidUser(obj: unknown): obj is User {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const user = obj as Partial<User>;

  // Check required fields
  if (
    typeof user.id !== 'string' ||
    user.id.length === 0 ||
    typeof user.keycloakUserId !== 'string' ||
    user.keycloakUserId.length === 0 ||
    typeof user.username !== 'string' ||
    user.username.length === 0 ||
    !Array.isArray(user.roles)
  ) {
    return false;
  }

  // Check optional fields types if present
  if (user.email !== undefined && typeof user.email !== 'string') {
    return false;
  }

  if (user.name !== undefined && typeof user.name !== 'string') {
    return false;
  }

  if (user.givenName !== undefined && typeof user.givenName !== 'string') {
    return false;
  }

  if (user.familyName !== undefined && typeof user.familyName !== 'string') {
    return false;
  }

  if (user.scopes !== undefined && !Array.isArray(user.scopes)) {
    return false;
  }

  // Check that all roles are strings
  if (!user.roles.every((role) => typeof role === 'string')) {
    return false;
  }

  // Check that all scopes are strings if scopes array exists
  if (user.scopes && !user.scopes.every((scope) => typeof scope === 'string')) {
    return false;
  }

  return true;
}

/**
 * Factory function to create a valid User object
 */
function createUser(overrides?: Partial<User>): User {
  return {
    id: 'user-123',
    keycloakUserId: 'user-123',
    username: 'testuser',
    email: 'test@example.com',
    roles: ['patient'],
    name: 'Test User',
    givenName: 'Test',
    familyName: 'User',
    scopes: ['patient:read'],
    ...overrides,
  };
}

describe('User Interface', () => {
  describe('Type Guard - isValidUser', () => {
    it('should return true for a valid User object with all required fields', () => {
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient'],
      };

      expect(isValidUser(user)).toBe(true);
    });

    it('should return true for a User object with all optional fields', () => {
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['patient', 'user'],
        name: 'Test User',
        givenName: 'Test',
        familyName: 'User',
        scopes: ['patient:read', 'patient:write'],
      };

      expect(isValidUser(user)).toBe(true);
    });

    it('should return true for a User object with empty roles array', () => {
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: [],
      };

      expect(isValidUser(user)).toBe(true);
    });

    it('should return true for a User object with empty scopes array', () => {
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient'],
        scopes: [],
      };

      expect(isValidUser(user)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isValidUser(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isValidUser(undefined)).toBe(false);
    });

    it('should return false for a non-object value', () => {
      expect(isValidUser('string')).toBe(false);
      expect(isValidUser(123)).toBe(false);
      expect(isValidUser(true)).toBe(false);
      expect(isValidUser([])).toBe(false);
    });

    it('should return false if id is missing', () => {
      const invalidUser = {
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient'],
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if id is empty string', () => {
      const invalidUser = {
        id: '',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient'],
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if id is not a string', () => {
      const invalidUser = {
        id: 123,
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient'],
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if keycloakUserId is missing', () => {
      const invalidUser = {
        id: 'user-123',
        username: 'testuser',
        roles: ['patient'],
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if keycloakUserId is empty string', () => {
      const invalidUser = {
        id: 'user-123',
        keycloakUserId: '',
        username: 'testuser',
        roles: ['patient'],
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if keycloakUserId is not a string', () => {
      const invalidUser = {
        id: 'user-123',
        keycloakUserId: 123,
        username: 'testuser',
        roles: ['patient'],
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if username is missing', () => {
      const invalidUser = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        roles: ['patient'],
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if username is empty string', () => {
      const invalidUser = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: '',
        roles: ['patient'],
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if username is not a string', () => {
      const invalidUser = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 123,
        roles: ['patient'],
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if roles is missing', () => {
      const invalidUser = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if roles is not an array', () => {
      const invalidUser = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: 'patient',
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if roles contains non-string values', () => {
      const invalidUser = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient', 123, true],
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if email is not a string when provided', () => {
      const invalidUser = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient'],
        email: 123,
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if name is not a string when provided', () => {
      const invalidUser = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient'],
        name: 123,
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if givenName is not a string when provided', () => {
      const invalidUser = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient'],
        givenName: 123,
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if familyName is not a string when provided', () => {
      const invalidUser = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient'],
        familyName: 123,
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if scopes is not an array when provided', () => {
      const invalidUser = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient'],
        scopes: 'patient:read',
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });

    it('should return false if scopes contains non-string values', () => {
      const invalidUser = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient'],
        scopes: ['patient:read', 123, true],
      };

      expect(isValidUser(invalidUser)).toBe(false);
    });
  });

  describe('Factory Function - createUser', () => {
    it('should create a valid User object with default values', () => {
      const user = createUser();

      expect(isValidUser(user)).toBe(true);
      expect(user.id).toBe('user-123');
      expect(user.keycloakUserId).toBe('user-123');
      expect(user.username).toBe('testuser');
      expect(user.email).toBe('test@example.com');
      expect(user.roles).toEqual(['patient']);
      expect(user.name).toBe('Test User');
      expect(user.givenName).toBe('Test');
      expect(user.familyName).toBe('User');
      expect(user.scopes).toEqual(['patient:read']);
    });

    it('should create a User object with overrides', () => {
      const user = createUser({
        id: 'custom-id',
        username: 'customuser',
        roles: ['admin'],
      });

      expect(isValidUser(user)).toBe(true);
      expect(user.id).toBe('custom-id');
      expect(user.keycloakUserId).toBe('user-123'); // Not overridden
      expect(user.username).toBe('customuser');
      expect(user.roles).toEqual(['admin']);
    });

    it('should create a User object with minimal required fields', () => {
      const user = createUser({
        email: undefined,
        name: undefined,
        givenName: undefined,
        familyName: undefined,
        scopes: undefined,
      });

      expect(isValidUser(user)).toBe(true);
      expect(user.id).toBeDefined();
      expect(user.keycloakUserId).toBeDefined();
      expect(user.username).toBeDefined();
      expect(user.roles).toBeDefined();
    });

    it('should create a User object with empty roles array', () => {
      const user = createUser({
        roles: [],
      });

      expect(isValidUser(user)).toBe(true);
      expect(user.roles).toEqual([]);
    });

    it('should create a User object with empty scopes array', () => {
      const user = createUser({
        scopes: [],
      });

      expect(isValidUser(user)).toBe(true);
      expect(user.scopes).toEqual([]);
    });

    it('should create a User object with multiple roles', () => {
      const user = createUser({
        roles: ['patient', 'practitioner', 'admin'],
      });

      expect(isValidUser(user)).toBe(true);
      expect(user.roles).toEqual(['patient', 'practitioner', 'admin']);
    });

    it('should create a User object with multiple scopes', () => {
      const user = createUser({
        scopes: ['patient:read', 'patient:write', 'document:read', 'document:write'],
      });

      expect(isValidUser(user)).toBe(true);
      expect(user.scopes).toEqual([
        'patient:read',
        'patient:write',
        'document:read',
        'document:write',
      ]);
    });
  });

  describe('User Interface Structure', () => {
    it('should allow User object with only required fields', () => {
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient'],
      };

      expect(user.id).toBe('user-123');
      expect(user.keycloakUserId).toBe('user-123');
      expect(user.username).toBe('testuser');
      expect(user.roles).toEqual(['patient']);
      expect(user.email).toBeUndefined();
      expect(user.name).toBeUndefined();
      expect(user.givenName).toBeUndefined();
      expect(user.familyName).toBeUndefined();
      expect(user.scopes).toBeUndefined();
    });

    it('should allow User object with all optional fields', () => {
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['patient'],
        name: 'Test User',
        givenName: 'Test',
        familyName: 'User',
        scopes: ['patient:read'],
      };

      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.givenName).toBe('Test');
      expect(user.familyName).toBe('User');
      expect(user.scopes).toEqual(['patient:read']);
    });

    it('should allow User object with empty roles array', () => {
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: [],
      };

      expect(user.roles).toEqual([]);
    });

    it('should allow User object with empty scopes array', () => {
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient'],
        scopes: [],
      };

      expect(user.scopes).toEqual([]);
    });

    it('should allow User object with multiple roles', () => {
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient', 'practitioner', 'admin'],
      };

      expect(user.roles).toHaveLength(3);
      expect(user.roles).toContain('patient');
      expect(user.roles).toContain('practitioner');
      expect(user.roles).toContain('admin');
    });

    it('should allow User object with multiple scopes', () => {
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient'],
        scopes: ['patient:read', 'patient:write', 'document:read'],
      };

      expect(user.scopes).toHaveLength(3);
      expect(user.scopes).toContain('patient:read');
      expect(user.scopes).toContain('patient:write');
      expect(user.scopes).toContain('document:read');
    });

    it('should allow User object where id and keycloakUserId are the same', () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const user: User = {
        id: userId,
        keycloakUserId: userId,
        username: 'testuser',
        roles: ['patient'],
      };

      expect(user.id).toBe(userId);
      expect(user.keycloakUserId).toBe(userId);
      expect(user.id).toBe(user.keycloakUserId);
    });

    it('should allow User object where id and keycloakUserId are different', () => {
      const user: User = {
        id: 'internal-id-123',
        keycloakUserId: 'keycloak-uuid-456',
        username: 'testuser',
        roles: ['patient'],
      };

      expect(user.id).toBe('internal-id-123');
      expect(user.keycloakUserId).toBe('keycloak-uuid-456');
      expect(user.id).not.toBe(user.keycloakUserId);
    });

    it('should allow User object with UUID format for id', () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000';
      const user: User = {
        id: uuid,
        keycloakUserId: uuid,
        username: 'testuser',
        roles: ['patient'],
      };

      expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('should allow User object with valid email format', () => {
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['patient'],
      };

      expect(user.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    });
  });

  describe('User Interface Edge Cases', () => {
    it('should handle User object with very long username', () => {
      const longUsername = 'a'.repeat(1000);
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: longUsername,
        roles: ['patient'],
      };

      expect(user.username).toBe(longUsername);
      expect(user.username.length).toBe(1000);
    });

    it('should handle User object with very long email', () => {
      const longEmail = `${'a'.repeat(100)}@example.com`;
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        email: longEmail,
        roles: ['patient'],
      };

      expect(user.email).toBe(longEmail);
    });

    it('should handle User object with many roles', () => {
      const manyRoles = Array.from({ length: 100 }, (_, i) => `role-${i}`);
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: manyRoles,
      };

      expect(user.roles).toHaveLength(100);
      expect(user.roles[0]).toBe('role-0');
      expect(user.roles[99]).toBe('role-99');
    });

    it('should handle User object with many scopes', () => {
      const manyScopes = Array.from({ length: 50 }, (_, i) => `scope:${i}`);
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        roles: ['patient'],
        scopes: manyScopes,
      };

      expect(user.scopes).toHaveLength(50);
      expect(user.scopes?.[0]).toBe('scope:0');
      expect(user.scopes?.[49]).toBe('scope:49');
    });

    it('should handle User object with special characters in username', () => {
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'user.name_123-test',
        roles: ['patient'],
      };

      expect(user.username).toBe('user.name_123-test');
    });

    it('should handle User object with unicode characters in name fields', () => {
      const user: User = {
        id: 'user-123',
        keycloakUserId: 'user-123',
        username: 'testuser',
        name: 'José María',
        givenName: 'José',
        familyName: 'María',
        roles: ['patient'],
      };

      expect(user.name).toBe('José María');
      expect(user.givenName).toBe('José');
      expect(user.familyName).toBe('María');
    });
  });
});
