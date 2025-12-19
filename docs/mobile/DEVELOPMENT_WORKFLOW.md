# Workflow de Desarrollo Multiplataforma

## 🚀 Ejecutar iOS, Android y Web Simultáneamente

Sí, puedes ejecutar las tres plataformas al mismo tiempo. Aquí tienes varias opciones:

## Opción 1: Servidor de Desarrollo + Terminales Separadas (Recomendado)

### Paso 1: Iniciar el servidor de desarrollo

```bash
cd packages/mobile
npm start
# O
npx expo start --dev-client
```

Esto iniciará el servidor Metro y mostrará un menú interactivo con opciones para abrir en diferentes plataformas.

### Paso 2: En terminales separadas, ejecutar cada plataforma

**Terminal 2 - iOS:**

```bash
cd packages/mobile
npm run ios
```

**Terminal 3 - Android:**

```bash
cd packages/mobile
npm run android
```

**Terminal 4 - Web:**

```bash
cd packages/mobile
npm run web
```

### Ventajas

- ✅ Control total sobre cada plataforma
- ✅ Puedes cerrar/reiniciar plataformas individualmente
- ✅ Fácil de depurar problemas específicos de plataforma
- ✅ El servidor Metro comparte el bundle entre todas las plataformas

## Opción 2: Scripts NPM Personalizados

Puedes crear scripts en `package.json` para automatizar esto:

```json
{
  "scripts": {
    "dev": "concurrently \"npm start\" \"npm run ios\" \"npm run android\" \"npm run web\"",
    "dev:mobile": "concurrently \"npm start\" \"npm run ios\" \"npm run android\"",
    "dev:ios-web": "concurrently \"npm start\" \"npm run ios\" \"npm run web\""
  }
}
```

**Nota**: Requiere instalar `concurrently`:

```bash
npm install --save-dev concurrently
```

## Opción 3: Menú Interactivo de Expo (Más Simple)

### Iniciar servidor de desarrollo

```bash
cd packages/mobile
npm start
```

Esto mostrará un menú QR y opciones. Puedes:

- Presionar `i` para abrir iOS
- Presionar `a` para abrir Android
- Presionar `w` para abrir Web

**Limitación**: Solo puedes abrir una plataforma a la vez desde el menú, pero puedes ejecutar comandos en terminales separadas mientras el servidor está corriendo.

## Opción 4: Script Bash Personalizado

Crea un script `dev-all.sh`:

```bash
#!/bin/bash
# Iniciar servidor de desarrollo en background
npm start &
SERVER_PID=$!

# Esperar un momento para que el servidor inicie
sleep 5

# Abrir iOS en nueva terminal (macOS)
osascript -e 'tell app "Terminal" to do script "cd '$(pwd)' && npm run ios"'

# Abrir Android en nueva terminal (macOS)
osascript -e 'tell app "Terminal" to do script "cd '$(pwd)' && npm run android"'

# Abrir Web en nueva terminal (macOS)
osascript -e 'tell app "Terminal" to do script "cd '$(pwd)' && npm run web"'

echo "Servidor Metro corriendo (PID: $SERVER_PID)"
echo "Presiona Ctrl+C para detener todo"
wait $SERVER_PID
```

## ⚡ Recomendación: Opción 1

Para desarrollo diario, recomendamos la **Opción 1** porque:

- ✅ Es la más flexible
- ✅ No requiere dependencias adicionales
- ✅ Te permite controlar qué plataformas están activas
- ✅ Fácil de depurar problemas

## 📝 Workflow Típico

1. **Iniciar servidor Metro** (Terminal 1):

   ```bash
   npm start
   ```

2. **Abrir plataformas según necesites** (Terminales 2, 3, 4):

   ```bash
   # iOS
   npm run ios

   # Android
   npm run android

   # Web
   npm run web
   ```

3. **Desarrollar**: Los cambios se reflejan automáticamente en todas las plataformas activas gracias a Fast Refresh.

4. **Cerrar plataformas**: Simplemente cierra las terminales o presiona Ctrl+C en cada una.

## 🔥 Hot Reload / Fast Refresh

Con este setup, cuando hagas cambios en el código:

- ✅ **iOS**: Se recarga automáticamente
- ✅ **Android**: Se recarga automáticamente
- ✅ **Web**: Se recarga automáticamente

Todas las plataformas comparten el mismo servidor Metro, por lo que los cambios se sincronizan.

## ⚠️ Consideraciones

### Recursos del Sistema

- Ejecutar 3 plataformas + Metro puede ser intensivo
- Asegúrate de tener suficiente RAM (recomendado: 16GB+)
- Cierra plataformas que no estés usando activamente

### Emuladores/Simuladores

- **iOS Simulator**: Relativamente ligero
- **Android Emulator**: Puede ser pesado, considera usar un dispositivo físico
- **Web**: Muy ligero

### Recomendación de Hardware

- **Mínimo**: 8GB RAM (solo 2 plataformas a la vez)
- **Recomendado**: 16GB RAM (3 plataformas cómodamente)
- **Ideal**: 32GB RAM (sin problemas)

## 🛠️ Scripts Útiles

### Ver todas las plataformas activas

```bash
# Ver procesos de Metro/Expo
ps aux | grep expo

# Ver simuladores/emuladores corriendo
# iOS
xcrun simctl list devices | grep Booted

# Android
adb devices
```

### Limpiar y reiniciar todo

```bash
# Detener todos los procesos
pkill -f expo
pkill -f metro

# Limpiar caché
npm start -- --clear

# Reiniciar
npm start
```

## 📚 Referencias

- [Expo Development Build](https://docs.expo.dev/development/introduction/)
- [Metro Bundler](https://metrobundler.dev/)
- [Fast Refresh](https://reactnative.dev/docs/fast-refresh)
