# Plan de Implementación - App Móvil CareCore

## 📋 Estado Actual

### ✅ Lo que ya está implementado:
- Estructura básica de Expo Router con tabs
- Componentes UI básicos (PrimaryButton, FormInput, AppHeader)
- Componentes de cards (ConsentStatusCard, ClinicalRecordCard)
- Servicios base (AuthService, FHIRClientService, RegisterService)
- Hooks base (useFHIRData, useRegisterForm)
- Pantallas básicas (Login, Register, Dashboard, History, Settings)
- Configuración de Expo (app.json, babel, jest)
- Integración con @carecore/shared para tipos FHIR

### ❌ Lo que falta o está incompleto:
- **Autenticación**: `useAuth.tsx` está completamente comentado
- **Configuración de API**: URLs hardcodeadas (`localhost:3000`)
- **Pantallas incompletas**: History y Settings son placeholders
- **Navegación**: Rutas de detalle de registros no implementadas
- **Manejo de estado global**: No hay contexto de autenticación activo
- **Manejo de errores**: Falta manejo robusto de errores de red
- **Variables de entorno**: No hay configuración de entorno
- **Refresh tokens**: Lógica de refresh no está implementada
- **Loading states**: Falta feedback visual durante cargas
- **Validación de formularios**: Validación básica en formularios

---

## 🎯 Fases de Implementación

### **FASE 1: Configuración Base y Entorno** ⚙️
**Objetivo**: Configurar el entorno de desarrollo y variables de configuración

#### Tareas:
1. **Configurar variables de entorno**
   - de acuerdo al monorepo seria bueno usar los .env globales o revisar si es preferible crear un .env en el package/mobile
   - Instalar y configurar `expo-constants` o `react-native-config`
   - Crear servicio de configuración (`config/AppConfig.ts`)
   - Reemplazar URLs hardcodeadas por variables de entorno

2. **Configurar manejo de errores global**
   - Crear componente ErrorBoundary
   - Crear servicio de logging (`services/ErrorService.ts`)
   - Implementar manejo de errores de red centralizado

3. **Configurar tipos de entorno**
   - Definir tipos para desarrollo/staging/producción
   - Configurar diferentes URLs según entorno

**Archivos a crear/modificar:**
- `config/AppConfig.ts` - Configuración centralizada
- `.env` / `.env.example` - Variables de entorno
- `components/common/ErrorBoundary.tsx` - Manejo de errores
- `services/ErrorService.ts` - Servicio de errores
- Modificar: `AuthService.ts`, `FHIRClientService.ts`, `RegisterService.ts`

---

### **FASE 2: Sistema de Autenticación** 🔐
**Objetivo**: Implementar autenticación completa con Keycloak

#### Tareas:
1. **Implementar useAuth hook**
   - Descomentar y completar `hooks/useAuth.tsx`
   - Configurar OAuth2/Keycloak con `expo-auth-session`
   - Implementar flujo PKCE
   - Manejar tokens (access + refresh)
   - Persistencia de sesión con SecureStore

2. **Integrar AuthProvider en la app**
   - Activar AuthProvider en `app/_layout.tsx`
   - Implementar redirección automática según estado de auth
   - Manejar estados de carga durante autenticación

3. **Completar AuthService**
   - Implementar `exchangeCodeForTokens`
   - Implementar `refreshAccessToken`
   - Manejar expiración de tokens
   - Interceptar requests para agregar tokens automáticamente

4. **Actualizar pantallas de auth**
   - Completar `app/auth/login/index.tsx` con lógica real
   - Completar `app/auth/register/index.tsx` con validación
   - Agregar manejo de errores de autenticación
   - Agregar estados de carga

**Archivos a crear/modificar:**
- `hooks/useAuth.tsx` - Descomentar y completar
- `app/_layout.tsx` - Activar AuthProvider
- `app/auth/login/index.tsx` - Completar lógica
- `app/auth/register/index.tsx` - Completar validación
- `services/AuthService.ts` - Completar métodos
- `app/index.tsx` - Integrar redirección de auth

---

### **FASE 3: Integración con Backend API** 🌐
**Objetivo**: Conectar la app con el backend NestJS

