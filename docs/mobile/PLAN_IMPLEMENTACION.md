# Plan de Implementación - App Móvil CareCore

> **Nota:** Este documento es el plan técnico de implementación. Para entender el contexto del paciente, acciones, pantallas y flujos, ver [MOBILE_APP_CONTEXT.md](./MOBILE_APP_CONTEXT.md).

## 📋 Estado Actual

### ✅ Lo que ya está implementado:

- ✅ Estructura básica de Expo Router con tabs
- ✅ Componentes UI básicos (PrimaryButton, FormInput, AppHeader)
- ✅ Componentes de cards (ConsentStatusCard, ClinicalRecordCard)
- ✅ Servicios base (AuthService, FHIRClientService, RegisterService)
- ✅ Hooks base (useFHIRData, useRegisterForm)
- ✅ Pantallas básicas (Login, Register, Dashboard, History, Settings)
- ✅ Configuración de Expo (app.config.js, babel, jest)
- ✅ Integración con @carecore/shared para tipos FHIR
- ✅ **FASE 1 COMPLETADA**: Configuración base y entorno
  - Variables de entorno desde monorepo root
  - AppConfig centralizado
  - ErrorBoundary y ErrorService
  - Tipos y constantes en shared
- ✅ **FASE 2 COMPLETADA**: Sistema de autenticación
  - useAuth hook completo con PKCE
  - AuthProvider integrado
  - Intercambio de tokens con Keycloak
  - Refresh automático de tokens
  - Pantallas de login/register funcionales
- ✅ **FASE 3 COMPLETADA**: Integración con Backend API
  - HttpClient con interceptores y refresh automático
  - Servicios actualizados (FHIRClientService, RegisterService)
  - useFHIRData hook completo con cache y paginación
  - Dashboard conectado con datos reales del API
  - Pull-to-refresh y manejo de estados
- ✅ **FASE 4 COMPLETADA**: Pantallas Principales del Paciente
  - Dashboard completo con datos reales y navegación
  - History con filtros, búsqueda y paginación infinita
  - Settings con información del paciente y logout
  - Pantalla de detalle de registros (Encounter/DocumentReference)
  - Pantalla de consentimientos con gestión completa
- ⏳ **FASE 5 EN PROGRESO**: UX y Pulido
  - ✅ Componentes de carga (LoadingSpinner, SkeletonLoader)
  - ✅ Manejo de errores visual (ErrorMessage con retry)
  - ✅ Validación completa en RegisterForm
  - ✅ Optimizaciones de rendimiento (React.memo, useCallback, useMemo)
  - ✅ Corrección de History para usar endpoint optimizado de Encounters
  - ✅ Mejoras en Settings (manejo de errores y estados de carga)
  - ⏳ Navegación mejorada pendiente (opcional)

### ⏳ Lo que falta o está incompleto:

- **FASE 5 - Correcciones pendientes**:
  - ⏳ Verificar y corregir errores de conexión con API en History (en progreso)
  - ⏳ Mejoras adicionales en Settings si es necesario
- **FASE 5 - Navegación mejorada**: Animaciones de transición y deep linking (opcional)
- **FASE 6 - Testing**: Tests unitarios e integración pendientes

---

## 🎯 Fases de Implementación

### **FASE 1: Configuración Base y Entorno** ⚙️ ✅ **COMPLETADA**

**Objetivo**: Configurar el entorno de desarrollo y variables de configuración

#### Tareas:

1. **Configurar variables de entorno** ✅
   - ✅ Variables de entorno desde monorepo root (`.env.development`, `.env.production`, `.env.local`)
   - ✅ Instalado y configurado `expo-constants` y `dotenv`
   - ✅ Creado servicio de configuración (`config/AppConfig.ts`)
   - ✅ Reemplazadas URLs hardcodeadas por variables de entorno
   - ✅ Creado `app.config.js` que reemplaza `app.json` y carga variables del root

