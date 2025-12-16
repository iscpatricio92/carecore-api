/**
 * AppConfig - Centralized configuration service
 * Reads environment variables from Expo Constants
 *
 * For Expo, environment variables should be defined in app.config.js
 * or using EXPO_PUBLIC_ prefix for public variables
 */

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Environment, AppConfig as AppConfigType } from '@carecore/shared';

// Re-export for convenience
export type { Environment, AppConfigType as AppConfig };

// Get environment from Constants or default to development
const nodeEnv = Constants.expoConfig?.extra?.NODE_ENV || process.env.NODE_ENV || 'development';

/**
 * Default configuration values for development
 * These are fallback values used ONLY when environment variables are not set
 * In production, all values should come from environment variables
 */
const DEFAULTS = {
  API_URL: 'http://localhost:3000',
  KEYCLOAK_URL: 'http://localhost:8080',
  KEYCLOAK_REALM: 'carecore',
  MOBILE_CLIENT_ID: 'carecore-mobile',
  APP_SCHEME: 'carecore',
  APP_NAME: 'CareCore',
} as const;

/**
 * Get environment variable with fallback
 * Priority: Constants.expoConfig.extra -> process.env -> defaultValue
 */
function getEnv(key: string, defaultValue?: string): string {
  // Try Constants.expoConfig.extra first (set in app.config.js)
  const value = Constants.expoConfig?.extra?.[key] || process.env[key] || defaultValue;

  if (!value && !defaultValue) {
    if (__DEV__) {
      console.warn(
        `⚠️  Environment variable ${key} is not set. Using default: ${defaultValue || 'undefined'}`,
      );
    }
  }

  return value || '';
}

/**
 * Get API base URL
 * For mobile devices, localhost doesn't work - use local IP or configured URL
 *
 * IMPORTANT: For physical devices, set MOBILE_API_URL to your machine's local IP
 * Example: http://192.168.1.100:3000
 */
function getApiBaseUrl(): string {
  const envUrl =
    getEnv('MOBILE_API_URL') ||
    getEnv('EXPO_PUBLIC_API_URL') ||
    getEnv('API_URL') ||
    DEFAULTS.API_URL;

  // In development, warn if using localhost (won't work on physical devices)
  if (envUrl.includes('localhost') && __DEV__ && Platform.OS !== 'web') {
    console.warn(
      '⚠️  Using localhost for API URL. This will not work on physical devices.\n' +
        "   Set MOBILE_API_URL in app.config.js to your machine's local IP (e.g., http://192.168.1.100:3000)",
    );
  }

  return envUrl;
}

/**
 * Get Keycloak configuration
 */
function getKeycloakConfig() {
  const keycloakUrl =
    getEnv('KEYCLOAK_URL') || getEnv('EXPO_PUBLIC_KEYCLOAK_URL') || DEFAULTS.KEYCLOAK_URL;
  const realm =
    getEnv('KEYCLOAK_REALM') || getEnv('EXPO_PUBLIC_KEYCLOAK_REALM') || DEFAULTS.KEYCLOAK_REALM;
  const clientId =
    getEnv('MOBILE_KEYCLOAK_CLIENT_ID') ||
    getEnv('EXPO_PUBLIC_KEYCLOAK_CLIENT_ID') ||
    getEnv('KEYCLOAK_CLIENT_ID') ||
    DEFAULTS.MOBILE_CLIENT_ID;

  return {
    issuer: `${keycloakUrl}/realms/${realm}`,
    clientId,
    redirectUri:
      getEnv('MOBILE_REDIRECT_URI') ||
      getEnv('EXPO_PUBLIC_REDIRECT_URI') ||
      `${Constants.expoConfig?.scheme || DEFAULTS.APP_SCHEME}://auth`,
    scopes: ['openid', 'profile', 'email', 'fhirUser'],
  };
}

/**
 * App configuration singleton
 */
export const appConfig: AppConfigType = {
  environment: (nodeEnv as Environment) || 'development',
  api: {
    baseUrl: getApiBaseUrl(),
    authUrl: `${getApiBaseUrl()}/api/auth`,
    fhirUrl: `${getApiBaseUrl()}/api/fhir`,
  },
  keycloak: getKeycloakConfig(),
  app: {
    name: getEnv('APP_NAME') || Constants.expoConfig?.name || DEFAULTS.APP_NAME,
    scheme: (Constants.expoConfig?.scheme as string) || DEFAULTS.APP_SCHEME,
  },
  isDevelopment: nodeEnv === 'development',
  isProduction: nodeEnv === 'production',
};

// Log configuration in development (without sensitive data)
if (__DEV__) {
  console.log('📱 App Configuration:', {
    environment: appConfig.environment,
    apiBaseUrl: appConfig.api.baseUrl,
    keycloakIssuer: appConfig.keycloak.issuer,
    keycloakClientId: appConfig.keycloak.clientId,
    appName: appConfig.app.name,
    platform: Platform.OS,
  });
}

export default appConfig;
