# 📘 CareCore - Contexto del Proyecto

> Documento de contexto compartido para agentes de IA y desarrolladores nuevos en el proyecto

**Última actualización:** 2025-01-27
**Versión del documento:** 1.1

---

## 🎯 ¿Qué es CareCore?

**CareCore** es una plataforma digital de registros médicos (PHR - Personal Health Record) donde:

- **El paciente es el dueño absoluto de su información médica**
- **Solo profesionales médicos certificados y verificados** pueden crear o modificar registros clínicos
- **El paciente controla granularmente** con quién comparte su información mediante consentimientos informados
- **Utiliza estándares internacionales FHIR R4** para garantizar interoperabilidad
- **Está diseñada para integrarse con sistemas externos** (laboratorios, clínicas, aseguradoras) mediante SMART on FHIR
- **Incorpora capacidades de IA** para extracción de información, búsquedas semánticas y soporte clínico, siempre con gobernanza y trazabilidad

### Tipo de Sistema

- **Categoría:** PHR (Personal Health Record) / HIE (Health Information Exchange)
- **Estándar:** FHIR R4 (Fast Healthcare Interoperability Resources)
- **Arquitectura:** API RESTful con arquitectura modular preparada para microservicios
- **Modelo de datos:** Propiedad del paciente (Patient-Owned Data)

---

## 🚨 ¿Qué problema resuelve?

### Problemas en el Sistema de Salud Actual

1. **Fragmentación de información médica**
   - Los pacientes tienen historiales médicos dispersos en múltiples instituciones
   - No existe una visión unificada del historial clínico del paciente
   - Dificulta la continuidad de atención médica

2. **Falta de control del paciente sobre sus datos**
   - Los pacientes no tienen acceso fácil a su propia información médica
   - No pueden controlar quién accede a sus datos
   - Dificulta la obtención de segundas opiniones o cambios de médico

3. **Barreras para la interoperabilidad**
   - Los sistemas de salud no se comunican entre sí
   - Formatos propietarios dificultan el intercambio de información
   - Duplicación de exámenes y procedimientos por falta de acceso a historial previo

4. **Falta de verificación de profesionales médicos**
   - No hay un sistema centralizado para verificar la certificación de médicos
   - Riesgo de que personas no certificadas modifiquen registros clínicos
   - Falta de trazabilidad de quién realizó qué acciones

5. **Limitaciones para integraciones con IA**
   - Los sistemas actuales no están preparados para integrar modelos de IA de forma segura
   - Falta de gobernanza y trazabilidad en el uso de IA en salud
   - No hay mecanismos para consentimiento explícito del paciente para uso de IA

### Soluciones que ofrece CareCore

✅ **Centralización del historial médico**
El paciente tiene un único lugar donde se centraliza toda su información médica, basada en estándares FHIR.

✅ **Control granular del paciente**
El paciente decide exactamente con quién, cuándo y por cuánto tiempo comparte su información mediante consentimientos informados (FHIR Consent).

✅ **Verificación de profesionales médicos**
Solo profesionales médicos con cédula/licencia verificada pueden crear o modificar registros clínicos. El sistema incluye un flujo de verificación con upload de documentos y revisión manual.

✅ **Interoperabilidad mediante estándares**
Utiliza FHIR R4 y SMART on FHIR para permitir integración con laboratorios, clínicas, aseguradoras y otros sistemas de salud.

✅ **Preparado para IA con gobernanza**
Arquitectura diseñada para integrar modelos de IA (NLP, búsqueda semántica, resumen clínico) con consentimiento explícito, trazabilidad y gobernanza clínica.

---

## 👥 ¿Para quién fue creado?

### Usuarios Principales

1. **Pacientes**
   - Personas que quieren tener control sobre su información médica
   - Pacientes que necesitan compartir su historial con múltiples médicos o instituciones
   - Pacientes que buscan segundas opiniones médicas
   - Personas que quieren un historial médico unificado y accesible

