# Keycloak Backup y Restore

Esta guía explica cómo hacer backup y restore de la configuración de Keycloak en el proyecto CareCore.

## 📋 Tabla de Contenidos

- [Backup del Realm](#backup-del-realm)
- [Restore del Realm](#restore-del-realm)
- [Backup de la Base de Datos](#backup-de-la-base-de-datos)
- [Restore de la Base de Datos](#restore-de-la-base-de-datos)
- [Backup Completo](#backup-completo)
- [Automatización](#automatización)
- [Mejores Prácticas](#mejores-prácticas)

---

## 🔄 Backup del Realm

### Método 1: Export desde Admin Console

1. **Acceder a Admin Console:**
   - URL: `http://localhost:${KEYCLOAK_HTTP_PORT}`
   - Realm: `carecore`
   - Usuario: Valor de `KEYCLOAK_ADMIN` en `.env.local`

2. **Exportar el realm:**
   - Ir a **Realm settings** → pestaña **Export**
   - Hacer clic en **Export**
   - Se descargará un archivo JSON

3. **Guardar el archivo:**

   ```bash
   # Crear directorio de backups (si no existe)
   mkdir -p keycloak/backups

   # Mover el archivo descargado
   mv ~/Downloads/carecore-realm.json keycloak/backups/carecore-realm-$(date +%Y%m%d-%H%M%S).json
   ```

### Método 2: Export desde CLI (Docker)

```bash
# Exportar realm desde el contenedor
docker exec carecore-keycloak /opt/keycloak/bin/kc.sh export \
  --realm carecore \
  --file /tmp/carecore-realm-export.json

# Copiar desde el contenedor
docker cp carecore-keycloak:/tmp/carecore-realm-export.json \
  keycloak/backups/carecore-realm-$(date +%Y%m%d-%H%M%S).json

# Limpiar archivo temporal en el contenedor
docker exec carecore-keycloak rm /tmp/carecore-realm-export.json
```

### Método 3: Usando API de Keycloak

```bash
# Obtener token de administrador
TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" | jq -r '.access_token')

# Exportar realm
curl -s -X GET "${KEYCLOAK_URL}/admin/realms/carecore" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  > keycloak/backups/carecore-realm-$(date +%Y%m%d-%H%M%S).json
```

---

## 🔄 Restore del Realm

### Método 1: Import desde Admin Console

1. **Acceder a Admin Console:**
   - URL: `http://localhost:${KEYCLOAK_HTTP_PORT}`
   - Realm: `master`
   - Usuario: Valor de `KEYCLOAK_ADMIN` en `.env.local`

2. **Importar el realm:**
   - Ir a **Add realm** → **Import**
   - Seleccionar el archivo JSON del backup
   - Hacer clic en **Create**

3. **Verificar:**
   - El realm "carecore" debe aparecer en la lista
   - Verificar configuración, clientes y roles

### Método 2: Import desde CLI (Docker)

```bash
# Copiar archivo al contenedor
docker cp keycloak/backups/carecore-realm-YYYYMMDD-HHMMSS.json \
  carecore-keycloak:/tmp/carecore-realm-import.json

# Importar realm
docker exec carecore-keycloak /opt/keycloak/bin/kc.sh import \
  --file /tmp/carecore-realm-import.json

# Limpiar archivo temporal
docker exec carecore-keycloak rm /tmp/carecore-realm-import.json
```

### Método 3: Usando API de Keycloak

```bash
# Obtener token de administrador
TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" | jq -r '.access_token')

# Importar realm
curl -s -X POST "${KEYCLOAK_URL}/admin/realms" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d @keycloak/backups/carecore-realm-YYYYMMDD-HHMMSS.json
```

---

## 💾 Backup de la Base de Datos

### Backup Completo de PostgreSQL

```bash
# Crear directorio de backups (si no existe)
mkdir -p keycloak/backups/db

# Hacer backup de la base de datos de Keycloak
docker exec carecore-postgres pg_dump -U "${KEYCLOAK_DB_USER}" \
  -d "${KEYCLOAK_DB_NAME}" \
  > keycloak/backups/db/keycloak-db-$(date +%Y%m%d-%H%M%S).sql

# O con formato custom (más eficiente)
docker exec carecore-postgres pg_dump -U "${KEYCLOAK_DB_USER}" \
  -d "${KEYCLOAK_DB_NAME}" \
  -F c \
  > keycloak/backups/db/keycloak-db-$(date +%Y%m%d-%H%M%S).dump
```

### Backup Solo de Esquema

```bash
# Backup solo del esquema (sin datos)
docker exec carecore-postgres pg_dump -U "${KEYCLOAK_DB_USER}" \
  -d "${KEYCLOAK_DB_NAME}" \
  --schema-only \
  > keycloak/backups/db/keycloak-schema-$(date +%Y%m%d-%H%M%S).sql
```

### Backup Solo de Datos

```bash
# Backup solo de datos (sin esquema)
docker exec carecore-postgres pg_dump -U "${KEYCLOAK_DB_USER}" \
  -d "${KEYCLOAK_DB_NAME}" \
  --data-only \
  > keycloak/backups/db/keycloak-data-$(date +%Y%m%d-%H%M%S).sql
```

---

## 🔄 Restore de la Base de Datos

### Restore Completo

```bash
# ⚠️ ADVERTENCIA: Esto eliminará todos los datos actuales

# Detener Keycloak
docker-compose stop keycloak

# Restore desde archivo SQL
docker exec -i carecore-postgres psql -U "${KEYCLOAK_DB_USER}" \
  -d "${KEYCLOAK_DB_NAME}" \
  < keycloak/backups/db/keycloak-db-YYYYMMDD-HHMMSS.sql

# O desde archivo custom
docker exec -i carecore-postgres pg_restore -U "${KEYCLOAK_DB_USER}" \
  -d "${KEYCLOAK_DB_NAME}" \
  --clean \
  --if-exists \
  < keycloak/backups/db/keycloak-db-YYYYMMDD-HHMMSS.dump

# Reiniciar Keycloak
docker-compose start keycloak
```

### Restore Solo de Esquema

```bash
# Restore solo del esquema
docker exec -i carecore-postgres psql -U "${KEYCLOAK_DB_USER}" \
  -d "${KEYCLOAK_DB_NAME}" \
  < keycloak/backups/db/keycloak-schema-YYYYMMDD-HHMMSS.sql
```

### Restore Solo de Datos

```bash
# Restore solo de datos
docker exec -i carecore-postgres psql -U "${KEYCLOAK_DB_USER}" \
  -d "${KEYCLOAK_DB_NAME}" \
  < keycloak/backups/db/keycloak-data-YYYYMMDD-HHMMSS.sql
```

---

## 📦 Backup Completo

### Script de Backup Completo

Crear un script `scripts/backup-keycloak.sh`:

```bash
#!/bin/bash

# Cargar variables de entorno
source .env.local 2>/dev/null || true

# Directorio de backups
BACKUP_DIR="keycloak/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Crear directorio si no existe
mkdir -p "${BACKUP_DIR}/db"
mkdir -p "${BACKUP_DIR}/realms"

echo "=== Iniciando backup de Keycloak ==="
echo "Timestamp: ${TIMESTAMP}"
echo ""

# 1. Backup del realm
echo "1. Exportando realm..."
docker exec carecore-keycloak /opt/keycloak/bin/kc.sh export \
  --realm carecore \
  --file /tmp/carecore-realm-export.json 2>/dev/null

docker cp carecore-keycloak:/tmp/carecore-realm-export.json \
  "${BACKUP_DIR}/realms/carecore-realm-${TIMESTAMP}.json" 2>/dev/null

docker exec carecore-keycloak rm /tmp/carecore-realm-export.json 2>/dev/null

if [ -f "${BACKUP_DIR}/realms/carecore-realm-${TIMESTAMP}.json" ]; then
  echo "✅ Realm exportado: ${BACKUP_DIR}/realms/carecore-realm-${TIMESTAMP}.json"
else
  echo "❌ Error al exportar realm"
fi

# 2. Backup de la base de datos
echo ""
echo "2. Exportando base de datos..."
docker exec carecore-postgres pg_dump -U "${KEYCLOAK_DB_USER}" \
  -d "${KEYCLOAK_DB_NAME}" \
  -F c \
  > "${BACKUP_DIR}/db/keycloak-db-${TIMESTAMP}.dump" 2>/dev/null

if [ -f "${BACKUP_DIR}/db/keycloak-db-${TIMESTAMP}.dump" ]; then
  echo "✅ Base de datos exportada: ${BACKUP_DIR}/db/keycloak-db-${TIMESTAMP}.dump"
else
  echo "❌ Error al exportar base de datos"
fi

# 3. Crear archivo de información
cat > "${BACKUP_DIR}/backup-info-${TIMESTAMP}.txt" <<EOF
Keycloak Backup Information
===========================
Timestamp: ${TIMESTAMP}
Date: $(date)

Files:
- Realm: ${BACKUP_DIR}/realms/carecore-realm-${TIMESTAMP}.json
- Database: ${BACKUP_DIR}/db/keycloak-db-${TIMESTAMP}.dump

Keycloak Version: $(docker exec carecore-keycloak /opt/keycloak/bin/kc.sh version 2>/dev/null | head -1)
PostgreSQL Version: $(docker exec carecore-postgres psql --version 2>/dev/null)

Environment:
- KEYCLOAK_URL: ${KEYCLOAK_URL}
- KEYCLOAK_REALM: ${KEYCLOAK_REALM}
- KEYCLOAK_DB_NAME: ${KEYCLOAK_DB_NAME}
EOF

echo ""
echo "✅ Backup completado"
echo "📁 Archivos guardados en: ${BACKUP_DIR}"
echo "📄 Información: ${BACKUP_DIR}/backup-info-${TIMESTAMP}.txt"
```

Hacer el script ejecutable:

```bash
chmod +x scripts/backup-keycloak.sh
```

### Uso del Script

```bash
# Ejecutar backup completo
./scripts/backup-keycloak.sh
```

---

## 🤖 Automatización

### Cron Job para Backups Automáticos

Agregar a crontab para backups diarios:

```bash
# Editar crontab
crontab -e

# Agregar línea para backup diario a las 2 AM
0 2 * * * cd /ruta/al/proyecto && ./scripts/backup-keycloak.sh >> /var/log/keycloak-backup.log 2>&1
```

### Limpieza de Backups Antiguos

Agregar al script de backup para mantener solo los últimos N backups:

```bash
# Mantener solo los últimos 30 días de backups
find keycloak/backups -name "*.json" -mtime +30 -delete
find keycloak/backups -name "*.dump" -mtime +30 -delete
find keycloak/backups -name "*.txt" -mtime +30 -delete
```

---

## ✅ Mejores Prácticas

### 1. Frecuencia de Backups

- **Desarrollo:** Backup antes de cambios importantes
- **Producción:** Backup diario automático
- **Antes de actualizaciones:** Backup completo

### 2. Almacenamiento

- **Local:** Mantener backups locales para desarrollo
- **Remoto:** Enviar backups a almacenamiento remoto (S3, etc.) en producción
- **Retención:** Mantener backups por al menos 30 días

### 3. Verificación

- **Verificar backups regularmente:** Probar restore en ambiente de prueba
- **Verificar integridad:** Comprobar que los archivos no estén corruptos
- **Documentar:** Mantener registro de backups realizados

### 4. Seguridad

- **Encriptar backups:** Encriptar backups que contengan información sensible
- **Permisos:** Restringir acceso a archivos de backup
- **No commitear:** Nunca commitear backups al repositorio

### 5. Pruebas de Restore

- **Probar restore regularmente:** Asegurarse de que los backups funcionan
- **Documentar proceso:** Tener documentación clara del proceso de restore
- **Tiempo de restore:** Medir tiempo de restore para planificación

---

## 🚨 Restore de Emergencia

### Procedimiento Completo

1. **Detener servicios:**

   ```bash
   docker-compose down
   ```

2. **Restore de base de datos:**

   ```bash
   # Iniciar solo PostgreSQL
   docker-compose up -d postgres

   # Esperar a que PostgreSQL esté listo
   sleep 5

   # Restore
   docker exec -i carecore-postgres pg_restore -U "${KEYCLOAK_DB_USER}" \
     -d "${KEYCLOAK_DB_NAME}" \
     --clean \
     --if-exists \
     < keycloak/backups/db/keycloak-db-YYYYMMDD-HHMMSS.dump
   ```

3. **Restore del realm (si es necesario):**

   ```bash
   # Iniciar Keycloak
   docker-compose up -d keycloak

   # Esperar a que Keycloak esté listo
   sleep 30

   # Importar realm
   docker cp keycloak/backups/realms/carecore-realm-YYYYMMDD-HHMMSS.json \
     carecore-keycloak:/tmp/carecore-realm-import.json

   docker exec carecore-keycloak /opt/keycloak/bin/kc.sh import \
     --file /tmp/carecore-realm-import.json
   ```

4. **Verificar:**

   ```bash
   # Verificar que Keycloak esté funcionando
   curl http://localhost:${KEYCLOAK_HTTP_PORT}

   # Verificar que el realm exista
   # Acceder a Admin Console y verificar
   ```

---

## 📚 Referencias

- [Keycloak Export/Import](https://www.keycloak.org/docs/latest/server_admin/#_export_import)
- [PostgreSQL Backup](https://www.postgresql.org/docs/current/backup.html)
- [Docker Backup Best Practices](https://docs.docker.com/storage/volumes/#backup-restore-or-migrate-data-volumes)

---

## ⚠️ Advertencias

1. **Backups contienen información sensible:**
   - Usuarios y contraseñas (hasheadas)
   - Client secrets
   - Tokens y sesiones

2. **Nunca commitear backups:**
   - Agregar `keycloak/backups/` a `.gitignore`
   - No compartir backups públicamente

3. **Restore elimina datos actuales:**
   - Siempre hacer backup antes de restore
   - Verificar que el backup sea correcto antes de restore
