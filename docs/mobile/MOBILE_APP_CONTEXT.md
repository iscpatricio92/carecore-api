# 📱 CareCore Mobile App - Contexto del Proyecto

> Documento de contexto compartido para agentes de IA y desarrolladores nuevos en la aplicación móvil CareCore. Enfocado en el usuario paciente, sus acciones, pantallas y flujos.

**Última actualización:** 2025-01-27
**Versión del documento:** 1.1

> **Nota:** Para detalles técnicos de implementación, ver [PLAN_IMPLEMENTACION.md](./PLAN_IMPLEMENTACION.md)

---

## 🎯 ¿Qué es la App Móvil CareCore?

La **aplicación móvil CareCore** es una PHR (Personal Health Record) móvil que permite a los **pacientes** tener control total sobre su información médica desde su dispositivo móvil.

### Propósito Principal

- **El paciente es el dueño absoluto de su información médica**
- **Visualización completa del historial clínico** en formato FHIR R4
- **Control granular de consentimientos** para compartir información con profesionales médicos
- **Acceso seguro y verificado** mediante autenticación OAuth2/OIDC con Keycloak
- **Interfaz intuitiva** diseñada específicamente para pacientes

### Tipo de Aplicación

- **Plataforma:** React Native con Expo
- **Navegación:** Expo Router (file-based routing)
- **Autenticación:** OAuth2 Authorization Code Flow con PKCE
- **Estándar de Datos:** FHIR R4
- **Arquitectura:** Cliente móvil que consume API RESTful

---

## 👤 Usuario Principal: El Paciente

### Perfil del Usuario

El usuario principal de la aplicación móvil es el **paciente**:

- Personas que quieren tener control sobre su información médica
- Pacientes que necesitan acceder a su historial clínico desde cualquier lugar
- Usuarios que quieren compartir su información con múltiples médicos o instituciones
- Personas que buscan un historial médico unificado y accesible

### Rol y Permisos

- **Rol en Keycloak:** `patient`
- **Scopes OAuth2:** `patient:read`, `consent:read`, `consent:write`, `consent:share`
- **Acceso:** Solo puede ver y gestionar su propia información médica
- **Restricciones:** No puede crear ni modificar registros clínicos (solo practitioners verificados pueden hacerlo)

---

## 📱 Pantallas y Navegación

### Estructura de Navegación

La aplicación utiliza **Expo Router** con navegación basada en tabs:

```
app/
├── index.tsx                    # Entry point (redirección según auth)
├── _layout.tsx                  # Root layout con AuthProvider
├── auth/
│   ├── login/index.tsx         # Pantalla de inicio de sesión
│   └── register/index.tsx      # Pantalla de registro
└── (tabs)/                      # Tab navigation (requiere autenticación)
    ├── _layout.tsx              # Layout de tabs
    ├── index.tsx                # Dashboard (Inicio) 🏠
    ├── history.tsx              # Historial Clínico 📁
    └── settings.tsx             # Perfil/Configuración 👤
```

### Pantallas Principales

#### 1. **Pantalla de Autenticación** (`/auth/login`)

**Propósito:** Permitir al paciente iniciar sesión en su cuenta

**Características:**

- Inicio de sesión seguro mediante OAuth2/OIDC
- Autenticación con Keycloak (mismo sistema del backend)
- Redirección automática si el usuario ya está autenticado
- Enlace a pantalla de registro para nuevos usuarios

**Flujo del Usuario:**

1. Usuario toca "Iniciar Sesión"
2. Se abre la pantalla de autenticación de Keycloak
3. Usuario ingresa sus credenciales
4. Una vez autenticado, la app guarda la sesión de forma segura
5. Usuario es redirigido automáticamente al Dashboard

**Estado:** ✅ Implementado

---

#### 2. **Pantalla de Registro** (`/auth/register`)

**Propósito:** Permitir a nuevos usuarios crear una cuenta de paciente

**Características:**

- Formulario de registro con validación de datos
- Creación automática de cuenta y perfil de paciente
- Validación de información personal (email, contraseña, etc.)
- Redirección automática al Dashboard después del registro exitoso

**Flujo del Usuario:**