2. **Configurar manejo de errores global** ✅
   - ✅ Creado componente `ErrorBoundary.tsx`
   - ✅ Creado servicio de logging (`services/ErrorService.ts`)
   - ✅ Implementado manejo de errores de red centralizado
   - ✅ Integrado ErrorBoundary en `app/_layout.tsx`

3. **Configurar tipos de entorno** ✅
   - ✅ Tipos movidos a `@carecore/shared` (Environment, AppConfig, ErrorType, ErrorInfo)
   - ✅ Constantes compartidas en `@carecore/shared` (AUTH_TOKEN_STORAGE_KEY)
   - ✅ Configuración de diferentes URLs según entorno
   - ✅ Documentación movida a `docs/MOBILE_ENV_VARIABLES.md`

**Archivos creados:**

- ✅ `config/AppConfig.ts` - Configuración centralizada
- ✅ `components/common/ErrorBoundary.tsx` - Manejo de errores
- ✅ `services/ErrorService.ts` - Servicio de errores
- ✅ `app.config.js` - Configuración de Expo con variables de entorno
- ✅ `docs/MOBILE_ENV_VARIABLES.md` - Documentación de variables

**Archivos modificados:**

- ✅ `services/AuthService.ts` - Usa AppConfig y ErrorService
- ✅ `services/FHIRClientService.ts` - Usa AppConfig y ErrorService
- ✅ `services/RegisterService.ts` - Usa AppConfig y ErrorService
- ✅ `app/_layout.tsx` - Integrado ErrorBoundary
- ✅ `.env.development.example`, `.env.production.example`, `.env.local.example` - Variables MOBILE agregadas

**Archivos eliminados:**

- ✅ `app.json` - Reemplazado por `app.config.js`

---

### **FASE 2: Sistema de Autenticación** 🔐 ✅ **COMPLETADA**

**Objetivo**: Implementar autenticación completa con Keycloak

#### Tareas:

1. **Implementar useAuth hook** ✅
   - ✅ Implementado `hooks/useAuth.tsx` completo
   - ✅ Configurado OAuth2/Keycloak con `expo-auth-session`
   - ✅ Implementado flujo PKCE (usePKCE: true)
   - ✅ Manejo de tokens (access + refresh)
   - ✅ Persistencia de sesión con SecureStore usando `AUTH_TOKEN_STORAGE_KEY` de shared

2. **Integrar AuthProvider en la app** ✅
   - ✅ Activado AuthProvider en `app/_layout.tsx`
   - ✅ Implementada redirección automática según estado de auth
   - ✅ Manejo de estados de carga durante autenticación
   - ✅ Integrado ErrorBoundary

3. **Completar AuthService** ✅
   - ✅ Implementado `exchangeCodeForTokens` con PKCE (intercambio directo con Keycloak)
   - ✅ Implementado `refreshAccessToken` usando endpoint `/api/auth/refresh`
   - ✅ Manejo de expiración de tokens (refresh automático)
   - ✅ Uso de `AUTH_TOKEN_STORAGE_KEY` desde shared

4. **Actualizar pantallas de auth** ✅
   - ✅ Completado `app/auth/login/index.tsx` con lógica real
   - ✅ Actualizado `app/auth/register/index.tsx` (ya tenía lógica)
   - ✅ Agregado manejo de errores de autenticación
   - ✅ Agregados estados de carga

**Archivos creados/modificados:**

- ✅ `hooks/useAuth.tsx` - Implementado completo con PKCE
- ✅ `app/_layout.tsx` - AuthProvider activado con ErrorBoundary
- ✅ `app/auth/login/index.tsx` - Lógica de login implementada
- ✅ `app/index.tsx` - Redirección de auth integrada
- ✅ `services/AuthService.ts` - Métodos completados (exchangeCodeForTokens con PKCE directo a Keycloak)

---

### **FASE 3: Integración con Backend API** 🌐 ✅ **COMPLETADA**

**Objetivo**: Conectar la app con el backend NestJS para obtener datos reales del paciente

> **Importante:** Todos los endpoints FHIR filtran automáticamente por el paciente autenticado. El backend implementa esto mediante el token JWT que incluye el `patient` claim.

#### Tareas:

