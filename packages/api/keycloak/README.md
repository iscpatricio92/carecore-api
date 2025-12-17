# Keycloak Configuration

Este directorio contiene la configuración y scripts de inicialización para Keycloak.

## 📁 Estructura

```
keycloak/
├── README.md                    # Este archivo (documentación principal)
├── REALM_SETUP.md               # Guía para crear/configurar el realm "carecore"
├── CLIENT_API_SETUP.md          # Guía para configurar cliente "carecore-api"
├── CLIENT_WEB_SETUP.md          # Guía para configurar cliente "carecore-web"
├── CLIENT_WEB_VALIDATION.md     # Guía para validar cliente web sin frontend
├── ROLES_SETUP.md               # Guía para crear roles base del sistema
├── ROLES.md                      # Documentación de roles y permisos
├── TROUBLESHOOTING.md            # Guía de troubleshooting y solución de problemas
├── BACKUP_RESTORE.md            # Guía de backup y restore
├── init/                         # Scripts de inicialización
│   └── README.md                 # Documentación de scripts
└── realms/                       # Exports de realms
    ├── .gitkeep                  # Mantener carpeta en git
    ├── README.md                 # Documentación sobre exports
    └── carecore-realm.json       # Configuración base del realm (seguro para commit)
```

**Nota:** El script `init-keycloak-db.sh` se encuentra en `scripts/init-keycloak-db.sh` y se ejecuta automáticamente cuando PostgreSQL se inicializa.

## 🚀 Inicialización

### Base de Datos

La base de datos `keycloak_db` se crea automáticamente cuando PostgreSQL se inicializa por primera vez usando el script `scripts/init-keycloak-db.sh`.

Este script se ejecuta automáticamente cuando:

- Se inicia PostgreSQL por primera vez
- El script está montado en `/docker-entrypoint-initdb.d/` dentro del contenedor

### Configuración del Realm

Para crear y configurar el realm "carecore" automáticamente:

**🚀 Método Automático (Recomendado):**

La configuración de Keycloak se ejecuta **automáticamente** cuando ejecutas `make docker-up`:

```bash
make docker-up
```

El script `scripts/init-keycloak-config.sh` se ejecuta automáticamente y:

- ✅ **Verifica rápidamente** si el realm, roles y clientes ya existen
- ✅ **Es silencioso** cuando todo está configurado (no muestra output innecesario)
- ✅ **Solo ejecuta setup** si falta algo (ahorra recursos y tiempo)
- ✅ **Es idempotente** - se puede ejecutar múltiples veces sin problemas

**Si necesitas configurar manualmente:**

```bash
# Configurar todo manualmente (realm, roles, clientes)
make keycloak-setup

# Obtener Client Secret automáticamente
make keycloak-get-secret
```

**Después de la primera configuración:**

- El script se ejecutará automáticamente en cada `make docker-up`
- Si todo está configurado, será silencioso y rápido (~0.2 segundos)
- Si falta algo, lo creará automáticamente

**📖 Método Manual:** Ver [REALM_SETUP.md](./REALM_SETUP.md) para configuración paso a paso manual.

### Configuración de Clientes

Después de crear el realm:

**📖 Guías completas:**

- [REALM_SETUP.md](./REALM_SETUP.md) - Configurar realm "carecore"
- [CLIENT_API_SETUP.md](./CLIENT_API_SETUP.md) - Configurar cliente "carecore-api"
- [CLIENT_WEB_SETUP.md](./CLIENT_WEB_SETUP.md) - Configurar cliente "carecore-web"
- [CLIENT_WEB_VALIDATION.md](./CLIENT_WEB_VALIDATION.md) - Validar cliente web sin frontend
- [ROLES_SETUP.md](./ROLES_SETUP.md) - Configurar roles base del sistema
- [ROLES.md](./ROLES.md) - Documentación de roles y permisos
- [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) - Guía de troubleshooting y solución de problemas
- [BACKUP_RESTORE.md](./BACKUP_RESTORE.md) - Guía de backup y restore
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura y diagramas del sistema

**🔐 Seguridad Avanzada:**

- [../docs/MFA_SETUP_GUIDE.md](../docs/MFA_SETUP_GUIDE.md) - Guía completa para configurar MFA (TOTP) en Keycloak
- [../docs/SCOPES_SETUP_GUIDE.md](../docs/SCOPES_SETUP_GUIDE.md) - Guía completa para configurar scopes OAuth2 en Keycloak

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

Para una guía completa de troubleshooting, ver [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

**Problemas comunes:**

- Keycloak no inicia
- No puedo acceder a Admin Console
- Base de datos no se crea
- Problemas de conexión
- Problemas con realm o clientes

## 💾 Backup y Restore

Para información sobre backup y restore, ver [BACKUP_RESTORE.md](./BACKUP_RESTORE.md).

**Incluye:**

- Backup del realm
- Backup de la base de datos
- Restore completo
- Scripts automatizados
