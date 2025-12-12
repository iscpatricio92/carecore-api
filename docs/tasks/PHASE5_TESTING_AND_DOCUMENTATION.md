# 📋 Tareas GitHub Projects - Fase 5: Testing y Documentación

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

### HU: Testing Completo y Documentación de Autenticación y Autorización

**Como** desarrollador del equipo CareCore,
**Quiero** tener una suite completa de tests (unitarios y E2E) y documentación exhaustiva sobre autenticación y autorización,
**Para** garantizar la calidad del código, facilitar el mantenimiento futuro, y permitir que nuevos desarrolladores entiendan rápidamente el sistema de autenticación.

#### Criterios de Aceptación

- ✅ Tests unitarios completos para módulo auth, guards y strategies (mayoría completados)
- ⏳ Tests E2E para todos los flujos de autenticación y autorización (parcialmente implementados)
- ⏳ Cobertura de código > 80% en módulos críticos
- ⏳ Documentación completa de flujos de autenticación
- ⏳ Documentación de configuración de Keycloak
- ⏳ Documentación de roles, permisos y scopes
- ⏳ Guías de desarrollo para integración con autenticación
- ⏳ README actualizado con sección de autenticación

#### Tareas Relacionadas

Esta HU incluye las siguientes tareas (ver detalles abajo):

**Testing:**
- ✅ **Tarea 1**: Tests unitarios para módulo auth (mayoría completados)
- ✅ **Tarea 2**: Tests unitarios para guards (completados)
- ✅ **Tarea 3**: Tests unitarios para strategies (completados)
- ✅ **Tarea 4**: Tests E2E para flujo de login (completado - 39 tests)
- ⏳ **Tarea 5**: Tests E2E para flujo OAuth2 (parcialmente implementado)
- ✅ **Tarea 6**: Tests E2E para verificación de practitioner (completado - 42 tests)
- ✅ **Tarea 7**: Tests E2E para SMART on FHIR (completado - 40 tests)

**Documentación:**
- ✅ **Tarea 8**: Documentar flujo de autenticación completo (completado)
- ✅ **Tarea 9**: Documentar configuración de Keycloak (completado)
- ✅ **Tarea 10**: Documentar roles y permisos (completado)
- ✅ **Tarea 11**: Documentar scopes disponibles (completado)
- ⏳ **Tarea 12**: Documentar SMART on FHIR (documentación básica completa, ejemplos avanzados pendientes)
- ⏳ **Tarea 13**: Actualizar README con sección de auth
- ⏳ **Tarea 14**: Crear guía de desarrollo para auth

#### Estimación

- **Tiempo total**: 4-6 días
- **Prioridad**: Media-Alta
- **Dependencias**: Fases 1, 2, 3 y 4 completadas ✅

#### Definición de Terminado (DoD)

- [x] Tests unitarios completos para módulos críticos (mayoría completados)
- [ ] Tests E2E para todos los flujos principales
- [ ] Cobertura de código > 80% en módulos críticos
- [ ] Documentación completa y actualizada
- [ ] README actualizado
- [ ] Guías de desarrollo creadas

---

## 🎯 Tareas Principales

### Tarea 1: Tests unitarios para módulo auth

**Título:** `[PHASE-5] - test(auth): completar tests unitarios para módulo auth`

**Descripción:**
```markdown
## Objetivo
Completar y mejorar los tests unitarios para el módulo de autenticación, asegurando cobertura completa de todos los componentes.

## Tareas
- [x] Tests para `AuthController` (completado)
- [x] Tests para `AuthService` (completado)
- [x] Tests para `JwtStrategy` (completado)
- [ ] Revisar y mejorar cobertura de edge cases
- [ ] Tests para manejo de errores de Keycloak
- [ ] Tests para refresh token flow
- [ ] Tests para logout flow
- [ ] Verificar cobertura > 80%

## Archivos a Testear

- `src/modules/auth/auth.controller.ts`
- `src/modules/auth/auth.service.ts`
- `src/modules/auth/strategies/jwt.strategy.ts`
- `src/modules/auth/services/keycloak-admin.service.ts`

## Criterios de Aceptación
- [x] Tests unitarios para AuthController pasando
- [x] Tests unitarios para AuthService pasando
- [x] Tests unitarios para JwtStrategy pasando
- [ ] Cobertura > 80% en módulo auth
- [ ] Todos los edge cases cubiertos
- [ ] Tests de manejo de errores completos

## Referencias
- Ver tests existentes en `src/modules/auth/**/*.spec.ts`
- Ver [E2E_TESTING.md](../E2E_TESTING.md) para contexto
```

**Labels:** `test`, `auth`, `phase-5`, `unit-test`

---

### Tarea 2: Tests unitarios para guards

**Título:** `[PHASE-5] - test(auth): completar tests unitarios para guards de autenticación y autorización`

**Descripción:**
```markdown
## Objetivo
Completar tests unitarios para todos los guards de autenticación y autorización.

## Tareas
- [x] Tests para `JwtAuthGuard` (completado)
- [x] Tests para `RolesGuard` (completado)
- [x] Tests para `ScopesGuard` (completado)
- [x] Tests para `MFARequiredGuard` (completado)
- [ ] Revisar y mejorar cobertura de edge cases
- [ ] Tests para combinaciones de guards
- [ ] Tests para decoradores `@Public()`, `@Roles()`, `@Scopes()`
- [ ] Verificar cobertura > 90%

## Archivos a Testear

- `src/modules/auth/guards/jwt-auth.guard.ts`
- `src/modules/auth/guards/roles.guard.ts`
- `src/modules/auth/guards/scopes.guard.ts`
- `src/modules/auth/guards/mfa-required.guard.ts`

## Criterios de Aceptación
- [x] Tests unitarios para todos los guards pasando
- [ ] Cobertura > 90% en guards
- [ ] Todos los edge cases cubiertos
- [ ] Tests de combinaciones de guards

## Referencias
- Ver tests existentes en `src/modules/auth/guards/**/*.spec.ts`
```

