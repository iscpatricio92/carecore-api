# Variables de Entorno Móvil y Docker

Esta guía explica cómo funcionan las variables de entorno para la app móvil y por qué **NO** necesitan estar en Docker.

## 🎯 Punto Clave

**La app móvil NO se ejecuta en Docker.** Se ejecuta en Expo/React Native en tu dispositivo o emulador. Por lo tanto, **NO necesita variables de entorno en Docker Compose**.

## 📱 Cómo Lee Variables la App Móvil

La app móvil lee las variables de entorno desde archivos `.env` en el **root del monorepo**:

### Archivo: `packages/mobile/app.config.js`

```javascript
// Load .env files in priority order (same as API)
// 1. Load base environment file (.env.development, .env.production, etc.)
config({ path: path.join(monorepoRoot, `.env.${nodeEnv}`) });
// 2. Override with local file if it exists
config({ path: path.join(monorepoRoot, '.env.local'), override: true });
```

**Orden de prioridad:**

1. `.env.development` (o `.env.production` según `NODE_ENV`)
2. `.env.local` (sobrescribe las anteriores)

### Variables Leídas

Las variables se leen en `app.config.js` y se inyectan en la app vía `expo-constants`:

```javascript
extra: {
  MOBILE_KEYCLOAK_CLIENT_ID:
    process.env.MOBILE_KEYCLOAK_CLIENT_ID ||
    process.env.KEYCLOAK_CLIENT_ID ||
    'carecore-mobile',  // Fallback por defecto
  MOBILE_REDIRECT_URI: process.env.MOBILE_REDIRECT_URI || 'carecore://auth',
  // ... otras variables
}
```

## 🔧 Configuración Correcta

### Paso 1: Agregar Variables en `.env.local`

Agrega estas variables en `.env.local` (en el root del monorepo):

```bash
# Cliente Keycloak para app móvil
MOBILE_KEYCLOAK_CLIENT_ID=carecore-mobile

# Redirect URI para app móvil
MOBILE_REDIRECT_URI=carecore://auth

# Otras variables de Keycloak (compartidas con API)
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=carecore
```

### Paso 2: Reiniciar la App Móvil

Después de agregar las variables:

1. **Detén completamente la app móvil** (no solo recargar)
2. **Reinicia Expo/React Native:**

   ```bash
   # Si usas Expo
   npx expo start --clear

   # O si usas npm/yarn
   npm run start -- --clear
   ```

**⚠️ IMPORTANTE:** Los cambios en `app.config.js` requieren reiniciar completamente la app, no solo recargar.

## 🐛 Problema Común: Variables No Se Leen

### Síntoma

La app sigue usando `carecore-api` en lugar de `carecore-mobile`.

### Causas Posibles

1. **Variables no están en `.env.local`:**
   - Verifica que `MOBILE_KEYCLOAK_CLIENT_ID=carecore-mobile` esté en `.env.local`
   - Verifica que no haya espacios alrededor del `=`

2. **App no fue reiniciada:**
   - `app.config.js` solo se lee al iniciar la app
   - Recargar (shake → reload) no es suficiente
   - Debes detener y reiniciar completamente

3. **Variable `KEYCLOAK_CLIENT_ID` está sobrescribiendo:**
   - Si tienes `KEYCLOAK_CLIENT_ID=carecore-api` en `.env.local`
   - Y NO tienes `MOBILE_KEYCLOAK_CLIENT_ID`
   - La app usará `carecore-api` como fallback

### Solución

```bash
# En .env.local, asegúrate de tener:
MOBILE_KEYCLOAK_CLIENT_ID=carecore-mobile

# Y si quieres que la API use un cliente diferente:
KEYCLOAK_CLIENT_ID=carecore-api
```

## 📋 Checklist de Verificación

- [ ] `MOBILE_KEYCLOAK_CLIENT_ID=carecore-mobile` está en `.env.local`
- [ ] `MOBILE_REDIRECT_URI=carecore://auth` está en `.env.local` (opcional, tiene default)
- [ ] La app fue **reiniciada completamente** (no solo recargada)
- [ ] El cliente `carecore-mobile` existe en Keycloak
- [ ] El cliente `carecore-mobile` tiene `carecore://auth` en Valid redirect URIs

## 🔍 Verificar qué Cliente Está Usando la App

### Método 1: Logs de la App

Agrega un log temporal en `packages/mobile/config/AppConfig.ts`:

```typescript
if (__DEV__) {
  console.log('📱 App Configuration:', {
    keycloakClientId: appConfig.keycloak.clientId,
    // ... otros valores
  });
}
```

### Método 2: Verificar en Keycloak

1. Intenta hacer login desde la app
2. Revisa los logs de Keycloak o el error
3. El error mostrará el `client_id` que está usando

## 🐳 ¿Por qué NO en Docker?

La app móvil se ejecuta en:

- **iOS Simulator** o **Android Emulator** (en tu máquina)
- **Dispositivo físico** (iPhone/Android)
- **Expo Go** (aplicación Expo en tu dispositivo)

**Ninguno de estos está dentro de Docker**, por lo que:

- ❌ No lee variables de `docker-compose.yml`
- ❌ No lee variables del contenedor Docker
- ✅ Lee variables de archivos `.env` en el monorepo root
- ✅ Lee variables inyectadas por `app.config.js` vía `expo-constants`

## 📚 Referencias

- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [Configuración de Cliente Móvil](./VERIFY_MOBILE_CLIENT.md)
- [Solución de Error Redirect URI](./FIX_REDIRECT_URI_ERROR.md)
