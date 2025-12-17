# 📋 Tareas para GitHub Projects - Migración a Monorepo

Este documento contiene las tareas listas para copiar y crear como Issues en GitHub Projects.

**Formato:** Cada tarea está lista para crear como Issue individual.

---

## 🎯 Historia de Usuario Principal

**Título:** Migrar proyecto a estructura de monorepo

**Descripción:**
Como desarrollador, quiero migrar el proyecto a una estructura de monorepo para compartir código entre backend, frontend web y mobile, facilitando el mantenimiento y asegurando type safety end-to-end.

**Labels:** `refactor`, `build`, `priority:high`

---

## 📦 Fase 1: Preparación y Estructura Base

### Issue 1: Crear estructura de directorios del monorepo

**Título:** `build: crear estructura base de monorepo`

**Descripción:**
Crear la estructura base de carpetas para el monorepo.

**Tareas:**

- [ ] Crear directorio `packages/`
- [ ] Crear `packages/api/` (para backend actual)
- [ ] Crear `packages/shared/` (para código compartido)
- [ ] Crear `packages/web/` (placeholder para futuro)
- [ ] Crear `packages/mobile/` (placeholder para futuro)
- [ ] Crear `tools/` (para scripts compartidos)

**Labels:** `build`, `priority:critical`

---

### Issue 2: Configurar NPM Workspaces en root

**Título:** `build: configurar NPM workspaces en root`

**Descripción:**
Configurar el `package.json` raíz con workspaces y scripts base.

**⚠️ Nota:** Se eligió **NPM Workspaces** en lugar de Nx porque el proyecto es pequeño/mediano (3-4 paquetes), requiere setup rápido (30 min vs 2-4 horas), y es suficiente para nuestras necesidades. Ver [MONOREPO_TOOL_COMPARISON.md](../../MONOREPO_TOOL_COMPARISON.md) para detalles.

**Tareas:**

- [ ] Crear `package.json` en root con workspaces
- [ ] Instalar dependencias de desarrollo en root (typescript, prettier, eslint)
- [ ] Turborepo es opcional y puede agregarse después si se necesita optimización
- [ ] Crear `.npmrc` con configuraciones de workspaces (opcional)
- [ ] Verificar que `npm install` funciona
- [ ] Verificar que workspaces se detectan correctamente (`npm ls --workspaces`)

**Labels:** `build`, `priority:critical`

---

### Issue 3: Configurar TypeScript base compartido

**Título:** `build: configurar TypeScript base para monorepo`

**Descripción:**
Crear configuración base de TypeScript para el monorepo.

**Tareas:**

- [ ] Crear `tsconfig.base.json` en root
- [ ] Crear `tsconfig.json` en root que extienda base
- [ ] Configurar paths para `@carecore/shared`
- [ ] Documentar estructura de configuraciones

**Labels:** `build`, `priority:high`

---

## 🔄 Fase 2: Migración del Backend

### Issue 4: Mover código del backend a packages/api

**Título:** `refactor: mover backend a packages/api`

**Descripción:**
Mover todo el código actual del backend a `packages/api/`.

**Tareas:**

- [ ] Mover `src/` → `packages/api/src/`
- [ ] Mover `test/` → `packages/api/test/`
- [ ] Mover `scripts/` → `packages/api/scripts/`
- [ ] Mover `keycloak/` → `packages/api/keycloak/`
- [ ] Mover `docs/` → root
- [ ] Mover archivos de configuración (nest-cli.json, jest.config.js, etc.)
- [ ] Mover `package.json` → `packages/api/package.json`
- [ ] Actualizar `name` en package.json a `@carecore/api`

**Labels:** `refactor`, `priority:critical`

---

### Issue 5: Actualizar paths e imports en packages/api

**Título:** `refactor: actualizar paths e imports en packages/api`

**Descripción:**
Actualizar todos los imports y paths en `packages/api` para que funcionen con la nueva estructura.

**Tareas:**

