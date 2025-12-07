# Scripts de Inicialización de Keycloak

Esta carpeta contiene scripts para inicializar y configurar Keycloak completamente.

## 🚀 Uso Rápido

Para configurar Keycloak completamente (realm, roles, clientes):

```bash
# Desde el directorio raíz del proyecto
make keycloak-setup

# O directamente:
bash keycloak/init/setup-keycloak.sh
```

## 📋 Scripts Disponibles

### `setup-keycloak.sh` (Script Maestro)

Script principal que ejecuta toda la configuración de Keycloak:
- Importa el realm desde `keycloak/realms/carecore-realm.json`
- Crea todos los roles base del sistema
- Crea el cliente `carecore-api` (confidential)
- Crea el cliente `carecore-web` (public con PKCE)

**Uso:**
```bash
bash keycloak/init/setup-keycloak.sh
```

**Requisitos:**
- Keycloak corriendo (verificar con `make docker-up`)
- Variables de entorno en `.env.local`:
  - `KEYCLOAK_URL`
  - `KEYCLOAK_ADMIN`
  - `KEYCLOAK_ADMIN_PASSWORD`
  - `KEYCLOAK_REALM` (opcional, default: `carecore`)

### `create-roles.sh`

Crea todos los roles base del sistema:
- `patient` - Usuario paciente
- `practitioner` - Profesional médico
- `viewer` - Acceso temporal de solo lectura
- `lab` - Sistema de laboratorio
- `insurer` - Sistema de aseguradora
- `system` - Sistema externo
- `admin` - Administrador
- `audit` - Auditoría

**Uso:**
```bash
# Obtener token primero
TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" | jq -r '.access_token')

# Ejecutar script
bash keycloak/init/create-roles.sh "$TOKEN"
```

### `create-scopes.sh`

Crea todos los client scopes OAuth2 necesarios para permisos granulares de recursos FHIR:
- `patient:read`, `patient:write`
- `practitioner:read`, `practitioner:write`
- `encounter:read`, `encounter:write`
- `document:read`, `document:write`
- `consent:read`, `consent:write`, `consent:share`

**Características:**
- Crea 11 scopes en total
- Asigna automáticamente los scopes al cliente "carecore-api"
- Idempotente: verifica si los scopes ya existen antes de crearlos
- Configura "Include in Token Scope" automáticamente

**Uso:**
```bash
# Obtener token primero
TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" | jq -r '.access_token')

# Ejecutar script
bash keycloak/init/create-scopes.sh "$TOKEN"
```

**O usando Makefile:**
```bash
make keycloak-create-scopes
```

### `create-api-client.sh`

Crea el cliente `carecore-api` (confidential) para la API backend.

**Configuración:**
- Client ID: `carecore-api`
- Tipo: Confidential (con Client Secret)
- Standard Flow: Habilitado
- Direct Access Grants: Habilitado (solo desarrollo)
- Service Accounts: Habilitado

**Uso:**
```bash
# Similar a create-roles.sh, requiere token
bash keycloak/init/create-api-client.sh "$TOKEN"
```

**⚠️ IMPORTANTE:** Después de crear el cliente, guarda el Client Secret en `.env.local`:
```env
KEYCLOAK_CLIENT_SECRET=<el-secret-obtenido>
```

### `get-client-secret.sh`

Obtiene el Client Secret del cliente `carecore-api` para guardarlo en `.env.local`.

**Uso:**
```bash
# Desde el directorio raíz
make keycloak-get-secret

# O directamente:
bash keycloak/init/get-client-secret.sh

# Para otro cliente:
bash keycloak/init/get-client-secret.sh <client-id>
```

**Características:**
- Obtiene el Client Secret automáticamente
- Regenera el secret si está vacío
- Muestra el secret en formato listo para copiar a `.env.local`

### `create-web-client.sh`

Crea el cliente `carecore-web` (public) para el frontend.

**Configuración:**
- Client ID: `carecore-web`
- Tipo: Public (sin Client Secret)
- Standard Flow: Habilitado
- PKCE: Habilitado (S256)
- Redirect URIs: Configurados según `WEB_PORT` en `.env.local`

**Uso:**
```bash
# Similar a create-roles.sh, requiere token
bash keycloak/init/create-web-client.sh "$TOKEN"
```

## 🔧 Scripts Relacionados

### `init-keycloak-db.sh`

**Ubicación:** `scripts/init-keycloak-db.sh`

Este script crea la base de datos `keycloak_db` cuando PostgreSQL se inicializa por primera vez.

**No requiere ejecución manual** - se ejecuta automáticamente cuando PostgreSQL inicia por primera vez.

## 📝 Flujo Completo de Configuración

### Método Automático (Recomendado)

1. **Iniciar servicios:**
   ```bash
   make docker-up
   ```

   Esto automáticamente:
   - ✅ Crea la base de datos de Keycloak si no existe
   - ✅ Verifica/crea la configuración de Keycloak (realm, roles, clientes) si no existe
   - ⚠️ **Nota:** Requiere que `KEYCLOAK_ADMIN` y `KEYCLOAK_ADMIN_PASSWORD` estén en `.env.local`

2. **Obtener Client Secret (si es necesario):**
   ```bash
   make keycloak-get-secret
   ```

   Copia la línea mostrada a tu `.env.local`:
   ```env
   KEYCLOAK_CLIENT_SECRET=<el-secret-mostrado>
   ```

### Método Manual

Si prefieres configurar manualmente o la configuración automática falla:

1. **Iniciar servicios:**
   ```bash
   make docker-up
   ```

2. **Configurar Keycloak:**
   ```bash
   make keycloak-setup
   ```

3. **Obtener Client Secret:**
   ```bash
   make keycloak-get-secret
   ```

4. **Verificar configuración:**
   - Acceder a Admin Console: `${KEYCLOAK_URL}`
   - Verificar que el realm "carecore" existe
   - Verificar que los roles están creados
   - Verificar que los clientes están creados

## 🐛 Troubleshooting

### Error: "Keycloak no está disponible"

- Verificar que los servicios Docker estén corriendo: `docker ps`
- Verificar que Keycloak esté healthy: `docker ps | grep keycloak`
- Verificar la URL en `.env.local`: `KEYCLOAK_URL`

### Error: "No se pudo obtener token"

- Verificar `KEYCLOAK_ADMIN` y `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`
- Verificar que Keycloak esté completamente iniciado (puede tardar 30-60 segundos)

### El realm ya existe

- El script preguntará si deseas recrearlo
- Si respondes "s", eliminará el realm existente y creará uno nuevo
- Si respondes "N", saltará la importación del realm

### Los roles/clientes ya existen

- Los scripts verifican si existen antes de crear
- Si ya existen, los saltan automáticamente
- No hay problema en ejecutar los scripts múltiples veces

## 📚 Documentación Relacionada

- [README.md](../README.md) - Documentación principal de Keycloak
- [REALM_SETUP.md](../REALM_SETUP.md) - Guía manual de configuración del realm
- [ROLES_SETUP.md](../ROLES_SETUP.md) - Guía manual de creación de roles
- [CLIENT_API_SETUP.md](../CLIENT_API_SETUP.md) - Guía manual del cliente API
- [CLIENT_WEB_SETUP.md](../CLIENT_WEB_SETUP.md) - Guía manual del cliente Web