**Labels:** `test`, `auth`, `phase-5`, `unit-test`

---

### Tarea 3: Tests unitarios para strategies

**Título:** `[PHASE-5] - test(auth): completar tests unitarios para Passport strategies`

**Descripción:**
```markdown
## Objetivo
Completar tests unitarios para las Passport strategies utilizadas en el sistema.

## Tareas
- [x] Tests para `JwtStrategy` (completado)
- [ ] Tests para `KeycloakStrategy` (si aplica)
- [ ] Revisar y mejorar cobertura de edge cases
- [ ] Tests para extracción de scopes del token
- [ ] Tests para extracción de contexto de paciente (SMART on FHIR)
- [ ] Tests para validación de issuer
- [ ] Verificar cobertura > 80%

## Archivos a Testear

- `src/modules/auth/strategies/jwt.strategy.ts`

## Criterios de Aceptación
- [x] Tests unitarios para JwtStrategy pasando
- [ ] Cobertura > 80% en strategies
- [ ] Todos los edge cases cubiertos
- [ ] Tests de validación de tokens completos

## Referencias
- Ver tests existentes en `src/modules/auth/strategies/**/*.spec.ts`
```

**Labels:** `test`, `auth`, `phase-5`, `unit-test`

---

### Tarea 4: Tests E2E para flujo de login

**Título:** `[PHASE-5] - test(auth): crear tests E2E para flujo completo de login`

**Estado:** ✅ **COMPLETADO**

**Descripción:**
```markdown
## Objetivo
Crear tests E2E que validen el flujo completo de login desde el endpoint hasta la obtención del token.

## Tareas
- [x] Tests básicos de login (completado en `test/auth.e2e-spec.ts`)
- [x] Tests para diferentes tipos de usuarios (patient, practitioner, admin) - completado
- [x] Tests para validación de tokens JWT en respuestas - completado
- [x] Tests para refresh token flow (casos de error) - completado
- [x] Tests para diferentes escenarios de error en OAuth2 - completado
- [x] Tests para callback con diferentes estados - completado
- [x] Tests para validación de estructura de tokens - completado
- [ ] Tests para rate limiting (no implementado en el sistema actual)
- [N/A] Tests para login con credenciales inválidas (no aplica - OAuth2 no usa credenciales directas)
- [N/A] Tests para login con usuario inexistente (no aplica - OAuth2 no usa credenciales directas)
- [N/A] Tests para login con contraseña incorrecta (no aplica - OAuth2 no usa credenciales directas)

## Endpoints a Testear

- `POST /api/auth/login` - ✅ Completado (8 tests)
- `POST /api/auth/refresh` - ✅ Completado (8 tests)
- `GET /api/auth/user` - ✅ Completado (7 tests)
- `GET /api/auth/callback` - ✅ Completado (8 tests)
- `POST /api/auth/logout` - ✅ Completado (4 tests)

## Criterios de Aceptación
- [x] Tests E2E básicos de login pasando
- [x] Todos los casos de error cubiertos
- [x] Validación de tokens JWT en respuestas
- [x] Tests para diferentes roles de usuario
- [x] Tests para validación de estructura de tokens (roles, scopes, etc.)

## Tests Agregados

### POST /api/auth/login (8 tests)
- ✅ Debe retornar URL de autorización cuando returnUrl=true
- ✅ Debe redirigir a Keycloak cuando returnUrl no se proporciona
- ✅ Debe establecer cookie oauth_state cuando returnUrl=true
- ✅ Debe establecer cookie oauth_state al redirigir
- ✅ Debe generar diferentes state tokens para cada request
- ✅ Debe incluir redirect_uri en la URL de autorización
- ✅ Debe redirigir cuando returnUrl=1 (no tratado como true)
- ✅ Debe redirigir cuando returnUrl=false

### GET /api/auth/user (7 tests)
- ✅ Debe retornar 401 sin autenticación
- ✅ Debe retornar 401 con formato de token inválido
- ✅ Debe retornar 401 con token malformado
- ✅ Debe retornar información de usuario con token de patient válido
- ✅ Debe retornar información de usuario con token de admin válido
- ✅ Debe retornar información de usuario con token de practitioner válido
- ✅ Debe retornar información de usuario con roles y scopes personalizados

### POST /api/auth/refresh (8 tests)
- ✅ Debe retornar 400 sin refresh token
- ✅ Debe retornar 400 sin body
- ✅ Debe retornar 400/401 con refresh token inválido
- ✅ Debe retornar 400 con refresh token vacío
- ✅ Debe retornar 400/401 con refresh token solo espacios
- ✅ Debe retornar 400/401 cuando refresh token está solo en cookie e inválido
- ✅ Debe manejar refresh token malformado
- ✅ Debe manejar refresh token con formato incorrecto

### GET /api/auth/callback (8 tests)
- ✅ Debe retornar 400 sin parámetro code
- ✅ Debe retornar 400 sin parámetro state
- ✅ Debe retornar 400 con code pero sin state
- ✅ Debe retornar 400 con state pero sin code
- ✅ Debe retornar 400 con code vacío
- ✅ Debe retornar 400 con state vacío
- ✅ Debe redirigir con error cuando state token es inválido
- ✅ Debe redirigir con error cuando cookie de state falta
- ✅ Debe manejar código de autorización malformado

### POST /api/auth/logout (4 tests)
- ✅ Debe retornar 400 sin refresh token
- ✅ Debe retornar 400 con refresh token vacío
- ✅ Debe manejar refresh token inválido
- ✅ Debe manejar refresh token desde cookie (inválido)

## Referencias
- Ver tests existentes en `test/auth.e2e-spec.ts` (39 tests totales)
- Ver [E2E_TESTING.md](../E2E_TESTING.md) para guía
```