- [ ] Actualizar `tsconfig.json` en `packages/api/`
- [ ] Actualizar imports en todo el código
- [ ] Actualizar `jest.config.js` con nuevos paths
- [ ] Actualizar `nest-cli.json`
- [ ] Verificar que `npm run build` funciona
- [ ] Verificar que `npm run test` funciona

**Labels:** `refactor`, `priority:critical`

---

### Issue 6: Actualizar package.json de packages/api

**Título:** `build: actualizar package.json de packages/api para monorepo`

**Descripción:**
Ajustar `package.json` de `packages/api` para monorepo.

**Tareas:**

- [ ] Actualizar `name` a `@carecore/api`
- [ ] Verificar dependencias
- [ ] Actualizar scripts si es necesario
- [ ] Agregar dependencia a `@carecore/shared` (cuando exista)
- [ ] Verificar que `prepare` script funcione con husky

**Labels:** `build`, `priority:high`

---

## 📚 Fase 3: Crear Paquete Shared

### Issue 7: Crear estructura de packages/shared

**Título:** `build: crear estructura de packages/shared`

**Descripción:**
Crear la estructura base del paquete compartido.

**Tareas:**

- [ ] Crear `packages/shared/package.json` con name `@carecore/shared`
- [ ] Crear estructura de directorios (types, constants, utils, config)
- [ ] Crear `packages/shared/tsconfig.json`
- [ ] Crear `packages/shared/src/index.ts` (barrel export)

**Labels:** `build`, `priority:high`

---

### Issue 8: Migrar interfaces FHIR a packages/shared

**Título:** `refactor: migrar interfaces FHIR a packages/shared`

**Descripción:**
Mover todas las interfaces FHIR a `packages/shared`.

**Tareas:**

- [ ] Mover `src/common/interfaces/fhir.interface.ts` → `packages/shared/src/types/`
- [ ] Actualizar exports en `packages/shared/src/index.ts`
- [ ] Actualizar imports en `packages/api` a `@carecore/shared`
- [ ] Verificar que no haya imports rotos
- [ ] Ejecutar tests para verificar

**Labels:** `refactor`, `priority:high`

---

### Issue 9: Migrar constantes a packages/shared

**Título:** `refactor: migrar constantes a packages/shared`

**Descripción:**
Mover constantes (scopes, resource types, actions) a `packages/shared`.

**Tareas:**

- [ ] Mover `fhir-scopes.ts` → `packages/shared/src/constants/`
- [ ] Mover `fhir-resource-types.ts` → `packages/shared/src/constants/`
- [ ] Mover `fhir-actions.ts` → `packages/shared/src/constants/` (si existe)
- [ ] Actualizar exports en `packages/shared/src/index.ts`
- [ ] Actualizar imports en `packages/api`
- [ ] Ejecutar tests

**Labels:** `refactor`, `priority:high`

---

### Issue 10: Migrar interfaces de User a packages/shared

**Título:** `refactor: migrar interfaces de User a packages/shared`

**Descripción:**
Mover interfaces relacionadas con User y Auth a `packages/shared` (si son útiles para frontend).

**Tareas:**

- [ ] Revisar `src/modules/auth/interfaces/user.interface.ts`
- [ ] Mover a `packages/shared/src/types/user.interface.ts` si corresponde
- [ ] Actualizar exports
- [ ] Actualizar imports en `packages/api`
- [ ] Verificar tests

**Labels:** `refactor`, `priority:medium`

---

### Issue 11: Configurar build de packages/shared

**Título:** `build: configurar build de packages/shared`

**Descripción:**
Configurar el proceso de build para `packages/shared`.

**Tareas:**

- [ ] Agregar script `build` en `packages/shared/package.json`
- [ ] Configurar TypeScript para generar `.d.ts`
- [ ] Verificar que `npm run build` genera archivos correctos
- [ ] Probar que `@carecore/shared` puede ser importado desde `packages/api`

**Labels:** `build`, `priority:high`

---

## 🐳 Fase 4: Actualización de Docker y Scripts

