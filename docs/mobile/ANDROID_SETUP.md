# Configuración de Android para Desarrollo

## Estado Actual

- ✅ **Código**: Listo y funcional
- ⚠️ **Emulador/Dispositivo**: Requiere configuración

## Opción 1: Emulador Android (Recomendado para desarrollo)

### Paso 1: Instalar Android Studio

1. Descarga Android Studio desde: https://developer.android.com/studio
2. Instala siguiendo el asistente
3. Acepta las licencias del SDK

### Paso 2: Configurar AVD (Android Virtual Device)

1. Abre Android Studio
2. Ve a `Tools` → `Device Manager` (o `More Actions` → `Virtual Device Manager`)
3. Clic en `Create Device`
4. Selecciona un dispositivo:
   - **Recomendado**: Pixel 5 o Pixel 6
   - Cualquier dispositivo moderno funciona
5. Selecciona una imagen del sistema:
   - **Recomendado**: API 33 (Android 13) o superior
   - Asegúrate de descargar la imagen si no está instalada
6. Finaliza la configuración con `Finish`

### Paso 3: Iniciar el Emulador

1. En Device Manager, clic en el botón ▶️ del emulador creado
2. Espera a que el emulador inicie completamente
3. Verifica que el emulador esté corriendo

### Paso 4: Ejecutar la App

```bash
npm run android
```

**Nota**: El script está configurado para usar el emulador "Pixel_5" por defecto. Si quieres usar otro emulador, puedes:

- Modificar el script en `package.json`
- O ejecutar directamente: `npx expo run:android --device <nombre-del-emulador>`

## Opción 2: Dispositivo Físico Android

### Paso 1: Habilitar Modo Desarrollador

1. Ve a `Configuración` → `Acerca del teléfono`
2. Encuentra "Número de compilación" o "Build number"
3. Toca 7 veces seguidas en "Número de compilación"
4. Verás un mensaje: "Ahora eres desarrollador"

### Paso 2: Habilitar Depuración USB

1. Ve a `Configuración` → `Opciones de desarrollador`
   - Si no aparece, busca en `Configuración` → `Sistema` → `Opciones de desarrollador`
2. Activa "Depuración USB"
3. (Opcional) Activa "Instalar vía USB" si aparece

### Paso 3: Conectar el Dispositivo

1. Conecta el dispositivo Android a tu Mac por USB
2. En el dispositivo, acepta el diálogo de autorización USB
3. Marca "Permitir siempre desde este equipo" si quieres evitar el diálogo cada vez

### Paso 4: Verificar Conexión

```bash
# Verificar que el dispositivo está conectado
adb devices
```

Deberías ver algo como:

```
List of devices attached
ABC123XYZ    device
```

### Paso 5: Ejecutar la App

```bash
npm run android
```

## Configuración de Variables de Entorno (Opcional)

Si `adb` no se encuentra, agrega Android SDK a tu PATH:

```bash
# Editar ~/.zshrc (o ~/.bash_profile si usas bash)
nano ~/.zshrc

# Agregar estas líneas:
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Guardar y recargar
source ~/.zshrc
```

## Verificar Instalación

```bash
# Verificar que Android SDK está configurado
echo $ANDROID_HOME
# Debería mostrar: /Users/tu-usuario/Library/Android/sdk

# Verificar dispositivos conectados
adb devices

# Verificar versión de adb
adb version
```

## Solución de Problemas

### Error: "adb: command not found"

- Instala Android Studio y acepta las licencias del SDK
- Agrega Android SDK a tu PATH (ver sección anterior)

### Error: "No Android connected device found"

- **Emulador**: Asegúrate de que el emulador esté corriendo antes de ejecutar `npm run android`
- **Dispositivo físico**:
  - Verifica que la depuración USB esté habilitada
  - Ejecuta `adb devices` para verificar la conexión
  - Desconecta y reconecta el cable USB
  - Acepta el diálogo de autorización en el dispositivo

### Error: "INSTALL_FAILED_INSUFFICIENT_STORAGE"

- Libera espacio en el dispositivo/emulador
- O crea un nuevo emulador con más almacenamiento

### El emulador es muy lento

- Usa un emulador con menos RAM (2GB es suficiente para desarrollo)
- Habilita aceleración de hardware en Android Studio
- Considera usar un dispositivo físico para mejor rendimiento

## Referencias

- [Expo Android Development](https://docs.expo.dev/workflow/android-studio-emulator/)
- [Android Studio Setup](https://developer.android.com/studio/intro)
- [USB Debugging](https://developer.android.com/studio/run/device)
