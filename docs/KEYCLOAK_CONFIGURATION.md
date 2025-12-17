# Guía Completa de Configuración de Keycloak

Esta guía proporciona documentación exhaustiva sobre cómo configurar, mantener y administrar Keycloak en el proyecto CareCore.

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Instalación e Inicialización](#instalación-e-inicialización)
3. [Configuración del Realm](#configuración-del-realm)
4. [Configuración de Clientes](#configuración-de-clientes)
5. [Configuración de Roles](#configuración-de-roles)
6. [Configuración de Scopes](#configuración-de-scopes)
7. [Configuración de MFA](#configuración-de-mfa)
8. [Configuración Avanzada](#configuración-avanzada)
9. [Backup y Restore](#backup-y-restore)
10. [Troubleshooting](#troubleshooting)
11. [Scripts de Automatización](#scripts-de-automatización)

---

## Visión General

### ¿Qué es Keycloak?

Keycloak es un servidor de identidad y acceso (Identity and Access Management - IAM) de código abierto que proporciona:

- **Autenticación**: OAuth2, OpenID Connect (OIDC), SAML
- **Autorización**: Role-Based Access Control (RBAC), Attribute-Based Access Control (ABAC)
- **Single Sign-On (SSO)**: Inicio de sesión único
- **Multi-Factor Authentication (MFA)**: Autenticación de dos factores
- **User Federation**: Integración con LDAP, Active Directory, etc.

### Arquitectura en CareCore

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Cliente   │────────>│ CareCore API │────────>│  Keycloak   │
│ (Frontend)  │         │              │         │  (IdP)      │
└─────────────┘         └──────────────┘         └─────────────┘
                              │                         │
                              │                         │
                              └─────────────────────────┘
                                    PostgreSQL
```

**Componentes:**

- **Keycloak**: Identity Provider (IdP) que emite tokens JWT
- **CareCore API**: Resource Server que valida tokens
- **Frontend/Cliente**: Aplicación que inicia el flujo OAuth2

### Versión

- **Keycloak**: 25.0.4
- **Base de datos**: PostgreSQL 15+
- **Protocolo**: OAuth2/OIDC

---

## Instalación e Inicialización

### Requisitos Previos

- Docker y Docker Compose instalados
- PostgreSQL configurado
- Variables de entorno configuradas (ver `.env.local`)

### Variables de Entorno Requeridas

```bash
# Keycloak Admin
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=change-me-in-production

# Keycloak Server
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=carecore
KEYCLOAK_PORT=8080

# Keycloak Database
KEYCLOAK_DB_TYPE=postgres
KEYCLOAK_DB_HOST=postgres
KEYCLOAK_DB_NAME=keycloak_db
KEYCLOAK_DB_USER=keycloak_user
KEYCLOAK_DB_PASSWORD=keycloak_password

# OAuth2 Client
KEYCLOAK_CLIENT_ID=carecore-api
KEYCLOAK_CLIENT_SECRET=<obtener-desde-keycloak>

# Admin API Client (para actualización de roles)
KEYCLOAK_ADMIN_CLIENT_ID=keycloak-admin-api
KEYCLOAK_ADMIN_CLIENT_SECRET=<obtener-desde-keycloak>
```

### Inicialización Automática

La configuración de Keycloak se ejecuta **automáticamente** cuando ejecutas:

```bash
make docker-up
```

El script `scripts/init-keycloak-config.sh` se ejecuta automáticamente y:

- ✅ Crea la base de datos `keycloak_db` (si no existe)
- ✅ Verifica si el realm "carecore" existe
- ✅ Crea el realm si no existe
- ✅ Crea roles base del sistema
- ✅ Crea clientes OAuth2 necesarios
- ✅ Es idempotente (se puede ejecutar múltiples veces)

### Inicialización Manual

Si necesitas configurar manualmente:

```bash
# Configurar todo (realm, roles, clientes)
make keycloak-setup

# Obtener Client Secret automáticamente
make keycloak-get-secret
```

### Acceder a Admin Console

1. Iniciar servicios:

   ```bash
   make docker-up
   ```

2. Acceder a Admin Console:
   - URL: `http://localhost:8080` (o el puerto configurado en `KEYCLOAK_PORT`)
   - Usuario: Valor de `KEYCLOAK_ADMIN`
   - Contraseña: Valor de `KEYCLOAK_ADMIN_PASSWORD`

3. Seleccionar el realm "carecore" en el dropdown superior izquierdo

---

## Configuración del Realm

### Crear Realm Manualmente

1. En Admin Console, hacer clic en el dropdown "master"
2. Seleccionar "Create realm"
3. Ingresar:
   - **Realm name:** `carecore`
   - **Enabled:** ON
4. Hacer clic en "Create"

### Importar Realm desde JSON

```bash
# Copiar el archivo al contenedor
docker cp keycloak/realms/carecore-realm.json \
  carecore-keycloak:/var/lib/keycloak/data/import/carecore-realm.json

# Reiniciar Keycloak para que importe automáticamente
docker-compose restart keycloak
```

**Nota:** Keycloak importa automáticamente archivos JSON que estén en `/var/lib/keycloak/data/import/` al iniciar.

### Configuración Básica del Realm

#### General Settings

1. Ir a **Realm settings** → **General**
2. Configurar:
   - **Display name:** `CareCore`
   - **Enabled:** ON
   - **User managed access:** OFF (para MVP)

#### Login Settings

1. Ir a **Realm settings** → **Login**
2. Configurar:
   - **User registration:** OFF (solo admins crean usuarios)
   - **Email as username:** OFF
   - **Remember me:** ON
   - **Verify email:** OFF (opcional)
   - **Forgot password:** ON
   - **Edit username:** OFF

#### Security Defenses

1. Ir a **Realm settings** → **Security defenses**
2. Configurar **Brute force detection**:
   - **Enabled:** ON
   - **Max login failures:** 5
   - **Wait increment (seconds):** 60
   - **Max wait (seconds):** 900
   - **Minimum quick login wait (seconds):** 60

#### Token Settings

1. Ir a **Realm settings** → **Tokens**
2. Configurar tiempos de vida:
   - **Access Token Lifespan:** 5 minutos (300 segundos)
   - **SSO Session Idle:** 30 minutos (1800 segundos)
   - **SSO Session Max:** 30 días (2592000 segundos)
   - **Refresh Token Lifespan:** 30 días (2592000 segundos)

### Configuración Avanzada del Realm

#### Email Settings

Para habilitar envío de emails (verificación, reset password):

1. Ir a **Realm settings** → **Email**
2. Configurar:
   - **Host:** SMTP server (ej: `smtp.gmail.com`)
   - **Port:** 587 (TLS) o 465 (SSL)
   - **From:** `noreply@carecore.com`
   - **Authentication:** ON
   - **Username:** SMTP username
   - **Password:** SMTP password
   - **Enable StartTLS:** ON (si usa puerto 587)

**Nota importante:** La verificación de email está completamente manejada por Keycloak. Cuando un usuario se registra, Keycloak envía automáticamente un email de verificación. El usuario hace clic en el enlace y Keycloak verifica el email automáticamente. No se requiere configuración adicional en la API.

Para más detalles, ver: [docs/EMAIL_VERIFICATION.md](EMAIL_VERIFICATION.md)

#### Themes

1. Ir a **Realm settings** → **Themes**
2. Configurar:
   - **Login theme:** `keycloak` (o personalizado)
   - **Account theme:** `keycloak`
   - **Admin console theme:** `keycloak`
   - **Email theme:** `keycloak`

---

## Configuración de Clientes

### Cliente: carecore-api (Confidential)

Este es el cliente principal para la API backend.

#### Crear Cliente

1. Ir a **Clients** → **Create client**
2. **Client type:** OpenID Connect
3. **Client ID:** `carecore-api`
4. **Name:** `CareCore API`

#### Configuración de Capabilities

1. **Client authentication:** ON (confidential)
2. **Authorization:** OFF
3. **Standard flow:** ON (Authorization Code Flow)
4. **Direct access grants:** ON (para testing)
5. **Service accounts roles:** ON (opcional)

#### Configuración de Login

1. **Root URL:** `http://localhost:3000`
2. **Home URL:** `http://localhost:3000`
3. **Valid redirect URIs:**
   - `http://localhost:3000/api/auth/callback`
   - `http://localhost:3000/api/auth/callback/*`
4. **Valid post logout redirect URIs:**
   - `http://localhost:3000`
5. **Web origins:**
   - `http://localhost:3000`

#### Configuración Avanzada

1. Ir a **Advanced settings**
2. Configurar:
   - **Access token lifespan:** 5 minutes
   - **Client session idle timeout:** 30 minutes
   - **Client session max lifespan:** 10 hours
   - **Client signature algorithm:** RS256

#### Obtener Client Secret

1. Ir a la pestaña **Credentials**
2. Copiar el **Client secret**
3. Guardar en `.env.local`:
   ```bash
   KEYCLOAK_CLIENT_SECRET=<client-secret>
   ```

**O usar el script:**

```bash
make keycloak-get-secret
```

### Cliente: carecore-web (Public)

Este es el cliente para el frontend (aplicación pública).

#### Crear Cliente

1. Ir a **Clients** → **Create client**
2. **Client type:** OpenID Connect
3. **Client ID:** `carecore-web`
4. **Name:** `CareCore Web`

#### Configuración de Capabilities

1. **Client authentication:** OFF (public)
2. **Standard flow:** ON
3. **Direct access grants:** OFF
4. **Implicit flow:** OFF (deprecated)

#### Configuración de Login

1. **Root URL:** `http://localhost:3001`
2. **Home URL:** `http://localhost:3001`
3. **Valid redirect URIs:**
   - `http://localhost:3001/auth/callback`
   - `http://localhost:3001/auth/callback/*`
4. **Web origins:**
   - `http://localhost:3001`

### Cliente: keycloak-admin-api (Service Account)

Este cliente se usa para la Admin API de Keycloak (actualización de roles, etc.).

#### Crear Cliente

1. Ir a **Clients** → **Create client**
2. **Client type:** OpenID Connect
3. **Client ID:** `keycloak-admin-api`
4. **Name:** `Keycloak Admin API`

#### Configuración de Capabilities

1. **Client authentication:** ON (confidential)
2. **Service accounts roles:** ON (requerido)
3. **Standard flow:** OFF
4. **Direct access grants:** OFF

#### Configurar Service Account Roles

1. Ir a la pestaña **Service accounts roles**
2. Asignar roles:
   - `realm-management` → `manage-users`
   - `realm-management` → `view-users`
   - `realm-management` → `manage-clients`
   - `realm-management` → `view-clients`
   - `realm-management` → `manage-realm`

#### Obtener Client Secret

1. Ir a la pestaña **Credentials**
2. Copiar el **Client secret**
3. Guardar en `.env.local`:
   ```bash
   KEYCLOAK_ADMIN_CLIENT_SECRET=<client-secret>
   ```

### Cliente: SMART on FHIR App

Para aplicaciones SMART on FHIR externas.

#### Crear Cliente

1. Ir a **Clients** → **Create client**
2. **Client type:** OpenID Connect
3. **Client ID:** `smart-app-123` (o el ID de la app)
4. **Name:** `SMART on FHIR App`

#### Configuración de Capabilities

1. **Client authentication:** ON (confidential)
2. **Standard flow:** ON
3. **Direct access grants:** OFF

#### Configuración de Login

1. **Valid redirect URIs:**
   - `https://app.com/callback` (URL de la app SMART)
2. **Web origins:**
   - `https://app.com`

#### Configuración Avanzada

1. Ir a **Advanced settings**
2. Configurar:
   - **Access token lifespan:** 1 hour (3600 segundos)
   - **Client signature algorithm:** RS256

---

## Configuración de Roles

### Roles Base del Sistema

Los roles base se crean automáticamente con el script de inicialización. Para crearlos manualmente:

#### 1. Rol: `patient`

- **Role name:** `patient`
- **Description:** `Usuario paciente, dueño de su información médica`
- **Permisos:**
  - ✅ Leer sus propios datos médicos
  - ✅ Dar consentimiento para compartir información
  - ✅ Revocar consentimientos
  - ✅ Compartir información con terceros
  - ✅ Exportar sus datos

#### 2. Rol: `practitioner`

- **Role name:** `practitioner`
- **Description:** `Profesional médico certificado`
- **Permisos:**
  - ✅ Crear registros clínicos
  - ✅ Actualizar registros clínicos
  - ✅ Leer datos de pacientes asignados
  - ✅ Crear DocumentReference

#### 3. Rol: `practitioner-verified`

- **Role name:** `practitioner-verified`
- **Description:** `Practitioner con identidad verificada`
- **Nota:** Se asigna automáticamente cuando un admin aprueba la verificación

#### 4. Rol: `admin`

- **Role name:** `admin`
- **Description:** `Administrador del sistema`
- **Permisos:**
  - ✅ Acceso completo al sistema
  - ✅ Gestionar usuarios
  - ✅ Revisar verificaciones de practitioners
  - ✅ Configurar el sistema

#### 5. Rol: `viewer`

- **Role name:** `viewer`
- **Description:** `Usuario con acceso de solo lectura temporal`
- **Permisos:**
  - ✅ Leer datos con consentimiento explícito
  - ✅ Acceso temporal (limitado por tiempo)

### Crear Roles Manualmente

1. Ir a **Realm roles** → **Create role**
2. Ingresar **Role name** y **Description**
3. Hacer clic en **Save**

### Asignar Roles a Usuarios

1. Ir a **Users** → Seleccionar usuario
2. Ir a la pestaña **Role mapping**
3. Hacer clic en **Assign role**
4. Seleccionar roles y hacer clic en **Assign**

### Roles Compuestos

Los roles compuestos permiten que un rol incluya otros roles:

1. Ir a **Realm roles** → Seleccionar rol
2. Ir a la pestaña **Composite roles**
3. Hacer clic en **Add role**
4. Seleccionar roles a incluir

---

## Configuración de Scopes

Para una guía completa de configuración de scopes OAuth2, ver [SCOPES_SETUP_GUIDE.md](./SCOPES_SETUP_GUIDE.md).

### Scopes Básicos

Los scopes básicos de OIDC están habilitados por defecto:

- `openid`: Requerido para OIDC
- `profile`: Información del perfil
- `email`: Email del usuario

### Scopes Personalizados

Para crear scopes personalizados (ej: `patient:read`, `patient:write`):

1. Ir a **Client scopes** → **Create client scope**
2. **Name:** `patient:read`
3. **Type:** Default (o Optional)
4. Ir a la pestaña **Mappers**
5. Agregar mappers según necesidad

### Asignar Scopes a Clientes

1. Ir a **Clients** → Seleccionar cliente
2. Ir a la pestaña **Client scopes**
3. En **Default client scopes**, agregar scopes requeridos
4. En **Optional client scopes**, agregar scopes opcionales

---

## Configuración de MFA

Para una guía completa de configuración de MFA (TOTP), ver [MFA_SETUP_GUIDE.md](./MFA_SETUP_GUIDE.md).

### Habilitar MFA para el Realm

1. Ir a **Realm settings** → **Security**
2. En **Required actions**, habilitar:
   - **Configure OTP** (One-Time Password)

### Configurar MFA para Roles Específicos

1. Ir a **Authentication** → **Flows**
2. Crear un nuevo flow basado en "Browser"
3. Agregar **OTP Form** como step requerido
4. Asignar el flow a roles específicos usando **Bindings**

### Requerir MFA para Admin

1. Crear un **Conditional OTP** flow
2. Configurar condición: `Required Role` = `admin`
3. Asignar el flow en **Bindings** → **Browser flow**

---

## Configuración Avanzada

### User Federation

Para integrar con LDAP o Active Directory:

1. Ir a **User federation**
2. Seleccionar proveedor (ej: `ldap`)
3. Configurar conexión y sincronización

### Identity Providers

Para habilitar login con proveedores externos (Google, Facebook, etc.):

1. Ir a **Identity providers**
2. Seleccionar proveedor
3. Configurar credenciales y mapeo de usuarios

### Events

Para configurar logging de eventos:

1. Ir a **Events**
2. Configurar:
   - **Save events:** ON
   - **Events expiration:** 30 días
   - **Event listeners:** `jboss-logging` (o personalizado)

### Sessions

Para gestionar sesiones:

1. Ir a **Sessions**
2. Ver sesiones activas
3. Revocar sesiones si es necesario

---

## Backup y Restore

Para una guía completa, ver [keycloak/BACKUP_RESTORE.md](../keycloak/BACKUP_RESTORE.md).

### Backup del Realm

```bash
# Exportar realm
docker exec carecore-keycloak /opt/keycloak/bin/kc.sh export \
  --realm carecore \
  --file /var/lib/keycloak/data/export/carecore-realm.json

# Copiar desde el contenedor
docker cp carecore-keycloak:/var/lib/keycloak/data/export/carecore-realm.json \
  keycloak/backups/carecore-realm-$(date +%Y%m%d).json
```

### Backup de la Base de Datos

```bash
# Backup de PostgreSQL
docker exec carecore-postgres pg_dump -U keycloak_user keycloak_db > \
  keycloak/backups/db/keycloak-db-$(date +%Y%m%d).dump
```

### Restore del Realm

```bash
# Copiar al contenedor
docker cp keycloak/backups/carecore-realm-20250101.json \
  carecore-keycloak:/var/lib/keycloak/data/import/carecore-realm.json

# Reiniciar Keycloak para importar
docker-compose restart keycloak
```

### Restore de la Base de Datos

```bash
# Restore de PostgreSQL
docker exec -i carecore-postgres psql -U keycloak_user keycloak_db < \
  keycloak/backups/db/keycloak-db-20250101.dump
```

---

## Troubleshooting

Para una guía completa, ver [keycloak/TROUBLESHOOTING.md](../keycloak/TROUBLESHOOTING.md).

### Problemas Comunes

#### Keycloak no inicia

**Síntomas:**

- El contenedor se reinicia constantemente
- Logs muestran errores de conexión a la base de datos

**Solución:**

1. Verificar que PostgreSQL esté corriendo:

   ```bash
   docker ps | grep postgres
   ```

2. Verificar variables de entorno:

   ```bash
   docker exec carecore-keycloak env | grep KEYCLOAK_DB
   ```

3. Verificar logs:
   ```bash
   docker logs carecore-keycloak
   ```

#### No puedo acceder a Admin Console

**Síntomas:**

- Error 404 o conexión rechazada
- Timeout al intentar acceder

**Solución:**

1. Verificar que Keycloak esté corriendo:

   ```bash
   docker ps | grep keycloak
   ```

2. Verificar el puerto:

   ```bash
   # Verificar en .env.local
   KEYCLOAK_PORT=8080
   ```

3. Verificar firewall/proxy

#### Base de datos no se crea

**Síntomas:**

- Keycloak no puede conectarse a la base de datos
- Error: "database does not exist"

**Solución:**

1. Verificar que el script de inicialización se ejecutó:

   ```bash
   docker logs carecore-postgres | grep keycloak_db
   ```

2. Crear manualmente:
   ```bash
   docker exec -it carecore-postgres psql -U postgres
   CREATE DATABASE keycloak_db;
   ```

#### Problemas con realm o clientes

**Síntomas:**

- El realm no aparece
- Los clientes no funcionan

**Solución:**

1. Verificar que el realm existe:

   ```bash
   # Desde Admin Console o API
   curl http://localhost:8080/realms/carecore/.well-known/openid-configuration
   ```

2. Recrear el realm desde JSON:
   ```bash
   make keycloak-setup
   ```

#### Tokens no se validan

**Síntomas:**

- Error "Token expired" o "Invalid token"
- Error "Issuer mismatch"

**Solución:**

1. Verificar `KEYCLOAK_URL` y `KEYCLOAK_REALM` en `.env.local`
2. Verificar que el issuer del token coincida:

   ```bash
   # Decodificar token (solo testing)
   # El issuer debe ser: http://keycloak:8080/realms/carecore
   ```

3. Verificar que la clave pública sea accesible:
   ```bash
   curl http://localhost:8080/realms/carecore/.well-known/openid-configuration
   ```

### Verificación de Configuración

#### Script de Verificación

```bash
# Verificar que Keycloak esté corriendo
curl http://localhost:8080/health

# Verificar configuración OIDC
curl http://localhost:8080/realms/carecore/.well-known/openid-configuration

# Verificar que el realm existe
curl -u admin:password http://localhost:8080/admin/realms/carecore
```

---

## Scripts de Automatización

### Scripts Disponibles

Todos los scripts están en `keycloak/init/`:

#### `setup-keycloak.sh`

Script principal que configura todo:

- Crea el realm
- Crea roles
- Crea clientes
- Configura scopes

**Uso:**

```bash
make keycloak-setup
```

#### `create-roles.sh`

Crea todos los roles base del sistema.

**Uso:**

```bash
./keycloak/init/create-roles.sh
```

#### `create-api-client.sh`

Crea el cliente `carecore-api`.

**Uso:**

```bash
./keycloak/init/create-api-client.sh
```

#### `create-web-client.sh`

Crea el cliente `carecore-web`.

**Uso:**

```bash
./keycloak/init/create-web-client.sh
```

#### `create-scopes.sh`

Crea scopes OAuth2 personalizados.

**Uso:**

```bash
./keycloak/init/create-scopes.sh
```

#### `get-client-secret.sh`

Obtiene el client secret de un cliente.

**Uso:**

```bash
make keycloak-get-secret
# O
./keycloak/init/get-client-secret.sh carecore-api
```

### Crear Scripts Personalizados

Para crear scripts personalizados:

1. Crear archivo en `keycloak/init/`
2. Usar la Admin API de Keycloak:

   ```bash
   # Obtener access token
   TOKEN=$(curl -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "username=$KEYCLOAK_ADMIN" \
     -d "password=$KEYCLOAK_ADMIN_PASSWORD" \
     -d "grant_type=password" \
     -d "client_id=admin-cli" | jq -r '.access_token')

   # Usar token para llamadas API
   curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8080/admin/realms/carecore/...
   ```

---

## Referencias

### Documentación Oficial

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [Keycloak Docker Documentation](https://www.keycloak.org/server/containers)
- [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/)

### Documentación del Proyecto

- [keycloak/README.md](../keycloak/README.md) - Documentación principal
- [keycloak/REALM_SETUP.md](../keycloak/REALM_SETUP.md) - Configuración del realm
- [keycloak/CLIENT_API_SETUP.md](../keycloak/CLIENT_API_SETUP.md) - Configuración del cliente API
- [keycloak/ROLES_SETUP.md](../keycloak/ROLES_SETUP.md) - Configuración de roles
- [keycloak/TROUBLESHOOTING.md](../keycloak/TROUBLESHOOTING.md) - Troubleshooting
- [keycloak/BACKUP_RESTORE.md](../keycloak/BACKUP_RESTORE.md) - Backup y restore
- [AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md) - Flujos de autenticación
- [MFA_SETUP_GUIDE.md](./MFA_SETUP_GUIDE.md) - Configuración de MFA
- [SCOPES_SETUP_GUIDE.md](./SCOPES_SETUP_GUIDE.md) - Configuración de scopes

### Especificaciones

- [OAuth2 Specification](https://oauth.net/2/)
- [OpenID Connect Specification](https://openid.net/connect/)
- [SMART on FHIR Specification](http://hl7.org/fhir/smart-app-launch/)

---

**Última actualización:** 2025-12-12