### Issue 12: Actualizar Dockerfile para monorepo

**Título:** `build: actualizar Dockerfile para monorepo`

**Descripción:**
Actualizar Dockerfile para trabajar con estructura de monorepo.

**Tareas:**

- [ ] Actualizar `COPY` commands para `packages/api/` y `packages/shared/`
- [ ] Ajustar paths de `src` a `packages/api/src`
- [ ] Asegurar que `packages/shared` se construya antes de `packages/api`
- [ ] Actualizar healthcheck si es necesario
- [ ] Probar build de Docker

**Labels:** `build`, `priority:high`

---

### Issue 13: Actualizar docker-compose.yml para monorepo

**Título:** `build: actualizar docker-compose para monorepo`

**Descripción:**
Actualizar docker-compose para usar paths correctos del monorepo.

**Tareas:**

- [ ] Actualizar `context` en servicio `api`
- [ ] Actualizar `volumes` si hay montajes
- [ ] Verificar que scripts montados funcionen
- [ ] Probar `docker-compose up`

**Labels:** `build`, `priority:high`

---

### Issue 14: Actualizar Makefile para monorepo

**Título:** `build: actualizar Makefile para monorepo`

**Descripción:**
Actualizar Makefile para trabajar con estructura de monorepo.

**Tareas:**

- [ ] Revisar todos los targets del Makefile
- [ ] Actualizar paths a `packages/api/scripts/` o `tools/`
- [ ] Actualizar comandos `npm` para workspaces
- [ ] Verificar targets críticos (docker-up, docker-down, dev, build, test)
- [ ] Probar todos los targets principales

**Labels:** `build`, `priority:high`

---

### Issue 15: Actualizar scripts de utilidad

**Título:** `refactor: actualizar scripts para monorepo`

**Descripción:**
Revisar y actualizar scripts en `scripts/` o `packages/api/scripts/`.

**Tareas:**

- [ ] Decidir ubicación de scripts (API o compartidos)
- [ ] Actualizar paths en scripts
- [ ] Actualizar scripts de GitHub tasks si existen
- [ ] Verificar que scripts ejecuten correctamente

**Labels:** `refactor`, `priority:medium`

---

## 📝 Fase 5: Configuración de Commitizen

### Issue 16: Configurar Commitizen en root

**Título:** `build: configurar Commitizen para commits estructurados`

**Descripción:**
Configurar Commitizen para commits estructurados en el monorepo.

**Tareas:**

- [ ] Instalar `commitizen` y `cz-conventional-changelog` en root
- [ ] Agregar configuración en `package.json` root
- [ ] Agregar script `commit` en root
- [ ] Probar `npm run commit`

**Labels:** `build`, `priority:medium`

---

### Issue 17: Actualizar Husky y commitlint para monorepo

**Título:** `build: actualizar Husky y commitlint para monorepo`

**Descripción:**
Asegurar que Husky y commitlint funcionen correctamente en monorepo.

**Tareas:**

- [ ] Verificar que `commitlint.config.mjs` esté en root
- [ ] Actualizar `.husky/commit-msg` si es necesario
- [ ] Actualizar `.husky/pre-commit` si es necesario
- [ ] Probar hooks (commit con formato incorrecto debe fallar)

**Labels:** `build`, `priority:medium`

---

## 🧪 Fase 6: Configuración de Testing y CI/CD

### Issue 18: Actualizar configuraciones de Jest

**Título:** `build: actualizar configuraciones de Jest para monorepo`

**Descripción:**
Actualizar configuraciones de Jest para monorepo.

**Tareas:**

- [ ] Verificar `jest.config.js` en `packages/api/`
- [ ] Verificar `test/jest-e2e.json`
- [ ] Verificar `jest.integration.js`
- [ ] Probar todos los tipos de tests
- [ ] Verificar cobertura funciona

**Labels:** `build`, `priority:high`

---

### Issue 19: Actualizar scripts de testing en package.json

**Título:** `build: agregar scripts de testing en root para monorepo`

