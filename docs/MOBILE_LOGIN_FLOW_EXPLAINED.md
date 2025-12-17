# Flujo de Login en la App Móvil - Explicación

Esta guía explica cómo funciona el flujo de login en la app móvil y por qué no puedes ingresar usuario y contraseña directamente en la app.

## 🎯 ¿Por qué no hay campos de usuario y contraseña en la app?

La app móvil usa **OAuth2 Authorization Code Flow con PKCE**, que es el estándar de seguridad para aplicaciones móviles. Este flujo funciona así:

1. **Usuario hace clic en "Iniciar Sesión"** en la app
2. **La app redirige a Keycloak** (se abre un navegador/WebView)
3. **El usuario ingresa credenciales en Keycloak** (no en la app)
4. **Keycloak valida las credenciales** y redirige de vuelta a la app con un código
5. **La app intercambia el código por tokens** de acceso

**Esto es correcto y seguro** porque:

- ✅ Las credenciales nunca pasan por la app
- ✅ Keycloak maneja la autenticación de forma segura
- ✅ PKCE protege contra ataques de interceptación

## 🔍 Entender el Error "invalid_user_credentials"

El error que ves en los logs de Keycloak:

```
error="invalid_user_credentials"
```

Significa que:

- ✅ El flujo OAuth2 está funcionando correctamente
- ✅ La redirección a Keycloak funciona
- ✅ El usuario está intentando hacer login
- ❌ Las credenciales ingresadas en Keycloak son incorrectas

## ✅ Solución: Verificar/Crear Usuario en Keycloak

### Paso 1: Verificar que el Usuario Existe

1. Accede a Keycloak Admin Console:
   - URL: `http://localhost:8080/admin`
   - Usuario: Valor de `KEYCLOAK_ADMIN` en `.env.local`
   - Password: Valor de `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`
   - Realm: `carecore`

2. Ve a **Users** → busca el usuario por username o email

3. Si el usuario **NO existe**, ve al Paso 2

4. Si el usuario **SÍ existe**, verifica:
   - **Enabled:** Debe estar en **ON**
   - **Credentials:** Debe tener una contraseña configurada

### Paso 2: Crear Usuario de Prueba

Si no tienes un usuario o quieres crear uno de prueba:

#### Opción A: Crear desde Keycloak Admin Console

1. **Users** → **Create new user**
2. Completa:
   - **Username:** `test.patient`
   - **Email:** `test.patient@example.com`
   - **First Name:** `Test`
   - **Last Name:** `Patient`
   - **Enabled:** **ON** ✅
   - **Email Verified:** ON (opcional)
3. **Create**

4. **Pestaña Credentials:**
   - Haz clic en **Set password**
   - Contraseña: `TestPassword123!` (o la que prefieras)
   - **Desactiva "Temporary"** ✅
   - **Set**

5. **Pestaña Role Mappings:**
   - **Assign role** → selecciona **`patient`**
   - **Assign**

#### Opción B: Registrarse desde la App

1. En la app móvil, ve a la pantalla de **Registro**
2. Completa el formulario de registro
3. Esto creará el usuario automáticamente en Keycloak

### Paso 3: Probar Login Directamente en Keycloak

Antes de probar en la app, verifica que el usuario puede hacer login directamente en Keycloak:

1. Abre: `http://localhost:8080/realms/carecore/account`
2. Intenta hacer login con:
   - **Username:** El que configuraste
   - **Password:** La contraseña que configuraste
3. Si el login funciona aquí, entonces el problema no es con las credenciales

### Paso 4: Probar Login desde la App

1. En la app móvil, haz clic en **"Iniciar Sesión"**
2. Se abrirá Keycloak (navegador/WebView)
3. Ingresa las **mismas credenciales** que probaste en el Paso 3
4. Deberías ser redirigido de vuelta a la app con sesión iniciada

## 🐛 Troubleshooting

### Error: "invalid_user_credentials" en Keycloak

**Causas posibles:**

1. Usuario no existe → Créalo o regístrate
2. Contraseña incorrecta → Resetea la contraseña en Keycloak
3. Usuario deshabilitado → Activa "Enabled" en Keycloak
4. Usuario en otro realm → Verifica que esté en `carecore`

**Solución:**

1. Verifica que el usuario existe en Keycloak (realm `carecore`)
2. Verifica que está **Enabled**
3. Resetea la contraseña si es necesario
4. Prueba el login directamente en Keycloak primero

### El Usuario Existe pero No Puede Hacer Login

**Verifica:**

- ✅ Usuario está **Enabled** (ON)
- ✅ Usuario tiene contraseña configurada
- ✅ Contraseña no es "Temporary" (o estás preparado para cambiarla)
- ✅ Usuario está en el realm `carecore` (no en `master`)

### La App No Redirige a Keycloak

**Causas posibles:**

1. `KEYCLOAK_URL` incorrecto
2. Cliente `carecore-mobile` no configurado
3. Redirect URI no configurado

**Solución:**

- Verifica `KEYCLOAK_URL` en `.env.local`
- Verifica que el cliente `carecore-mobile` existe
- Verifica que `carecore://auth` está en Valid redirect URIs

### Keycloak Se Abre pero Luego Cierra sin Login

**Causas posibles:**

1. Error en el intercambio de código por tokens
2. Redirect URI no coincide
3. PKCE code_verifier incorrecto

**Solución:**

- Revisa los logs de la app móvil
- Verifica que el redirect_uri es exactamente `carecore://auth`
- Verifica que PKCE está habilitado en Keycloak

## 📋 Flujo Completo de Login

```
1. Usuario → App Móvil → Clic en "Iniciar Sesión"
2. App → Genera code_challenge (PKCE)
3. App → Redirige a Keycloak con:
   - client_id=carecore-mobile
   - redirect_uri=carecore://auth
   - code_challenge=...
   - scope=openid profile email
4. Keycloak → Muestra formulario de login
5. Usuario → Ingresa username y password en Keycloak
6. Keycloak → Valida credenciales
7. Keycloak → Redirige a app con:
   - code=...
   - state=...
8. App → Intercambia code por tokens (con code_verifier)
9. App → Guarda tokens de forma segura
10. App → Usuario autenticado ✅
```

## 🔒 Seguridad

Este flujo es seguro porque:

- ✅ Las credenciales nunca pasan por la app
- ✅ Keycloak maneja la autenticación
- ✅ PKCE protege contra ataques
- ✅ Los tokens se guardan de forma segura (expo-secure-store)

## 📚 Referencias

- [OAuth2 Authorization Code Flow](https://oauth.net/2/grant-types/authorization-code/)
- [PKCE for Mobile Apps](https://oauth.net/2/pkce/)
- [Keycloak User Login Troubleshooting](./KEYCLOAK_USER_LOGIN_TROUBLESHOOTING.md)
- [Verificar Cliente Móvil](./VERIFY_MOBILE_CLIENT.md)
