📘 CareCore API — README

CareCore es una plataforma de historial médico digital donde el paciente es el dueño de su información, y solo profesionales médicos verificados pueden agregar o modificar registros clínicos.

Este repositorio contiene la API backend, construida con NestJS, FHIR, y una arquitectura preparada para integraciones clínicas e IA.

⸻

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js >= 18.x
- npm o yarn
- Docker y Docker Compose
- Git

### Configuración Inicial

1. **Clonar el repositorio** (si aún no lo tienes)
   ```bash
   git clone <repository-url>
   cd carecore-api
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   # o
   make install
   ```

3. **Configurar variables de entorno**
   ```bash
   # Copiar archivo de ejemplo de desarrollo
   cp .env.development.example .env.development

   # Crear archivo local (sobrescribe valores de desarrollo para NestJS)
   cp .env.development.example .env.local

   # Editar .env.development y .env.local con tus configuraciones personales
   ```

   ⚠️ **Nota:**
   - Docker Compose y NestJS usan el mismo sistema de archivos de entorno:
     - Ambos leen primero `.env.${NODE_ENV}` (o `.env.development` por defecto)
     - Ambos leen luego `.env.local` si existe (que sobrescribe valores)
   - El Makefile combina automáticamente ambos archivos para Docker Compose
   - Esto mantiene total consistencia entre ambos sistemas

   Para más detalles, consulta [ENV_VARIABLES.md](ENV_VARIABLES.md)

4. **Iniciar PostgreSQL con Docker**
   ```bash
   docker-compose up -d
   # o
   make docker-up
   ```

5. **Iniciar la aplicación en modo desarrollo**
   ```bash
   npm run start:dev
   # o
   make dev
   ```

6. **Acceder a la documentación**
   - API: http://localhost:3000/api
   - Swagger: http://localhost:3000/api/docs
   - PgAdmin: http://localhost:5050

### Comandos Útiles

Ver todos los comandos disponibles:
```bash
make help
```

Comandos principales:
- `make setup` - Configuración inicial completa
- `make dev` - Iniciar en modo desarrollo
- `make docker-up` - Iniciar contenedores Docker
- `make docker-down` - Detener contenedores Docker
- `make lint` - Ejecutar linter
- `make format` - Formatear código
- `make test` - Ejecutar tests

⸻

🚀 Objetivo del API
	•	Servir como orquestador central de datos clínicos.
	•	Exponer recursos compatibles con FHIR (Patient, Practitioner, Encounter, DocumentReference, Consent).
	•	Implementar seguridad avanzada, roles, accesos basados en consentimiento (FHIR Consent), y auditoría inmutable.
	•	Preparar endpoints y pipelines para módulos de IA (resumen clínico, extracción semántica, normalización de términos).
	•	Ser la base para futuras integraciones con:
	•	Laboratorios
	•	Consultorios
	•	Especialistas
	•	Aseguradoras
  •	Sistemas clínicos externos (SMART on FHIR)

  📂 Arquitectura del backend
  ```/src
  /modules
    /auth
    /patients
    /practitioners
    /encounters
    /documents
    /consents
    /audit
    /ai          <- módulo IA (placeholder inicial)
  /common
    /guards
    /filters
    /interceptors
    /dto
  /config
/tests
/docker
```

  •	NestJS + TypeScript
	•	PostgreSQL (prod) / SQLite (dev opcional)
	•	FHIR JSON como formato base
	•	MinIO / S3 para archivos clínicos (DocumentReference)
	•	OIDC (Keycloak/Auth0) para identidad y roles
	•	Audit logging obligatorio en cada operación clínica
	•	Cifrado de datos sensibles + integración futura con KMS
	•	IA lista para conectarse como microservicio o módulo interno

⸻

## 🛠️ Tecnologías y Herramientas

### Desarrollo
- **NestJS** - Framework Node.js progresivo
- **TypeScript** - Tipado estático
- **PostgreSQL** - Base de datos relacional
- **TypeORM** - ORM para TypeScript
- **Swagger/OpenAPI** - Documentación de API

### Calidad de Código
- **ESLint** - Linter para JavaScript/TypeScript
- **Prettier** - Formateador de código
- **Husky** - Git hooks
- **lint-staged** - Linting en archivos staged

### FHIR
- **fhir-kit-client** - Cliente FHIR
- **fhir-r4** - Tipos y recursos FHIR R4

### Seguridad
- **Helmet** - Seguridad HTTP headers
- **express-rate-limit** - Rate limiting
- **bcryptjs** - Hash de contraseñas
- **JWT** - Autenticación basada en tokens

