# Configuración de Keycloak para App Móvil

Esta guía explica cómo configurar Keycloak para que la app móvil pueda autenticarse correctamente.

## 🎯 Problema Común

Si recibes el error **"Parámetro no válido: redirect_uri"** al intentar hacer login desde la app móvil, significa que el `redirect_uri` `carecore://auth` no está registrado en Keycloak para el cliente que estás usando.

## 🔧 Solución Rápida: Agregar Redirect URI al Cliente Existente

Si estás usando el cliente `carecore-api` para la app móvil, necesitas agregar el redirect_uri móvil:

### Pasos en Keycloak Admin Console

1. Accede a Keycloak Admin Console:
   - URL: `http://localhost:8080/admin`
   - Usuario: valor de `KEYCLOAK_ADMIN` en `.env.local`
   - Password: valor de `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`

2. Selecciona el realm `carecore` (dropdown superior izquierdo)

3. Ve a **Clients** → busca `carecore-api` → ábrelo

4. Ve a la pestaña **Settings**

5. En la sección **Valid redirect URIs**, agrega:

   ```
   carecore://auth
   ```

6. Haz clic en **Save**

7. Reinicia la app móvil y vuelve a intentar el login

## 🏗️ Solución Recomendada: Cliente Separado para Móvil

Para mejor separación de responsabilidades, se recomienda crear un cliente separado para la app móvil.

### Crear Cliente "carecore-mobile"

1. En Keycloak Admin Console, ve a **Clients** → **Create client**

2. **Client type:** OpenID Connect → **Next**

3. **General settings:**
   - **Client ID:** `carecore-mobile`
   - **Name:** `CareCore Mobile App`
   - **Next**

4. **Capability config:**
   - **Client authentication:** OFF (public client)
   - **Authorization:** OFF
   - **Standard flow:** ON
   - **Direct access grants:** OFF
   - **Implicit flow:** OFF
   - **Next**

5. **Login settings:**
   - **Root URL:** (dejar vacío o usar `carecore://`)
   - **Valid redirect URIs:**
     - `carecore://auth`
     - `exp://localhost:8081` (para Expo Go en desarrollo)
   - **Web origins:** (dejar vacío para app móvil)
   - **Save**

6. **Advanced settings:**
   - **Access token lifespan:** `15 minutes`
   - **PKCE Code Challenge Method:** `S256` (obligatorio para clientes públicos)
   - **Save**

### Configurar Variables de Entorno

Actualiza `.env.local` o `.env.development`:

```env
# Cliente para app móvil
MOBILE_KEYCLOAK_CLIENT_ID=carecore-mobile
```

O en `app.config.js` de la app móvil:

```javascript
extra: {
  MOBILE_KEYCLOAK_CLIENT_ID: 'carecore-mobile',
  MOBILE_REDIRECT_URI: 'carecore://auth',
}
```

## ✅ Verificación

### Verificar Redirect URI

1. En Keycloak Admin Console, ve a **Clients** → tu cliente
2. Verifica que `carecore://auth` esté en **Valid redirect URIs**
3. Asegúrate de que no haya espacios o caracteres extra

### Probar Login

1. Abre la app móvil
2. Intenta hacer login
3. Deberías ser redirigido a Keycloak sin el error de redirect_uri

## 🐛 Troubleshooting

### Error: "Parámetro no válido: redirect_uri"

**Causa:** El redirect_uri no está registrado en Keycloak.

**Solución:**

1. Verifica que `carecore://auth` esté en Valid Redirect URIs
2. Verifica que no haya espacios antes o después
3. Verifica que estés usando el cliente correcto (`carecore-api` o `carecore-mobile`)

### Error: "Client not found"

**Causa:** El `client_id` en la app móvil no coincide con ningún cliente en Keycloak.

**Solución:**

1. Verifica que el cliente exista en Keycloak
2. Verifica que `MOBILE_KEYCLOAK_CLIENT_ID` o `KEYCLOAK_CLIENT_ID` en la app coincida con el Client ID en Keycloak