2. **Profesionales Médicos Certificados**
   - Médicos que necesitan acceso al historial completo del paciente
   - Especialistas que requieren información previa para continuidad de atención
   - Médicos que quieren agregar registros clínicos de forma segura y verificada

3. **Instituciones de Salud**
   - Laboratorios que necesitan recibir y enviar resultados de exámenes
   - Clínicas y hospitales que quieren interoperar con otros sistemas
   - Aseguradoras que requieren acceso a información médica con consentimiento

4. **Desarrolladores de Aplicaciones de Salud**
   - Desarrolladores que quieren crear aplicaciones que se integren con historiales médicos
   - Aplicaciones que necesitan acceso a datos clínicos mediante SMART on FHIR
   - Sistemas de IA que requieren datos clínicos para entrenamiento o inferencia (con consentimiento)

---

## 💡 ¿Por qué fue creado?

### Motivación Principal

El proyecto fue creado para **empoderar a los pacientes** dándoles control real sobre su información médica, mientras se garantiza que solo profesionales certificados puedan modificar registros clínicos.

### Principios Fundamentales

1. **Propiedad del Paciente (Patient Ownership)**
   - El paciente es el único dueño de su información médica
   - El paciente decide con quién, cuándo y por cuánto tiempo comparte su información
   - El paciente puede revocar consentimientos en cualquier momento

2. **Seguridad y Verificación**
   - Solo profesionales médicos certificados (con cédula/licencia verificada) pueden crear o modificar registros
   - Autenticación robusta con OAuth2/OIDC y MFA (Multi-Factor Authentication)
   - Auditoría inmutable de todas las operaciones clínicas

3. **Interoperabilidad mediante Estándares**
   - Uso de FHIR R4 como estándar base para garantizar interoperabilidad
   - Soporte para SMART on FHIR para integraciones con sistemas externos
   - Preparado para integraciones con laboratorios, clínicas y aseguradoras

4. **IA con Gobernanza y Consentimiento**
   - Integración de modelos de IA con consentimiento explícito del paciente
   - Trazabilidad completa de todas las operaciones de IA
   - Gobernanza clínica para validar resultados de IA

5. **Transparencia y Trazabilidad**
   - Auditoría completa de todos los accesos y modificaciones
   - Registro inmutable de operaciones clínicas
   - Transparencia en el uso de datos para IA

### Objetivos a Largo Plazo

- Convertirse en una plataforma de referencia para PHR en la región
- Facilitar la continuidad de atención médica entre diferentes instituciones
- Habilitar el uso seguro y gobernado de IA en salud
- Reducir la duplicación de exámenes y procedimientos mediante acceso a historial previo
- Mejorar la calidad de atención médica mediante acceso a historial completo

---

## 🏗️ Arquitectura y Stack Tecnológico

### Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Futuro)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Web App    │  │  Mobile App  │  │  Admin Panel │  │
│  │  (Next.js)   │  │ (React Native)│  │   (Web)      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  │
└─────────┼─────────────────┼─────────────────┼──────────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│              CareCore API (NestJS)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐│
│  │   Auth   │  │   FHIR   │  │ Patients │  │   AI    ││
│  │  Module  │  │  Module  │  │  Module  │  │ Module  ││
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘│
│       │             │              │            │       │
│  ┌────▼────────────▼──────────────▼────────────▼────┐ │
│  │         Common Services & Guards                  │ │
│  │  (Encryption, Audit, Validation, Scopes)        │ │
│  └───────────────────────────────────────────────────┘ │
└────────────┬───────────────────────┬───────────────────┘
             │                       │
    ┌─────────▼─────────┐   ┌─────────▼─────────┐
    │   Keycloak       │   │   PostgreSQL       │
    │   (IdP)          │   │   - carecore_db    │
    │   Port: 8080     │   │   - keycloak_db    │
    └──────────────────┘   └────────────────────┘