⸻

## 📋 Estructura del Proyecto

```
carecore-api/
├── src/
│   ├── main.ts                 # Punto de entrada
│   ├── app.module.ts           # Módulo principal
│   ├── config/                 # Configuraciones
│   │   ├── database.config.ts
│   │   └── fhir.config.ts
│   ├── common/                 # Utilidades compartidas
│   │   ├── dto/
│   │   ├── filters/
│   │   └── interceptors/
│   └── modules/                # Módulos de negocio
│       ├── fhir/
│       ├── patients/
│       ├── practitioners/      # (por implementar)
│       ├── encounters/         # (por implementar)
│       ├── documents/          # (por implementar)
│       ├── consents/           # (por implementar)
│       ├── audit/              # (por implementar)
│       └── ai/                 # (por implementar)
├── docker-compose.yml          # Configuración Docker
├── .eslintrc.js               # Configuración ESLint
├── .prettierrc                # Configuración Prettier
├── tsconfig.json              # Configuración TypeScript
└── package.json               # Dependencias

```

⸻

## 🔒 Buenas Prácticas Implementadas

✅ **Linting y Formateo**
- ESLint configurado con reglas estrictas
- Prettier para formateo consistente
- Pre-commit hooks con Husky y lint-staged

✅ **Seguridad**
- Helmet para headers de seguridad
- Rate limiting configurado
- Validación de datos con class-validator
- Variables de entorno para configuración sensible

✅ **Base de Datos**
- Docker Compose para desarrollo local
- TypeORM con migraciones
- Configuración separada por ambiente

✅ **Documentación**
- Swagger/OpenAPI integrado
- Endpoints documentados automáticamente

✅ **TypeScript**
- Configuración estricta
- Path aliases configurados
- Tipos explícitos (sin `any`)

⸻

## 📝 Scripts Disponibles

```bash
npm run start:dev      # Desarrollo con hot-reload
npm run build          # Compilar para producción
npm run start:prod     # Ejecutar versión compilada
npm run lint           # Ejecutar linter
npm run format         # Formatear código
npm run test           # Ejecutar tests
npm run test:cov       # Tests con cobertura
npm run migration:run  # Ejecutar migraciones
```

⸻

## 🔐 Variables de Entorno

El proyecto usa archivos de entorno por ambiente:
- **`.env.development`** - Variables para desarrollo
- **`.env.production`** - Variables para producción
- **`.env.local`** - Variables locales (sobrescribe las anteriores)

Para empezar:
```bash
cp .env.development.example .env.development
cp .env.development.example .env.local
```

Las variables principales:

- `PORT` - Puerto de la aplicación (default: 3000)
- `DB_HOST` - Host de PostgreSQL
- `DB_PORT` - Puerto de PostgreSQL (default: 5432)
- `DB_USER` - Usuario de la base de datos
- `DB_PASSWORD` - Contraseña de la base de datos
- `DB_NAME` - Nombre de la base de datos
- `JWT_SECRET` - Secret para JWT (cambiar en producción)
- `NODE_ENV` - Ambiente (development/production)

Para más información sobre la configuración de variables de entorno, consulta [ENV_VARIABLES.md](ENV_VARIABLES.md)

⸻

## 📚 Recursos FHIR

La API soporta los siguientes recursos FHIR R4:
- Patient
- Practitioner
- Encounter
- DocumentReference
- Consent
- Observation
- Condition
- Medication
- Procedure

Accede a la metadata FHIR en: `/api/fhir/metadata`

⸻

## 🤝 Contribución

1. Crear una rama desde `main`
2. Hacer tus cambios
3. Asegurar que los tests pasen y el código esté formateado
4. Crear un Pull Request

### Convenciones

El proyecto sigue [Conventional Commits](https://www.conventionalcommits.org/) y tiene hooks automáticos:

- **Pre-commit**: Formatea código y corrige ESLint automáticamente
- **Commit-msg**: Valida que los mensajes de commit sigan el formato convencional

**Formato de commit:**
```
<tipo>(<scope>): <descripción>
```

**Ejemplos:**
- `feat(patients): agregar endpoint de búsqueda`
- `fix(auth): corregir validación de token`
- `docs: actualizar guía de configuración`

Para más detalles, consulta [CONTRIBUTING.md](CONTRIBUTING.md)

⸻

## 📄 Licencia

Ver archivo [LICENSE](LICENSE)
