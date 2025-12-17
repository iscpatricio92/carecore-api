#!/bin/bash

# Script helper para crear branches con el formato correcto
# Uso: ./scripts/create-branch.sh <tipo> <scope> <iniciales> <numero-tarea> <descripcion>
# Ejemplo: ./scripts/create-branch.sh feat api ps 123 agregar-endpoint-pacientes

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Tipos permitidos
TYPES=("feat" "fix" "docs" "style" "refactor" "perf" "test" "build" "ci" "chore" "revert")

# Scopes permitidos
SCOPES=("api" "web" "mobile" "shared" "infra" "keycloak" "root")

# Función de ayuda
show_help() {
  echo "📋 Uso: $0 <tipo> <scope> <iniciales> <numero-tarea> <descripcion>"
  echo ""
  echo "Ejemplo:"
  echo "  $0 feat api ps 123 agregar-endpoint-pacientes"
  echo ""
  echo "Resultado: feat(api)/ps-#123/agregar-endpoint-pacientes"
  echo ""
  echo "Tipos permitidos:"
  echo "  ${TYPES[*]}"
  echo ""
  echo "Scopes permitidos:"
  echo "  ${SCOPES[*]}"
  echo ""
  echo "Ejemplos:"
  echo "  $0 feat api ps 123 agregar-endpoint-pacientes"
  echo "  $0 fix web ps 456 corregir-error-login"
  echo "  $0 docs root ps 789 actualizar-readme"
  echo "  $0 build infra ps 101 actualizar-dockerfile"
}

# Validar argumentos
if [ $# -lt 5 ]; then
  echo -e "${RED}❌ Error: Faltan argumentos${NC}"
  echo ""
  show_help
  exit 1
fi

TYPE=$1
SCOPE=$2
INITIALS=$3
TASK_NUMBER=$4
DESCRIPTION=$5

# Validar tipo
if [[ ! " ${TYPES[@]} " =~ " ${TYPE} " ]]; then
  echo -e "${RED}❌ Error: Tipo '${TYPE}' no es válido${NC}"
  echo -e "${YELLOW}Tipos permitidos: ${TYPES[*]}${NC}"
  exit 1
fi

# Validar scope
if [[ ! " ${SCOPES[@]} " =~ " ${SCOPE} " ]]; then
  echo -e "${RED}❌ Error: Scope '${SCOPE}' no es válido${NC}"
  echo -e "${YELLOW}Scopes permitidos: ${SCOPES[*]}${NC}"
  exit 1
fi

# Validar iniciales (solo letras minúsculas)
if [[ ! "$INITIALS" =~ ^[a-z]+$ ]]; then
  echo -e "${RED}❌ Error: Las iniciales deben ser solo letras minúsculas${NC}"
  echo -e "${YELLOW}Ejemplo: ps, jd, am${NC}"
  exit 1
fi

# Validar número de tarea (solo números)
if [[ ! "$TASK_NUMBER" =~ ^[0-9]+$ ]]; then
  echo -e "${RED}❌ Error: El número de tarea debe ser solo números${NC}"
  echo -e "${YELLOW}Ejemplo: 123, 456, 789${NC}"
  exit 1
fi

# Validar descripción (solo letras minúsculas, números y guiones)
if [[ ! "$DESCRIPTION" =~ ^[a-z0-9-]+$ ]]; then
  echo -e "${RED}❌ Error: La descripción debe contener solo letras minúsculas, números y guiones${NC}"
  echo -e "${YELLOW}Ejemplo: agregar-endpoint-pacientes, corregir-error-login${NC}"
  exit 1
fi

# Construir nombre del branch
BRANCH_NAME="${TYPE}(${SCOPE})/${INITIALS}-#${TASK_NUMBER}/${DESCRIPTION}"

# Verificar si el branch ya existe
if git show-ref --verify --quiet refs/heads/"$BRANCH_NAME"; then
  echo -e "${YELLOW}⚠️  El branch '$BRANCH_NAME' ya existe${NC}"
  read -p "¿Deseas cambiarte a ese branch? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    git checkout "$BRANCH_NAME"
    echo -e "${GREEN}✅ Cambiado al branch: $BRANCH_NAME${NC}"
  else
    echo -e "${YELLOW}Operación cancelada${NC}"
  fi
  exit 0
fi

# Crear y cambiar al nuevo branch
echo -e "${BLUE}📦 Creando branch: ${NC}${GREEN}$BRANCH_NAME${NC}"
git checkout -b "$BRANCH_NAME"

echo ""
echo -e "${GREEN}✅ Branch creado exitosamente: $BRANCH_NAME${NC}"
echo ""
echo -e "${BLUE}💡 Próximos pasos:${NC}"
echo "   1. Realiza tus cambios"
echo "   2. Haz commit: npm run commit"
echo "   3. Haz push: git push -u origin $BRANCH_NAME"

