# Environment Variables - Mobile App

This document describes the environment variables used by the CareCore mobile app.

## Configuration Strategy

The mobile app reads environment variables from the **monorepo root** (same as the API), using the following priority:

1. `.env.${NODE_ENV}` (e.g., `.env.development`)
2. `.env.local` (overrides the above)

Variables are injected into the Expo app via `app.config.js` using the `extra` field, which makes them available through `expo-constants`.

## Required Variables

### API Configuration

```env
# API Base URL
# For physical devices, use your machine's local IP address instead of localhost
# Example: http://192.168.1.100:3000
MOBILE_API_URL=http://localhost:3000

# Alternative: Can use API_URL if MOBILE_API_URL is not set
API_URL=http://localhost:3000
```

### Keycloak Configuration

```env
# Keycloak Server URL
KEYCLOAK_URL=http://localhost:8080

# Keycloak Realm
KEYCLOAK_REALM=carecore

# Mobile App Client ID (specific to mobile app)
MOBILE_KEYCLOAK_CLIENT_ID=carecore-mobile

# Alternative: Can use KEYCLOAK_CLIENT_ID if MOBILE_KEYCLOAK_CLIENT_ID is not set
KEYCLOAK_CLIENT_ID=carecore-mobile

# Redirect URI for OAuth (optional, defaults to carecore://auth)
MOBILE_REDIRECT_URI=carecore://auth
```

### App Configuration

```env
# App Name
APP_NAME=CareCore
```

## Development Setup

### For Simulator/Emulator

When running on iOS Simulator or Android Emulator, you can use `localhost`:

```env
MOBILE_API_URL=http://localhost:3000
KEYCLOAK_URL=http://localhost:8080
```

### For Physical Devices

When running on a physical device, you **must** use your machine's local IP address:

1. Find your machine's local IP:
   - **macOS/Linux**: `ifconfig | grep "inet " | grep -v 127.0.0.1`
   - **Windows**: `ipconfig` (look for IPv4 Address)

2. Update `.env.local`:
   ```env
   MOBILE_API_URL=http://192.168.1.100:3000
   KEYCLOAK_URL=http://192.168.1.100:8080
   ```

3. Make sure your machine and device are on the same network.

## Example .env.development

```env
# Application
NODE_ENV=development
APP_NAME=CareCore

# API
MOBILE_API_URL=http://localhost:3000
API_URL=http://localhost:3000

# Keycloak
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=carecore
MOBILE_KEYCLOAK_CLIENT_ID=carecore-mobile

# Mobile Specific
MOBILE_REDIRECT_URI=carecore://auth
```

## Example .env.local (for physical devices)

```env
# Override with your local IP for physical device testing
MOBILE_API_URL=http://192.168.1.100:3000
KEYCLOAK_URL=http://192.168.1.100:8080
```

## How It Works

1. `app.config.js` loads environment variables from the monorepo root using `dotenv`
2. Variables are injected into Expo via the `extra` field
3. `config/AppConfig.ts` reads variables from `expo-constants`
4. Services use `appConfig` to get URLs and configuration

## Troubleshooting

### "Unable to connect to server" on physical device

- ✅ Check that `MOBILE_API_URL` uses your machine's IP, not `localhost`
- ✅ Verify your device and computer are on the same network
- ✅ Check that your firewall allows connections on the API port (3000)
- ✅ Verify the API is running and accessible

### "Environment variable not set" warnings

- ✅ Check that variables are set in `.env.development` or `.env.local`
- ✅ Verify `app.config.js` is loading the correct `.env` file
- ✅ Restart Expo after changing environment variables

## Notes

- Variables prefixed with `MOBILE_` are specific to the mobile app
- Variables without prefix are shared with the API (e.g., `KEYCLOAK_URL`)
- The app falls back to defaults if variables are not set (see `config/AppConfig.ts`)
- In production, these should be set via your deployment platform (Expo EAS, CI/CD, etc.)
