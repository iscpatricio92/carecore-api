/**
 * Expo App Configuration
 * This file allows us to inject environment variables from the monorepo root
 * into the Expo app using the extra field
 */

const path = require('path');
const { config } = require('dotenv');

// Load environment variables from monorepo root
const monorepoRoot = path.resolve(__dirname, '../..');
const nodeEnv = process.env.NODE_ENV || 'development';

// Load .env files in priority order (same as API)
config({ path: path.join(monorepoRoot, `.env.${nodeEnv}`) });
config({ path: path.join(monorepoRoot, '.env.local'), override: true });

module.exports = {
  expo: {
    name: process.env.APP_NAME || 'CareCore',
    slug: 'carecore',
    scheme: 'carecore',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/images/logo.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/images/logo.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.anonymous.carecoremobile',
      icon: './assets/images/logo.png',
    },
    android: {
      package: 'com.anonymous.carecoremobile',
      adaptiveIcon: {
        foregroundImage: './assets/images/logo.png',
        backgroundColor: '#ffffff',
      },
    },
    web: {
      favicon: './assets/images/logo.png',
      bundler: 'metro',
    },
    plugins: ['expo-router', 'expo-web-browser', 'expo-secure-store'],
    extra: {
      // Inject environment variables into the app
      NODE_ENV: nodeEnv,
      MOBILE_API_URL: process.env.MOBILE_API_URL || process.env.API_URL,
      KEYCLOAK_URL: process.env.KEYCLOAK_URL,
      KEYCLOAK_REALM: process.env.KEYCLOAK_REALM,
      MOBILE_KEYCLOAK_CLIENT_ID:
        process.env.MOBILE_KEYCLOAK_CLIENT_ID || process.env.KEYCLOAK_CLIENT_ID,
      MOBILE_REDIRECT_URI: process.env.MOBILE_REDIRECT_URI,
      APP_NAME: process.env.APP_NAME || 'CareCore',
    },
  },
};