1. **Configurar cliente HTTP** ✅
   - ✅ Creado servicio HTTP base (`services/HttpClient.ts`) con interceptores
   - ✅ Implementado refresh automático de tokens cuando expiran (401)
   - ✅ Agregado token JWT automáticamente en header `Authorization: Bearer <token>`
   - ✅ Manejo de timeouts y reintentos para requests fallidos (máx 3 intentos con backoff exponencial)
   - ✅ Headers comunes (Content-Type: application/json)
   - ✅ Manejo de errores 401 (no autorizado) y 403 (prohibido)
   - ✅ Redirección a login si el token es inválido después de refresh

2. **Actualizar servicios existentes** ✅
   - ✅ `FHIRClientService`: Actualizado para usar HttpClient
   - ✅ Eliminado parámetro `patientId` (backend filtra automáticamente por token JWT)
   - ✅ Agregado método `getResourceById` para obtener recursos por ID
   - ✅ Agregado método `deleteResource` para eliminar recursos
   - ✅ `RegisterService`: Actualizado para usar HttpClient con `skipAuth`
   - ✅ `useAuth`: Actualizado `fetchUserInfo` para usar HttpClient
   - ✅ Manejo de errores específicos (red, autenticación, FHIR) con ErrorService

3. **Implementar useFHIRData hook** ✅
   - ✅ Integración completa con `FHIRClientService`
   - ✅ Cache básico en memoria con TTL de 5 minutos
   - ✅ Paginación opcional para listas grandes (`enablePagination`, `loadMore`)
   - ✅ Estados de carga (`isLoading`), error (`error`) y datos (`data`)
   - ✅ Invalidación de cache con `refetch()`
   - ✅ Soporte para diferentes tipos de recursos FHIR (Encounter, DocumentReference, Consent)
   - ✅ Cancelación de requests cuando el componente se desmonta (AbortController)

4. **Actualizar Dashboard con datos reales** ✅
   - ✅ Dashboard usa `useFHIRData` para obtener Encounters y DocumentReferences
   - ✅ Obtiene consentimientos activos del paciente
   - ✅ Combina y ordena registros por fecha (más recientes primero)
   - ✅ Pull-to-refresh implementado
   - ✅ Estados de carga y error con UI apropiada
   - ✅ Manejo de estados vacíos

**Archivos creados/modificados:**

- ✅ `services/HttpClient.ts` - Cliente HTTP base con interceptores (creado)
- ✅ `services/FHIRClientService.ts` - Actualizado para usar HttpClient (sin patientId)
- ✅ `services/RegisterService.ts` - Actualizado para usar HttpClient
- ✅ `hooks/useFHIRData.ts` - Implementación completa con cache y paginación
- ✅ `hooks/useAuth.tsx` - Actualizado `fetchUserInfo` para usar HttpClient
- ✅ `app/(tabs)/index.tsx` - Actualizado para usar datos reales del API

**Endpoints del API utilizados:**

- ✅ `GET /api/fhir/Encounter` - Obtener consultas médicas del paciente (filtrado automático por token JWT)
- ✅ `GET /api/fhir/DocumentReference` - Obtener documentos clínicos del paciente (filtrado automático)
- ✅ `GET /api/fhir/Consent` - Obtener consentimientos del paciente (filtrado automático)
- ✅ `GET /api/auth/user` - Obtener información del usuario autenticado
- ✅ `GET /api/auth/refresh` - Refrescar tokens de acceso (usado automáticamente por HttpClient)
- ⏳ `GET /api/fhir/Patient/[id]` - Obtener perfil del paciente (pendiente usar en Settings - FASE 4)
- ⏳ `GET /api/fhir/{resourceType}/{id}` - Obtener recurso por ID (pendiente usar en pantalla de detalle - FASE 4)
- ⏳ `POST /api/fhir/Consent` - Crear nuevo consentimiento (pendiente implementar en FASE 4)
- ⏳ `PATCH /api/fhir/Consent/[id]` - Revocar consentimiento (pendiente implementar en FASE 4)

**Características implementadas:**

