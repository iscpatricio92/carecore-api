# Keycloak Configuration

Este directorio contiene la configuración y scripts de inicialización para Keycloak.

## 📁 Estructura

```
keycloak/
├── README.md           # Este archivo
├── init/               # Scripts de inicialización
│   └── README.md       # Documentación de scripts
└── realms/             # Exports de realms (futuro)
    └── .gitkeep        # Mantener carpeta en git
```

**Nota:** El script `init-keycloak-db.sh` se encuentra en `scripts/init-keycloak-db.sh` y se ejecuta automáticamente cuando PostgreSQL se inicializa.

## 🚀 Inicialización

### Base de Datos

La base de datos `keycloak_db` se crea automáticamente cuando PostgreSQL se inicializa por primera vez usando el script `scripts/init-keycloak-db.sh`.

Este script se ejecuta automáticamente cuando:
- Se inicia PostgreSQL por primera vez
- El script está montado en `/docker-entrypoint-initdb.d/` dentro del contenedor

### Configuración del Realm

Para crear y configurar el realm "carecore":

**📖 Guía completa:** Ver [REALM_SETUP.md](./REALM_SETUP.md)

**Resumen rápido:**
1. Iniciar servicios: `npm run docker:up`
2. Acceder a Admin Console: http://localhost:8080
3. Crear realm "carecore" (manual o importar desde `realms/carecore-realm.json`)

### Configuración de Clientes

Después de crear el realm:

**📖 Guías completas:**
- [REALM_SETUP.md](./REALM_SETUP.md) - Configurar realm "carecore"
- [CLIENT_API_SETUP.md](./CLIENT_API_SETUP.md) - Configurar cliente "carecore-api"
- [CLIENT_WEB_SETUP.md](./CLIENT_WEB_SETUP.md) - Configurar cliente "carecore-web"
- [CLIENT_WEB_VALIDATION.md](./CLIENT_WEB_VALIDATION.md) - Validar cliente web sin frontend
- [ROLES_SETUP.md](./ROLES_SETUP.md) - Configurar roles base del sistema
- [ROLES.md](./ROLES.md) - Documentación de roles y permisos

## 📝 Scripts

### `init-keycloak-db.sh`

Script que crea la base de datos `keycloak_db` en PostgreSQL.

**Ubicación:** `scripts/init-keycloak-db.sh`

**Uso:**
Este script se ejecuta automáticamente cuando PostgreSQL se inicializa por primera vez. No requiere ejecución manual.

**Variables requeridas:**
- `KEYCLOAK_DB_NAME`: Nombre de la base de datos (default: `keycloak_db`)
- `POSTGRES_USER`: Usuario de PostgreSQL
- `POSTGRES_DB`: Base de datos inicial de PostgreSQL

## 🔄 Export/Import de Realms

### Exportar Realm

Para exportar un realm desde Keycloak:

```bash
# Desde el contenedor
docker exec carecore-keycloak /opt/keycloak/bin/kc.sh export \
  --realm carecore \
  --file /var/lib/keycloak/data/export/carecore-realm.json

# Copiar desde el contenedor
docker cp carecore-keycloak:/var/lib/keycloak/data/export/carecore-realm.json \
  keycloak/realms/carecore-realm.json
```

### Importar Realm

Para importar un realm a Keycloak:

```bash
# Copiar al contenedor
docker cp keycloak/realms/carecore-realm.json \
  carecore-keycloak:/var/lib/keycloak/data/import/carecore-realm.json

# Importar desde el contenedor
docker exec carecore-keycloak /opt/keycloak/bin/kc.sh import \
  --file /var/lib/keycloak/data/import/carecore-realm.json
```

**Nota:** Para que Keycloak importe automáticamente al iniciar, coloca los archivos JSON en `/var/lib/keycloak/data/import/` dentro del contenedor.

## 🔧 Configuración Avanzada

### Variables de Entorno

Todas las variables de entorno relacionadas con Keycloak están documentadas en [ENV_VARIABLES.md](../docs/ENV_VARIABLES.md).

Variables principales:
- `KEYCLOAK_ADMIN`: Usuario administrador
- `KEYCLOAK_ADMIN_PASSWORD`: Contraseña del administrador
- `KEYCLOAK_URL`: URL base de Keycloak
- `KEYCLOAK_REALM`: Nombre del realm
- `KEYCLOAK_DB_*`: Configuración de base de datos

### Volúmenes Docker

Los datos de Keycloak se persisten en el volumen `keycloak_data`:
- Configuración de realms
- Usuarios y roles
- Clientes y configuraciones

## 📚 Referencias

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Keycloak Docker Documentation](https://www.keycloak.org/server/containers)
- [Keycloak Realm Configuration](https://www.keycloak.org/docs/latest/server_admin/#_realm)
- [Plan de Implementación](../docs/AUTH_IMPLEMENTATION_PLAN.md)
- [Tareas Fase 1](../docs/tasks/PHASE1_KEYCLOAK_SETUP.md)

## ⚠️ Notas de Seguridad

- **NUNCA** commitees archivos con credenciales o secrets
- Los exports de realms pueden contener información sensible
- Usa `.env.local` para valores sensibles que no deben estar en el repositorio
- Rota las contraseñas periódicamente en producción
- Usa HTTPS en producción

## 🐛 Troubleshooting

### Keycloak no inicia

1. Verificar que PostgreSQL esté corriendo:
   ```bash
   docker-compose ps postgres
   ```

2. Verificar logs de Keycloak:
   ```bash
   docker-compose logs keycloak
   ```

3. Verificar que la base de datos `keycloak_db` exista:
   ```bash
   docker exec carecore-postgres psql -U $DB_USER -d $DB_NAME -c "\l" | grep keycloak_db
   ```

### No puedo acceder a Admin Console

1. Verificar que Keycloak esté corriendo:
   ```bash
   docker-compose ps keycloak
   ```

2. Verificar que el puerto 8080 esté disponible:
   ```bash
   curl http://localhost:8080
   ```

3. Verificar credenciales en `.env.local`:
   ```bash
   grep KEYCLOAK_ADMIN .env.local
   ```

### Base de datos no se crea

1. Verificar que el script `init-keycloak-db.sh` esté montado:
   ```bash
   docker exec carecore-postgres ls -la /docker-entrypoint-initdb.d/ | grep keycloak
   ```

2. Verificar logs de PostgreSQL:
   ```bash
   docker-compose logs postgres | grep keycloak
   ```

3. Crear manualmente si es necesario:
   ```bash
   docker exec carecore-postgres psql -U $DB_USER -d $DB_NAME -c "CREATE DATABASE keycloak_db;"
   ```

