import * as jwt from 'jsonwebtoken';

/**
 * JWT Helper for E2E Tests
 * Generates mock JWT tokens for testing purposes
 * Uses HS256 algorithm to match MockJwtStrategy
 *
 * SECURITY NOTE: All secrets and tokens generated here are for TESTING ONLY.
 * These should NEVER be used in production environments.
 */

/**
 * Test-only secret key for signing JWT tokens
 * WARNING: This is a test secret and should NEVER be used in production
 */
const MOCK_SECRET = 'test-secret-key-for-e2e-tests-only';

/**
 * Test-only issuer URL
 * WARNING: This is a test URL and should NEVER be used in production
 */
const MOCK_ISSUER = 'http://localhost:8080/realms/carecore';

/**
 * Generate a mock JWT token for testing
 * @param payload - Token payload (user info, roles, etc.)
 * @param expiresIn - Token expiration time (default: 1 hour)
 * @returns Mock JWT token
 */
export function generateMockToken(
  payload: {
    sub: string;
    preferred_username: string;
    email?: string;
    realm_access?: { roles: string[] };
    name?: string;
    given_name?: string;
    family_name?: string;
  },
  expiresIn: string = '1h',
): string {
  const tokenPayload = {
    ...payload,
    iss: MOCK_ISSUER, // Add issuer claim
    aud: 'carecore-api', // Add audience claim
    iat: Math.floor(Date.now() / 1000), // Issued at
  };

  const signOptions: jwt.SignOptions = {
    expiresIn: expiresIn as unknown as number,
    algorithm: 'HS256', // Use HS256 for test tokens
  };

  return jwt.sign(tokenPayload, MOCK_SECRET, signOptions);
}

/**
 * Generate a mock token for a patient user
 */
export function generatePatientToken(userId: string = 'patient-user-123'): string {
  return generateMockToken({
    sub: userId,
    preferred_username: 'testpatient',
    email: 'patient@test.com',
    realm_access: {
      roles: ['patient'],
    },
    name: 'Test Patient',
    given_name: 'Test',
    family_name: 'Patient',
  });
}

/**
 * Generate a mock token for a practitioner user
 */
export function generatePractitionerToken(userId: string = 'practitioner-user-456'): string {
  return generateMockToken({
    sub: userId,
    preferred_username: 'testpractitioner',
    email: 'practitioner@test.com',
    realm_access: {
      roles: ['practitioner'],
    },
    name: 'Dr. Test Practitioner',
    given_name: 'Test',
    family_name: 'Practitioner',
  });
}

/**
 * Generate a mock token for an admin user
 */
export function generateAdminToken(userId: string = 'admin-user-789'): string {
  return generateMockToken({
    sub: userId,
    preferred_username: 'testadmin',
    email: 'admin@test.com',
    realm_access: {
      roles: ['admin'],
    },
    name: 'Test Admin',
    given_name: 'Test',
    family_name: 'Admin',
  });
}

/**
 * Generate a mock token with custom roles
 */
export function generateTokenWithRoles(
  userId: string,
  roles: string[],
  username: string = 'testuser',
): string {
  return generateMockToken({
    sub: userId,
    preferred_username: username,
    email: `${username}@test.com`,
    realm_access: {
      roles,
    },
    name: `Test ${roles.join(', ')}`,
  });
}