- ✅ Refresh automático de tokens cuando expiran (sin interrumpir al usuario)
- ✅ Reintentos automáticos para errores de red (máx 3 intentos con backoff exponencial)
- ✅ Cache en memoria con TTL de 5 minutos para evitar requests duplicados
- ✅ Paginación opcional para listas grandes de recursos
- ✅ Manejo robusto de errores (401, 403, red, timeout)
- ✅ Redirección automática a login cuando el token es inválido

---

### **FASE 4: Pantallas Principales del Paciente** 📱 ✅ **COMPLETADA**

**Objetivo**: Completar todas las pantallas que el paciente necesita para gestionar su información médica

> **Enfoque:** Todas las pantallas están diseñadas desde la perspectiva del paciente. El paciente solo puede ver y gestionar su propia información médica.

#### Tareas:

1. **Pantalla Dashboard (Home)** - `app/(tabs)/index.tsx` ✅
   - ✅ Reemplazar datos dummy con `useFHIRData` para obtener registros reales
   - ✅ Obtener últimos 5 Encounters y DocumentReferences del paciente
   - ✅ Obtener consentimientos activos del paciente
   - ✅ Implementar pull-to-refresh para actualizar datos
   - ✅ Agregar estados de carga (SkeletonList, LoadingSpinner)
   - ✅ Implementar navegación a detalles de registros
   - ✅ Navegación a pantalla de consentimientos desde ConsentStatusCard
   - ✅ Manejo de errores con ErrorMessage y retry

2. **Pantalla History (Historial Clínico)** - `app/(tabs)/history.tsx` ✅
   - ✅ Implementar lista completa de registros clínicos del paciente
   - ✅ Obtener todos los Encounters y DocumentReferences del paciente
   - ✅ Agregar filtros por tipo de recurso (Encounter, DocumentReference)
   - ✅ Agregar filtros por fecha (última semana, mes, año)
   - ✅ Implementar búsqueda por texto (títulos, descripciones)
   - ✅ Agregar paginación infinita (cargar más al hacer scroll)
   - ✅ Implementar navegación a detalles de registros
   - ✅ Mostrar estados vacíos cuando no hay registros
   - ✅ Estados de carga y manejo de errores

3. **Pantalla Settings (Perfil)** - `app/(tabs)/settings.tsx` ✅
   - ✅ Mostrar información del usuario autenticado (desde `useAuth`)
   - ✅ Obtener y mostrar información del recurso Patient FHIR
   - ✅ Implementar logout (llamar a `useAuth().logout()`)
   - ✅ Mostrar resumen de consentimientos activos
   - ✅ Agregar navegación a pantalla de consentimientos
   - ✅ Mostrar versión de la app
   - ✅ Preparar estructura para configuración de notificaciones (futuro)

4. **Pantalla de Detalle de Registro** - `app/record/[id].tsx` ✅
   - ✅ Crear pantalla dinámica con parámetro `[id]`
   - ✅ Obtener recurso FHIR completo por ID y tipo
   - ✅ Mostrar detalles estructurados y legibles del recurso
   - ✅ Diferenciar visualización según tipo (Encounter vs DocumentReference)
   - ✅ Mostrar información relacionada (Practitioner, fechas, etc.)
   - ✅ Implementar navegación de regreso
   - ⏳ Preparar para opciones de compartir/exportar (futuro)

5. **Pantalla de Consentimientos** - `app/consents/index.tsx` ✅
   - ✅ Listar todos los consentimientos del paciente
   - ✅ Mostrar consentimientos activos, revocados y expirados
   - ⏳ Permitir crear nuevo consentimiento (formulario) - Pendiente
   - ✅ Permitir revocar consentimiento activo
   - ✅ Mostrar detalles de cada consentimiento (con quién, duración, alcance)
   - ✅ Filtrar por estado (active, revoked, expired)
   - ✅ Implementar navegación de regreso al Dashboard
   - ✅ Estados de carga y manejo de errores

**Archivos creados/modificados:**

