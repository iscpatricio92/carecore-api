#!/bin/bash

# Script para inicializar la configuración de Keycloak automáticamente
# Este script verifica si el realm, roles, clientes y scopes existen, y los crea si no existen
# Se ejecuta automáticamente después de que Keycloak esté listo
#
# Características:
# - ✅ Verificación rápida: Solo verifica si todo existe antes de ejecutar
# - ✅ Silencioso: No muestra output cuando todo está configurado (ahorra recursos)
# - ✅ Eficiente: Ejecuta setup solo si falta algo
# - ✅ Idempotente: Se puede ejecutar múltiples veces sin problemas
#
# Uso:
#   - Automático: Se ejecuta desde Makefile después de docker-up
#   - Manual: bash scripts/init-keycloak-config.sh

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Obtener directorio del script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Cargar variables de entorno
if [ -f "$PROJECT_ROOT/.env.local" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    if [[ "$line" =~ ^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*= ]]; then
      export "$line"
    fi
  done < "$PROJECT_ROOT/.env.local"
fi

# Variables con valores por defecto
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-carecore}"

# Variables requeridas
if [ -z "$KEYCLOAK_ADMIN" ] || [ -z "$KEYCLOAK_ADMIN_PASSWORD" ]; then
  echo -e "${YELLOW}⚠️  KEYCLOAK_ADMIN o KEYCLOAK_ADMIN_PASSWORD no están definidas${NC}"
  echo -e "${YELLOW}   Saltando inicialización automática de Keycloak${NC}"
  echo -e "${YELLOW}   Ejecuta 'make keycloak-setup' manualmente después de configurar .env.local${NC}"
  exit 0
fi

# Función para verificar si Keycloak está listo
keycloak_ready() {
  if curl -s -f "${KEYCLOAK_URL}/health" > /dev/null 2>&1 || \
     curl -s -f "${KEYCLOAK_URL}/realms/master" > /dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

# Función para verificar si el realm existe
realm_exists() {
  local token="$1"
  local response=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json" \
    -w "%{http_code}" -o /dev/null)

  if [ "$response" = "200" ]; then
    return 0
  else
    return 1
  fi
}

# Función para verificar si los roles existen
roles_exist() {
  local token="$1"
  local required_roles=("patient" "practitioner" "viewer" "lab" "insurer" "system" "admin" "audit")
  local missing_roles=0

  for role in "${required_roles[@]}"; do
    local response=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/${role}" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json" \
      -w "%{http_code}" -o /dev/null)

    if [ "$response" != "200" ]; then
      missing_roles=$((missing_roles + 1))
    fi
  done

  if [ $missing_roles -eq 0 ]; then
    return 0
  else
    return 1
  fi
}

# Función para verificar si los clientes existen
clients_exist() {
  local token="$1"
  local required_clients=("carecore-api" "carecore-web")
  local missing_clients=0

  for client_id in "${required_clients[@]}"; do
    local response=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${client_id}" \
      -H "Authorization: Bearer ${token}" \
      -H "Content-Type: application/json")

    local count=0
    if command -v jq >/dev/null 2>&1; then
      count=$(echo "$response" | jq 'length')
    else
      count=$(echo "$response" | grep -o '"id"' | wc -l)
    fi

    if [ "$count" -eq 0 ]; then
      missing_clients=$((missing_clients + 1))
    fi
  done

  if [ $missing_clients -eq 0 ]; then
    return 0
  else
    return 1
  fi
}

# Función para verificar si los scopes existen
scopes_exist() {
  local token="$1"
  local required_scopes=("patient:read" "patient:write" "practitioner:read" "practitioner:write" "encounter:read" "encounter:write" "document:read" "document:write" "consent:read" "consent:write" "consent:share")
  local missing_scopes=0

  # Obtener todos los scopes del realm
  local response=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/client-scopes" \
    -H "Authorization: Bearer ${token}" \
    -H "Content-Type: application/json")

  for scope_name in "${required_scopes[@]}"; do
    local found=0
    if command -v jq >/dev/null 2>&1; then
      local count=$(echo "$response" | jq -r "[.[] | select(.name == \"${scope_name}\")] | length")
      if [ "$count" -gt 0 ]; then
        found=1
      fi
    else
      if echo "$response" | grep -q "\"name\":\"${scope_name}\""; then
        found=1
      fi
    fi

    if [ "$found" -eq 0 ]; then
      missing_scopes=$((missing_scopes + 1))
    fi
  done

  if [ $missing_scopes -eq 0 ]; then
    return 0
  else
    return 1
  fi
}

# Verificar rápidamente si Keycloak está listo (sin esperar mucho)
# Si no está listo, salir silenciosamente (se ejecutará en el próximo intento)
if ! keycloak_ready; then
  # Esperar solo unos segundos para el primer intento
  sleep 3
  if ! keycloak_ready; then
    # Si aún no está listo, salir silenciosamente
    # El script se ejecutará de nuevo en el próximo docker-up si es necesario
    exit 0
  fi
