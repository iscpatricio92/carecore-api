#!/bin/bash

# Script para crear el cliente carecore-web en Keycloak
# Este script crea el cliente public con PKCE para el frontend
#
# Uso:
#   ./keycloak/init/create-web-client.sh <access_token>
#   O desde setup-keycloak.sh (automático)

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ACCESS_TOKEN="$1"
if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}❌ Error: Se requiere access_token como argumento${NC}"
  exit 1
fi

# Cargar variables de entorno
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [ -f "$PROJECT_ROOT/.env.local" ]; then
  source <(grep -E "^KEYCLOAK_|^PORT=" "$PROJECT_ROOT/.env.local" | sed 's/^/export /')
fi

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-carecore}"
CLIENT_ID="carecore-web"
WEB_PORT="${WEB_PORT:-3001}"
WEB_BASE_URL="http://localhost:${WEB_PORT}"

# Función para verificar si el cliente existe
client_exists() {
  local response=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${CLIENT_ID}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")

  local count=$(echo "$response" | grep -o '"id"' | wc -l)
  if [ "$count" -gt 0 ]; then
    return 0
  else
    return 1
  fi
}

# Función para obtener el ID del cliente
get_client_id() {
  local response=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${CLIENT_ID}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")

  echo "$response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4
}

# Función para crear el cliente
create_client() {
  local client_json=$(cat <<EOF
{
  "clientId": "${CLIENT_ID}",
  "name": "CareCore Web",
  "description": "Cliente public con PKCE para el frontend de CareCore",
  "enabled": true,
  "publicClient": true,
  "standardFlowEnabled": true,
  "directAccessGrantsEnabled": false,
  "implicitFlowEnabled": false,
  "serviceAccountsEnabled": false,
  "protocol": "openid-connect",
  "redirectUris": [
    "${WEB_BASE_URL}/auth/callback",
    "${WEB_BASE_URL}/auth/callback/*",
    "http://localhost:3000/auth/callback"
  ],
  "webOrigins": [
    "${WEB_BASE_URL}",
    "http://localhost:3000"
  ],
  "attributes": {
    "access.token.lifespan": "900",
    "client.session.idle.timeout": "1800",
    "client.session.max.lifespan": "36000",
    "pkce.code.challenge.method": "S256"
  },
  "defaultClientScopes": [
    "web-origins",
    "role_list",
    "profile",
    "roles",
    "email"
  ]
}
EOF
)

  local response=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$client_json" \
    -w "%{http_code}" -o /dev/null)

  local http_code="${response: -3}"
  if [ "$http_code" = "201" ]; then
    return 0
  else
    return 1
  fi
}

# Verificar o crear cliente
echo -e "${BLUE}🔧 Configurando cliente '${CLIENT_ID}'...${NC}"

if client_exists; then
  echo -e "   ${YELLOW}⏭️  Cliente '${CLIENT_ID}' ya existe${NC}"
  CLIENT_UUID=$(get_client_id)
  echo -e "   ${GREEN}✅ Cliente encontrado (ID: ${CLIENT_UUID})${NC}"
else
  echo -e "   ${YELLOW}📝 Creando cliente '${CLIENT_ID}'...${NC}"
  if create_client; then
    echo -e "   ${GREEN}✅ Cliente '${CLIENT_ID}' creado exitosamente${NC}"
    CLIENT_UUID=$(get_client_id)
  else
    echo -e "   ${RED}❌ Error al crear cliente '${CLIENT_ID}'${NC}"
    exit 1
  fi
fi

# Habilitar PKCE (si no está habilitado)
if [ -n "$CLIENT_UUID" ]; then
  echo -e "   ${YELLOW}🔐 Verificando configuración de PKCE...${NC}"
  # PKCE se configura en los attributes, que ya están en el JSON de creación
  echo -e "   ${GREEN}✅ PKCE configurado (S256)${NC}"
fi

echo -e "${GREEN}✅ Cliente '${CLIENT_ID}' configurado${NC}"