#### Tareas:
1. **Configurar cliente HTTP**
   - Crear servicio HTTP base con interceptores
   - Implementar refresh automático de tokens
   - Manejar timeouts y reintentos
   - Agregar headers comunes (Content-Type, Authorization)

2. **Actualizar servicios existentes**
   - `FHIRClientService`: Usar configuración de entorno
   - `RegisterService`: Usar configuración de entorno
   - Agregar manejo de errores específicos
   - Implementar retry logic para requests fallidos

3. **Implementar useFHIRData hook**
   - Completar integración con `FHIRClientService`
   - Agregar cache básico
   - Implementar paginación
   - Manejar estados de carga y error

4. **Testing de integración**
   - Probar endpoints de autenticación
   - Probar endpoints FHIR
   - Verificar manejo de errores

**Archivos a crear/modificar:**
- `services/HttpClient.ts` - Cliente HTTP base
- `services/FHIRClientService.ts` - Actualizar con HttpClient
- `services/RegisterService.ts` - Actualizar con HttpClient
- `hooks/useFHIRData.ts` - Completar implementación
- `app/(tabs)/index.tsx` - Usar datos reales en lugar de dummy

---

### **FASE 4: Pantallas Principales** 📱
**Objetivo**: Completar todas las pantallas de la app

#### Tareas:
1. **Pantalla Dashboard (Home)**
   - Reemplazar datos dummy con `useFHIRData`
   - Implementar pull-to-refresh
   - Agregar estados de carga
   - Implementar navegación a detalles

2. **Pantalla History**
   - Implementar lista de registros clínicos completos
   - Agregar filtros (por tipo, fecha)
   - Implementar búsqueda
   - Agregar paginación infinita

3. **Pantalla Settings**
   - Mostrar información del usuario
   - Implementar logout
   - Agregar configuración de notificaciones
   - Mostrar información de consentimientos

4. **Pantalla de Detalle de Registro**
   - Crear `app/record/[id].tsx`
   - Mostrar detalles completos del recurso FHIR
   - Implementar navegación desde cards

5. **Pantalla de Consentimientos**
   - Crear `app/consents/index.tsx`
   - Listar consentimientos activos
   - Permitir crear/revocar consentimientos

**Archivos a crear/modificar:**
- `app/(tabs)/index.tsx` - Completar con datos reales
- `app/(tabs)/history.tsx` - Implementar completamente
- `app/(tabs)/settings.tsx` - Implementar completamente
- `app/record/[id].tsx` - Nueva pantalla de detalle
- `app/consents/index.tsx` - Nueva pantalla de consentimientos
- `components/cards/ConsentStatusCard.tsx` - Agregar navegación

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
│   ├── useAuth.tsx               # Completar
│   ├── useFHIRData.ts            # Completar
│   └── useRegisterForm.ts        # Completar validación
├── services/
│   ├── AuthService.ts            # Completar
│   ├── FHIRClientService.ts      # Actualizar
│   ├── RegisterService.ts        # Actualizar
│   ├── HttpClient.ts             # Nuevo
│   └── ErrorService.ts           # Nuevo
├── config/
│   └── AppConfig.ts              # Nuevo
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

1. **URLs de API**: Actualmente están hardcodeadas. Necesitamos:
   - Desarrollo: `http://localhost:3000` (o IP local para dispositivo físico)
   - Staging: URL de staging
   - Producción: URL de producción

2. **Keycloak Configuration**: Necesitamos:
   - Authorization endpoint
   - Token endpoint
   - Client ID
   - Redirect URI

3. **Seguridad**:
   - Nunca commitear `.env` con credenciales reales
   - Usar SecureStore para tokens
   - Validar certificados SSL en producción

4. **Testing en Dispositivos**:
   - Para iOS: Usar simulador o dispositivo físico
   - Para Android: Usar emulador o dispositivo físico
   - Para localhost: Usar IP local de la máquina, no `localhost`

---

## 🚀 Orden Recomendado de Implementación

1. **FASE 1** → Configuración base (permite desarrollo sin errores)
2. **FASE 2** → Autenticación (necesario para todo lo demás)
3. **FASE 3** → Integración API (permite datos reales)
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

1. Revisar este plan y ajustar según necesidades
2. Decidir orden de implementación (recomiendo seguir el orden propuesto)
3. Comenzar con FASE 1
4. Iterar y probar en cada fase
