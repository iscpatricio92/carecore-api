/**
 * User interface extracted from JWT token
 *
 * This interface represents the user information extracted from a Keycloak JWT token.
 * The fields are mapped from standard JWT claims and Keycloak-specific claims.
 */
export interface User {
  /**
   * User ID (subject claim from JWT)
   * Maps to Keycloak user ID (UUID format)
   */
  id: string;

  /**
   * Username (preferred_username claim from JWT)
   * The username used for login
   */
  username: string;

  /**
   * Email address (email claim from JWT)
   * User's email address
   */
  email?: string;

  /**
   * Roles assigned to the user
   * Extracted from realm_access.roles in the JWT token
   */
  roles: string[];

  /**
   * Full name (name claim from JWT)
   * User's full name if available
   */
  name?: string;

  /**
   * Given name (given_name claim from JWT)
   * User's first name
   */
  givenName?: string;

  /**
   * Family name (family_name claim from JWT)
   * User's last name
   */
  familyName?: string;
}
