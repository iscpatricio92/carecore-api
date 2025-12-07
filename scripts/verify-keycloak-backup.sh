#!/bin/bash

# Script para verificar que un backup de Keycloak es válido y completo
# Verifica integridad de archivos, formato JSON, y estructura
#
# Uso:
#   ./scripts/verify-keycloak-backup.sh <TIMESTAMP>
#   Ejemplo: ./scripts/verify-keycloak-backup.sh 20251206-180617
#   O desde Makefile: make keycloak-verify-backup BACKUP_TIMESTAMP=20251206-180617

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
TIMESTAMP="$1"
if [ -z "$TIMESTAMP" ]; then
  echo -e "${RED}❌ Error: Se requiere TIMESTAMP del backup${NC}"
  echo ""
  echo "Uso:"
  echo "  ./scripts/verify-keycloak-backup.sh <TIMESTAMP>"
  echo ""
  echo "Ejemplo:"
  echo "  ./scripts/verify-keycloak-backup.sh 20251206-180617"
  echo ""
  echo "Para ver backups disponibles:"
  echo "  ls -la keycloak/backups/realms/"
  exit 1
fi

# Archivos de backup
REALM_BACKUP="keycloak/backups/realms/carecore-realm-${TIMESTAMP}.json"
DB_BACKUP="keycloak/backups/db/keycloak-db-${TIMESTAMP}.dump"
INFO_FILE="keycloak/backups/backup-info-${TIMESTAMP}.txt"

echo -e "${BLUE}=== Verificando backup de Keycloak ===${NC}"
echo -e "${BLUE}Timestamp: ${TIMESTAMP}${NC}"
echo ""

# Contador de errores
ERRORS=0
WARNINGS=0

# 1. Verificar que los archivos existan
echo -e "${YELLOW}1. Verificando existencia de archivos...${NC}"

if [ ! -f "${REALM_BACKUP}" ]; then
  echo -e "${RED}   ❌ Archivo de realm no encontrado: ${REALM_BACKUP}${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}   ✅ Archivo de realm encontrado${NC}"
fi

if [ ! -f "${DB_BACKUP}" ]; then
  echo -e "${RED}   ❌ Archivo de base de datos no encontrado: ${DB_BACKUP}${NC}"
  ERRORS=$((ERRORS + 1))
else
  echo -e "${GREEN}   ✅ Archivo de base de datos encontrado${NC}"
fi

if [ ! -f "${INFO_FILE}" ]; then
  echo -e "${YELLOW}   ⚠️  Archivo de información no encontrado: ${INFO_FILE}${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}   ✅ Archivo de información encontrado${NC}"
fi

# 2. Verificar que los archivos no estén vacíos
echo ""
echo -e "${YELLOW}2. Verificando tamaño de archivos...${NC}"

if [ -f "${REALM_BACKUP}" ]; then
  SIZE=$(stat -f%z "${REALM_BACKUP}" 2>/dev/null || stat -c%s "${REALM_BACKUP}" 2>/dev/null || echo "0")
  if [ "$SIZE" -eq 0 ]; then
    echo -e "${RED}   ❌ Archivo de realm está vacío${NC}"
    ERRORS=$((ERRORS + 1))
  else
    SIZE_HR=$(du -h "${REALM_BACKUP}" | cut -f1)
    echo -e "${GREEN}   ✅ Archivo de realm: ${SIZE_HR} (${SIZE} bytes)${NC}"
  fi
fi

if [ -f "${DB_BACKUP}" ]; then
  SIZE=$(stat -f%z "${DB_BACKUP}" 2>/dev/null || stat -c%s "${DB_BACKUP}" 2>/dev/null || echo "0")
  if [ "$SIZE" -eq 0 ]; then
    echo -e "${RED}   ❌ Archivo de base de datos está vacío${NC}"
    ERRORS=$((ERRORS + 1))
  else
    SIZE_HR=$(du -h "${DB_BACKUP}" | cut -f1)
    echo -e "${GREEN}   ✅ Archivo de base de datos: ${SIZE_HR} (${SIZE} bytes)${NC}"
  fi
fi

# 3. Verificar formato JSON del realm
echo ""
echo -e "${YELLOW}3. Verificando formato JSON del realm...${NC}"

