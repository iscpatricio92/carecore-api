# Solución: Keycloak No Muestra Formulario de Login

Esta guía explica cómo resolver el problema cuando Keycloak se abre pero no muestra el formulario para ingresar usuario y contraseña.

## 🎯 Problema

Cuando haces clic en "Iniciar Sesión" en la app móvil:

- ✅ Se abre Keycloak correctamente
- ✅ La URL de autorización es correcta
- ❌ **No aparece el formulario de login** (pantalla en blanco o error)

## 🔍 Causas Posibles

1. **Keycloak está intentando usar una sesión existente (SSO)**
2. **Falta el parámetro `prompt=login` en la URL de autorización**
3. **Configuración del cliente que está saltando el login**
4. **Problema con el tema de Keycloak**

## ✅ Solución: Agregar `prompt=login`

El parámetro `prompt=login` fuerza a Keycloak a mostrar el formulario de login, incluso si hay una sesión activa.

### Cambio Aplicado

Se agregó `prompt: Prompt.Login` en la configuración de OAuth2:

**Archivo:** `packages/mobile/hooks/useAuth.tsx`

```typescript
import { useAuthRequest, ResponseType, useAutoDiscovery, Prompt } from 'expo-auth-session';

const requestConfig = useMemo(
  () => ({
    clientId: appConfig.keycloak.clientId,
    responseType: ResponseType.Code,
    scopes: appConfig.keycloak.scopes,
    redirectUri: appConfig.keycloak.redirectUri,
    usePKCE: true,
    prompt: Prompt.Login, // ✅ Forzar formulario de login
  }),
  [],
);
```

### Verificar que Funciona

1. **Reinicia la app móvil completamente** (no solo recargar)
2. Haz clic en "Iniciar Sesión"
3. Keycloak debería mostrar el formulario de login

## 🐛 Troubleshooting

### El Formulario Sigue Sin Aparecer

#### Verificar la URL de Autorización

La URL debería incluir `prompt=login`:

```
http://localhost:8080/realms/carecore/protocol/openid-connect/auth?
  client_id=carecore-mobile&
  redirect_uri=carecore://auth&
  response_type=code&
  scope=openid profile email fhirUser&
  code_challenge=...&
  code_challenge_method=S256&
  state=...&
  prompt=login  ← Debe estar presente
```

#### Verificar Configuración del Cliente

1. Accede a Keycloak Admin Console
2. Ve a **Clients** → `carecore-mobile`
3. Verifica en **Settings**:
   - **Standard flow:** ON ✅
   - **Direct access grants:** OFF (recomendado para móvil)
   - **Client authentication:** OFF (público) ✅

#### Verificar Configuración del Realm

1. En Keycloak Admin Console, ve a **Realm settings**
2. Pestaña **Login**:
   - **User registration:** Puede estar ON u OFF
   - **Forgot password:** Puede estar ON u OFF
   - **Remember me:** Puede estar ON u OFF
3. Pestaña **Themes**:
   - Verifica que el tema esté configurado correctamente
   - Prueba cambiando temporalmente al tema "Keycloak" (default)

### La Pantalla Está en Blanco

**Causa:** Puede ser un problema con el WebView o el navegador.

**Solución:**

1. Verifica que Keycloak esté accesible desde el dispositivo/emulador
2. Intenta abrir Keycloak directamente en un navegador:
   ```
   http://localhost:8080/realms/carecore/account
   ```
3. Si funciona en el navegador pero no en la app, puede ser un problema con `expo-web-browser`

### Error: "Invalid prompt parameter"

**Causa:** Keycloak no reconoce el valor del parámetro `prompt`.

**Solución:**

- Verifica que estés usando `Prompt.Login` (enum) y no `'login'` (string)
- Verifica la versión de Keycloak (debe ser compatible con OIDC)

## 📋 Checklist de Verificación

- [ ] `prompt: Prompt.Login` está en `requestConfig`
- [ ] `Prompt` está importado de `expo-auth-session`
- [ ] La app fue reiniciada completamente (no solo recargada)
- [ ] La URL de autorización incluye `prompt=login`
- [ ] El cliente `carecore-mobile` está configurado correctamente
- [ ] Keycloak está accesible desde el dispositivo/emulador

## 🔍 Verificar en los Logs

Si el problema persiste, revisa los logs de Keycloak:

```bash
docker-compose logs keycloak | grep -i "login\|auth\|error"
```

Busca errores relacionados con:

- `invalid_request`
- `invalid_prompt`
- `login_required`
- Problemas de renderizado del tema

## 📚 Referencias

- [OIDC Prompt Parameter](https://openid.net/specs/openid-connect-core-1_0.html#AuthRequest)
- [Expo Auth Session Prompt](https://docs.expo.dev/versions/latest/sdk/auth-session/#prompt)
- [Keycloak Login Settings](https://www.keycloak.org/docs/latest/server_admin/#_login)
