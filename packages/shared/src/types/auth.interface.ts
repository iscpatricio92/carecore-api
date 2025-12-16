/**
 * Authentication-related interfaces
 *
 * These types are shared between mobile and web applications
 * as they represent standard OAuth2/OIDC token responses and registration payloads
 */

/**
 * OAuth2/OIDC Token Response
 *
 * Standard format for OAuth2 token responses from Keycloak or other OAuth2 providers.
 * Used by both mobile and web applications.
 */
export interface TokensResponse {
  /**
   * Access token (JWT) for authenticating API requests
   */
  access_token: string;

  /**
   * Token expiration time in seconds
   */
  expires_in: number;

  /**
   * Refresh token for obtaining new access tokens
   */
  refresh_token: string;

  /**
   * Token type (typically "Bearer")
   */
  token_type: string;

  /**
   * ID token (JWT) containing user identity information (optional)
   */
  id_token?: string;

  /**
   * User information extracted from the token (optional)
   * This is a convenience field that may be populated by the client
   */
  user_info?: {
    /**
     * Subject (user ID) from the JWT
     */
    sub: string;

    /**
     * User roles from the JWT
     */
    roles: string[];
  };
}

/**
 * Patient Registration Payload
 *
 * Structure for patient registration requests.
 * This matches the RegisterPatientDto structure from the API but without NestJS validation decorators.
 *
 * Used by both mobile and web applications when registering new patients.
 */
export interface PatientRegisterPayload {
  /**
   * Username for authentication (must be unique)
   */
  username: string;

  /**
   * Email address (must be unique)
   */
  email: string;

  /**
   * Password (minimum 8 characters)
   */
  password: string;

  /**
   * Patient names (at least one name is required)
   */
  name: Array<{
    use?: 'usual' | 'official' | 'temp' | 'nickname' | 'anonymous' | 'old' | 'maiden';
    family?: string;
    given?: string[];
    prefix?: string[];
    suffix?: string[];
  }>;

  /**
   * Patient identifiers (SSN, medical record number, etc.)
   */
  identifier?: Array<{
    use?: 'usual' | 'official' | 'temp' | 'secondary';
    system?: string;
    value?: string;
  }>;

  /**
   * Contact information (phone, email, etc.)
   */
  telecom?: Array<{
    system?: 'phone' | 'fax' | 'email' | 'pager' | 'url' | 'sms' | 'other';
    value?: string;
    use?: 'home' | 'work' | 'temp' | 'old' | 'mobile';
  }>;

  /**
   * Administrative gender of the patient
   */
  gender?: 'male' | 'female' | 'other' | 'unknown';

  /**
   * Date of birth (YYYY-MM-DD format)
   */
  birthDate?: string;

  /**
   * Patient addresses (home, work, etc.)
   */
  address?: Array<{
    use?: 'home' | 'work' | 'temp' | 'old' | 'billing';
    type?: 'postal' | 'physical' | 'both';
    line?: string[];
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }>;

  /**
   * Whether this patient record is in active use
   */
  active?: boolean;
}

/**
 * Patient Registration Response
 *
 * Response from the registration endpoint.
 * Note: The registration endpoint does NOT return tokens.
 * The client must call the login endpoint after successful registration to obtain tokens.
 */
export interface PatientRegisterResponse {
  /**
   * Keycloak user ID
   */
  userId: string;

  /**
   * FHIR Patient resource ID
   */
  patientId: string;

  /**
   * Username
   */
  username: string;

  /**
   * Email address
   */
  email: string;

  /**
   * Success message
   */
  message: string;
}
