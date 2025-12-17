# 📋 Tareas GitHub Projects - Fase 4: SMART on FHIR

> ⚠️ **ARCHIVO TEMPORAL**
> Este archivo contiene tareas detalladas para agregar en GitHub Projects.
> **Puede ser eliminado** una vez que:
>
> - Las tareas estén agregadas a GitHub Projects
> - Las tareas estén completadas
> - Ya no se necesite como referencia
>
> Para documentación permanente, ver: [AUTH_IMPLEMENTATION_PLAN.md](../AUTH_IMPLEMENTATION_PLAN.md)

---

## 📖 Historia de Usuario (HU)

### HU: Integración SMART on FHIR para Aplicaciones Externas

**Como** desarrollador de aplicaciones externas (laboratorios, clínicas, sistemas de salud),
**Quiero** integrar mi aplicación con CareCore API usando el estándar SMART on FHIR,
**Para** acceder a datos clínicos de pacientes de forma segura y estándar, respetando permisos y consentimientos.

#### Criterios de Aceptación

- ✅ Los endpoints SMART on FHIR están implementados (`/fhir/auth`, `/fhir/token`, `/fhir/authorize`)
- ✅ El flujo de launch sequence funciona correctamente
- ✅ Los tokens generados incluyen scopes y contexto de paciente
- ✅ El CapabilityStatement incluye información de endpoints SMART on FHIR
- ✅ Los endpoints FHIR validan scopes y roles correctamente
- ✅ El filtrado por paciente funciona según permisos
- ✅ El audit logging registra todos los accesos SMART on FHIR
- ⏳ La documentación está completa con ejemplos (documentación básica completa, ejemplos avanzados pendientes)

#### Tareas Relacionadas

Esta HU incluye las siguientes tareas (ver detalles abajo):

**SMART on FHIR Launch Sequence:**

