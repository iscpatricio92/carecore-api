#!/bin/bash

# Script para crear los client scopes OAuth2 en Keycloak
# Este script crea todos los scopes necesarios para permisos granulares de recursos FHIR
#
# Uso:
#   ./keycloak/init/create-scopes.sh <access_token>
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

# Definir todos los scopes a crear
# Formato: "scope_name|description"
SCOPES=(
  "patient:read|Read access to Patient resources"
  "patient:write|Create and update access to Patient resources"
  "practitioner:read|Read access to Practitioner resources"
  "practitioner:write|Create and update access to Practitioner resources"
  "encounter:read|Read access to Encounter resources"
  "encounter:write|Create and update access to Encounter resources"
  "document:read|Read access to DocumentReference resources"
  "document:write|Create and update access to DocumentReference resources"
  "consent:read|Read access to Consent resources"
  "consent:write|Create and update access to Consent resources"
  "consent:share|Share consent with practitioners"
)

# Función para verificar si un scope existe
scope_exists() {
  local scope_name="$1"
  local response=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/client-scopes" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")

  if command -v jq >/dev/null 2>&1; then
    local count=$(echo "$response" | jq -r "[.[] | select(.name == \"${scope_name}\")] | length")
    if [ "$count" -gt 0 ]; then
      return 0
    else
      return 1
    fi
  else
    # Fallback sin jq
    if echo "$response" | grep -q "\"name\":\"${scope_name}\""; then
      return 0
    else
      return 1
    fi
  fi
}

# Función para obtener el ID de un scope
get_scope_id() {
  local scope_name="$1"
  local response=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/client-scopes" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")

  if command -v jq >/dev/null 2>&1; then
    echo "$response" | jq -r ".[] | select(.name == \"${scope_name}\") | .id"
  else
    # Fallback sin jq
    echo "$response" | grep -A 5 "\"name\":\"${scope_name}\"" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4
  fi
}

# Función para crear un scope
create_scope() {
  local scope_name="$1"
  local description="$2"

  local scope_json=$(cat <<EOF
{
  "name": "${scope_name}",
  "description": "${description}",
  "protocol": "openid-connect",
  "attributes": {
    "include.in.token.scope": "true",
    "display.on.consent.screen": "false"
  }
}
EOF
)

  local response=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/client-scopes" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$scope_json" \
    -w "\n%{http_code}")

  local http_code=$(echo "$response" | tail -1)
  if [ "$http_code" = "201" ]; then
    return 0
  else
    return 1
  fi
}

# Función para asignar scope al cliente carecore-api
assign_scope_to_client() {
  local scope_id="$1"
  local client_id="carecore-api"

  # Obtener ID del cliente
  local client_response=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${client_id}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")

  local client_uuid=""
  if command -v jq >/dev/null 2>&1; then
    client_uuid=$(echo "$client_response" | jq -r '.[0].id // empty')
  else
    client_uuid=$(echo "$client_response" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  fi

  if [ -z "$client_uuid" ] || [ "$client_uuid" = "null" ]; then
    echo -e "${YELLOW}⚠️  Cliente '${client_id}' no encontrado, saltando asignación de scope${NC}"
    return 1
  fi

  # Verificar si el scope ya está asignado
  local assigned_scopes=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients/${client_uuid}/default-client-scopes" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")

  local already_assigned=false
  if command -v jq >/dev/null 2>&1; then
    local count=$(echo "$assigned_scopes" | jq -r "[.[] | select(.id == \"${scope_id}\")] | length")
    if [ "$count" -gt 0 ]; then
      already_assigned=true
    fi
  else
    if echo "$assigned_scopes" | grep -q "\"id\":\"${scope_id}\""; then
      already_assigned=true
    fi
  fi

  if [ "$already_assigned" = true ]; then
    return 0
  fi

  # Asignar scope como default client scope
  local http_code=$(curl -s -X PUT "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients/${client_uuid}/default-client-scopes/${scope_id}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -w "%{http_code}" \
    -o /dev/null)

  if [ "$http_code" = "204" ] || [ "$http_code" = "200" ]; then
    return 0
  else
    return 1
  fi
}

# Verificar o crear cliente
echo -e "${BLUE}🔧 Configurando client scopes para '${KEYCLOAK_REALM}'...${NC}"

CREATED_COUNT=0
EXISTING_COUNT=0
ASSIGNED_COUNT=0

# Crear cada scope
for scope_data in "${SCOPES[@]}"; do
  scope_name=$(echo "$scope_data" | cut -d'|' -f1)
  description=$(echo "$scope_data" | cut -d'|' -f2-)

  if scope_exists "$scope_name"; then
    echo -e "   ${YELLOW}⏭️  Scope '${scope_name}' ya existe${NC}"
    EXISTING_COUNT=$((EXISTING_COUNT + 1))
  else
    echo -e "   ${YELLOW}📝 Creando scope '${scope_name}'...${NC}"
    if create_scope "$scope_name" "$description"; then
      echo -e "   ${GREEN}✅ Scope '${scope_name}' creado exitosamente${NC}"
      CREATED_COUNT=$((CREATED_COUNT + 1))
    else
      echo -e "   ${RED}❌ Error al crear scope '${scope_name}'${NC}"
      continue
    fi
  fi

  # Asignar scope al cliente carecore-api
  scope_id=$(get_scope_id "$scope_name")
  if [ -n "$scope_id" ] && [ "$scope_id" != "null" ]; then
    if assign_scope_to_client "$scope_id"; then
      echo -e "   ${GREEN}✅ Scope '${scope_name}' asignado a cliente 'carecore-api'${NC}"
      ASSIGNED_COUNT=$((ASSIGNED_COUNT + 1))
    else
      echo -e "   ${YELLOW}⚠️  No se pudo asignar scope '${scope_name}' al cliente${NC}"
    fi
  fi
done

echo ""
echo -e "${GREEN}✅ Configuración de scopes completada${NC}"
echo -e "   ${GREEN}✓${NC} Scopes creados: ${CREATED_COUNT}"
echo -e "   ${YELLOW}⏭️${NC} Scopes existentes: ${EXISTING_COUNT}"
echo -e "   ${GREEN}✓${NC} Scopes asignados: ${ASSIGNED_COUNT}"
echo ""

