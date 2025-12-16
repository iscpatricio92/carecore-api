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

### ⏳ Lo que falta o está incompleto:
- **Pantallas incompletas**: History y Settings son placeholders
- **Navegación**: Rutas de detalle de registros no implementadas
- **Integración con API**: Falta conectar con datos reales del backend (FASE 3)
- **Loading states**: Falta feedback visual durante cargas en algunas pantallas
- **Validación de formularios**: Validación básica en formularios (mejorar)
- **Cache y paginación**: Falta implementar en useFHIRData

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

### **FASE 3: Integración con Backend API** 🌐
**Objetivo**: Conectar la app con el backend NestJS para obtener datos reales del paciente

> **Importante:** Todos los endpoints FHIR deben filtrar automáticamente por el paciente autenticado. El backend ya implementa esto mediante el token JWT que incluye el `patient` claim.

#### Tareas:
1. **Configurar cliente HTTP**
   - Crear servicio HTTP base (`services/HttpClient.ts`) con interceptores
   - Implementar refresh automático de tokens cuando expiran
   - Agregar token JWT automáticamente en header `Authorization: Bearer <token>`
   - Manejar timeouts y reintentos para requests fallidos
   - Agregar headers comunes (Content-Type: application/json)
   - Manejar errores 401 (no autorizado) y 403 (prohibido)
   - Redirigir a login si el token es inválido

2. **Actualizar servicios existentes**
   - `FHIRClientService`: Usar HttpClient y filtrar por paciente
   - `RegisterService`: Usar HttpClient
   - Agregar manejo de errores específicos (red, autenticación, FHIR)
   - Implementar retry logic para requests fallidos (máx 3 intentos)
   - Validar que las respuestas FHIR sean del paciente autenticado

3. **Implementar useFHIRData hook**
   - Completar integración con `FHIRClientService`
   - Agregar cache básico en memoria (evitar requests duplicados)
   - Implementar paginación para listas grandes
   - Manejar estados de carga (`isLoading`), error (`error`) y datos (`data`)
   - Implementar invalidación de cache cuando sea necesario
   - Soporte para diferentes tipos de recursos FHIR (Encounter, DocumentReference, Consent)

4. **Testing de integración**
   - Probar endpoints de autenticación (`/api/auth/*`)
   - Probar endpoints FHIR (`/api/fhir/Encounter`, `/api/fhir/DocumentReference`, `/api/fhir/Consent`)
   - Verificar que los datos se filtren correctamente por paciente
   - Verificar manejo de errores (red, autenticación, autorización)
   - Verificar refresh automático de tokens

**Archivos a crear/modificar:**
- `services/HttpClient.ts` - Cliente HTTP base con interceptores (crear)
- `services/FHIRClientService.ts` - Actualizar para usar HttpClient y filtrar por paciente
- `services/RegisterService.ts` - Actualizar para usar HttpClient
- `hooks/useFHIRData.ts` - Completar implementación con cache y paginación
- `app/(tabs)/index.tsx` - Reemplazar datos dummy con `useFHIRData` para obtener registros reales del paciente

**Endpoints del API que se usarán:**
- `GET /api/fhir/Encounter` - Obtener consultas médicas del paciente
- `GET /api/fhir/DocumentReference` - Obtener documentos clínicos del paciente
- `GET /api/fhir/Consent` - Obtener consentimientos del paciente
- `GET /api/fhir/Patient/[id]` - Obtener perfil del paciente
- `POST /api/fhir/Consent` - Crear nuevo consentimiento
- `PATCH /api/fhir/Consent/[id]` - Revocar consentimiento

---

### **FASE 4: Pantallas Principales del Paciente** 📱
**Objetivo**: Completar todas las pantallas que el paciente necesita para gestionar su información médica

> **Enfoque:** Todas las pantallas están diseñadas desde la perspectiva del paciente. El paciente solo puede ver y gestionar su propia información médica.

#### Tareas:
1. **Pantalla Dashboard (Home)** - `app/(tabs)/index.tsx`
   - Reemplazar datos dummy con `useFHIRData` para obtener registros reales
   - Obtener últimos 5 Encounters y DocumentReferences del paciente
   - Obtener consentimientos activos del paciente
   - Implementar pull-to-refresh para actualizar datos
   - Agregar estados de carga (LoadingSpinner)
   - Implementar navegación a detalles de registros
   - Navegación a pantalla de consentimientos desde ConsentStatusCard

2. **Pantalla History (Historial Clínico)** - `app/(tabs)/history.tsx`
   - Implementar lista completa de registros clínicos del paciente
   - Obtener todos los Encounters y DocumentReferences del paciente
   - Agregar filtros por tipo de recurso (Encounter, DocumentReference)
   - Agregar filtros por fecha (última semana, mes, año)
   - Implementar búsqueda por texto (títulos, descripciones)
   - Agregar paginación infinita (cargar más al hacer scroll)
   - Implementar navegación a detalles de registros
   - Mostrar estados vacíos cuando no hay registros

3. **Pantalla Settings (Perfil)** - `app/(tabs)/settings.tsx`
   - Mostrar información del usuario autenticado (desde `useAuth`)
   - Obtener y mostrar información del recurso Patient FHIR
   - Implementar logout (llamar a `useAuth().logout()`)
   - Mostrar resumen de consentimientos activos
   - Agregar navegación a pantalla de consentimientos
   - Mostrar versión de la app
   - Preparar estructura para configuración de notificaciones (futuro)

