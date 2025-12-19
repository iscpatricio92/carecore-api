# Solución: Error "scheme does not have a registered handler"

Esta guía explica cómo resolver el error de deep linking cuando Keycloak intenta redirigir a `carecore://auth`.

## 🎯 Problema

El error muestra:

```
Failed to launch 'carecore://auth?state=...&code=...' because the scheme does not have a registered handler.
```

**Causa:** El sistema operativo (iOS/Android) no reconoce el scheme `carecore://` porque:

1. La app no se ha reconstruido después de configurar el scheme
2. El scheme no está registrado en el sistema
3. En desarrollo, puede necesitar configuración adicional

## ✅ Solución

### Paso 1: Verificar Configuración del Scheme

El scheme ya está configurado en `app.config.js`:

```javascript
scheme: 'carecore',
```

### Paso 2: Reconstruir la App Nativa

**⚠️ IMPORTANTE:** Después de configurar un custom scheme, debes reconstruir la app nativa.

#### Opción A: Reconstruir con Expo Dev Client

```bash
# Desde el directorio packages/mobile
cd packages/mobile

# Para iOS
npx expo run:ios

# Para Android
npx expo run:android
```

#### Opción B: Reconstruir con EAS Build (Producción)

```bash
# Si usas EAS Build
eas build --platform ios
eas build --platform android
```

### Paso 3: Verificar que el Scheme Esté Registrado

#### En iOS (Simulador/Dispositivo)

1. Abre la app en el simulador/dispositivo
2. En la terminal, ejecuta:
   ```bash
   xcrun simctl openurl booted "carecore://auth"
   ```
3. Si la app se abre, el scheme está registrado correctamente

#### En Android (Emulador/Dispositivo)

1. Abre la app en el emulador/dispositivo
2. En la terminal, ejecuta:
   ```bash
   adb shell am start -W -a android.intent.action.VIEW -d "carecore://auth"
   ```
3. Si la app se abre, el scheme está registrado correctamente

### Paso 4: Probar el Login

1. Reinicia la app completamente (ciérrala y ábrela de nuevo)
2. Intenta hacer login desde la app
3. Keycloak debería redirigir correctamente a `carecore://auth` y la app debería capturar la respuesta

## 🔍 Solución Alternativa: Usar expo-linking (Solo si es Necesario)

Si después de reconstruir la app el problema persiste, puedes agregar `expo-linking` para manejar los deep links manualmente:

### Instalar expo-linking

```bash
cd packages/mobile
npx expo install expo-linking
```

### Configurar en app/\_layout.tsx

```typescript
import { useEffect } from 'react';
import * as Linking from 'expo-linking';

export default function RootLayout() {
  useEffect(() => {
    // Manejar deep links cuando la app está abierta
    const subscription = Linking.addEventListener('url', (event) => {
      const { url } = event;
      if (url.startsWith('carecore://auth')) {
        // expo-auth-session debería manejar esto automáticamente
        // pero esto asegura que el deep link se capture
        console.log('Deep link recibido:', url);
      }
    });

    // Manejar deep links cuando la app se abre desde un deep link
    Linking.getInitialURL().then((url) => {
      if (url && url.startsWith('carecore://auth')) {
        console.log('App abierta desde deep link:', url);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // ... resto del código
}
```

**Nota:** Normalmente `expo-auth-session` maneja esto automáticamente, pero esto puede ayudar en casos edge.

## 🐛 Troubleshooting

### El Error Persiste Después de Reconstruir

**Causa:** El scheme puede no estar registrado correctamente en el sistema.

**Solución:**

1. Desinstala la app completamente del dispositivo/simulador
2. Reconstruye la app desde cero:
   ```bash
   cd packages/mobile
   npx expo run:ios --clean
   # o
   npx expo run:android --clean
   ```
3. Vuelve a intentar el login

### El Deep Link Funciona en Desarrollo pero No en Producción

**Causa:** El scheme puede no estar configurado en el build de producción.

**Solución:**

1. Verifica que `app.config.js` tenga `scheme: 'carecore'`
2. Si usas `app.json`, asegúrate de que también tenga el scheme configurado
3. Reconstruye la app de producción

### El Deep Link Funciona en iOS pero No en Android

**Causa:** Android puede requerir configuración adicional en `AndroidManifest.xml`.

**Solución:**

1. Verifica que `app.config.js` tenga la configuración de Android:
   ```javascript
   android: {
     package: 'com.anonymous.carecoremobile',
     // ... otras configuraciones
   }
   ```
2. Expo debería generar automáticamente el `AndroidManifest.xml` con el scheme
3. Si el problema persiste, verifica manualmente el `AndroidManifest.xml` generado

## 📋 Checklist de Verificación

- [ ] El scheme `carecore` está configurado en `app.config.js`
- [ ] La app nativa se ha reconstruido después de configurar el scheme
- [ ] El deep link `carecore://auth` se puede abrir manualmente (ver Paso 3)
- [ ] La app está completamente cerrada y reabierta antes de probar el login
- [ ] Keycloak tiene `carecore://auth` en los Valid redirect URIs del cliente

## 📚 Referencias

- [Expo Linking Documentation](https://docs.expo.dev/guides/linking/)
- [Expo Auth Session Deep Linking](https://docs.expo.dev/guides/authentication/#deep-linking)
- [Custom URL Schemes in Expo](https://docs.expo.dev/guides/linking/#custom-url-schemes)
