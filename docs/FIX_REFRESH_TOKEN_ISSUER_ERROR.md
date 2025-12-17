# Solución: Error "Invalid token issuer" al Refrescar Tokens

Esta guía explica cómo resolver el error de issuer al refrescar tokens y validar access tokens desde la app móvil.

## 🎯 Problema

El error puede aparecer en dos escenarios:

### 1. Error al Refrescar Tokens

```
"error": "invalid_grant",
"error_description": "Invalid token issuer. Expected 'http://keycloak:8080/realms/carecore'"
```

### 2. Error al Validar Access Tokens (401 Unauthorized)

```
GET /api/auth/user → 401 Unauthorized
```

**Causa:** Los tokens (tanto access como refresh) fueron emitidos con un issuer diferente al que el API está usando:

- **Móvil:** Obtiene tokens con issuer `http://localhost:8080/realms/carecore`
- **API (Docker):** Valida tokens usando issuer `http://keycloak:8080/realms/carecore`
- **Keycloak:** Valida que el issuer del token coincida con el issuer esperado

## ✅ Solución Implementada

Se agregó soporte para `KEYCLOAK_PUBLIC_URL` que permite al API:

1. **Usar el issuer correcto** cuando refresca tokens para clientes públicos (mobile)
2. **Aceptar tokens con issuer público** cuando valida access tokens en `JwtStrategy`

### 1. Variable de Entorno `KEYCLOAK_PUBLIC_URL`

El API ahora usa `KEYCLOAK_PUBLIC_URL` en dos lugares:

#### A. Refrescar Tokens (`AuthService.refreshToken`)

- **Si se proporciona `clientId` (cliente público):** Usa `KEYCLOAK_PUBLIC_URL` si está configurado, o `KEYCLOAK_URL` si no
- **Si no se proporciona `clientId` (cliente confidencial):** Usa `KEYCLOAK_URL` (normalmente `http://keycloak:8080` en Docker)

#### B. Validar Access Tokens (`JwtStrategy.validate`)

- **Acepta tokens con issuer interno** (`http://keycloak:8080/realms/carecore`) - para clientes web
- **Acepta tokens con issuer público** (`http://localhost:8080/realms/carecore`) - para clientes móviles
- Solo si `KEYCLOAK_PUBLIC_URL` está configurado, acepta ambos issuers

### 2. Configuración en Docker

En `docker-compose.development.yml`, se agregó:

```yaml
KEYCLOAK_PUBLIC_URL: ${KEYCLOAK_PUBLIC_URL:-http://localhost:8080}
```

Esto permite que el API use `http://localhost:8080` cuando refresca tokens para clientes móviles, asegurando que el issuer coincida.

### 3. Configuración en `.env.local`

Agrega la variable en tu `.env.local`:

```env
# Keycloak URLs
KEYCLOAK_URL=http://keycloak:8080  # Para comunicación interna en Docker
KEYCLOAK_PUBLIC_URL=http://localhost:8080  # Para tokens de clientes externos (mobile)
```

## 📋 Pasos para Resolver

### Paso 1: Agregar Variable de Entorno

En tu `.env.local` (o `.env.development`):

```env
KEYCLOAK_PUBLIC_URL=http://localhost:8080
```

### Paso 2: Reiniciar el API

```bash
docker-compose restart api
```

O si estás usando `make`:

```bash
make docker-restart
```

### Paso 3: Verificar Configuración

El API ahora:

- Usa `KEYCLOAK_PUBLIC_URL` cuando refresca tokens para clientes públicos (mobile)
- Usa `KEYCLOAK_URL` cuando refresca tokens para clientes confidenciales (web)

## 🔍 Cómo Funciona

### Flujo para Cliente Público (Mobile)

1. **Móvil obtiene token inicial:**
   - Usa `KEYCLOAK_URL=http://localhost:8080` (desde `.env.local`)
   - Token tiene issuer: `http://localhost:8080/realms/carecore`

2. **Móvil envía refresh request al API:**
   - Incluye `clientId: 'carecore-mobile'` en el body

