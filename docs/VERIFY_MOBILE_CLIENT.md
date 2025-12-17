# Verificar Configuración del Cliente Móvil en Keycloak

Esta guía te ayuda a verificar y corregir la configuración del cliente `carecore-mobile` en Keycloak.

## 🔍 Verificar qué Cliente Está Usando la App

### Paso 1: Verificar en el Error

El error muestra en la URL:

```
client_id=carecore-api
```

**Esto significa que la app está usando `carecore-api` en lugar de `carecore-mobile`.**

### Paso 2: Verificar Configuración de la App

La app móvil debería usar `carecore-mobile` por defecto, pero puede estar usando `carecore-api` si:

1. Tienes `KEYCLOAK_CLIENT_ID=carecore-api` en `.env.local` o `.env.development`
2. La app no está leyendo correctamente la configuración

**Solución:** Configura explícitamente el cliente móvil:

```bash
# En .env.local o .env.development
MOBILE_KEYCLOAK_CLIENT_ID=carecore-mobile
```

## ✅ Verificar Configuración del Cliente `carecore-mobile` en Keycloak

### Paso 1: Acceder a Keycloak Admin Console

1. Abre: `http://localhost:8080/admin`
2. Inicia sesión con tus credenciales
3. Selecciona el realm **`carecore`**

### Paso 2: Verificar que el Cliente Existe

1. Ve a **Clients**
2. Busca **`carecore-mobile`** en la lista
3. Si no existe, créalo siguiendo la guía en `docs/MOBILE_KEYCLOAK_SETUP.md`

### Paso 3: Verificar Configuración del Cliente

1. Haz clic en **`carecore-mobile`**
2. Ve a la pestaña **Settings**

**Verifica estos campos:**

#### Client Settings

- **Client ID:** `carecore-mobile` ✅
- **Name:** `CareCore Mobile App` (o similar)
- **Client authentication:** **OFF** (debe ser público) ✅
- **Authorization:** OFF
- **Standard flow:** **ON** ✅
- **Direct access grants:** OFF (recomendado)
- **Implicit flow:** OFF
- **Service accounts roles:** OFF

#### Login Settings

- **Root URL:** (puede estar vacío o ser `carecore://`)
- **Valid redirect URIs:** Debe incluir:
  ```
  carecore://auth
  exp://localhost:8081
  ```
- **Valid post logout redirect URIs:** (puede estar vacío)
- **Web origins:** (puede estar vacío para app móvil)

### Paso 4: Verificar Advanced Settings

1. Ve a la pestaña **Advanced settings**

**Verifica:**

- **Access token lifespan:** `15 minutes` (900 segundos)
- **PKCE Code Challenge Method:** **S256** ✅
- **Client signature algorithm:** `RS256`

### Paso 5: Verificar Client Scopes

1. Ve a la pestaña **Client scopes**
2. En **Default Client Scopes**, deberías ver:
   - `openid`
   - `profile`
   - `email`
   - `roles`
   - (y otros scopes estándar)

## 🔧 Corregir Configuración

### Si el Cliente No Existe

Sigue la guía en `docs/MOBILE_KEYCLOAK_SETUP.md` para crear el cliente `carecore-mobile`.

### Si Falta el Redirect URI

1. En la pestaña **Settings** del cliente `carecore-mobile`
2. En **Valid redirect URIs**, agrega:
   ```
   carecore://auth
   ```
3. Haz clic en **Save**

### Si el Cliente es Confidential en lugar de Public

1. En la pestaña **Settings**
2. Cambia **Client authentication** a **OFF**
3. Haz clic en **Save**

**Nota:** Los clientes móviles deben ser públicos (sin client_secret) por seguridad.

### Si PKCE No Está Habilitado

1. Ve a la pestaña **Advanced settings**
2. En **PKCE Code Challenge Method**, selecciona **S256**
3. Haz clic en **Save**

## 🧪 Probar la Configuración

### Paso 1: Verificar Variables de Entorno

Asegúrate de que la app móvil esté usando el cliente correcto:

```bash
# En .env.local o .env.development
MOBILE_KEYCLOAK_CLIENT_ID=carecore-mobile
```

### Paso 2: Reiniciar la App

1. Detén la app móvil completamente
2. Reiníciala
3. Intenta hacer login

### Paso 3: Verificar en los Logs

Si la app tiene logs, verifica que muestre:

```
keycloakClientId: carecore-mobile
```

## 🐛 Troubleshooting

### Error: "Client not found"

**Causa:** El cliente `carecore-mobile` no existe en Keycloak.

**Solución:**

1. Crea el cliente siguiendo `docs/MOBILE_KEYCLOAK_SETUP.md`
2. O verifica que el Client ID sea exactamente `carecore-mobile` (sin espacios)

### Error: "Invalid redirect_uri" (aún después de agregarlo)

**Causa:** El redirect_uri no está guardado o el formato es incorrecto.

**Solución:**

1. Verifica que hiciste clic en **Save** después de agregar el URI
2. Verifica que el formato sea exacto: `carecore://auth` (sin espacios)
3. Verifica que estés en el cliente correcto (`carecore-mobile`, no `carecore-api`)

### La App Sigue Usando `carecore-api`

**Causa:** Las variables de entorno están configuradas para usar `carecore-api`.

**Solución:**

1. Verifica `.env.local` y `.env.development`
2. Agrega o actualiza: `MOBILE_KEYCLOAK_CLIENT_ID=carecore-mobile`
3. Reinicia la app completamente

### El Cliente Existe pero No Funciona

**Causa:** El cliente puede estar mal configurado.

**Solución:**

1. Verifica que **Client authentication** esté en **OFF** (público)
2. Verifica que **Standard flow** esté en **ON**
3. Verifica que el redirect_uri esté en la lista
4. Verifica que PKCE esté habilitado (S256)

## 📝 Checklist de Verificación

Usa este checklist para verificar que todo esté correcto:

- [ ] Cliente `carecore-mobile` existe en Keycloak
- [ ] Client ID es exactamente `carecore-mobile`
- [ ] Client authentication está en **OFF** (público)
- [ ] Standard flow está en **ON**
- [ ] Redirect URI `carecore://auth` está en la lista
- [ ] PKCE está habilitado (S256)
- [ ] Variables de entorno tienen `MOBILE_KEYCLOAK_CLIENT_ID=carecore-mobile`
- [ ] La app fue reiniciada después de los cambios

## 📚 Referencias

- [Configuración de Cliente Móvil](./MOBILE_KEYCLOAK_SETUP.md)
- [Solución de Error Redirect URI](./FIX_REDIRECT_URI_ERROR.md)
- [Configuración de PKCE](./PKCE_CONFIGURATION.md)
