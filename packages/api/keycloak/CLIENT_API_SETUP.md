# Configuración del Cliente "carecore-api" en Keycloak

Esta guía explica cómo configurar el cliente OAuth2/OIDC "carecore-api" de tipo confidential para la API backend.

## 🎯 Objetivo

Configurar el cliente OAuth2/OIDC "carecore-api" de tipo confidential para que la API backend pueda autenticar usuarios y validar tokens.

## 📋 Requisitos Previos

- ✅ Realm "carecore" creado (ver [REALM_SETUP.md](./REALM_SETUP.md))
- ✅ Acceso a Admin Console de Keycloak
- ✅ Variables de entorno configuradas en `.env.local`

## 🚀 Configuración Paso a Paso

### Paso 1: Acceder a Admin Console

1. Iniciar servicios (si no están corriendo):

   ```bash
   npm run docker:up
   ```

2. Acceder a Admin Console:
   - URL: `${KEYCLOAK_URL}` (ver `.env.local` para el puerto, típicamente `http://localhost:${KEYCLOAK_HTTP_PORT}`)
   - Usuario: Valor de `KEYCLOAK_ADMIN` en `.env.local`
   - Contraseña: Valor de `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`

3. Seleccionar el realm "carecore" en el dropdown superior izquierdo

### Paso 2: Crear el Cliente

1. En el menú lateral izquierdo, ir a **Clients**
2. Hacer clic en **Create client** (botón en la esquina superior derecha)
3. En la pantalla "Add client":
   - **Client type:** OpenID Connect
   - Hacer clic en **Next**

### Paso 3: Configurar Settings Básicos

1. En "General settings":
   - **Client ID:** `carecore-api`
   - **Name:** `CareCore API` (opcional, para referencia)
   - Hacer clic en **Next**

2. En "Capability config":
   - **Client authentication:** ON (esto lo hace confidential)
   - **Authorization:** OFF (para MVP)
   - **Standard flow:** ON (Authorization Code Flow)
   - **Direct access grants:** ON (para testing en desarrollo)
   - **Implicit flow:** OFF
   - **Service accounts roles:** ON (opcional, para servicio a servicio)
   - Hacer clic en **Next**

3. En "Login settings":
   - **Root URL:** `http://localhost:3000`
   - **Home URL:** `http://localhost:3000`
   - **Valid redirect URIs:**
     - `http://localhost:3000/api/auth/callback`
     - `http://localhost:3000/api/auth/callback/*`
     - `carecore://auth` (para app móvil - deep linking)
   - **Valid post logout redirect URIs:**
     - `http://localhost:3000`
   - **Web origins:**
     - `http://localhost:3000`
   - Hacer clic en **Save**

### Paso 4: Configurar Access Token Settings

1. En la página del cliente "carecore-api", ir a la pestaña **Advanced settings**
2. Configurar:
   - **Access token lifespan:** `5 minutes` (300 segundos)
   - **Client session idle timeout:** `30 minutes` (1800 segundos)
   - **Client session max lifespan:** `10 hours` (36000 segundos)
   - **Client signature algorithm:** `RS256` (recomendado)
3. Hacer clic en **Save**

### Paso 5: Obtener y Guardar Client Secret

⚠️ **IMPORTANTE:** El Client Secret es información sensible y debe guardarse de forma segura.

1. En la página del cliente "carecore-api", ir a la pestaña **Credentials**
2. Verás el **Client secret** (si no está visible, hacer clic en "Regenerate secret")
3. **Copiar el Client Secret** (solo se muestra una vez)
4. Guardar en `.env.local`:
   ```bash
   KEYCLOAK_CLIENT_SECRET=<el-secret-copiado>
   ```
5. **NO commitear** el Client Secret al repositorio

### Paso 6: Configurar Mappers (Opcional para MVP)

Los mappers permiten agregar información adicional a los tokens. Para MVP, podemos usar los mappers por defecto.

Si necesitas mappers personalizados más adelante:

1. Ir a la pestaña **Mappers**
2. Hacer clic en **Create mapper**
3. Configurar según necesidades (roles, grupos, etc.)

## ✅ Verificación

### Verificar que el Cliente Existe

1. En **Clients**, verificar que "carecore-api" aparece en la lista
2. Verificar que el tipo es "confidential"

### Verificar Configuración

