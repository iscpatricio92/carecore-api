#!/bin/sh
# Script para crear symlink de main.js después del build
# El build puede generar main.js en diferentes ubicaciones dependiendo de la configuración

set -e

cd /app/packages/api/dist

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
# Verificar que Node.js puede leer el archivo
node main.js --version >/dev/null 2>&1 && echo "✅ Node.js puede ejecutar main.js" || echo "⚠️  Node.js no puede ejecutar main.js"

