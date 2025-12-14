# 📦 Migración a Monorepo - Lista de Tareas

**Historia de Usuario:** Como desarrollador, quiero migrar el proyecto a una estructura de monorepo para compartir código entre backend, frontend web y mobile, facilitando el mantenimiento y asegurando type safety end-to-end.

**Prioridad:** Alta
**Estimación:** 8-10 días
**Tipo:** `refactor` / `build`

---

## 🎯 Objetivos

- ✅ Migrar backend actual a `packages/api`
- ✅ Crear paquete `packages/shared` con tipos, interfaces y constantes
- ✅ Configurar NPM Workspaces
- ✅ Actualizar Docker y scripts para monorepo
- ✅ Configurar Commitizen para commits estructurados
- ✅ Mantener funcionalidad existente sin regresiones

---

## 📋 Tareas Detalladas

### Fase 1: Preparación y Estructura Base (2-3 días)

#### Tarea 1.1: Crear estructura de directorios del monorepo
**Tipo:** `build`
**Prioridad:** Crítica
**Estimación:** 30 min

**Descripción:**
Crear la estructura base de carpetas para el monorepo.

**Acciones:**
- [ ] Crear directorio `packages/`
- [ ] Crear `packages/api/` (para backend actual)
- [ ] Crear `packages/shared/` (para código compartido)
- [ ] Crear `packages/web/` (placeholder para futuro)
- [ ] Crear `packages/mobile/` (placeholder para futuro)
- [ ] Crear `tools/` (para scripts compartidos)

**Criterios de Aceptación:**
- Estructura de directorios creada
- Directorios vacíos listos para migración

**Commits sugeridos:**
```
build: crear estructura base de monorepo
```

---

#### Tarea 1.2: Configurar NPM Workspaces en root
**Tipo:** `build`
**Prioridad:** Crítica
**Estimación:** 1 hora

**Descripción:**
Configurar el `package.json` raíz con workspaces y scripts base.

**⚠️ Nota sobre NPM Workspaces vs Nx:**
Se eligió **NPM Workspaces** en lugar de Nx porque:
- Proyecto pequeño/mediano (3-4 paquetes): NPM Workspaces es suficiente
- Setup rápido (30 min vs 2-4 horas de Nx)
- Sin curva de aprendizaje adicional
- Puede agregarse Turborepo después si se necesita optimización
- Ver [MONOREPO_TOOL_COMPARISON.md](../../MONOREPO_TOOL_COMPARISON.md) para detalles completos

**Acciones:**
- [ ] Crear `package.json` en root con:
  - `name: "carecore"`
  - `private: true`
  - `workspaces: ["packages/*"]`
  - Scripts base para monorepo
- [ ] Instalar dependencias de desarrollo en root:
  - `turbo` (opcional, para builds rápidos - puede agregarse después)
  - `typescript` (versión base)
  - `prettier`, `eslint` (configuraciones compartidas)
- [ ] Crear `.npmrc` con configuraciones de workspaces (opcional)

**Archivos a crear/modificar:**
- `package.json` (root, nuevo)
- `.npmrc` (nuevo, opcional)

**Criterios de Aceptación:**
- `npm install` funciona en root
- Workspaces detectados correctamente (`npm ls --workspaces`)
- Scripts base funcionan
- Puedes ejecutar comandos en workspaces específicos

**Commits sugeridos:**
```
build: configurar NPM workspaces en root
```

---

#### Tarea 1.3: Configurar TypeScript base compartido
**Tipo:** `build`
**Prioridad:** Alta
**Estimación:** 1 hora

**Descripción:**
Crear configuración base de TypeScript para el monorepo.

**Acciones:**
- [ ] Crear `tsconfig.base.json` en root con:
  - Configuración base compartida
  - Paths para `@carecore/shared`
  - Configuración estricta
- [ ] Crear `tsconfig.json` en root que extienda base
- [ ] Documentar estructura de configuraciones TypeScript

**Archivos a crear:**
- `tsconfig.base.json` (nuevo)
- `tsconfig.json` (root, nuevo)

**Criterios de Aceptación:**
- TypeScript compila correctamente
- Paths configurados para paquetes

