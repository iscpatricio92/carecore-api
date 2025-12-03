#!/bin/bash

# Script para verificar los criterios de aceptación de la Tarea #1: Keycloak Setup
# Uso: ./scripts/verify-keycloak-setup.sh

set -e

echo "🔍 Verificando criterios de aceptación de Keycloak..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de criterios
PASSED=0
FAILED=0

# Función para verificar criterio
check_criterion() {
    local name=$1
    local check_command=$2

    echo -n "Verificando: $name... "
    if eval "$check_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASÓ${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}❌ FALLÓ${NC}"
        ((FAILED++))
        return 1
    fi
}

# Criterio 1: Keycloak inicia correctamente con docker-compose up
echo "📋 Criterio 1: Keycloak inicia correctamente con docker-compose up"
check_criterion "Contenedor Keycloak está corriendo" \
    "docker ps --filter 'name=carecore-keycloak' --filter 'status=running' --format '{{.Names}}' | grep -q carecore-keycloak"

if [ $? -eq 0 ]; then
    echo "   ℹ️  Contenedor Keycloak está activo"
else
    echo "   ⚠️  Contenedor Keycloak no está corriendo. Ejecuta: npm run docker:up"
fi
echo ""

# Criterio 2: Keycloak accesible en http://localhost:8080
echo "📋 Criterio 2: Keycloak accesible en http://localhost:8080"
check_criterion "Puerto 8080 está escuchando" \
    "nc -z localhost 8080 || curl -s -o /dev/null -w '%{http_code}' http://localhost:8080 | grep -q '200\|302\|401'"

if [ $? -eq 0 ]; then
    HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080 || echo "000")
    echo "   ℹ️  HTTP Status Code: $HTTP_CODE"
    echo "   ℹ️  URL: http://localhost:8080"
else
    echo "   ⚠️  No se puede conectar a http://localhost:8080"
    echo "   ⚠️  Verifica que Keycloak esté corriendo: docker ps | grep keycloak"
fi
echo ""

# Criterio 3: Admin console carga correctamente
echo "📋 Criterio 3: Admin console carga correctamente"
check_criterion "Admin console responde" \
    "curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/admin | grep -q '200\|302'"

if [ $? -eq 0 ]; then
    ADMIN_CODE=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/admin || echo "000")
    echo "   ℹ️  Admin Console HTTP Status: $ADMIN_CODE"
    echo "   ℹ️  URL: http://localhost:8080/admin"
    echo "   ℹ️  Credenciales: admin / (ver KEYCLOAK_ADMIN_PASSWORD en .env)"
else
    echo "   ⚠️  Admin console no responde correctamente"
    echo "   ⚠️  Verifica los logs: npm run docker:keycloak:logs"
fi
echo ""

# Criterio 4: Base de datos keycloak_db se crea automáticamente
echo "📋 Criterio 4: Base de datos keycloak_db se crea automáticamente"
check_criterion "Base de datos keycloak_db existe" \
    "docker exec carecore-postgres psql -U \${DB_USER:-carecore} -lqt | cut -d \| -f 1 | grep -qw keycloak_db"

if [ $? -eq 0 ]; then
    echo "   ℹ️  Base de datos keycloak_db encontrada"
    # Intentar obtener más información
    DB_INFO=$(docker exec carecore-postgres psql -U ${DB_USER:-carecore} -lqt 2>/dev/null | grep keycloak_db || echo "")
    if [ ! -z "$DB_INFO" ]; then
        echo "   ℹ️  $DB_INFO"
    fi
else
    echo "   ⚠️  Base de datos keycloak_db no encontrada"
    echo "   ⚠️  Esto puede ser normal si Keycloak aún está iniciando"
    echo "   ⚠️  Keycloak crea la base de datos automáticamente en el primer inicio"
    echo "   ⚠️  Verifica los logs: npm run docker:keycloak:logs"
fi
echo ""

# Resumen
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Resumen de Verificación:"
echo "   ✅ Criterios pasados: $PASSED"
echo "   ❌ Criterios fallidos: $FAILED"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✨ ¡Todos los criterios de aceptación se cumplen!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Algunos criterios no se cumplen.${NC}"
    echo ""
    echo "Pasos para resolver:"
    echo "1. Asegúrate de tener las variables de entorno configuradas:"
    echo "   - KEYCLOAK_ADMIN"
    echo "   - KEYCLOAK_ADMIN_PASSWORD"
    echo "   - DB_USER"
    echo "   - DB_PASSWORD"
    echo ""
    echo "2. Inicia los servicios:"
    echo "   npm run docker:up"
    echo ""
    echo "3. Espera a que Keycloak termine de iniciar (puede tomar 1-2 minutos)"
    echo "   npm run docker:keycloak:logs"
    echo ""
    echo "4. Vuelve a ejecutar este script:"
    echo "   ./scripts/verify-keycloak-setup.sh"
    exit 1
fi

