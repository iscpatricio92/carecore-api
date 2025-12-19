# Configuración de PKCE (Proof Key for Code Exchange)

Esta guía explica cómo verificar y configurar PKCE en la app móvil y en Keycloak.

## 🎯 ¿Qué es PKCE?

PKCE (Proof Key for Code Exchange) es una extensión de OAuth2 diseñada para proteger aplicaciones móviles y clientes públicos contra ataques de interceptación de código de autorización.

**¿Por qué es importante?**

- ✅ Obligatorio para clientes públicos (sin client_secret)
- ✅ Recomendado para aplicaciones móviles
- ✅ Previene ataques de interceptación de código
- ✅ Más seguro que depender solo de redirect_uri

## 📱 Verificación en la App Móvil

### Ubicación del Código

**Archivo:** `packages/mobile/hooks/useAuth.tsx`

### Configuración Actual

La app móvil ya tiene PKCE configurado por defecto:

```typescript
// Línea 64-73
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

### Cómo Verificar

1. Abre el archivo `packages/mobile/hooks/useAuth.tsx`
2. Busca la línea 70
3. Verifica que diga: `usePKCE: true`

**Si está configurado correctamente:**

- ✅ Verás `usePKCE: true` en la línea 70
- ✅ El comentario dice "PKCE es obligatorio para aplicaciones móviles"

**Si NO está configurado:**

- ❌ Cambia `usePKCE: false` a `usePKCE: true`
- ❌ O agrega la línea `usePKCE: true,` si no existe

### Cómo Funciona en la App

1. **Generación del Code Verifier:**
   - `expo-auth-session` genera automáticamente un `code_verifier` aleatorio (mínimo 43 caracteres)

2. **Generación del Code Challenge:**
   - Se calcula el SHA-256 hash del `code_verifier`
   - Se codifica en base64url
   - Se envía como `code_challenge` en la URL de autorización

3. **Intercambio de Código:**
   - Cuando Keycloak redirige con el `code`, la app envía el `code_verifier` original
   - Keycloak verifica que el hash del `code_verifier` coincida con el `code_challenge` enviado

## 🔧 Configuración en Keycloak

### Para Cliente Público (Recomendado para Móvil)

Si estás usando o planeas usar un cliente público (`carecore-mobile`):

#### Pasos en Keycloak Admin Console

1. **Acceder a Keycloak:**
   - URL: `http://localhost:8080/admin`
   - Usuario: valor de `KEYCLOAK_ADMIN` en `.env.local`
   - Password: valor de `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`

2. **Seleccionar Realm:**
   - Selecciona el realm `carecore` (dropdown superior izquierdo)

3. **Ir al Cliente:**
   - Ve a **Clients** → busca tu cliente (`carecore-mobile` o `carecore-api`)
   - Haz clic en el cliente para abrirlo

4. **Ir a Advanced Settings:**
   - Haz clic en la pestaña **Advanced settings** (última pestaña, al final)

5. **Configurar PKCE:**
   - Busca la sección **PKCE Code Challenge Method**
   - Selecciona: **S256** (SHA-256, recomendado)
   - **Nota:** Para clientes públicos, Keycloak puede requerir PKCE automáticamente

6. **Guardar:**
   - Haz clic en **Save** (botón inferior)

### Para Cliente Confidential (`carecore-api`)

Si estás usando el cliente confidential `carecore-api`:

#### Opción 1: Habilitar PKCE Opcionalmente

1. Sigue los mismos pasos que para cliente público
2. En **Advanced settings**, selecciona **S256** en **PKCE Code Challenge Method**
3. PKCE será opcional pero recomendado

#### Opción 2: No Requerir PKCE (Actual)

- Los clientes confidential pueden funcionar sin PKCE
- Usan `client_secret` para autenticación
- PKCE es opcional pero recomendado para mayor seguridad

### Verificación Visual en Keycloak

Después de configurar, deberías ver en **Advanced settings**:

```
PKCE Code Challenge Method: S256
```

## ✅ Verificación de que PKCE Funciona

### 1. Verificar en la URL de Autorización

Cuando la app inicia el login, la URL debería incluir:

```
code_challenge=Y9gX_3z-oBTA9y3-QY84rKvsIVgE07frUWSeK0D63gw
code_challenge_method=S256
```

**Ejemplo de URL completa:**

```
http://localhost:8080/realms/carecore/protocol/openid-connect/auth?
  client_id=carecore-api&
  redirect_uri=carecore://auth&
  response_type=code&
  scope=openid profile email fhirUser&
  code_challenge=Y9gX_3z-oBTA9y3-QY84rKvsIVgE07frUWSeK0D63gw&
  code_challenge_method=S256&
  state=5p6hN3lHJK
```

### 2. Verificar en el Intercambio de Código

Cuando la app intercambia el código por tokens, debería incluir:

```
code_verifier=<valor-generado-por-expo-auth-session>
```

**Ejemplo de request body:**

```
POST /realms/carecore/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=<authorization-code>&
redirect_uri=carecore://auth&
client_id=carecore-api&
code_verifier=<code-verifier>
```

### 3. Verificar en los Logs

Si habilitas logs detallados en la app, deberías ver:

```typescript
// En useAuth.tsx, cuando se procesa la respuesta
console.log('PKCE code_verifier:', codeVerifier);
```

## 🐛 Troubleshooting

### Error: "PKCE code challenge required"

**Causa:** Keycloak requiere PKCE pero no se está enviando.

**Solución:**

1. Verifica que `usePKCE: true` en `packages/mobile/hooks/useAuth.tsx`
2. Verifica que Keycloak tenga PKCE habilitado en Advanced settings
3. Reinicia la app móvil

### Error: "Invalid code_verifier"

**Causa:** El `code_verifier` no coincide con el `code_challenge` enviado.

**Solución:**

1. Esto generalmente es un bug en la librería `expo-auth-session`
2. Verifica que estés usando la versión más reciente
3. Asegúrate de que el mismo `code_verifier` se use en ambos pasos

### PKCE no se está enviando

**Causa:** La configuración de PKCE no está correcta.

**Solución:**

1. Verifica `usePKCE: true` en la configuración de OAuth2
2. Verifica que `expo-auth-session` esté instalado y actualizado
3. Verifica que el cliente en Keycloak acepte PKCE (S256)

## 📚 Referencias

- [OAuth2 PKCE RFC 7636](https://tools.ietf.org/html/rfc7636)
- [Keycloak PKCE Documentation](https://www.keycloak.org/docs/latest/securing_apps/#_oidc_pkce)
- [Expo Auth Session PKCE](https://docs.expo.dev/guides/authentication/#oauth2--pkce-flow)
- [OAuth2 Mobile Apps Best Practices](https://www.keycloak.org/docs/latest/securing_apps/#_mobile_apps)

## 🔒 Seguridad

### ¿Por qué PKCE es importante para móviles?

1. **Sin Client Secret:** Las apps móviles no pueden guardar secretos de forma segura
2. **Interceptación:** Un atacante podría interceptar el código de autorización
3. **PKCE Previene:** El atacante no puede usar el código sin el `code_verifier` original

### Mejores Prácticas

- ✅ **Siempre usa PKCE** en aplicaciones móviles
- ✅ **Usa S256** (SHA-256) en lugar de plain (menos seguro)
- ✅ **Genera code_verifier aleatorio** (mínimo 43 caracteres)
- ✅ **No reutilices code_verifier** entre sesiones
- ✅ **Usa HTTPS** en producción (PKCE no protege contra MITM sin HTTPS)
