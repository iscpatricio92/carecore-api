#!/bin/bash

# Script para restaurar backup de Keycloak
# Restaura realm y base de datos desde un backup
#
# Uso:
#   ./scripts/restore-keycloak.sh <TIMESTAMP>
#   Ejemplo: ./scripts/restore-keycloak.sh 20251205-143022
#   O desde Makefile: make keycloak-restore BACKUP_TIMESTAMP=20251205-143022

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

# Verificar argumento
TIMESTAMP="$1"
if [ -z "$TIMESTAMP" ]; then
  echo -e "${RED}❌ Error: Se requiere TIMESTAMP del backup${NC}"
  echo ""
  echo "Uso:"
  echo "  ./scripts/restore-keycloak.sh <TIMESTAMP>"
  echo ""
  echo "Ejemplo:"
  echo "  ./scripts/restore-keycloak.sh 20251205-143022"
  echo ""
  echo "Para ver backups disponibles:"
  echo "  ls -la keycloak/backups/realms/"
  exit 1
fi

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

# Archivos de backup
REALM_BACKUP="keycloak/backups/realms/carecore-realm-${TIMESTAMP}.json"
DB_BACKUP="keycloak/backups/db/keycloak-db-${TIMESTAMP}.dump"

# Verificar que los archivos existan
if [ ! -f "${REALM_BACKUP}" ]; then
  echo -e "${RED}❌ Error: Archivo de realm no encontrado: ${REALM_BACKUP}${NC}"
  echo ""
  echo "Backups disponibles:"
  ls -1 keycloak/backups/realms/ 2>/dev/null || echo "  (ninguno)"
  exit 1
fi

if [ ! -f "${DB_BACKUP}" ]; then
  echo -e "${RED}❌ Error: Archivo de base de datos no encontrado: ${DB_BACKUP}${NC}"
  echo ""
  echo "Backups disponibles:"
  ls -1 keycloak/backups/db/ 2>/dev/null || echo "  (ninguno)"
  exit 1
fi

echo -e "${YELLOW}⚠️  ADVERTENCIA: Esta operación eliminará todos los datos actuales de Keycloak${NC}"
echo -e "${YELLOW}   Se restaurará desde el backup del ${TIMESTAMP}${NC}"
echo ""
read -p "¿Estás seguro de que deseas continuar? (escribe 'yes' para confirmar): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${BLUE}Operación cancelada${NC}"
  exit 0
fi

echo ""
echo -e "${BLUE}=== Iniciando restore de Keycloak ===${NC}"
echo -e "${BLUE}Timestamp del backup: ${TIMESTAMP}${NC}"
echo ""

# Verificar que los contenedores estén corriendo
if ! docker ps | grep -q "carecore-postgres"; then
  echo -e "${RED}❌ Error: Contenedor carecore-postgres no está corriendo${NC}"
  echo -e "${YELLOW}   Ejecuta 'make docker-up' primero${NC}"
  exit 1
fi

# 1. Detener Keycloak antes de restaurar base de datos
echo -e "${YELLOW}1. Deteniendo Keycloak...${NC}"
if docker ps | grep -q "carecore-keycloak"; then
  docker-compose stop keycloak 2>/dev/null || docker stop carecore-keycloak 2>/dev/null
  echo -e "${GREEN}✅ Keycloak detenido${NC}"
else
  echo -e "${YELLOW}⚠️  Keycloak ya estaba detenido${NC}"
fi

# 2. Restore de la base de datos
echo ""
echo -e "${YELLOW}2. Restaurando base de datos '${KEYCLOAK_DB_NAME}'...${NC}"

# Esperar a que PostgreSQL esté listo
echo "   Esperando a que PostgreSQL esté listo..."
for i in {1..10}; do
  if docker exec carecore-postgres pg_isready -U "${DB_USER}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Restore desde archivo custom
if docker exec -i carecore-postgres pg_restore -U "${DB_USER}" \
  -d "${KEYCLOAK_DB_NAME}" \
  --clean \
  --if-exists \
  < "${DB_BACKUP}" 2>&1; then
  echo -e "${GREEN}✅ Base de datos restaurada${NC}"
else
  echo -e "${RED}❌ Error al restaurar base de datos${NC}"
  echo -e "${YELLOW}   Verifica que la base de datos '${KEYCLOAK_DB_NAME}' exista${NC}"
  exit 1
fi

# 3. Iniciar Keycloak
echo ""
echo -e "${YELLOW}3. Iniciando Keycloak...${NC}"
docker-compose up -d keycloak 2>/dev/null || docker start carecore-keycloak 2>/dev/null

# Esperar a que Keycloak esté listo
echo "   Esperando a que Keycloak esté listo (esto puede tardar 30-60 segundos)..."
for i in {1..60}; do
  if curl -s "${KEYCLOAK_URL}" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Keycloak está listo${NC}"
    break
  fi
  if [ $i -eq 60 ]; then
    echo -e "${YELLOW}⚠️  Keycloak puede no estar completamente listo, pero continuando...${NC}"
  fi
  sleep 1
done

# 4. Restore del realm (opcional, ya que la BD contiene todo)
echo ""
echo -e "${YELLOW}4. Verificando configuración del realm...${NC}"

# Obtener token de administrador
TOKEN_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ] && command -v jq >/dev/null 2>&1; then
  ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')
fi

if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
  # Verificar si el realm existe
  HTTP_CODE=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -w "%{http_code}" \
    -o /dev/null)

  if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Realm '${KEYCLOAK_REALM}' existe y está accesible${NC}"
    echo -e "${BLUE}   La base de datos ya contiene toda la configuración${NC}"
  else
    echo -e "${YELLOW}⚠️  Realm no encontrado, importando desde JSON...${NC}"

    # Eliminar campo _comment si existe
    TEMP_REALM=$(mktemp)
    if command -v jq >/dev/null 2>&1; then
      jq 'del(._comment)' "${REALM_BACKUP}" > "${TEMP_REALM}"
    else
      cp "${REALM_BACKUP}" "${TEMP_REALM}"
    fi

    # Importar realm
    IMPORT_CODE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" \
      -d @"${TEMP_REALM}" \
      -w "%{http_code}" \
      -o /dev/null)

    rm -f "${TEMP_REALM}"

    if [ "$IMPORT_CODE" = "201" ] || [ "$IMPORT_CODE" = "409" ]; then
      echo -e "${GREEN}✅ Realm importado/actualizado${NC}"
    else
      echo -e "${YELLOW}⚠️  No se pudo importar realm (HTTP ${IMPORT_CODE}), pero la BD ya está restaurada${NC}"
    fi
  fi
else
  echo -e "${YELLOW}⚠️  No se pudo obtener token de administrador${NC}"
  echo -e "${YELLOW}   Verifica KEYCLOAK_ADMIN y KEYCLOAK_ADMIN_PASSWORD${NC}"
  echo -e "${BLUE}   La base de datos ya está restaurada, el realm debería estar disponible${NC}"
fi

echo ""
echo -e "${GREEN}✅ Restore completado${NC}"
echo ""
echo -e "${BLUE}📋 Próximos pasos:${NC}"
echo -e "${BLUE}   1. Verifica que Keycloak esté funcionando: ${KEYCLOAK_URL}${NC}"
echo -e "${BLUE}   2. Accede a Admin Console y verifica el realm '${KEYCLOAK_REALM}'${NC}"
echo -e "${BLUE}   3. Verifica que los clientes y roles estén presentes${NC}"

