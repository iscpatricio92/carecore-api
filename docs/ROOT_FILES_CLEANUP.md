# 🧹 Limpieza de Archivos en Root - Análisis

**Fecha:** 2025-12-15
**Objetivo:** Identificar y limpiar archivos obsoletos o mal ubicados en el root del monorepo.

---

## 📋 Análisis de Directorios y Archivos

### ✅ Archivos/Directorios Necesarios

| Archivo/Directorio      | Propósito                        | Estado       |
| ----------------------- | -------------------------------- | ------------ |
| `.github/`              | CI/CD workflows                  | ✅ Necesario |
| `.husky/`               | Git hooks                        | ✅ Necesario |
| `docs/`                 | Documentación                    | ✅ Necesario |
| `packages/`             | Paquetes del monorepo            | ✅ Necesario |
| `scripts/`              | Scripts compartidos              | ✅ Necesario |
| `.cursor/`              | Configuración de Cursor          | ✅ Necesario |
| `.vscode/`              | Configuración de VSCode          | ✅ Necesario |
| `package.json`          | Root package.json (workspaces)   | ✅ Necesario |
| `package-lock.json`     | Lock file de dependencias        | ✅ Necesario |
| `tsconfig.base.json`    | Configuración base de TypeScript | ✅ Necesario |
| `tsconfig.json`         | Configuración root de TypeScript | ✅ Necesario |
| `Dockerfile`            | Docker build                     | ✅ Necesario |
| `docker-compose*.yml`   | Docker Compose configs           | ✅ Necesario |
| `Makefile`              | Comandos de desarrollo           | ✅ Necesario |
| `README.md`             | Documentación principal          | ✅ Necesario |
| `LICENSE`               | Licencia del proyecto            | ✅ Necesario |
| `commitlint.config.mjs` | Configuración de commitlint      | ✅ Necesario |
| `.cz-config.js`         | Configuración de Commitizen      | ✅ Necesario |
| `cspell.config.yaml`    | Configuración de spell checker   | ✅ Necesario |

---

### ⚠️ Archivos/Directorios a Revisar

#### 1. `storage/` - **MOVER A `.tmp/storage/`**

**Estado actual:**

- Contiene `documents/` y `verifications/`
- Usado por:
  - `packages/api/src/modules/documents/documents.service.ts` (default: `.tmp/storage/documents`) ✅ Actualizado
  - `packages/api/src/modules/auth/services/document-storage.service.ts` (default: `.tmp/storage/verifications`) ✅ Actualizado

**Problema:**

- Está en root cuando debería estar en `.tmp/` (temporal) o dentro de `packages/api/`
- Ya está en `.gitignore`, pero debería estar mejor organizado

**Recomendación:**

- Mover a `.tmp/storage/` o `packages/api/storage/`
- Actualizar variables de entorno por defecto:
  - `DOCUMENTS_STORAGE_PATH` → `.tmp/storage/documents` o `packages/api/storage/documents`
  - `VERIFICATION_DOCUMENTS_PATH` → `.tmp/storage/verifications` o `packages/api/storage/verifications`

**Acción:** ✅ COMPLETADO

```bash
# Movido a .tmp/storage/
mkdir -p .tmp/storage
mv storage/* .tmp/storage/
rmdir storage

# Código actualizado:
# - documents.service.ts: .tmp/storage/documents
# - document-storage.service.ts: .tmp/storage/verifications
# - .gitignore: agregado .tmp/
```

---

#### 2. `dist/` en root - **ELIMINAR**

**Estado actual:**

- Contiene `main.js` (514KB)
- Probablemente de un build anterior antes de la migración a monorepo

**Problema:**

- El build debería estar en `packages/api/dist/`
- Este `dist/` en root es obsoleto

**Recomendación:**

- Eliminar `dist/` del root
- Verificar que no se use en ningún script o configuración

**Acción:** ✅ COMPLETADO