```

### Stack Tecnológico Actual

#### Backend / API ✅

- **Framework:** NestJS (TypeScript)
- **Base de Datos:** PostgreSQL
- **ORM:** TypeORM
- **Estándar de Datos:** FHIR R4
- **Autenticación:** Keycloak (OAuth2/OIDC)
- **Validación:** class-validator, class-transformer
- **Documentación:** Swagger/OpenAPI

#### Infraestructura ✅

- **Containerización:** Docker & Docker Compose
- **Base de Datos:** PostgreSQL (con bases separadas: `carecore_db` y `keycloak_db`)
- **Identity Provider:** Keycloak 25.0.4
- **Almacenamiento:** Local (preparado para S3/MinIO)

#### Seguridad ✅

- **Autenticación:** OAuth2/OIDC con Keycloak
- **Autorización:** Role-Based Access Control (RBAC) + Scope-Based Access Control (SBAC)
- **MFA:** Multi-Factor Authentication (TOTP) configurado
- **Cifrado:** pgcrypto para datos sensibles en reposo
- **Auditoría:** Sistema de auditoría inmutable implementado

#### Frontend ⏳ (Pendiente)

- **Web:** Next.js (React) - SSR/SSG
- **Mobile:** React Native (Expo) o React Native + Expo bare
- **Alternativa:** Expo + EAS para web + mobile con mismo codebase

### Módulos Implementados

```
/src
  /modules
    /auth          ✅ OAuth2/OIDC, JWT, Roles, Scopes, MFA, Verificación de Practitioners
    /fhir          ✅ Endpoints FHIR, Metadata, CapabilityStatement
    /patients      ✅ CRUD completo de Patient
    /practitioners ✅ CRUD completo de Practitioner + Verificación
    /encounters    ✅ CRUD completo de Encounter
    /documents     ✅ CRUD completo de DocumentReference
    /consents      ✅ CRUD completo de Consent (compartir información)
    /audit         ✅ Sistema de auditoría inmutable
    /ai            ⏳ Preparado para integración (pendiente)
```

### Recursos FHIR Implementados

✅ **Completados:**

- `Patient` - Perfil del paciente
- `Practitioner` - Profesionales médicos
- `Encounter` - Consultas/visitas médicas
- `DocumentReference` - Documentos clínicos (reportes, imágenes)
- `Consent` - Consentimientos informados para compartir información

⏳ **Pendientes:**

- `Observation` - Signos vitales, resultados de exámenes
- `Condition` - Diagnósticos
- `Medication` - Medicamentos
- `Procedure` - Procedimientos realizados
- `Immunization` - Vacunas

### Modelo de Datos

**Estrategia de Almacenamiento:**

- Todos los recursos FHIR se almacenan como **JSONB** en PostgreSQL
- Campos comunes extraídos para indexación y búsquedas eficientes
- Soft delete implementado (campo `deletedAt`) para mantener historial

**Entidades Principales:**

```
PatientEntity
├── id (UUID, PK)
├── resourceType: "Patient"
├── fhirResource (JSONB) - Recurso FHIR completo
├── active (boolean, indexado)
├── patientId (string, indexado)
└── timestamps (createdAt, updatedAt, deletedAt)

PractitionerEntity
├── id (UUID, PK)
├── resourceType: "Practitioner"
├── fhirResource (JSONB) - Recurso FHIR completo
├── active (boolean, indexado)
├── practitionerId (string, indexado)
└── timestamps

EncounterEntity
├── id (UUID, PK)
├── resourceType: "Encounter"
├── fhirResource (JSONB) - Recurso FHIR completo
├── status (string, indexado)
├── encounterId (string, indexado)
├── subjectReference (string, indexado) - Referencia a Patient
└── timestamps

DocumentReferenceEntity
├── id (UUID, PK)
├── resourceType: "DocumentReference"
├── fhirResource (JSONB) - Recurso FHIR completo
├── status (string, indexado)
├── documentId (string, indexado)
├── subjectReference (string, indexado) - Referencia a Patient
└── timestamps