### Error: "Invalid scopes: openid profile email fhirUser"

**Causa:** El scope `fhirUser` no está configurado en Keycloak.

**Solución:**

**Opción 1: Remover `fhirUser` de los scopes (Solución Rápida)**

La app móvil ya está configurada para usar solo los scopes estándar (`openid`, `profile`, `email`). Si aún ves este error, verifica que `packages/mobile/config/AppConfig.ts` no incluya `fhirUser`:

```typescript
scopes: ['openid', 'profile', 'email'], // ✅ Sin fhirUser
```

**Opción 2: Crear el scope `fhirUser` en Keycloak (Solución Completa)**

Si necesitas el scope `fhirUser` para SMART on FHIR, sigue la guía en `docs/FHIRUSER_SCOPE_SETUP.md` para crearlo en Keycloak.

### Error: "PKCE code challenge required"

**Causa:** El cliente público requiere PKCE pero la app no lo está enviando o Keycloak no lo tiene habilitado.

**Solución:**

#### 1. Verificar PKCE en la App Móvil

La app móvil ya tiene PKCE configurado por defecto. Para verificar:

**Archivo:** `packages/mobile/hooks/useAuth.tsx`

```typescript
const requestConfig = useMemo(
  () => ({
    clientId: appConfig.keycloak.clientId,
    responseType: ResponseType.Code,
    scopes: appConfig.keycloak.scopes,
    redirectUri: appConfig.keycloak.redirectUri,
    usePKCE: true, // ✅ PKCE está habilitado
  }),
  [],
);
```

**Verificación:**

- ✅ Si ves `usePKCE: true` en la línea 70, está correctamente configurado
- ❌ Si no está o es `false`, cámbialo a `true`

#### 2. Habilitar PKCE en Keycloak

**Pasos en Keycloak Admin Console:**

1. Accede a Keycloak Admin Console:
   - URL: `http://localhost:8080/admin`
   - Usuario: valor de `KEYCLOAK_ADMIN` en `.env.local`
   - Password: valor de `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`

2. Selecciona el realm `carecore` (dropdown superior izquierdo)

3. Ve a **Clients** → busca tu cliente (`carecore-api` o `carecore-mobile`) → ábrelo

4. Ve a la pestaña **Advanced settings** (al final de las pestañas)

5. Busca la sección **PKCE Code Challenge Method**

6. Selecciona: **S256** (SHA-256, recomendado)

7. **IMPORTANTE:** Si el cliente es **public** (Client authentication: OFF), Keycloak puede requerir PKCE automáticamente. Verifica que:
   - **PKCE Code Challenge Method:** `S256`
   - Si hay una opción "Require PKCE", debe estar habilitada para clientes públicos

8. Haz clic en **Save**

**Nota para clientes confidential (`carecore-api`):**

- Los clientes confidential pueden tener PKCE opcional
- Si quieres forzar PKCE incluso para clientes confidential, habilítalo en Advanced settings
- Para clientes públicos, PKCE es **obligatorio** por seguridad

#### 3. Verificar que Funciona

Después de configurar PKCE en Keycloak:

1. Reinicia la app móvil
2. Intenta hacer login
3. El flujo debería funcionar correctamente con PKCE

**Síntomas de PKCE funcionando:**

- La URL de autorización incluye `code_challenge` y `code_challenge_method=S256`
- El intercambio de código por tokens incluye `code_verifier`
- No recibes errores de "PKCE code challenge required"

## 📚 Referencias

- [Keycloak Client Configuration](https://www.keycloak.org/docs/latest/server_admin/#_clients)
- [OAuth2 Mobile Apps](https://www.keycloak.org/docs/latest/securing_apps/#_mobile_apps)
- [PKCE for Public Clients](https://www.keycloak.org/docs/latest/securing_apps/#_oidc_pkce)
