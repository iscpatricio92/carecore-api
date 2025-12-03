#!/bin/bash

# Script para verificar la configuración del cliente "carecore-web" en Keycloak
# Este script valida que el cliente público esté configurado correctamente

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Cargar variables de entorno
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# Variables requeridas (TODAS deben estar en .env.local, sin valores por defecto)
KEYCLOAK_URL="${KEYCLOAK_URL}"
KEYCLOAK_REALM="${KEYCLOAK_REALM}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD}"
CLIENT_ID="${KEYCLOAK_WEB_CLIENT_ID}"

# Validar que las variables requeridas estén definidas
if [ -z "$KEYCLOAK_URL" ]; then
  echo -e "${RED}❌ ERROR: KEYCLOAK_URL no está definida en .env.local${NC}"
  echo -e "${YELLOW}   Agrega KEYCLOAK_URL a tu archivo .env.local${NC}"
  exit 1
fi

if [ -z "$KEYCLOAK_REALM" ]; then
  echo -e "${RED}❌ ERROR: KEYCLOAK_REALM no está definida en .env.local${NC}"
  echo -e "${YELLOW}   Agrega KEYCLOAK_REALM a tu archivo .env.local${NC}"
  exit 1
fi

if [ -z "$KEYCLOAK_ADMIN" ]; then
  echo -e "${RED}❌ ERROR: KEYCLOAK_ADMIN no está definida en .env.local${NC}"
  echo -e "${YELLOW}   Agrega KEYCLOAK_ADMIN a tu archivo .env.local${NC}"
  exit 1
fi

if [ -z "$KEYCLOAK_ADMIN_PASSWORD" ]; then
  echo -e "${RED}❌ ERROR: KEYCLOAK_ADMIN_PASSWORD no está definida en .env.local${NC}"
  echo -e "${YELLOW}   Agrega KEYCLOAK_ADMIN_PASSWORD a tu archivo .env.local${NC}"
  exit 1
fi

if [ -z "$CLIENT_ID" ]; then
  echo -e "${RED}❌ ERROR: KEYCLOAK_WEB_CLIENT_ID no está definida en .env.local${NC}"
  echo -e "${YELLOW}   Agrega KEYCLOAK_WEB_CLIENT_ID a tu archivo .env.local${NC}"
  echo -e "${YELLOW}   Ejemplo: KEYCLOAK_WEB_CLIENT_ID=carecore-web${NC}"
  exit 1
fi

echo -e "${BLUE}🔍 Verificando configuración del cliente 'carecore-web'...${NC}\n"

# Verificar que Keycloak esté corriendo
echo -e "${BLUE}1. Verificando que Keycloak esté corriendo...${NC}"
if ! curl -s -f "${KEYCLOAK_URL}" > /dev/null 2>&1; then
  echo -e "${RED}❌ Keycloak no está accesible en ${KEYCLOAK_URL}${NC}"
  echo -e "${YELLOW}   Asegúrate de que los servicios estén corriendo: npm run docker:up${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Keycloak está corriendo${NC}\n"

# Obtener token de administrador
echo -e "${BLUE}2. Obteniendo token de administrador...${NC}"
ADMIN_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token' 2>/dev/null)

if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
  echo -e "${RED}❌ No se pudo obtener token de administrador${NC}"
  echo -e "${YELLOW}   Verifica KEYCLOAK_ADMIN y KEYCLOAK_ADMIN_PASSWORD en .env.local${NC}"
  echo -e "${YELLOW}   Asegúrate de que las credenciales sean correctas${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Token de administrador obtenido${NC}\n"

# Verificar que el realm existe
echo -e "${BLUE}3. Verificando que el realm '${KEYCLOAK_REALM}' existe...${NC}"
REALM_INFO=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" 2>/dev/null)

if echo "$REALM_INFO" | jq -e '.realm' > /dev/null 2>&1; then
  REALM_NAME=$(echo "$REALM_INFO" | jq -r '.displayName // .realm')
  echo -e "${GREEN}✅ Realm '${KEYCLOAK_REALM}' existe (${REALM_NAME})${NC}\n"
else
  echo -e "${RED}❌ Realm '${KEYCLOAK_REALM}' no existe${NC}"
  echo -e "${YELLOW}   Crea el realm primero siguiendo keycloak/REALM_SETUP.md${NC}"
  exit 1
fi