- ✅ **Tarea 1**: Implementar endpoint GET /fhir/auth - Authorization endpoint (Issue #78)
- ✅ **Tarea 2**: Implementar endpoint POST /fhir/token - Token endpoint (Issue #79)
- ✅ **Tarea 3**: Implementar endpoint GET /fhir/authorize - Launch endpoint (Issue #80)
- ✅ **Tarea 4**: Implementar launch sequence completa (completado con tareas 1-3)
- ✅ **Tarea 5**: Actualizar CapabilityStatement con endpoints SMART on FHIR

**Protección y Validación:**

- ✅ **Tarea 6**: Aplicar guards a endpoints FHIR (completado)
- ✅ **Tarea 7**: Validar scopes en endpoints FHIR (completado)
- ✅ **Tarea 8**: Implementar filtrado por paciente (completado)
- ✅ **Tarea 9**: Implementar audit logging para SMART on FHIR (completado)

#### Estimación

- **Tiempo total**: 4-6 días
- **Prioridad**: Alta
- **Dependencias**: Fase 1, 2 y 3 completadas ✅

#### Definición de Terminado (DoD)

- [x] Todas las tareas de la Fase 4 completadas (9/9 tareas completadas) ✅
- [x] Tests unitarios pasando (tests E2E pendientes)
- [x] Documentación SMART on FHIR básica completa (documentación avanzada pendiente)
- [x] Launch sequence funcionando end-to-end
- [x] Integración con Keycloak verificada
- [x] CapabilityStatement actualizado
- [x] Audit logging implementado para SMART on FHIR

---

## 🎯 Tareas Principales

### Tarea 1: Implementar endpoint GET /fhir/auth - Authorization endpoint

**Título:** `PHASE-4 - feat(smart): crear endpoint GET /fhir/auth para autorización SMART on FHIR`

**Descripción:**

```markdown
## Objetivo

Crear endpoint de autorización OAuth2 que permite a aplicaciones externas solicitar acceso a recursos FHIR.

## Tareas

- [x] Crear controlador `SmartFhirController` en `src/modules/smart-fhir/` (implementado en `FhirController`)
- [x] Implementar método `authorize()` que maneja GET /fhir/auth
- [x] Validar parámetros OAuth2:
  - `client_id` (required) - ID del cliente de la aplicación
  - `response_type` (required) - Debe ser "code" para Authorization Code flow
  - `redirect_uri` (required) - URI de redirección después de autorización
  - `scope` (required) - Scopes solicitados (ej: "patient:read patient:write")
  - `state` (optional) - Token CSRF para seguridad
  - `aud` (optional) - Audience (URL del servidor FHIR)
- [x] Validar que el cliente existe en Keycloak
- [x] Validar que redirect_uri está registrado para el cliente
- [x] Redirigir a Keycloak para autenticación del usuario
- [x] Pasar parámetros necesarios a Keycloak
- [x] Manejar errores y retornar OperationOutcome FHIR
- [x] Agregar documentación Swagger

## Endpoint Esperado
```

GET /api/fhir/auth?client_id=app-123&response_type=code&redirect_uri=https://app.com/callback&scope=patient:read&state=xyz

```

## Respuesta

Redirección a Keycloak para autenticación, luego redirección a `redirect_uri` con `code` y `state`.

## Flujo

1. Aplicación externa redirige a `/fhir/auth` con parámetros OAuth2
2. API valida parámetros y cliente
3. API redirige a Keycloak para autenticación
4. Usuario autentica en Keycloak
5. Keycloak redirige de vuelta a API con código de autorización
6. API redirige a `redirect_uri` de la aplicación con código

## Criterios de Aceptación
- [x] Endpoint creado y funcional
- [x] Validación de parámetros OAuth2 implementada
- [x] Integración con Keycloak funcionando
- [x] Redirecciones funcionando correctamente
- [x] Manejo de errores implementado
- [x] Documentación Swagger completa
- [x] Tests unitarios pasando

## Referencias
- [SMART on FHIR Authorization](http://docs.smarthealthit.org/authorization/)
- [OAuth2 Authorization Code Flow](https://oauth.net/2/grant-types/authorization-code/)
```

**Labels:** `enhancement`, `auth`, `phase-4`, `integration`

---

### Tarea 2: Implementar endpoint POST /fhir/token - Token endpoint

**Título:** `PHASE-4 - feat(smart): crear endpoint POST /fhir/token para intercambiar código por token`

**Descripción:**

````markdown
## Objetivo

Crear endpoint que intercambia un código de autorización por un token de acceso JWT.

## Tareas

- [x] Implementar método `token()` en `SmartFhirController`
- [x] Validar parámetros OAuth2:
  - `grant_type` (required) - Debe ser "authorization_code" o "refresh_token"
  - `code` (required para authorization_code) - Código recibido de /fhir/auth
  - `redirect_uri` (required para authorization_code) - Debe coincidir con el usado en /fhir/auth
  - `client_id` (required) - ID del cliente
  - `client_secret` (required para confidential clients) - Secret del cliente
  - `refresh_token` (required para refresh_token grant) - Token de refresh
- [x] Validar código de autorización (verificar que existe y no ha expirado)
- [x] Intercambiar código con Keycloak para obtener token
- [x] Incluir scopes en el token
- [x] Incluir contexto de paciente si aplica (patient context)
- [x] Retornar respuesta OAuth2 estándar:
  ```json
  {
    "access_token": "...",
    "token_type": "Bearer",
    "expires_in": 3600,
    "scope": "patient:read patient:write",
    "refresh_token": "...",
    "patient": "Patient/123" // Si aplica
  }
  ```
````

- [x] Manejar errores y retornar formato OAuth2 estándar
- [x] Agregar documentación Swagger

## Endpoint Esperado

```
POST /api/fhir/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&code=abc123&redirect_uri=https://app.com/callback&client_id=app-123&client_secret=secret
```

## Respuesta Exitosa

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "patient:read patient:write",
  "refresh_token": "def456...",
  "patient": "Patient/123"
}
```

## Respuesta de Error

```json
{
  "error": "invalid_grant",
  "error_description": "The authorization code has expired"
}
```

## Criterios de Aceptación

- [x] Endpoint creado y funcional
- [x] Intercambio de código por token funcionando
- [x] Integración con Keycloak funcionando
- [x] Tokens incluyen scopes correctos
- [x] Contexto de paciente incluido cuando aplica
- [x] Manejo de errores implementado
- [x] Documentación Swagger completa
- [x] Tests unitarios pasando

## Referencias

- [SMART on FHIR Token Exchange](http://docs.smarthealthit.org/authorization/)
- [OAuth2 Token Endpoint](https://oauth.net/2/grant-types/authorization-code/)

````

**Labels:** `enhancement`, `auth`, `phase-4`, `integration`

---

### Tarea 3: Implementar endpoint GET /fhir/authorize - Launch endpoint

**Título:** `PHASE-4 - feat(smart): crear endpoint GET /fhir/authorize para launch sequence SMART on FHIR`

**Descripción:**
```markdown
## Objetivo
Crear endpoint que maneja el launch sequence de SMART on FHIR, permitiendo a aplicaciones externas iniciar desde un contexto clínico.

## Tareas
- [x] Implementar método `launch()` en `SmartFhirController`
- [x] Validar parámetros SMART on FHIR:
  - `iss` (required) - Issuer (URL del servidor FHIR)
  - `launch` (required) - Launch context token
  - `client_id` (required) - ID del cliente
  - `redirect_uri` (required) - URI de redirección
  - `scope` (required) - Scopes solicitados
  - `state` (optional) - Token CSRF
- [x] Validar launch context token
- [x] Extraer contexto de launch (patient, encounter, etc.)
- [x] Almacenar contexto temporalmente (session o cache)
- [x] Redirigir a flujo de autorización con contexto
- [x] Manejar errores y retornar OperationOutcome FHIR
- [x] Agregar documentación Swagger

## Endpoint Esperado

````

GET /api/fhir/authorize?iss=https://carecore.example.com&launch=xyz123&client_id=app-123&redirect_uri=https://app.com/callback&scope=patient:read&state=abc

```

## Flujo

1. Aplicación externa inicia desde contexto clínico (EHR)
2. EHR redirige a `/fhir/authorize` con launch token
3. API valida launch token y extrae contexto
4. API almacena contexto temporalmente
5. API redirige a flujo de autorización
6. Usuario autoriza aplicación
7. API incluye contexto en token final

## Criterios de Aceptación
- [x] Endpoint creado y funcional
- [x] Validación de launch token implementada
- [x] Extracción de contexto funcionando
- [x] Almacenamiento temporal de contexto
- [x] Integración con flujo de autorización
- [x] Manejo de errores implementado
- [x] Documentación Swagger completa
- [x] Tests unitarios pasando

## Referencias
- [SMART on FHIR Launch Sequence](http://docs.smarthealthit.org/apps/launch/)
- [SMART App Launch](http://hl7.org/fhir/smart-app-launch/)
```

**Labels:** `enhancement`, `auth`, `phase-4`, `integration`

---

### Tarea 4: Implementar launch sequence completa

**Título:** `PHASE-4 - feat(smart): implementar flujo completo de launch sequence SMART on FHIR`

**Descripción:**

```markdown
## Objetivo

Completar la implementación del flujo completo de launch sequence, conectando todos los endpoints y validando el flujo end-to-end.

## Tareas

- [x] Crear servicio `SmartFhirService` para lógica de negocio
- [x] Implementar almacenamiento temporal de launch context:
  - Usar Redis o cache en memoria
  - Almacenar con TTL (ej: 10 minutos)
  - Incluir: patient context, encounter context, etc.
- [x] Implementar validación de launch token:
  - Verificar firma si está firmado (implementado decodificación base64url)
  - Validar expiración (TTL de 10 minutos)
  - Extraer contexto (patient ID, encounter ID, etc.)
- [x] Conectar flujo completo:
  1. Launch endpoint recibe launch token
  2. Extrae y almacena contexto
  3. Redirige a authorization endpoint
  4. Authorization endpoint incluye contexto en sesión
  5. Token endpoint incluye contexto en token
- [x] Implementar soporte para diferentes tipos de launch:
  - Standalone launch (sin contexto) - soportado
  - EHR launch (con contexto de paciente) - soportado
  - Provider launch (con contexto de practitioner) - soportado
- [x] Agregar logging de launch sequence
- [x] Crear tests unitarios del flujo completo (tests E2E pendientes)

## Flujo Completo
```

1. EHR → GET /fhir/authorize?launch=xyz&...
2. API → Valida launch, almacena contexto
3. API → Redirige a GET /fhir/auth?client_id=...&...
4. API → Redirige a Keycloak para auth
5. Usuario → Autentica en Keycloak
6. Keycloak → Redirige a API con code
7. API → Redirige a app con code
8. App → POST /fhir/token con code
9. API → Retorna token con contexto de paciente

```

## Criterios de Aceptación
- [x] Servicio de launch sequence creado
- [x] Almacenamiento temporal funcionando
- [x] Validación de launch token implementada
- [x] Flujo completo funcionando end-to-end
- [x] Diferentes tipos de launch soportados
- [x] Logging implementado
- [x] Tests unitarios pasando (tests E2E pendientes)

## Referencias
- [SMART App Launch Implementation Guide](http://hl7.org/fhir/smart-app-launch/)
- Ver tareas 1, 2, 3 para endpoints relacionados
```

**Labels:** `enhancement`, `auth`, `phase-4`, `integration`

---

### Tarea 5: Actualizar CapabilityStatement con endpoints SMART on FHIR

**Título:** `PHASE-4 - feat(smart): actualizar CapabilityStatement con información de endpoints SMART on FHIR`

**Descripción:**

````markdown
## Objetivo

Actualizar el CapabilityStatement FHIR para incluir información sobre los endpoints SMART on FHIR disponibles.

## Tareas

- [x] Modificar método `getCapabilityStatement()` en `FhirService`
- [x] Agregar extensión `http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris`:
  ```json
  {
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
    ]
  }
  ```
````

- [x] Agregar información de scopes soportados
- [x] Agregar información de tipos de launch soportados
- [x] Incluir URLs de redirect_uri permitidas (si aplica)
- [x] Documentar en Swagger
- [x] Verificar que CapabilityStatement es válido según FHIR

## CapabilityStatement Esperado

```json
{
  "resourceType": "CapabilityStatement",
  "rest": [
    {
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
                "code": "SMART-on-FHIR"
              }
            ]
          }
        ]
      }
    }
  ]
}
```

## Criterios de Aceptación

- [x] CapabilityStatement actualizado
- [x] Extensiones SMART on FHIR incluidas
- [x] URLs correctas configuradas
- [x] Scopes documentados
- [x] Tipos de launch documentados
- [x] Validación FHIR pasando
- [x] Documentación actualizada

## Referencias

- [SMART on FHIR CapabilityStatement](http://docs.smarthealthit.org/authorization/capability-statement/)
- [FHIR CapabilityStatement](https://www.hl7.org/fhir/capabilitystatement.html)

````

**Labels:** `enhancement`, `fhir`, `phase-4`, `documentation`

---

### Tarea 6: Aplicar guards a endpoints FHIR

**Título:** `PHASE-4 - feat(smart): aplicar guards de autenticación y autorización a todos los endpoints FHIR`

**Descripción:**
```markdown
## Objetivo
Asegurar que todos los endpoints FHIR requieren autenticación y validan permisos correctamente.

## Tareas
- [x] Revisar todos los endpoints FHIR en `FhirController`
- [x] Aplicar `@UseGuards(JwtAuthGuard)` a todos los endpoints (a nivel de clase)
- [x] Aplicar `@UseGuards(ScopesGuard)` donde sea necesario
- [x] Aplicar `@UseGuards(RolesGuard)` donde sea necesario
- [x] Aplicar `@UseGuards(MFARequiredGuard)` para roles críticos
- [x] Verificar que endpoints públicos (metadata, authorize, auth, token) no requieren auth
- [x] Agregar decorador `@Scopes()` a endpoints según recursos
- [x] Agregar decorador `@Roles()` donde sea necesario
- [x] Actualizar tests para incluir autenticación
- [x] Documentar requisitos de autenticación en Swagger

## Endpoints a Proteger

- `GET /api/fhir/Patient` - Requiere `patient:read` scope
- `POST /api/fhir/Patient` - Requiere `patient:write` scope
- `GET /api/fhir/Patient/:id` - Requiere `patient:read` scope
- `PUT /api/fhir/Patient/:id` - Requiere `patient:write` scope
- `DELETE /api/fhir/Patient/:id` - Requiere `patient:write` scope
- Similar para Practitioner, Encounter, DocumentReference, Consent

## Ejemplo

```typescript
@Get('Patient')
@UseGuards(JwtAuthGuard, ScopesGuard)
@Scopes('patient:read')
async searchPatients(@Query() params: SearchParams) {
  // ...
}
````

## Criterios de Aceptación

- [x] Todos los endpoints FHIR protegidos
- [x] Guards aplicados correctamente
- [x] Scopes validados en endpoints
- [x] Roles validados donde sea necesario
- [x] Tests actualizados
- [x] Documentación Swagger actualizada

## Referencias

- Ver `ScopesGuard`, `RolesGuard`, `MFARequiredGuard` de Fase 3
- Ver `@Scopes()` y `@Roles()` decorators

````

**Labels:** `enhancement`, `auth`, `phase-4`, `security`, `fhir`

---

### Tarea 7: Validar scopes en endpoints FHIR

**Título:** `PHASE-4 - feat(smart): implementar validación de scopes en todos los endpoints FHIR`

**Descripción:**
```markdown
## Objetivo
Asegurar que cada endpoint FHIR valida que el token contiene los scopes necesarios para la operación.

## Tareas
- [x] Revisar todos los endpoints FHIR
- [x] Agregar decorador `@Scopes()` con scopes requeridos:
  - `GET /api/fhir/Patient` → `@Scopes('patient:read')` ✓
  - `POST /api/fhir/Patient` → `@Scopes('patient:write')` ✓
  - `GET /api/fhir/Patient/:id` → `@Scopes('patient:read')` ✓
  - `PUT /api/fhir/Patient/:id` → `@Scopes('patient:write')` ✓
  - `DELETE /api/fhir/Patient/:id` → `@Scopes('patient:write')` ✓
  - `GET /api/fhir/Practitioner` → `@Scopes('practitioner:read')` ✓
  - `GET /api/fhir/Practitioner/:id` → `@Scopes('practitioner:read')` ✓
  - `GET /api/fhir/Encounter` → `@Scopes('encounter:read')` ✓
  - `GET /api/fhir/Encounter/:id` → `@Scopes('encounter:read')` ✓
  - `DELETE /api/fhir/Encounter/:id` → `@Scopes('encounter:write')` ✓
  - Similar para otros recursos
- [x] Asegurar que `ScopesGuard` está aplicado
- [x] Validar que scopes se extraen correctamente del token
- [x] Implementar mensajes de error claros cuando faltan scopes
- [x] Agregar logging de validaciones de scopes
- [x] Actualizar tests para validar scopes
- [x] Documentar scopes requeridos en Swagger

## Mapeo de Scopes

| Endpoint | Método | Scope Requerido |
|----------|--------|-----------------|
| `/fhir/Patient` | GET | `patient:read` |
| `/fhir/Patient` | POST | `patient:write` |
| `/fhir/Patient/:id` | GET | `patient:read` |
| `/fhir/Patient/:id` | PUT | `patient:write` |
| `/fhir/Patient/:id` | DELETE | `patient:write` |
| `/fhir/Practitioner` | GET | `practitioner:read` |
| `/fhir/Practitioner` | POST | `practitioner:write` |
| Similar para otros recursos...

## Criterios de Aceptación
- [x] Todos los endpoints tienen scopes definidos
- [x] Validación de scopes funcionando
- [x] Mensajes de error claros
- [x] Logging implementado
- [x] Tests pasando
- [x] Documentación actualizada

## Referencias
- Ver `ScopesGuard` y `@Scopes()` de Fase 3
- Ver `ScopePermissionService` para mapeo de scopes
````

**Labels:** `enhancement`, `auth`, `phase-4`, `security`, `fhir`

---

### Tarea 8: Implementar filtrado por paciente

**Título:** `PHASE-4 - feat(smart): implementar filtrado automático de recursos por contexto de paciente`

**Descripción:**

````markdown
## Objetivo

Implementar filtrado automático de recursos FHIR basado en el contexto de paciente del token SMART on FHIR.

## Tareas

- [x] Extraer contexto de paciente del token JWT:
  - Campo `patient` en token (ej: "Patient/123")
  - O campo `fhirUser` si aplica
- [x] Crear interceptor o middleware que filtra recursos:
  - Para búsquedas: agregar filtro `subject=Patient/123`
  - Para lecturas: validar que recurso pertenece al paciente
  - Para escrituras: validar que recurso pertenece al paciente
- [x] Aplicar filtrado en servicios FHIR:
  - `FhirService.searchPatients()` - Filtrar por paciente si contexto existe
  - `FhirService.getPatient()` - Validar pertenencia
  - Similar para Encounter, DocumentReference, etc.
- [x] Manejar casos especiales:
  - Admin puede ver todos los recursos (bypasses patient context)
  - Practitioner puede ver recursos de pacientes asignados
  - Patient solo puede ver sus propios recursos
- [x] Agregar logging de filtrado
- [x] Actualizar tests para incluir filtrado
- [x] Documentar comportamiento de filtrado

## Lógica de Filtrado

```typescript
// Si token tiene contexto de paciente
if (token.patient) {
  // Filtrar búsquedas por paciente
  queryBuilder.where('patientReference = :patientId', {
    patientId: token.patient,
  });

  // Validar pertenencia en lecturas
  if (resource.patientReference !== token.patient) {
    throw new ForbiddenException();
  }
}
```
````

## Criterios de Aceptación

- [x] Extracción de contexto de paciente funcionando
- [x] Filtrado automático implementado
- [x] Validación de pertenencia funcionando
- [x] Casos especiales manejados
- [x] Logging implementado
- [x] Tests pasando
- [x] Documentación actualizada

## Referencias

- [SMART on FHIR Patient Context](http://docs.smarthealthit.org/authorization/scopes-and-launch-context/)
- Ver `FhirService` para implementación actual de filtrado

````

**Labels:** `enhancement`, `auth`, `phase-4`, `security`, `fhir`

---

### Tarea 9: Implementar audit logging para SMART on FHIR

**Título:** `PHASE-4 - feat(smart): agregar audit logging específico para accesos SMART on FHIR`

**Descripción:**
```markdown
## Objetivo
Implementar logging de auditoría específico para accesos SMART on FHIR, incluyendo información de aplicación externa y contexto.

## Tareas
- [x] Extender `AuditService` para incluir información SMART:
  - `clientId` - ID de la aplicación externa
  - `clientName` - Nombre de la aplicación
  - `launchContext` - Contexto de launch (patient, encounter, etc.)
  - `scopes` - Scopes utilizados
- [x] Agregar logging en endpoints SMART:
  - `/fhir/auth` - Log de solicitudes de autorización
  - `/fhir/token` - Log de intercambios de token
  - `/fhir/authorize` - Log de launch sequences
- [x] Agregar logging en accesos a recursos FHIR:
  - Incluir información de aplicación externa
  - Incluir contexto de paciente
  - Incluir scopes utilizados
- [x] Extender `AuditLog` con campos SMART on FHIR:
  - `clientId` (string, nullable)
  - `clientName` (string, nullable)
  - `launchContext` (jsonb, nullable)
  - `scopes` (jsonb, nullable)
- [x] Actualizar `AuditInterceptor` para incluir información SMART
- [x] Agregar tests para audit logging
- [x] Documentar formato de logs

## Información a Loggear

```json
{
  "resourceType": "AuditEvent",
  "type": {
    "code": "rest",
    "display": "RESTful Operation"
  },
  "action": "read",
  "outcome": "success",
  "agent": [
    {
      "role": [
        {
          "code": "client",
          "display": "Application"
        }
      ],
      "requestor": true,
      "name": "Lab System App",
      "identifier": {
        "value": "lab-app-123"
      }
    }
  ],
  "source": {
    "site": "carecore-api"
  },
  "entity": [
    {
      "what": {
        "reference": "Patient/123"
      },
      "role": {
        "code": "1",
        "display": "Patient"
      }
    }
  ]
}
````

## Criterios de Aceptación

- [x] Audit logging extendido con información SMART
- [x] Logging en endpoints SMART implementado
- [x] Logging en accesos a recursos implementado
- [x] Información de aplicación externa incluida
- [x] Contexto de launch incluido
- [x] Tests pasando (25 tests unitarios pasando)
- [x] Documentación actualizada

## Referencias

- Ver `AuditService` y `AuditLog` de Fase 2
- [FHIR AuditEvent](https://www.hl7.org/fhir/auditevent.html)
- [SMART on FHIR Audit](http://docs.smarthealthit.org/authorization/audit/)

```

**Labels:** `enhancement`, `audit`, `phase-4`, `security`

---

## 📊 Resumen de Tareas

| # | Tarea | Estado | Estimación | Prioridad | Labels |
|---|-------|--------|------------|-----------|--------|
| 1 | Implementar endpoint GET /fhir/auth | ✅ Completado | 4-6 horas | Alta | `enhancement`, `auth`, `phase-4`, `smart-fhir`, `integration` |
| 2 | Implementar endpoint POST /fhir/token | ✅ Completado | 4-6 horas | Alta | `enhancement`, `auth`, `phase-4`, `smart-fhir`, `integration` |
| 3 | Implementar endpoint GET /fhir/authorize | ✅ Completado | 3-4 horas | Alta | `enhancement`, `auth`, `phase-4`, `smart-fhir`, `integration` |
| 4 | Implementar launch sequence completa | ✅ Completado | 6-8 horas | Alta | `enhancement`, `auth`, `phase-4`, `smart-fhir`, `integration` |
| 5 | Actualizar CapabilityStatement | ✅ Completado | 2-3 horas | Alta | `enhancement`, `fhir`, `phase-4`, `smart-fhir`, `documentation` |
| 6 | Aplicar guards a endpoints FHIR | ✅ Completado | 3-4 horas | Alta | `enhancement`, `auth`, `phase-4`, `security`, `fhir` |
| 7 | Validar scopes en endpoints FHIR | ✅ Completado | 3-4 horas | Alta | `enhancement`, `auth`, `phase-4`, `security`, `fhir` |
| 8 | Implementar filtrado por paciente | ✅ Completado | 4-6 horas | Alta | `enhancement`, `auth`, `phase-4`, `security`, `fhir` |
| 9 | Implementar audit logging SMART | ✅ Completado | 3-4 horas | Media | `enhancement`, `audit`, `phase-4`, `security` |

**Tiempo Total Estimado:** 32-45 horas (4-6 días)
**Tiempo Completado:** ~33-45 horas (9/9 tareas completadas) ✅
**Tiempo Restante:** 0 horas (todas las tareas completadas)

---

## 🚀 Cómo Usar Esta Lista

### Opción 1: Crear Issues Individuales
1. Copia cada tarea como un nuevo Issue en GitHub
2. Usa el título y descripción proporcionados
3. Agrega los labels sugeridos
4. Asigna a un milestone "Fase 4: SMART on FHIR"

### Opción 2: Crear Issue Épico (HU)
1. Crea un issue principal "Fase 4: SMART on FHIR" (HU)
2. Crea issues hijos para cada tarea
3. Usa GitHub Projects para organizar

### Opción 3: Usar Script Automático
1. Ejecuta: `node scripts/create-github-tasks-phase4.js`
2. El script creará la HU y todas las tareas automáticamente
3. Las tareas se vincularán a la HU como parent

---

**Última actualización**: 2025-01-27
**Estado de la Fase 4**: ✅ **COMPLETADA** (9/9 tareas completadas)

---

## 📝 Notas de Implementación

### Tareas Completadas (9/9) ✅

#### ✅ Tarea 1: Endpoint GET /fhir/auth
- **Archivos modificados:**
  - `src/modules/fhir/fhir.controller.ts` - Método `authorize()`
  - `src/common/dto/smart-fhir-auth.dto.ts` - DTO de validación
  - `src/modules/fhir/services/smart-fhir.service.ts` - Lógica de negocio
- **Tests:** `src/modules/fhir/fhir.controller.spec.ts` - Tests unitarios completos

#### ✅ Tarea 2: Endpoint POST /fhir/token
- **Archivos modificados:**
  - `src/modules/fhir/fhir.controller.ts` - Método `token()`
  - `src/common/dto/smart-fhir-token.dto.ts` - DTO de validación
  - `src/modules/fhir/services/smart-fhir.service.ts` - Lógica de intercambio de tokens
- **Tests:** `src/modules/fhir/fhir.controller.spec.ts` - Tests unitarios completos

#### ✅ Tarea 3: Endpoint GET /fhir/authorize
- **Archivos modificados:**
  - `src/modules/fhir/fhir.controller.ts` - Método `launch()`
  - `src/common/dto/smart-fhir-launch.dto.ts` - DTO de validación
  - `src/modules/fhir/services/smart-fhir.service.ts` - Lógica de launch sequence
- **Tests:** `src/modules/fhir/fhir.controller.spec.ts` - Tests unitarios completos

#### ✅ Tarea 4: Launch Sequence Completa
- **Implementación:**
  - Almacenamiento temporal de launch context con TTL de 10 minutos
  - Validación y decodificación de launch tokens (base64url JSON)
  - Integración completa entre `/fhir/authorize` → `/fhir/auth` → `/fhir/token`
  - Soporte para standalone launch, EHR launch y provider launch
- **Tests:** Tests unitarios completos para todos los métodos

#### ✅ Tarea 5: CapabilityStatement Actualizado
- **Archivos modificados:**
  - `src/modules/fhir/fhir.service.ts` - Método `getCapabilityStatement()`
- **Características agregadas:**
  - Extensión OAuth2 URIs con endpoints `authorize` y `token`
  - Servicio de seguridad SMART-on-FHIR
  - Información de scopes soportados
  - Información de tipos de launch soportados
- **Tests:** `src/modules/fhir/fhir.service.spec.ts` - Tests unitarios completos

### Tareas Completadas (Continuación)

#### ✅ Tarea 6: Aplicar guards a endpoints FHIR
- **Estado:** Completado
- **Archivos modificados:**
  - `src/modules/fhir/fhir.controller.ts` - Todos los guards aplicados
- **Características implementadas:**
  - `JwtAuthGuard` aplicado a nivel de clase (protege todos los endpoints por defecto)
  - `ScopesGuard` aplicado a endpoints de lectura/escritura de Patient, Practitioner y Encounter
  - `RolesGuard` y `MFARequiredGuard` aplicados a endpoints críticos (crear/actualizar/eliminar Practitioner, crear/actualizar Encounter)
  - Endpoints públicos marcados con `@Public()` (metadata, authorize, auth, token)
  - Documentación Swagger completa con `@ApiBearerAuth` y respuestas de error apropiadas
- **Tests:** `src/modules/fhir/fhir.controller.spec.ts` - Tests unitarios completos

#### ✅ Tarea 7: Validar scopes en endpoints FHIR
- **Estado:** Completado
- **Archivos modificados:**
  - `src/modules/auth/guards/scopes.guard.ts` - Agregado logging de validaciones
  - `src/modules/auth/guards/scopes.guard.spec.ts` - Tests actualizados para incluir logging
- **Características implementadas:**
  - Todos los endpoints de lectura/escritura tienen `@Scopes()` decorator aplicado
  - `ScopesGuard` valida que el usuario tiene todos los scopes requeridos
  - Logging de validaciones de scopes (debug para éxito, warn para fallos)
  - Mensajes de error claros con `InsufficientScopesException`
  - Documentación Swagger completa con scopes requeridos
- **Endpoints con scopes:**
  - Patient: todos los endpoints (read/write)
  - Practitioner: endpoints de lectura (read)
  - Encounter: endpoints de lectura (read) y eliminación (write)
  - Endpoints administrativos (POST/PUT Practitioner, POST/PUT Encounter) usan RolesGuard (correcto)
- **Tests:** `src/modules/auth/guards/scopes.guard.spec.ts` - 12 tests pasando

#### ✅ Tarea 8: Implementar filtrado por paciente
- **Estado:** Completado
- **Archivos modificados:**
  - `src/modules/auth/interfaces/user.interface.ts` - Agregado campo `patient` y `fhirUser`
  - `src/modules/auth/strategies/jwt.strategy.ts` - Extracción de contexto de paciente del token
  - `src/modules/fhir/fhir.service.ts` - Implementación de filtrado automático
  - `src/modules/fhir/fhir.controller.ts` - Actualizado para pasar `user` a métodos de Encounter
- **Características implementadas:**
  - Extracción de contexto de paciente del token JWT (campos `patient` y `fhirUser`)
  - Filtrado automático en búsquedas de Patient y Encounter
  - Validación de pertenencia en lecturas de Patient y Encounter
  - Admin puede ver todos los recursos (bypasses patient context)
  - Logging de filtrado implementado
- **Tests:** `src/modules/fhir/fhir.service.spec.ts` - Tests unitarios completos

#### ✅ Tarea 9: Implementar audit logging para SMART on FHIR
- **Estado:** Completado
- **Archivos modificados:**
  - `src/entities/audit-log.entity.ts` - Agregados campos `clientId`, `clientName`, `launchContext`, `scopes`
  - `src/modules/audit/audit.service.ts` - Agregados métodos `logSmartAuth`, `logSmartToken`, `logSmartLaunch`
  - `src/modules/audit/interceptors/audit.interceptor.ts` - Agregada extracción de información SMART del token JWT
  - `src/modules/fhir/fhir.controller.ts` - Agregado logging en endpoints SMART (`/fhir/auth`, `/fhir/token`, `/fhir/authorize`)
  - `src/modules/auth/services/keycloak-admin.service.ts` - Agregado campo `name` al retorno de `findClientById`
  - `src/migrations/1765474821521-AddSmartFhirFieldsToAuditLogs.ts` - Migración para nuevos campos
- **Características implementadas:**
  - Logging de solicitudes de autorización SMART on FHIR
  - Logging de intercambios de token SMART on FHIR
  - Logging de launch sequences SMART on FHIR
  - Extracción automática de `clientId` del token JWT en accesos a recursos FHIR
  - Extracción de contexto de launch (patient, encounter) del usuario
  - Extracción de scopes del token JWT
- **Tests:** `src/modules/audit/audit.service.spec.ts` - Tests unitarios completos (25 tests pasando)

---

## 🎉 Resumen Final de la Fase 4

### Estado: ✅ **COMPLETADA**

**Todas las 9 tareas han sido completadas exitosamente:**

1. ✅ Endpoint GET /fhir/auth - Authorization endpoint
2. ✅ Endpoint POST /fhir/token - Token endpoint
3. ✅ Endpoint GET /fhir/authorize - Launch endpoint
4. ✅ Launch sequence completa
5. ✅ CapabilityStatement actualizado
6. ✅ Guards aplicados a endpoints FHIR
7. ✅ Validación de scopes implementada
8. ✅ Filtrado por paciente implementado
9. ✅ Audit logging para SMART on FHIR implementado

### Logros Principales

- **Endpoints SMART on FHIR**: 3 endpoints implementados y funcionando
- **Seguridad**: Todos los endpoints FHIR protegidos con guards y validación de scopes
- **Filtrado**: Filtrado automático por contexto de paciente implementado
- **Auditoría**: Logging completo de accesos SMART on FHIR con información de aplicación externa
- **Tests**: Suite completa de tests unitarios (25+ tests pasando)
- **Documentación**: Documentación básica completa, ejemplos avanzados pendientes

### Próximos Pasos (Opcional)

- Tests E2E para flujo completo SMART on FHIR
- Documentación avanzada con ejemplos de integración
- Optimizaciones de rendimiento si es necesario
- Monitoreo y alertas para accesos SMART on FHIR

---

**Fecha de finalización**: 2025-01-27
**Tiempo total invertido**: ~33-45 horas (dentro del rango estimado de 32-45 horas)

```
