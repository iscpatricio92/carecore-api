# Guía de Verificación de Practitioners

Esta guía explica cómo validar y asignar el rol `practitioner` a usuarios en Keycloak, y cómo usar el sistema de verificación de identidad.

---

## 📋 Resumen del Proceso

El proceso de verificación de practitioners tiene dos etapas:

1. **Asignación inicial del rol `practitioner`** - El usuario obtiene el rol básico
2. **Verificación de identidad** - El usuario envía documentos (cédula/licencia) para obtener el rol `practitioner-verified`

---

## 🎯 Método 1: Asignar Rol Practitioner Manualmente (Keycloak Admin Console)

### Paso 1: Acceder a Keycloak Admin Console

1. Abre `http://localhost:${KEYCLOAK_HTTP_PORT:-8080}`
2. Inicia sesión con credenciales de administrador
3. Selecciona el realm **"carecore"**

### Paso 2: Crear o Localizar el Usuario

**Si el usuario no existe:**

1. Ve a **Users** en el menú lateral
2. Haz clic en **"Add user"** o **"Create new user"**
3. Completa:
   - **Username:** (ej: `dr.smith`)
   - **Email:** (ej: `dr.smith@example.com`)
   - **First Name:** (ej: `John`)
   - **Last Name:** (ej: `Smith`)
   - **Email Verified:** ON (si tienes el email)
4. Haz clic en **"Create"**
5. Ve a la pestaña **"Credentials"** y establece una contraseña temporal
6. Desactiva **"Temporary"** si quieres que el usuario no tenga que cambiar la contraseña

**Si el usuario ya existe:**

1. Ve a **Users**
2. Busca el usuario por username o email
3. Haz clic en el usuario

### Paso 3: Asignar Rol Practitioner

1. Con el usuario seleccionado, ve a la pestaña **"Role Mappings"** o **"Assigned roles"**
2. Haz clic en **"Assign role"** o **"Add role"**
3. En el modal, selecciona **"Filter by realm roles"** o busca en **"Realm roles"**
4. Busca y selecciona el rol **"practitioner"**
5. Haz clic en **"Assign"** o **"Add"**
6. Verifica que el rol aparezca en la lista de **"Assigned roles"**

### Paso 4: Verificar Asignación

1. En la pestaña **"Role Mappings"**, deberías ver:
   - **"practitioner"** en la lista de roles asignados
2. El usuario ahora puede iniciar sesión y tendrá el rol `practitioner`

---

## 🔧 Método 2: Asignar Rol Practitioner vía API (Automático)

### Usando Keycloak Admin API

```bash
# 1. Obtener token de administrador
TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" | jq -r '.access_token')

# 2. Buscar usuario por username
USERNAME="dr.smith"
USER_ID=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users?username=${USERNAME}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq -r '.[0].id')

# 3. Obtener el rol practitioner
ROLE_ID=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/practitioner" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq -r '.id')

# 4. Asignar rol al usuario
curl -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${USER_ID}/role-mappings/realm" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "[{\"id\":\"${ROLE_ID}\",\"name\":\"practitioner\"}]"
```

### Usando el Servicio de la API (NestJS)

Si tienes acceso al código, puedes usar `KeycloakAdminService`:

```typescript
// En un servicio o controlador
await this.keycloakAdminService.addRoleToUser(userId, 'practitioner');
```

---

## ✅ Método 3: Verificar Identidad (Sistema de Verificación)

Una vez que el usuario tiene el rol `practitioner`, puede solicitar verificación de identidad:

### Paso 1: Usuario Envía Documentos

El usuario (con rol `practitioner`) envía documentos vía API:

```bash
# Obtener token del usuario practitioner
USER_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token" \
  -d "client_id=carecore-api" \
  -d "client_secret=${KEYCLOAK_CLIENT_SECRET}" \
  -d "username=dr.smith" \
  -d "password=password" \
  -d "grant_type=password" | jq -r '.access_token')

# Enviar documento de verificación
curl -X POST "${API_URL}/api/auth/verify-practitioner" \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: multipart/form-data" \
  -F "practitionerId=practitioner-123" \
  -F "documentType=cedula" \
  -F "documentFile=@/path/to/cedula.pdf" \
  -F "additionalInfo=License expires in 6 months"
```

**Respuesta:**
```json
{
  "verificationId": "uuid",
  "status": "pending",
  "message": "Verification request submitted successfully"
}
```

### Paso 2: Admin Revisa y Aprueba

Un admin (con rol `admin`) revisa y aprueba la verificación:

```bash
# Obtener token de admin
ADMIN_TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token" \
  -d "client_id=carecore-api" \
  -d "client_secret=${KEYCLOAK_CLIENT_SECRET}" \
  -d "username=admin" \
  -d "password=admin-password" \
  -d "grant_type=password" | jq -r '.access_token')

# Listar verificaciones pendientes
curl -X GET "${API_URL}/api/auth/verify-practitioner?status=pending" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}"

# Aprobar verificación
curl -X PUT "${API_URL}/api/auth/verify-practitioner/${VERIFICATION_ID}/review" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "additionalInfo": "Documents verified successfully"
  }'
```