**Labels:** `test`, `auth`, `phase-5`, `e2e-test`

---

### Tarea 5: Tests E2E para flujo OAuth2

**Título:** `[PHASE-5] - test(auth): crear tests E2E para flujo completo OAuth2/OIDC`

**Descripción:**
```markdown
## Objetivo
Crear tests E2E que validen el flujo completo OAuth2/OIDC incluyendo autorización, callback y token exchange.

## Tareas
- [x] Tests básicos de OAuth2 (parcialmente implementado)
- [ ] Tests para flujo de autorización completo
- [ ] Tests para callback de Keycloak
- [ ] Tests para intercambio de código por token
- [ ] Tests para manejo de errores en OAuth2
- [ ] Tests para refresh token en OAuth2
- [ ] Tests para logout en OAuth2
- [ ] Tests para diferentes clientes OAuth2

## Endpoints a Testear

- `GET /api/auth/login` (redirige a Keycloak)
- `GET /api/auth/callback` (callback de Keycloak)
- `POST /api/auth/refresh` (refresh token)
- `POST /api/auth/logout` (logout)

## Criterios de Aceptación
- [x] Tests E2E básicos de OAuth2 pasando
- [ ] Flujo completo OAuth2 validado
- [ ] Manejo de errores cubierto
- [ ] Tests para diferentes escenarios de cliente

## Referencias
- Ver tests existentes en `test/auth.e2e-spec.ts`
- Ver [E2E_TESTING.md](../E2E_TESTING.md) para guía
```

**Labels:** `test`, `auth`, `phase-5`, `e2e-test`, `oauth2`

---

### Tarea 6: Tests E2E para verificación de practitioner

**Título:** `[PHASE-5] - test(auth): crear tests E2E para flujo de verificación de practitioner`

**Estado:** ✅ **COMPLETADO**

**Descripción:**
```markdown
## Objetivo
Crear tests E2E que validen el flujo completo de verificación de practitioners, incluyendo upload de documentos y revisión por admin.

## Tareas
- [x] Tests para solicitud de verificación (completado)
- [x] Tests para upload de documentos (cédula/licencia) (completado)
- [x] Tests para revisión por admin (aprobar/rechazar) (completado)
- [x] Tests para actualización automática de roles (completado)
- [x] Tests para validación de documentos (completado)
- [x] Tests para manejo de errores (completado)
- [x] Tests para diferentes estados de verificación (completado)

## Endpoints a Testear

- `POST /api/auth/verify-practitioner` - ✅ Completado (13 tests)
- `GET /api/auth/verify-practitioner` - ✅ Completado (6 tests)
- `GET /api/auth/verify-practitioner/:id` - ✅ Completado (5 tests)
- `PUT /api/auth/verify-practitioner/:id/review` - ✅ Completado (11 tests)

## Criterios de Aceptación
- [x] Tests E2E para solicitud de verificación pasando
- [x] Tests E2E para upload de documentos pasando
- [x] Tests E2E para revisión por admin pasando
- [x] Validación de actualización de roles
- [x] Manejo de errores cubierto

## Tests Agregados (42 tests totales)

### POST /api/auth/verify-practitioner (13 tests)
- ✅ Debe retornar 401 sin autenticación
- ✅ Debe retornar 403 para usuario patient
- ✅ Debe retornar 400 sin archivo
- ✅ Debe retornar 400 sin practitionerId
- ✅ Debe retornar 400 sin documentType
- ✅ Debe retornar 400 con documentType inválido
- ✅ Debe retornar 400 cuando el tamaño del archivo excede el máximo
- ✅ Debe retornar 400 cuando el tipo MIME no está permitido
- ✅ Debe retornar 400 cuando la extensión no está permitida
- ✅ Debe aceptar archivos de imagen válidos (JPG)
- ✅ Debe aceptar archivos de imagen válidos (PNG)
- ✅ Debe manejar archivos sin extensión usando tipo MIME
- ✅ Debe crear solicitud de verificación como practitioner
- ✅ Debe crear solicitud de verificación como admin

### GET /api/auth/verify-practitioner (6 tests)
- ✅ Debe retornar 401 sin autenticación
- ✅ Debe retornar 403 para usuario practitioner
- ✅ Debe retornar 403 para usuario patient
- ✅ Debe retornar 403 para admin sin MFA
- ✅ Debe listar todas las verificaciones como admin con MFA
- ✅ Debe filtrar verificaciones por status
- ✅ Debe soportar paginación

### GET /api/auth/verify-practitioner/:id (5 tests)
- ✅ Debe retornar 401 sin autenticación
- ✅ Debe retornar 403 para usuario practitioner
- ✅ Debe retornar 403 para admin sin MFA
- ✅ Debe retornar 404 para verificación inexistente
- ✅ Debe retornar detalles de verificación como admin con MFA

### PUT /api/auth/verify-practitioner/:id/review (11 tests)
- ✅ Debe retornar 401 sin autenticación
- ✅ Debe retornar 403 para usuario practitioner
- ✅ Debe retornar 403 para admin sin MFA
- ✅ Debe retornar 404 para verificación inexistente
- ✅ Debe retornar 400 sin status
- ✅ Debe retornar 400 con status inválido
- ✅ Debe retornar 400 al rechazar sin razón
- ✅ Debe aprobar verificación como admin con MFA
- ✅ Debe agregar rol practitioner-verified al aprobar
- ✅ Debe manejar fallo al agregar rol (verificación aún aprobada)
- ✅ Debe rechazar verificación con razón como admin con MFA
- ✅ Debe remover rol practitioner-verified al rechazar
- ✅ Debe manejar rechazo cuando el rol no existe (sin error)
- ✅ Debe retornar 400 al revisar verificación ya revisada

### Tests de actualización automática de roles (5 tests nuevos)
- ✅ Debe agregar rol practitioner-verified al aprobar verificación
- ✅ Debe manejar fallo al agregar rol (verificación aún aprobada)
- ✅ Debe remover rol practitioner-verified al rechazar verificación
- ✅ Debe manejar rechazo cuando el rol no existe (sin error)

## Referencias
- Ver [PRACTITIONER_VERIFICATION_GUIDE.md](../PRACTITIONER_VERIFICATION_GUIDE.md)
- Ver tests existentes en `test/practitioner-verification.e2e-spec.ts` (42 tests)
```

