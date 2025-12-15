/**
 * Role Constants
 *
 * Defines all available roles in the CareCore system.
 * These roles are defined in Keycloak and extracted from JWT tokens.
 *
 * @see {@link https://www.keycloak.org/docs/latest/securing_apps/#_token_claims Keycloak Token Claims}
 * @see {@link ../../../keycloak/ROLES.md ROLES.md} for detailed role descriptions
 */

/**
 * System Roles
 *
 * These roles define the permissions and access levels for different types of users.
 * Roles are assigned in Keycloak and included in JWT tokens via `realm_access.roles`.
 */
export const ROLES = {
  /**
   * Patient role - Usuario paciente, dueño de su información médica
   * Can read own data, give consent, revoke consent, share and export data
   */
  PATIENT: 'patient',

  /**
   * Practitioner role - Profesional médico certificado
   * Can create and update clinical records, read data of assigned patients
   * Requires identity verification (professional license)
   */
  PRACTITIONER: 'practitioner',

  /**
   * Viewer role - Acceso temporal de solo lectura
   * Can read patient data with explicit consent
   */
  VIEWER: 'viewer',

  /**
   * Lab role - Sistema de laboratorio
   * Can create lab results, read lab-related data
   */
  LAB: 'lab',

  /**
   * Insurer role - Sistema de aseguradora
   * Can read patient data with explicit consent for insurance purposes
   */
  INSURER: 'insurer',

  /**
   * System role - Sistema externo
   * Used for system-to-system integrations
   */
  SYSTEM: 'system',

  /**
   * Admin role - Administrador
   * Full access to all system functions
   */
  ADMIN: 'admin',

  /**
   * Audit role - Auditoría
   * Can access audit logs and compliance data
   */
  AUDIT: 'audit',
} as const;

/**
 * Type for role values
 */
export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * Array of all role values
 * Useful for validation and iteration
 */
export const ALL_ROLES: readonly Role[] = Object.values(ROLES);

/**
 * Check if a string is a valid role
 * @param role - String to check
 * @returns true if the string is a valid role
 */
export function isValidRole(role: string): role is Role {
  return ALL_ROLES.includes(role as Role);
}
