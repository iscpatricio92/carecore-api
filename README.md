📘 CareCore API — README

CareCore is a digital medical records platform where the patient owns their information, and only verified medical professionals can add or modify clinical records.

This repository contains the backend API, built with NestJS, FHIR, and an architecture ready for clinical and AI integrations.

⸻

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.x
- npm or yarn
- Docker and Docker Compose
- Git

### Initial Setup

1. **Clone the repository** (if you don't have it yet)
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

   # Create local file (overrides development values for NestJS)
   cp .env.development.example .env.local

   # Edit .env.development and .env.local with your personal configurations
   ```

   ⚠️ **Note:**
   - Docker Compose and NestJS use the same environment file system:
     - Both read first `.env.${NODE_ENV}` (or `.env.development` by default)
     - Both read then `.env.local` if it exists (which overrides values)
   - The Makefile automatically combines both files for Docker Compose
   - This maintains total consistency between both systems

   For more details, see [ENV_VARIABLES.md](ENV_VARIABLES.md)

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

⸻

🚀 API Goals
	•	Serve as central orchestrator of clinical data.
	•	Expose FHIR-compatible resources (Patient, Practitioner, Encounter, DocumentReference, Consent).
	•	Implement advanced security, roles, consent-based access (FHIR Consent), and immutable auditing.
	•	Prepare endpoints and pipelines for AI modules (clinical summary, semantic extraction, term normalization).
	•	Be the foundation for future integrations with:
	•	Laboratories
	•	Clinics
	•	Specialists
	•	Insurance companies
  •	External clinical systems (SMART on FHIR)

  📂 Backend Architecture
  ```/src
  /modules
    /auth
    /patients
    /practitioners
    /encounters
    /documents
    /consents
    /audit
    /ai          <- AI module (initial placeholder)
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
	•	PostgreSQL (prod) / SQLite (dev optional)
	•	FHIR JSON as base format
	•	MinIO / S3 for clinical files (DocumentReference)
	•	OIDC (Keycloak/Auth0) for identity and roles
	•	Mandatory audit logging in every clinical operation
	•	Sensitive data encryption + future KMS integration
	•	AI ready to connect as microservice or internal module

⸻

## 🛠️ Technologies and Tools

### Development
- **NestJS** - Progressive Node.js framework
- **TypeScript** - Static typing
- **PostgreSQL** - Relational database
- **TypeORM** - ORM for TypeScript
- **Swagger/OpenAPI** - API documentation

### Code Quality
- **ESLint** - Linter for JavaScript/TypeScript
- **Prettier** - Code formatter
- **Husky** - Git hooks
- **lint-staged** - Linting on staged files

### FHIR
- **fhir-kit-client** - FHIR client
- **fhir-r4** - FHIR R4 types and resources

### Security
- **Helmet** - HTTP security headers
- **express-rate-limit** - Rate limiting
- **bcryptjs** - Password hashing
- **JWT** - Token-based authentication

⸻

## 📋 Project Structure

```
carecore-api/
├── src/
│   ├── main.ts                 # Entry point
│   ├── app.module.ts           # Main module
│   ├── config/                 # Configurations
│   │   ├── database.config.ts
│   │   └── fhir.config.ts
│   ├── common/                 # Shared utilities
│   │   ├── dto/
│   │   ├── filters/
│   │   └── interceptors/
│   └── modules/                # Business modules
│       ├── fhir/
│       ├── patients/
│       ├── practitioners/      # (to be implemented)
│       ├── encounters/         # (to be implemented)
│       ├── documents/          # (to be implemented)
│       ├── consents/           # (to be implemented)
│       ├── audit/              # (to be implemented)
│       └── ai/                 # (to be implemented)
├── docker-compose.yml          # Docker configuration
├── .eslintrc.js               # ESLint configuration
├── .prettierrc                # Prettier configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies

```

⸻

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

⸻

## 📝 Available Scripts

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

⸻

## 🔐 Environment Variables

The project uses environment files per environment:
- **`.env.development`** - Variables for development
- **`.env.production`** - Variables for production
- **`.env.local`** - Local variables (overrides the above)

To get started:
```bash
cp .env.development.example .env.development
cp .env.development.example .env.local
```

Main variables:

- `PORT` - Application port (default: 3000)
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_USER` - Database user
- `DB_PASSWORD` - Database password
- `DB_NAME` - Database name
- `JWT_SECRET` - Secret for JWT (change in production)
- `NODE_ENV` - Environment (development/production)

For more information about environment variable configuration, see [ENV_VARIABLES.md](ENV_VARIABLES.md)

⸻

## 📚 FHIR Resources

The API supports the following FHIR R4 resources:
- Patient
- Practitioner
- Encounter
- DocumentReference
- Consent
- Observation
- Condition
- Medication
- Procedure

Access FHIR metadata at: `/api/fhir/metadata`

⸻

## 🤝 Contributing

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

⸻

## 📄 License

See [LICENSE](LICENSE) file