- ✅ `app/(tabs)/index.tsx` - Completado con datos reales del paciente
- ✅ `app/(tabs)/history.tsx` - Implementado completamente
- ✅ `app/(tabs)/settings.tsx` - Implementado completamente
- ✅ `app/record/[id].tsx` - Pantalla de detalle creada
- ✅ `app/consents/index.tsx` - Pantalla de consentimientos creada
- ✅ `components/cards/ConsentStatusCard.tsx` - Navegación a `/consents` agregada
- ✅ `components/ui/LoadingSpinner.tsx` - Componente de carga creado
- ✅ `components/ui/EmptyState.tsx` - Componente para estados vacíos creado
- ✅ `components/ui/ErrorMessage.tsx` - Componente de errores creado
- ✅ `components/ui/SkeletonLoader.tsx` - Componente de skeleton creado

**Recursos FHIR que el paciente puede ver:**

- `Patient` - Solo su propio perfil (solo lectura)
- `Encounter` - Solo sus propias consultas médicas
- `DocumentReference` - Solo sus propios documentos clínicos
- `Consent` - Sus propios consentimientos (puede crear/revocar)

---

### **FASE 5: UX y Pulido** ✨ ⏳ **EN PROGRESO**

**Objetivo**: Mejorar la experiencia de usuario

> **Nota**: Esta fase está en progreso. Se han completado la mayoría de las tareas, pero quedan pendientes:
>
> - Corrección de errores en History (conexión con API)
> - Mejoras en Settings (manejo de errores y estados de carga)
> - Navegación mejorada (opcional)

#### Tareas:

1. **Estados de carga** ✅
   - ✅ Crear componente LoadingSpinner
   - ✅ Agregar skeletons para listas (SkeletonLoader, SkeletonList)
   - ✅ Implementar estados de carga en todas las pantallas (Dashboard, History, Settings, Record Detail, Consents)

2. **Manejo de errores visual** ✅
   - ✅ Crear componente ErrorMessage
   - ✅ Mostrar errores de forma amigable con íconos y colores
   - ✅ Implementar retry en errores de red
   - ✅ Integrado en todas las pantallas principales (Dashboard, History, Settings, Consents)

3. **Validación de formularios** ✅
   - ✅ Completar validación en RegisterForm (todos los campos: username, email, password, name, birthDate, gender)
   - ✅ Mostrar mensajes de error inline con FormInput
   - ⏳ Agregar validación en LoginForm - No aplica (solo botón que abre Keycloak)

4. **Corrección de errores en pantallas** ⏳
   - ✅ Corregir History para usar `useEncounters` en lugar de `useFHIRData` para Encounters (endpoint optimizado)
   - ✅ Mejorar Settings: agregar manejo de errores con ErrorMessage y estados de carga con SkeletonList
   - ⏳ Verificar y corregir cualquier otro error de conexión con API

5. **Navegación mejorada** ⏳
   - ⏳ Agregar animaciones de transición (opcional)
   - ⏳ Implementar deep linking (opcional)
   - ⏳ Agregar navegación con gestos (opcional)

6. **Optimizaciones de rendimiento** ✅
   - ✅ Implementar memoización con React.memo en componentes (ClinicalRecordCard, ConsentStatusCard, PrimaryButton, FormInput, FHIRResourceIcon)
   - ✅ Optimizar re-renders con useCallback en funciones de handlers
   - ✅ Optimizar cálculos con useMemo en listas y filtros
   - ⏳ Lazy loading de pantallas (opcional para futuras optimizaciones)

**Archivos creados/modificados:**

