/**
 * Configuration types shared between frontend and backend
 */

/**
 * Environment type
 */
export type Environment = 'development' | 'staging' | 'production';

/**
 * API configuration interface
 */
export interface ApiConfig {
  baseUrl: string;
  authUrl: string;
  fhirUrl: string;
}

/**
 * Keycloak configuration interface
 */
export interface KeycloakConfig {
  issuer: string;
  clientId: string;
  redirectUri: string;
  scopes: string[];
}

/**
 * App configuration interface
 */
export interface AppConfig {
  environment: Environment;
  api: ApiConfig;
  keycloak: KeycloakConfig;
  app: {
    name: string;
    scheme: string;
  };
  isDevelopment: boolean;
  isProduction: boolean;
}