**Labels:** `test`, `auth`, `phase-5`, `e2e-test`, `verification`

---

### Tarea 7: Tests E2E para SMART on FHIR

**Título:** `[PHASE-5] - test(auth): crear tests E2E para flujo completo SMART on FHIR`

**Estado:** ✅ **COMPLETADO**

**Descripción:**
```markdown
## Objetivo
Crear tests E2E que validen el flujo completo SMART on FHIR incluyendo launch sequence, autorización y token exchange.

## Tareas
- [x] Tests para launch sequence (`GET /fhir/authorize`) (completado - 12 tests)
- [x] Tests para authorization endpoint (`GET /fhir/auth`) (completado - 12 tests)
- [x] Tests para token endpoint (`POST /fhir/token`) (completado - 11 tests)
- [x] Tests para flujo completo end-to-end (completado)
- [x] Tests para diferentes tipos de launch (standalone, EHR launch) (completado)
- [x] Tests para contexto de paciente en tokens (completado)
- [x] Tests para validación de scopes (completado)
- [x] Tests para manejo de errores SMART on FHIR (completado)
- [x] Tests para CapabilityStatement (`GET /fhir/metadata`) (completado - 2 tests)

## Endpoints a Testear

- `GET /api/fhir/authorize` (launch) - ✅ Completado (12 tests)
- `GET /api/fhir/auth` (authorization) - ✅ Completado (12 tests)
- `POST /api/fhir/token` (token exchange) - ✅ Completado (11 tests)
- `GET /api/fhir/metadata` (CapabilityStatement) - ✅ Completado (2 tests)

## Criterios de Aceptación
- [x] Tests E2E para launch sequence pasando
- [x] Tests E2E para authorization pasando
- [x] Tests E2E para token exchange pasando
- [x] Flujo completo end-to-end validado
- [x] Validación de contexto de paciente
- [x] Manejo de errores cubierto

## Tests Agregados (40 tests totales)

### GET /api/fhir/authorize (Launch) - 12 tests
- ✅ Debe retornar 400 sin parámetros requeridos
- ✅ Debe retornar 400 sin parámetro iss
- ✅ Debe retornar 400 sin parámetro launch
- ✅ Debe retornar 400 sin parámetro client_id
- ✅ Debe retornar 400 sin parámetro redirect_uri
- ✅ Debe retornar 400 sin parámetro scope
- ✅ Debe retornar 400 con iss URL inválida
- ✅ Debe retornar 400 con redirect_uri URL inválida
- ✅ Debe retornar 401 cuando el cliente no se encuentra
- ✅ Debe retornar 401 cuando redirect_uri no coincide
- ✅ Debe redirigir a Keycloak con parámetros válidos
- ✅ Debe incluir parámetro state en redirect cuando se proporciona
- ✅ Debe manejar errores de validación de launch token

### GET /api/fhir/auth (Authorization) - 12 tests
- ✅ Debe retornar 400 sin parámetros requeridos
- ✅ Debe retornar 400 sin client_id
- ✅ Debe retornar 400 sin response_type
- ✅ Debe retornar 400 con response_type inválido
- ✅ Debe retornar 400 sin redirect_uri
- ✅ Debe retornar 400 sin scope
- ✅ Debe retornar 400 con redirect_uri URL inválida
- ✅ Debe retornar 400 con aud URL inválida
- ✅ Debe retornar 401 cuando el cliente no se encuentra
- ✅ Debe retornar 400/401 cuando redirect_uri no coincide
- ✅ Debe redirigir a Keycloak con parámetros válidos
- ✅ Debe incluir parámetro state en redirect cuando se proporciona
- ✅ Debe incluir parámetro aud en redirect cuando se proporciona

### POST /api/fhir/token (Token Exchange) - 11 tests
- ✅ Debe retornar 400 sin parámetros requeridos
- ✅ Debe retornar 400/401 sin grant_type
- ✅ Debe retornar 400 con grant_type inválido
- ✅ Debe retornar 400 sin code para authorization_code grant
- ✅ Debe retornar 400 sin redirect_uri para authorization_code grant
- ✅ Debe retornar 400/401 sin client_id
- ✅ Debe retornar 400 sin refresh_token para refresh_token grant
- ✅ Debe retornar 401 cuando el cliente no se encuentra
- ✅ Debe retornar 400/401 cuando redirect_uri no coincide
- ✅ Debe manejar errores de token exchange
- ✅ Debe manejar grant_type refresh_token
- ✅ Debe manejar token exchange con parámetros válidos

### GET /api/fhir/metadata (CapabilityStatement) - 2 tests
- ✅ Debe retornar CapabilityStatement sin autenticación
- ✅ Debe incluir servicio SMART on FHIR en security

## Referencias
- Ver [PHASE4_SMART_ON_FHIR.md](PHASE4_SMART_ON_FHIR.md)
- Ver tests unitarios en `src/modules/fhir/**/*.spec.ts`
- Ver tests E2E en `test/smart-fhir.e2e-spec.ts` (40 tests)
```

