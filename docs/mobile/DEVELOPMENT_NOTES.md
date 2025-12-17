# Notas de Desarrollo - Mobile App

## ✅ Configuración Actual: Expo SDK 54 + React 19

### Estado

- **Web**: ✅ **FUNCIONAL** - Funciona correctamente con SDK 54
- **iOS**: ✅ **FUNCIONAL** - Desarrollo bare (`npx expo run:ios`)
- **Android**: ✅ **FUNCIONAL** - Configurado para usar emulador Pixel_5 por defecto
- **Versiones**: Expo SDK 54, React 19.1.0, React Native 0.81.5

### Nota sobre Expo Go

- **Expo Go**: ❌ No funciona (nueva arquitectura habilitada)
- **Solución**: Usar desarrollo bare en todas las plataformas

### Configuración de Android

Para ejecutar la app en Android, necesitas:

#### Opción 1: Emulador Android (Recomendado para desarrollo)

1. **Instalar Android Studio**: [Descargar Android Studio](https://developer.android.com/studio)
2. **Configurar AVD (Android Virtual Device)**:
   - Abre Android Studio
   - Ve a `Tools` → `Device Manager`
   - Clic en `Create Device`
   - Selecciona un dispositivo (ej: Pixel 5)
   - Selecciona una imagen del sistema (recomendado: API 33 o superior)
   - Finaliza la configuración
3. **Iniciar el emulador**:
   - En Device Manager, clic en el botón ▶️ del emulador creado
   - O desde terminal: `emulator -avd <nombre-del-avd>`
4. **Ejecutar la app**:
   ```bash
   npm run android
   ```

#### Opción 2: Dispositivo Físico

1. **Habilitar Modo Desarrollador**:
   - Ve a `Configuración` → `Acerca del teléfono`
   - Toca 7 veces en "Número de compilación"
2. **Habilitar Depuración USB**:
   - Ve a `Configuración` → `Opciones de desarrollador`
   - Activa "Depuración USB"
3. **Conectar el dispositivo**:
   - Conecta el dispositivo por USB
   - Acepta el diálogo de autorización en el dispositivo
4. **Verificar conexión**:
   ```bash
   adb devices
   ```
   Deberías ver tu dispositivo listado
5. **Ejecutar la app**:
   ```bash
   npm run android
   ```

#### Verificar instalación de Android SDK

```bash
# Verificar que Android SDK está configurado
echo $ANDROID_HOME
# O
echo $ANDROID_SDK_ROOT

# Si no está configurado, agrega a tu ~/.zshrc o ~/.bash_profile:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin
```

## Comandos Útiles

```bash
# Desarrollo Bare (Custom Development Build) - REQUERIDO
# Nota: Expo Go no funciona debido a nueva arquitectura

# Desarrollo iOS (✅ Funciona)
npm run ios
# O directamente:
npx expo run:ios

# Desarrollo Android (✅ Configurado para usar Pixel_5 por defecto)
npm run android
# O directamente:
npx expo run:android --device Pixel_5
# Para usar otro emulador:
npx expo run:android --device <nombre-del-emulador>

# Desarrollo Web (✅ Funciona)
npm run web
# O directamente:
npx expo start --web

# Opción alternativa: Iniciar servidor y luego compilar
npx expo start --dev-client
# En otra terminal:
npx expo run:ios      # iOS
npx expo run:android  # Android (requiere emulador/dispositivo)

# Limpiar caché
npx expo start --clear

# Generar archivos nativos
npx expo prebuild --platform ios
npx expo prebuild --platform android

# Verificar dispositivos Android conectados
adb devices
```

## Referencias

- [Expo Development Build](https://docs.expo.dev/development/introduction/)
- [Expo SDK 54 Known Issues](https://github.com/expo/expo/issues)
