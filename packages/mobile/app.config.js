/**
 * Expo App Configuration
 *
 * This file replaces app.json and allows us to:
 * - Inject environment variables from the monorepo root
 * - Use dynamic configuration based on environment
 * - Access variables via expo-constants in the app
 *
 * Note: If app.config.js exists, it takes precedence over app.json
 */

const path = require('path');
const { config } = require('dotenv');

// Load environment variables from monorepo root
const monorepoRoot = path.resolve(__dirname, '../..');
const nodeEnv = process.env.NODE_ENV || 'development';

// Load .env files in priority order (same as API)
// 1. Load base environment file (.env.development, .env.production, etc.)
config({ path: path.join(monorepoRoot, `.env.${nodeEnv}`) });
// 2. Override with local file if it exists
config({ path: path.join(monorepoRoot, '.env.local'), override: true });

module.exports = {
  expo: {
    // Basic app information
    name: process.env.APP_NAME || 'CareCore',
    slug: 'carecore',
    scheme: 'carecore',
    version: '0.1.0',
    orientation: 'portrait',

    // Icons and splash
    icon: './assets/images/logo.png',
    userInterfaceStyle: 'light',
    // Disabled new architecture for now - requires native rebuild
    // Enable when ready: newArchEnabled: true,
    splash: {
      image: './assets/images/logo.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },

    // iOS configuration
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.anonymous.carecoremobile',
      icon: './assets/images/logo.png',
      // Disable new architecture for iOS until native code is properly configured
      newArchEnabled: false,
    },

    // Android configuration
    android: {
      package: 'com.anonymous.carecoremobile',
      adaptiveIcon: {
        foregroundImage: './assets/images/logo.png',
        backgroundColor: '#ffffff',
      },
    },

    // Web configuration
    web: {
      favicon: './assets/images/logo.png',
      bundler: 'metro',
    },

    // Expo plugins
    plugins: ['expo-router', 'expo-dev-client', 'expo-web-browser', 'expo-secure-store'],

    // Extra configuration - injected into app via expo-constants
    // These variables are available in the app via Constants.expoConfig.extra
    extra: {
      // Environment
      NODE_ENV: nodeEnv,

      // API Configuration
      MOBILE_API_URL: process.env.MOBILE_API_URL || process.env.API_URL,

      // Keycloak Configuration
      KEYCLOAK_URL: process.env.KEYCLOAK_URL,
      KEYCLOAK_REALM: process.env.KEYCLOAK_REALM,
      MOBILE_KEYCLOAK_CLIENT_ID:
        process.env.MOBILE_KEYCLOAK_CLIENT_ID ||
        process.env.KEYCLOAK_CLIENT_ID ||
        'carecore-mobile',
      MOBILE_REDIRECT_URI: process.env.MOBILE_REDIRECT_URI || 'carecore://auth',

      // App Configuration
      APP_NAME: process.env.APP_NAME || 'CareCore',
    },
  },
};
