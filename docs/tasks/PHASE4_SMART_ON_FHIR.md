# 📋 Tareas GitHub Projects - Fase 4: SMART on FHIR

> ⚠️ **ARCHIVO TEMPORAL**
> Este archivo contiene tareas detalladas para agregar en GitHub Projects.
> **Puede ser eliminado** una vez que:
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
- ✅ La documentación está completa con ejemplos

#### Tareas Relacionadas

Esta HU incluye las siguientes tareas (ver detalles abajo):

**SMART on FHIR Launch Sequence:**
- **Tarea 1**: Implementar endpoint GET /fhir/auth - Authorization endpoint
- **Tarea 2**: Implementar endpoint POST /fhir/token - Token endpoint
- **Tarea 3**: Implementar endpoint GET /fhir/authorize - Launch endpoint
- **Tarea 4**: Implementar launch sequence completa
- **Tarea 5**: Actualizar CapabilityStatement con endpoints SMART on FHIR

**Protección y Validación:**
- **Tarea 6**: Aplicar guards a endpoints FHIR
- **Tarea 7**: Validar scopes en endpoints FHIR
- **Tarea 8**: Implementar filtrado por paciente
- **Tarea 9**: Implementar audit logging para SMART on FHIR

#### Estimación

- **Tiempo total**: 4-6 días
- **Prioridad**: Alta
- **Dependencias**: Fase 1, 2 y 3 completadas ✅

#### Definición de Terminado (DoD)

- [ ] Todas las tareas de la Fase 4 completadas
- [ ] Tests unitarios y E2E pasando
- [ ] Documentación SMART on FHIR completa
- [ ] Launch sequence funcionando end-to-end
- [ ] Integración con Keycloak verificada
- [ ] CapabilityStatement actualizado

---

## 🎯 Tareas Principales

### Tarea 1: Implementar endpoint GET /fhir/auth - Authorization endpoint

**Título:** `PHASE-4 - feat(smart): crear endpoint GET /fhir/auth para autorización SMART on FHIR`

**Descripción:**
```markdown
## Objetivo
Crear endpoint de autorización OAuth2 que permite a aplicaciones externas solicitar acceso a recursos FHIR.

## Tareas
- [ ] Crear controlador `SmartFhirController` en `src/modules/smart-fhir/`
- [ ] Implementar método `authorize()` que maneja GET /fhir/auth
- [ ] Validar parámetros OAuth2:
  - `client_id` (required) - ID del cliente de la aplicación
  - `response_type` (required) - Debe ser "code" para Authorization Code flow
  - `redirect_uri` (required) - URI de redirección después de autorización
  - `scope` (required) - Scopes solicitados (ej: "patient:read patient:write")
  - `state` (optional) - Token CSRF para seguridad
  - `aud` (optional) - Audience (URL del servidor FHIR)
- [ ] Validar que el cliente existe en Keycloak
- [ ] Validar que redirect_uri está registrado para el cliente
- [ ] Redirigir a Keycloak para autenticación del usuario
- [ ] Pasar parámetros necesarios a Keycloak
- [ ] Manejar errores y retornar OperationOutcome FHIR
- [ ] Agregar documentación Swagger

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
- [ ] Endpoint creado y funcional
- [ ] Validación de parámetros OAuth2 implementada
- [ ] Integración con Keycloak funcionando
- [ ] Redirecciones funcionando correctamente
- [ ] Manejo de errores implementado
- [ ] Documentación Swagger completa
- [ ] Tests unitarios pasando

## Referencias
- [SMART on FHIR Authorization](http://docs.smarthealthit.org/authorization/)
- [OAuth2 Authorization Code Flow](https://oauth.net/2/grant-types/authorization-code/)
```

**Labels:** `enhancement`, `auth`, `phase-4`, `integration`

---

### Tarea 2: Implementar endpoint POST /fhir/token - Token endpoint

**Título:** `PHASE-4 - feat(smart): crear endpoint POST /fhir/token para intercambiar código por token`