**Labels:** `test`, `auth`, `phase-5`, `e2e-test`, `smart-fhir`

---

### Tarea 8: Documentar flujo de autenticación completo

**Título:** `[PHASE-5] - docs(auth): crear documentación completa del flujo de autenticación`

**Estado:** ✅ **COMPLETADO**

**Descripción:**
```markdown
## Objetivo
Crear documentación exhaustiva que explique todos los flujos de autenticación y autorización del sistema.

## Tareas
- [x] Crear documento `docs/AUTHENTICATION_FLOW.md` (completado)
- [x] Documentar flujo de login básico (completado)
- [x] Documentar flujo OAuth2/OIDC completo (completado)
- [x] Documentar flujo de refresh token (completado)
- [x] Documentar flujo de logout (completado)
- [x] Documentar flujo de verificación de practitioner (completado)
- [x] Documentar flujo SMART on FHIR (completado)
- [x] Incluir diagramas de flujo (completado - diagramas ASCII)
- [x] Incluir ejemplos de requests/responses (completado)
- [x] Incluir casos de error comunes (completado)

## Contenido Esperado

- Diagramas de secuencia para cada flujo ✅
- Ejemplos de código para integración ✅
- Explicación de tokens JWT ✅
- Explicación de scopes y permisos ✅
- Troubleshooting común ✅

## Criterios de Aceptación
- [x] Documento de flujo de autenticación creado
- [x] Todos los flujos documentados
- [x] Diagramas incluidos
- [x] Ejemplos de código incluidos
- [x] Troubleshooting incluido

## Contenido del Documento

El documento `docs/AUTHENTICATION_FLOW.md` incluye:

1. **Visión General**: Arquitectura y componentes
2. **Flujo de Login Básico**: OAuth2/OIDC paso a paso
3. **Flujo de Refresh Token**: Renovación de tokens
4. **Flujo de Logout**: Cierre de sesión y revocación
5. **Flujo de Verificación de Practitioner**: Upload y revisión
6. **Flujo SMART on FHIR**: Integración con EHR
7. **Tokens JWT**: Estructura y validación
8. **Scopes y Permisos**: Tabla de permisos por rol
9. **Casos de Error Comunes**: Soluciones a problemas frecuentes
10. **Troubleshooting**: Guía de solución de problemas
11. **Apéndice**: Ejemplos de código (JavaScript/TypeScript, cURL)

## Referencias
- Ver [AUTH_IMPLEMENTATION_PLAN.md](../AUTH_IMPLEMENTATION_PLAN.md) para contexto
- Ver [SWAGGER_AUTHENTICATION.md](../SWAGGER_AUTHENTICATION.md) para Swagger
- Ver [AUTHENTICATION_FLOW.md](../AUTHENTICATION_FLOW.md) - Documento creado
```

**Labels:** `documentation`, `auth`, `phase-5`

---

### Tarea 9: Documentar configuración de Keycloak

**Título:** `[PHASE-5] - docs(auth): crear documentación completa de configuración de Keycloak`

**Estado:** ✅ **COMPLETADO**

**Descripción:**
```markdown
## Objetivo
Crear documentación exhaustiva sobre cómo configurar y mantener Keycloak en el proyecto.

## Tareas
- [x] Documentación básica de Keycloak (existe en `keycloak/README.md`)
- [x] Documentar configuración de realm (completado)
- [x] Documentar configuración de clientes (completado)
- [x] Documentar configuración de roles (completado)
- [x] Documentar configuración de scopes (completado - referencia a SCOPES_SETUP_GUIDE.md)
- [x] Documentar configuración de MFA (completado - referencia a MFA_SETUP_GUIDE.md)
- [x] Documentar backup y restore (completado - referencia a BACKUP_RESTORE.md)
- [x] Documentar troubleshooting avanzado (completado)
- [x] Incluir ejemplos de configuración (completado)
- [x] Actualizar documentación existente (completado - consolidado en KEYCLOAK_CONFIGURATION.md)

## Contenido Esperado

- Guía paso a paso de configuración inicial ✅
- Configuración de clientes OAuth2 ✅
- Configuración de roles y permisos ✅
- Configuración de scopes ✅
- Configuración de MFA/TOTP ✅
- Scripts de automatización ✅
- Troubleshooting común ✅

## Criterios de Aceptación
- [x] Documentación básica de Keycloak existente
- [x] Documentación completa de configuración
- [x] Ejemplos de configuración incluidos
- [x] Troubleshooting avanzado incluido
- [x] Scripts documentados

## Contenido del Documento

El documento `docs/KEYCLOAK_CONFIGURATION.md` incluye:

1. **Visión General**: Arquitectura y componentes
2. **Instalación e Inicialización**: Setup automático y manual
3. **Configuración del Realm**: Settings básicos y avanzados
4. **Configuración de Clientes**: carecore-api, carecore-web, keycloak-admin-api, SMART apps
5. **Configuración de Roles**: Roles base y asignación
6. **Configuración de Scopes**: Referencia a guía completa
7. **Configuración de MFA**: Referencia a guía completa
8. **Configuración Avanzada**: User federation, Identity providers, Events
9. **Backup y Restore**: Referencia a guía completa
10. **Troubleshooting**: Problemas comunes y soluciones
11. **Scripts de Automatización**: Documentación de todos los scripts

## Referencias
- Ver `keycloak/README.md`
- Ver `keycloak/TROUBLESHOOTING.md`
- Ver `keycloak/BACKUP_RESTORE.md`
- Ver `docs/KEYCLOAK_CONFIGURATION.md` - Documento consolidado creado
```