```bash
rm -rf dist/
# Eliminado dist/main.js obsoleto del root
```

---

#### 3. `coverage/`, `coverage-e2e/`, `coverage-integration/` - **MANTENER (configurado así)**

**Estado actual:**

- Generados por Jest desde `packages/api/`
- Configuración en `packages/api/jest.config.js`:
  - `coverageDirectory: '../../coverage'` (unit)
  - `coverageDirectory: '../../coverage-e2e'` (e2e)
  - `coverageDirectory: '../../coverage-integration'` (integration)

**Problema:**

- Están en root cuando podrían estar en `packages/api/coverage/`

**Recomendación:**

- **Opción A (Actual):** Mantener en root si queremos reportes centralizados
- **Opción B (Alternativa):** Cambiar a `packages/api/coverage/` para mantener todo junto

**Acción:** ✅ COMPLETADO - Organizado mejor

```bash
# Estructura organizada:
# coverage/api/ - unit tests
# coverage/api-e2e/ - e2e tests
# coverage/api-integration/ - integration tests

# Actualizado jest.config.js:
# coverageDirectory: '../../coverage/api'
```

**Decisión:** Mantener en root pero organizado por package (coverage/api/)

---

#### 4. `.jest-cache/`, `.jest-e2e-cache/`, `.jest-cache-integration/` - **MOVER A `packages/api/`**

**Estado actual:**

- Caché de Jest en root
- Configuración en `packages/api/jest.config.js`:
  - `cacheDirectory: '<rootDir>/../../.jest-cache'`

**Problema:**

- Deberían estar en `packages/api/` para mantener todo junto

**Recomendación:**

- Mover caché a `packages/api/.jest-cache/`
- Actualizar configuración de Jest

**Acción:** ✅ COMPLETADO

```bash
# Actualizado jest.config.js, jest-e2e.json, jest.integration.js
# cacheDirectory ahora relativo al package: '<rootDir>/../.jest-cache'
```

---

#### 5. `tools/` - **ELIMINAR (vacío) o MANTENER COMO PLACEHOLDER**

**Estado actual:**

- Directorio vacío
- Solo mencionado en documentación como "futuro"

**Problema:**

- No se usa actualmente
- Puede confundir

**Recomendación:**

- **Opción A:** Eliminar si no se planea usar
- **Opción B:** Mantener con un `.gitkeep` y README explicando su propósito futuro

**Acción:** ✅ COMPLETADO - Movido a packages/shared/tools/

```bash
# Movido a packages/shared/tools/ con README.md
# Preparado para uso futuro compartido entre packages
mkdir -p packages/shared/tools
echo "# Tools directory for shared scripts across packages" > packages/shared/tools/README.md
rmdir tools/
```

---

## 📝 Resumen de Acciones Recomendadas

### Prioridad Alta

1. **Mover `storage/` a `.tmp/storage/`**
   - Actualizar variables de entorno por defecto
   - Actualizar código que usa estos paths

2. **Eliminar `dist/` del root**
   - Es obsoleto, el build está en `packages/api/dist/`

### Prioridad Media

3. **Mover caché de Jest a `packages/api/`**
   - Actualizar configuración de Jest
   - Limpiar caché actual

### Prioridad Baja

4. **Decidir sobre `tools/`**
   - Eliminar o mantener con documentación

5. **Revisar ubicación de `coverage/`**
   - Mantener en root (actual) o mover a `packages/api/`

---

## 🔄 Plan de Acción

1. ✅ Crear este documento de análisis
2. ⏳ Mover `storage/` a `.tmp/storage/`
3. ⏳ Eliminar `dist/` del root
4. ⏳ Actualizar configuración de Jest para caché
5. ⏳ Decidir sobre `tools/`
6. ⏳ Actualizar `.gitignore` si es necesario
7. ⏳ Actualizar documentación

---

**Nota:** Algunos cambios requieren actualizar código y configuraciones. Revisar cuidadosamente antes de aplicar.
