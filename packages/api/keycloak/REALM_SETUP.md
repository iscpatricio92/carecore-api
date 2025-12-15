# Configuración del Realm "carecore" en Keycloak

Esta guía explica cómo crear y configurar el realm "carecore" en Keycloak.

## 🎯 Objetivo

Crear el realm principal "carecore" con configuración básica para el MVP.

## 📋 Método 1: Creación Manual (Recomendado para primera vez)

### Paso 1: Acceder a Admin Console

1. Iniciar servicios:
   ```bash
   npm run docker:up
   ```

2. Acceder a Admin Console:
   - URL: `${KEYCLOAK_URL}` (ver `.env.local` para el puerto, típicamente `http://localhost:${KEYCLOAK_HTTP_PORT}`)
   - Usuario: Valor de `KEYCLOAK_ADMIN` en `.env.local`
   - Contraseña: Valor de `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`

### Paso 2: Crear Realm

1. En el menú superior izquierdo, hacer clic en el dropdown que dice "master"
2. Seleccionar "Create realm"
3. Ingresar:
   - **Realm name:** `carecore`
   - **Enabled:** ON (activado)
4. Hacer clic en "Create"

### Paso 3: Configurar Settings Básicos

1. Ir a **Realm settings** (en el menú lateral izquierdo)
2. En la pestaña **General**:
   - **Display name:** `CareCore`
   - **Enabled:** ON
   - **User managed access:** OFF (para MVP)
3. Hacer clic en "Save"

### Paso 4: Configurar Login Settings

1. En **Realm settings**, ir a la pestaña **Login**
2. Configurar:
   - **User registration:** OFF (para MVP, solo admins crean usuarios)
   - **Email as username:** OFF
   - **Remember me:** ON
   - **Verify email:** OFF (opcional para MVP)
   - **Forgot password:** ON
   - **Edit username:** OFF
3. Hacer clic en "Save"

### Paso 5: Configurar Security Defenses (Opcional pero Recomendado)

1. En **Realm settings**, ir a la pestaña **Security defenses**
2. Configurar **Brute force detection**:
   - **Enabled:** ON
   - **Max login failures:** 5
   - **Wait increment (seconds):** 60
   - **Max wait (seconds):** 900
   - **Minimum quick login wait (seconds):** 60
3. Hacer clic en "Save"

### Paso 6: Configurar Tokens (Opcional)

1. En **Realm settings**, ir a la pestaña **Tokens**
2. Configurar tiempos de vida:
   - **Access Token Lifespan:** 5 minutos (300 segundos)
   - **SSO Session Idle:** 30 minutos (1800 segundos)
   - **SSO Session Max:** 30 días (2592000 segundos) - Controla el refresh token lifespan
3. Hacer clic en "Save"

## 📋 Método 2: Importar desde JSON (Rápido)

### Paso 1: Preparar el archivo

El archivo `keycloak/realms/carecore-realm.json` contiene la configuración base del realm.

### Paso 2: Importar el Realm

**Opción A: Desde Admin Console**

1. Acceder a Admin Console (ver Método 1, Paso 1)
2. En el dropdown del realm "master", seleccionar "Create realm"
3. En lugar de crear manualmente, hacer clic en "Import"
4. Seleccionar el archivo `keycloak/realms/carecore-realm.json`
5. Hacer clic en "Create"

**Opción B: Desde línea de comandos**

```bash
# Copiar el archivo al contenedor
docker cp keycloak/realms/carecore-realm.json \
  carecore-keycloak:/var/lib/keycloak/data/import/carecore-realm.json

# Reiniciar Keycloak para que importe automáticamente
docker-compose restart keycloak
```

**Nota:** Keycloak importa automáticamente archivos JSON que estén en `/var/lib/keycloak/data/import/` al iniciar.

## ✅ Verificación

1. Verificar que el realm existe:
   - En el dropdown superior izquierdo, debería aparecer "carecore"
   - Seleccionar "carecore" para cambiar al realm

2. Verificar configuración:
   - Ir a **Realm settings** → **General**
   - Verificar que "Display name" sea "CareCore"
   - Verificar que "Enabled" esté activado

3. Verificar login settings:
   - Ir a **Realm settings** → **Login**
   - Verificar que "User registration" esté desactivado
   - Verificar que "Remember me" esté activado

## 📝 Configuración Aplicada

### Settings Generales
- **Name:** carecore
- **Display Name:** CareCore
- **Enabled:** Yes
- **User Managed Access:** No (MVP)

### Login Settings
- **User Registration:** No (MVP - solo admins crean usuarios)
- **Email as username:** No
- **Remember me:** Yes
- **Forgot password:** Yes
- **Edit username:** No

### Security
- **Brute force protection:** Enabled
- **Max login failures:** 5
- **Wait increment:** 60 seconds
- **Max wait:** 900 seconds

### Tokens
- **Access Token Lifespan:** 5 minutes
- **SSO Session Idle:** 30 minutes
- **SSO Session Max:** 30 days (controls refresh token lifespan)

## 🔄 Exportar Realm (Para Backup)

Para exportar el realm después de configurarlo:

```bash
# Desde el contenedor
docker exec carecore-keycloak /opt/keycloak/bin/kc.sh export \
  --realm carecore \
  --file /var/lib/keycloak/data/export/carecore-realm.json

# Copiar desde el contenedor
docker cp carecore-keycloak:/var/lib/keycloak/data/export/carecore-realm.json \
  keycloak/realms/carecore-realm-exported.json
```

## 📚 Próximos Pasos

Después de crear el realm, continúa con:
- [Tarea #5: Configurar cliente "carecore-api"](../docs/tasks/PHASE1_KEYCLOAK_SETUP.md#tarea-5-configurar-cliente-carecore-api-en-keycloak)
- [Tarea #6: Configurar cliente "carecore-web"](../docs/tasks/PHASE1_KEYCLOAK_SETUP.md#tarea-6-configurar-cliente-carecore-web-en-keycloak)
- [Tarea #7: Definir roles base](../docs/tasks/PHASE1_KEYCLOAK_SETUP.md#tarea-7-definir-roles-base-en-keycloak)

## 🐛 Troubleshooting

### No puedo acceder a Admin Console

1. Verificar que Keycloak esté corriendo:
   ```bash
   docker-compose ps keycloak
   ```

2. Verificar credenciales en `.env.local`:
   ```bash
   grep KEYCLOAK_ADMIN .env.local
   ```

3. Verificar logs:
   ```bash
   docker-compose logs keycloak | tail -50
   ```

### El realm no se crea

1. Verificar que estés en el realm "master" (no en otro realm)
2. Verificar permisos de administrador
3. Verificar logs de Keycloak para errores

### Error al importar JSON

1. Verificar que el archivo JSON sea válido:
   ```bash
   cat keycloak/realms/carecore-realm.json | jq .
   ```

2. Verificar que el archivo esté en el formato correcto
3. Intentar crear el realm manualmente (Método 1)

## 📖 Referencias

- [Keycloak Realm Configuration](https://www.keycloak.org/docs/latest/server_admin/#_realm)
- [Keycloak Import/Export](https://www.keycloak.org/docs/latest/server_admin/#_export_import)
- [Keycloak Security Settings](https://www.keycloak.org/docs/latest/server_admin/#_security-defenses)