if [ -f "${REALM_BACKUP}" ]; then
  # Verificar que sea JSON válido
  if command -v jq >/dev/null 2>&1; then
    if jq . "${REALM_BACKUP}" >/dev/null 2>&1; then
      echo -e "${GREEN}   ✅ JSON válido${NC}"

      # Verificar campos importantes
      if jq -e '.realm' "${REALM_BACKUP}" >/dev/null 2>&1; then
        REALM_NAME=$(jq -r '.realm' "${REALM_BACKUP}")
        echo -e "${GREEN}   ✅ Realm name: ${REALM_NAME}${NC}"
      else
        echo -e "${RED}   ❌ Campo 'realm' no encontrado${NC}"
        ERRORS=$((ERRORS + 1))
      fi

      # Verificar que tenga roles
      ROLES_COUNT=$(jq '.roles.realm | length' "${REALM_BACKUP}" 2>/dev/null || echo "0")
      if [ "$ROLES_COUNT" -gt 0 ]; then
        echo -e "${GREEN}   ✅ Roles encontrados: ${ROLES_COUNT}${NC}"
      else
        echo -e "${YELLOW}   ⚠️  No se encontraron roles (puede ser normal si se crean después)${NC}"
        WARNINGS=$((WARNINGS + 1))
      fi

      # Verificar que tenga clientes
      CLIENTS_COUNT=$(jq '.clients | length' "${REALM_BACKUP}" 2>/dev/null || echo "0")
      if [ "$CLIENTS_COUNT" -gt 0 ]; then
        echo -e "${GREEN}   ✅ Clientes encontrados: ${CLIENTS_COUNT}${NC}"
      else
        echo -e "${YELLOW}   ⚠️  No se encontraron clientes (puede ser normal si se crean después)${NC}"
        WARNINGS=$((WARNINGS + 1))
      fi
    else
      echo -e "${RED}   ❌ JSON inválido${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  else
    # Verificación básica sin jq
    if grep -q '"realm"' "${REALM_BACKUP}"; then
      echo -e "${GREEN}   ✅ Contiene campo 'realm' (verificación básica)${NC}"
      echo -e "${YELLOW}   ⚠️  Instala 'jq' para verificación completa${NC}"
      WARNINGS=$((WARNINGS + 1))
    else
      echo -e "${RED}   ❌ No parece ser un JSON válido de realm${NC}"
      ERRORS=$((ERRORS + 1))
    fi
  fi
fi

# 4. Verificar formato del dump de PostgreSQL
echo ""
echo -e "${YELLOW}4. Verificando formato del dump de PostgreSQL...${NC}"

if [ -f "${DB_BACKUP}" ]; then
  # Verificar que sea un archivo custom de pg_dump (formato binario)
  # Los dumps custom tienen un header específico
  HEADER=$(head -c 5 "${DB_BACKUP}" 2>/dev/null || echo "")

  # pg_dump custom format tiene un header "PGDMP"
  if echo "$HEADER" | grep -q "PGDMP" || file "${DB_BACKUP}" | grep -q "PostgreSQL"; then
    echo -e "${GREEN}   ✅ Formato de dump válido${NC}"
  else
    # Puede ser formato SQL (texto)
    if head -1 "${DB_BACKUP}" | grep -q "PostgreSQL\|CREATE\|--"; then
      echo -e "${GREEN}   ✅ Formato SQL válido${NC}"
    else
      echo -e "${YELLOW}   ⚠️  Formato no reconocido (puede ser válido)${NC}"
      WARNINGS=$((WARNINGS + 1))
    fi
  fi

  # Verificar que no esté corrupto (intentar leer las primeras líneas)
  if head -10 "${DB_BACKUP}" >/dev/null 2>&1; then
    echo -e "${GREEN}   ✅ Archivo es legible${NC}"
  else
    echo -e "${RED}   ❌ Archivo no es legible (posible corrupción)${NC}"
    ERRORS=$((ERRORS + 1))
  fi
fi

# 5. Verificar archivo de información
echo ""
echo -e "${YELLOW}5. Verificando archivo de información...${NC}"

if [ -f "${INFO_FILE}" ]; then
  if grep -q "Timestamp: ${TIMESTAMP}" "${INFO_FILE}"; then
    echo -e "${GREEN}   ✅ Timestamp coincide${NC}"
  else
    echo -e "${YELLOW}   ⚠️  Timestamp no coincide${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi

  if grep -q "Realm:" "${INFO_FILE}" && grep -q "Database:" "${INFO_FILE}"; then
    echo -e "${GREEN}   ✅ Contiene información de archivos${NC}"
  else
    echo -e "${YELLOW}   ⚠️  Falta información de archivos${NC}"
    WARNINGS=$((WARNINGS + 1))
  fi
fi

# 6. Resumen
echo ""
echo -e "${BLUE}=== Resumen de Verificación ===${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ Backup válido y completo${NC}"
  echo ""
  echo -e "${GREEN}El backup está listo para ser usado en restore${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Backup válido con ${WARNINGS} advertencia(s)${NC}"
  echo ""
  echo -e "${YELLOW}El backup puede ser usado, pero revisa las advertencias${NC}"
  exit 0
else
  echo -e "${RED}❌ Backup inválido con ${ERRORS} error(es) y ${WARNINGS} advertencia(s)${NC}"
  echo ""
  echo -e "${RED}No se recomienda usar este backup para restore${NC}"
  exit 1
fi