fi

# Obtener token de administrador (silencioso si falla)
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
  echo -e "${YELLOW}⚠️  No se pudo obtener token de administrador${NC}"
  echo -e "${YELLOW}   Ejecuta 'make keycloak-setup' manualmente${NC}"
  exit 0
fi

# Verificar configuración completa (realm, roles, clientes, scopes) de forma rápida
REALM_OK=false
ROLES_OK=false
CLIENTS_OK=false
SCOPES_OK=false

if realm_exists "$ACCESS_TOKEN"; then
  REALM_OK=true
  # Verificar roles, clientes y scopes solo si el realm existe (ahorra tiempo)
  if roles_exist "$ACCESS_TOKEN"; then
    ROLES_OK=true
  fi

  if clients_exist "$ACCESS_TOKEN"; then
    CLIENTS_OK=true
  fi

  if scopes_exist "$ACCESS_TOKEN"; then
    SCOPES_OK=true
  fi
fi

# Si todo está configurado, salir silenciosamente (sin output)
# Esto hace que el script sea rápido y no moleste cuando todo está bien
if [ "$REALM_OK" = true ] && [ "$ROLES_OK" = true ] && [ "$CLIENTS_OK" = true ] && [ "$SCOPES_OK" = true ]; then
  # Salir silenciosamente - todo está bien
  exit 0
fi

# Si falta algo, mostrar qué falta y ejecutar setup
echo -e "${YELLOW}🔍 Verificando configuración de Keycloak...${NC}"

if [ "$REALM_OK" = false ]; then
  echo -e "   ${YELLOW}⚠️  Realm '${KEYCLOAK_REALM}' no existe${NC}"
fi

if [ "$REALM_OK" = true ] && [ "$ROLES_OK" = false ]; then
  echo -e "   ${YELLOW}⚠️  Faltan algunos roles${NC}"
fi

if [ "$REALM_OK" = true ] && [ "$CLIENTS_OK" = false ]; then
  echo -e "   ${YELLOW}⚠️  Faltan algunos clientes${NC}"
fi

if [ "$REALM_OK" = true ] && [ "$SCOPES_OK" = false ]; then
  echo -e "   ${YELLOW}⚠️  Faltan algunos scopes OAuth2${NC}"
fi

# Si solo faltan scopes, ejecutar solo el script de scopes (más eficiente)
if [ "$REALM_OK" = true ] && [ "$ROLES_OK" = true ] && [ "$CLIENTS_OK" = true ] && [ "$SCOPES_OK" = false ]; then
  echo ""
  echo -e "${YELLOW}🔧 Creando scopes OAuth2 faltantes...${NC}"
  echo ""
  if [ -f "$PROJECT_ROOT/keycloak/init/create-scopes.sh" ]; then
    bash "$PROJECT_ROOT/keycloak/init/create-scopes.sh" "$ACCESS_TOKEN" || {
      echo -e "${YELLOW}⚠️  Error al crear scopes${NC}"
      echo -e "${YELLOW}   Ejecuta 'make keycloak-create-scopes' manualmente${NC}"
      exit 0
    }
    echo ""
    echo -e "${GREEN}✅ Scopes OAuth2 creados exitosamente${NC}"
    exit 0
  else
    echo -e "${YELLOW}⚠️  Script create-scopes.sh no encontrado${NC}"
    echo -e "${YELLOW}   Ejecuta 'make keycloak-create-scopes' manualmente${NC}"
    exit 0
  fi
fi

# Si falta algo más (realm, roles o clientes), ejecutar setup completo
if [ "$REALM_OK" = false ] || [ "$ROLES_OK" = false ] || [ "$CLIENTS_OK" = false ]; then
  echo ""
  echo -e "${YELLOW}🔧 Configuración incompleta, ejecutando setup automático...${NC}"
  echo ""

  # Ejecutar el script de setup
  if [ -f "$PROJECT_ROOT/keycloak/init/setup-keycloak.sh" ]; then
    # Ejecutar de forma no interactiva (no recrear realm si existe)
    echo "N" | bash "$PROJECT_ROOT/keycloak/init/setup-keycloak.sh" || {
      echo -e "${YELLOW}⚠️  Error al ejecutar setup automático${NC}"
      echo -e "${YELLOW}   Ejecuta 'make keycloak-setup' manualmente${NC}"
      exit 0
    }
    echo ""
    echo -e "${GREEN}✅ Configuración automática de Keycloak completada${NC}"
  else
    echo -e "${YELLOW}⚠️  Script de setup no encontrado${NC}"
    echo -e "${YELLOW}   Ejecuta 'make keycloak-setup' manualmente${NC}"
  fi
fi