**Commits sugeridos:**
```
build: configurar TypeScript base para monorepo
```

---

### Fase 2: Migración del Backend (2-3 días)

#### Tarea 2.1: Mover código del backend a packages/api
**Tipo:** `refactor`
**Prioridad:** Crítica
**Estimación:** 2 horas

**Descripción:**
Mover todo el código actual del backend a `packages/api/`.

**Acciones:**
- [ ] Mover `src/` → `packages/api/src/`
- [ ] Mover `test/` → `packages/api/test/`
- [ ] Mover `scripts/` → `packages/api/scripts/` (o `tools/` si son compartidos)
- [ ] Mover `keycloak/` → `packages/api/keycloak/` (o root si es compartido)
- [ ] Mover `docs/` → root (documentación compartida)
- [ ] Mover archivos de configuración:
  - `nest-cli.json` → `packages/api/`
  - `jest.config.js` → `packages/api/`
  - `jest.integration.js` → `packages/api/`
  - `test/jest-e2e.json` → `packages/api/test/`
- [ ] Mover `package.json` actual → `packages/api/package.json`
- [ ] Actualizar `name` en `package.json` a `@carecore/api`

**Archivos a mover:**
- Todo el contenido actual del proyecto (excepto `.git`, `node_modules`, etc.)

**Criterios de Aceptación:**
- Todo el código movido a `packages/api/`
- Estructura de carpetas mantenida
- No se pierde ningún archivo

**Commits sugeridos:**
```
refactor: mover backend a packages/api
```

---

#### Tarea 2.2: Actualizar paths e imports en packages/api
**Tipo:** `refactor`
**Prioridad:** Crítica
**Estimación:** 2-3 horas

**Descripción:**
Actualizar todos los imports y paths en `packages/api` para que funcionen con la nueva estructura.

**Acciones:**
- [ ] Actualizar `tsconfig.json` en `packages/api/`:
  - Extender `tsconfig.base.json` del root
  - Ajustar `baseUrl` y `paths` relativos
  - Actualizar `outDir` si es necesario
- [ ] Actualizar imports en todo el código:
  - Verificar que todos los paths relativos funcionen
  - Actualizar imports de `@/` si es necesario
- [ ] Actualizar `jest.config.js`:
  - Ajustar `rootDir` y paths
  - Actualizar `moduleNameMapper`
- [ ] Actualizar `nest-cli.json`:
  - Verificar paths y configuración

**Archivos a modificar:**
- `packages/api/tsconfig.json`
- `packages/api/jest.config.js`
- `packages/api/test/jest-e2e.json`
- Todos los archivos con imports

**Criterios de Aceptación:**
- `npm run build` funciona en `packages/api`
- `npm run test` funciona en `packages/api`
- Todos los imports resueltos correctamente
- No hay errores de TypeScript

**Commits sugeridos:**
```
refactor: actualizar paths e imports en packages/api
```

---

#### Tarea 2.3: Actualizar package.json de packages/api
**Tipo:** `build`
**Prioridad:** Alta
**Estimación:** 1 hora

**Descripción:**
Ajustar `package.json` de `packages/api` para monorepo.

**Acciones:**
- [ ] Actualizar `name` a `@carecore/api`
- [ ] Verificar que todas las dependencias estén correctas
- [ ] Actualizar scripts si es necesario (paths relativos)
- [ ] Agregar dependencia a `@carecore/shared` (cuando exista)
- [ ] Verificar que `prepare` script funcione con husky

**Archivos a modificar:**
- `packages/api/package.json`

**Criterios de Aceptación:**
- `npm install` funciona
- Scripts ejecutan correctamente
- Dependencias resueltas

**Commits sugeridos:**
```
build: actualizar package.json de packages/api para monorepo
```

---

### Fase 3: Crear Paquete Shared (2 días)

#### Tarea 3.1: Crear estructura de packages/shared
**Tipo:** `build`
**Prioridad:** Alta
**Estimación:** 1 hora

**Descripción:**
Crear la estructura base del paquete compartido.

**Acciones:**
- [ ] Crear `packages/shared/package.json`:
  - `name: "@carecore/shared"`
  - `version: "0.1.0"`
  - `main: "dist/index.js"`
  - `types: "dist/index.d.ts"`
  - Scripts de build
