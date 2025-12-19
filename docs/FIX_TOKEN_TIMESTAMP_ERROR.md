# Solución: Error "Sesión expirada" por Desajuste de Timestamp

Esta guía explica cómo resolver el error "Sesión expirada" causado por un desajuste de tiempo entre el dispositivo y el servidor.

## 🎯 Problema

El error muestra:

```
ERROR [AUTH] Sesión expirada. Por favor, inicia sesión nuevamente.
```

**Causa:** Hay un desajuste de tiempo o zona horaria entre:

- El dispositivo móvil (iOS/Android) - puede estar en una zona horaria local
- El servidor de Keycloak - típicamente usa UTC
- El servidor del API - puede estar en UTC o zona horaria local

Cuando el token JWT se valida, se verifica el campo `exp` (expiration) que está en UTC. Si hay una diferencia de zona horaria significativa (horas, no solo segundos), el token puede parecer expirado antes de tiempo o inválido.

**Ejemplo:** Si el dispositivo está en UTC-5 y el servidor en UTC, puede haber una diferencia de 5 horas que cause que tokens válidos sean rechazados.

## ✅ Solución Implementada

### 1. Clock Tolerance en JWT Strategy

Se agregó `clockTolerance: 21600` (6 horas) a la configuración de `JwtStrategy` en el API. Esto permite un margen de 6 horas para diferencias de zona horaria entre el cliente y el servidor.

**Nota:** Aunque esto resuelve el problema inmediato, la mejor práctica es que todos los sistemas usen UTC para evitar estos problemas.

```typescript
super({
  // ... otras configuraciones
  clockTolerance: 60, // 60 segundos de tolerancia para desajustes de reloj
});
```

### 2. Verificar Hora del Dispositivo

**En iOS:**

1. Ve a **Configuración** → **General** → **Fecha y hora**
2. Activa **Ajustar automáticamente**
3. Verifica que la hora sea correcta

**En Android:**

1. Ve a **Configuración** → **Sistema** → **Fecha y hora**
2. Activa **Usar hora proporcionada por la red**
3. Verifica que la hora sea correcta

### 3. Verificar Hora del Servidor

Verifica que el servidor tenga la hora correcta:

```bash
# En el contenedor del API
docker exec -it carecore-api-api-1 date

# En el contenedor de Keycloak
docker exec -it carecore-api-keycloak-1 date

# En tu máquina local
date
```

Si hay diferencias significativas, sincroniza la hora:

```bash
# En Linux/macOS
sudo ntpdate -s time.nist.gov

# O usar systemd-timesyncd (Linux)
sudo timedatectl set-ntp true
```

### 4. Verificar Hora de Keycloak

Keycloak usa la hora del sistema donde está ejecutándose. Si Keycloak está en Docker:

```bash
# Verificar hora del contenedor
docker exec -it carecore-api-keycloak-1 date

# Si es necesario, sincronizar hora del host
# (esto afectará a todos los contenedores)
```

## 🔍 Diagnóstico

### Verificar el Token JWT

Puedes decodificar el token JWT para verificar su expiración:

1. **Obtener el token** (desde los logs o SecureStore)
2. **Decodificar en** [jwt.io](https://jwt.io)
3. **Verificar el campo `exp`**:
   - `exp` es un timestamp Unix (segundos desde 1970-01-01)
   - Compara con la hora actual del dispositivo

### Verificar Diferencia de Tiempo

```javascript
// En la consola del navegador o app
const token = 'tu-token-jwt';
const payload = JSON.parse(atob(token.split('.')[1]));
const expirationTime = new Date(payload.exp * 1000);
const currentTime = new Date();
const timeDifference = expirationTime - currentTime;

console.log('Token expira en:', expirationTime);
console.log('Hora actual:', currentTime);
console.log('Diferencia (ms):', timeDifference);
console.log('Diferencia (segundos):', timeDifference / 1000);
```

Si la diferencia es negativa o muy pequeña (< 6 horas), el token puede parecer expirado debido a diferencias de zona horaria.

## 🐛 Troubleshooting

### El Error Persiste Después de Sincronizar la Hora

**Causa:** Puede haber un problema con la configuración de Keycloak o el token realmente está expirado.

**Solución:**

1. Verifica que el token no esté realmente expirado (revisa `exp` en jwt.io)
2. Verifica la configuración de expiración de tokens en Keycloak:
   - Keycloak Admin Console → Realm Settings → Tokens
   - Verifica **Access Token Lifespan** (debe ser al menos 5 minutos para desarrollo)
3. Aumenta el `clockTolerance` en `JwtStrategy` si es necesario (actualmente: 21600 segundos = 6 horas)

### El Token Se Expira Muy Rápido

**Causa:** La configuración de Keycloak tiene un tiempo de expiración muy corto.

**Solución:**

1. Keycloak Admin Console → Realm Settings → Tokens
2. Aumenta **Access Token Lifespan** a un valor razonable:
   - Desarrollo: 5-15 minutos
   - Producción: 5-30 minutos (según tus necesidades de seguridad)

### El Problema Solo Ocurre en Algunos Dispositivos

**Causa:** Algunos dispositivos tienen la hora incorrecta o deshabilitada la sincronización automática.

**Solución:**

1. Verifica la hora en cada dispositivo afectado
2. Activa la sincronización automática de hora
3. Si es necesario, aumenta el `clockTolerance` en el servidor

## 📋 Checklist de Verificación

- [ ] `clockTolerance: 21600` (6 horas) está configurado en `JwtStrategy`
- [ ] La hora del dispositivo está correcta y sincronizada automáticamente
- [ ] La hora del servidor está correcta
- [ ] La hora de Keycloak está correcta
- [ ] El token no está realmente expirado (verificar `exp` en jwt.io)
- [ ] **Access Token Lifespan** en Keycloak es razonable (≥ 5 minutos)

## 📚 Referencias

- [Passport JWT Clock Tolerance](https://github.com/mikenicholson/passport-jwt#clock-tolerance)
- [JWT Token Expiration](https://tools.ietf.org/html/rfc7519#section-4.1.4)
- [Keycloak Token Settings](https://www.keycloak.org/docs/latest/server_admin/#_token-settings)