**Labels:** `documentation`, `auth`, `phase-5`, `keycloak`

---

### Tarea 10: Documentar roles y permisos

**Título:** `[PHASE-5] - docs(auth): crear documentación completa de roles y permisos`

**Estado:** ✅ **COMPLETADO**

**Descripción:**
```markdown
## Objetivo
Crear documentación exhaustiva sobre los roles, permisos y cómo funcionan en el sistema.

## Tareas
- [x] Crear documento `docs/ROLES_AND_PERMISSIONS.md` (completado)
- [x] Documentar todos los roles disponibles (completado - 9 roles)
- [x] Documentar permisos por rol (completado)
- [x] Documentar cómo se asignan roles (completado)
- [x] Documentar cómo se validan roles (completado)
- [x] Documentar `RolesGuard` y decorador `@Roles()` (completado)
- [x] Incluir ejemplos de uso (completado - 5 ejemplos)
- [x] Incluir tabla de permisos por recurso (completado)

## Contenido Esperado

- Lista completa de roles: patient, practitioner, admin, viewer, etc. ✅
- Permisos por rol y recurso FHIR ✅
- Cómo asignar roles en Keycloak ✅
- Cómo usar `@Roles()` en endpoints ✅
- Ejemplos de código ✅
- Tabla de permisos ✅

## Criterios de Aceptación
- [x] Documento de roles y permisos creado
- [x] Todos los roles documentados
- [x] Permisos por recurso documentados
- [x] Ejemplos de uso incluidos
- [x] Tabla de permisos incluida

## Contenido del Documento

El documento `docs/ROLES_AND_PERMISSIONS.md` incluye:

1. **Visión General**: Componentes del sistema y flujo de autorización
2. **Roles Disponibles**: 9 roles documentados con permisos y ejemplos
3. **Permisos por Rol**: Matriz completa de permisos
4. **Asignación de Roles**: Manual, automática y programática
5. **Validación de Roles**: RolesGuard y funcionamiento
6. **Uso en el Código**: Decorador @Roles() y ejemplos
7. **Integración con Scopes**: Roles vs Scopes y combinación
8. **Tabla de Permisos por Recurso**: Patient, Practitioner, Encounter, DocumentReference, Consent
9. **Ejemplos Prácticos**: 5 ejemplos de código
10. **Mejores Prácticas**: 7 mejores prácticas documentadas

## Referencias
- Ver `src/common/constants/roles.ts`
- Ver `src/modules/auth/guards/roles.guard.ts`
- Ver `src/modules/auth/decorators/roles.decorator.ts`
- Ver `docs/ROLES_AND_PERMISSIONS.md` - Documento creado
```

**Labels:** `documentation`, `auth`, `phase-5`, `roles`

---

### Tarea 11: Documentar scopes disponibles

**Título:** `[PHASE-5] - docs(auth): documentar scopes OAuth2 disponibles y su uso`

**Descripción:**
```markdown
## Objetivo
Documentar todos los scopes OAuth2 disponibles y cómo se usan para control de acceso granular.

## Tareas
- [x] Guía de scopes creada (`docs/SCOPES_SETUP_GUIDE.md`)
- [ ] Mejorar documentación con ejemplos de uso
- [ ] Documentar mapeo de scopes a permisos FHIR
- [ ] Documentar `ScopesGuard` y decorador `@Scopes()`
- [ ] Incluir ejemplos de requests con scopes
- [ ] Documentar scopes SMART on FHIR
- [ ] Actualizar guía existente

## Contenido Esperado

- Lista completa de scopes disponibles
- Mapeo de scopes a recursos FHIR
- Cómo solicitar scopes en OAuth2
- Cómo validar scopes en endpoints
- Ejemplos de código
- Scopes SMART on FHIR

## Criterios de Aceptación
- [x] Guía de scopes creada
- [ ] Ejemplos de uso incluidos
- [ ] Mapeo de scopes documentado
- [ ] Scopes SMART on FHIR documentados
- [ ] Guía actualizada y completa

## Referencias
- Ver `docs/SCOPES_SETUP_GUIDE.md`
- Ver `src/common/constants/fhir-scopes.ts`
- Ver `src/modules/auth/guards/scopes.guard.ts`
- Ver `src/modules/auth/services/scope-permission.service.ts`
```

**Labels:** `documentation`, `auth`, `phase-5`, `scopes`

---

### Tarea 12: Documentar SMART on FHIR

**Título:** `[PHASE-5] - docs(auth): crear documentación completa de integración SMART on FHIR`

**Descripción:**
```markdown
## Objetivo
Crear documentación exhaustiva sobre cómo integrar aplicaciones externas usando SMART on FHIR.

## Tareas
- [x] Documentación básica de SMART on FHIR (en PHASE4_SMART_ON_FHIR.md)
- [ ] Crear documento `docs/SMART_ON_FHIR_GUIDE.md`
- [ ] Documentar flujo completo de integración
- [ ] Documentar endpoints SMART on FHIR
- [ ] Documentar launch sequence
- [ ] Documentar scopes SMART on FHIR
- [ ] Incluir ejemplos de integración
- [ ] Incluir ejemplos de código para aplicaciones cliente
- [ ] Documentar troubleshooting

## Contenido Esperado

- Guía de integración paso a paso
- Endpoints disponibles y su uso
- Flujo completo de launch sequence
- Scopes disponibles para SMART on FHIR
- Ejemplos de código para diferentes lenguajes
- Ejemplos de requests/responses
- Troubleshooting común

## Criterios de Aceptación
- [x] Documentación básica de SMART on FHIR existente
- [ ] Guía completa de integración creada
- [ ] Ejemplos de código incluidos
- [ ] Flujo completo documentado
- [ ] Troubleshooting incluido

## Referencias
- Ver [PHASE4_SMART_ON_FHIR.md](PHASE4_SMART_ON_FHIR.md)
- Ver [SMART App Launch](http://hl7.org/fhir/smart-app-launch/)
```

