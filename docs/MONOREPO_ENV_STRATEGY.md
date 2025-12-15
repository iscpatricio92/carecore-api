# 🗂️ Estrategia de Variables de Entorno en Monorepo

**Fecha:** 2025-12-14
**Contexto:** CareCore Monorepo (API, Web, Mobile, Shared)

---

## 📋 Recomendación: Variables en el Root del Monorepo

### ✅ **Estructura Recomendada**

```
carecore-api/
├── .env.development          # Variables compartidas para desarrollo
├── .env.production           # Variables compartidas para producción
├── .env.local                # Overrides locales (NO commitear)
├── .env.development.example  # Template para desarrollo
├── .env.production.example   # Template para producción
└── packages/
    ├── api/                  # Backend - lee del root
    ├── web/                  # Frontend web - lee del root
    ├── mobile/               # Frontend mobile - lee del root
    └── shared/               # Código compartido
```

### 🎯 **Principios**

1. **Variables Compartidas → Root**
   - Base de datos (DB_*)
   - Keycloak (KEYCLOAK_*)
   - URLs de servicios compartidos
   - Configuraciones de infraestructura

2. **Variables Específicas → Root con Prefijos**
   - `API_PORT` vs `WEB_PORT` vs `MOBILE_PORT`
   - `API_URL` vs `WEB_URL`
   - Prefijos claros para evitar conflictos

3. **Variables Muy Específicas → Opcionalmente en Package**
   - Solo si son completamente independientes
   - Ejemplo: `packages/web/.env.local` para configuraciones de build del frontend

---

## 📊 Comparación de Estrategias

### Estrategia 1: Todo en Root (✅ **RECOMENDADA**)

**Ventajas:**
- ✅ Un solo lugar para gestionar variables
- ✅ Fácil de compartir entre packages
- ✅ Consistente con la estructura actual
- ✅ Docker Compose funciona directamente
- ✅ Menos confusión sobre dónde buscar variables

**Desventajas:**
- ⚠️ Puede volverse grande con muchos packages
- ⚠️ Requiere prefijos para variables específicas

**Ejemplo:**
```env
# Root: .env.development
DB_HOST=localhost
KEYCLOAK_URL=http://localhost:8080

# API específico
API_PORT=3000
API_INTERNAL_PORT=3000

# Web específico
WEB_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Mobile específico
MOBILE_API_URL=http://localhost:3000/api
```

---

### Estrategia 2: Separado por Package (⚠️ No recomendada)

**Estructura:**
```
packages/
├── api/.env.development
├── web/.env.development
└── mobile/.env.development
```

**Desventajas:**
- ❌ Duplicación de variables compartidas
- ❌ Más difícil de mantener
- ❌ Docker Compose necesita configuración adicional
- ❌ Riesgo de inconsistencias

**Cuándo usar:**
- Solo si los packages son completamente independientes
- Si hay configuraciones muy diferentes entre packages

---

### Estrategia 3: Híbrida (✅ Para casos específicos)

**Estructura:**
```
# Root: .env.development (variables compartidas)
DB_HOST=localhost
KEYCLOAK_URL=http://localhost:8080

# packages/web/.env.local (solo variables muy específicas del frontend)
NEXT_PUBLIC_ANALYTICS_ID=xxx
VITE_API_URL=http://localhost:3000/api
```

**Cuándo usar:**
- Variables de build-time del frontend (Next.js, Vite, etc.)
- Variables que solo el frontend necesita
- Configuraciones de herramientas específicas (ej: Vercel, Expo)

---

## 🔧 Implementación para CareCore

### Para el Backend (API) - ✅ Ya implementado

```typescript
// packages/api/src/app.module.ts
ConfigModule.forRoot({
  isGlobal: true,
  envFilePath: getEnvFilePaths(), // Busca en root del monorepo
})
```

**Funciona correctamente:** ✅

---

### Para el Frontend Web (cuando se agregue)

**Opción A: Usar variables del root (Recomendado)**