- ✅ `components/ui/LoadingSpinner.tsx` - Componente creado
- ✅ `components/ui/ErrorMessage.tsx` - Componente creado
- ✅ `components/ui/SkeletonLoader.tsx` - Componente creado (SkeletonLoader y SkeletonList)
- ✅ `hooks/useRegisterForm.ts` - Validación completa agregada
- ✅ `components/cards/ClinicalRecordCard.tsx` - Memoizado con React.memo
- ✅ `components/cards/ConsentStatusCard.tsx` - Memoizado con React.memo
- ✅ `components/ui/PrimaryButton.tsx` - Memoizado con React.memo y useCallback
- ✅ `components/ui/FormInput.tsx` - Memoizado con React.memo
- ✅ `components/common/FHIRResourceIcon.tsx` - Memoizado con React.memo
- ✅ `app/(tabs)/index.tsx` - useCallback en handleRefresh
- ✅ `app/(tabs)/history.tsx` - useCallback en handlers, useMemo en filtros
- ✅ `app/(tabs)/settings.tsx` - useCallback en handlers, ErrorMessage, SkeletonList
- ✅ `app/(tabs)/history.tsx` - Corregido para usar useEncounters, mejor manejo de EncounterListItemDto
- ✅ `app/consents/index.tsx` - useCallback en handlers y funciones helper
- ⏳ `app/_layout.tsx` - Configurar animaciones (pendiente, opcional)

---

### **FASE 6: Testing y Documentación** 🧪

**Objetivo**: Asegurar calidad y documentar

#### Tareas:

1. **Testing unitario**
   - Completar tests de componentes
   - Agregar tests de hooks
   - Agregar tests de servicios

2. **Testing de integración**
   - Tests de flujo de autenticación
   - Tests de integración con API
   - Tests de navegación

3. **Documentación**
   - Documentar estructura de carpetas
   - Documentar servicios y hooks
   - Crear guía de desarrollo
   - Documentar configuración de entorno

**Archivos a crear/modificar:**

- `__tests__/` - Agregar más tests
- `README.md` - Documentación completa
- `docs/` - Documentación adicional

---

## 🏗️ Estructura de Carpetas Propuesta

```
packages/mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (tabs)/                   # Tab navigation
│   │   ├── index.tsx            # Dashboard
│   │   ├── history.tsx          # Clinical history
│   │   └── settings.tsx         # Settings
│   ├── auth/                     # Auth screens
│   │   ├── login/
│   │   └── register/
│   ├── record/                   # Record details
│   │   └── [id].tsx
│   ├── consents/                 # Consent management
│   │   └── index.tsx
│   ├── _layout.tsx               # Root layout
│   └── index.tsx                 # Entry point
├── components/
│   ├── ui/                       # UI components
│   │   ├── PrimaryButton.tsx
│   │   ├── FormInput.tsx
│   │   ├── AppHeader.tsx
│   │   ├── LoadingSpinner.tsx    # Nuevo
│   │   └── ErrorMessage.tsx      # Nuevo
│   ├── cards/                    # Card components
│   └── common/                   # Common components
│       ├── ErrorBoundary.tsx     # Nuevo
│       └── FHIRResourceIcon.tsx
├── hooks/
│   ├── useAuth.tsx               # ✅ Completado
│   ├── useFHIRData.ts            # Completar
│   └── useRegisterForm.ts        # Completar validación
├── services/
│   ├── AuthService.ts            # ✅ Completado
│   ├── FHIRClientService.ts      # Actualizar
│   ├── RegisterService.ts        # Actualizar
│   ├── HttpClient.ts             # Nuevo
│   └── ErrorService.ts           # ✅ Creado
├── config/
│   └── AppConfig.ts              # ✅ Creado
├── types/
│   └── index.ts                  # Tipos adicionales si necesario
├── utils/
│   └── dateUtils.ts              # Utilidades de fecha
└── assets/
    └── images/
```

---

## 🔧 Dependencias Adicionales Necesarias

```json
{
  "dependencies": {
    "@expo/vector-icons": "^14.0.4", // ✅ Ya agregado
    "expo-constants": "~17.0.3", // Para variables de entorno
    "react-native-config": "^1.5.1" // Alternativa para .env
  }
}
```

---

## 📝 Notas Importantes

### Enfoque en el Paciente

1. **Filtrado Automático por Paciente**
   - Todos los endpoints FHIR deben filtrar automáticamente por el paciente autenticado
   - El backend ya implementa esto mediante el token JWT (`patient` claim)
   - No es necesario pasar `subject.reference=Patient/[id]` en los requests
   - El paciente solo puede ver sus propios recursos

