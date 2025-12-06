#!/bin/bash

# Script para crear roles base del sistema en Keycloak
# Este script crea todos los roles necesarios para CareCore
#
# Uso:
#   ./keycloak/init/create-roles.sh <access_token>
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
  source <(grep -E "^KEYCLOAK_|^NODE_ENV=" "$PROJECT_ROOT/.env.local" | sed 's/^/export /')
fi

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-carecore}"

# Definir roles a crear (compatible con bash 3.x)
# Formato: role_name|description
ROLES=(
  "patient|Patient user, owner of his medical information. Can read, give consent, revoke, share and export his own data."
  "practitioner|Certified medical professional. Can create and update clinical records, read data of assigned patients. Requires identity verification."
  "viewer|User with temporary read-only access. Used for second opinions and consultations with temporary scopes."
  "lab|Integrated laboratory system. Can create and read laboratory results with limited scopes."
  "insurer|Integrated insurance system. Can read data with consent and limited scopes."
  "system|External system integrated. Specific permissions according to integration."
  "admin|System administrator. Full access, user management, practitioner verification."
  "audit|Audit user. Can read audit logs and internal operations."
)

# Función para verificar si un rol existe
role_exists() {
  local role_name="$1"
  local response=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/${role_name}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -w "%{http_code}" -o /dev/null)

  if [ "$response" = "200" ]; then
    return 0
  else
    return 1
  fi
}

# Función para crear un rol
create_role() {
  local role_name="$1"
  local description="$2"

  if role_exists "$role_name"; then
    echo -e "   ${YELLOW}⏭️  Rol '${role_name}' ya existe, saltando...${NC}"
    return 0
  fi

  local role_json=$(cat <<EOF
{
  "name": "${role_name}",
  "description": "${description}",
  "composite": false,
  "clientRole": false
}
EOF
)

  local response=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$role_json" \
    -w "%{http_code}" -o /dev/null)

  local http_code="${response: -3}"
  if [ "$http_code" = "201" ] || [ "$http_code" = "409" ]; then
    echo -e "   ${GREEN}✅ Rol '${role_name}' creado${NC}"
    return 0
  else
    echo -e "   ${RED}❌ Error al crear rol '${role_name}' (HTTP ${http_code})${NC}"
    return 1
  fi
}

# Crear todos los roles
echo -e "${BLUE}🔧 Creando roles base del sistema...${NC}"
CREATED=0
SKIPPED=0
FAILED=0

for role_data in "${ROLES[@]}"; do
  role_name=$(echo "$role_data" | cut -d'|' -f1)
  description=$(echo "$role_data" | cut -d'|' -f2-)
  if create_role "$role_name" "$description"; then
    if role_exists "$role_name"; then
      CREATED=$((CREATED + 1))
    else
      SKIPPED=$((SKIPPED + 1))
    fi
  else
    FAILED=$((FAILED + 1))
  fi
done

echo ""
echo -e "${GREEN}✅ Roles procesados: ${CREATED} creados, ${SKIPPED} ya existían${NC}"
if [ $FAILED -gt 0 ]; then
  echo -e "${RED}⚠️  ${FAILED} roles fallaron${NC}"
fi

