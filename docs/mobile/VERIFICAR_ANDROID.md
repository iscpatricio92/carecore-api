# Verificación de Configuración Android

## ✅ Variables de Entorno Configuradas

Las variables de entorno de Android han sido configuradas en tu `~/.zshrc`:

```bash
# Android SDK Configuration
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

## 🔄 Recargar la Configuración

**IMPORTANTE**: Para que las variables tomen efecto, necesitas recargar tu terminal:

### Opción 1: Recargar en la terminal actual (RECOMENDADO)

```bash
source ~/.zshrc
```

Luego verifica:

```bash
emulator -list-avds
```

### Opción 2: Exportar manualmente en la sesión actual

Si `source ~/.zshrc` no funciona, exporta las variables manualmente:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

### Opción 3: Usar el script de ayuda

```bash
cd packages/mobile
./recargar_android.sh
```

### Opción 4: Cerrar y abrir una nueva terminal

- Cierra la terminal actual completamente
- Abre una nueva terminal
- Las variables estarán disponibles automáticamente

## ✅ Verificar que Funciona

Después de recargar, ejecuta estos comandos para verificar:

```bash
# Verificar que ANDROID_HOME está configurado
echo $ANDROID_HOME
# Debería mostrar: /Users/patricio/Library/Android/sdk

# Verificar que adb está disponible
which adb
# Debería mostrar: /Users/patricio/Library/Android/sdk/platform-tools/adb

# Verificar que emulator está disponible
which emulator
# Debería mostrar: /Users/patricio/Library/Android/sdk/emulator/emulator

# Verificar versión de adb
adb version
# Debería mostrar la versión de Android Debug Bridge

# Listar emuladores disponibles
emulator -list-avds
# Mostrará los AVDs (Android Virtual Devices) que hayas creado
```

## 🚀 Siguiente Paso: Crear un Emulador

Si aún no tienes un emulador creado:

1. **Abre Android Studio**
2. **Ve a**: `Tools` → `Device Manager` (o `More Actions` → `Virtual Device Manager`)
3. **Clic en**: `Create Device`
4. **Selecciona**: Un dispositivo (ej: Pixel 5)
5. **Selecciona**: Una imagen del sistema (API 33 o superior)
6. **Finaliza**: La configuración

## 📱 Ejecutar la App en Android

Una vez que tengas un emulador:

```bash
# Opción 1: Iniciar emulador manualmente
emulator -avd <nombre-del-avd>

# Opción 2: Ejecutar la app (iniciará el emulador automáticamente si está configurado)
npm run android
```

## ⚠️ Si las Variables No Funcionan

Si después de recargar la terminal las variables aún no funcionan:

1. **Verifica que el archivo esté correcto**:

   ```bash
   tail -10 ~/.zshrc
   ```

2. **Verifica que el SDK esté instalado**:

   ```bash
   ls -la ~/Library/Android/sdk
   ```

3. **Exporta manualmente en la sesión actual**:

   ```bash
   export ANDROID_HOME=$HOME/Library/Android/sdk
   export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools
   ```

4. **Verifica nuevamente**:
   ```bash
   which adb
   ```