1. Abrir el cliente "carecore-api"
2. Verificar en **Settings**:
   - ✅ Client authentication: ON
   - ✅ Standard flow: ON
   - ✅ Direct access grants: ON (solo desarrollo)
   - ✅ Valid redirect URIs configurados

3. Verificar en **Credentials**:
   - ✅ Client secret visible (o regenerado)

### Probar la Configuración (Opcional)

Puedes probar la configuración usando curl o Postman:

```bash
# Obtener token usando Direct Access Grant (solo para testing)
curl -X POST http://localhost:8080/realms/carecore/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=carecore-api" \
  -d "client_secret=<TU_CLIENT_SECRET>" \
  -d "grant_type=client_credentials" \
  -d "scope=openid"
```

**Nota:** Esto requiere crear un usuario de servicio o usar client credentials flow.

## 📝 Configuración Aplicada

### Settings Generales

- **Client ID:** carecore-api
- **Client Type:** OpenID Connect
- **Client Authentication:** ON (confidential)
- **Standard Flow:** ON
- **Direct Access Grants:** ON (solo desarrollo)

### URLs

- **Root URL:** http://localhost:3000
- **Valid Redirect URIs:**
  - http://localhost:3000/api/auth/callback
  - http://localhost:3000/api/auth/callback/\*
  - carecore://auth (para app móvil - deep linking)
- **Web Origins:** http://localhost:3000

### Tokens

- **Access Token Lifespan:** 5 minutes
- **Client Session Idle:** 30 minutes
- **Client Session Max:** 10 hours
- **Signature Algorithm:** RS256

## 🔒 Seguridad

### Client Secret

- ⚠️ **NUNCA** commitear el Client Secret al repositorio
- ⚠️ Guardar en `.env.local` (que está en `.gitignore`)
- ⚠️ Rotar el Client Secret periódicamente en producción
- ⚠️ Usar diferentes secrets para desarrollo y producción

### Direct Access Grants

- ⚠️ **Solo habilitar en desarrollo** para testing
- ⚠️ **Deshabilitar en producción** por seguridad
- ⚠️ Usar Authorization Code Flow en producción

### Variables de Entorno

Agregar a `.env.local`:

```env
# Keycloak Client Configuration
KEYCLOAK_CLIENT_ID=carecore-api
KEYCLOAK_CLIENT_SECRET=<tu-client-secret-aqui>
```

**NO agregar** a `.env.development.example` o `.env.production.example` (solo documentar que existe).

## 📚 Próximos Pasos

Después de configurar el cliente, continúa con:

- [Tarea #6: Configurar cliente "carecore-web"](../docs/tasks/PHASE1_KEYCLOAK_SETUP.md#tarea-6-configurar-cliente-carecore-web-en-keycloak)
- [Tarea #7: Definir roles base](../docs/tasks/PHASE1_KEYCLOAK_SETUP.md#tarea-7-definir-roles-base-en-keycloak)
- [Fase 2: Integración NestJS](../docs/AUTH_IMPLEMENTATION_PLAN.md#fase-2-integración-nestjs)

## 🐛 Troubleshooting

### No puedo ver el Client Secret

1. Verificar que "Client authentication" esté activado
2. Si no aparece, hacer clic en "Regenerate secret"
3. **Importante:** Copiar inmediatamente, solo se muestra una vez

### Error al obtener token

1. Verificar que el Client Secret sea correcto
2. Verificar que el Client ID sea "carecore-api"
3. Verificar que el realm sea "carecore"
4. Verificar que "Direct access grants" esté habilitado (solo desarrollo)

### Redirect URI no válido

1. Verificar que la URL en la petición coincida exactamente con las configuradas
2. Verificar que no haya espacios o caracteres especiales
3. Verificar que el protocolo (http/https) coincida
4. **Para app móvil:** Verificar que `carecore://auth` esté en la lista de Valid Redirect URIs
5. Si usas un cliente separado para móvil (`carecore-mobile`), verificar que ese cliente tenga el redirect_uri configurado

## 📖 Referencias

- [Keycloak Client Configuration](https://www.keycloak.org/docs/latest/server_admin/#_clients)
- [OAuth2 Client Types](https://www.keycloak.org/docs/latest/server_admin/#_client_types)
- [Keycloak Client Credentials](https://www.keycloak.org/docs/latest/server_admin/#_client_credentials)
