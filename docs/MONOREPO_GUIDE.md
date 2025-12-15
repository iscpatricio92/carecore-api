# 📦 Guía del Monorepo - CareCore

Esta guía explica cómo trabajar con la estructura de monorepo de CareCore.

**Última actualización:** 2025-12-15

---

## 🎯 ¿Qué es un Monorepo?

Un monorepo es una estrategia de gestión de código donde múltiples proyectos relacionados se almacenan en un solo repositorio Git. En CareCore, esto nos permite:

- ✅ Compartir código entre backend, frontend web y mobile
- ✅ Mantener type safety end-to-end
- ✅ Facilitar el refactoring
- ✅ Sincronizar versiones y dependencias
- ✅ Simplificar el desarrollo y CI/CD

---

## 📁 Estructura del Monorepo

```
carecore-api/
├── packages/
│   ├── api/          # Backend API (NestJS)
│   ├── shared/        # Código compartido (types, constants)
│   ├── web/           # Frontend Web (Next.js) - ⏳ Futuro
│   └── mobile/        # Frontend Mobile (React Native) - ⏳ Futuro
├── scripts/           # Scripts compartidos
├── docs/              # Documentación
└── package.json       # Root package.json (NPM Workspaces)
```

---

## 🚀 Comandos Principales

### Instalación

```bash
# Instalar todas las dependencias (root + todos los packages)
npm install

# Instalar dependencias de un package específico
npm install --workspace=@carecore/api
```

### Build

```bash
# Build del paquete shared (requerido antes de build de api)
npm run build:shared

# Build de la API
npm run build

# Build de todos los packages
npm run build:shared && npm run build
```

### Desarrollo

```bash
# Iniciar API en modo desarrollo
npm run start:dev
# o desde packages/api
cd packages/api && npm run start:dev

# Iniciar con Docker
make dev
```

### Testing

```bash
# Tests unitarios de API
npm run test:api

# Tests con cobertura
npm run test:api:cov

# Tests E2E
npm run test:api:e2e

# Tests de integración
npm run test:api:integration

# Tests solo de packages modificados (pre-commit)
npm run test:changed
```

### Linting y Formato

```bash
# Lint de API
npm run lint

# Formatear todo el código
npm run format

# Verificar formato
npm run format:check
```

---

## 📦 Paquetes del Monorepo

### `@carecore/api`

Backend API construido con NestJS.

**Ubicación:** `packages/api/`

**Scripts principales:**
- `npm run build` - Compilar TypeScript
- `npm run start:dev` - Desarrollo con hot-reload
- `npm run test` - Tests unitarios
- `npm run test:e2e` - Tests E2E
- `npm run test:integration` - Tests de integración

**Dependencias:**
- Depende de `@carecore/shared` para tipos y constantes

### `@carecore/shared`

Código compartido entre todos los packages (tipos, interfaces, constantes).

**Ubicación:** `packages/shared/`

**Contenido:**
- `src/types/` - Interfaces TypeScript (FHIR, User, etc.)
- `src/constants/` - Constantes (FHIR scopes, resource types, etc.)

**Uso:**
```typescript
// En packages/api o packages/web
import { Patient, Practitioner } from '@carecore/shared';
import { FHIR_SCOPES } from '@carecore/shared';
```

**Importante:**
- Siempre construir `@carecore/shared` antes de construir otros packages
- Los cambios en `shared` requieren rebuild de los packages que lo usan

### `@carecore/web` (Futuro)

Frontend web construido con Next.js.

**Estado:** ⏳ Placeholder - Por implementar

### `@carecore/mobile` (Futuro)

Frontend mobile construido con React Native.

**Estado:** ⏳ Placeholder - Por implementar

---

## 🔧 Cómo Agregar un Nuevo Paquete

1. **Crear estructura de directorios:**
   ```bash
   mkdir -p packages/nuevo-package/src
   ```

2. **Crear `package.json`:**
   ```json
   {
     "name": "@carecore/nuevo-package",
     "version": "0.1.0",
     "private": true,
     "main": "dist/index.js",
     "types": "dist/index.d.ts",
     "scripts": {
       "build": "tsc",
       "test": "jest"
     }
   }
   ```

3. **Crear `tsconfig.json`:**
   ```json
   {
     "extends": "../../tsconfig.base.json",
     "compilerOptions": {
       "outDir": "./dist",
       "rootDir": "./src"
     },
     "include": ["src/**/*"]
   }
   ```

4. **Instalar dependencias:**
   ```bash
   npm install --workspace=@carecore/nuevo-package
   ```

5. **Agregar scripts en root `package.json` (opcional):**
   ```json
   {
     "scripts": {
       "build:nuevo-package": "npm run build --workspace=@carecore/nuevo-package"
     }
   }
   ```

---

## 🔗 Cómo Compartir Código

### Compartir Tipos e Interfaces

1. **Mover código a `packages/shared/src/types/`:**
   ```typescript
   // packages/shared/src/types/user.interface.ts
   export interface User {
     id: string;
     email: string;
   }
   ```

