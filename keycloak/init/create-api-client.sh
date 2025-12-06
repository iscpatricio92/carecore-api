#!/bin/bash

# Script para crear el cliente carecore-api en Keycloak
# Este script crea el cliente confidential para la API backend
#
# Uso:
#   ./keycloak/init/create-api-client.sh <access_token>
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
  source <(grep -E "^KEYCLOAK_|^PORT=|^API_INTERNAL_PORT=" "$PROJECT_ROOT/.env.local" | sed 's/^/export /')
fi

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-carecore}"
CLIENT_ID="carecore-api"
API_URL="${PORT:-3000}"
API_BASE_URL="http://localhost:${API_URL}"

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
  "name": "CareCore API",
  "description": "Cliente confidential para la API backend de CareCore",
  "enabled": true,
  "clientAuthenticatorType": "client-secret",
  "secret": "",
  "redirectUris": [
    "${API_BASE_URL}/api/auth/callback",
    "${API_BASE_URL}/api/auth/callback/*"
  ],
  "webOrigins": [
    "${API_BASE_URL}"
  ],
  "standardFlowEnabled": true,
  "directAccessGrantsEnabled": true,
  "implicitFlowEnabled": false,
  "serviceAccountsEnabled": true,
  "publicClient": false,
  "protocol": "openid-connect",
  "attributes": {
    "access.token.lifespan": "300",
    "client.session.idle.timeout": "1800",
    "client.session.max.lifespan": "36000"
  }
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

# Obtener o regenerar client secret
if [ -n "$CLIENT_UUID" ]; then
  echo -e "   ${YELLOW}🔐 Obteniendo Client Secret...${NC}"
  SECRET_RESPONSE=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients/${CLIENT_UUID}/client-secret" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")

  # Intentar extraer el secret usando jq si está disponible, sino usar grep
  if command -v jq >/dev/null 2>&1; then
    CLIENT_SECRET=$(echo "$SECRET_RESPONSE" | jq -r '.value // empty')
  else
    CLIENT_SECRET=$(echo "$SECRET_RESPONSE" | grep -o '"value":"[^"]*' | cut -d'"' -f4)
  fi

  # Si el secret está vacío, regenerarlo
  if [ -z "$CLIENT_SECRET" ] || [ "$CLIENT_SECRET" = "null" ] || [ "$CLIENT_SECRET" = "empty" ]; then
    echo -e "   ${YELLOW}🔄 Client Secret vacío, regenerando...${NC}"
    SECRET_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients/${CLIENT_UUID}/client-secret" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json")

    if command -v jq >/dev/null 2>&1; then
      CLIENT_SECRET=$(echo "$SECRET_RESPONSE" | jq -r '.value // empty')
    else
      CLIENT_SECRET=$(echo "$SECRET_RESPONSE" | grep -o '"value":"[^"]*' | cut -d'"' -f4)
    fi
  fi

  if [ -n "$CLIENT_SECRET" ] && [ "$CLIENT_SECRET" != "null" ] && [ "$CLIENT_SECRET" != "empty" ]; then
    echo -e "   ${GREEN}✅ Client Secret obtenido${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANTE: Guarda este Client Secret en .env.local:${NC}"
    echo -e "${BLUE}KEYCLOAK_CLIENT_SECRET=${CLIENT_SECRET}${NC}"
    echo ""
  else
    echo -e "   ${YELLOW}⚠️  No se pudo obtener el Client Secret automáticamente${NC}"
    echo -e "   ${YELLOW}   Obténlo manualmente desde Admin Console → Clients → ${CLIENT_ID} → Credentials${NC}"
    echo -e "   ${YELLOW}   O ejecuta: make keycloak-get-secret${NC}"
  fi
fi

echo -e "${GREEN}✅ Cliente '${CLIENT_ID}' configurado${NC}"