**Descripción:**
```markdown
## Objetivo
Crear endpoint que intercambia un código de autorización por un token de acceso JWT.

## Tareas
- [ ] Implementar método `token()` en `SmartFhirController`
- [ ] Validar parámetros OAuth2:
  - `grant_type` (required) - Debe ser "authorization_code" o "refresh_token"
  - `code` (required para authorization_code) - Código recibido de /fhir/auth
  - `redirect_uri` (required para authorization_code) - Debe coincidir con el usado en /fhir/auth
  - `client_id` (required) - ID del cliente
  - `client_secret` (required para confidential clients) - Secret del cliente
  - `refresh_token` (required para refresh_token grant) - Token de refresh
- [ ] Validar código de autorización (verificar que existe y no ha expirado)
- [ ] Intercambiar código con Keycloak para obtener token
- [ ] Incluir scopes en el token
- [ ] Incluir contexto de paciente si aplica (patient context)
- [ ] Retornar respuesta OAuth2 estándar:
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
- [ ] Manejar errores y retornar formato OAuth2 estándar
- [ ] Agregar documentación Swagger

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
- [ ] Endpoint creado y funcional
- [ ] Intercambio de código por token funcionando
- [ ] Integración con Keycloak funcionando
- [ ] Tokens incluyen scopes correctos
- [ ] Contexto de paciente incluido cuando aplica
- [ ] Manejo de errores implementado
- [ ] Documentación Swagger completa
- [ ] Tests unitarios pasando

## Referencias
- [SMART on FHIR Token Exchange](http://docs.smarthealthit.org/authorization/)
- [OAuth2 Token Endpoint](https://oauth.net/2/grant-types/authorization-code/)
```

**Labels:** `enhancement`, `auth`, `phase-4`, `integration`

---

### Tarea 3: Implementar endpoint GET /fhir/authorize - Launch endpoint

**Título:** `PHASE-4 - feat(smart): crear endpoint GET /fhir/authorize para launch sequence SMART on FHIR`

**Descripción:**
```markdown
## Objetivo
Crear endpoint que maneja el launch sequence de SMART on FHIR, permitiendo a aplicaciones externas iniciar desde un contexto clínico.

## Tareas
- [ ] Implementar método `launch()` en `SmartFhirController`
- [ ] Validar parámetros SMART on FHIR:
  - `iss` (required) - Issuer (URL del servidor FHIR)
  - `launch` (required) - Launch context token
  - `client_id` (required) - ID del cliente
  - `redirect_uri` (required) - URI de redirección
  - `scope` (required) - Scopes solicitados
  - `state` (optional) - Token CSRF
- [ ] Validar launch context token
- [ ] Extraer contexto de launch (patient, encounter, etc.)
- [ ] Almacenar contexto temporalmente (session o cache)
- [ ] Redirigir a flujo de autorización con contexto
- [ ] Manejar errores y retornar OperationOutcome FHIR
- [ ] Agregar documentación Swagger

## Endpoint Esperado

```
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
- [ ] Endpoint creado y funcional
- [ ] Validación de launch token implementada
- [ ] Extracción de contexto funcionando
- [ ] Almacenamiento temporal de contexto
- [ ] Integración con flujo de autorización
- [ ] Manejo de errores implementado
- [ ] Documentación Swagger completa
- [ ] Tests unitarios pasando

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
- [ ] Crear servicio `SmartFhirService` para lógica de negocio
- [ ] Implementar almacenamiento temporal de launch context:
  - Usar Redis o cache en memoria
  - Almacenar con TTL (ej: 10 minutos)
  - Incluir: patient context, encounter context, etc.
- [ ] Implementar validación de launch token:
  - Verificar firma si está firmado
  - Validar expiración
  - Extraer contexto (patient ID, encounter ID, etc.)
