#!/bin/sh
# Script para crear symlink de main.js después del build
# El build puede generar main.js en diferentes ubicaciones dependiendo de la configuración

set -e

# Detectar si estamos en Docker o localmente
if [ -d "/app/packages/api/dist" ]; then
  # Docker
  cd /app/packages/api/dist
else
  # Local - usar ruta relativa desde donde se ejecuta el script
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  cd "$SCRIPT_DIR/../dist" || exit 1
fi

# Buscar el archivo main.js en diferentes ubicaciones posibles
MAIN_FILE=""
if [ -f api/src/main.js ]; then
  MAIN_FILE="api/src/main.js"
elif [ -f packages/api/src/main.js ]; then
  MAIN_FILE="packages/api/src/main.js"
elif [ -f src/main.js ]; then
  MAIN_FILE="src/main.js"
else
  echo "⚠️  Archivo main.js no encontrado en ubicaciones esperadas"
  echo "   Buscando archivos en dist/..."
  MAIN_FILE=$(find . -name "main.js" -type f 2>/dev/null | head -1)
  if [ -z "$MAIN_FILE" ]; then
    echo "   ❌ No se encontró ningún main.js"
    exit 1
  fi
  # Remover el ./ del inicio si existe
  MAIN_FILE="${MAIN_FILE#./}"
fi

echo "📁 Archivo encontrado: dist/$MAIN_FILE"

# Crear los symlinks (con y sin extensión para compatibilidad)
# Usar rutas relativas para que funcionen correctamente con nest start
ln -sf "$MAIN_FILE" main.js
ln -sf "$MAIN_FILE" main
echo "✅ Symlinks creados: dist/main.js y dist/main -> dist/$MAIN_FILE"
ls -la main* 2>&1 || true
# Verificar que los symlinks funcionan
test -f main.js && echo "✅ main.js es accesible" || echo "❌ main.js no es accesible"
test -f main && echo "✅ main es accesible" || echo "❌ main no es accesible"
# Verificar que el archivo es válido JavaScript (no intentar ejecutarlo ya que requiere variables de entorno)
if head -1 main.js | grep -q "use strict\|__importDefault\|Object.defineProperty"; then
  echo "✅ main.js es un archivo JavaScript válido"
else
  echo "⚠️  main.js no parece ser un archivo JavaScript válido"
fi