4. **Pantalla de Detalle de Registro** - `app/record/[id].tsx` (Nueva)
   - Crear pantalla dinámica con parámetro `[id]`
   - Obtener recurso FHIR completo por ID y tipo
   - Mostrar detalles estructurados y legibles del recurso
   - Diferenciar visualización según tipo (Encounter vs DocumentReference)
   - Mostrar información relacionada (Practitioner, fechas, etc.)
   - Implementar navegación de regreso
   - Preparar para opciones de compartir/exportar (futuro)

5. **Pantalla de Consentimientos** - `app/consents/index.tsx` (Nueva)
   - Listar todos los consentimientos del paciente
   - Mostrar consentimientos activos, revocados y expirados
   - Permitir crear nuevo consentimiento (formulario)
   - Permitir revocar consentimiento activo
   - Mostrar detalles de cada consentimiento (con quién, duración, alcance)
   - Filtrar por estado (active, revoked, expired)
   - Implementar navegación de regreso al Dashboard

**Archivos a crear/modificar:**
- `app/(tabs)/index.tsx` - Completar con datos reales del paciente
- `app/(tabs)/history.tsx` - Implementar completamente (actualmente placeholder)
- `app/(tabs)/settings.tsx` - Implementar completamente (actualmente placeholder)
- `app/record/[id].tsx` - Nueva pantalla de detalle (crear)
- `app/consents/index.tsx` - Nueva pantalla de consentimientos (crear)
- `components/cards/ConsentStatusCard.tsx` - Agregar navegación a `/consents`
- `components/ui/LoadingSpinner.tsx` - Componente de carga (crear)
- `components/ui/EmptyState.tsx` - Componente para estados vacíos (crear)

**Recursos FHIR que el paciente puede ver:**
- `Patient` - Solo su propio perfil (solo lectura)
- `Encounter` - Solo sus propias consultas médicas
- `DocumentReference` - Solo sus propios documentos clínicos
- `Consent` - Sus propios consentimientos (puede crear/revocar)

---

### **FASE 5: UX y Pulido** ✨
**Objetivo**: Mejorar la experiencia de usuario

#### Tareas:
1. **Estados de carga**
   - Crear componente LoadingSpinner
   - Agregar skeletons para listas
   - Implementar estados de carga en todas las pantallas

2. **Manejo de errores visual**
   - Crear componente ErrorMessage
   - Mostrar errores de forma amigable
   - Implementar retry en errores de red

3. **Validación de formularios**
   - Completar validación en RegisterForm
   - Agregar validación en LoginForm
   - Mostrar mensajes de error inline

4. **Navegación mejorada**
   - Agregar animaciones de transición
   - Implementar deep linking
   - Agregar navegación con gestos

5. **Optimizaciones de rendimiento**
   - Implementar memoización donde sea necesario
   - Optimizar re-renders
   - Lazy loading de pantallas

**Archivos a crear/modificar:**
- `components/ui/LoadingSpinner.tsx` - Nuevo componente
- `components/ui/ErrorMessage.tsx` - Nuevo componente
- `components/ui/SkeletonLoader.tsx` - Nuevo componente
- `hooks/useRegisterForm.ts` - Agregar validación
- `app/_layout.tsx` - Configurar animaciones

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
    "@expo/vector-icons": "^14.0.4",  // ✅ Ya agregado
    "expo-constants": "~17.0.3",      // Para variables de entorno
    "react-native-config": "^1.5.1"   // Alternativa para .env
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
3. **FASE 3** → Integración API (permite datos reales) - **EN PROGRESO**
4. **FASE 4** → Pantallas (completa funcionalidad)
5. **FASE 5** → UX (mejora experiencia)
6. **FASE 6** → Testing (asegura calidad)

---

## ✅ Checklist de Validación

Antes de considerar la app "funcional", verificar:

- [ ] La app inicia sin errores
- [ ] El login funciona y redirige correctamente
- [ ] El registro crea usuario y redirige
- [ ] El dashboard muestra datos reales del backend
- [ ] La navegación entre pantallas funciona
- [ ] Los tokens se refrescan automáticamente
- [ ] Los errores se muestran de forma amigable
- [ ] La app funciona en iOS y Android
- [ ] Los tests pasan

---

## 📞 Próximos Pasos

1. ✅ **FASE 1 COMPLETADA** - Configuración base y entorno
2. ✅ **FASE 2 COMPLETADA** - Sistema de autenticación
3. **FASE 3 (Actual)** - Integración con Backend API
   - Crear `HttpClient.ts` con interceptores
   - Completar `useFHIRData` hook
   - Conectar Dashboard con datos reales
4. **FASE 4** - Pantallas Principales del Paciente
   - Completar History y Settings
   - Crear pantalla de Detalle de Registro
   - Crear pantalla de Consentimientos
5. **FASE 5** - UX y Pulido
6. **FASE 6** - Testing y Documentación

## 📚 Documentación Relacionada

- [MOBILE_APP_CONTEXT.md](./MOBILE_APP_CONTEXT.md) - Contexto del paciente, acciones, pantallas y flujos
- [MOBILE_ENV_VARIABLES.md](../MOBILE_ENV_VARIABLES.md) - Variables de entorno para la app móvil
- [PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md) - Contexto general del proyecto CareCore
