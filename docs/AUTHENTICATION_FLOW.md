# Flujo de Autenticación y Autorización

Esta documentación describe todos los flujos de autenticación y autorización implementados en CareCore API.

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Flujo de Login Básico (OAuth2/OIDC)](#flujo-de-login-básico-oauth2oidc)
3. [Flujo de Refresh Token](#flujo-de-refresh-token)
4. [Flujo de Logout](#flujo-de-logout)
5. [Flujo de Verificación de Practitioner](#flujo-de-verificación-de-practitioner)
6. [Flujo SMART on FHIR](#flujo-smart-on-fhir)
7. [Tokens JWT](#tokens-jwt)
8. [Scopes y Permisos](#scopes-y-permisos)
9. [Casos de Error Comunes](#casos-de-error-comunes)
10. [Troubleshooting](#troubleshooting)

---

## Visión General

CareCore API utiliza **OAuth2/OIDC** con **Keycloak** como Identity Provider (IdP) para autenticación y autorización. El sistema soporta múltiples flujos:

- **OAuth2 Authorization Code Flow**: Para aplicaciones web y móviles
- **SMART on FHIR**: Para integración con sistemas EHR
- **Token Refresh**: Para renovar tokens expirados
- **Logout**: Para cerrar sesión y revocar tokens

### Componentes Principales

- **Keycloak**: Identity Provider (IdP) que emite tokens JWT
- **CareCore API**: Resource Server que valida tokens y protege recursos
- **Frontend/Cliente**: Aplicación que inicia el flujo de autenticación

### Endpoints Principales

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/login` | POST | Inicia el flujo OAuth2 |
| `/api/auth/callback` | GET | Callback de Keycloak |
| `/api/auth/refresh` | POST | Renueva tokens |
| `/api/auth/logout` | POST | Cierra sesión |
| `/api/auth/user` | GET | Obtiene información del usuario |
| `/api/fhir/authorize` | GET | Launch SMART on FHIR |
| `/api/fhir/auth` | GET | Authorization SMART on FHIR |
| `/api/fhir/token` | POST | Token exchange SMART on FHIR |

---

## Flujo de Login Básico (OAuth2/OIDC)

El flujo de login utiliza el **OAuth2 Authorization Code Flow** con **OpenID Connect (OIDC)** para obtener tokens JWT.

### Diagrama de Flujo

```
┌─────────┐         ┌──────────────┐         ┌──────────┐
│ Cliente │         │ CareCore API │         │ Keycloak │
└────┬────┘         └──────┬───────┘         └────┬─────┘
     │                     │                      │
     │ 1. POST /auth/login │                      │
     │────────────────────>│                      │
     │                     │                      │
     │                     │ 2. Genera state token│
     │                     │    (CSRF protection) │
     │                     │                      │
     │ 3. Redirect 302     │                      │
     │<────────────────────│                      │
     │                     │                      │
     │ 4. GET /auth (Keycloak)                    │
     │───────────────────────────────────────────>│
     │                     │                      │
     │                     │ 5. Login form        │
     │                     │<─────────────────────│
     │                     │                      │
     │ 6. Usuario ingresa  │                      │
     │    credenciales     │                      │
     │───────────────────────────────────────────>│
     │                     │                      │
     │                     │ 7. Valida credenciales│
     │                     │<─────────────────────│
     │                     │                      │
     │ 8. Redirect con code│                      │
     │<───────────────────────────────────────────│
     │                     │                      │
     │ 9. GET /auth/callback?code=xxx&state=yyy   │
     │────────────────────>│                      │
     │                     │                      │
     │                     │ 10. Valida state     │
     │                     │     (CSRF check)     │
     │                     │                      │
     │                     │ 11. Exchange code    │
     │                     │     for tokens       │
     │                     │─────────────────────>│
     │                     │                      │
     │                     │ 12. Tokens (JWT)     │
     │                     │<─────────────────────│
     │                     │                      │
     │                     │ 13. Get user info    │
     │                     │─────────────────────>│
     │                     │                      │
     │                     │ 14. User info        │
     │                     │<─────────────────────│
     │                     │                      │
     │ 15. Redirect con    │                      │
     │     cookies (tokens)│                      │
     │<────────────────────│                      │
     │                     │                      │
```

### Paso a Paso

#### 1. Iniciar Login

El cliente hace una petición POST a `/api/auth/login`:

```http
POST /api/auth/login?returnUrl=true
```

**Respuesta (con `returnUrl=true`):**
```json
{
  "authorizationUrl": "http://keycloak:8080/realms/carecore/protocol/openid-connect/auth?client_id=carecore-api&response_type=code&redirect_uri=http://localhost:3000/api/auth/callback&scope=openid&state=abc123xyz",
  "state": "abc123xyz",
  "message": "Redirect to the authorizationUrl to complete login"
}
```

**Sin `returnUrl`:** El servidor redirige directamente (302) a Keycloak.

#### 2. Autenticación en Keycloak

El usuario es redirigido a Keycloak donde:
- Ingresa sus credenciales
- Keycloak valida las credenciales
- Si es válido, Keycloak redirige de vuelta con un `code`

#### 3. Callback

Keycloak redirige al callback con el código de autorización:

```http
GET /api/auth/callback?code=authorization_code_123&state=abc123xyz
Cookie: oauth_state=abc123xyz
```

El servidor:
1. Valida el `state` token (protección CSRF)
2. Intercambia el `code` por tokens JWT
3. Obtiene información del usuario
4. Establece cookies HTTP-only con los tokens
5. Redirige al frontend

**Cookies establecidas:**
- `access_token`: Token JWT de acceso (expira en ~5-15 minutos)
- `refresh_token`: Token para renovar el access token (expira en ~30 días)
- `oauth_state`: Se elimina después de la validación

**Redirección:**
```
http://frontend.com?auth=success
```

### Ejemplo Completo

```bash
# 1. Iniciar login
curl -X POST "http://localhost:3000/api/auth/login?returnUrl=true"

# Respuesta:
{
  "authorizationUrl": "http://keycloak:8080/realms/carecore/protocol/openid-connect/auth?...",
  "state": "state-token-123"
}

# 2. Abrir authorizationUrl en navegador
# 3. Usuario ingresa credenciales en Keycloak
# 4. Keycloak redirige a /api/auth/callback con code
# 5. API valida, intercambia tokens, y redirige al frontend
```

---

## Flujo de Refresh Token

Cuando un `access_token` expira, el cliente puede usar el `refresh_token` para obtener nuevos tokens sin requerir que el usuario vuelva a iniciar sesión.

### Diagrama de Flujo

```
┌─────────┐         ┌──────────────┐         ┌──────────┐
│ Cliente │         │ CareCore API │         │ Keycloak │
└────┬────┘         └──────┬───────┘         └────┬─────┘
     │                     │                      │
     │ 1. POST /auth/refresh                      │
     │    { refreshToken } │                      │
     │────────────────────>│                      │
     │                     │                      │
     │                     │ 2. Exchange refresh  │
     │                     │    token for new     │
     │                     │    tokens            │
     │                     │─────────────────────>│
     │                     │                      │
     │                     │ 3. New tokens        │
     │                     │<─────────────────────│
     │                     │                      │
     │ 4. New tokens       │                      │
     │<────────────────────│                      │
     │                     │                      │
```

### Paso a Paso

#### 1. Solicitar Refresh

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "refresh-token-xyz"
}
```

**O desde cookie:**
```http
POST /api/auth/refresh
Cookie: refresh_token=refresh-token-xyz
```

#### 2. Respuesta

```json
{
  "accessToken": "new-access-token-jwt",
  "refreshToken": "new-refresh-token-xyz",
  "expiresIn": 300,
  "tokenType": "Bearer"
}
```

### Ejemplo Completo

```bash
# Refresh token desde body
curl -X POST "http://localhost:3000/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "refresh-token-xyz"}'

# Refresh token desde cookie
curl -X POST "http://localhost:3000/api/auth/refresh" \
  -H "Cookie: refresh_token=refresh-token-xyz"
```

---

## Flujo de Logout

El logout revoca los tokens en Keycloak y limpia las cookies locales.

### Diagrama de Flujo

```
┌─────────┐         ┌──────────────┐         ┌──────────┐
│ Cliente │         │ CareCore API │         │ Keycloak │
└────┬────┘         └──────┬───────┘         └────┬─────┘
     │                     │                      │
     │ 1. POST /auth/logout                       │
     │    { refreshToken } │                      │
     │────────────────────>│                      │
     │                     │                      │
     │                     │ 2. Revoke tokens     │
     │                     │─────────────────────>│
     │                     │                      │
     │                     │ 3. Tokens revoked    │
     │                     │<─────────────────────│
     │                     │                      │
     │ 4. Cookies cleared  │                      │
     │<────────────────────│                      │
     │                     │                      │
```

### Paso a Paso

#### 1. Solicitar Logout

```http
POST /api/auth/logout
Content-Type: application/json

{
  "refreshToken": "refresh-token-xyz"
}
```

**O desde cookie:**
```http
POST /api/auth/logout
Cookie: refresh_token=refresh-token-xyz
```

#### 2. Respuesta

```json
{
  "message": "Logged out successfully"
}
```

**Cookies eliminadas:**
- `access_token`
- `refresh_token`

### Ejemplo Completo

```bash
curl -X POST "http://localhost:3000/api/auth/logout" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "refresh-token-xyz"}'
```

---

## Flujo de Verificación de Practitioner

Los practitioners pueden solicitar verificación de identidad subiendo documentos (cédula o licencia). Un admin revisa y aprueba/rechaza la solicitud.

### Diagrama de Flujo

```
┌──────────────┐         ┌──────────────┐         ┌──────────┐
│ Practitioner │         │ CareCore API │         │  Admin   │
└──────┬───────┘         └──────┬───────┘         └────┬─────┘
       │                        │                      │
       │ 1. POST /auth/verify-practitioner             │
       │    (documento: cédula/licencia)               │
       │───────────────────────>│                      │
       │                        │                      │
       │                        │ 2. Almacena doc      │
       │                        │    y crea solicitud  │
       │                        │                      │
       │ 3. { verificationId,    │                      │
       │     status: "pending" }│                      │
       │<───────────────────────│                      │
       │                        │                      │
       │                        │ 4. GET /auth/verify-practitioner │
       │                        │<─────────────────────│
       │                        │                      │
       │                        │ 5. Lista de          │
       │                        │    solicitudes       │
       │                        │─────────────────────>│
       │                        │                      │
       │                        │ 6. PUT /auth/verify-practitioner/:id/review │
       │                        │    { status: "approved" } │
       │                        │<─────────────────────│
       │                        │                      │
       │                        │ 7. Actualiza status  │
       │                        │    y roles en        │
       │                        │    Keycloak          │
       │                        │                      │
       │ 8. (Opcional)          │                      │
       │    GET /auth/verify-practitioner/:id          │
       │───────────────────────>│                      │
       │                        │                      │
       │ 9. Estado actualizado  │                      │
       │<───────────────────────│                      │
       │                        │                      │
```

### Paso a Paso

#### 1. Solicitar Verificación

```http
POST /api/auth/verify-practitioner
Authorization: Bearer <practitioner-token>
Content-Type: multipart/form-data

practitionerId: practitioner-123
documentType: cedula
documentFile: <archivo PDF/JPG/PNG>
additionalInfo: (opcional)
```

**Respuesta:**
```json
{
  "verificationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "message": "Verification request submitted successfully",
  "estimatedReviewTime": "2-3 business days"
}
```

#### 2. Admin Revisa Solicitudes

```http
GET /api/auth/verify-practitioner?status=pending&page=1&limit=10
Authorization: Bearer <admin-token>
```

**Respuesta:**
```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "practitionerId": "practitioner-123",
      "documentType": "cedula",
      "status": "pending",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10,
  "totalPages": 1
}
```

#### 3. Admin Aprueba/Rechaza

**Aprobar:**
```http
PUT /api/auth/verify-practitioner/:id/review
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "approved"
}
```

**Rechazar:**
```http
PUT /api/auth/verify-practitioner/:id/review
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "status": "rejected",
  "rejectionReason": "Document quality is insufficient"
}
```

**Respuesta:**
```json
{
  "verificationId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "approved",
  "reviewedBy": "admin-user-789",
  "reviewedAt": "2025-01-02T00:00:00Z",
  "message": "Verification approved successfully"
}
```

**Actualización Automática de Roles:**
- Al aprobar: Se agrega el rol `practitioner-verified` en Keycloak
- Al rechazar: Se remueve el rol `practitioner-verified` (si existe)

---

## Flujo SMART on FHIR

SMART on FHIR permite que aplicaciones externas se integren con CareCore API usando el estándar SMART on FHIR.

### Diagrama de Flujo (EHR Launch)

```
┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────────┐
│   EHR    │    │ CareCore API │    │ Keycloak │    │  SMART App   │
└────┬─────┘    └──────┬───────┘    └────┬─────┘    └──────┬───────┘
     │                 │                 │                 │
     │ 1. Launch app   │                 │                 │
     │    (con launch  │                 │                 │
     │     context)    │                 │                 │
     │────────────────>│                 │                 │
     │                 │                 │                 │
     │                 │ 2. GET /fhir/authorize            │
     │                 │    (launch token)                 │
     │                 │<──────────────────────────────────│
     │                 │                 │                 │
     │                 │ 3. Valida launch │                │
     │                 │    y almacena    │                │
     │                 │    contexto      │                │
     │                 │                 │                 │
     │                 │ 4. GET /fhir/auth                 │
     │                 │    (redirect)   │                 │
     │                 │──────────────────────────────────>│
     │                 │                 │                 │
     │                 │                 │ 5. Usuario      │
     │                 │                 │    autentica    │
     │                 │                 │<────────────────│
     │                 │                 │                 │
     │                 │                 │ 6. Authorization│
     │                 │                 │    code         │
     │                 │                 │────────────────>│
     │                 │                 │                 │
     │                 │ 7. POST /fhir/token               │
     │                 │    (code + client_secret)         │
     │                 │<──────────────────────────────────│
     │                 │                 │                 │
     │                 │ 8. Exchange code│                 │
     │                 │    for tokens   │                 │
     │                 │────────────────>│                 │
     │                 │                 │                 │
     │                 │ 9. Tokens +     │                 │
     │                 │    patient context                │
     │                 │<────────────────│                 │
     │                 │                 │                 │
     │                 │ 10. Token response                │
     │                 │     (con patient context)         │
     │                 │──────────────────────────────────>│
     │                 │                 │                 │
```

### Paso a Paso

#### 1. Launch Sequence

El EHR inicia la aplicación SMART con un launch token:

```http
GET /api/fhir/authorize?iss=https://carecore.example.com&launch=launch-token-123&client_id=smart-app&redirect_uri=https://app.com/callback&scope=patient:read patient:write
```

**El servidor:**
1. Valida el launch token
2. Extrae el contexto (patient, encounter, etc.)
3. Almacena el contexto temporalmente
4. Redirige a `/api/fhir/auth` con el contexto codificado en el `state`

#### 2. Authorization

```http
GET /api/fhir/auth?client_id=smart-app&response_type=code&redirect_uri=https://app.com/callback&scope=patient:read patient:write&state=encoded-state
```

**El servidor redirige a Keycloak** para autenticación del usuario.

#### 3. Token Exchange

Después de la autenticación, Keycloak redirige con un `code`:

```http
POST /api/fhir/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code
&code=authorization-code-123
&redirect_uri=https://app.com/callback
&client_id=smart-app
&client_secret=client-secret-xyz
```

**Respuesta:**
```json
{
  "access_token": "jwt-token-xyz",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh-token-xyz",
  "scope": "patient:read patient:write",
  "patient": "patient-123"
}
```

**Nota:** El `patient` context se incluye automáticamente si está disponible en el launch context.

### Ejemplo Completo

```bash
# 1. Launch desde EHR
curl "http://localhost:3000/api/fhir/authorize?iss=https://carecore.example.com&launch=launch-token&client_id=smart-app&redirect_uri=https://app.com/callback&scope=patient:read"

# 2. Usuario autentica en Keycloak (redirección automática)

# 3. Token exchange
curl -X POST "http://localhost:3000/api/fhir/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&code=code-123&redirect_uri=https://app.com/callback&client_id=smart-app&client_secret=secret-xyz"
```

---

## Tokens JWT

### Estructura del Token

Un JWT tiene tres partes separadas por puntos (`.`):

```
header.payload.signature
```

#### Header

```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-id-123"
}
```

#### Payload (Claims)

```json
{
  "sub": "user-uuid",
  "preferred_username": "john.doe",
  "email": "john.doe@example.com",
  "name": "John Doe",
  "given_name": "John",
  "family_name": "Doe",
  "realm_access": {
    "roles": ["patient", "user"]
  },
  "scope": "openid profile email",
  "patient": "patient-123",
  "fhirUser": "Practitioner/practitioner-456",
  "iat": 1234567890,
  "exp": 1234571490,
  "iss": "http://keycloak:8080/realms/carecore",
  "aud": "carecore-api"
}
```

### Claims Importantes

| Claim | Descripción |
|-------|-------------|
| `sub` | Subject (ID del usuario en Keycloak) |
| `preferred_username` | Nombre de usuario |
| `email` | Email del usuario |
| `realm_access.roles` | Roles del usuario |
| `scope` | Scopes OAuth2 otorgados |
| `patient` | ID del paciente (SMART on FHIR) |
| `fhirUser` | Recurso FHIR del usuario |
| `exp` | Expiración (timestamp Unix) |
| `iss` | Issuer (Keycloak realm URL) |
| `aud` | Audience (client ID) |

### Validación del Token

El servidor valida tokens verificando:

1. **Firma**: Usando la clave pública de Keycloak
2. **Expiración**: `exp` debe ser mayor que el tiempo actual
3. **Issuer**: `iss` debe coincidir con `KEYCLOAK_URL/realms/KEYCLOAK_REALM`
4. **Audience**: `aud` debe coincidir con `KEYCLOAK_CLIENT_ID`

### Decodificar Token (Solo para Testing)

⚠️ **ADVERTENCIA**: Solo decodifica tokens de prueba, nunca tokens de producción.

Puedes usar [jwt.io](https://jwt.io) para decodificar tokens (sin verificar la firma).

---

## Scopes y Permisos

### Scopes OAuth2

Los scopes definen qué permisos tiene el token:

| Scope | Descripción |
|-------|-------------|
| `openid` | Requerido para OIDC |
| `profile` | Información del perfil del usuario |
| `email` | Email del usuario |
| `patient:read` | Leer recursos Patient |
| `patient:write` | Crear/actualizar recursos Patient |
| `practitioner:read` | Leer recursos Practitioner |
| `practitioner:write` | Crear/actualizar recursos Practitioner |
| `encounter:read` | Leer recursos Encounter |
| `encounter:write` | Crear/actualizar recursos Encounter |

### Scopes SMART on FHIR

Los scopes SMART on FHIR pueden incluir contexto de paciente:

- `patient/123.read`: Leer recursos del paciente 123
- `patient/123.write`: Escribir recursos del paciente 123
- `user/Practitioner/456.read`: Leer recursos del practitioner 456

### Roles

Los roles definen el tipo de usuario:

| Rol | Descripción |
|-----|-------------|
| `patient` | Paciente |
| `practitioner` | Profesional de la salud |
| `practitioner-verified` | Practitioner verificado |
| `admin` | Administrador |

### Permisos por Rol

| Recurso | patient | practitioner | admin |
|---------|---------|--------------|-------|
| Patient (propio) | R/W | R | R/W |
| Patient (otros) | - | R | R/W |
| Practitioner | R | R/W (propio) | R/W |
| Encounter (propio) | R | R/W | R/W |
| Encounter (otros) | - | R | R/W |

**Leyenda:**
- `R`: Read (lectura)
- `W`: Write (escritura)
- `-`: Sin acceso

---

## Casos de Error Comunes

### 401 Unauthorized

**Causas:**
- Token no proporcionado
- Token expirado
- Token inválido o malformado
- Token de otro issuer

**Solución:**
```bash
# Verificar que el token esté en el header
Authorization: Bearer <token>

# Refrescar el token si expiró
POST /api/auth/refresh
```

### 403 Forbidden

**Causas:**
- Usuario no tiene el rol requerido
- Usuario no tiene el scope requerido
- MFA requerido pero no configurado

**Solución:**
- Verificar roles en Keycloak
- Verificar scopes en la solicitud
- Configurar MFA si es requerido

### 400 Bad Request

**Causas:**
- Parámetros faltantes
- Parámetros inválidos
- State token inválido (CSRF)

**Solución:**
- Verificar que todos los parámetros requeridos estén presentes
- Verificar formato de parámetros
- Asegurar que el state token coincida

### Token Expired

**Síntoma:**
```json
{
  "statusCode": 401,
  "message": "Token expired"
}
```

**Solución:**
```bash
# Refrescar el token
POST /api/auth/refresh
{
  "refreshToken": "refresh-token-xyz"
}
```

### Invalid State Token

**Síntoma:**
```json
{
  "statusCode": 401,
  "message": "State token mismatch"
}
```

**Causa:** Posible ataque CSRF o state token no coincide.

**Solución:**
- Iniciar el flujo de login nuevamente
- Asegurar que las cookies estén habilitadas

---

## Troubleshooting

### El usuario no puede iniciar sesión

1. **Verificar Keycloak:**
   ```bash
   # Verificar que Keycloak esté corriendo
   curl http://keycloak:8080/health
   ```

2. **Verificar configuración:**
   ```bash
   # Variables de entorno requeridas
   KEYCLOAK_URL=http://keycloak:8080
   KEYCLOAK_REALM=carecore
   KEYCLOAK_CLIENT_ID=carecore-api
   KEYCLOAK_CLIENT_SECRET=client-secret
   ```

3. **Verificar logs:**
   ```bash
   # Ver logs de la aplicación
   docker logs carecore-api
   ```

### Los tokens no se validan correctamente

1. **Verificar issuer:**
   - El `iss` en el token debe coincidir con `KEYCLOAK_URL/realms/KEYCLOAK_REALM`

2. **Verificar audience:**
   - El `aud` en el token debe coincidir con `KEYCLOAK_CLIENT_ID`

3. **Verificar clave pública:**
   - El servidor debe poder obtener la clave pública de Keycloak
   - Verificar conectividad: `curl http://keycloak:8080/realms/carecore/.well-known/openid-configuration`

### El refresh token no funciona

1. **Verificar que el refresh token no haya expirado** (típicamente 30 días)

2. **Verificar que el refresh token no haya sido revocado** (logout)

3. **Verificar formato:**
   ```bash
   # El refresh token debe ser una cadena válida
   POST /api/auth/refresh
   {
     "refreshToken": "valid-refresh-token"
   }
   ```

### SMART on FHIR no funciona

1. **Verificar launch token:**
   - El launch token debe ser válido y decodificable

2. **Verificar cliente SMART:**
   - El `client_id` debe existir en Keycloak
   - El `redirect_uri` debe estar registrado

3. **Verificar scopes:**
   - Los scopes deben ser válidos según el estándar SMART on FHIR

### El practitioner no puede subir documentos

1. **Verificar rol:**
   - El usuario debe tener rol `practitioner` o `admin`

2. **Verificar tamaño de archivo:**
   - Máximo 10MB

3. **Verificar tipo de archivo:**
   - Solo PDF, JPG, PNG

4. **Verificar permisos de almacenamiento:**
   - El directorio de almacenamiento debe ser escribible

---

## Referencias

- [OAuth2 Specification](https://oauth.net/2/)
- [OpenID Connect Specification](https://openid.net/connect/)
- [SMART on FHIR Specification](http://hl7.org/fhir/smart-app-launch/)
- [JWT.io](https://jwt.io) - Decodificar tokens (solo testing)
- [Keycloak Documentation](https://www.keycloak.org/documentation)

---

## Apéndice: Ejemplos de Código

### JavaScript/TypeScript (Frontend)

```typescript
// Iniciar login
async function login() {
  const response = await fetch('/api/auth/login?returnUrl=true', {
    method: 'POST',
  });
  const { authorizationUrl } = await response.json();
  window.location.href = authorizationUrl;
}

// Refrescar token
async function refreshToken(refreshToken: string) {
  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  return await response.json();
}

// Usar token en requests
async function fetchProtectedResource() {
  const response = await fetch('/api/fhir/Patient', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return await response.json();
}
```

### cURL

```bash
# Login
curl -X POST "http://localhost:3000/api/auth/login?returnUrl=true"

# Refresh
curl -X POST "http://localhost:3000/api/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "refresh-token"}'

# Request protegido
curl "http://localhost:3000/api/fhir/Patient" \
  -H "Authorization: Bearer access-token"
```

---

**Última actualización:** 2025-12-12