ConsentEntity
├── id (UUID, PK)
├── resourceType: "Consent"
├── fhirResource (JSONB) - Recurso FHIR completo
├── status (string, indexado)
├── consentId (string, indexado)
├── patientReference (string, indexado) - Referencia a Patient
└── timestamps

AuditLogEntity
├── id (UUID, PK)
├── userId (string, indexado)
├── action (string) - CREATE, READ, UPDATE, DELETE
├── resourceType (string, indexado)
├── resourceId (string, indexado)
├── details (JSONB) - Detalles de la operación
└── timestamp (createdAt)
```

**Relaciones:**

- Las relaciones entre recursos FHIR se manejan mediante **referencias** (strings) en lugar de foreign keys
- Ejemplo: `Encounter.subject` contiene `"Patient/123"` como referencia
- Esto permite flexibilidad y compatibilidad con estándares FHIR

---

## 🔄 Flujos Principales del Sistema

### Flujo 1: Autenticación y Autorización

```
Usuario → Keycloak (Login) → JWT Token → API (Validación) → Acceso a Recursos
```

**Pasos:**

1. Usuario inicia sesión en Keycloak (OAuth2/OIDC)
2. Keycloak valida credenciales y genera JWT token
3. Token incluye: `sub`, `roles`, `scopes`, `preferred_username`
4. API valida token con Keycloak public key
5. Guards validan roles y scopes según endpoint
6. Usuario accede a recursos autorizados

### Flujo 2: Verificación de Practitioner

```
Usuario → Solicita Verificación → Upload Documentos → Admin Revisa → Aprobación → Rol Asignado
```

**Pasos:**

1. Usuario con cuenta solicita verificación como practitioner
2. Upload de documentos (cédula/licencia médica)
3. Sistema crea registro en `PractitionerVerification`
4. Administrador revisa documentos manualmente
5. Aprobación/rechazo actualiza estado
6. Si aprobado, rol `practitioner` se asigna automáticamente en Keycloak

### Flujo 3: Creación de Registro Clínico

```
Practitioner Autenticado → POST /api/fhir/Encounter → Validación de Rol/Scope → Creación → Auditoría
```

**Pasos:**

1. Practitioner autenticado con token JWT válido
2. Request a endpoint FHIR con datos del encounter
3. `JwtAuthGuard` valida autenticación
4. `RolesGuard` valida rol `practitioner`
5. `ScopesGuard` valida scope `encounter:write`
6. Servicio crea recurso FHIR y lo almacena en BD
7. Sistema de auditoría registra la operación
8. Retorna recurso FHIR creado

### Flujo 4: Compartir Información (Consent)

```
Paciente → Crea Consent → Especifica Practitioner/Institución → Consent Activo → Acceso Autorizado
```

**Pasos:**

1. Paciente autenticado crea recurso `Consent`
2. Especifica con quién compartir (practitioner, institución)
3. Define duración y alcance del consentimiento
4. Consent se marca como `active`
5. Practitioner/institución puede acceder a datos del paciente
6. Paciente puede revocar consentimiento en cualquier momento

### Flujo 5: SMART on FHIR Launch

```
App Externa → Launch URL → Keycloak Auth → Token con Contexto → Acceso a Recursos FHIR
```

**Pasos:**

1. Aplicación externa inicia launch sequence
2. Redirige a Keycloak para autenticación
3. Usuario se autentica y autoriza aplicación
4. Keycloak genera token con contexto de paciente (`patient` claim)
5. Aplicación usa token para acceder a recursos FHIR
6. API valida token y filtra recursos por contexto de paciente

---

## 📊 Estado Actual del Proyecto

### Fases Completadas ✅

#### Fase 1: MVP - Historial Clínico Básico ✅

- CRUD completo de Patient, Practitioner, Encounter
- Estructura FHIR base implementada
- Endpoints `/api/fhir/*` funcionales
- Metadata endpoint (`/api/fhir/metadata`)

#### Fase 2: Funcionalidades Core ✅

- DocumentReference (documentos clínicos)
- Consent (consentimientos informados)
- Migración a base de datos (TypeORM)
- Sistema de auditoría inmutable
- Sistema de migraciones

#### Fase 3: Seguridad Avanzada y Verificación ✅

- OAuth2/OIDC con Keycloak
- JWT Authentication
- Role-Based Authorization
- Verificación de Practitioners (upload de documentos, revisión manual)
- MFA (Multi-Factor Authentication) configurado
- Scopes y permisos granulares (OAuth2 scopes para recursos FHIR)

#### Fase 4: SMART on FHIR ✅

- Integración SMART on FHIR
- Launch sequence implementado
- Token exchange con contexto de paciente
- Scopes SMART on FHIR configurados

### Fase Actual: Fase 5 - Testing y Documentación ⏳

**Estado:** En progreso (3/14 tareas completadas)

**Completado:**

- ✅ Tests unitarios para módulo auth (mayoría)
- ✅ Tests unitarios para guards
- ✅ Tests unitarios para strategies
- ✅ Documentación de scopes OAuth2

**Pendiente:**

- ⏳ Tests E2E completos
- ⏳ Documentación de flujos de autenticación
- ⏳ Documentación de roles y permisos
- ⏳ Guías de desarrollo

### Estadísticas del Proyecto

- **Tests:** 130+ tests pasando
- **Cobertura de código:** 95.38% (statements), 80.62% (branches)
- **Endpoints FHIR:** 15+ endpoints implementados
- **Recursos FHIR:** 5 recursos completos (Patient, Practitioner, Encounter, DocumentReference, Consent)
- **Módulos:** 7 módulos principales implementados

---

## 🔐 Seguridad y Autenticación

### Sistema de Autenticación

- **Identity Provider:** Keycloak 25.0.4
- **Protocolo:** OAuth2/OIDC
- **Tokens:** JWT (JSON Web Tokens)
- **MFA:** TOTP (Time-based One-Time Password) configurado

### Roles Disponibles

- **`patient`** - Pacientes que pueden ver y gestionar su propia información
- **`practitioner`** - Profesionales médicos verificados que pueden crear/modificar registros
- **`admin`** - Administradores del sistema
- **`viewer`** - Usuarios con acceso de solo lectura (para integraciones)

### Scopes OAuth2 Implementados

Scopes granulares para control de acceso a recursos FHIR:

- `patient:read` / `patient:write`
- `practitioner:read` / `practitioner:write`
- `encounter:read` / `encounter:write`
- `document:read` / `document:write`
- `consent:read` / `consent:write` / `consent:share`

### Verificación de Practitioners

Flujo completo de verificación:

1. Usuario solicita verificación como practitioner
2. Upload de documentos (cédula/licencia médica)
3. Revisión manual por administrador
4. Aprobación/rechazo
5. Actualización automática de roles en Keycloak

---

## 🎯 Principios de Diseño y Desarrollo

### Principios Técnicos

1. **Type Safety**
   - TypeScript estricto (sin `any` types)
   - Interfaces FHIR bien definidas
   - DTOs con validación

2. **Modularidad**
   - Arquitectura modular con NestJS
   - Separación de responsabilidades
   - Servicios reutilizables

3. **Estándares**
   - FHIR R4 como estándar base
   - SMART on FHIR para integraciones
   - OAuth2/OIDC para autenticación

4. **Seguridad por Defecto**
   - Todos los endpoints protegidos por defecto
   - Validación de roles y scopes
   - Auditoría de todas las operaciones

5. **Testing**
   - Tests unitarios para todos los servicios
   - Tests E2E para flujos críticos
   - Cobertura de código > 80%

### Convenciones de Código

- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, etc.)
- **Linting:** ESLint con reglas estrictas
- **Formatting:** Prettier
- **Pre-commit hooks:** Husky + lint-staged

---

## 📁 Estructura del Proyecto (Monorepo)

```
carecore-api/                    # Monorepo root
├── packages/
│   ├── api/                    # Backend API (NestJS)
│   │   ├── src/
│   │   │   ├── modules/        # Módulos de negocio
│   │   │   │   ├── auth/       # Autenticación y autorización
│   │   │   │   ├── fhir/       # Endpoints FHIR y metadata
│   │   │   │   ├── patients/   # Módulo de pacientes
│   │   │   │   ├── practitioners/ # Módulo de profesionales
│   │   │   │   ├── encounters/  # Módulo de consultas
│   │   │   │   ├── documents/   # Módulo de documentos
│   │   │   │   └── consents/    # Módulo de consentimientos
│   │   │   ├── entities/        # Entidades TypeORM (FHIR resources)
│   │   │   ├── common/          # Utilidades compartidas
│   │   │   │   ├── dto/         # Data Transfer Objects
│   │   │   │   ├── guards/      # Guards de autorización
│   │   │   │   ├── decorators/  # Decoradores personalizados
│   │   │   │   └── services/    # Servicios compartidos
│   │   │   ├── config/          # Configuraciones
│   │   │   └── migrations/      # Migraciones TypeORM
│   │   ├── test/                # Tests (unit, e2e, integration)
│   │   ├── keycloak/            # Configuración de Keycloak
│   │   │   ├── init/            # Scripts de inicialización
│   │   │   └── realms/          # Configuración de realms
│   │   └── scripts/             # Scripts específicos de API
│   ├── shared/                  # Código compartido
│   │   └── src/
│   │       ├── types/           # Interfaces TypeScript (FHIR, User, etc.)
│   │       └── constants/       # Constantes (FHIR scopes, resource types)
│   ├── web/                     # Frontend Web (Next.js) - ⏳ Futuro
│   └── mobile/                  # Frontend Mobile (React Native) - ⏳ Futuro
├── scripts/                     # Scripts compartidos del monorepo
├── docs/                        # Documentación
│   ├── tasks/                   # Tareas temporales (fases)
│   └── *.md                     # Documentación permanente
├── .github/workflows/           # CI/CD workflows
└── docker-compose.yml           # Configuración Docker
```

**Nota:** El proyecto utiliza NPM Workspaces para gestionar los paquetes del monorepo. Ver [MONOREPO_GUIDE.md](./MONOREPO_GUIDE.md) para más detalles.

---

## 🚀 Cómo Empezar

### Prerrequisitos

- Node.js >= 18.x
- npm o yarn
- Docker y Docker Compose
- Git

### Setup Inicial

```bash
# 1. Clonar repositorio
git clone <repository-url>
cd carecore-api

# 2. Instalar dependencias (instala para todos los packages)
npm install

# 3. Construir paquete shared (requerido antes de iniciar API)
npm run build:shared

# 4. Configurar variables de entorno
cp .env.development.example .env.development
cp .env.development.example .env.local
# Editar .env.local con tus configuraciones

# 5. Iniciar servicios (PostgreSQL, Keycloak)
make docker-up

# 5. Iniciar aplicación en modo desarrollo
make dev

# 6. Acceder a documentación
# - API: http://localhost:3000/api
# - Swagger: http://localhost:3000/api/docs
# - Keycloak Admin: http://localhost:8080
```

### Comandos Útiles

```bash
make help          # Ver todos los comandos disponibles
make setup         # Setup completo inicial
make dev           # Iniciar en modo desarrollo
make docker-up     # Iniciar contenedores Docker
make docker-down   # Detener contenedores Docker
make test          # Ejecutar tests
make lint          # Ejecutar linter
make format        # Formatear código
```

---

## 📚 Documentación Adicional

### Documentación Permanente

- [README.md](../README.md) - Documentación principal del proyecto
- [AUTH_IMPLEMENTATION_PLAN.md](AUTH_IMPLEMENTATION_PLAN.md) - Plan de autenticación
- [DATABASE_ENCRYPTION.md](DATABASE_ENCRYPTION.md) - Guía de cifrado
- [ENV_VARIABLES.md](ENV_VARIABLES.md) - Variables de entorno
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guías de contribución
- [SCOPES_SETUP_GUIDE.md](SCOPES_SETUP_GUIDE.md) - Configuración de scopes OAuth2
- [PRACTITIONER_VERIFICATION_GUIDE.md](PRACTITIONER_VERIFICATION_GUIDE.md) - Verificación de practitioners
- [MFA_SETUP_GUIDE.md](MFA_SETUP_GUIDE.md) - Configuración de MFA

### Documentación Temporal ⚠️

Archivos en `docs/tasks/` son temporales y pueden ser eliminados una vez completadas las tareas:

- `PHASE1_KEYCLOAK_SETUP.md`
- `PHASE2_NESTJS_INTEGRATION.md`
- `PHASE3_SECURITY_AND_VERIFICATION.md`
- `PHASE4_SMART_ON_FHIR.md`
- `PHASE5_TESTING_AND_DOCUMENTATION.md`

---

## 🏛️ Decisiones Arquitectónicas Clave

### ¿Por qué Keycloak?

- **Tiempo de desarrollo:** 12-18 días vs 25-44 días (ahorro significativo)
- **Costo:** $0 desarrollo, $20-50/mes producción
- **Funcionalidades completas:** OAuth2/OIDC, MFA, roles, scopes, SMART on FHIR
- **Mantenimiento:** Software probado y mantenido activamente
- **Interoperabilidad:** Estándares abiertos, fácil integración

### ¿Por qué FHIR R4?

- **Estándar internacional:** Adoptado por HL7 y ampliamente usado
- **Interoperabilidad:** Permite integración con sistemas externos
- **Estructura flexible:** JSONB permite almacenar recursos completos
- **Extensibilidad:** Fácil agregar nuevos recursos y campos
- **Ecosistema:** Herramientas y librerías disponibles

### ¿Por qué JSONB en PostgreSQL?

- **Flexibilidad:** Permite cambios en estructura FHIR sin migraciones complejas
- **Rendimiento:** PostgreSQL optimizado para JSONB con índices GIN
- **Compatibilidad:** Mantiene recursos FHIR completos sin pérdida de datos
- **Búsquedas:** Permite búsquedas dentro de JSONB con operadores nativos
- **Versionado:** Facilita mantener versiones de recursos FHIR

### ¿Por qué NestJS?

- **Arquitectura modular:** Facilita organización y escalabilidad
- **TypeScript nativo:** Type safety y mejor DX
- **Decoradores:** Guards, interceptors, pipes facilitan seguridad y validación
- **Ecosistema:** Módulos disponibles para integraciones comunes
- **Testing:** Framework robusto para tests unitarios y E2E

### ¿Por qué Separar Bases de Datos?

- **Aislamiento:** Datos de Keycloak separados de datos clínicos
- **Seguridad:** Diferentes permisos y backups independientes
- **Escalabilidad:** Posibilidad de escalar independientemente
- **Mantenimiento:** Actualizaciones de Keycloak no afectan datos clínicos
- **Cumplimiento:** Facilita auditorías y cumplimiento normativo

---

## 🔮 Roadmap Futuro

### Próximas Fases

**Fase 6: Integraciones con IA** ⏳

- Búsqueda semántica en historiales clínicos
- Extracción de información con NLP
- Resumen clínico automático
- Alertas clínicas inteligentes
- Pipeline MLOps clínico

**Fase 7: Integraciones Externas** ⏳

- Integración con laboratorios (SMART on FHIR)
- Integración con aseguradoras
- Integración con clínicas y hospitales
- CDS Hooks para decisiones clínicas

**Fase 8: Frontend** ⏳

- Aplicación web (Next.js)
- Aplicación móvil (React Native)
- Panel de administración

---

## 📚 Recursos Externos y Referencias

### Estándares y Especificaciones

- **FHIR R4:** [https://www.hl7.org/fhir/](https://www.hl7.org/fhir/)
  - Especificación completa de recursos FHIR
  - Guías de implementación
  - Ejemplos y casos de uso

- **SMART on FHIR:** [http://hl7.org/fhir/smart-app-launch/](http://hl7.org/fhir/smart-app-launch/)
  - Guía de integración SMART on FHIR
  - Launch sequence
  - Scopes y permisos

- **OAuth2/OIDC:** [https://oauth.net/2/](https://oauth.net/2/)
  - Especificación OAuth 2.0
  - OpenID Connect
  - Mejores prácticas de seguridad

### Herramientas y Librerías

- **Keycloak:** [https://www.keycloak.org/](https://www.keycloak.org/)
  - Documentación oficial
  - Guías de administración
  - API REST

- **NestJS:** [https://docs.nestjs.com/](https://docs.nestjs.com/)
  - Documentación oficial
  - Guías de desarrollo
  - Ejemplos y tutoriales

- **TypeORM:** [https://typeorm.io/](https://typeorm.io/)
  - Documentación de entidades
  - Migraciones
  - Relaciones y queries

### Recursos de Salud Digital

- **HL7 International:** [https://www.hl7.org/](https://www.hl7.org/)
  - Organización que mantiene estándares FHIR
  - Eventos y conferencias
  - Comunidad y recursos

- **SMART Health IT:** [https://smarthealthit.org/](https://smarthealthit.org/)
  - Recursos SMART on FHIR
  - Sandbox para testing
  - Guías de implementación

### Compliance y Regulaciones

- **HIPAA:** Health Insurance Portability and Accountability Act
  - Regulaciones de privacidad en salud (EE.UU.)
  - Consideraciones para ePHI (electronic Protected Health Information)

- **GDPR:** General Data Protection Regulation
  - Regulaciones de protección de datos (Europa)
  - Consideraciones para datos personales de salud

---

## 💬 Contacto y Contribución

### Contribuir al Proyecto

1. Crear una rama desde `main`
2. Realizar cambios
3. Asegurar que los tests pasen y el código esté formateado
4. Crear un Pull Request

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para más detalles.

### Convenciones

- **Commits:** Conventional Commits
- **Branches:** `feature/`, `fix/`, `docs/`, etc.
- **Code Style:** ESLint + Prettier
- **Testing:** Tests unitarios y E2E requeridos

---

## 📝 Notas para Agentes de IA

### Contexto Importante

1. **Este es un proyecto de salud (HIPAA/ePHI)**
   - Siempre considerar seguridad y privacidad
   - Validar autenticación y autorización en todos los endpoints
   - Auditoría es crítica para cumplimiento

2. **Estándares FHIR son obligatorios**
   - Todos los recursos deben cumplir con FHIR R4
   - Usar interfaces y tipos FHIR definidos
   - Validar estructura FHIR en todos los endpoints

3. **TypeScript estricto**
   - No usar `any` types
   - Usar interfaces y tipos bien definidos
   - Validar tipos en tiempo de compilación

4. **Testing es crítico**
   - Mantener cobertura > 80%
   - Tests unitarios para servicios
   - Tests E2E para flujos críticos

5. **Seguridad por defecto**
   - Todos los endpoints protegidos (excepto `@Public()`)
   - Validar roles y scopes
   - Usar guards apropiados (`JwtAuthGuard`, `RolesGuard`, `ScopesGuard`)

### Archivos Clave para Entender el Proyecto

- `README.md` - Visión general y quick start
- `src/modules/auth/` - Sistema de autenticación completo
- `src/modules/fhir/fhir.controller.ts` - Ejemplo de endpoints FHIR protegidos
- `src/common/constants/fhir-scopes.ts` - Scopes OAuth2 definidos
- `keycloak/README.md` - Configuración de Keycloak
- `docs/AUTH_IMPLEMENTATION_PLAN.md` - Arquitectura de autenticación

---

**Última actualización:** 2025-01-27
**Versión:** 1.1
**Mantenido por:** Equipo CareCore
