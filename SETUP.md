# Guía de Configuración - CareCore API

Esta guía te ayudará a configurar el proyecto desde cero.

## 📋 Checklist de Configuración

### 1. Prerrequisitos ✅
- [ ] Node.js >= 18.x instalado
- [ ] npm o yarn instalado
- [ ] Docker y Docker Compose instalados
- [ ] Git instalado

Verificar versiones:
```bash
node --version  # Debe ser >= 18.x
npm --version
docker --version
docker-compose --version
```

### 2. Instalación de Dependencias ✅

```bash
npm install
```

O usando make:
```bash
make install
```

### 3. Configuración de Variables de Entorno ✅

El proyecto usa archivos de entorno por ambiente. Para desarrollo:

1. Copiar el archivo de ejemplo de desarrollo:
```bash
cp .env.development.example .env.development
```

2. Crear archivo `.env.local` para valores locales (esto sobrescribe `.env.development` para NestJS):
```bash
cp .env.development.example .env.local
```

3. Editar `.env.development` y `.env.local` con tus valores personalizados si es necesario.

**Notas:**
- El archivo `.env.local` tiene prioridad sobre `.env.development` para ambos sistemas:
  - **NestJS:** Lee primero `.env.${NODE_ENV}` y luego `.env.local` (que sobrescribe)
  - **Docker Compose:** El Makefile combina ambos archivos automáticamente (`.env.local` sobrescribe)
- Ambos sistemas usan exactamente la misma lógica de prioridad, manteniendo consistencia total
- ⚠️ **Seguridad:** El archivo `docker-compose.yml` NO contiene valores por defecto sensibles. Todas las variables deben estar en tus archivos de entorno

Para más información, consulta [ENV_VARIABLES.md](ENV_VARIABLES.md)

### 4. Configuración de Base de Datos (PostgreSQL) ✅

Iniciar PostgreSQL con Docker:
```bash
docker-compose up -d
```

O usando make:
```bash
make docker-up
```

Verificar que el contenedor está corriendo:
```bash
docker ps
```

Deberías ver `carecore-postgres` en la lista.

### 5. Configuración de Git Hooks ✅

Los pre-commit hooks se configuran automáticamente al instalar dependencias gracias al script `prepare` en `package.json`.

Si necesitas reinstalarlos manualmente:
```bash
npx husky install
```

### 6. Verificación de Configuración ✅

1. **Verificar linting:**
```bash
npm run lint
```

2. **Formatear código:**
```bash
npm run format
```

3. **Compilar proyecto:**
```bash
npm run build
```

### 7. Iniciar la Aplicación ✅

Modo desarrollo (con hot-reload):
```bash
npm run start:dev
```

O usando make:
```bash
make dev
```

Deberías ver:
- ✅ Application is running on: http://localhost:3000/api
- ✅ Swagger documentation: http://localhost:3000/api/docs

### 8. Verificar Endpoints ✅

- **Health check:** http://localhost:3000/api
- **Swagger UI:** http://localhost:3000/api/docs
- **FHIR Metadata:** http://localhost:3000/api/fhir/metadata

## 🔧 Comandos Útiles

### Desarrollo
```bash
make dev              # Iniciar en modo desarrollo
make build            # Compilar para producción
make lint             # Ejecutar linter
make format           # Formatear código
```

### Docker
```bash
make docker-up        # Iniciar contenedores
make docker-down      # Detener contenedores
make docker-logs      # Ver logs de Docker
```

### Base de Datos
```bash
npm run migration:run        # Ejecutar migraciones
npm run migration:revert     # Revertir última migración
npm run migration:generate   # Generar nueva migración
```

### Testing
```bash
npm run test          # Ejecutar tests
npm run test:watch    # Tests en modo watch
npm run test:cov      # Tests con cobertura
```

## 🐛 Solución de Problemas

### Error: Puerto 5432 ya en uso
```bash
# Verificar qué proceso está usando el puerto
lsof -i :5432

# Detener otros contenedores de PostgreSQL
docker ps
docker stop <container-id>
```

### Error: No se puede conectar a la base de datos
1. Verificar que el contenedor está corriendo: `docker ps`
2. Verificar logs: `docker-compose logs postgres`
3. Verificar variables de entorno en `.env.local`
4. Esperar unos segundos después de iniciar el contenedor

### Error: Husky hooks no funcionan
```bash
# Reinstalar hooks
rm -rf .husky
npm install
```

### Error: Módulos no encontrados
```bash
# Limpiar e instalar de nuevo
rm -rf node_modules package-lock.json
npm install
```

## 📚 Próximos Pasos

1. ✅ Configuración básica completada
2. ⏭️ Implementar módulos de autenticación
3. ⏭️ Implementar recursos FHIR completos
4. ⏭️ Agregar tests unitarios y E2E
5. ⏭️ Configurar CI/CD
6. ⏭️ Implementar auditoría
7. ⏭️ Configurar almacenamiento de archivos (MinIO/S3)

## 📞 Soporte

Para más información, consulta:
- [README.md](README.md) - Documentación general
- [ENV_VARIABLES.md](ENV_VARIABLES.md) - Variables de entorno

