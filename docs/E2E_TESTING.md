# E2E Testing Guide

## Overview

End-to-End (E2E) tests verify the complete flow of the application, from HTTP requests to responses, including authentication, authorization, and business logic.

## Running E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run E2E tests with coverage
npm run test:e2e:cov

# Run E2E tests in watch mode
npm run test:e2e:watch

# Run E2E tests in debug mode
npm run test:e2e:debug

# Run all tests (unit + E2E)
npm run test:all

# Run all tests with coverage
npm run test:all:cov
```

## Pruebas de Integración (nuevo)

- Config: `jest.integration.js`
- Scripts:
  - `npm run test:integration`
  - `npm run test:integration:cov` (reporte en `coverage-integration/`)
- Ubicación sugerida de tests: `test/integration/**/*.int-spec.ts` (o sufijo `.int-spec.ts` en cualquier ruta).
- Setup global: `test/integration/setup.ts` (timeout 15s, espacio para mocks globales de Keycloak/JWKS/fetch/fs).
- Uso: orientar a lógica de negocio y dependencias externas sin levantar HTTP completo; reutilizar helpers/mocks de E2E cuando aplique.

## Test Structure

```
test/
├── auth.e2e-spec.ts          # Authentication flow tests
├── authorization.e2e-spec.ts # Role-based access control tests
├── fhir-protected.e2e-spec.ts # Protected endpoint tests
├── helpers/
│   ├── jwt-helper.ts          # JWT token generation helpers
│   ├── mock-jwt-strategy.ts   # Mock JWT strategy for tests
│   ├── test-module.factory.ts # Test app factory
│   └── test-app.factory.ts    # Alternative test app factory
└── jest-e2e.json              # Jest configuration for E2E
```

## Coverage Reports

- **Unit Tests**: Miden cobertura de código (líneas, ramas, funciones)
- **E2E Tests**: Miden cobertura de endpoints (rutas probadas)

```bash
npm run test:e2e:cov
open coverage-e2e/index.html
```

## Test Helpers

- `generatePatientToken`, `generateAdminToken` en `test/helpers/jwt-helper.ts`
- `createTestApp` en `test/helpers/test-module.factory.ts`

## Configuration

- Configuración Jest E2E: `test/jest-e2e.json` (timeout 30s, cobertura enfocada en controllers/services, usa `MockJwtStrategy`)
- Variables de entorno de test: `NODE_ENV=test`, `DB_*` test, etc. (solo para pruebas)

## Best Practices

1. Pruebas independientes
2. Cerrar la app en `afterAll`
3. Usar helpers de tokens
4. Afirmar status y cuerpo de respuesta
5. Mantener pruebas rápidas (<3s)

## Troubleshooting

- 401: verificar `MockJwtStrategy` y headers Authorization
- Timeout: revisar DB/mocks
- Cobertura 0%: usar `npm run test:e2e:cov` y revisar `coverage-e2e/`

## CI/CD

- Hooks: `.husky/pre-commit`
- CI: `.github/workflows/ci.yml`

---

# Análisis de Cobertura E2E

## Resumen General

- **Cobertura Total**: 80.73% (Statements), 72.39% (Branches), 85.02% (Functions), 80.73% (Lines)
- **Objetivo**: 75%+ en statements ✅
- **Tests E2E**: 278 tests en 11 suites

## Archivos con Baja Cobertura (Prioridad Alta)

- **jwt.strategy.ts** - 25.78% ⚠️ (líneas 29-79, 86-116, 123-158) → Mejor con unit tests (ver Fase 6.7)
- **keycloak-admin.service.ts** - 28.23% ⚠️ (líneas 38-516) → Mejor con unit tests (ver Fase 6.7)
- **auth.service.ts** - 71.92% ⚠️ (líneas 80-853) – ramas OAuth2 difíciles de ejercitar en E2E

## Cobertura Media (Prioridad Media)

- **fhir.service.ts** - 85.68% ✅ (validaciones/búsquedas/soft delete)

## Buena Cobertura ✅

- **consents.service.ts** - 92.4%
- **document-storage.service.ts** - 93.29%
- **fhir.controller.ts** - 93.82%
- **auth.controller.ts** - 90.51%
- Controllers y services de documents, encounters, patients, practitioners, consents controller: 100%

## Resumen de Mejoras

- Antes: 62.27% / 68.35% / 60.42% / 62.27%
- Después: 80.73% / 72.39% / 85.02% / 80.73%
- Tests E2E: 213 → 278 (+65) | Suites: 10 → 11 (+1)

---

# Plan de Acción E2E - Fase 6

## Prioridad Alta (cerca de objetivo)

1. **fhir.controller.ts** (93.82% → 95%+) ✅
   - Tests searchPractitioners (líneas 207-216) y searchEncounters (309-320)
2. **consents.service.ts** (88.13% → 90%+) ✅
   - Casos edge: entityToConsent error (48-49), patientReference null (99-100), practitioners/scope (114-159), validatePatientOwnership edge (176-199), audit error (271), validateExpiredConsents (546-550)
3. **document-storage.service.ts** (87.19% → 90%+) ✅
   - Métodos: getExtensionFromMimeType (133-142), getDocumentPath (148-149), deleteDocument (155-163)

## Prioridad Media

4. **fhir.service.ts** (78.41% → 85%+) ✅
   - searchPractitioners/searchEncounters, validaciones adicionales PUT/DELETE, soft delete edge
5. **auth.service.ts** (71.92% → 80%+) ⏳
   - OAuth2: getAuthorizationUrl validaciones; exchangeCodeForTokens/refreshToken/logout error handling
6. **audit.service.ts** (68.28% → 75%+) 📄
   - Nota: se cubre mejor con unit tests/integración (mock del repositorio/interceptor). En E2E no se expone la tabla de auditoría ni hay endpoints para validar inserciones. Evitar modificar el bootstrap solo para auditoría.

## Prioridad Baja (evaluación)

7. **jwt.strategy.ts** (25.78%) y **keycloak-admin.service.ts** (28.23%) 📄
   - Evaluar factibilidad E2E vs. dejar en unit tests; documentar decisión

## Objetivos de Cobertura

- fhir.controller.ts: 95%+
- consents.service.ts: 90%+
- document-storage.service.ts: 90%+
- fhir.service.ts: 85%+
- auth.service.ts: 80%+
- audit.service.ts: 75%+

## Estimación

- Tests adicionales: ~30-40
- Archivo nuevo potencial: `test/audit.e2e-spec.ts`
- Archivos a modificar: practitioners.e2e-spec.ts, encounters.e2e-spec.ts, consents.e2e-spec.ts, auth.e2e-spec.ts, practitioner-verification.e2e-spec.ts

## Fase 6.7 - Decisión sobre jwt.strategy.ts y keycloak-admin.service.ts

- **jwt.strategy.ts (25.78%)**: no se recomienda E2E porque requiere JWKS real de Keycloak, claves RS256 y red externa. Cobertura adecuada con unit tests que mockean `jwks-rsa`, `jsonwebtoken.decode`, y validan flujos de error (kid faltante, key not found, issuer mismatch, payload incompleto).
- **keycloak-admin.service.ts (28.23%)**: no se recomienda E2E porque depende de Keycloak Admin API real (tokens client_credentials, roles, credenciales TOTP) y llamadas `fetch` directas. Mejor cubrir con unit/integración mockeando `@keycloak/keycloak-admin-client`, `fetch`, y simulando respuestas/errores (auth, roles, MFA).
- **Acción sugerida**: mantenerlos en pruebas unitarias/integración con mocks controlados; no modificar bootstrap E2E ni levantar Keycloak real en CI para estos casos.

## Notas

- OAuth2/mocks Keycloak pueden requerir mayor complejidad
- Auditoría puede requerir verificar interceptor
- jwt.strategy / keycloak-admin: probablemente mejor con unit tests