# Obtener información del cliente
echo -e "${BLUE}4. Verificando que el cliente '${CLIENT_ID}' existe...${NC}"
CLIENT_INFO=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${CLIENT_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" 2>/dev/null)

CLIENT_ID_INTERNAL=$(echo "$CLIENT_INFO" | jq -r '.[0].id // empty' 2>/dev/null)

if [ -z "$CLIENT_ID_INTERNAL" ] || [ "$CLIENT_ID_INTERNAL" = "null" ]; then
  echo -e "${RED}❌ Cliente '${CLIENT_ID}' no existe${NC}"
  echo -e "${YELLOW}   Crea el cliente primero siguiendo keycloak/CLIENT_WEB_SETUP.md${NC}"
  exit 1
fi

CLIENT_NAME=$(echo "$CLIENT_INFO" | jq -r '.[0].name // .[0].clientId' 2>/dev/null)
echo -e "${GREEN}✅ Cliente '${CLIENT_ID}' existe (${CLIENT_NAME})${NC}\n"

# Obtener detalles completos del cliente
echo -e "${BLUE}5. Verificando configuración del cliente...${NC}"
CLIENT_DETAILS=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients/${CLIENT_ID_INTERNAL}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" 2>/dev/null)

# Verificar tipo de cliente (debe ser público)
CLIENT_TYPE=$(echo "$CLIENT_DETAILS" | jq -r '.publicClient // false' 2>/dev/null)
if [ "$CLIENT_TYPE" = "true" ]; then
  echo -e "${GREEN}✅ Cliente es público (public)${NC}"
else
  echo -e "${RED}❌ Cliente NO es público (debe ser public)${NC}"
  echo -e "${YELLOW}   Configura 'Client authentication' en OFF en Keycloak Admin Console${NC}"
fi

# Verificar Standard Flow
STANDARD_FLOW=$(echo "$CLIENT_DETAILS" | jq -r '.standardFlowEnabled // false' 2>/dev/null)
if [ "$STANDARD_FLOW" = "true" ]; then
  echo -e "${GREEN}✅ Standard Flow (Authorization Code) habilitado${NC}"
else
  echo -e "${RED}❌ Standard Flow NO está habilitado${NC}"
  echo -e "${YELLOW}   Habilita 'Standard flow' en Keycloak Admin Console${NC}"
fi

# Verificar Direct Access Grants (debe estar OFF para cliente público)
DIRECT_GRANT=$(echo "$CLIENT_DETAILS" | jq -r '.directAccessGrantsEnabled // false' 2>/dev/null)
if [ "$DIRECT_GRANT" = "false" ]; then
  echo -e "${GREEN}✅ Direct Access Grants deshabilitado (correcto para cliente público)${NC}"
else
  echo -e "${YELLOW}⚠️  Direct Access Grants está habilitado (no recomendado para cliente público)${NC}"
fi

# Verificar Redirect URIs
REDIRECT_URIS=$(echo "$CLIENT_DETAILS" | jq -r '.redirectUris[]?' 2>/dev/null | tr '\n' ' ')
if [ -n "$REDIRECT_URIS" ]; then
  echo -e "${GREEN}✅ Redirect URIs configurados:${NC}"
  echo "$REDIRECT_URIS" | tr ' ' '\n' | sed 's/^/   - /'
else
  echo -e "${RED}❌ No hay Redirect URIs configurados${NC}"
  echo -e "${YELLOW}   Configura al menos un Redirect URI en Keycloak Admin Console${NC}"
fi

# Verificar Web Origins
WEB_ORIGINS=$(echo "$CLIENT_DETAILS" | jq -r '.webOrigins[]?' 2>/dev/null | tr '\n' ' ')
if [ -n "$WEB_ORIGINS" ]; then
  echo -e "${GREEN}✅ Web Origins configurados:${NC}"
  echo "$WEB_ORIGINS" | tr ' ' '\n' | sed 's/^/   - /'
else
  echo -e "${YELLOW}⚠️  No hay Web Origins configurados${NC}"
  echo -e "${YELLOW}   Considera agregar Web Origins para CORS${NC}"
fi

# Verificar PKCE (desde attributes)
PKCE_METHOD=$(echo "$CLIENT_DETAILS" | jq -r '.attributes."pkce.code.challenge.method" // empty' 2>/dev/null)
if [ -n "$PKCE_METHOD" ] && [ "$PKCE_METHOD" != "null" ]; then
  echo -e "${GREEN}✅ PKCE configurado con método: ${PKCE_METHOD}${NC}"
else
  echo -e "${RED}❌ PKCE NO está configurado${NC}"
  echo -e "${YELLOW}   Habilita PKCE con método S256 en Advanced settings${NC}"
fi

echo ""

# Probar endpoint de autorización (sin completar el flujo)
echo -e "${BLUE}6. Probando endpoint de autorización...${NC}"
AUTH_URL="${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth"
TEST_REDIRECT_URI=$(echo "$REDIRECT_URIS" | tr ' ' '\n' | head -1 | tr -d '\n')

if [ -n "$TEST_REDIRECT_URI" ]; then
  # Generar code_verifier y code_challenge para PKCE (ejemplo)
  CODE_VERIFIER=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-43)
  CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -binary -sha256 | openssl base64 | tr -d "=+/" | cut -c1-43)

  # Construir URL de autorización usando variables de entorno
  AUTH_TEST_URL="${AUTH_URL}?client_id=${CLIENT_ID}&redirect_uri=${TEST_REDIRECT_URI}&response_type=code&scope=openid&code_challenge=${CODE_CHALLENGE}&code_challenge_method=S256"

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$AUTH_TEST_URL" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✅ Endpoint de autorización responde correctamente (HTTP ${HTTP_CODE})${NC}"
    echo -e "${BLUE}   URL de prueba: ${AUTH_URL}${NC}"
  else
    echo -e "${YELLOW}⚠️  Endpoint de autorización respondió con HTTP ${HTTP_CODE}${NC}"
    echo -e "${YELLOW}   Esto puede ser normal si el redirect URI no está configurado correctamente${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  No se puede probar el endpoint sin Redirect URI configurado${NC}"
fi

echo ""

# Resumen
echo -e "${BLUE}📋 Resumen de verificación:${NC}"
echo -e "${GREEN}✅ Cliente '${CLIENT_ID}' configurado en realm '${KEYCLOAK_REALM}'${NC}"
echo -e "${BLUE}   Para probar el flujo completo, necesitarás un frontend o usar herramientas como:${NC}"
echo -e "${BLUE}   - Postman (con OAuth2 PKCE flow)${NC}"
echo -e "${BLUE}   - curl con manejo manual de PKCE${NC}"
echo -e "${BLUE}   - Herramientas online de testing OAuth2${NC}"
echo ""
echo -e "${GREEN}✅ Verificación completada${NC}"