- [ ] Crear estructura de directorios:
  - `packages/shared/src/types/`
  - `packages/shared/src/constants/`
  - `packages/shared/src/utils/` (futuro)
  - `packages/shared/src/config/` (futuro)
- [ ] Crear `packages/shared/tsconfig.json`:
  - Extender `tsconfig.base.json`
  - Configurar para generar `.d.ts`
- [ ] Crear `packages/shared/src/index.ts` (barrel export)

**Archivos a crear:**
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/src/index.ts`

**Criterios de Aceptación:**
- Estructura creada
- TypeScript compila
- Paquete puede ser importado

**Commits sugeridos:**
```
build: crear estructura de packages/shared
```

---

#### Tarea 3.2: Migrar interfaces FHIR a packages/shared
**Tipo:** `refactor`
**Prioridad:** Alta
**Estimación:** 2 horas

**Descripción:**
Mover todas las interfaces FHIR a `packages/shared`.

**Acciones:**
- [ ] Mover `src/common/interfaces/fhir.interface.ts` → `packages/shared/src/types/fhir.interface.ts`
- [ ] Actualizar exports en `packages/shared/src/index.ts`
- [ ] Actualizar imports en `packages/api`:
  - Cambiar de `@/common/interfaces/fhir.interface` a `@carecore/shared`
- [ ] Verificar que no haya imports rotos
- [ ] Ejecutar tests para verificar

**Archivos a mover:**
- `src/common/interfaces/fhir.interface.ts` → `packages/shared/src/types/`

**Archivos a modificar:**
- Todos los archivos que importan interfaces FHIR

**Criterios de Aceptación:**
- Interfaces movidas correctamente
- Todos los imports actualizados
- Tests pasan
- TypeScript compila sin errores

**Commits sugeridos:**
```
refactor: migrar interfaces FHIR a packages/shared
```

---

#### Tarea 3.3: Migrar constantes a packages/shared
**Tipo:** `refactor`
**Prioridad:** Alta
**Estimación:** 1-2 horas

**Descripción:**
Mover constantes (scopes, resource types, actions) a `packages/shared`.

**Acciones:**
- [ ] Mover `src/common/constants/fhir-scopes.ts` → `packages/shared/src/constants/`
- [ ] Mover `src/common/constants/fhir-resource-types.ts` → `packages/shared/src/constants/`
- [ ] Mover `src/common/constants/fhir-actions.ts` → `packages/shared/src/constants/` (si existe)
- [ ] Actualizar exports en `packages/shared/src/index.ts`
- [ ] Actualizar imports en `packages/api`:
  - Cambiar imports a `@carecore/shared`
- [ ] Verificar que no haya imports rotos
- [ ] Ejecutar tests

**Archivos a mover:**
- `src/common/constants/*.ts` → `packages/shared/src/constants/`

**Archivos a modificar:**
- Todos los archivos que importan constantes

**Criterios de Aceptación:**
- Constantes movidas correctamente
- Todos los imports actualizados
- Tests pasan

**Commits sugeridos:**
```
refactor: migrar constantes a packages/shared
```

---

#### Tarea 3.4: Migrar interfaces de User y Auth a packages/shared
**Tipo:** `refactor`
**Prioridad:** Media
**Estimación:** 1 hora

**Descripción:**
Mover interfaces relacionadas con User y Auth a `packages/shared` (si son útiles para frontend).

**Acciones:**
- [ ] Revisar `src/modules/auth/interfaces/user.interface.ts`
- [ ] Decidir si mover a `packages/shared` (probablemente sí, para frontend)
- [ ] Mover si corresponde → `packages/shared/src/types/user.interface.ts`
- [ ] Actualizar exports
- [ ] Actualizar imports en `packages/api`
- [ ] Verificar tests

**Archivos a mover (si aplica):**
- `src/modules/auth/interfaces/user.interface.ts` → `packages/shared/src/types/`

**Criterios de Aceptación:**
- Interfaces movidas si son compartidas
- Imports actualizados
- Tests pasan

**Commits sugeridos:**
```
refactor: migrar interfaces de User a packages/shared
```

---

#### Tarea 3.5: Configurar build de packages/shared
**Tipo:** `build`
**Prioridad:** Alta
**Estimación:** 1 hora

**Descripción:**
Configurar el proceso de build para `packages/shared`.

**Acciones:**
- [ ] Agregar script `build` en `packages/shared/package.json`
- [ ] Configurar TypeScript para generar `.d.ts`
- [ ] Verificar que `npm run build` genera:
  - `dist/index.js`
  - `dist/index.d.ts`
  - Archivos compilados correctos
- [ ] Agregar `prepublishOnly` o `prepare` script si es necesario
- [ ] Probar que `@carecore/shared` puede ser importado desde `packages/api`

**Archivos a modificar:**
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`

**Criterios de Aceptación:**
- `npm run build` funciona
- Archivos `.d.ts` generados
- Paquete puede ser importado desde otros paquetes

**Commits sugeridos:**
```
build: configurar build de packages/shared
```

---

### Fase 4: Actualización de Docker y Scripts (2 días)

#### Tarea 4.1: Actualizar Dockerfile para monorepo
**Tipo:** `build`
**Prioridad:** Alta
**Estimación:** 2 horas

**Descripción:**
Actualizar Dockerfile para trabajar con estructura de monorepo.

**Acciones:**
- [ ] Actualizar `COPY` commands:
  - Copiar `packages/api/package*.json` en lugar de root
  - Copiar `packages/shared/package*.json` también
  - Ajustar paths de `src` a `packages/api/src`
- [ ] Actualizar `WORKDIR` si es necesario
- [ ] Asegurar que `packages/shared` se construya antes de `packages/api`
- [ ] Actualizar healthcheck si es necesario
- [ ] Probar build de Docker:
  ```bash
  docker build -t carecore-api .
  ```

**Archivos a modificar:**
- `Dockerfile` (o `packages/api/Dockerfile` si se mueve)

**Criterios de Aceptación:**
- Docker build funciona
- Imagen se crea correctamente
- Contenedor inicia y funciona

**Commits sugeridos:**
```
build: actualizar Dockerfile para monorepo
```

---

#### Tarea 4.2: Actualizar docker-compose.yml para monorepo
**Tipo:** `build`
**Prioridad:** Alta
**Estimación:** 1 hora

**Descripción:**
Actualizar docker-compose para usar paths correctos del monorepo.

**Acciones:**
- [ ] Actualizar `context` en servicio `api`:
  - Cambiar de `.` a `.` (root del monorepo)
  - Ajustar `dockerfile` path si se mueve
- [ ] Actualizar `volumes` si hay montajes:
  - Ajustar paths de `src` a `packages/api/src`
- [ ] Verificar que scripts montados funcionen:
  - `scripts/init-keycloak-db.sh` (puede estar en root o `packages/api/scripts/`)
- [ ] Probar `docker-compose up`

**Archivos a modificar:**
- `docker-compose.yml`
- `docker-compose.development.yml` (si existe)
- `docker-compose.production.yml` (si existe)

**Criterios de Aceptación:**
- `docker-compose up` funciona
- Servicios inician correctamente
- Paths correctos en todos los servicios

**Commits sugeridos:**
```
build: actualizar docker-compose para monorepo
```

---

#### Tarea 4.3: Actualizar Makefile para monorepo
**Tipo:** `build`
**Prioridad:** Alta
**Estimación:** 2 horas

**Descripción:**
Actualizar Makefile para trabajar con estructura de monorepo.

**Acciones:**
- [ ] Revisar todos los targets del Makefile
- [ ] Actualizar paths:
  - Scripts pueden estar en `packages/api/scripts/` o `tools/`
  - Ajustar paths relativos
- [ ] Actualizar comandos `npm`:
  - Algunos pueden necesitar `npm run --workspace=@carecore/api`
  - O ejecutarse desde `packages/api/`
- [ ] Verificar targets críticos:
  - `docker-up`, `docker-down`
  - `dev`, `build`, `test`
- [ ] Probar todos los targets principales

**Archivos a modificar:**
- `Makefile`

**Criterios de Aceptación:**
- Todos los targets funcionan
- Paths correctos
- Comandos ejecutan correctamente

**Commits sugeridos:**
```
build: actualizar Makefile para monorepo
```

---

#### Tarea 4.4: Actualizar scripts de utilidad
**Tipo:** `refactor`
**Prioridad:** Media
**Estimación:** 1-2 horas

**Descripción:**
Revisar y actualizar scripts en `scripts/` o `packages/api/scripts/`.

**Acciones:**
- [ ] Decidir ubicación de scripts:
  - Si son solo para API → `packages/api/scripts/`
  - Si son compartidos → `tools/` o root
- [ ] Actualizar paths en scripts:
  - Paths relativos a `packages/api/`
  - Imports de código si es necesario
- [ ] Actualizar scripts de GitHub tasks si existen
- [ ] Verificar que scripts ejecuten correctamente

**Archivos a modificar:**
- Todos los scripts en `scripts/` o `packages/api/scripts/`

**Criterios de Aceptación:**
- Scripts funcionan con nueva estructura
- Paths correctos
- No hay errores de ejecución

**Commits sugeridos:**
```
refactor: actualizar scripts para monorepo
```

---

### Fase 5: Configuración de Commitizen y Hooks (1 día)

#### Tarea 5.1: Configurar Commitizen en root
**Tipo:** `build`
**Prioridad:** Media
**Estimación:** 1-2 horas

**Descripción:**
Configurar Commitizen para commits estructurados en el monorepo.

**Acciones:**
- [ ] Instalar `commitizen` y `cz-conventional-changelog` en root:
  ```bash
  npm install -D commitizen cz-conventional-changelog
  ```
- [ ] Agregar configuración en `package.json` root:
  ```json
  {
    "config": {
      "commitizen": {
        "path": "cz-conventional-changelog"
      }
    }
  }
  ```
- [ ] Agregar script `commit` en root:
  ```json
  {
    "scripts": {
      "commit": "cz"
    }
  }
  ```
- [ ] Crear `.czrc` o configurar en `package.json`
- [ ] Probar `npm run commit`

**Archivos a crear/modificar:**
- `package.json` (root)
- `.czrc` (opcional)

**Criterios de Aceptación:**
- `npm run commit` funciona
- Commits siguen formato Conventional Commits
- Commitlint valida correctamente

**Commits sugeridos:**
```
build: configurar Commitizen para commits estructurados
```

---

#### Tarea 5.2: Actualizar Husky y commitlint para monorepo
**Tipo:** `build`
**Prioridad:** Media
**Estimación:** 1 hora

**Descripción:**
Asegurar que Husky y commitlint funcionen correctamente en monorepo.

**Acciones:**
- [ ] Verificar que `commitlint.config.mjs` esté en root
- [ ] Actualizar `.husky/commit-msg` si es necesario:
  - Asegurar que commitlint se ejecute desde root
- [ ] Actualizar `.husky/pre-commit` si es necesario:
  - Ajustar paths para lint-staged
  - Considerar ejecutar en workspaces afectados
- [ ] Probar hooks:
  - Hacer commit con formato incorrecto (debe fallar)
  - Hacer commit con formato correcto (debe pasar)

**Archivos a modificar:**
- `.husky/commit-msg`
- `.husky/pre-commit` (si existe)
- `commitlint.config.mjs` (verificar ubicación)

**Criterios de Aceptación:**
- Hooks funcionan correctamente
- Commitlint valida desde root
- Lint-staged funciona en workspaces

**Commits sugeridos:**
```
build: actualizar Husky y commitlint para monorepo
```

---

### Fase 6: Configuración de Testing y CI/CD (1 día)

#### Tarea 6.1: Actualizar configuraciones de Jest
**Tipo:** `build`
**Prioridad:** Alta
**Estimación:** 1-2 horas

**Descripción:**
Actualizar configuraciones de Jest para monorepo.

**Acciones:**
- [ ] Verificar `jest.config.js` en `packages/api/`:
  - Ajustar `rootDir` si es necesario
  - Verificar `moduleNameMapper` con nuevos paths
- [ ] Verificar `test/jest-e2e.json`:
  - Ajustar paths
- [ ] Verificar `jest.integration.js`:
  - Ajustar paths
- [ ] Probar todos los tipos de tests:
  - `npm run test` (unit)
  - `npm run test:e2e` (e2e)
  - `npm run test:integration` (integration)
- [ ] Verificar cobertura funciona

**Archivos a modificar:**
- `packages/api/jest.config.js`
- `packages/api/test/jest-e2e.json`
- `packages/api/jest.integration.js`

**Criterios de Aceptación:**
- Todos los tests pasan
- Cobertura funciona
- Paths correctos

**Commits sugeridos:**
```
build: actualizar configuraciones de Jest para monorepo
```

---

#### Tarea 6.2: Actualizar scripts de testing en package.json
**Tipo:** `build`
**Prioridad:** Media
**Estimación:** 30 min

**Descripción:**
Asegurar que scripts de testing funcionen desde root y desde packages/api.

**Acciones:**
- [ ] Agregar scripts en root `package.json` para ejecutar tests:
  ```json
  {
    "scripts": {
      "test": "npm run test --workspace=@carecore/api",
      "test:e2e": "npm run test:e2e --workspace=@carecore/api"
    }
  }
  ```
- [ ] Verificar que scripts en `packages/api/package.json` funcionen
- [ ] Probar ejecución desde root y desde packages/api

**Archivos a modificar:**
- `package.json` (root)

**Criterios de Aceptación:**
- Tests ejecutan desde root
- Tests ejecutan desde packages/api
- Ambos funcionan correctamente

**Commits sugeridos:**
```
build: agregar scripts de testing en root para monorepo
```

---

#### Tarea 6.3: Actualizar CI/CD (si existe)
**Tipo:** `ci`
**Prioridad:** Media
**Estimación:** 1-2 horas

**Descripción:**
Actualizar workflows de GitHub Actions (o CI/CD) para monorepo.

**Acciones:**
- [ ] Buscar archivos `.github/workflows/*.yml`
- [ ] Actualizar paths en workflows:
  - `working-directory: packages/api` donde sea necesario
  - Ajustar paths de checkout, build, test
- [ ] Actualizar comandos:
  - `npm install` puede necesitar `--workspaces`
  - Ajustar paths de ejecución
- [ ] Probar workflow (si es posible)
- [ ] Documentar cambios

**Archivos a modificar:**
- `.github/workflows/*.yml` (si existen)

**Criterios de Aceptación:**
- Workflows funcionan con nueva estructura
- Tests ejecutan correctamente
- Build funciona

**Commits sugeridos:**
```
ci: actualizar workflows para monorepo
```

---

### Fase 7: Limpieza y Documentación (1 día)

#### Tarea 7.1: Limpiar archivos obsoletos
**Tipo:** `chore`
**Prioridad:** Baja
**Estimación:** 30 min

**Descripción:**
Eliminar archivos que ya no son necesarios en root.

**Acciones:**
- [ ] Identificar archivos que ya no se usan en root:
  - `package.json` antiguo (ya movido a packages/api)
  - `tsconfig.json` antiguo (si se creó uno nuevo en root)
  - Otros archivos obsoletos
- [ ] Verificar que no se rompa nada
- [ ] Eliminar archivos obsoletos
- [ ] Actualizar `.gitignore` si es necesario

**Archivos a eliminar:**
- Archivos obsoletos identificados

**Criterios de Aceptación:**
- No hay archivos duplicados
- Todo funciona correctamente
- `.gitignore` actualizado

**Commits sugeridos:**
```
chore: eliminar archivos obsoletos después de migración
```

---

#### Tarea 7.2: Actualizar .gitignore para monorepo
**Tipo:** `build`
**Prioridad:** Media
**Estimación:** 30 min

**Descripción:**
Actualizar `.gitignore` para estructura de monorepo.

**Acciones:**
- [ ] Agregar patrones para monorepo:
  - `packages/*/node_modules/`
  - `packages/*/dist/`
  - `packages/*/coverage/`
- [ ] Mantener patrones existentes que apliquen
- [ ] Verificar que no se ignore nada importante
- [ ] Probar que `.gitignore` funciona

**Archivos a modificar:**
- `.gitignore`

**Criterios de Aceptación:**
- `.gitignore` cubre todos los casos
- No se ignoran archivos importantes
- Estructura de monorepo considerada

**Commits sugeridos:**
```
build: actualizar .gitignore para monorepo
```

---

#### Tarea 7.3: Actualizar documentación
**Tipo:** `docs`
**Prioridad:** Alta
**Estimación:** 2 horas

**Descripción:**
Actualizar toda la documentación para reflejar estructura de monorepo.

**Acciones:**
- [ ] Actualizar `README.md`:
  - Estructura de directorios
  - Comandos de instalación
  - Comandos de desarrollo
  - Paths actualizados
- [ ] Actualizar `docs/PROJECT_CONTEXT.md`:
  - Estructura de monorepo
  - Referencias a paths
- [ ] Actualizar `docs/FRONTEND_ARCHITECTURE_DECISION.md`:
  - Confirmar estructura implementada
- [ ] Crear `docs/MONOREPO_GUIDE.md`:
  - Guía de desarrollo en monorepo
  - Cómo agregar nuevos paquetes
  - Cómo compartir código
- [ ] Actualizar otros docs relevantes

**Archivos a modificar:**
- `README.md`
- `docs/PROJECT_CONTEXT.md`
- `docs/FRONTEND_ARCHITECTURE_DECISION.md`
- Crear `docs/MONOREPO_GUIDE.md`

**Criterios de Aceptación:**
- Documentación actualizada
- Guías claras para desarrolladores
- Ejemplos funcionan

**Commits sugeridos:**
```
docs: actualizar documentación para monorepo
```

---

#### Tarea 7.4: Verificación final y testing completo
**Tipo:** `test`
**Prioridad:** Crítica
**Estimación:** 2-3 horas

**Descripción:**
Ejecutar suite completa de tests y verificar que todo funciona.

**Acciones:**
- [ ] Ejecutar `npm install` en root
- [ ] Ejecutar `npm run build` en `packages/api`
- [ ] Ejecutar `npm run build` en `packages/shared`
- [ ] Ejecutar todos los tests:
  - `npm run test` (unit)
  - `npm run test:e2e` (e2e)
  - `npm run test:integration` (integration)
- [ ] Verificar Docker:
  - `make docker-up`
  - Verificar que servicios inician
  - Verificar que API funciona
- [ ] Verificar que no hay regresiones
- [ ] Crear checklist de verificación

**Criterios de Aceptación:**
- Todos los tests pasan
- Docker funciona
- No hay regresiones
- Todo funciona como antes de la migración

**Commits sugeridos:**
```
test: verificación final de migración a monorepo
```

---

## 📊 Resumen de Tareas

| Fase | Tareas | Estimación | Prioridad |
|------|--------|------------|-----------|
| Fase 1: Preparación | 3 tareas | 2-3 días | Crítica |
| Fase 2: Migración Backend | 3 tareas | 2-3 días | Crítica |
| Fase 3: Paquete Shared | 5 tareas | 2 días | Alta |
| Fase 4: Docker y Scripts | 4 tareas | 2 días | Alta |
| Fase 5: Commitizen | 2 tareas | 1 día | Media |
| Fase 6: Testing y CI/CD | 3 tareas | 1 día | Alta |
| Fase 7: Limpieza | 4 tareas | 1 día | Media |
| **TOTAL** | **24 tareas** | **8-10 días** | |

---

## ✅ Checklist de Verificación Final

Antes de considerar la migración completa:

- [ ] Estructura de monorepo creada
- [ ] Backend migrado a `packages/api`
- [ ] Paquete `packages/shared` creado y funcionando
- [ ] Todos los imports actualizados
- [ ] Docker funciona correctamente
- [ ] Makefile actualizado
- [ ] Scripts funcionan
- [ ] Commitizen configurado
- [ ] Todos los tests pasan
- [ ] Documentación actualizada
- [ ] No hay regresiones
- [ ] CI/CD funciona (si aplica)

---

## 🚀 Próximos Pasos (Post-Migración)

Una vez completada la migración:

1. **Crear `packages/web`** (Next.js)
2. **Crear `packages/mobile`** (React Native)
3. **Configurar Turborepo** (opcional, para builds rápidos)
4. **Agregar más código compartido** a `packages/shared`

---

**Última actualización:** 2025-01-27
**Mantenido por:** Equipo CareCore

