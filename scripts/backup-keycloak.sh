#!/bin/bash

# Script para hacer backup completo de Keycloak
# Incluye: realm, base de datos, y metadatos
#
# Uso:
#   ./scripts/backup-keycloak.sh
#   O desde Makefile: make keycloak-backup

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Obtener directorio del proyecto
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Cargar variables de entorno
if [ -f ".env.local" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    if [[ "$line" =~ ^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*= ]]; then
      export "$line"
    fi
  done < ".env.local"
fi

# Variables con valores por defecto
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-carecore}"
KEYCLOAK_DB_NAME="${KEYCLOAK_DB_NAME:-keycloak_db}"
DB_USER="${DB_USER:-carecore}"

# Directorio de backups
BACKUP_DIR="keycloak/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Crear directorios si no existen
mkdir -p "${BACKUP_DIR}/db"
mkdir -p "${BACKUP_DIR}/realms"

echo -e "${BLUE}=== Iniciando backup de Keycloak ===${NC}"
echo -e "${BLUE}Timestamp: ${TIMESTAMP}${NC}"
echo ""

# Verificar que los contenedores estén corriendo
if ! docker ps | grep -q "carecore-keycloak"; then
  echo -e "${RED}❌ Error: Contenedor carecore-keycloak no está corriendo${NC}"
  echo -e "${YELLOW}   Ejecuta 'make docker-up' primero${NC}"
  exit 1
fi

if ! docker ps | grep -q "carecore-postgres"; then
  echo -e "${RED}❌ Error: Contenedor carecore-postgres no está corriendo${NC}"
  echo -e "${YELLOW}   Ejecuta 'make docker-up' primero${NC}"
  exit 1
fi

# 1. Backup del realm usando API de Keycloak (más confiable)
echo -e "${YELLOW}1. Exportando realm '${KEYCLOAK_REALM}'...${NC}"

# Obtener token de administrador
TOKEN_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password")

if [ $? -ne 0 ] || [ -z "$TOKEN_RESPONSE" ]; then
  echo -e "${RED}❌ Error: No se pudo obtener token de administrador${NC}"
  echo -e "${YELLOW}   Verifica KEYCLOAK_ADMIN y KEYCLOAK_ADMIN_PASSWORD en .env.local${NC}"
  exit 1
fi

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  # Intentar con jq si está disponible
  if command -v jq >/dev/null 2>&1; then
    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')
  fi
fi

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo -e "${RED}❌ Error: No se pudo extraer access token${NC}"
  echo -e "${YELLOW}   Respuesta: ${TOKEN_RESPONSE}${NC}"
  exit 1
fi

# Exportar realm
REALM_BACKUP="${BACKUP_DIR}/realms/carecore-realm-${TIMESTAMP}.json"
HTTP_CODE=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "%{http_code}" \
  -o "${REALM_BACKUP}")

if [ "$HTTP_CODE" = "200" ] && [ -f "${REALM_BACKUP}" ] && [ -s "${REALM_BACKUP}" ]; then
  # Verificar que el JSON sea válido
  if command -v jq >/dev/null 2>&1; then
    if jq . "${REALM_BACKUP}" >/dev/null 2>&1; then
      echo -e "${GREEN}✅ Realm exportado: ${REALM_BACKUP}${NC}"
    else
      echo -e "${RED}❌ Error: El archivo exportado no es un JSON válido${NC}"
      rm -f "${REALM_BACKUP}"
      exit 1
    fi
  else
    # Verificación básica sin jq
    if grep -q '"realm"' "${REALM_BACKUP}"; then
      echo -e "${GREEN}✅ Realm exportado: ${REALM_BACKUP}${NC}"
    else
      echo -e "${RED}❌ Error: El archivo exportado parece inválido${NC}"
      rm -f "${REALM_BACKUP}"
      exit 1
    fi
  fi
else
  echo -e "${RED}❌ Error al exportar realm (HTTP ${HTTP_CODE})${NC}"
  rm -f "${REALM_BACKUP}"
  exit 1
fi

# 2. Backup de la base de datos
echo ""
echo -e "${YELLOW}2. Exportando base de datos '${KEYCLOAK_DB_NAME}'...${NC}"

DB_BACKUP="${BACKUP_DIR}/db/keycloak-db-${TIMESTAMP}.dump"

# Intentar backup con formato custom (más eficiente)
if docker exec carecore-postgres pg_dump -U "${DB_USER}" \
  -d "${KEYCLOAK_DB_NAME}" \
  -F c \
  > "${DB_BACKUP}" 2>/dev/null; then

  if [ -f "${DB_BACKUP}" ] && [ -s "${DB_BACKUP}" ]; then
    echo -e "${GREEN}✅ Base de datos exportada: ${DB_BACKUP}${NC}"
  else
    echo -e "${RED}❌ Error: El archivo de backup está vacío${NC}"
    rm -f "${DB_BACKUP}"
    exit 1
  fi
else
  echo -e "${RED}❌ Error al exportar base de datos${NC}"
  echo -e "${YELLOW}   Verifica que la base de datos '${KEYCLOAK_DB_NAME}' exista${NC}"
  rm -f "${DB_BACKUP}"
  exit 1
fi

# 3. Crear archivo de información del backup
INFO_FILE="${BACKUP_DIR}/backup-info-${TIMESTAMP}.txt"
cat > "${INFO_FILE}" <<EOF
Keycloak Backup Information
===========================
Timestamp: ${TIMESTAMP}
Date: $(date)

Files:
- Realm: ${REALM_BACKUP}
- Database: ${DB_BACKUP}

Keycloak Version: $(docker exec carecore-keycloak /opt/keycloak/bin/kc.sh version 2>/dev/null | head -1 || echo "N/A")
PostgreSQL Version: $(docker exec carecore-postgres psql --version 2>/dev/null || echo "N/A")

Environment:
- KEYCLOAK_URL: ${KEYCLOAK_URL}
- KEYCLOAK_REALM: ${KEYCLOAK_REALM}
- KEYCLOAK_DB_NAME: ${KEYCLOAK_DB_NAME}
- DB_USER: ${DB_USER}

Backup Size:
- Realm: $(du -h "${REALM_BACKUP}" | cut -f1)
- Database: $(du -h "${DB_BACKUP}" | cut -f1)

To restore this backup, use:
  make keycloak-restore BACKUP_TIMESTAMP=${TIMESTAMP}

Or manually:
  ./scripts/restore-keycloak.sh ${TIMESTAMP}
EOF

echo ""
echo -e "${GREEN}✅ Backup completado exitosamente${NC}"
echo -e "${BLUE}📁 Archivos guardados en: ${BACKUP_DIR}${NC}"
echo -e "${BLUE}📄 Información: ${INFO_FILE}${NC}"
echo ""
echo -e "${BLUE}ℹ️  NOTA IMPORTANTE:${NC}"
echo -e "${BLUE}   - El backup de la base de datos contiene TODO (roles, clientes, usuarios, etc.)${NC}"
echo -e "${BLUE}   - El JSON del realm es complementario (configuración básica)${NC}"
echo -e "${BLUE}   - El restore restaura primero la base de datos, que incluye toda la configuración${NC}"
echo ""
echo -e "${YELLOW}⚠️  SEGURIDAD:${NC}"
echo -e "${YELLOW}   - Los backups contienen información sensible${NC}"
echo -e "${YELLOW}   - No commitees estos archivos al repositorio${NC}"
echo -e "${YELLOW}   - Guarda los backups en un lugar seguro${NC}"

