#!/bin/bash

# Script para obtener el Client Secret de carecore-api
# Este script obtiene el Client Secret del cliente carecore-api y lo muestra
# para que puedas copiarlo a .env.local
#
# Uso:
#   ./keycloak/init/get-client-secret.sh
#   O desde el directorio raíz:
#   bash keycloak/init/get-client-secret.sh

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Obtener directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Cargar variables de entorno
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  # Cargar variables de forma compatible (evita comentarios y líneas vacías)
  while IFS= read -r line || [ -n "$line" ]; do
    # Saltar comentarios y líneas vacías
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    # Exportar variable si contiene =
    if [[ "$line" =~ ^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*= ]]; then
      export "$line"
    fi
  done < "$PROJECT_ROOT/.env.local"
fi

# Variables con valores por defecto
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-carecore}"
CLIENT_ID="${1:-carecore-api}"

# Variables requeridas
if [ -z "$KEYCLOAK_ADMIN" ]; then
  echo -e "${RED}❌ Error: KEYCLOAK_ADMIN no está definida${NC}"
  echo "   Configúrala en .env.local"
  exit 1
fi

if [ -z "$KEYCLOAK_ADMIN_PASSWORD" ]; then
  echo -e "${RED}❌ Error: KEYCLOAK_ADMIN_PASSWORD no está definida${NC}"
  echo "   Configúrala en .env.local"
  exit 1
fi

echo -e "${BLUE}🔐 Obteniendo Client Secret para '${CLIENT_ID}'...${NC}"
echo ""

# Verificar que Keycloak esté disponible
if ! curl -s -f "${KEYCLOAK_URL}/health" > /dev/null 2>&1 && ! curl -s -f "${KEYCLOAK_URL}/realms/master" > /dev/null 2>&1; then
  echo -e "${RED}❌ Error: Keycloak no está disponible en ${KEYCLOAK_URL}${NC}"
  echo "   Asegúrate de que los servicios Docker estén corriendo:"
  echo "   make docker-up"
  exit 1
fi

# Obtener token de administrador
echo -e "${YELLOW}🔑 Obteniendo token de administrador...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  # Intentar con jq si está disponible
  if command -v jq >/dev/null 2>&1; then
    ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token // empty')
  fi
fi

if [ -z "$ACCESS_TOKEN" ] || [ "$ACCESS_TOKEN" = "null" ]; then
  echo -e "${RED}❌ Error: No se pudo obtener token de administrador${NC}"
  echo "   Verifica KEYCLOAK_ADMIN y KEYCLOAK_ADMIN_PASSWORD en .env.local"
  exit 1
fi

# Buscar el cliente
echo -e "${YELLOW}🔍 Buscando cliente '${CLIENT_ID}'...${NC}"
CLIENT_RESPONSE=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${CLIENT_ID}" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

# Extraer Client ID (UUID)
if command -v jq >/dev/null 2>&1; then
  CLIENT_UUID=$(echo "$CLIENT_RESPONSE" | jq -r '.[0].id // empty')
else
  CLIENT_UUID=$(echo "$CLIENT_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
fi

if [ -z "$CLIENT_UUID" ] || [ "$CLIENT_UUID" = "null" ]; then
  echo -e "${RED}❌ Error: No se encontró el cliente '${CLIENT_ID}'${NC}"
  echo "   Asegúrate de que el cliente existe en el realm '${KEYCLOAK_REALM}'"
  exit 1
fi

echo -e "${GREEN}✅ Cliente encontrado${NC}"

# Obtener Client Secret
echo -e "${YELLOW}🔐 Obteniendo Client Secret...${NC}"
SECRET_RESPONSE=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients/${CLIENT_UUID}/client-secret" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json")

# Extraer el secret
if command -v jq >/dev/null 2>&1; then
  CLIENT_SECRET=$(echo "$SECRET_RESPONSE" | jq -r '.value // empty')
else
  CLIENT_SECRET=$(echo "$SECRET_RESPONSE" | grep -o '"value":"[^"]*' | cut -d'"' -f4)
fi

# Si el secret está vacío, regenerarlo
if [ -z "$CLIENT_SECRET" ] || [ "$CLIENT_SECRET" = "null" ] || [ "$CLIENT_SECRET" = "empty" ]; then
  echo -e "${YELLOW}🔄 Client Secret vacío, regenerando...${NC}"
  SECRET_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients/${CLIENT_UUID}/client-secret" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json")

  if command -v jq >/dev/null 2>&1; then
    CLIENT_SECRET=$(echo "$SECRET_RESPONSE" | jq -r '.value // empty')
  else
    CLIENT_SECRET=$(echo "$SECRET_RESPONSE" | grep -o '"value":"[^"]*' | cut -d'"' -f4)
  fi
fi

if [ -z "$CLIENT_SECRET" ] || [ "$CLIENT_SECRET" = "null" ] || [ "$CLIENT_SECRET" = "empty" ]; then
  echo -e "${RED}❌ Error: No se pudo obtener el Client Secret${NC}"
  echo "   El cliente puede no tener Client Secret configurado (solo clientes confidential lo tienen)"
  exit 1
fi

# Mostrar el secret
echo ""
echo -e "${GREEN}✅ Client Secret obtenido exitosamente${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANTE: Guarda este Client Secret en .env.local:${NC}"
echo ""
echo -e "${BLUE}KEYCLOAK_CLIENT_SECRET=${CLIENT_SECRET}${NC}"
echo ""
echo -e "${YELLOW}💡 Tip: Puedes copiar la línea de arriba directamente a tu .env.local${NC}"
echo ""

