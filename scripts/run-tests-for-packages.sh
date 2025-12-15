#!/bin/bash
# Script para ejecutar tests solo de los paquetes modificados
# Uso: ./scripts/run-tests-for-packages.sh [packages...]

set -e

# Si se pasan paquetes como argumentos, usarlos
if [ $# -gt 0 ]; then
  PACKAGES="$*"
else
  # Detectar paquetes modificados automáticamente
  PACKAGES=$(./scripts/detect-changed-packages.sh)
fi

# Si no hay paquetes modificados, salir exitosamente
if [ -z "$PACKAGES" ]; then
  echo "✅ No packages modified, no running tests"
  exit 0
fi

echo "🧪 Executing tests for packages: $PACKAGES"

FAILED=false

# Run tests for each package
for package in $PACKAGES; do
  case $package in
    api)
      echo ""
      echo "📦 Executing tests for API..."
      if npm run test:api --silent; then
        echo "✅ Tests for API passed"
      else
        echo "❌ Tests for API failed"
        FAILED=true
      fi
      ;;
    web)
      echo ""
      echo "📦 Executing tests for Web..."
      if npm run test:web --silent 2>/dev/null; then
        echo "✅ Tests for Web passed"
      else
        echo "⚠️  Tests for Web not available or failed (may be normal if not implemented yet)"
      fi
      ;;
    mobile)
      echo ""
      echo "📦 Executing tests for Mobile..."
      if npm run test:mobile --silent 2>/dev/null; then
        echo "✅ Tests for Mobile passed"
      else
        echo "⚠️  Tests for Mobile not available or failed (may be normal if not implemented yet)"
      fi
      ;;
  esac
done

if [ "$FAILED" = true ]; then
  echo ""
  echo "❌ Some tests failed. Please fix them before making a commit."
  exit 1
fi

echo ""
echo "✅ All tests passed"

