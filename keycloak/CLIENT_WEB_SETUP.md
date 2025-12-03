# Configuración del Cliente "carecore-web" en Keycloak

Esta guía explica cómo configurar el cliente OAuth2/OIDC "carecore-web" de tipo public para la aplicación frontend.

## 🎯 Objetivo

Configurar el cliente OAuth2/OIDC "carecore-web" de tipo public con PKCE para que la aplicación frontend pueda autenticar usuarios de forma segura.

## 📋 Requisitos Previos

- ✅ Realm "carecore" creado (ver [REALM_SETUP.md](./REALM_SETUP.md))
- ✅ Cliente "carecore-api" configurado (ver [CLIENT_API_SETUP.md](./CLIENT_API_SETUP.md))
- ✅ Acceso a Admin Console de Keycloak

## 🚀 Configuración Paso a Paso

### Paso 1: Acceder a Admin Console

1. Iniciar servicios (si no están corriendo):
   ```bash
   npm run docker:up
   ```

2. Acceder a Admin Console:
   - URL: http://localhost:8080
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
   - **Client ID:** `carecore-web`
   - **Name:** `CareCore Web` (opcional, para referencia)
   - Hacer clic en **Next**

2. En "Capability config":
   - **Client authentication:** OFF (esto lo hace public)
   - **Authorization:** OFF (para MVP)
   - **Standard flow:** ON (Authorization Code Flow)
   - **Direct access grants:** OFF (no necesario para cliente público)
   - **Implicit flow:** OFF (deprecated, no usar)
   - **Service accounts roles:** OFF (no aplica para cliente público)
   - Hacer clic en **Next**

3. En "Login settings":
   - **Root URL:** `http://localhost:3001` (o el puerto donde corre el frontend)
   - **Home URL:** `http://localhost:3001`
   - **Valid redirect URIs:**
     - `http://localhost:3001/auth/callback`
     - `http://localhost:3001/auth/callback/*`
     - `http://localhost:3000/auth/callback` (si frontend corre en mismo puerto que API)
   - **Valid post logout redirect URIs:**
     - `http://localhost:3001`
     - `http://localhost:3000`
   - **Web origins:**
     - `http://localhost:3001`
     - `http://localhost:3000`
   - Hacer clic en **Save**

### Paso 4: Habilitar PKCE (Recomendado y Obligatorio)

⚠️ **IMPORTANTE:** PKCE (Proof Key for Code Exchange) es obligatorio para clientes públicos por seguridad.

1. En la página del cliente "carecore-web", ir a la pestaña **Advanced settings**
2. Configurar:
   - **Proof Key for Code Exchange Code Challenge Method:** `S256` (SHA256)
   - **Proof Key for Code Exchange Code Challenge Method:** Habilitado (ON)
3. Hacer clic en **Save**

**Nota:** Si no ves la opción de PKCE, verifica que estés usando Keycloak 8.0+ o que la opción esté disponible en "Advanced settings".

### Paso 5: Configurar Access Token Settings

1. En la pestaña **Advanced settings**, configurar:
   - **Access token lifespan:** `15 minutes` (900 segundos)
   - **Client session idle timeout:** `30 minutes` (1800 segundos)
   - **Client session max lifespan:** `10 hours` (36000 segundos)
   - **Client signature algorithm:** `RS256` (recomendado)
2. Hacer clic en **Save**

### Paso 6: Verificar Configuración

1. En la pestaña **Settings**, verificar:
   - ✅ Access type: `public`
   - ✅ Standard flow: ON
   - ✅ Valid redirect URIs configurados
   - ✅ Web origins configurados

2. En la pestaña **Advanced settings**, verificar:
   - ✅ PKCE Code Challenge Method: `S256`
   - ✅ PKCE habilitado

## ✅ Verificación

### Verificar que el Cliente Existe

1. En **Clients**, verificar que "carecore-web" aparece en la lista
2. Verificar que el tipo es "public" (sin Client Secret)

### Verificar Configuración

1. Abrir el cliente "carecore-web"
2. Verificar en **Settings**:
   - ✅ Access type: public
   - ✅ Standard flow: ON
   - ✅ Direct access grants: OFF
   - ✅ Valid redirect URIs configurados
   - ✅ Web origins configurados

3. Verificar en **Advanced settings**:
   - ✅ PKCE Code Challenge Method: S256
   - ✅ PKCE habilitado

### Probar la Configuración (Opcional)

Puedes probar la configuración usando el Authorization Code Flow con PKCE desde el frontend. Esto requiere implementar el flujo OAuth2 en el frontend.

**Ejemplo de URL de autorización:**
```
http://localhost:8080/realms/carecore/protocol/openid-connect/auth?
  client_id=carecore-web&
  redirect_uri=http://localhost:3001/auth/callback&
  response_type=code&
  scope=openid profile email&
  code_challenge=<code_challenge>&
  code_challenge_method=S256
```

