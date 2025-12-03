# Scripts de Inicialización

Esta carpeta contiene scripts para inicializar y configurar Keycloak.

## Scripts Disponibles

### `init-keycloak-db.sh`

**Ubicación:** `scripts/init-keycloak-db.sh` (referencia)

Este script crea la base de datos `keycloak_db` cuando PostgreSQL se inicializa por primera vez.

**No requiere ejecución manual** - se ejecuta automáticamente cuando PostgreSQL inicia por primera vez.

## Scripts Futuros

En el futuro, esta carpeta puede contener:
- Scripts de importación automática de realms
- Scripts de configuración de clientes
- Scripts de creación de roles y usuarios iniciales
- Scripts de backup y restore

## Uso

Los scripts en esta carpeta están diseñados para ejecutarse automáticamente o mediante comandos de Docker Compose.

Para ejecutar manualmente un script:

```bash
# Ejemplo (cuando se agreguen más scripts)
docker exec carecore-keycloak /path/to/script.sh
```

