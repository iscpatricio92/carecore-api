#!/bin/bash

# Script para hacer backup del realm de Keycloak (incluyendo scopes)
# Este script exporta la configuración completa del realm a un archivo JSON
#
# Uso:
#   ./scripts/backup-keycloak-realm.sh
#   O: make keycloak-backup-realm

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cargar variables de entorno
# PROJECT_ROOT es el root del monorepo (3 niveles arriba desde scripts/)
# Desde packages/api/scripts/ -> packages/api/ -> packages/ -> root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

if [ -f "$PROJECT_ROOT/.env.local" ]; then
  # Cargar variables de .env.local
  while IFS= read -r line || [ -n "$line" ]; do
    # Ignorar comentarios y líneas vacías
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    # Exportar variables que empiezan con KEYCLOAK_, PORT=, o API_INTERNAL_PORT=
    if [[ "$line" =~ ^[[:space:]]*(KEYCLOAK_|PORT=|API_INTERNAL_PORT=) ]]; then
      export "$line"
    fi
  done < "$PROJECT_ROOT/.env.local"
fi

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-carecore}"

# Verificar que las credenciales estén configuradas
if [ -z "$KEYCLOAK_ADMIN" ] || [ -z "$KEYCLOAK_ADMIN_PASSWORD" ]; then
  echo -e "${RED}❌ Error: KEYCLOAK_ADMIN y KEYCLOAK_ADMIN_PASSWORD deben estar configurados${NC}"
  echo "   Configúralos en .env.local antes de ejecutar este script"
  exit 1
fi

# Directorio de backups
BACKUP_DIR="${PROJECT_ROOT}/packages/api/keycloak/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/carecore-realm-${TIMESTAMP}.json"

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

echo -e "${BLUE}🔄 Iniciando backup del realm '${KEYCLOAK_REALM}'...${NC}"
echo ""

# Verificar que Keycloak esté disponible
echo -e "${YELLOW}⏳ Verificando que Keycloak esté disponible...${NC}"
if ! curl -s -f "${KEYCLOAK_URL}/health" > /dev/null 2>&1 && ! curl -s -f "${KEYCLOAK_URL}/realms/master" > /dev/null 2>&1; then
  echo -e "${RED}❌ Error: Keycloak no está disponible en ${KEYCLOAK_URL}${NC}"
  echo "   Asegúrate de que los servicios Docker estén corriendo:"
  echo "   npm run docker:up"
  exit 1
fi
echo -e "${GREEN}✅ Keycloak está disponible${NC}"
echo ""

# Obtener token de administrador
echo -e "${YELLOW}🔐 Obteniendo token de administrador...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  if command -v jq >/dev/null 2>&1; then
    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')
  fi
fi

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo -e "${RED}❌ Error: No se pudo obtener token de administrador${NC}"
  echo "   Verifica KEYCLOAK_ADMIN y KEYCLOAK_ADMIN_PASSWORD en .env.local"
  exit 1
fi
echo -e "${GREEN}✅ Token obtenido${NC}"
echo ""

# Verificar que el realm existe
echo -e "${YELLOW}⏳ Verificando que el realm '${KEYCLOAK_REALM}' existe...${NC}"
HTTP_CODE=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "%{http_code}" \
  -o /dev/null)

if [ "$HTTP_CODE" != "200" ]; then
  echo -e "${RED}❌ Error: El realm '${KEYCLOAK_REALM}' no existe${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Realm '${KEYCLOAK_REALM}' encontrado${NC}"
echo ""

# Exportar realm completo (incluye scopes, clientes, roles, etc.)
echo -e "${YELLOW}📦 Exportando configuración del realm...${NC}"
HTTP_CODE=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -w "%{http_code}" \
  -o "$BACKUP_FILE")

if [ "$HTTP_CODE" = "200" ] && [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
  # Verificar que el JSON es válido
  if command -v jq >/dev/null 2>&1; then
    if jq empty "$BACKUP_FILE" 2>/dev/null; then
      # Limpiar información sensible (opcional, comentado por defecto)
      # jq 'del(.users)' "$BACKUP_FILE" > "${BACKUP_FILE}.tmp" && mv "${BACKUP_FILE}.tmp" "$BACKUP_FILE"

      echo -e "${GREEN}✅ Backup creado exitosamente${NC}"
      echo ""
      echo -e "${BLUE}📄 Archivo de backup:${NC}"
      echo -e "   ${GREEN}${BACKUP_FILE}${NC}"
      echo ""

      # Mostrar información del backup
      REALM_NAME=$(jq -r '.realm // "N/A"' "$BACKUP_FILE")
      CLIENT_SCOPES_COUNT=$(jq -r '.clientScopes | length // 0' "$BACKUP_FILE")
      CLIENTS_COUNT=$(jq -r '.clients | length // 0' "$BACKUP_FILE")
      ROLES_COUNT=$(jq -r '.roles.realm | length // 0' "$BACKUP_FILE")
      FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)

      echo -e "${BLUE}📊 Información del backup:${NC}"
      echo -e "   Realm: ${GREEN}${REALM_NAME}${NC}"
      echo -e "   Client Scopes: ${GREEN}${CLIENT_SCOPES_COUNT}${NC}"
      echo -e "   Clients: ${GREEN}${CLIENTS_COUNT}${NC}"
      echo -e "   Roles: ${GREEN}${ROLES_COUNT}${NC}"
      echo -e "   Tamaño: ${GREEN}${FILE_SIZE}${NC}"
      echo ""

      # Crear symlink al último backup
      LATEST_BACKUP="${BACKUP_DIR}/carecore-realm-latest.json"
      if [ -L "$LATEST_BACKUP" ]; then
        rm "$LATEST_BACKUP"
      fi
      ln -s "$(basename "$BACKUP_FILE")" "$LATEST_BACKUP"
      echo -e "${GREEN}✅ Symlink creado: ${LATEST_BACKUP}${NC}"
      echo ""

      echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
      echo -e "   ${YELLOW}•${NC} Revisa el archivo antes de commitear (puede contener información sensible)"
      echo -e "   ${YELLOW}•${NC} Considera eliminar usuarios del backup si lo vas a versionar"
      echo -e "   ${YELLOW}•${NC} El backup incluye: realm, clientes, scopes, roles, flows, etc."
      echo ""
    else
      echo -e "${RED}❌ Error: El archivo JSON no es válido${NC}"
      rm -f "$BACKUP_FILE"
      exit 1
    fi
  else
    echo -e "${GREEN}✅ Backup creado exitosamente${NC}"
    echo -e "${YELLOW}⚠️  Nota: jq no está instalado, no se pudo validar el JSON${NC}"
    echo ""
    echo -e "${BLUE}📄 Archivo de backup:${NC}"
    echo -e "   ${GREEN}${BACKUP_FILE}${NC}"
    echo ""
  fi
else
  echo -e "${RED}❌ Error: No se pudo crear el backup${NC}"
  echo "   HTTP Code: ${HTTP_CODE}"
  if [ -f "$BACKUP_FILE" ]; then
    rm -f "$BACKUP_FILE"
  fi
  exit 1
fi

echo -e "${GREEN}✅ Backup completado exitosamente${NC}"

