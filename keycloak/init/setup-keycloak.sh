#!/bin/bash

# Script maestro para configurar Keycloak completamente
# Este script importa el realm, crea roles, clientes y configuración inicial
#
# Uso:
#   ./keycloak/init/setup-keycloak.sh
#   O desde el directorio raíz:
#   bash keycloak/init/setup-keycloak.sh

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

# Variables con valores por defecto (solo para URLs y nombres, NO credenciales)
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-carecore}"
REALM_FILE="${REALM_FILE:-$PROJECT_ROOT/keycloak/realms/carecore-realm.json}"

# Variables requeridas (sin valores por defecto para seguridad)
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

echo -e "${BLUE}🔧 Configurando Keycloak para CareCore${NC}"
echo ""

# Verificar que Keycloak esté corriendo
echo -e "${YELLOW}⏳ Verificando que Keycloak esté disponible...${NC}"
if ! curl -s -f "${KEYCLOAK_URL}/health" > /dev/null 2>&1 && ! curl -s -f "${KEYCLOAK_URL}/realms/master" > /dev/null 2>&1; then
  echo -e "${RED}❌ Error: Keycloak no está disponible en ${KEYCLOAK_URL}${NC}"
  echo "   Asegúrate de que los servicios Docker estén corriendo:"
  echo "   make docker-up"
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
  echo -e "${RED}❌ Error: No se pudo obtener token de administrador${NC}"
  echo "   Verifica KEYCLOAK_ADMIN y KEYCLOAK_ADMIN_PASSWORD en .env.local"
  exit 1
fi
echo -e "${GREEN}✅ Token obtenido${NC}"
echo ""

# Función para verificar si el realm existe
realm_exists() {
  local response=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -w "%{http_code}" -o /dev/null)

  if [ "$response" = "200" ]; then
    return 0
  else
    return 1
  fi
}

# Paso 1: Importar realm
echo -e "${BLUE}📦 Paso 1: Importando realm '${KEYCLOAK_REALM}'...${NC}"
if realm_exists; then
  echo -e "${YELLOW}⚠️  El realm '${KEYCLOAK_REALM}' ya existe. ¿Deseas recrearlo? (s/N)${NC}"
  read -r response
  if [[ "$response" =~ ^[Ss]$ ]]; then
    echo -e "${YELLOW}🗑️  Eliminando realm existente...${NC}"
    curl -s -X DELETE "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}" \
      -H "Authorization: Bearer ${ACCESS_TOKEN}" \
      -H "Content-Type: application/json" > /dev/null
    echo -e "${GREEN}✅ Realm eliminado${NC}"
  else
    echo -e "${YELLOW}⏭️  Saltando importación del realm${NC}"
  fi
fi

if ! realm_exists; then
  if [ ! -f "$REALM_FILE" ]; then
    echo -e "${RED}❌ Error: No se encontró el archivo del realm: ${REALM_FILE}${NC}"
    exit 1
  fi

  echo -e "${YELLOW}📥 Importando realm desde ${REALM_FILE}...${NC}"
  # Leer JSON y eliminar campos no soportados por Keycloak API (_comment, etc.)
  # Usar jq si está disponible, sino usar sed/grep
  if command -v jq >/dev/null 2>&1; then
    REALM_JSON=$(jq -c 'del(._comment)' "${REALM_FILE}")
  else
    # Fallback: eliminar línea con _comment usando sed
    REALM_JSON=$(sed '/"_comment"/d' "${REALM_FILE}")
  fi

  if [ -z "$REALM_JSON" ]; then
    echo -e "${RED}❌ Error: No se pudo procesar el archivo JSON${NC}"
    exit 1
  fi

  IMPORT_RESPONSE=$(curl -s -X POST "${KEYCLOAK_URL}/admin/realms" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "${REALM_JSON}" \
    -w "\n%{http_code}")

  HTTP_CODE=$(echo "$IMPORT_RESPONSE" | tail -1)
  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "409" ]; then
    echo -e "${GREEN}✅ Realm importado exitosamente${NC}"
  else
    echo -e "${RED}❌ Error al importar realm (HTTP ${HTTP_CODE})${NC}"
    echo "$IMPORT_RESPONSE" | head -20
    exit 1
  fi
else
  echo -e "${GREEN}✅ Realm ya existe${NC}"
fi
echo ""

# Ejecutar scripts de configuración
echo -e "${BLUE}📋 Paso 2: Configurando roles...${NC}"
if [ -f "$SCRIPT_DIR/create-roles.sh" ]; then
  bash "$SCRIPT_DIR/create-roles.sh" "$ACCESS_TOKEN"
else
  echo -e "${YELLOW}⚠️  Script create-roles.sh no encontrado, saltando...${NC}"
fi
echo ""

echo -e "${BLUE}📋 Paso 3: Configurando cliente carecore-api...${NC}"
if [ -f "$SCRIPT_DIR/create-api-client.sh" ]; then
  bash "$SCRIPT_DIR/create-api-client.sh" "$ACCESS_TOKEN"
else
  echo -e "${YELLOW}⚠️  Script create-api-client.sh no encontrado, saltando...${NC}"
fi
echo ""

echo -e "${BLUE}📋 Paso 4: Configurando cliente carecore-web...${NC}"
if [ -f "$SCRIPT_DIR/create-web-client.sh" ]; then
  bash "$SCRIPT_DIR/create-web-client.sh" "$ACCESS_TOKEN"
else
  echo -e "${YELLOW}⚠️  Script create-web-client.sh no encontrado, saltando...${NC}"
fi
echo ""

echo -e "${GREEN}✅ Configuración de Keycloak completada${NC}"
echo ""
echo -e "${BLUE}📝 Próximos pasos:${NC}"
echo "   1. Verifica la configuración en Admin Console: ${KEYCLOAK_URL}"
echo "   2. Obtén el Client Secret de carecore-api y guárdalo en .env.local"
echo "   3. Verifica que los roles estén creados correctamente"
echo ""