**Nota:** El `code_challenge` debe generarse en el frontend usando SHA256 del `code_verifier` aleatorio.

## 📝 Configuración Aplicada

### Settings Generales
- **Client ID:** carecore-web
- **Client Type:** OpenID Connect
- **Access Type:** public (sin Client Secret)
- **Standard Flow:** ON
- **Direct Access Grants:** OFF
- **PKCE:** ON (S256)

### URLs
- **Root URL:** http://localhost:3001
- **Valid Redirect URIs:**
  - http://localhost:3001/auth/callback
  - http://localhost:3001/auth/callback/*
  - http://localhost:3000/auth/callback (si aplica)
- **Web Origins:**
  - http://localhost:3001
  - http://localhost:3000

### Tokens
- **Access Token Lifespan:** 15 minutes
- **Client Session Idle:** 30 minutes
- **Client Session Max:** 10 hours
- **Signature Algorithm:** RS256

## 🔒 Seguridad

### PKCE (Proof Key for Code Exchange)

- ✅ **Obligatorio** para clientes públicos
- ✅ Previene ataques de interceptación de código de autorización
- ✅ Usa SHA256 para el code challenge
- ✅ El code_verifier debe ser aleatorio y seguro (mínimo 43 caracteres)

### Cliente Público

- ⚠️ **No tiene Client Secret** (por diseño)
- ⚠️ **Depende de PKCE** para seguridad
- ⚠️ **Validar redirect URIs** estrictamente
- ⚠️ **Usar HTTPS en producción** (nunca HTTP)

### Redirect URIs

- ⚠️ **Configurar solo URLs válidas** del frontend
- ⚠️ **No usar wildcards amplios** en producción
- ⚠️ **Validar que coincidan exactamente** con las URLs de la aplicación

### Variables de Entorno (Frontend)

El frontend necesitará estas variables (no en este repositorio, pero documentar):

```env
# Keycloak Web Client Configuration (Frontend)
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=carecore
KEYCLOAK_CLIENT_ID=carecore-web
KEYCLOAK_REDIRECT_URI=http://localhost:3001/auth/callback
```

**Nota:** Estas variables van en el frontend, no en la API.

## ✅ Validación sin Frontend

Para validar que el cliente está configurado correctamente sin tener un frontend:

**📖 Ver guía completa:** [CLIENT_WEB_VALIDATION.md](./CLIENT_WEB_VALIDATION.md)

**Método rápido:**
```bash
./scripts/verify-web-client.sh
```

Este script verifica toda la configuración del cliente automáticamente.

## 📚 Próximos Pasos

Después de configurar el cliente, continúa con:
- [Tarea #7: Definir roles base](../docs/tasks/PHASE1_KEYCLOAK_SETUP.md#tarea-7-definir-roles-base-en-keycloak)
- [Tarea #8: Documentar setup de Keycloak](../docs/tasks/PHASE1_KEYCLOAK_SETUP.md#tarea-8-documentar-setup-de-keycloak)
- [Fase 2: Integración NestJS](../docs/AUTH_IMPLEMENTATION_PLAN.md#fase-2-integración-nestjs)

## 🐛 Troubleshooting

### PKCE no está disponible

1. Verificar versión de Keycloak (8.0+)
2. Verificar que el cliente sea tipo "public"
3. Buscar en "Advanced settings" → "Proof Key for Code Exchange"

### Error "Invalid redirect URI"

1. Verificar que la URL en la petición coincida exactamente con las configuradas
2. Verificar que no haya espacios o caracteres especiales
3. Verificar que el protocolo (http/https) coincida
4. Verificar que el puerto coincida

### Error "Invalid code challenge"

1. Verificar que el code_challenge_method sea "S256"
2. Verificar que el code_challenge sea el SHA256 del code_verifier
3. Verificar que el code_verifier tenga al menos 43 caracteres
4. Verificar que el code_verifier sea aleatorio y seguro

### No puedo obtener tokens

1. Verificar que "Standard flow" esté habilitado
2. Verificar que PKCE esté configurado correctamente
3. Verificar que el redirect_uri coincida exactamente
4. Verificar logs de Keycloak para más detalles

## 📖 Referencias

- [Keycloak Client Configuration](https://www.keycloak.org/docs/latest/server_admin/#_clients)
- [OAuth2 PKCE](https://oauth.net/2/pkce/)
- [Keycloak PKCE Support](https://www.keycloak.org/docs/latest/securing_apps/#_oidc_pkce)
- [Public vs Confidential Clients](https://www.keycloak.org/docs/latest/server_admin/#_client_types)