**Resultado:**
- El usuario obtiene automáticamente el rol `practitioner-verified` en Keycloak
- El estado de verificación cambia a `approved`

---

## 🔍 Verificar que un Usuario Tiene el Rol Practitioner

### Método 1: Desde Keycloak Admin Console

1. Ve a **Users** > Selecciona el usuario
2. Ve a la pestaña **"Role Mappings"**
3. Verifica que **"practitioner"** aparezca en **"Assigned roles"**

### Método 2: Desde el Token JWT

```bash
# Obtener token del usuario
TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token" \
  -d "client_id=carecore-api" \
  -d "client_secret=${KEYCLOAK_CLIENT_SECRET}" \
  -d "username=dr.smith" \
  -d "password=password" \
  -d "grant_type=password" | jq -r '.access_token')

# Decodificar token (solo para verificar)
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq '.realm_access.roles'
```

Deberías ver `"practitioner"` en el array de roles.

### Método 3: Desde la API

```bash
# Obtener información del usuario actual
curl -X GET "${API_URL}/api/auth/user" \
  -H "Authorization: Bearer ${TOKEN}"
```

Respuesta incluirá los roles del usuario.

### Método 4: Usando Keycloak Admin API

```bash
# Obtener roles del usuario
USER_ID="user-uuid"
curl -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${USER_ID}/role-mappings/realm" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" | jq '.[] | select(.name == "practitioner")'
```

---

## 📊 Estados de Verificación

| Estado | Descripción | Rol en Keycloak |
|--------|-------------|----------------|
| **Sin rol** | Usuario no tiene rol practitioner | Ninguno |
| **practitioner** | Usuario tiene rol pero no está verificado | `practitioner` |
| **pending** | Verificación enviada, esperando revisión | `practitioner` |
| **approved** | Verificación aprobada por admin | `practitioner` + `practitioner-verified` |
| **rejected** | Verificación rechazada | `practitioner` (sin verified) |

---

## 🎯 Flujo Completo Recomendado

### Para un Nuevo Practitioner:

1. **Crear usuario en Keycloak** (Admin Console o API)
2. **Asignar rol `practitioner`** (Método 1 o 2)
3. **Usuario inicia sesión** y puede acceder a endpoints de practitioner
4. **Usuario envía documentos** para verificación (`POST /api/auth/verify-practitioner`)
5. **Admin revisa y aprueba** (`PUT /api/auth/verify-practitioner/:id/review`)
6. **Sistema asigna automáticamente** el rol `practitioner-verified`

### Para Verificar un Usuario Existente:

1. **Verificar que tiene rol `practitioner`** (Método 1, 2, o 3)
2. Si no lo tiene, **asignarlo** (Método 1 o 2)
3. **Seguir pasos 4-6** del flujo anterior

---

## 🔧 Script de Asistencia (Opcional)

Puedes crear un script para automatizar la asignación:

```bash
#!/bin/bash
# scripts/assign-practitioner-role.sh

USERNAME="$1"
if [ -z "$USERNAME" ]; then
  echo "Uso: ./scripts/assign-practitioner-role.sh <username>"
  exit 1
fi

# Cargar variables de entorno
source .env.local 2>/dev/null || true

# Obtener token
TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" | jq -r '.access_token')

# Buscar usuario
USER_ID=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users?username=${USERNAME}" \
  -H "Authorization: Bearer ${TOKEN}" | jq -r '.[0].id')

# Obtener rol
ROLE=$(curl -s -X GET "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/roles/practitioner" \
  -H "Authorization: Bearer ${TOKEN}")

# Asignar rol
curl -X POST "${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${USER_ID}/role-mappings/realm" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "[${ROLE}]"

echo "✅ Rol practitioner asignado a ${USERNAME}"
```

---

## 🚨 Troubleshooting

### Problema: No puedo asignar el rol

**Solución:**
- Verifica que el rol `practitioner` exista en el realm
- Verifica que tengas permisos de administrador
- Verifica que el usuario exista

### Problema: El usuario no aparece en la lista de roles

**Solución:**
- Asegúrate de estar en el realm correcto ("carecore")
- Verifica que el rol sea un realm role (no client role)
- Refresca la página

### Problema: El rol no aparece en el token JWT

**Solución:**
- Verifica que el cliente tenga el scope "roles" (ya configurado)
- Verifica que el rol esté asignado al usuario
- Prueba obtener un nuevo token después de asignar el rol

---

## 📚 Referencias

- [Keycloak User Management](https://www.keycloak.org/docs/latest/server_admin/#_users)
- [Keycloak Role Mappings](https://www.keycloak.org/docs/latest/server_admin/#_role_mappings)
- [Auth Service - Practitioner Verification](../src/modules/auth/auth.service.ts)
- [Keycloak Admin Service](../src/modules/auth/services/keycloak-admin.service.ts)

---

**Última actualización:** 2025-12-06
**Keycloak Version:** 25.0.4

