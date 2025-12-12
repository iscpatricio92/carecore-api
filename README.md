# 📘 CareCore API

CareCore is a digital medical records platform where the patient owns their information, and only verified medical professionals can add or modify clinical records.

This repository contains the backend API, built with NestJS, FHIR, and an architecture ready for clinical and AI integrations.

---

## 📋 Tabla de Contenidos

- [Quick Start](#-quick-start)
- [Visión y Arquitectura](#-visión-y-arquitectura)
- [Estado Actual y Progreso](#-estado-actual-y-progreso)
- [Roadmap de Implementación](#-roadmap-de-implementación)
- [Stack Tecnológico](#-stack-tecnológico)
- [Configuración](#-configuración)
- [Documentación Técnica](#-documentación-técnica)
- [Contribución](#-contribución)

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- npm or yarn
- Docker and Docker Compose
- Git

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd carecore-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   make install
   ```

3. **Configure environment variables**
   ```bash
   # Copy development example file
   cp .env.development.example .env.development

   # Create local file (overrides development values)
   cp .env.development.example .env.local

   # Edit .env.development and .env.local with your configurations
   ```

   ⚠️ **Note:**
   - Docker Compose and NestJS use the same environment file system
     - Both read first `.env.${NODE_ENV}` (or `.env.development` by default)
     - Both read then `.env.local` if it exists (which overrides values)
   - The Makefile automatically combines both files for Docker Compose

   For detailed configuration, see [ENV_VARIABLES.md](ENV_VARIABLES.md)

4. **Start PostgreSQL with Docker**
   ```bash
   docker-compose up -d
   # or
   make docker-up
   ```

5. **Start the application in development mode**
   ```bash
   npm run start:dev
   # or
   make dev
   ```

6. **Access documentation**
   - API: http://localhost:3000/api
   - Swagger: http://localhost:3000/api/docs
   - PgAdmin: http://localhost:5050

### Useful Commands

View all available commands:
```bash
make help
```

Main commands:
- `make setup` - Complete initial setup
- `make dev` - Start in development mode
- `make docker-up` - Start Docker containers
- `make docker-down` - Stop Docker containers
- `make lint` - Run linter
- `make format` - Format code
- `make test` - Run tests

### Troubleshooting

**Port 5432 already in use:**
```bash
lsof -i :5432
docker stop <container-id>
```

**Cannot connect to database:**
1. Verify container is running: `docker ps`
2. Check logs: `docker-compose logs postgres`
3. Verify environment variables in `.env.local`

**Modules not found:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

## 🎯 Visión y Arquitectura

### Visión del Producto

Creamos una plataforma móvil y web que centraliza el perfil médico del paciente (basado en estándares FHIR). El paciente es el dueño de su información y controla con quién la comparte; solamente profesionales médicos certificados pueden crear o editar registros clínicos. A futuro conectaremos laboratorios, consultorios y aseguradoras mediante APIs estándar (SMART on FHIR). La plataforma incorpora modelos de IA para extracción de información, búsquedas semánticas y soporte de segunda opinión, siempre con consentimiento explícito, trazabilidad y gobernanza clínica.

### Principios Clave

- **Propiedad del paciente**: El paciente es el propietario de su información
- **Certificación requerida**: Solo especialistas certificados (con cédula) pueden agregar/modificar registros clínicos
- **Consentimiento granular**: El historial puede compartirse (con consentimiento) para segundas opiniones, laboratorios, aseguradoras, etc.
- **Interoperabilidad**: Fase 2 incluye interoperabilidad con laboratorios, consultorios, aseguradoras
- **IA con gobernanza**: Integrar modelos de IA (apoyo clínico, extracción de información, búsqueda semántica) con gobernanza y seguridad

### Objetivos de la API

- ✅ Servir como orquestador central de datos clínicos
- ✅ Exponer recursos compatibles con FHIR (Patient, Practitioner, Encounter, DocumentReference, Consent)
- ⏳ Implementar seguridad avanzada, roles, acceso basado en consentimiento (FHIR Consent) y auditoría inmutable
- ⏳ Preparar endpoints y pipelines para módulos de IA (resumen clínico, extracción semántica, normalización de términos)
- ⏳ Ser la base para futuras integraciones con:
  - Laboratorios
  - Clínicas
  - Especialistas
  - Aseguradoras
  - Sistemas clínicos externos (SMART on FHIR)

### Arquitectura Backend

```
/src
  /modules
    /auth          ✅ Implementado (estructura base, autenticación en progreso)
    /fhir          ✅ Implementado (FHIR endpoints y metadata)
    /patients      ✅ Implementado (CRUD completo)
    /practitioners ✅ Implementado (CRUD completo)
    /encounters    ✅ Implementado (CRUD completo)
    /documents     ✅ Implementado (CRUD completo)
    /consents      ✅ Implementado (CRUD completo)
    /audit         ⏳ (to be implemented)
    /ai            ⏳ (to be implemented)
  /entities        ✅ Implementado (TypeORM entities para FHIR resources)
    /patient.entity.ts
    /practitioner.entity.ts
    /encounter.entity.ts
    /consent.entity.ts
    /document-reference.entity.ts
  /common
    /dto           ✅ Implementado (DTOs para todos los recursos FHIR)
    /interfaces    ✅ Implementado (TypeScript interfaces FHIR)
    /filters       ✅ Implementado
    /interceptors  ✅ Implementado
    /middleware    ✅ Implementado
    /services      ✅ Implementado (FhirService, EncryptionService, etc.)
  /config          ✅ Implementado
  /migrations      ✅ Implementado (TypeORM migrations)
```

**Stack Base:**
- NestJS + TypeScript
- PostgreSQL (prod) / SQLite (dev optional)
- FHIR JSON as base format
- MinIO / S3 for clinical files (DocumentReference) - ⏳ Pendiente
- OIDC (Keycloak/Auth0) for identity and roles - ⏳ Pendiente
- Mandatory audit logging in every clinical operation - ⏳ Pendiente
- Sensitive data encryption + future KMS integration - ⏳ Pendiente
- AI ready to connect as microservice or internal module - ⏳ Pendiente

---

## 📊 Estado Actual y Progreso

### ✅ Implementación Completada (MVP)

#### Recursos FHIR MVP (100% Completado)

**Patient** ✅
- [x] CRUD completo (Create, Read, Update, Delete)
- [x] Búsqueda por nombre
- [x] Búsqueda por identificador
- [x] Paginación
- [x] Versionado (meta.versionId)
- [x] Tests unitarios completos

**Endpoints:**
- `POST /api/fhir/Patient` - Crear paciente
- `GET /api/fhir/Patient/:id` - Obtener paciente por ID
- `GET /api/fhir/Patient` - Buscar pacientes
- `PUT /api/fhir/Patient/:id` - Actualizar paciente
- `DELETE /api/fhir/Patient/:id` - Eliminar paciente

**Practitioner** ✅
- [x] CRUD completo (Create, Read, Update, Delete)
- [x] Búsqueda por nombre
- [x] Búsqueda por identificador (licencia)
- [x] Paginación
- [x] Qualifications (títulos profesionales)
- [x] Tests unitarios completos

**Endpoints:**
- `POST /api/fhir/Practitioner` - Crear practicante
- `GET /api/fhir/Practitioner/:id` - Obtener practicante por ID
- `GET /api/fhir/Practitioner` - Buscar practicantes
- `PUT /api/fhir/Practitioner/:id` - Actualizar practicante
- `DELETE /api/fhir/Practitioner/:id` - Eliminar practicante

**Encounter** ✅
- [x] CRUD completo (Create, Read, Update, Delete)
- [x] Búsqueda por subject (Patient)
- [x] Búsqueda por status
- [x] Búsqueda por fecha
- [x] Paginación
- [x] Referencias a Patient y Practitioner
- [x] Tests unitarios completos

**Endpoints:**
- `POST /api/fhir/Encounter` - Crear encuentro
- `GET /api/fhir/Encounter/:id` - Obtener encuentro por ID
- `GET /api/fhir/Encounter` - Buscar encuentros
- `PUT /api/fhir/Encounter/:id` - Actualizar encuentro
- `DELETE /api/fhir/Encounter/:id` - Eliminar encuentro

#### Estructura FHIR Base ✅

- [x] Interfaces FHIR R4 definidas
- [x] CapabilityStatement endpoint (`/api/fhir/metadata`)
- [x] Error handling FHIR (OperationOutcome)
- [x] Metadata endpoint funcional
- [x] Search parameters documentados

#### Tests y Calidad ✅

- [x] 130 tests pasando
- [x] 95.38% cobertura de código
- [x] Tests unitarios para todos los servicios
- [x] Tests para todos los controladores
- [x] Patrón consistente en todos los tests

**Cobertura de Tests:**
- **Statements:** 95.38%
- **Branches:** 80.62%
- **Functions:** 92.13%
- **Lines:** 95.56%

#### Documentación ✅

- [x] Swagger/OpenAPI integrado
- [x] Endpoints documentados automáticamente
- [x] Ejemplos en Swagger

### 📈 Estadísticas Actuales

**Recursos FHIR Implementados:**
- ✅ Patient
- ✅ Practitioner
- ✅ Encounter
- ✅ OperationOutcome (error handling)

**Endpoints Disponibles:**
- ✅ 15 endpoints FHIR (5 por recurso × 3 recursos)
- ✅ 1 endpoint de metadata
- ✅ Health check endpoints

**Estado del MVP:**
✅ **MVP de Historial Clínico Básico COMPLETADO**

El sistema ahora puede:
- ✅ Gestionar perfiles de pacientes
- ✅ Gestionar profesionales médicos
- ✅ Registrar consultas/visitas médicas
- ✅ Buscar y filtrar información
- ✅ Mantener versionado de recursos
- ✅ Manejar errores de forma estándar FHIR

**Listo para:**
- ✅ Desarrollo de frontend
- ✅ Integración con otros sistemas
- ✅ Expansión con nuevos recursos FHIR

---

## 🗺️ Roadmap de Implementación

### Fase 1: MVP - Historial Clínico Básico ✅ COMPLETADO

**Recursos FHIR Esenciales:**
- ✅ Patient (Completo)
- ✅ Practitioner (Completo)
- ✅ Encounter (Completo)

**Estructura Base:**
- ✅ Interfaces FHIR R4
- ✅ CapabilityStatement endpoint
- ✅ Error handling (OperationOutcome)
- ✅ Endpoints `/api/fhir/*`
- ✅ Metadata endpoint

### Fase 2: Funcionalidades Core (Post-MVP) ✅ COMPLETADO

**Recursos FHIR Adicionales:**

**DocumentReference** (Documentos) ✅
- Prioridad: MEDIA
- Uso: Reportes, imágenes, documentos clínicos
- Estado: ✅ Completado (almacenamiento local, preparado para S3/MinIO)

**Consent** (Consentimientos) ✅
- Prioridad: MEDIA
- Uso: Consentimientos informados, autorizaciones
- Estado: ✅ Completado (share with practitioner, validación de expiración)

**Mejoras Técnicas:**
- ✅ Migración a base de datos (TypeORM entities) - Completado
- ✅ Audit Logging completo (inmutable) - Completado
- ✅ Constantes para FHIR Resource Types - Completado
- ✅ Sistema de migraciones con timestamps automáticos - Completado
- [ ] Validación FHIR más estricta
- [ ] Profiles FHIR específicos
- [ ] Mejora en búsquedas (full-text search)

**Recursos Pendientes para Fase 2:**
- ⏳ Observation (Signos vitales, resultados) - Pendiente
- ⏳ Condition (Diagnósticos) - Pendiente

### Fase 3: Seguridad Avanzada y Verificación ✅ COMPLETADO

**Autenticación y Autorización Avanzada:**
- ✅ OAuth 2.0 / OIDC - Completado (Keycloak integrado)
- ✅ JWT Authentication - Completado
- ✅ Role-based Authorization - Completado
- ✅ Verificación de Practitioners - Completado
- ✅ MFA (Multi-Factor Authentication) - Completado
- ✅ Scopes y permisos granulares - Completado

**Verificación de Practitioners:** ✅ COMPLETADO
- ✅ Endpoint POST /auth/verify-practitioner
- ✅ Entidad PractitionerVerification
- ✅ Upload de documentos (cédula/licencia)
- ✅ Flujo de revisión manual (admin)
- ✅ Actualización automática de roles en Keycloak

**MFA (Multi-Factor Authentication):** ✅ COMPLETADO
- ✅ Configuración MFA en Keycloak (TOTP)
- ✅ Endpoints de setup/verify/disable MFA
- ✅ Forzar MFA para roles críticos (admin, practitioner)

**Scopes y Permisos:** ✅ COMPLETADO
- ✅ Definir scopes en Keycloak (scripts y guía creados - ver `docs/SCOPES_SETUP_GUIDE.md`)
- ✅ ScopesGuard para validación
- ✅ Decorador @Scopes() para endpoints
- ✅ Mapeo de scopes a permisos FHIR
- ✅ Constantes para acciones y scopes (type safety)

**Recursos para Integraciones Futuras:**
- ⏳ Observation - Signos vitales, resultados
- ⏳ Condition - Diagnósticos
- ⏳ Medication - Integración con farmacias, recetas electrónicas
- ⏳ Procedure - Procedimientos realizados, integración con quirófanos
- ⏳ Immunization - Registro de vacunas, integración con programas de vacunación

### Matriz de Prioridades

| Recurso FHIR | MVP | Post-MVP | Integraciones | Prioridad |
|--------------|-----|----------|---------------|-----------|
| Patient | ✅ | ✅ | ✅ | CRÍTICA |
| Practitioner | ✅ | ✅ | ✅ | CRÍTICA |
| Encounter | ✅ | ✅ | ✅ | CRÍTICA |
| Observation | ❌ | ⏳ | ✅ | ALTA |
| Condition | ❌ | ⏳ | ✅ | ALTA |
| DocumentReference | ❌ | ⏳ | ✅ | MEDIA |
| Consent | ❌ | ⏳ | ✅ | MEDIA |
| Medication | ❌ | ❌ | ⏳ | BAJA |
| Procedure | ❌ | ❌ | ⏳ | BAJA |
| Immunization | ❌ | ❌ | ⏳ | BAJA |

### Checklist de Implementación

#### MVP (Fase 1) ✅

**Autenticación y Autorización:**
- [ ] Registro/login de pacientes
- [ ] Registro/login de practitioners
- [ ] Verificación básica de practitioner (documentos)
- [ ] API protegida con OAuth2/OIDC
- [ ] Sistema de roles (patient, practitioner, viewer, admin)

**Recursos FHIR MVP:**
- [x] Crear perfil Patient
- [x] Registrar Encounter (sólo practitioners)
- [x] Registrar Practitioner
- [x] Registrar DocumentReference (sólo practitioners)
- [x] Consentimiento básico (share with practitioner X for Y days)

**Auditoría:**
- [x] Logging básico
- [x] Audit logging completo (inmutable)
- [x] Registro de todos los accesos/modificaciones

**Frontend:**
- [ ] UI móvil para ver perfil y consentimientos
- [ ] UI web para ver perfil y consentimientos
- [ ] UI para gestión de consentimientos

#### Fase 2 (Post-MVP) ⏳

**Integraciones:**
- [x] Integración FHIR con laboratorios (SMART on FHIR) ✅
- [ ] Integración con aseguradoras
- [ ] CDS Hooks para decisiones clínicas

**IA:**
- [ ] Búsqueda semántica
- [ ] Extracción con IA (NLP)
- [ ] Resumen clínico automático
- [ ] Alertas clínicas

**Gobernanza de IA:**
- [ ] Pipeline MLOps clínico
- [ ] Validación clínica de modelos
- [ ] Monitorización de desempeño
- [ ] Explicabilidad (XAI)

---

## 🛠️ Stack Tecnológico

### Frontend ⏳

- [ ] **Web**: Next.js (React) — SSR/SSG para landing/public pages; app pages para pacientes
- [ ] **Mobile**: React Native (Expo) o React Native + Expo bare for native modules (biometría)
- [ ] **Alternativa**: Expo + EAS para web + mobile con mismo codebase

### Backend / API ✅

- ✅ **NestJS (TypeScript)** — Estructura modular, validaciones
- ✅ **PostgreSQL** — Base de datos relacional
- ✅ **TypeORM** — ORM para TypeScript
- ✅ **FHIR R4** — Estructura base implementada
- [ ] **HAPI FHIR** o librería FHIR layer (opcional, para validación avanzada)
- [ ] **GraphQL** (opcional, además de REST)

### Base de Datos y Almacenamiento

- ✅ **PostgreSQL** — Esquema para metadata
- [ ] **S3/MinIO** — Almacenamiento de documentos (DocumentReference)
- [ ] **Encrypted fields** — pgcrypto, client-side encryption para ePHI crítico

### Autenticación y Autorización ⏳[HU: ARCH_001](https://github.com/users/iscpatricio92/projects/2/views/1?pane=issue&itemId=141432066&issue=iscpatricio92%7Ccarecore-api%7C13#:~:text=ARCH%2D001%20Decisi%C3%B3n%20e%20Integraci%C3%B3n%20del%20Identity%20Provider%20(IdP)%20%5BKeycloak/Auth0/Propio%5D%20%2313) [HU: API_002](https://github.com/users/iscpatricio92/projects/2/views/1?pane=issue&itemId=141430055&issue=iscpatricio92%7Ccarecore-api%7C2#:~:text=Autenticaci%C3%B3n%20(OAuth2/OIDC)-,%232,-Edit)

**📋 Plan detallado:** Ver [docs/AUTH_IMPLEMENTATION_PLAN.md](docs/AUTH_IMPLEMENTATION_PLAN.md)
**📝 Tareas GitHub Projects Fase 1:** Ver [docs/tasks/PHASE1_KEYCLOAK_SETUP.md](docs/tasks/PHASE1_KEYCLOAK_SETUP.md) ⚠️ *Temporal*

- [x] **Identity Provider** - Keycloak ✅
  - [x] Setup Keycloak en Docker ✅
  - [x] Configuración de Realm y Clientes ✅
  - [x] Integración con NestJS ✅
  - [x] OAuth2/OIDC implementado ✅
  - [x] MFA configurado ✅
  - [x] Verificación de identidad para practitioners (verificación de cédula) ✅
  - [x] SMART on FHIR integrado ✅

**🔐 Keycloak Setup:**

Keycloak está configurado y funcionando. Para más información, ver:
- [keycloak/README.md](keycloak/README.md) - Documentación principal de Keycloak
- [keycloak/TROUBLESHOOTING.md](keycloak/TROUBLESHOOTING.md) - Guía de troubleshooting
- [keycloak/BACKUP_RESTORE.md](keycloak/BACKUP_RESTORE.md) - Guía de backup y restore

**Acceso rápido:**
- Admin Console: `http://localhost:${KEYCLOAK_HTTP_PORT}` (ver `.env.local` para puerto)
- Usuario: Valor de `KEYCLOAK_ADMIN` en `.env.local`
- Contraseña: Valor de `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`

### Observabilidad

- ✅ **Logging** — Pino implementado
- [ ] **ELK/OpenSearch** — Para búsqueda y análisis de logs
- [ ] **SIEM** — Security Information and Event Management
- [ ] **Métricas** — Prometheus/Grafana (opcional)

### Infraestructura

- ✅ **Docker** — Docker Compose para desarrollo
- [ ] **Kubernetes** — Para producción
- [ ] **Infra-as-code** — Terraform
- [ ] **KMS** — AWS KMS/GCP KMS
- [ ] **HSM** — Opcional

### Integraciones Futuras

- [ ] **FHIR endpoints** — Para integraciones externas
- [ ] **HL7v2 adapters** — Si laboratorios lo requieren
- [ ] **CDS Hooks** — Para decisiones clínicas

### Desarrollo

- ✅ **NestJS** - Progressive Node.js framework
- ✅ **TypeScript** - Static typing
- ✅ **PostgreSQL** - Relational database
- ✅ **TypeORM** - ORM for TypeScript
- ✅ **Swagger/OpenAPI** - API documentation

### Code Quality

- ✅ **ESLint** - Linter for JavaScript/TypeScript
- ✅ **Prettier** - Code formatter
- ✅ **Husky** - Git hooks
- ✅ **lint-staged** - Linting on staged files

### FHIR

- ✅ **fhir-kit-client** - FHIR client
- ✅ **fhir-r4** - FHIR R4 types and resources

### Security

- ✅ **Helmet** - HTTP security headers
- ✅ **express-rate-limit** - Rate limiting
- ✅ **bcryptjs** - Password hashing
- ✅ **JWT** - Token-based authentication (Passport + JWT)
  - `@nestjs/passport` (v10.0.3) - Passport integration for NestJS
  - `@nestjs/jwt` (v10.2.0) - JWT module for NestJS
  - `passport` (v0.7.0) - Authentication middleware
  - `passport-jwt` (v4.0.1) - JWT strategy for Passport
  - `@types/passport-jwt` (v4.0.1) - TypeScript types

---

## ⚙️ Configuración

### Environment Variables

The project uses environment files per environment:
- **`.env.development`** - Variables for development
- **`.env.production`** - Variables for production
- **`.env.local`** - Local variables (overrides the above)

To get started:
```bash
cp .env.development.example .env.development
cp .env.development.example .env.local
```

**Main variables:**
- `PORT` - Application port (default: 3000)
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `JWT_SECRET` - Secret for JWT (change in production)
- `NODE_ENV` - Environment (development/production)

For detailed configuration, see [ENV_VARIABLES.md](ENV_VARIABLES.md)

### Available Scripts

```bash
npm run start:dev      # Development with hot-reload
npm run build          # Build for production
npm run start:prod     # Run compiled version
npm run lint           # Run linter
npm run format         # Format code
npm run test           # Run tests
npm run test:cov       # Tests with coverage
npm run migration:run  # Run migrations
```

### Project Structure

```
carecore-api/
├── src/
│   ├── main.ts                 # Entry point
│   ├── app.module.ts           # Main module
│   ├── config/                 # Configurations
│   │   ├── database.config.ts  # TypeORM database configuration
│   │   ├── data-source.ts      # TypeORM CLI data source
│   │   └── fhir.config.ts      # FHIR configuration
│   ├── entities/               # TypeORM entities (FHIR resources)
│   │   ├── patient.entity.ts
│   │   ├── practitioner.entity.ts
│   │   ├── encounter.entity.ts
│   │   ├── consent.entity.ts
│   │   └── document-reference.entity.ts
│   ├── migrations/             # TypeORM migrations
│   │   ├── EnablePgcrypto*.ts
│   │   └── CreateFhirEntities*.ts
│   ├── common/                 # Shared utilities
│   │   ├── dto/                # Data Transfer Objects
│   │   │   ├── fhir-patient.dto.ts
│   │   │   ├── fhir-practitioner.dto.ts
│   │   │   ├── fhir-encounter.dto.ts
│   │   │   ├── fhir-consent.dto.ts
│   │   │   └── fhir-document-reference.dto.ts
│   │   ├── interfaces/         # TypeScript interfaces
│   │   │   └── fhir.interface.ts
│   │   ├── filters/           # Exception filters
│   │   ├── interceptors/      # Request/Response interceptors
│   │   ├── middleware/        # Custom middleware
│   │   └── services/          # Shared services
│   │       ├── encryption.service.ts
│   │       └── fhir-error.service.ts
│   └── modules/                # Business modules
│       ├── fhir/               # FHIR endpoints and metadata
│       ├── patients/           # Patient module (CRUD)
│       ├── practitioners/      # Practitioner module (CRUD)
│       ├── encounters/         # Encounter module (CRUD)
│       ├── documents/          # DocumentReference module (CRUD)
│       ├── consents/           # Consent module (CRUD)
│       ├── audit/              # (to be implemented)
│       └── ai/                 # (to be implemented)
├── keycloak/                   # Keycloak configuration
│   ├── init/                   # Initialization scripts
│   └── realms/                 # Realm exports
├── docs/                       # Documentation
│   ├── tasks/                  # Task documentation (temporary)
│   └── *.md                    # Permanent documentation
├── scripts/                    # Utility scripts
│   ├── verify-encryption.ts
│   └── create-github-tasks-*.js
├── docker-compose.yml          # Docker configuration
├── .eslintrc.js               # ESLint configuration
├── .prettierrc                # Prettier configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies
```

**Estructura de Datos:**
- **Entidades TypeORM**: Almacenan recursos FHIR completos en JSONB (PostgreSQL)
- **Campos indexados**: Campos comunes extraídos para búsquedas eficientes (status, active, references)
- **Soft Delete**: Todos los recursos usan `deletedAt` para mantener historial
- **Migraciones**: TypeORM migrations para versionado de esquema
```

---

## 🔒 Implemented Best Practices

✅ **Linting and Formatting**
- ESLint configured with strict rules
- Prettier for consistent formatting
- Pre-commit hooks with Husky and lint-staged

✅ **Security**
- Helmet for security headers
- Rate limiting configured
- Data validation with class-validator
- Environment variables for sensitive configuration

✅ **Database**
- Docker Compose for local development
- TypeORM with migrations
- Environment-specific configuration

✅ **Documentation**
- Swagger/OpenAPI integrated
- Endpoints automatically documented

✅ **TypeScript**
- Strict configuration
- Path aliases configured
- Explicit types (no `any`)

---

## 📚 FHIR Resources

The API supports the following FHIR R4 resources:

**Implementados:**
- ✅ Patient (CRUD completo, persistencia en BD)
- ✅ Practitioner (CRUD completo, persistencia en BD)
- ✅ Encounter (CRUD completo, persistencia en BD)
- ✅ DocumentReference (CRUD completo, persistencia en BD)
- ✅ Consent (CRUD completo, persistencia en BD)

**Pendientes:**
- ⏳ Observation
- ⏳ Condition
- ⏳ Medication
- ⏳ Procedure

Access FHIR metadata at: `/api/fhir/metadata`

---

## 📖 Documentación

### Documentación Permanente

- [docs/PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) - **📘 Contexto completo del proyecto** - Documento para compartir con agentes de IA y nuevos desarrolladores
- [docs/AUTH_IMPLEMENTATION_PLAN.md](docs/AUTH_IMPLEMENTATION_PLAN.md) - Plan completo de autenticación y autorización
- [docs/DATABASE_ENCRYPTION.md](docs/DATABASE_ENCRYPTION.md) - Guía completa de cifrado de datos en reposo
- [ENV_VARIABLES.md](ENV_VARIABLES.md) - Configuración detallada de variables de entorno
- [CONTRIBUTING.md](CONTRIBUTING.md) - Guías de contribución y convenciones

### Documentación Temporal ⚠️

> Archivos en `docs/tasks/` son temporales y pueden ser eliminados una vez completadas las tareas.

- [docs/tasks/PHASE1_KEYCLOAK_SETUP.md](docs/tasks/PHASE1_KEYCLOAK_SETUP.md) - Tareas detalladas para Fase 1 (Setup Keycloak) ⚠️ *Temporal*
- [docs/tasks/PHASE2_NESTJS_INTEGRATION.md](docs/tasks/PHASE2_NESTJS_INTEGRATION.md) - Tareas detalladas para Fase 2 (Integración NestJS) ⚠️ *Temporal*
- [docs/tasks/PHASE3_SECURITY_AND_VERIFICATION.md](docs/tasks/PHASE3_SECURITY_AND_VERIFICATION.md) - Tareas detalladas para Fase 3 (Seguridad Avanzada) ⚠️ *Temporal*
- [docs/tasks/README.md](docs/tasks/README.md) - Información sobre archivos temporales

---

## 🤝 Contribución

1. Create a branch from `main`
2. Make your changes
3. Ensure tests pass and code is formatted
4. Create a Pull Request

### Conventions

The project follows [Conventional Commits](https://www.conventionalcommits.org/) and has automatic hooks:

- **Pre-commit**: Automatically formats code and fixes ESLint
- **Commit-msg**: Validates that commit messages follow the conventional format

**Commit format:**
```
<type>(<scope>): <description>
```

**Examples:**
- `feat(patients): add search endpoint`
- `fix(auth): fix token validation`
- `docs: update configuration guide`

For more details, see [CONTRIBUTING.md](CONTRIBUTING.md)

---

## 📄 License

See [LICENSE](LICENSE) file

---

**Última actualización**: 2025-01-27