3. **API refresca el token:**
   - Detecta que es cliente público (porque `clientId` está presente)
   - Hace la request HTTP a `KEYCLOAK_URL=http://keycloak:8080` (para comunicación Docker)
   - Keycloak acepta el refresh token con issuer `http://localhost:8080/realms/carecore` ✅
   - El issuer del token y la URL de la request son independientes

### Flujo para Cliente Confidencial (Web)

1. **Web obtiene token inicial:**
   - Usa `KEYCLOAK_URL` del API (puede ser `http://keycloak:8080` en Docker)
   - Token tiene issuer: `http://keycloak:8080/realms/carecore` (o el configurado en Keycloak)

2. **Web envía refresh request al API:**
   - No incluye `clientId` en el body

3. **API refresca el token:**
   - Detecta que es cliente confidencial (porque `clientId` no está presente)
   - Usa `KEYCLOAK_URL=http://keycloak:8080` para construir la URL
   - Keycloak valida que el issuer del refresh token coincida ✅

## 🐛 Troubleshooting

### El Error Persiste Después de Configurar `KEYCLOAK_PUBLIC_URL`

**Causa:** El API puede no estar usando la variable correctamente o los tokens tienen un issuer diferente.

**Solución:**

1. Verifica que `KEYCLOAK_PUBLIC_URL` esté en `.env.local`
2. Verifica que el API se haya reiniciado después de agregar la variable
3. Verifica los logs del API:
   - Para refresh tokens: `docker-compose logs api | grep "Refreshing access token"`
   - Deberías ver `usingPublicUrl: true` en los logs cuando refresca tokens para mobile
   - Para access tokens: `docker-compose logs api | grep "Token issuer mismatch"`
   - Si ves warnings de "Token issuer mismatch", el `JwtStrategy` no está aceptando el issuer público
4. Verifica que `JwtStrategy` esté configurado correctamente:
   - Debería aceptar tokens con issuer `http://localhost:8080/realms/carecore` cuando `KEYCLOAK_PUBLIC_URL` está configurado

### El Issuer Sigue Sin Coincidir (Error: "Invalid token issuer. Expected 'http://keycloak:8080/realms/carecore'")

**Causa:** Keycloak está validando el issuer del refresh token contra la URL desde donde se hace la request. Cuando el API hace la request a `http://keycloak:8080`, Keycloak espera que el issuer del token sea `http://keycloak:8080/realms/carecore`, pero el token tiene issuer `http://localhost:8080/realms/carecore`.

**Solución:** Configurar el **Frontend URL** en Keycloak Realm Settings:

1. Abre Keycloak Admin Console: `http://localhost:8080`
2. Selecciona el realm `carecore`
3. Ve a **Realm Settings** → **General**
4. En **Frontend URL**, configura: `http://localhost:8080`
5. Haz clic en **Save**
6. **Reinicia Keycloak** o espera a que se apliquen los cambios (puede tomar unos segundos)

**Nota importante:**

- El Frontend URL determina el issuer que Keycloak usa para emitir tokens
- Cuando el Frontend URL es `http://localhost:8080`, Keycloak emitirá tokens con issuer `http://localhost:8080/realms/carecore`
- Keycloak aceptará refresh tokens con ese issuer incluso cuando las requests HTTP vengan de `http://keycloak:8080` (comunicación interna Docker)
- Los tokens antiguos seguirán teniendo el issuer anterior hasta que expiren, pero los nuevos tokens tendrán el issuer correcto

### El Móvil Usa una IP Diferente

**Causa:** Si el móvil está en un dispositivo físico, puede estar usando la IP de tu máquina en lugar de `localhost`.

**Solución:**

1. Si el móvil usa `http://192.168.1.100:8080`, configura:
   ```env
   KEYCLOAK_PUBLIC_URL=http://192.168.1.100:8080
   ```
2. Asegúrate de que esta URL sea accesible desde el API (puede requerir configuración de red Docker)

## 📚 Referencias

- [Keycloak Token Issuer](https://www.keycloak.org/docs/latest/server_admin/#_frontend-url)
- [OAuth2 Refresh Token Flow](https://oauth.net/2/refresh-tokens/)
- [Keycloak Frontend URL Configuration](./KEYCLOAK_CONFIGURATION.md)