- [ ] Conectar flujo completo:
  1. Launch endpoint recibe launch token
  2. Extrae y almacena contexto
  3. Redirige a authorization endpoint
  4. Authorization endpoint incluye contexto en sesión
  5. Token endpoint incluye contexto en token
- [ ] Implementar soporte para diferentes tipos de launch:
  - Standalone launch (sin contexto)
  - EHR launch (con contexto de paciente)
  - Provider launch (con contexto de practitioner)
- [ ] Agregar logging de launch sequence
- [ ] Crear tests E2E del flujo completo

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
- [ ] Servicio de launch sequence creado
- [ ] Almacenamiento temporal funcionando
- [ ] Validación de launch token implementada
- [ ] Flujo completo funcionando end-to-end
- [ ] Diferentes tipos de launch soportados
- [ ] Logging implementado
- [ ] Tests E2E pasando

## Referencias
- [SMART App Launch Implementation Guide](http://hl7.org/fhir/smart-app-launch/)
- Ver tareas 1, 2, 3 para endpoints relacionados
```

**Labels:** `enhancement`, `auth`, `phase-4`, `integration`

---

### Tarea 5: Actualizar CapabilityStatement con endpoints SMART on FHIR

**Título:** `PHASE-4 - feat(smart): actualizar CapabilityStatement con información de endpoints SMART on FHIR`

**Descripción:**
```markdown
## Objetivo
Actualizar el CapabilityStatement FHIR para incluir información sobre los endpoints SMART on FHIR disponibles.

## Tareas
- [ ] Modificar método `getCapabilityStatement()` en `FhirService`
- [ ] Agregar extensión `http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris`:
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
- [ ] Agregar información de scopes soportados
- [ ] Agregar información de tipos de launch soportados
- [ ] Incluir URLs de redirect_uri permitidas (si aplica)
- [ ] Documentar en Swagger
- [ ] Verificar que CapabilityStatement es válido según FHIR

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
- [ ] CapabilityStatement actualizado
- [ ] Extensiones SMART on FHIR incluidas
- [ ] URLs correctas configuradas
- [ ] Scopes documentados
- [ ] Tipos de launch documentados
- [ ] Validación FHIR pasando
- [ ] Documentación actualizada

## Referencias
- [SMART on FHIR CapabilityStatement](http://docs.smarthealthit.org/authorization/capability-statement/)
- [FHIR CapabilityStatement](https://www.hl7.org/fhir/capabilitystatement.html)
```

**Labels:** `enhancement`, `fhir`, `phase-4`, `documentation`

---

### Tarea 6: Aplicar guards a endpoints FHIR

**Título:** `PHASE-4 - feat(smart): aplicar guards de autenticación y autorización a todos los endpoints FHIR`

**Descripción:**
```markdown
## Objetivo
Asegurar que todos los endpoints FHIR requieren autenticación y validan permisos correctamente.

## Tareas
- [ ] Revisar todos los endpoints FHIR en `FhirController`
- [ ] Aplicar `@UseGuards(JwtAuthGuard)` a todos los endpoints
- [ ] Aplicar `@UseGuards(ScopesGuard)` donde sea necesario
- [ ] Aplicar `@UseGuards(RolesGuard)` donde sea necesario
- [ ] Aplicar `@UseGuards(MFARequiredGuard)` para roles críticos
- [ ] Verificar que endpoints públicos (metadata, health) no requieren auth
- [ ] Agregar decorador `@Scopes()` a endpoints según recursos
- [ ] Agregar decorador `@Roles()` donde sea necesario
- [ ] Actualizar tests para incluir autenticación
- [ ] Documentar requisitos de autenticación en Swagger

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
```

## Criterios de Aceptación
- [ ] Todos los endpoints FHIR protegidos
- [ ] Guards aplicados correctamente
- [ ] Scopes validados en endpoints
- [ ] Roles validados donde sea necesario
- [ ] Tests actualizados
- [ ] Documentación Swagger actualizada

## Referencias
- Ver `ScopesGuard`, `RolesGuard`, `MFARequiredGuard` de Fase 3
- Ver `@Scopes()` y `@Roles()` decorators
```

**Labels:** `enhancement`, `auth`, `phase-4`, `security`, `fhir`

---

### Tarea 7: Validar scopes en endpoints FHIR

**Título:** `PHASE-4 - feat(smart): implementar validación de scopes en todos los endpoints FHIR`

**Descripción:**
```markdown
## Objetivo
Asegurar que cada endpoint FHIR valida que el token contiene los scopes necesarios para la operación.

## Tareas
- [ ] Revisar todos los endpoints FHIR
- [ ] Agregar decorador `@Scopes()` con scopes requeridos:
  - `GET /api/fhir/Patient` → `@Scopes('patient:read')`
  - `POST /api/fhir/Patient` → `@Scopes('patient:write')`
  - `GET /api/fhir/Patient/:id` → `@Scopes('patient:read')`
  - Similar para otros recursos
- [ ] Asegurar que `ScopesGuard` está aplicado
- [ ] Validar que scopes se extraen correctamente del token
- [ ] Implementar mensajes de error claros cuando faltan scopes
- [ ] Agregar logging de validaciones de scopes
- [ ] Actualizar tests para validar scopes
- [ ] Documentar scopes requeridos en Swagger

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
- [ ] Todos los endpoints tienen scopes definidos
- [ ] Validación de scopes funcionando
- [ ] Mensajes de error claros
- [ ] Logging implementado
- [ ] Tests pasando
- [ ] Documentación actualizada

## Referencias
- Ver `ScopesGuard` y `@Scopes()` de Fase 3
- Ver `ScopePermissionService` para mapeo de scopes
```

**Labels:** `enhancement`, `auth`, `phase-4`, `security`, `fhir`

---

### Tarea 8: Implementar filtrado por paciente

**Título:** `PHASE-4 - feat(smart): implementar filtrado automático de recursos por contexto de paciente`

**Descripción:**
```markdown
## Objetivo
Implementar filtrado automático de recursos FHIR basado en el contexto de paciente del token SMART on FHIR.

## Tareas
- [ ] Extraer contexto de paciente del token JWT:
  - Campo `patient` en token (ej: "Patient/123")
  - O campo `fhirUser` si aplica
- [ ] Crear interceptor o middleware que filtra recursos:
  - Para búsquedas: agregar filtro `subject=Patient/123`
  - Para lecturas: validar que recurso pertenece al paciente
  - Para escrituras: validar que recurso pertenece al paciente
- [ ] Aplicar filtrado en servicios FHIR:
  - `FhirService.searchPatients()` - Filtrar por paciente si contexto existe
  - `FhirService.getPatient()` - Validar pertenencia
  - Similar para Encounter, DocumentReference, etc.
- [ ] Manejar casos especiales:
  - Admin puede ver todos los recursos
  - Practitioner puede ver recursos de pacientes asignados
  - Patient solo puede ver sus propios recursos
- [ ] Agregar logging de filtrado
- [ ] Actualizar tests para incluir filtrado
- [ ] Documentar comportamiento de filtrado

## Lógica de Filtrado

```typescript
// Si token tiene contexto de paciente
if (token.patient) {
  // Filtrar búsquedas por paciente
  queryBuilder.where('patientReference = :patientId', {
    patientId: token.patient
  });

  // Validar pertenencia en lecturas
  if (resource.patientReference !== token.patient) {
    throw new ForbiddenException();
  }
}
```

## Criterios de Aceptación
- [ ] Extracción de contexto de paciente funcionando
- [ ] Filtrado automático implementado
- [ ] Validación de pertenencia funcionando
- [ ] Casos especiales manejados
- [ ] Logging implementado
- [ ] Tests pasando
- [ ] Documentación actualizada

## Referencias
- [SMART on FHIR Patient Context](http://docs.smarthealthit.org/authorization/scopes-and-launch-context/)
- Ver `FhirService` para implementación actual de filtrado
```

**Labels:** `enhancement`, `auth`, `phase-4`, `security`, `fhir`

---

### Tarea 9: Implementar audit logging para SMART on FHIR

**Título:** `PHASE-4 - feat(smart): agregar audit logging específico para accesos SMART on FHIR`

**Descripción:**
```markdown
## Objetivo
Implementar logging de auditoría específico para accesos SMART on FHIR, incluyendo información de aplicación externa y contexto.

## Tareas
- [ ] Extender `AuditService` para incluir información SMART:
  - `clientId` - ID de la aplicación externa
  - `clientName` - Nombre de la aplicación
  - `launchContext` - Contexto de launch (patient, encounter, etc.)
  - `scopes` - Scopes utilizados
- [ ] Agregar logging en endpoints SMART:
  - `/fhir/auth` - Log de solicitudes de autorización
  - `/fhir/token` - Log de intercambios de token
  - `/fhir/authorize` - Log de launch sequences
- [ ] Agregar logging en accesos a recursos FHIR:
  - Incluir información de aplicación externa
  - Incluir contexto de paciente
  - Incluir scopes utilizados
- [ ] Crear entidad `SmartFhirAuditLog` (opcional) o extender `AuditLog`
- [ ] Agregar campos a `AuditLog`:
  - `clientId` (string, nullable)
  - `clientName` (string, nullable)
  - `launchContext` (json, nullable)
- [ ] Actualizar `AuditInterceptor` para incluir información SMART
- [ ] Agregar tests para audit logging
- [ ] Documentar formato de logs

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
```

## Criterios de Aceptación
- [ ] Audit logging extendido con información SMART
- [ ] Logging en endpoints SMART implementado
- [ ] Logging en accesos a recursos implementado
- [ ] Información de aplicación externa incluida
- [ ] Contexto de launch incluido
- [ ] Tests pasando
- [ ] Documentación actualizada

## Referencias
- Ver `AuditService` y `AuditLog` de Fase 2
- [FHIR AuditEvent](https://www.hl7.org/fhir/auditevent.html)
- [SMART on FHIR Audit](http://docs.smarthealthit.org/authorization/audit/)
```

**Labels:** `enhancement`, `audit`, `phase-4`, `security`

---

## 📊 Resumen de Tareas

| # | Tarea | Estimación | Prioridad | Labels |
|---|-------|------------|-----------|--------|
| 1 | Implementar endpoint GET /fhir/auth | 4-6 horas | Alta | `enhancement`, `auth`, `phase-4`, `smart-fhir`, `integration` |
| 2 | Implementar endpoint POST /fhir/token | 4-6 horas | Alta | `enhancement`, `auth`, `phase-4`, `smart-fhir`, `integration` |
| 3 | Implementar endpoint GET /fhir/authorize | 3-4 horas | Alta | `enhancement`, `auth`, `phase-4`, `smart-fhir`, `integration` |
| 4 | Implementar launch sequence completa | 6-8 horas | Alta | `enhancement`, `auth`, `phase-4`, `smart-fhir`, `integration` |
| 5 | Actualizar CapabilityStatement | 2-3 horas | Alta | `enhancement`, `fhir`, `phase-4`, `smart-fhir`, `documentation` |
| 6 | Aplicar guards a endpoints FHIR | 3-4 horas | Alta | `enhancement`, `auth`, `phase-4`, `security`, `fhir` |
| 7 | Validar scopes en endpoints FHIR | 3-4 horas | Alta | `enhancement`, `auth`, `phase-4`, `security`, `fhir` |
| 8 | Implementar filtrado por paciente | 4-6 horas | Alta | `enhancement`, `auth`, `phase-4`, `security`, `fhir` |
| 9 | Implementar audit logging SMART | 3-4 horas | Media | `enhancement`, `audit`, `phase-4`, `smart-fhir`, `security` |

**Tiempo Total Estimado:** 32-45 horas (4-6 días)

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

