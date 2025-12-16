#!/bin/bash
# Script para recargar las variables de entorno de Android

echo "🔄 Recargando variables de entorno de Android..."

# Exportar variables de Android
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

echo "✅ Variables exportadas en esta sesión"
echo ""
echo "📋 Verificación:"
echo "ANDROID_HOME: $ANDROID_HOME"
echo "adb: $(which adb 2>/dev/null || echo 'no encontrado')"
echo "emulator: $(which emulator 2>/dev/null || echo 'no encontrado')"
echo ""
echo "💡 Para que funcione en nuevas terminales, ejecuta:"
echo "   source ~/.zshrc"
echo ""
echo "   O cierra y abre una nueva terminal"