**Labels:** `documentation`, `auth`, `phase-5`, `smart-fhir`, `integration`

---

### Tarea 13: Actualizar README con sección de auth

**Título:** `[PHASE-5] - docs(auth): actualizar README con sección completa de autenticación`

**Descripción:**
```markdown
## Objetivo
Actualizar el README principal del proyecto con una sección completa y clara sobre autenticación y autorización.

## Tareas
- [x] Sección básica de Keycloak en README (existe)
- [ ] Expandir sección de autenticación
- [ ] Agregar diagrama de flujo de autenticación
- [ ] Documentar endpoints de autenticación
- [ ] Documentar roles y permisos básicos
- [ ] Agregar enlaces a documentación detallada
- [ ] Incluir ejemplos de uso rápido
- [ ] Actualizar checklist de funcionalidades

## Contenido Esperado

- Sección "Autenticación y Autorización" en README
- Diagrama de arquitectura de autenticación
- Endpoints principales documentados
- Enlaces a documentación detallada
- Ejemplos de uso rápido
- Checklist actualizado

## Criterios de Aceptación
- [x] Sección básica de autenticación en README
- [ ] Sección expandida y completa
- [ ] Diagrama incluido
- [ ] Enlaces a documentación detallada
- [ ] Ejemplos de uso incluidos

## Referencias
- Ver `README.md` sección actual de autenticación
- Ver [AUTH_IMPLEMENTATION_PLAN.md](../AUTH_IMPLEMENTATION_PLAN.md)
```

**Labels:** `documentation`, `auth`, `phase-5`, `readme`

---

### Tarea 14: Crear guía de desarrollo para auth

**Título:** `[PHASE-5] - docs(auth): crear guía de desarrollo para integración con autenticación`

**Descripción:**
```markdown
## Objetivo
Crear una guía práctica para desarrolladores sobre cómo integrar autenticación y autorización en nuevos endpoints y módulos.

## Tareas
- [ ] Crear documento `docs/DEVELOPER_GUIDE_AUTH.md`
- [ ] Documentar cómo proteger endpoints con guards
- [ ] Documentar cómo usar decoradores `@Roles()` y `@Scopes()`
- [ ] Documentar cómo acceder al usuario autenticado
- [ ] Documentar cómo validar permisos
- [ ] Documentar cómo implementar filtrado por paciente (SMART on FHIR)
- [ ] Incluir ejemplos de código
- [ ] Incluir mejores prácticas
- [ ] Incluir patrones comunes

## Contenido Esperado

- Cómo proteger un endpoint nuevo
- Cómo validar roles y scopes
- Cómo acceder al usuario autenticado
- Cómo implementar filtrado por contexto
- Ejemplos de código completos
- Mejores prácticas
- Patrones comunes y anti-patrones

## Criterios de Aceptación
- [ ] Guía de desarrollo creada
- [ ] Todos los casos de uso documentados
- [ ] Ejemplos de código incluidos
- [ ] Mejores prácticas incluidas
- [ ] Patrones comunes documentados

## Referencias
- Ver `src/modules/auth/guards/` para ejemplos
- Ver `src/modules/auth/decorators/` para ejemplos
- Ver `src/modules/fhir/fhir.controller.ts` para ejemplos completos
```

**Labels:** `documentation`, `auth`, `phase-5`, `developer-guide`

---

## 📊 Resumen de Tareas

| # | Tarea | Estado | Estimación | Prioridad | Labels |
|---|-------|--------|------------|-----------|--------|
| 1 | Tests unitarios módulo auth | ✅ Mayoría completado | 2-3 horas | Alta | `test`, `auth`, `phase-5`, `unit-test` |
| 2 | Tests unitarios guards | ✅ Completado | 1-2 horas | Alta | `test`, `auth`, `phase-5`, `unit-test` |
| 3 | Tests unitarios strategies | ✅ Completado | 1-2 horas | Alta | `test`, `auth`, `phase-5`, `unit-test` |
| 4 | Tests E2E flujo login | ⏳ Parcial | 3-4 horas | Alta | `test`, `auth`, `phase-5`, `e2e-test` |
| 5 | Tests E2E flujo OAuth2 | ⏳ Parcial | 3-4 horas | Alta | `test`, `auth`, `phase-5`, `e2e-test`, `oauth2` |
| 6 | Tests E2E verificación practitioner | ⏳ Pendiente | 2-3 horas | Media | `test`, `auth`, `phase-5`, `e2e-test`, `verification` |
| 7 | Tests E2E SMART on FHIR | ⏳ Pendiente | 4-6 horas | Alta | `test`, `auth`, `phase-5`, `e2e-test`, `smart-fhir` |
| 8 | Documentar flujo autenticación | ⏳ Pendiente | 3-4 horas | Media | `documentation`, `auth`, `phase-5` |
| 9 | Documentar configuración Keycloak | ⏳ Parcial | 2-3 horas | Media | `documentation`, `auth`, `phase-5`, `keycloak` |
| 10 | Documentar roles y permisos | ⏳ Pendiente | 2-3 horas | Media | `documentation`, `auth`, `phase-5`, `roles` |
| 11 | Documentar scopes disponibles | ✅ Completado | 1-2 horas | Media | `documentation`, `auth`, `phase-5`, `scopes` |
| 12 | Documentar SMART on FHIR | ⏳ Parcial | 3-4 horas | Media | `documentation`, `auth`, `phase-5`, `smart-fhir`, `integration` |
| 13 | Actualizar README con auth | ⏳ Parcial | 1-2 horas | Media | `documentation`, `auth`, `phase-5`, `readme` |
| 14 | Crear guía desarrollo auth | ⏳ Pendiente | 2-3 horas | Media | `documentation`, `auth`, `phase-5`, `developer-guide` |