1. Usuario completa el formulario de registro
2. La app valida los datos ingresados
3. Se crea la cuenta y el perfil de paciente automáticamente
4. El usuario queda autenticado automáticamente
5. Usuario es redirigido al Dashboard para comenzar a usar la app

**Estado:** ✅ Implementado (básico)

---

#### 3. **Dashboard (Inicio)** (`/(tabs)/index`)

**Propósito:** Pantalla principal que muestra resumen del historial clínico del paciente

**Características:**

- **Resumen de Consentimientos:** Muestra cuántos consentimientos activos tiene el paciente
- **Registros Recientes:** Lista de las consultas y documentos más recientes
- **Acceso Rápido:** Navegación directa a detalles de registros o gestión de consentimientos
- **Actualización:** Pull-to-refresh para obtener los datos más recientes

**Información Mostrada:**

- Consultas médicas más recientes
- Documentos clínicos más recientes (reportes, exámenes, etc.)
- Estado de consentimientos activos

**Acciones del Paciente:**

- Ver detalles completos de cualquier registro clínico
- Gestionar sus consentimientos (crear, revocar)
- Actualizar la información mostrada

**Estado:** ⏳ Parcialmente implementado (usa datos dummy, falta integración con API)

---

#### 4. **Historial Clínico** (`/(tabs)/history`)

**Propósito:** Mostrar el historial clínico completo del paciente

**Características:**

- **Historial Completo:** Todos los registros clínicos del paciente en un solo lugar
- **Filtros:** Por tipo (consultas, documentos) y por fecha
- **Búsqueda:** Buscar registros por texto (títulos, descripciones)
- **Ordenamiento:** Por fecha (más recientes primero)
- **Navegación:** Acceso directo a detalles de cada registro

**Información Mostrada:**

- Todas las consultas médicas del paciente
- Todos los documentos clínicos (reportes, exámenes, imágenes)
- Fechas y tipos de cada registro
- Estado de cada registro

**Acciones del Paciente:**

- Filtrar el historial por tipo o fecha
- Buscar registros específicos
- Ver detalles completos de cualquier registro
- Cargar más registros históricos

**Estado:** ⏳ Placeholder (pendiente implementación)

---

#### 5. **Perfil/Configuración** (`/(tabs)/settings`)

**Propósito:** Mostrar información del paciente y configuraciones de la app

**Características:**

- **Perfil del Paciente:** Información personal y médica del paciente
- **Gestión de Sesión:** Cerrar sesión de forma segura
- **Resumen de Consentimientos:** Estado de los consentimientos activos
- **Configuración:** Preferencias de la app (futuro: notificaciones, etc.)

**Información Mostrada:**

- Datos personales del paciente
- Información del perfil médico
- Resumen de consentimientos activos
- Versión de la aplicación

**Acciones del Paciente:**

- Ver y actualizar información del perfil
- Cerrar sesión de forma segura
- Acceder a gestión de consentimientos

**Estado:** ⏳ Placeholder (pendiente implementación)

---

### Pantallas Secundarias (Futuras)

#### 6. **Detalle de Registro** (`/record/[id]`)

**Propósito:** Mostrar detalles completos de un registro clínico específico

**Características:**

- Vista completa y detallada del registro clínico
- Información presentada de forma clara y comprensible
- Navegación a información relacionada (médico, fechas, etc.)
- Opciones futuras: compartir o exportar el registro

**Estado:** ⏳ Pendiente implementación

---

#### 7. **Gestión de Consentimientos** (`/consents/index`)

**Propósito:** Permitir al paciente gestionar sus consentimientos informados

**Características:**

- Lista completa de todos los consentimientos del paciente
- Crear nuevos consentimientos para compartir información
- Revocar consentimientos existentes en cualquier momento
- Ver detalles de cada consentimiento (con quién, duración, alcance)
- Filtrar por estado (activos, revocados, expirados)

**Estado:** ⏳ Pendiente implementación

---

## 🔄 Flujos Principales del Paciente

### Flujo 1: Registro e Inicio de Sesión