2. **Recursos FHIR Disponibles para el Paciente**
   - `Patient` - Solo lectura de su propio perfil
   - `Encounter` - Solo sus propias consultas médicas
   - `DocumentReference` - Solo sus propios documentos clínicos
   - `Consent` - Puede crear, leer y revocar sus propios consentimientos

### Configuración

3. **URLs de API**: Configuradas en `AppConfig.ts` desde variables de entorno:
   - Desarrollo: `MOBILE_API_URL` o `EXPO_PUBLIC_API_URL` (usar IP local para dispositivo físico)
   - Staging: URL de staging en `.env.staging`
   - Producción: URL de producción en `.env.production`

4. **Keycloak Configuration**: Configurado en `AppConfig.ts`:
   - `KEYCLOAK_URL` - URL base de Keycloak
   - `MOBILE_KEYCLOAK_CLIENT_ID` - Client ID para la app móvil
   - `MOBILE_REDIRECT_URI` - URI de redirección (scheme://auth)
   - Auto-discovery de endpoints mediante `useAutoDiscovery`

### Seguridad

5. **Almacenamiento Seguro**:
   - Tokens almacenados en SecureStore (keychain iOS, Keystore Android)
   - Nunca commitear `.env` con credenciales reales
   - Validar certificados SSL en producción
   - Refresh automático de tokens cuando expiran

6. **Testing en Dispositivos**:
   - Para iOS: Usar simulador o dispositivo físico
   - Para Android: Usar emulador o dispositivo físico
   - Para localhost: Usar IP local de la máquina (ej: `http://192.168.1.100:3000`), no `localhost`
   - Ver [MOBILE_ENV_VARIABLES.md](../MOBILE_ENV_VARIABLES.md) para más detalles

---

## 🚀 Orden Recomendado de Implementación

1. ✅ **FASE 1** → Configuración base (permite desarrollo sin errores) - **COMPLETADA**
2. ✅ **FASE 2** → Autenticación (necesario para todo lo demás) - **COMPLETADA**
3. ✅ **FASE 3** → Integración API (permite datos reales) - **COMPLETADA**
4. ✅ **FASE 4** → Pantallas (completa funcionalidad) - **COMPLETADA**
5. ⏳ **FASE 5** → UX (mejora experiencia) - **EN PROGRESO** (80% completada)
6. **FASE 6** → Testing (asegura calidad) - **PENDIENTE**

---

## ✅ Checklist de Validación

Antes de considerar la app "funcional", verificar:

- [x] La app inicia sin errores
- [x] El login funciona y redirige correctamente
- [x] El registro crea usuario y redirige
- [x] El dashboard muestra datos reales del backend
- [x] La navegación entre pantallas funciona
- [x] Los tokens se refrescan automáticamente
- [x] Los errores se muestran de forma amigable
- [x] La app funciona en iOS y Android
- [ ] Los tests pasan (pendiente FASE 6)

---

## 📞 Próximos Pasos

1. ✅ **FASE 1 COMPLETADA** - Configuración base y entorno
2. ✅ **FASE 2 COMPLETADA** - Sistema de autenticación
3. ✅ **FASE 3 COMPLETADA** - Integración con Backend API
4. ✅ **FASE 4 COMPLETADA** - Pantallas Principales del Paciente
5. ⏳ **FASE 5 (Actual)** - UX y Pulido
   - ✅ Estados de carga y manejo de errores
   - ✅ Validación de formularios
   - ✅ Optimizaciones de rendimiento
   - ⏳ Navegación mejorada (opcional)
6. **FASE 6** - Testing y Documentación
   - Tests unitarios
   - Tests de integración
   - Documentación completa

## 📚 Documentación Relacionada

- [MOBILE_APP_CONTEXT.md](./MOBILE_APP_CONTEXT.md) - Contexto del paciente, acciones, pantallas y flujos
- [MOBILE_ENV_VARIABLES.md](../MOBILE_ENV_VARIABLES.md) - Variables de entorno para la app móvil
- [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) - Contexto general del proyecto CareCore