**Tiempo Total Estimado:** 30-42 horas (4-6 días)
**Tiempo Completado:** ~8-12 horas (3 tareas completadas, 3 parciales)
**Tiempo Restante:** ~22-30 horas (8 tareas pendientes, 3 parciales)

---

## 🚀 Cómo Usar Esta Lista

### Opción 1: Crear Issues Individuales
1. Copia cada tarea como un nuevo Issue en GitHub
2. Usa el título y descripción proporcionados
3. Agrega los labels sugeridos
4. Asigna a un milestone "Fase 5: Testing y Documentación"

### Opción 2: Crear Issue Épico (HU)
1. Crea un issue principal "Fase 5: Testing y Documentación" (HU)
2. Crea issues hijos para cada tarea
3. Usa GitHub Projects para organizar

### Opción 3: Usar Script Automático
1. Ejecuta: `node scripts/create-github-tasks-phase5.js`
2. El script creará la HU y todas las tareas automáticamente
3. Las tareas se vincularán a la HU como parent

---

**Última actualización**: 2025-01-27
**Estado de la Fase 5**: ⏳ **EN PROGRESO** (3/14 tareas completadas, 3 parciales)

---

## 📝 Notas de Implementación

### Tareas Completadas (3/14) ✅

#### ✅ Tarea 1: Tests unitarios módulo auth
- **Estado:** Mayoría completado
- **Archivos de tests existentes:**
  - `src/modules/auth/auth.controller.spec.ts` - Tests completos
  - `src/modules/auth/auth.service.spec.ts` - Tests completos
  - `src/modules/auth/strategies/jwt.strategy.spec.ts` - Tests completos
- **Pendiente:** Revisar y mejorar cobertura de edge cases

#### ✅ Tarea 2: Tests unitarios guards
- **Estado:** Completado
- **Archivos de tests existentes:**
  - `src/modules/auth/guards/jwt-auth.guard.spec.ts` - Tests completos
  - `src/modules/auth/guards/roles.guard.spec.ts` - Tests completos
  - `src/modules/auth/guards/scopes.guard.spec.ts` - Tests completos
  - `src/modules/auth/guards/mfa-required.guard.spec.ts` - Tests completos

#### ✅ Tarea 3: Tests unitarios strategies
- **Estado:** Completado
- **Archivos de tests existentes:**
  - `src/modules/auth/strategies/jwt.strategy.spec.ts` - Tests completos

#### ✅ Tarea 11: Documentar scopes disponibles
- **Estado:** Completado
- **Archivo:** `docs/SCOPES_SETUP_GUIDE.md` - Guía completa creada

### Tareas Parciales (3/14) ⏳

#### ⏳ Tarea 4: Tests E2E flujo login
- **Estado:** Parcialmente implementado
- **Archivo:** `test/auth.e2e-spec.ts` - Tests básicos existentes
- **Pendiente:** Completar casos de error y edge cases

#### ⏳ Tarea 5: Tests E2E flujo OAuth2
- **Estado:** Parcialmente implementado
- **Archivo:** `test/auth.e2e-spec.ts` - Tests básicos existentes
- **Pendiente:** Completar flujo completo OAuth2

#### ✅ Tarea 9: Documentar configuración Keycloak
- **Estado:** Completado
- **Archivos existentes:**
  - `keycloak/README.md` - Documentación básica
  - `keycloak/TROUBLESHOOTING.md` - Guía de troubleshooting
  - `keycloak/BACKUP_RESTORE.md` - Guía de backup/restore
- **Nuevo archivo:** `docs/KEYCLOAK_CONFIGURATION.md` - Documentación consolidada completa (835 líneas)

#### ⏳ Tarea 12: Documentar SMART on FHIR
- **Estado:** Parcialmente implementado
- **Archivo:** `docs/tasks/PHASE4_SMART_ON_FHIR.md` - Documentación básica
- **Pendiente:** Crear guía completa de integración con ejemplos

#### ⏳ Tarea 13: Actualizar README con auth
- **Estado:** Parcialmente implementado
- **Archivo:** `README.md` - Sección básica existente
- **Pendiente:** Expandir sección con más detalles

### Tareas Pendientes (8/14) ⏳

#### ⏳ Tarea 6: Tests E2E verificación practitioner
- **Estado:** Pendiente
- **Archivo:** Crear `test/practitioner-verification.e2e-spec.ts`

#### ⏳ Tarea 7: Tests E2E SMART on FHIR
- **Estado:** Pendiente
- **Archivo:** Crear `test/smart-fhir.e2e-spec.ts`

#### ✅ Tarea 8: Documentar flujo autenticación
- **Estado:** Completado
- **Archivo:** `docs/AUTHENTICATION_FLOW.md` - Documento completo creado (940 líneas)

#### ✅ Tarea 10: Documentar roles y permisos
- **Estado:** Completado
- **Archivo:** `docs/ROLES_AND_PERMISSIONS.md` - Documentación completa creada (816 líneas)

#### ⏳ Tarea 14: Crear guía desarrollo auth
- **Estado:** Pendiente
- **Archivo:** Crear `docs/DEVELOPER_GUIDE_AUTH.md`