```
Usuario Nuevo
  ↓
Pantalla de Registro
  ↓
Completa Formulario
  ↓
Backend crea cuenta en Keycloak + Patient en FHIR
  ↓
Tokens guardados automáticamente
  ↓
Dashboard (Inicio)
```

**Pantallas involucradas:**

- `/auth/register` → `/(tabs)/index`

**Servicios:**

- `RegisterService` - Maneja registro
- `AuthService` - Guarda tokens

---

### Flujo 2: Inicio de Sesión

```
Usuario Existente
  ↓
Pantalla de Login
  ↓
Autenticación con Keycloak (OAuth2/PKCE)
  ↓
Intercambio de código por tokens
  ↓
Tokens guardados en SecureStore
  ↓
Dashboard (Inicio)
```

**Pantallas involucradas:**

- `/auth/login` → `/(tabs)/index`

**Servicios:**

- `AuthService` - Maneja autenticación y tokens
- `useAuth` hook - Gestiona estado de autenticación

---

### Flujo 3: Visualización del Historial

```
Dashboard
  ↓
Ver Registros Recientes
  ↓
Tap en Registro
  ↓
Pantalla de Detalle
  ↓
Ver Información Completa
```

**Pantallas involucradas:**

- `/(tabs)/index` → `/record/[id]`

**Servicios:**

- `FHIRClientService` - Obtiene recursos FHIR
- `useFHIRData` hook - Gestiona datos y cache

---

### Flujo 4: Búsqueda y Filtrado

```
Historial Clínico
  ↓
Aplicar Filtros o Búsqueda
  ↓
Lista Filtrada
  ↓
Tap en Registro
  ↓
Pantalla de Detalle
```

**Pantallas involucradas:**

- `/(tabs)/history` → `/record/[id]`

**Servicios:**

- `FHIRClientService` - Búsquedas con parámetros FHIR
- `useFHIRData` hook - Maneja filtros y búsqueda

---

### Flujo 5: Gestión de Consentimientos

```
Dashboard
  ↓
Tap en Tarjeta de Consentimientos
  ↓
Pantalla de Consentimientos
  ↓
Crear/Revocar Consentimiento
  ↓
Actualización en Dashboard
```

**Pantallas involucradas:**

- `/(tabs)/index` → `/consents/index`

**Servicios:**

- `FHIRClientService` - CRUD de recursos Consent
- `useFHIRData` hook - Gestiona consentimientos

---

### Flujo 6: Cerrar Sesión

```
Perfil/Configuración
  ↓
Tap en Logout
  ↓
Tokens eliminados
  ↓
Estado de auth limpiado
  ↓
Pantalla de Login
```

**Pantallas involucradas:**

- `/(tabs)/settings` → `/auth/login`

**Servicios:**

- `AuthService` - Elimina tokens
- `useAuth` hook - Limpia estado

---

## 🎨 Componentes UI Principales

### Componentes de Navegación

- **AppHeader** - Header común con título
- **TabBar** - Navegación inferior con tabs

### Componentes de Contenido

- **ConsentStatusCard** - Tarjeta que muestra estado de consentimientos
- **ClinicalRecordCard** - Tarjeta que muestra un registro clínico
- **PrimaryButton** - Botón principal de acción
- **FormInput** - Input de formulario con validación

### Componentes de Estado

- **LoadingSpinner** - Indicador de carga (futuro)
- **ErrorMessage** - Mensaje de error amigable (futuro)
- **ErrorBoundary** - Manejo de errores globales

---

## 🔐 Seguridad y Autenticación

### Autenticación y Seguridad

- **Protocolo:** OAuth2/OIDC con PKCE para máxima seguridad en aplicaciones móviles
- **Identity Provider:** Keycloak (mismo sistema que el backend)
- **Almacenamiento:** Tokens guardados de forma segura en el dispositivo
- **Refresh Automático:** Los tokens se renuevan automáticamente sin interrumpir la experiencia

### Autorización del Paciente

- **Rol:** Paciente (`patient` en Keycloak)
- **Permisos:** Solo puede ver y gestionar su propia información médica
- **Recursos:** Puede ver sus Encounters, DocumentReferences y Consent
- **Restricciones:** No puede crear ni modificar registros clínicos (solo lectura, excepto Consent)

---

