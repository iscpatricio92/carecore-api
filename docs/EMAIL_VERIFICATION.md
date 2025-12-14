# Guía de Verificación de Email

Esta guía explica cómo funciona la verificación de email en CareCore API usando Keycloak.

---

## 📋 Resumen

La verificación de email está completamente manejada por **Keycloak**. Cuando un usuario se registra, Keycloak envía automáticamente un email de verificación. El usuario hace clic en el enlace del email y Keycloak verifica el email automáticamente.

**No se requiere configuración adicional en la API** - todo el proceso está gestionado por Keycloak.

---

## 🔧 Configuración Requerida

### 1. Configurar SMTP en Keycloak

Para que Keycloak pueda enviar emails de verificación, debes configurar el servidor SMTP en la consola de administración de Keycloak:

1. Accede a la consola de administración de Keycloak
2. Selecciona el realm **"carecore"** (o el realm que estés usando)
3. Ve a **Realm settings** → **Email**
4. Configura los siguientes campos:
   - **Host:** Servidor SMTP (ej: `smtp.gmail.com`)
   - **Port:** Puerto SMTP (ej: `587` para TLS o `465` para SSL)
   - **From:** Dirección de email remitente (ej: `noreply@carecore.com`)
   - **From Display Name:** Nombre que aparecerá como remitente (ej: `CareCore`)
   - **Reply To:** Dirección de email para respuestas (opcional)
   - **Reply To Display Name:** Nombre para respuestas (opcional)
   - **Enable SSL:** ON (si usas puerto 465)
   - **Enable StartTLS:** ON (si usas puerto 587)
   - **Authentication:** ON
   - **Username:** Usuario SMTP
   - **Password:** Contraseña SMTP

5. Haz clic en **"Save"**
6. Opcional: Haz clic en **"Test connection"** para verificar que la configuración es correcta

### 2. Configurar Verificación de Email en Realm Settings

1. Ve a **Realm settings** → **Login**
2. Configura:
   - **Verify email:** ON (para requerir verificación de email)
   - **Email as username:** OFF (opcional)

---

## 🔄 Flujo de Verificación

### Registro de Usuario

1. Usuario se registra usando `POST /api/auth/register`
2. La API crea el usuario en Keycloak con `emailVerified: false`
3. La API llama a `KeycloakAdminService.sendEmailVerification()` que usa `executeActionsEmail` con acción `VERIFY_EMAIL`
4. Keycloak genera un token de verificación y envía el email usando su configuración SMTP
5. El usuario recibe el email con un enlace de verificación

### Verificación de Email

1. Usuario hace clic en el enlace del email
2. Keycloak verifica automáticamente el email y actualiza `emailVerified: true`
3. El usuario es redirigido a la URL configurada en Keycloak (normalmente el frontend)

**Nota:** La verificación es completamente automática. No se requiere intervención de la API.

---

## 📡 Endpoints de la API

### 1. Reenviar Email de Verificación

```http
POST /api/auth/resend-verification-email
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Descripción:** Reenvía el email de verificación al usuario autenticado.

**Respuesta:**
```json
{
  "message": "Verification email sent successfully"
}
```

### 2. Verificar Estado de Verificación

```http
GET /api/auth/email-verification-status
Authorization: Bearer <token>
```

**Descripción:** Verifica el estado de verificación de email del usuario autenticado.

**Respuesta:**
```json
{
  "message": "Email is verified",
  "email": "user@example.com"
}
```

O si no está verificado:
```json
{
  "message": "Email is not verified. Please check your email and click the verification link.",
  "email": "user@example.com"
}
```

---

## 🔍 Verificación Manual en Keycloak

Si necesitas verificar manualmente el estado de verificación de un usuario:

1. Accede a la consola de administración de Keycloak
2. Ve a **Users**
3. Busca el usuario
4. En la pestaña **"Details"**, verifica el campo **"Email Verified"**

---

## ⚠️ Notas Importantes

1. **SMTP debe estar configurado en Keycloak** - Las variables SMTP han sido eliminadas del proyecto. La verificación de email está completamente manejada por Keycloak usando su configuración SMTP en Realm settings. No se requiere configuración SMTP en `.env`.

2. **Keycloak maneja tokens y expiración** - No necesitas gestionar tokens de verificación manualmente. Keycloak los genera, almacena y valida automáticamente.

3. **El enlace de verificación es generado por Keycloak** - El formato del enlace y la URL de redirección se configuran en Keycloak Realm settings.

4. **Verificación automática** - Cuando el usuario hace clic en el enlace, Keycloak verifica automáticamente el email. No necesitas un endpoint adicional para procesar el token.

5. **FRONTEND_URL no es para verificación de email** - La variable `FRONTEND_URL` en `.env` se usa para redirección OAuth después del login, no para verificación de email. La verificación de email usa la configuración de Keycloak Realm settings.

---

## 🐛 Troubleshooting

### El email no se envía

1. Verifica que SMTP esté configurado correctamente en Keycloak Realm settings
2. Prueba la conexión SMTP usando el botón "Test connection" en Keycloak
3. Verifica los logs de Keycloak para errores de SMTP
4. Asegúrate de que el usuario tenga un email válido configurado

### El email se envía pero el enlace no funciona

1. Verifica que la URL de redirección esté configurada correctamente en Keycloak
2. Verifica que el frontend esté accesible desde la URL configurada
3. Revisa los logs de Keycloak para errores de verificación

### El usuario no puede verificar su email

1. Verifica que el token no haya expirado (configurable en Keycloak Realm settings)
2. Verifica que el usuario tenga acceso al email
3. Usa el endpoint `POST /api/auth/resend-verification-email` para reenviar el email

---

## 📚 Referencias

- [Keycloak Email Configuration](https://www.keycloak.org/docs/latest/server_admin/#_email)
- [Keycloak User Management](https://www.keycloak.org/docs/latest/server_admin/#_users)
- Ver también: `docs/KEYCLOAK_CONFIGURATION.md`