2. **Exportar desde `packages/shared/src/index.ts`:**
   ```typescript
   export * from './types/user.interface';
   ```

3. **Usar en otros packages:**
   ```typescript
   // packages/api/src/modules/auth/auth.service.ts
   import { User } from '@carecore/shared';
   ```

### Compartir Constantes

1. **Crear archivo en `packages/shared/src/constants/`:**
   ```typescript
   // packages/shared/src/constants/api.constants.ts
   export const API_VERSION = 'v1';
   export const API_BASE_URL = '/api';
   ```

2. **Exportar desde `packages/shared/src/index.ts`:**
   ```typescript
   export * from './constants/api.constants';
   ```

3. **Usar en otros packages:**
   ```typescript
   import { API_VERSION } from '@carecore/shared';
   ```

---

## 🧪 Testing en el Monorepo

### Ejecutar Tests por Package

```bash
# Tests de API
npm run test:api

# Tests de Web (cuando exista)
npm run test:web

# Tests de Mobile (cuando exista)
npm run test:mobile
```

### Tests Solo de Packages Modificados

El hook de pre-commit ejecuta automáticamente tests solo de los packages que fueron modificados:

```bash
# Manualmente
npm run test:changed
```

### Configuración de Jest

Cada package tiene su propia configuración de Jest:
- `packages/api/jest.config.js` - Tests unitarios
- `packages/api/test/jest-e2e.json` - Tests E2E
- `packages/api/jest.integration.js` - Tests de integración

**Importante:** Los `moduleNameMapper` deben incluir el mapeo de `@carecore/shared`:

```javascript
moduleNameMapper: {
  '^@carecore/shared$': '<rootDir>/../../shared/src',
  '^@carecore/shared/(.*)$': '<rootDir>/../../shared/src/$1',
}
```

---

## 🔄 Flujo de Desarrollo

### 1. Hacer Cambios en Shared

Si modificas código en `packages/shared/`:

```bash
# 1. Rebuild shared
npm run build:shared

# 2. Rebuild packages que dependen de shared
npm run build  # o npm run build --workspace=@carecore/api
```

### 2. Hacer Cambios en API

```bash
# 1. Asegurar que shared está construido
npm run build:shared

# 2. Desarrollo con hot-reload
npm run start:dev
# o
cd packages/api && npm run start:dev
```

### 3. Hacer Commits

Usa Commitizen para commits estructurados:

```bash
npm run commit
```

**Formato:** `<tipo>(<scope>): <descripción>`

**Scopes disponibles:**
- `api` - Backend API
- `web` - Frontend Web
- `mobile` - Frontend Mobile
- `shared` - Código compartido
- `infra` - Infraestructura
- `keycloak` - Configuración de Keycloak
- `root` - Cambios en root

**Ejemplos:**
```bash
feat(api): agregar endpoint de pacientes
fix(shared): corregir tipo de User
docs(root): actualizar README
```

---

## 🐳 Docker en el Monorepo

El Dockerfile está configurado para trabajar con la estructura de monorepo:

1. **Copia `package.json` de root y packages:**
   ```dockerfile
   COPY package.json package-lock.json ./
   COPY packages/api/package.json ./packages/api/
   COPY packages/shared/package.json ./packages/shared/
   ```

2. **Instala dependencias con workspaces:**
   ```dockerfile
   RUN npm ci --omit=dev
   ```

3. **Construye packages en orden:**
   ```dockerfile
   RUN cd packages/shared && npm run build
   RUN cd packages/api && npm run build
   ```

---

## 🔍 Troubleshooting

### Error: Cannot find module '@carecore/shared'

**Solución:**
1. Asegúrate de que `packages/shared` está construido:
   ```bash
   npm run build:shared
   ```

2. Verifica que `packages/shared/package.json` tiene `name: "@carecore/shared"`

3. Reinstala dependencias:
   ```bash
   npm install
   ```

### Error: TypeScript no encuentra tipos de @carecore/shared

**Solución:**
1. Verifica que `tsconfig.json` del package extiende `tsconfig.base.json`:
   ```json
   {
     "extends": "../../tsconfig.base.json"
   }
   ```

2. Verifica que `tsconfig.base.json` tiene los paths configurados:
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@carecore/shared": ["packages/shared/src"]
       }
     }
   }
   ```

### Tests fallan con imports de @carecore/shared

**Solución:**
1. Verifica que `jest.config.js` tiene el `moduleNameMapper` correcto:
   ```javascript
   moduleNameMapper: {
     '^@carecore/shared$': '<rootDir>/../../shared/src',
     '^@carecore/shared/(.*)$': '<rootDir>/../../shared/src/$1',
   }
   ```

2. Asegúrate de que `packages/shared` está construido antes de ejecutar tests

---

## 📚 Referencias

- [NPM Workspaces Documentation](https://docs.npmjs.com/cli/v9/using-npm/workspaces)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Monorepo Tool Comparison](./MONOREPO_TOOL_COMPARISON.md)
- [Commit Conventions](./COMMIT_CONVENTIONS.md)

---

**¿Preguntas?** Consulta la documentación en `docs/` o crea un issue en el repositorio.

