#!/bin/bash

# Script para asignar el rol "practitioner" a un usuario en Keycloak
#
# Uso:
#   ./scripts/assign-practitioner-role.sh <username>
#   Ejemplo: ./scripts/assign-practitioner-role.sh dr.smith
#   O desde Makefile: make assign-practitioner-role USERNAME=dr.smith

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
USERNAME="$1"
if [ -z "$USERNAME" ]; then
  echo -e "${RED}❌ Error: Se requiere USERNAME${NC}"
  echo ""
  echo "Uso:"
  echo "  ./scripts/assign-practitioner-role.sh <username>"
  echo ""
  echo "Ejemplo:"
  echo "  ./scripts/assign-practitioner-role.sh dr.smith"
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

echo -e "${BLUE}=== Asignando rol 'practitioner' a usuario '${USERNAME}' ===${NC}"
echo ""

# Verificar que Keycloak esté corriendo
if ! docker ps | grep -q "carecore-keycloak"; then
  echo -e "${RED}❌ Error: Contenedor carecore-keycloak no está corriendo${NC}"
  echo -e "${YELLOW}   Ejecuta 'make docker-up' primero${NC}"
  exit 1
fi

# 1. Obtener token de administrador
echo -e "${YELLOW}1. Obteniendo token de administrador...${NC}"

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

if [ -z "$ACCESS_TOKEN" ] && command -v jq >/dev/null 2>&1; then
  ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')
fi

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo -e "${RED}❌ Error: No se pudo extraer access token${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Token obtenido${NC}"

# 2. Buscar usuario
echo ""
echo -e "${YELLOW}2. Buscando usuario '${USERNAME}'...${NC}"

USER_RESPONSE=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users?username=${USERNAME}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

if command -v jq >/dev/null 2>&1; then
  USER_COUNT=$(echo "$USER_RESPONSE" | jq 'length')
  if [ "$USER_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ Error: Usuario '${USERNAME}' no encontrado${NC}"
    exit 1
  fi
  USER_ID=$(echo "$USER_RESPONSE" | jq -r '.[0].id')
  USER_EMAIL=$(echo "$USER_RESPONSE" | jq -r '.[0].email // "N/A"')
else
  USER_COUNT=$(echo "$USER_RESPONSE" | grep -o '"id"' | wc -l)
  if [ "$USER_COUNT" -eq 0 ]; then
    echo -e "${RED}❌ Error: Usuario '${USERNAME}' no encontrado${NC}"
    exit 1
  fi
  USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
  USER_EMAIL="N/A"
fi

echo -e "${GREEN}✅ Usuario encontrado${NC}"
echo -e "   ID: ${USER_ID}"
echo -e "   Email: ${USER_EMAIL}"

# 3. Verificar si el rol ya está asignado
echo ""
echo -e "${YELLOW}3. Verificando roles actuales...${NC}"

CURRENT_ROLES=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${USER_ID}/role-mappings/realm" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

if command -v jq >/dev/null 2>&1; then
  HAS_ROLE=$(echo "$CURRENT_ROLES" | jq -r '.[] | select(.name == "practitioner") | .name')
else
  HAS_ROLE=$(echo "$CURRENT_ROLES" | grep -o '"name":"practitioner"' | head -1)
fi

if [ -n "$HAS_ROLE" ] && [ "$HAS_ROLE" != "null" ]; then
  echo -e "${YELLOW}⚠️  El usuario ya tiene el rol 'practitioner' asignado${NC}"
  echo -e "${GREEN}✅ No se requiere acción adicional${NC}"
  exit 0
fi

# 4. Obtener el rol practitioner
echo ""
echo -e "${YELLOW}4. Obteniendo rol 'practitioner'...${NC}"

ROLE_RESPONSE=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/practitioner" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

if command -v jq >/dev/null 2>&1; then
  ROLE_ID=$(echo "$ROLE_RESPONSE" | jq -r '.id // empty')
  if [ -z "$ROLE_ID" ] || [ "$ROLE_ID" = "null" ]; then
    echo -e "${RED}❌ Error: Rol 'practitioner' no encontrado en el realm${NC}"
    echo -e "${YELLOW}   Ejecuta 'make keycloak-setup' para crear los roles${NC}"
    exit 1
  fi
else
  ROLE_ID=$(echo "$ROLE_RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
  if [ -z "$ROLE_ID" ]; then
    echo -e "${RED}❌ Error: Rol 'practitioner' no encontrado en el realm${NC}"
    echo -e "${YELLOW}   Ejecuta 'make keycloak-setup' para crear los roles${NC}"
    exit 1
  fi
fi

echo -e "${GREEN}✅ Rol 'practitioner' encontrado${NC}"

# 5. Asignar rol al usuario
echo ""
echo -e "${YELLOW}5. Asignando rol 'practitioner' al usuario...${NC}"

ROLE_JSON="[{\"id\":\"${ROLE_ID}\",\"name\":\"practitioner\"}]"

HTTP_CODE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${USER_ID}/role-mappings/realm" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$ROLE_JSON" \
  -w "%{http_code}" \
  -o /dev/null)

if [ "$HTTP_CODE" = "204" ] || [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ Rol 'practitioner' asignado exitosamente${NC}"
else
  echo -e "${RED}❌ Error al asignar rol (HTTP ${HTTP_CODE})${NC}"
  exit 1
fi

# 6. Verificar asignación
echo ""
echo -e "${YELLOW}6. Verificando asignación...${NC}"

sleep 1

VERIFY_ROLES=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${USER_ID}/role-mappings/realm" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

if command -v jq >/dev/null 2>&1; then
  VERIFY_HAS_ROLE=$(echo "$VERIFY_ROLES" | jq -r '.[] | select(.name == "practitioner") | .name')
else
  VERIFY_HAS_ROLE=$(echo "$VERIFY_ROLES" | grep -o '"name":"practitioner"' | head -1)
fi

if [ -n "$VERIFY_HAS_ROLE" ] && [ "$VERIFY_HAS_ROLE" != "null" ]; then
  echo -e "${GREEN}✅ Verificación exitosa: El usuario tiene el rol 'practitioner'${NC}"
else
  echo -e "${YELLOW}⚠️  El rol fue asignado pero no se pudo verificar${NC}"
  echo -e "${YELLOW}   Verifica manualmente en Keycloak Admin Console${NC}"
fi

echo ""
echo -e "${BLUE}📋 Próximos pasos:${NC}"
echo -e "${BLUE}   1. El usuario puede iniciar sesión y tendrá el rol 'practitioner'${NC}"
echo -e "${BLUE}   2. Para verificación de identidad, el usuario puede enviar documentos:${NC}"
echo -e "${BLUE}      POST /api/auth/verify-practitioner${NC}"
echo -e "${BLUE}   3. Un admin puede revisar y aprobar la verificación:${NC}"
echo -e "${BLUE}      PUT /api/auth/verify-practitioner/:id/review${NC}"

