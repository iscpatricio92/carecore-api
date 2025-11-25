# Variables de Entorno

El proyecto usa una configuración de variables de entorno por ambiente con prioridad de carga:

1. **`.env.development`** o **`.env.production`** (según `NODE_ENV`)
2. **`.env.local`** (sobrescribe las anteriores - para valores locales/privados)

## Configuración Inicial

### Para Desarrollo:

1. Copia el archivo de ejemplo de desarrollo:
   ```bash
   cp .env.development.example .env.development
   ```

2. Crea tu archivo `.env.local` con valores específicos de tu máquina:
   ```bash
   cp .env.development.example .env.local
   ```
   
   Luego edita `.env.local` con tus valores personales (contraseñas, secretos, etc.)

3. **IMPORTANTE para Docker Compose:** 
   Docker Compose ahora usa el mismo sistema que NestJS:
   - Lee primero `.env.${NODE_ENV}` (o `.env.development` por defecto)
   - Luego lee `.env.local` si existe (sobrescribe valores del archivo base)
   - Combina ambos archivos en `.env.docker` temporalmente
   
   El Makefile automáticamente combina los archivos y usa el resultado con `--env-file`.
   No necesitas crear un archivo `.env` separado.
   
   ⚠️ **Nota:** Los archivos de entorno deben contener las variables `DB_USER`, `DB_PASSWORD`, `DB_NAME`, y `DB_PORT`.

### Para Producción:

1. Copia el archivo de ejemplo de producción:
   ```bash
   cp .env.production.example .env.production
   ```

2. Edita `.env.production` con los valores de producción

3. Crea `.env.local` para sobrescribir valores sensibles que no deben estar en el repositorio

## Estructura de Archivos

- **`.env.development.example`** - Template para desarrollo (en el repositorio)
- **`.env.production.example`** - Template para producción (en el repositorio)
- **`.env.development`** - Valores para desarrollo (NO en el repositorio)
  - Usado por NestJS cuando `NODE_ENV=development`
  - Usado por Docker Compose cuando `NODE_ENV=development` (vía Makefile)
- **`.env.production`** - Valores para producción (NO en el repositorio)
  - Usado por NestJS cuando `NODE_ENV=production`
  - Usado por Docker Compose cuando `NODE_ENV=production` (vía Makefile)
- **`.env.local`** - Valores locales que sobrescriben todo (NO en el repositorio)
  - Usado por NestJS para sobrescribir valores del archivo de entorno
  - Usado por Docker Compose para sobrescribir valores (combinado con el archivo base)
  - Ambos sistemas leen primero el archivo base y luego `.env.local` (que sobrescribe)
- **`.env.docker`** - Archivo temporal generado por el Makefile (NO en el repositorio)
  - Se crea automáticamente combinando `.env.${NODE_ENV}` con `.env.local`
  - Se puede limpiar con `make docker-clean-env` o `make clean`

## Ejemplo de Variables

Aquí está el contenido típico de un archivo `.env.local`:

```env
# Application
NODE_ENV=development
PORT=3000
APP_NAME=CareCore API

# Database
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=carecore
DB_PASSWORD=carecore_dev_password
DB_NAME=carecore_db
DB_SYNCHRONIZE=false

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRATION=24h

# FHIR
FHIR_VERSION=R4
FHIR_BASE_URL=http://localhost:3000/api/fhir

# Security
BCRYPT_ROUNDS=10

# CORS
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_TTL=60
RATE_LIMIT_MAX=100

# PgAdmin
PGADMIN_EMAIL=admin@carecore.local
PGADMIN_PASSWORD=admin
PGADMIN_PORT=5050
```

## Descripción de Variables

### Application
- `NODE_ENV`: Ambiente de ejecución (`development`, `production`, `test`)
- `PORT`: Puerto donde correrá la aplicación (default: 3000)
- `APP_NAME`: Nombre de la aplicación

### Database
- `DB_TYPE`: Tipo de base de datos (actualmente solo `postgres`)
- `DB_HOST`: Host de PostgreSQL (usar `localhost` en desarrollo, nombre del servicio en Docker)
- `DB_PORT`: Puerto de PostgreSQL (default: 5432)
- `DB_USER`: Usuario de la base de datos
- `DB_PASSWORD`: Contraseña de la base de datos
- `DB_NAME`: Nombre de la base de datos
- `DB_SYNCHRONIZE`: Sincronizar automáticamente esquema (solo `true` en desarrollo)

### JWT
- `JWT_SECRET`: Clave secreta para firmar tokens JWT (**¡cambiar en producción!**)
- `JWT_EXPIRATION`: Tiempo de expiración del token (ej: `24h`, `7d`)

### FHIR
- `FHIR_VERSION`: Versión de FHIR (default: `R4`)
- `FHIR_BASE_URL`: URL base para recursos FHIR

### Security
- `BCRYPT_ROUNDS`: Número de rondas para hash de contraseñas (default: 10)

### CORS
- `CORS_ORIGIN`: Origen permitido para CORS (usar `*` en desarrollo, específico en producción)

### Rate Limiting
- `RATE_LIMIT_TTL`: Ventana de tiempo en segundos para rate limiting
- `RATE_LIMIT_MAX`: Número máximo de requests por ventana

### PgAdmin (Opcional)
- `PGADMIN_EMAIL`: Email para acceder a PgAdmin
- `PGADMIN_PASSWORD`: Contraseña para PgAdmin
- `PGADMIN_PORT`: Puerto para PgAdmin (default: 5050)

## Prioridad de Carga

Las variables de entorno se cargan en este orden (el último sobrescribe las anteriores):

1. Variables del sistema operativo
2. `.env.development` o `.env.production` (según `NODE_ENV`)
3. `.env.local` (sobrescribe todo - para valores locales)

**Ejemplo:**
- `.env.development` tiene `DB_PORT=5432`
- `.env.local` tiene `DB_PORT=5433`
- **Resultado:** La aplicación usará `DB_PORT=5433`

## Notas de Seguridad

⚠️ **IMPORTANTE:**
- Nunca commitees los archivos `.env.local`, `.env.development`, ni `.env.production` al repositorio
- Solo los archivos `.example` deben estar en el repositorio
- Cambia todas las contraseñas por defecto en producción
- Usa valores seguros para `JWT_SECRET` en producción (mínimo 32 caracteres aleatorios)
- En producción, usa conexiones SSL/TLS para la base de datos
- Considera usar un gestor de secretos (AWS Secrets Manager, HashiCorp Vault, etc.)
- Usa `.env.local` para valores sensibles que no quieras compartir con el equipo

