# Validación del Cliente "carecore-web" sin Frontend

Esta guía explica cómo validar que el cliente "carecore-web" está configurado correctamente sin necesidad de tener un frontend implementado.

## 🎯 Métodos de Validación

### Método 1: Script Automático (Recomendado)

Usa el script de verificación que valida toda la configuración:

```bash
./scripts/verify-web-client.sh
```

**Variables requeridas en `.env.local`:**

- `KEYCLOAK_URL`
- `KEYCLOAK_REALM`
- `KEYCLOAK_ADMIN`
- `KEYCLOAK_ADMIN_PASSWORD`
- `KEYCLOAK_WEB_CLIENT_ID` (ejemplo: `carecore-web`)

**El script verifica:**

- ✅ Que Keycloak esté corriendo
- ✅ Que el realm "carecore" exista
- ✅ Que el cliente "carecore-web" exista
- ✅ Que el cliente sea público (public)
- ✅ Que Standard Flow esté habilitado
- ✅ Que Direct Access Grants esté deshabilitado
- ✅ Que Redirect URIs estén configurados
- ✅ Que Web Origins estén configurados
- ✅ Que PKCE esté configurado
- ✅ Que el endpoint de autorización responda

### Método 2: Validación Manual con curl

#### Paso 1: Verificar que el Cliente Existe

```bash
# Cargar variables de entorno
source .env.local 2>/dev/null || true

# Obtener token de administrador (usar variables de entorno)
ADMIN_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" | jq -r '.access_token')

# Verificar cliente (usar variables de entorno)
curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=carecore-web" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq '.[0] | {clientId, publicClient, standardFlowEnabled}'
```

**Salida esperada:**

```json
{
  "clientId": "carecore-web",
  "publicClient": true,
  "standardFlowEnabled": true
}
```

#### Paso 2: Probar Endpoint de Autorización

# Cargar variables de entorno

source .env.local 2>/dev/null || true

# Generar code_verifier y code_challenge para PKCE

CODE_VERIFIER=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-43)
CODE_CHALLENGE=$(echo -n "$CODE_VERIFIER" | openssl dgst -binary -sha256 | openssl base64 | tr -d "=+/" | cut -c1-43)

# Construir URL de autorización (usar variables de entorno)

AUTH_URL="${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth"
REDIRECT_URI="${KEYCLOAK_WEB_REDIRECT_URI:-http://localhost:3001/auth/callback}"

FULL_URL="${AUTH_URL}?client_id=carecore-web&redirect_uri=${REDIRECT_URI}&response_type=code&scope=openid&code_challenge=${CODE_CHALLENGE}&code_challenge_method=S256"

# Probar (debería redirigir o mostrar página de login)

curl -I "$FULL_URL"

````

**Resultado esperado:**
- HTTP 302 (redirect) o HTTP 200 (página de login)
- Si es 302, verifica que el `Location` header contenga el redirect_uri

### Método 3: Usar Postman

1. **Crear nueva request:**
   - Método: GET
   - URL: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`

2. **Configurar parámetros:**
   - `client_id`: `carecore-web`
   - `redirect_uri`: `http://localhost:3001/auth/callback`
   - `response_type`: `code`
   - `scope`: `openid`
   - `code_challenge`: (generar uno)
   - `code_challenge_method`: `S256`

3. **Usar OAuth2 Tab:**
   - Seleccionar "Authorization Code with PKCE"
   - Configurar:
     - Auth URL: `http://localhost:8080/realms/carecore/protocol/openid-connect/auth`
     - Access Token URL: `http://localhost:8080/realms/carecore/protocol/openid-connect/token`
     - Client ID: `carecore-web`
     - Redirect URI: `http://localhost:3001/auth/callback`
     - Code Challenge Method: `S256`

4. **Probar:**
   - Hacer clic en "Get New Access Token"
   - Debería abrirse el navegador para autenticación
   - Después de autenticarse, debería obtener un token

### Método 4: Usar Herramientas Online

Puedes usar herramientas online de testing OAuth2 como:
- [OAuth 2.0 Playground](https://oauth2.thephpleague.com/authorization-server/auth-code-grant/)
- [OAuth Tools](https://oauth.tools/)

**Configuración (usar valores de .env.local):**
- Authorization Endpoint: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`
- Token Endpoint: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`
- Client ID: `carecore-web` (o `${KEYCLOAK_WEB_CLIENT_ID}` si está definido)
- Redirect URI: `http://localhost:3001/auth/callback` (o el configurado en Keycloak)
- PKCE: Habilitado (S256)

### Método 5: Verificar en Admin Console

1. Acceder a Keycloak Admin Console: `${KEYCLOAK_URL}` (ver `.env.local`)
2. Seleccionar realm "carecore"
3. Ir a **Clients** → **carecore-web**
4. Verificar en **Settings**:
   - ✅ Access type: `public`
   - ✅ Standard flow: `ON`
   - ✅ Direct access grants: `OFF`
   - ✅ Valid redirect URIs: Configurados
   - ✅ Web origins: Configurados
5. Verificar en **Advanced settings**:
   - ✅ PKCE Code Challenge Method: `S256`

## ✅ Checklist de Validación

- [ ] Cliente existe en Keycloak
- [ ] Cliente es tipo "public"
- [ ] Standard Flow habilitado
- [ ] Direct Access Grants deshabilitado
- [ ] Redirect URIs configurados
- [ ] Web Origins configurados
- [ ] PKCE habilitado con método S256
- [ ] Endpoint de autorización responde
- [ ] URL de autorización construible correctamente

## 🐛 Troubleshooting

### El script falla al obtener token de administrador

1. Verificar credenciales en `.env.local`:
   ```bash
   grep KEYCLOAK_ADMIN .env.local
````

2. Verificar que Keycloak esté corriendo:
   ```bash
   docker-compose ps keycloak
   ```

### El cliente no existe

1. Seguir la guía en `CLIENT_WEB_SETUP.md`
2. Crear el cliente manualmente en Admin Console

### PKCE no está configurado

1. Ir a Admin Console → Clients → carecore-web
2. Ir a pestaña **Advanced settings**
3. Configurar **Proof Key for Code Exchange Code Challenge Method**: `S256`

### Endpoint de autorización no responde

1. Verificar que el redirect_uri esté en la lista de Valid Redirect URIs
2. Verificar que el redirect_uri coincida exactamente (sin espacios, mismo protocolo)
3. Verificar logs de Keycloak:
   ```bash
   docker-compose logs keycloak | tail -50
   ```

## 📚 Referencias

- [CLIENT_WEB_SETUP.md](./CLIENT_WEB_SETUP.md) - Guía de configuración
- [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/)
- [OAuth2 PKCE](https://oauth.net/2/pkce/)
