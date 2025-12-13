# Guía de Integración SMART on FHIR

Esta guía proporciona documentación exhaustiva sobre cómo integrar aplicaciones externas con CareCore API usando el estándar SMART on FHIR.

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [¿Qué es SMART on FHIR?](#qué-es-smart-on-fhir)
3. [Requisitos Previos](#requisitos-previos)
4. [Registro de Aplicación](#registro-de-aplicación)
5. [Flujo de Integración](#flujo-de-integración)
6. [Endpoints SMART on FHIR](#endpoints-smart-on-fhir)
7. [Scopes y Permisos](#scopes-y-permisos)
8. [Contexto de Paciente](#contexto-de-paciente)
9. [Ejemplos de Integración](#ejemplos-de-integración)
10. [Troubleshooting](#troubleshooting)
11. [Mejores Prácticas](#mejores-prácticas)

---

## Introducción

SMART on FHIR es un estándar abierto que permite a aplicaciones externas integrarse de forma segura con sistemas de salud que implementan FHIR. CareCore API implementa el perfil SMART on FHIR para permitir que aplicaciones de terceros accedan a datos clínicos de pacientes de forma segura y estándar.

### Casos de Uso

- **Aplicaciones de Laboratorio**: Subir resultados de análisis
- **Aplicaciones Clínicas**: Acceder a historiales médicos para segunda opinión
- **Aplicaciones de Telemedicina**: Consultar datos del paciente durante consultas virtuales
- **Aplicaciones de Aseguradoras**: Verificar información para autorizaciones
- **Aplicaciones de Investigación**: Acceder a datos anonimizados con consentimiento

---

## ¿Qué es SMART on FHIR?

SMART on FHIR es un perfil de OAuth2/OIDC diseñado específicamente para aplicaciones de salud. Extiende OAuth2 con:

1. **Launch Context**: Contexto clínico (paciente, encuentro, practitioner) incluido en el flujo de autorización
2. **Scopes Granulares**: Permisos específicos por recurso y acción (ej: `patient:read`, `patient:write`)
3. **Patient Context**: Identificación del paciente en el token para filtrado automático
4. **CapabilityStatement**: Metadata del servidor FHIR con información de endpoints OAuth2

### Estándares Utilizados

- **OAuth2 Authorization Code Flow**: Para autenticación segura
- **OpenID Connect (OIDC)**: Para identidad del usuario
- **FHIR R4**: Para recursos de salud
- **SMART App Launch**: Para launch sequence

---

## Requisitos Previos

### Para Desarrolladores

1. **Conocimiento de OAuth2/OIDC**: Entender el flujo de Authorization Code
2. **Conocimiento de FHIR**: Familiaridad con recursos FHIR (Patient, Encounter, etc.)
3. **Cliente OAuth2**: Aplicación capaz de realizar flujos OAuth2
4. **HTTPS**: Requerido en producción (no requerido en desarrollo local)

### Para la Aplicación

1. **URL de Callback**: URL donde el servidor redirigirá después de la autorización
2. **Client ID y Secret**: Credenciales OAuth2 proporcionadas por CareCore
3. **Scopes Solicitados**: Lista de permisos que la aplicación necesita

---

## Registro de Aplicación

### Paso 1: Solicitar Registro

Contacta al administrador de CareCore para registrar tu aplicación. Proporciona:

- **Nombre de la aplicación**
- **URL de callback** (donde redirigir después de autorización)
- **Scopes requeridos** (ej: `patient:read`, `encounter:read`)
- **Tipo de aplicación** (standalone, EHR launch, o ambos)

### Paso 2: Configuración en Keycloak

El administrador creará un cliente OAuth2 en Keycloak con:

- **Client ID**: Identificador único de tu aplicación
- **Client Secret**: Credencial secreta (para clientes confidential)
- **Redirect URIs**: URLs permitidas para callbacks
- **Scopes**: Permisos asignados a tu aplicación

### Paso 3: Obtener Credenciales

Recibirás:

- **Client ID**: `your-app-client-id`
- **Client Secret**: `your-app-client-secret` (si es confidential)
- **Authorization URL**: `https://carecore.example.com/api/fhir/auth`
- **Token URL**: `https://carecore.example.com/api/fhir/token`
- **FHIR Base URL**: `https://carecore.example.com/api/fhir`

---

## Flujo de Integración

### Flujo 1: Standalone Launch

Para aplicaciones que se inician independientemente (no desde un EHR):

```
┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────────┐
│   App    │    │ CareCore API │    │ Keycloak │    │   Usuario    │
└────┬─────┘    └──────┬───────┘    └────┬─────┘    └──────┬───────┘
     │                 │                 │                 │
     │ 1. GET /fhir/auth                 │                 │
     │────────────────>│                 │                 │
     │                 │                 │                 │
     │                 │ 2. Redirect     │                 │
     │                 │────────────────>│                 │
     │                 │                 │                 │
     │                 │                 │ 3. Login form   │
     │                 │                 │<────────────────│
     │                 │                 │                 │
     │                 │                 │ 4. Credentials  │
     │                 │                 │────────────────>│
     │                 │                 │                 │
     │                 │ 5. Authorization code             │
     │                 │<────────────────│                 │
     │                 │                 │                 │
     │ 6. Redirect with code             │                 │
     │<────────────────│                 │                 │
     │                 │                 │                 │
     │ 7. POST /fhir/token               │                 │
     │────────────────>│                 │                 │
     │                 │                 │                 │
     │                 │ 8. Exchange code │                │
     │                 │────────────────>│                 │
     │                 │                 │                 │
     │                 │ 9. Tokens       │                 │
     │                 │<────────────────│                 │
     │                 │                 │                 │
     │ 10. Access token│                 │                 │
     │<────────────────│                 │                 │
     │                 │                 │                 │
     │ 11. GET /fhir/Patient             │                 │
     │────────────────>│                 │                 │
     │                 │                 │                 │
     │ 12. Patient data│                 │                 │
     │<────────────────│                 │                 │
     │                 │                 │                 │
```

### Flujo 2: EHR Launch

Para aplicaciones que se inician desde un EHR con contexto clínico:

```
┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────────┐
│   EHR    │    │ CareCore API │    │ Keycloak │    │   Usuario    │
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
     │                 │ 3. Valida launch│                 │
     │                 │    y almacena   │                 │
     │                 │    contexto     │                 │
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

---

## Endpoints SMART on FHIR

### 1. GET /api/fhir/authorize (Launch)

Inicia el flujo de launch desde un EHR.

**URL:** `GET /api/fhir/authorize`

**Parámetros de Query:**

| Parámetro | Requerido | Descripción | Ejemplo |
|-----------|-----------|-------------|---------|
| `iss` | ✅ | URL del servidor FHIR | `https://carecore.example.com` |
| `launch` | ✅ | Launch token del EHR | `launch-token-123` |
| `client_id` | ✅ | Client ID de la aplicación | `smart-app-123` |
| `redirect_uri` | ✅ | URL de callback | `https://app.com/callback` |
| `scope` | ✅ | Scopes solicitados | `patient:read patient:write` |
| `state` | ❌ | Token CSRF | `abc123xyz` |

**Ejemplo de Request:**

```http
GET /api/fhir/authorize?iss=https://carecore.example.com&launch=launch-token-123&client_id=smart-app-123&redirect_uri=https://app.com/callback&scope=patient:read%20patient:write&state=abc123
```

**Respuesta:**

- **302 Redirect**: Redirige a `/api/fhir/auth` con el contexto codificado

**Errores:**

- **400 Bad Request**: Parámetros inválidos (retorna OperationOutcome)
- **401 Unauthorized**: Cliente no encontrado o no autorizado

---

### 2. GET /api/fhir/auth (Authorization)

Endpoint de autorización OAuth2.

**URL:** `GET /api/fhir/auth`

**Parámetros de Query:**

| Parámetro | Requerido | Descripción | Ejemplo |
|-----------|-----------|-------------|---------|
| `client_id` | ✅ | Client ID de la aplicación | `smart-app-123` |
| `response_type` | ✅ | Debe ser `code` | `code` |
| `redirect_uri` | ✅ | URL de callback | `https://app.com/callback` |
| `scope` | ✅ | Scopes solicitados | `patient:read patient:write` |
| `state` | ❌ | Token CSRF | `abc123xyz` |
| `aud` | ❌ | Audience (URL del servidor FHIR) | `https://carecore.example.com` |

**Ejemplo de Request:**

```http
GET /api/fhir/auth?client_id=smart-app-123&response_type=code&redirect_uri=https://app.com/callback&scope=patient:read%20patient:write&state=abc123&aud=https://carecore.example.com
```

**Respuesta:**

- **302 Redirect**: Redirige a Keycloak para autenticación

**Errores:**

- **400 Bad Request**: Parámetros inválidos (retorna OperationOutcome)
- **401 Unauthorized**: Cliente no encontrado o redirect_uri no válido

---

### 3. POST /api/fhir/token (Token Exchange)

Intercambia código de autorización por tokens.

**URL:** `POST /api/fhir/token`

**Content-Type:** `application/x-www-form-urlencoded`

**Parámetros del Body:**

| Parámetro | Requerido | Descripción | Ejemplo |
|-----------|-----------|-------------|---------|
| `grant_type` | ✅ | `authorization_code` o `refresh_token` | `authorization_code` |
| `code` | ✅* | Código de autorización | `auth-code-123` |
| `redirect_uri` | ✅* | Debe coincidir con el usado en `/auth` | `https://app.com/callback` |
| `client_id` | ✅ | Client ID de la aplicación | `smart-app-123` |
| `client_secret` | ✅ | Client secret (para confidential clients) | `secret-xyz` |
| `refresh_token` | ✅** | Refresh token (para grant_type=refresh_token) | `refresh-token-xyz` |

\* Requerido para `grant_type=authorization_code`
\** Requerido para `grant_type=refresh_token`

**Ejemplo de Request:**

```http
POST /api/fhir/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=auth-code-123&redirect_uri=https://app.com/callback&client_id=smart-app-123&client_secret=secret-xyz
```

**Respuesta Exitosa (200 OK):**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh-token-xyz",
  "scope": "patient:read patient:write",
  "patient": "patient-123"
}
```

**Campos de la Respuesta:**

- `access_token`: Token JWT para acceder a recursos FHIR
- `token_type`: Siempre `Bearer`
- `expires_in`: Tiempo de vida del token en segundos (típicamente 3600 = 1 hora)
- `refresh_token`: Token para renovar el access token (opcional)
- `scope`: Scopes otorgados (puede ser un subconjunto de los solicitados)
- `patient`: ID del paciente (si está disponible en launch context)

**Errores:**

- **400 Bad Request**: Parámetros inválidos
  ```json
  {
    "error": "invalid_request",
    "error_description": "grant_type is required"
  }
  ```

- **401 Unauthorized**: Cliente no encontrado o código inválido
  ```json
  {
    "error": "invalid_client",
    "error_description": "Client not found"
  }
  ```

---

### 4. GET /api/fhir/metadata (CapabilityStatement)

Obtiene metadata del servidor FHIR incluyendo información de endpoints SMART on FHIR.

**URL:** `GET /api/fhir/metadata`

**Ejemplo de Request:**

```http
GET /api/fhir/metadata
```

**Respuesta (200 OK):**

```json
{
  "resourceType": "CapabilityStatement",
  "fhirVersion": "4.0.1",
  "rest": [
    {
      "mode": "server",
      "security": {
        "extension": [
          {
            "url": "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
            "extension": [
              {
                "url": "authorize",
                "valueUri": "https://carecore.example.com/api/fhir/auth"
              },
              {
                "url": "token",
                "valueUri": "https://carecore.example.com/api/fhir/token"
              }
            ]
          }
        ],
        "service": [
          {
            "coding": [
              {
                "system": "http://hl7.org/fhir/restful-security-service",
                "code": "SMART-on-FHIR",
                "display": "OAuth2 using SMART-on-FHIR profile"
              }
            ]
          }
        ]
      },
      "resource": [
        {
          "type": "Patient",
          "interaction": [
            { "code": "read" },
            { "code": "search-type" }
          ]
        }
      ]
    }
  ]
}
```

---

## Scopes y Permisos

### Scopes Disponibles

| Scope | Recurso | Acción | Descripción |
|-------|---------|--------|-------------|
| `patient:read` | Patient | Read | Leer recursos Patient |
| `patient:write` | Patient | Write | Crear/actualizar recursos Patient |
| `practitioner:read` | Practitioner | Read | Leer recursos Practitioner |
| `practitioner:write` | Practitioner | Write | Crear/actualizar recursos Practitioner |
| `encounter:read` | Encounter | Read | Leer recursos Encounter |
| `encounter:write` | Encounter | Write | Crear/actualizar recursos Encounter |
| `document:read` | DocumentReference | Read | Leer recursos DocumentReference |
| `document:write` | DocumentReference | Write | Crear/actualizar recursos DocumentReference |
| `consent:read` | Consent | Read | Leer recursos Consent |
| `consent:write` | Consent | Write | Crear/actualizar recursos Consent |
| `consent:share` | Consent | Share | Compartir consentimientos |

### Scopes SMART on FHIR con Contexto

Los scopes pueden incluir contexto de paciente:

- `patient/123.read`: Leer recursos del paciente 123
- `patient/123.write`: Escribir recursos del paciente 123
- `user/Practitioner/456.read`: Leer recursos del practitioner 456

### Solicitar Scopes

En el request de autorización:

```http
GET /api/fhir/auth?scope=patient:read%20patient:write%20encounter:read
```

**Nota:** Los scopes se separan por espacios y se codifican en URL.

### Validación de Scopes

El servidor valida que:
1. Los scopes solicitados estén disponibles
2. El cliente tenga permisos para esos scopes
3. El usuario tenga permisos para acceder a los recursos

---

## Contexto de Paciente

### Patient Context en Tokens

Cuando una aplicación se lanza desde un EHR con contexto de paciente, el token incluye el ID del paciente:

```json
{
  "access_token": "...",
  "patient": "patient-123"
}
```

### Uso del Patient Context

El servidor automáticamente filtra recursos según el contexto de paciente:

```http
GET /api/fhir/Patient
Authorization: Bearer <token-con-paciente-123>
```

**Respuesta:** Solo retorna el paciente 123, incluso si el usuario tiene permisos para ver otros pacientes.

### Extraer Patient Context del Token

El patient context también está disponible en el JWT:

```json
{
  "sub": "user-uuid",
  "patient": "patient-123",
  "scope": "patient:read patient:write"
}
```

---

## Ejemplos de Integración

### Ejemplo 1: JavaScript/TypeScript (Frontend)

```typescript
class SmartFhirClient {
  constructor(
    private clientId: string,
    private clientSecret: string,
    private redirectUri: string,
    private fhirBaseUrl: string,
  ) {}

  // Paso 1: Iniciar autorización
  async authorize(scopes: string[]): Promise<void> {
    const state = this.generateStateToken();
    sessionStorage.setItem('oauth_state', state);

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state: state,
      aud: this.fhirBaseUrl,
    });

    window.location.href = `${this.fhirBaseUrl}/auth?${params.toString()}`;
  }

  // Paso 2: Intercambiar código por token
  async exchangeCodeForToken(code: string, state: string): Promise<TokenResponse> {
    const storedState = sessionStorage.getItem('oauth_state');
    if (state !== storedState) {
      throw new Error('Invalid state token');
    }

    const response = await fetch(`${this.fhirBaseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: this.redirectUri,
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error_description || 'Token exchange failed');
    }

    return await response.json();
  }

  // Paso 3: Usar token para acceder a recursos
  async getPatient(patientId: string, accessToken: string): Promise<Patient> {
    const response = await fetch(`${this.fhirBaseUrl}/Patient/${patientId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/fhir+json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch patient');
    }

    return await response.json();
  }

  // Generar state token para CSRF protection
  private generateStateToken(): string {
    return btoa(Math.random().toString()).substring(0, 32);
  }
}

// Uso
const client = new SmartFhirClient(
  'smart-app-123',
  'secret-xyz',
  'https://app.com/callback',
  'https://carecore.example.com/api/fhir',
);

// Iniciar autorización
await client.authorize(['patient:read', 'encounter:read']);

// En el callback (después de redirección)
const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

if (code && state) {
  const tokens = await client.exchangeCodeForToken(code, state);
  const patient = await client.getPatient(tokens.patient, tokens.access_token);
  console.log(patient);
}
```

### Ejemplo 2: Python

```python
import requests
import secrets
import urllib.parse

class SmartFhirClient:
    def __init__(self, client_id, client_secret, redirect_uri, fhir_base_url):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.fhir_base_url = fhir_base_url
        self.state = None

    def authorize(self, scopes):
        """Inicia el flujo de autorización"""
        self.state = secrets.token_urlsafe(32)

        params = {
            'client_id': self.client_id,
            'response_type': 'code',
            'redirect_uri': self.redirect_uri,
            'scope': ' '.join(scopes),
            'state': self.state,
            'aud': self.fhir_base_url,
        }

        auth_url = f"{self.fhir_base_url}/auth?{urllib.parse.urlencode(params)}"
        print(f"Redirect to: {auth_url}")
        return auth_url

    def exchange_code_for_token(self, code, state):
        """Intercambia código por token"""
        if state != self.state:
            raise ValueError("Invalid state token")

        response = requests.post(
            f"{self.fhir_base_url}/token",
            data={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': self.redirect_uri,
                'client_id': self.client_id,
                'client_secret': self.client_secret,
            },
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
        )

        response.raise_for_status()
        return response.json()

    def get_patient(self, patient_id, access_token):
        """Obtiene un paciente usando el token"""
        response = requests.get(
            f"{self.fhir_base_url}/Patient/{patient_id}",
            headers={
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/fhir+json',
            },
        )

        response.raise_for_status()
        return response.json()

# Uso
client = SmartFhirClient(
    'smart-app-123',
    'secret-xyz',
    'https://app.com/callback',
    'https://carecore.example.com/api/fhir',
)

# Iniciar autorización
auth_url = client.authorize(['patient:read', 'encounter:read'])

# Después de que el usuario autorice, obtener código del callback
code = 'auth-code-from-callback'
state = 'state-from-callback'

# Intercambiar código por token
tokens = client.exchange_code_for_token(code, state)
print(f"Access token: {tokens['access_token']}")
print(f"Patient context: {tokens.get('patient')}")

# Usar token para acceder a recursos
if tokens.get('patient'):
    patient = client.get_patient(tokens['patient'], tokens['access_token'])
    print(f"Patient: {patient['name'][0]['given'][0]} {patient['name'][0]['family']}")
```

### Ejemplo 3: cURL

```bash
# Paso 1: Obtener authorization URL
AUTH_URL="https://carecore.example.com/api/fhir/auth?client_id=smart-app-123&response_type=code&redirect_uri=https://app.com/callback&scope=patient:read%20patient:write&state=abc123"

# Abrir en navegador o seguir redirect
curl -L "$AUTH_URL"

# Paso 2: Después de autorización, intercambiar código por token
CODE="auth-code-from-callback"

curl -X POST "https://carecore.example.com/api/fhir/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=$CODE" \
  -d "redirect_uri=https://app.com/callback" \
  -d "client_id=smart-app-123" \
  -d "client_secret=secret-xyz"

# Respuesta:
# {
#   "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
#   "token_type": "Bearer",
#   "expires_in": 3600,
#   "refresh_token": "refresh-token-xyz",
#   "scope": "patient:read patient:write",
#   "patient": "patient-123"
# }

# Paso 3: Usar token para acceder a recursos
ACCESS_TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

curl "https://carecore.example.com/api/fhir/Patient/patient-123" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Accept: application/fhir+json"
```

### Ejemplo 4: EHR Launch

```typescript
// Cuando el EHR lanza la aplicación
const launchParams = new URLSearchParams(window.location.search);
const launchToken = launchParams.get('launch');
const iss = launchParams.get('iss');

if (launchToken && iss) {
  // Iniciar launch sequence
  const launchUrl = `${iss}/api/fhir/authorize?` +
    `iss=${encodeURIComponent(iss)}&` +
    `launch=${encodeURIComponent(launchToken)}&` +
    `client_id=smart-app-123&` +
    `redirect_uri=${encodeURIComponent('https://app.com/callback')}&` +
    `scope=patient:read%20patient:write&` +
    `state=${generateStateToken()}`;

  window.location.href = launchUrl;
}
```

---

## Troubleshooting

### Error: "invalid_client"

**Causa:** El `client_id` no existe o el `client_secret` es incorrecto.

**Solución:**
1. Verificar que el `client_id` sea correcto
2. Verificar que el `client_secret` sea correcto (si es confidential)
3. Contactar al administrador para verificar la configuración del cliente

### Error: "invalid_grant"

**Causa:** El código de autorización es inválido o ha expirado.

**Solución:**
1. Los códigos de autorización expiran rápidamente (típicamente 1-5 minutos)
2. Intercambiar el código inmediatamente después de recibirlo
3. No reutilizar códigos (cada código solo se puede usar una vez)

### Error: "redirect_uri_mismatch"

**Causa:** El `redirect_uri` usado en `/token` no coincide con el usado en `/auth`.

**Solución:**
1. Asegurar que el `redirect_uri` sea exactamente el mismo en ambos requests
2. Verificar que el `redirect_uri` esté registrado en Keycloak para el cliente

### Error: "insufficient_scope"

**Causa:** El token no tiene los scopes requeridos para el recurso.

**Solución:**
1. Verificar que los scopes solicitados estén disponibles
2. Solicitar los scopes necesarios en el request de autorización
3. Verificar que el cliente tenga permisos para esos scopes

### Error: "invalid_scope"

**Causa:** Uno o más scopes solicitados no son válidos.

**Solución:**
1. Verificar la lista de scopes disponibles
2. Asegurar que los scopes sigan el formato `resource:action`
3. Verificar que no haya espacios o caracteres inválidos

### Token Expired

**Síntoma:** Error 401 al usar el token.

**Solución:**
```typescript
// Refrescar el token
const response = await fetch(`${fhirBaseUrl}/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: oldRefreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  }),
});

const newTokens = await response.json();
```

### Patient Context No Disponible

**Causa:** La aplicación no se lanzó desde un EHR o el launch token no contenía contexto de paciente.

**Solución:**
1. Verificar que el launch token sea válido
2. Para standalone launch, el patient context no está disponible automáticamente
3. El usuario puede seleccionar el paciente manualmente si es necesario

---

## Mejores Prácticas

### 1. Seguridad

- ✅ **Usar HTTPS**: Siempre en producción
- ✅ **Validar State Token**: Protección CSRF
- ✅ **Almacenar Secrets de Forma Segura**: Nunca en código fuente
- ✅ **Rotar Secrets**: Periódicamente en producción
- ✅ **Validar Redirect URIs**: Solo usar URIs registradas

### 2. Manejo de Tokens

- ✅ **Almacenar Tokens de Forma Segura**: Usar almacenamiento seguro (no localStorage para production)
- ✅ **Refrescar Tokens Antes de Expirar**: Renovar cuando falten 5 minutos
- ✅ **No Compartir Tokens**: Cada aplicación debe obtener sus propios tokens
- ✅ **Revocar Tokens**: Cuando el usuario cierra sesión

### 3. Manejo de Errores

- ✅ **Manejar Todos los Errores OAuth2**: Invalidar tokens en caso de error
- ✅ **Mostrar Mensajes Claros**: Al usuario cuando hay problemas de autorización
- ✅ **Reintentar con Backoff**: Para errores temporales (5xx)

### 4. Performance

- ✅ **Cachear Tokens**: Mientras sean válidos
- ✅ **Usar Refresh Tokens**: En lugar de re-autenticar constantemente
- ✅ **Batch Requests**: Cuando sea posible (FHIR batch operations)

### 5. UX

- ✅ **Mostrar Estado de Autorización**: Al usuario
- ✅ **Manejar Timeouts**: Gracefully
- ✅ **Proporcionar Feedback**: Durante el flujo de autorización

---

## Referencias

### Documentación del Proyecto

- [AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md) - Flujo de autenticación completo
- [KEYCLOAK_CONFIGURATION.md](./KEYCLOAK_CONFIGURATION.md) - Configuración de Keycloak
- [ROLES_AND_PERMISSIONS.md](./ROLES_AND_PERMISSIONS.md) - Roles y permisos
- [SCOPES_SETUP_GUIDE.md](./SCOPES_SETUP_GUIDE.md) - Configuración de scopes

### Especificaciones

- [SMART App Launch](http://hl7.org/fhir/smart-app-launch/) - Especificación oficial
- [FHIR R4](https://www.hl7.org/fhir/) - Especificación FHIR
- [OAuth2](https://oauth.net/2/) - Especificación OAuth2
- [OpenID Connect](https://openid.net/connect/) - Especificación OIDC

### Recursos Externos

- [SMART Health IT](https://smarthealthit.org/) - Recursos y sandbox
- [FHIR Documentation](https://www.hl7.org/fhir/documentation.html) - Documentación FHIR
- [SMART on FHIR Tutorial](https://docs.smarthealthit.org/) - Tutorial interactivo

---

**Última actualización:** 2025-12-12