**Descripción:**
Asegurar que scripts de testing funcionen desde root y desde packages/api.

**Tareas:**

- [ ] Agregar scripts en root `package.json` para ejecutar tests
- [ ] Verificar que scripts en `packages/api/package.json` funcionen
- [ ] Probar ejecución desde root y desde packages/api

**Labels:** `build`, `priority:medium`

---

### Issue 20: Actualizar CI/CD (si existe)

**Título:** `ci: actualizar workflows para monorepo`

**Descripción:**
Actualizar workflows de GitHub Actions (o CI/CD) para monorepo.

**Tareas:**

- [ ] Buscar archivos `.github/workflows/*.yml`
- [ ] Actualizar paths en workflows
- [ ] Actualizar comandos para workspaces
- [ ] Probar workflow (si es posible)

**Labels:** `ci`, `priority:medium`

---

## 🧹 Fase 7: Limpieza y Documentación

### Issue 21: Limpiar archivos obsoletos

**Título:** `chore: eliminar archivos obsoletos después de migración`

**Descripción:**
Eliminar archivos que ya no son necesarios en root.

**Tareas:**

- [ ] Identificar archivos que ya no se usan en root
- [ ] Verificar que no se rompa nada
- [ ] Eliminar archivos obsoletos
- [ ] Actualizar `.gitignore` si es necesario
- [ ] Si ya no son necesarios eliminar los archivos del folder docs/tasks

**Labels:** `chore`, `priority:low`

---

### Issue 22: Actualizar .gitignore para monorepo

**Título:** `build: actualizar .gitignore para monorepo`

**Descripción:**
Actualizar `.gitignore` para estructura de monorepo.

**Tareas:**

- [ ] Agregar patrones para monorepo (`packages/*/node_modules/`, etc.)
- [ ] Mantener patrones existentes que apliquen
- [ ] Verificar que no se ignore nada importante

**Labels:** `build`, `priority:medium`

---

### Issue 23: Actualizar documentación

**Título:** `docs: actualizar documentación para monorepo`

**Descripción:**
Actualizar toda la documentación para reflejar estructura de monorepo.

**Tareas:**

- [ ] Actualizar `README.md`
- [ ] Actualizar `docs/PROJECT_CONTEXT.md`
- [ ] Actualizar `docs/FRONTEND_ARCHITECTURE_DECISION.md`
- [ ] Crear `docs/MONOREPO_GUIDE.md`

**Labels:** `docs`, `priority:high`

---

### Issue 24: Verificación final y testing completo

**Título:** `test: verificación final de migración a monorepo`

**Descripción:**
Ejecutar suite completa de tests y verificar que todo funciona.

**Tareas:**

- [ ] Ejecutar `npm install` en root
- [ ] Ejecutar `npm run build` en todos los paquetes
- [ ] Ejecutar todos los tests (unit, e2e, integration)
- [ ] Verificar Docker (`make docker-up`)
- [ ] Verificar que no hay regresiones
- [ ] Crear checklist de verificación

**Labels:** `test`, `priority:critical`

---

## 📊 Resumen para GitHub Projects

**Total de Issues:** 24
**Estimación Total:** 8-10 días
**Fases:** 7

**Distribución por Prioridad:**

- Crítica: 5 issues
- Alta: 10 issues
- Media: 7 issues
- Baja: 1 issue

**Distribución por Tipo:**

- `build`: 13 issues
- `refactor`: 5 issues
- `test`: 1 issue
- `docs`: 1 issue
- `ci`: 1 issue
- `chore`: 1 issue

---

## 🎯 Cómo Usar Este Documento

1. **Crear Issues:** Copia cada issue y créalo en GitHub
2. **Agregar a Project:** Agrega todos los issues al proyecto de GitHub
3. **Organizar por Fases:** Crea columnas o labels por fase
4. **Seguir Orden:** Respetar el orden de las fases es importante
5. **Commits:** Usar el formato de commit sugerido en cada issue

---

**Última actualización:** 2025-01-27