```typescript
// packages/web/next.config.js o vite.config.ts
import { config } from 'dotenv';
import path from 'path';

// Cargar desde root del monorepo
const monorepoRoot = path.resolve(__dirname, '../..');
config({ path: path.join(monorepoRoot, '.env.development') });
config({ path: path.join(monorepoRoot, '.env.local'), override: true });

export default {
  env: {
    API_URL: process.env.API_URL,
    KEYCLOAK_URL: process.env.KEYCLOAK_URL,
    KEYCLOAK_REALM: process.env.KEYCLOAK_REALM,
    KEYCLOAK_WEB_CLIENT_ID: process.env.KEYCLOAK_WEB_CLIENT_ID,
  },
};
```

**Opción B: Variables específicas del frontend**

```env
# Root: .env.development
API_URL=http://localhost:3000/api
KEYCLOAK_URL=http://localhost:8080

# packages/web/.env.local (opcional, solo si es necesario)
NEXT_PUBLIC_ANALYTICS_ID=xxx
VITE_API_URL=http://localhost:3000/api
```

---

### Para Mobile (React Native) - Cuando se agregue

React Native requiere configuración especial:

```typescript
// packages/mobile/react-native.config.js
import { config } from 'dotenv';
import path from 'path';

const monorepoRoot = path.resolve(__dirname, '../..');
config({ path: path.join(monorepoRoot, '.env.development') });
config({ path: path.join(monorepoRoot, '.env.local'), override: true });

// Usar react-native-config o similar
```

---

## 📝 Convenciones de Nomenclatura

### Variables Compartidas (sin prefijo)
```env
DB_HOST=localhost
DB_PORT=5432
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=carecore
```

### Variables Específicas (con prefijo)
```env
# API
API_PORT=3000
API_INTERNAL_PORT=3000

# Web
WEB_PORT=3001
NEXT_PUBLIC_API_URL=http://localhost:3000/api
NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080

# Mobile
MOBILE_API_URL=http://localhost:3000/api
EXPO_PUBLIC_KEYCLOAK_URL=http://localhost:8080
```

**Nota:** Prefijos `NEXT_PUBLIC_*` y `EXPO_PUBLIC_*` son requeridos por Next.js y Expo para exponer variables al cliente.

---

## 🚀 Migración Recomendada

### Fase 1: Mantener estructura actual (✅ Ya hecho)
- Variables en root del monorepo
- API lee del root correctamente

### Fase 2: Cuando se agregue Web
1. Agregar variables específicas del web al `.env.development`:
   ```env
   WEB_PORT=3001
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   NEXT_PUBLIC_KEYCLOAK_URL=http://localhost:8080
   NEXT_PUBLIC_KEYCLOAK_REALM=carecore
   NEXT_PUBLIC_KEYCLOAK_WEB_CLIENT_ID=carecore-web
   ```

2. Configurar Next.js para leer del root:
   ```typescript
   // packages/web/next.config.js
   import { config } from 'dotenv';
   import path from 'path';

   const root = path.resolve(__dirname, '../..');
   config({ path: path.join(root, '.env.development') });
   config({ path: path.join(root, '.env.local'), override: true });
   ```

### Fase 3: Cuando se agregue Mobile
1. Agregar variables específicas del mobile al `.env.development`
2. Usar `react-native-config` o `expo-constants` para leer del root

---

## ✅ Resumen y Recomendación Final

### **Estrategia Recomendada: Variables en Root**

1. ✅ **Mantener variables en el root del monorepo**
   - `.env.development` / `.env.production` en root
   - `.env.local` en root para overrides

2. ✅ **Usar prefijos para variables específicas**
   - `API_*` para backend
   - `WEB_*` o `NEXT_PUBLIC_*` para frontend web
   - `MOBILE_*` o `EXPO_PUBLIC_*` para mobile

3. ✅ **Cada package lee del root**
   - API: Ya implementado ✅
   - Web: Configurar Next.js/Vite para leer del root
   - Mobile: Usar react-native-config o similar

4. ⚠️ **Excepciones (solo si es necesario)**
   - Variables de build-time muy específicas pueden ir en el package
   - Ejemplo: `packages/web/.env.local` para configuraciones de Vercel

---

## 📚 Referencias

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [React Native Config](https://github.com/lugg/react-native-config)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [NestJS Configuration](https://docs.nestjs.com/techniques/configuration)

---

**Última actualización:** 2025-12-14
**Mantenido por:** Equipo CareCore

