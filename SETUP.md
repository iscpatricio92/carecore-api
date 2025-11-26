# Setup Guide - CareCore API

This guide will help you set up the project from scratch.

## 📋 Setup Checklist

### 1. Prerequisites ✅
- [ ] Node.js >= 18.x installed
- [ ] npm or yarn installed
- [ ] Docker and Docker Compose installed
- [ ] Git installed

Verify versions:
```bash
node --version  # Must be >= 18.x
npm --version
docker --version
docker-compose --version
```

### 2. Dependency Installation ✅

```bash
npm install
```

Or using make:
```bash
make install
```

### 3. Environment Variables Configuration ✅

The project uses environment files per environment. For development:

1. Copy the development example file:
```bash
cp .env.development.example .env.development
```

2. Create `.env.local` file for local values (this overrides `.env.development` for NestJS):
```bash
cp .env.development.example .env.local
```

3. Edit `.env.development` and `.env.local` with your custom values if necessary.

**Notes:**
- The `.env.local` file has priority over `.env.development` for both systems:
  - **NestJS:** Reads first `.env.${NODE_ENV}` and then `.env.local` (which overrides)
  - **Docker Compose:** The Makefile automatically combines both files (`.env.local` overrides)
- Both systems use exactly the same priority logic, maintaining total consistency
- ⚠️ **Security:** The `docker-compose.yml` file does NOT contain sensitive default values. All variables must be in your environment files

For more information, see [ENV_VARIABLES.md](ENV_VARIABLES.md)

### 4. Database Configuration (PostgreSQL) ✅

Start PostgreSQL with Docker:
```bash
docker-compose up -d
```

Or using make:
```bash
make docker-up
```

Verify the container is running:
```bash
docker ps
```

You should see `carecore-postgres` in the list.

### 5. Git Hooks Configuration ✅

Pre-commit hooks are automatically configured when installing dependencies thanks to the `prepare` script in `package.json`.

If you need to reinstall them manually:
```bash
npx husky install
```

### 6. Configuration Verification ✅

1. **Verify linting:**
```bash
npm run lint
```

2. **Format code:**
```bash
npm run format
```

3. **Build project:**
```bash
npm run build
```

### 7. Start the Application ✅

Development mode (with hot-reload):
```bash
npm run start:dev
```

Or using make:
```bash
make dev
```

You should see:
- ✅ Application is running on: http://localhost:3000/api
- ✅ Swagger documentation: http://localhost:3000/api/docs

### 8. Verify Endpoints ✅

- **Health check:** http://localhost:3000/api
- **Swagger UI:** http://localhost:3000/api/docs
- **FHIR Metadata:** http://localhost:3000/api/fhir/metadata

## 🔧 Useful Commands

### Development
```bash
make dev              # Start in development mode
make build            # Build for production
make lint             # Run linter
make format           # Format code
```

### Docker
```bash
make docker-up        # Start containers
make docker-down      # Stop containers
make docker-logs      # View Docker logs
```

### Database
```bash
npm run migration:run        # Run migrations
npm run migration:revert     # Revert last migration
npm run migration:generate   # Generate new migration
```

### Testing
```bash
npm run test          # Run tests
npm run test:watch    # Tests in watch mode
npm run test:cov      # Tests with coverage
```

## 🐛 Troubleshooting

### Error: Port 5432 already in use
```bash
# Check what process is using the port
lsof -i :5432

# Stop other PostgreSQL containers
docker ps
docker stop <container-id>
```

### Error: Cannot connect to database
1. Verify container is running: `docker ps`
2. Check logs: `docker-compose logs postgres`
3. Verify environment variables in `.env.local`
4. Wait a few seconds after starting the container

### Error: Husky hooks not working
```bash
# Reinstall hooks
rm -rf .husky
npm install
```

### Error: Modules not found
```bash
# Clean and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 📚 Next Steps

1. ✅ Basic configuration completed
2. ⏭️ Implement authentication modules
3. ⏭️ Implement complete FHIR resources
4. ⏭️ Add unit and E2E tests
5. ⏭️ Configure CI/CD
6. ⏭️ Implement auditing
7. ⏭️ Configure file storage (MinIO/S3)

## 📞 Support

For more information, see:
- [README.md](README.md) - General documentation
- [ENV_VARIABLES.md](ENV_VARIABLES.md) - Environment variables