## 📊 Recursos FHIR que Ve el Paciente

### Recursos que el Paciente Puede Ver

1. **Patient** - Su propio perfil de paciente
   - Solo puede ver su propio recurso Patient
   - No puede modificar (solo lectura)

2. **Encounter** - Consultas médicas
   - Solo puede ver sus propios Encounters
   - Filtrados automáticamente por `subject.reference = Patient/[patientId]`

3. **DocumentReference** - Documentos clínicos
   - Solo puede ver sus propios DocumentReferences
   - Filtrados automáticamente por `subject.reference = Patient/[patientId]`

4. **Consent** - Consentimientos informados
   - Puede ver, crear y revocar sus propios Consent
   - Filtrados por `patient.reference = Patient/[patientId]`

### Recursos que el Paciente NO Puede Ver

- **Practitioner** - Solo lectura si está relacionado con sus registros
- **Observation** - Pendiente implementación
- **Condition** - Pendiente implementación
- **Medication** - Pendiente implementación

---

## 🚀 Estado Actual del Proyecto

### Funcionalidades Disponibles

- ✅ **Autenticación:** Los pacientes pueden registrarse e iniciar sesión de forma segura
- ✅ **Dashboard:** Vista inicial con resumen del historial clínico (parcialmente implementado)
- ⏳ **Historial Completo:** Visualización de todos los registros clínicos (pendiente)
- ⏳ **Gestión de Consentimientos:** Crear y revocar consentimientos (pendiente)
- ⏳ **Detalle de Registros:** Vista detallada de consultas y documentos (pendiente)

### Integración con Backend

- ✅ Autenticación OAuth2/OIDC con Keycloak funcionando
- ⏳ Integración con API FHIR para obtener datos reales (en progreso)
- ⏳ Sincronización de datos del paciente

> **Para detalles técnicos del estado de implementación, ver [PLAN_IMPLEMENTACION.md](./PLAN_IMPLEMENTACION.md)**

---

## 🎨 Principios de Diseño

### Enfoque en el Paciente

- **Lenguaje claro:** Todas las pantallas usan lenguaje no técnico y comprensible
- **Información médica legible:** Los datos FHIR se presentan de forma amigable
- **Control del usuario:** El paciente tiene control total sobre su información
- **Transparencia:** El paciente siempre sabe quién tiene acceso a sus datos

### Seguridad y Privacidad

- **Filtrado automático:** El paciente solo ve su propia información médica
- **Autenticación robusta:** OAuth2/OIDC con PKCE para máxima seguridad
- **Almacenamiento seguro:** Tokens guardados en SecureStore (keychain/keystore)
- **Protección de datos:** Manejo seguro de errores sin exponer información sensible

### Experiencia de Usuario

- **Rendimiento:** Cache y paginación para una experiencia fluida
- **Accesibilidad:** Contraste adecuado, fuentes legibles, navegación intuitiva
- **Feedback visual:** Estados de carga y mensajes de error claros
- **Offline-ready:** Preparado para funcionar sin conexión (futuro)

> **Para convenciones de código y detalles técnicos, ver [PLAN_IMPLEMENTACION.md](./PLAN_IMPLEMENTACION.md)**

---

## 🔮 Roadmap Futuro

### Próximas Funcionalidades

1. **Notificaciones Push**
   - Notificaciones de nuevos registros clínicos
   - Recordatorios de citas
   - Alertas de consentimientos próximos a expirar

2. **Exportación de Datos**
   - Exportar historial completo en formato FHIR
   - Generar PDF del historial
   - Compartir con otras aplicaciones

3. **Búsqueda Avanzada**
   - Búsqueda semántica en historial
   - Filtros avanzados por fecha, tipo, practitioner
   - Búsqueda por síntomas o diagnósticos

4. **Integración con Dispositivos**
   - Sincronización con wearables
   - Importar datos de dispositivos de salud
   - Monitoreo continuo de signos vitales

5. **Modo Offline**
   - Cache local de datos
   - Sincronización cuando hay conexión
   - Acceso a datos críticos sin internet

---

**Última actualización:** 2025-01-27
**Versión:** 1.0
**Mantenido por:** Equipo CareCore
