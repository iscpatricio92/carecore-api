# Guía de Configuración de Scopes OAuth2 en Keycloak

Esta guía explica cómo configurar scopes OAuth2 en Keycloak para permisos granulares de recursos FHIR.

## 🎯 Objetivo

Definir scopes OAuth2 en Keycloak que mapean a permisos específicos de recursos FHIR, permitiendo control de acceso granular basado en scopes además de roles.

## 📋 Requisitos Previos

- ✅ Realm "carecore" creado
- ✅ Cliente "carecore-api" configurado
- ✅ Acceso a Admin Console de Keycloak
- ✅ Roles base creados (patient, practitioner, admin, etc.)

## 🚀 Configuración Paso a Paso

### Opción A: Configuración Automática (Recomendada)

Puedes crear todos los scopes automáticamente usando el script proporcionado:

```bash
# Método 1: Usando Makefile
make keycloak-create-scopes

# Método 2: Ejecutando el script directamente
# Primero obtener token de administrador
TOKEN=$(curl -s -X POST "${KEYCLOAK_URL}/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=admin-cli" \
  -d "username=${KEYCLOAK_ADMIN}" \
  -d "password=${KEYCLOAK_ADMIN_PASSWORD}" \
  -d "grant_type=password" | jq -r '.access_token')

# Ejecutar script
bash keycloak/init/create-scopes.sh "$TOKEN"
```

El script:
- ✅ Crea todos los 11 scopes necesarios
- ✅ Verifica si ya existen antes de crearlos (idempotente)
- ✅ Asigna automáticamente los scopes al cliente "carecore-api"
- ✅ Muestra un resumen de lo que se creó

**Después de ejecutar el script:**
1. Verifica que los scopes fueron creados correctamente (ver Paso 8)
2. Haz un backup del realm (ver sección de Backup)

### Opción B: Configuración Manual

Si prefieres crear los scopes manualmente desde la Admin Console:

### Paso 1: Acceder a Admin Console

1. Iniciar servicios (si no están corriendo):
   ```bash
   npm run docker:up
   ```

2. Acceder a Admin Console:
   - URL: `${KEYCLOAK_URL}` (ver `.env.local` para el puerto, típicamente `http://localhost:${KEYCLOAK_HTTP_PORT}`)
   - Usuario: Valor de `KEYCLOAK_ADMIN` en `.env.local`
   - Contraseña: Valor de `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`

3. Seleccionar el realm "carecore" en el dropdown superior izquierdo

### Paso 2: Navegar a Client Scopes

1. En el menú lateral izquierdo, ir a **Client scopes**
2. Verás una lista de scopes por defecto (profile, email, roles, etc.)

### Paso 3: Crear Client Scopes para Recursos FHIR

Para cada scope, seguir estos pasos:

#### 3.1 Crear Scope `patient:read`

1. Hacer clic en **Create client scope** (botón en la esquina superior derecha)
2. En "General settings":
   - **Name:** `patient:read`
   - **Description:** `Read access to Patient resources`
   - **Type:** Default (se incluirá en tokens por defecto)
   - Hacer clic en **Next**

3. En "Settings":
   - **Include in Token Scope:** ON ✅
   - **Display on consent screen:** OFF (para MVP, no mostrar consent screen)
   - Hacer clic en **Save**

#### 3.2 Crear Scope `patient:write`

1. Hacer clic en **Create client scope**
2. En "General settings":
   - **Name:** `patient:write`
   - **Description:** `Create and update access to Patient resources`
   - **Type:** Default
   - Hacer clic en **Next**

3. En "Settings":
   - **Include in Token Scope:** ON ✅
   - **Display on consent screen:** OFF
   - Hacer clic en **Save**

#### 3.3 Crear Scopes Restantes

Repetir el proceso para los siguientes scopes:

| Scope Name | Description |
|------------|-------------|
| `practitioner:read` | Read access to Practitioner resources |
| `practitioner:write` | Create and update access to Practitioner resources |
| `encounter:read` | Read access to Encounter resources |
| `encounter:write` | Create and update access to Encounter resources |
| `document:read` | Read access to DocumentReference resources |
| `document:write` | Create and update access to DocumentReference resources |
| `consent:read` | Read access to Consent resources |
| `consent:write` | Create and update access to Consent resources |
| `consent:share` | Share consent with practitioners |

**Nota:** Para cada scope, asegurarse de:
- ✅ **Include in Token Scope:** ON
- ✅ **Display on consent screen:** OFF (para MVP)

### Paso 4: Asignar Scopes al Cliente "carecore-api"

1. En el menú lateral izquierdo, ir a **Clients**
2. Hacer clic en el cliente **carecore-api**
3. Ir a la pestaña **Client scopes**
4. En la sección **Default Client Scopes**, verás scopes como `profile`, `email`, `roles`
5. Para agregar los nuevos scopes:
   - En la sección **Available client scopes**, encontrar los scopes creados (patient:read, patient:write, etc.)
   - Hacer clic en **Add** para cada scope que quieras asignar
   - Los scopes se moverán a **Assigned Default Client Scopes**

**Recomendación:** Agregar todos los scopes creados como Default Client Scopes para que se incluyan automáticamente en los tokens.

### Paso 5: Crear Scope Groups (Opcional)

Los scope groups permiten agrupar múltiples scopes para facilitar la asignación.

#### 5.1 Crear Scope Group `fhir:read`

1. En **Client scopes**, hacer clic en **Create client scope**
2. En "General settings":
   - **Name:** `fhir:read`
   - **Description:** `Read access to all FHIR resources`
   - **Type:** Default
   - Hacer clic en **Next**

3. En "Settings":
   - **Include in Token Scope:** ON ✅
   - Hacer clic en **Save**

4. Ir a la pestaña **Mappers** del scope `fhir:read`
5. Hacer clic en **Add mapper** > **By configuration** > **Audience**
6. Configurar:
   - **Name:** `fhir-read-audience`
   - **Included Client Audience:** `carecore-api`
   - Hacer clic en **Save**

**Nota:** Los scope groups en Keycloak funcionan agregando múltiples scopes. Para simplificar, podemos asignar todos los scopes de lectura directamente al cliente.

#### 5.2 Crear Scope Group `fhir:write`

Repetir el proceso para `fhir:write` con descripción "Write access to all FHIR resources".

### Paso 6: Asignar Scopes a Roles (Opcional)

Para que los roles tengan scopes automáticamente:

1. Ir a **Realm roles** en el menú lateral
2. Seleccionar un rol (ej: `patient`)
3. Ir a la pestaña **Client scopes**
4. En **Available client scopes**, agregar los scopes apropiados:
   - `patient` role → `patient:read`, `patient:write`
   - `practitioner` role → `practitioner:read`, `practitioner:write`, `encounter:read`, `encounter:write`, `document:read`, `document:write`
   - `admin` role → Todos los scopes

**Nota:** Esta asignación es opcional. Los scopes también pueden ser validados directamente desde el token JWT en la aplicación.

### Paso 7: Exportar Configuración del Realm (Backup)

**⚠️ IMPORTANTE:** Después de crear los scopes, haz un backup del realm para no perder la configuración.

#### Opción A: Usando Script (Recomendado)

```bash
# Método 1: Usando Makefile
make keycloak-backup-realm

# Método 2: Ejecutando el script directamente
bash scripts/backup-keycloak-realm.sh
```

El script:
- ✅ Exporta la configuración completa del realm (incluye scopes, clientes, roles, etc.)
- ✅ Guarda el backup en `keycloak/backups/carecore-realm-YYYYMMDD-HHMMSS.json`
- ✅ Crea un symlink `carecore-realm-latest.json` al último backup
- ✅ Valida que el JSON sea válido
- ✅ Muestra información del backup (número de scopes, clientes, roles, etc.)

#### Opción B: Desde Admin Console

1. En el menú lateral, ir a **Realm settings**
2. Ir a la pestaña **Export**
3. Hacer clic en **Export** para descargar la configuración del realm
4. Guardar el archivo en `keycloak/backups/carecore-realm-YYYYMMDD-HHMMSS.json`
5. **⚠️ IMPORTANTE:** Revisar el archivo exportado y eliminar cualquier información sensible antes de commitear

**Nota:** El backup incluye toda la configuración del realm: scopes, clientes, roles, flows, etc. Es recomendable hacer backup después de cada cambio importante en Keycloak.

### Paso 8: Verificar Configuración

Para verificar que los scopes están configurados correctamente:

1. Obtener un token de acceso usando el cliente "carecore-api"
2. Decodificar el token JWT (usando [jwt.io](https://jwt.io) o similar)
3. Verificar que el campo `scope` contiene los scopes asignados:
   ```json
   {
     "scope": "openid profile email roles patient:read patient:write"
   }
   ```

## 📊 Scopes Definidos

| Scope | Descripción | Recurso FHIR | Roles que lo tienen |
|-------|-------------|--------------|-------------------|
| `patient:read` | Leer datos de pacientes | Patient | patient, practitioner, admin |
| `patient:write` | Crear/actualizar pacientes | Patient | patient, practitioner, admin |
| `practitioner:read` | Leer datos de practitioners | Practitioner | practitioner, admin |
| `practitioner:write` | Crear/actualizar practitioners | Practitioner | admin |
| `encounter:read` | Leer encounters | Encounter | practitioner, admin |
| `encounter:write` | Crear/actualizar encounters | Encounter | practitioner, admin |
| `document:read` | Leer documentos | DocumentReference | patient, practitioner, admin |
| `document:write` | Crear/actualizar documentos | DocumentReference | practitioner, admin |
| `consent:read` | Leer consentimientos | Consent | patient, practitioner, admin |
| `consent:write` | Crear/actualizar consentimientos | Consent | patient, admin |
| `consent:share` | Compartir consentimientos | Consent | patient, admin |

## 🔍 Verificación de Scopes en Tokens

### Usando curl

```bash
# Obtener token (reemplaza USERNAME y PASSWORD con credenciales reales)
TOKEN=$(curl -X POST "${KEYCLOAK_URL}/realms/carecore/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=carecore-api" \
  -d "client_secret=${KEYCLOAK_CLIENT_SECRET}" \
  -d "username=USERNAME" \
  -d "password=PASSWORD" \
  -d "grant_type=password" \
  -d "scope=openid profile email patient:read patient:write" | jq -r '.access_token')

# Decodificar token (requiere jq y base64)
echo $TOKEN | cut -d. -f2 | base64 -d | jq .
```

**⚠️ Nota:** Reemplaza `USERNAME` y `PASSWORD` con credenciales reales de un usuario de prueba. No uses credenciales de producción en ejemplos.

### Usando jwt.io

1. Copiar el token JWT completo
2. Pegarlo en [jwt.io](https://jwt.io)
3. Verificar el campo `scope` en el payload

## 📝 Notas Importantes

1. **Include in Token Scope:** Debe estar ON para que los scopes aparezcan en el token
2. **Display on consent screen:** Para MVP, mantener OFF. En producción, considerar activarlo para consentimiento explícito
3. **Scope Groups:** Son útiles para agrupar scopes, pero no son estrictamente necesarios
4. **Asignación a Roles:** Los scopes pueden asignarse a roles para que se incluyan automáticamente en tokens de usuarios con esos roles
5. **Validación en la App:** Los scopes deben validarse en la aplicación usando `ScopesGuard` (ver Tarea 12)

## 🔗 Referencias

- [Keycloak Client Scopes Documentation](https://www.keycloak.org/docs/latest/server_admin/#_client_scopes)
- [OAuth2 Scopes Specification](https://oauth.net/2/scope/)
- [JWT Scope Claim (RFC 8693)](https://datatracker.ietf.org/doc/html/rfc8693)

## ✅ Checklist de Verificación

- [ ] Todos los scopes creados (11 scopes)
  - [ ] `patient:read`, `patient:write`
  - [ ] `practitioner:read`, `practitioner:write`
  - [ ] `encounter:read`, `encounter:write`
  - [ ] `document:read`, `document:write`
  - [ ] `consent:read`, `consent:write`, `consent:share`
- [ ] Cada scope tiene "Include in Token Scope" activado
- [ ] Scopes asignados al cliente "carecore-api"
- [ ] **Backup del realm creado** (usando `make keycloak-backup-realm`)
- [ ] Tokens de prueba contienen los scopes correctos
- [ ] Documentación actualizada en `docs/AUTH_IMPLEMENTATION_PLAN.md`

## 🔄 Backup y Restore

### Hacer Backup

Después de crear los scopes, es **muy importante** hacer un backup del realm:

```bash
# Backup solo del realm (recomendado después de crear scopes)
make keycloak-backup-realm

# O backup completo (realm + base de datos)
make keycloak-backup
```

Los backups se guardan en `keycloak/backups/`:
- `carecore-realm-YYYYMMDD-HHMMSS.json` - Backup con timestamp
- `carecore-realm-latest.json` - Symlink al último backup

### Restore

Si necesitas restaurar un backup:

```bash
# Ver guía completa en keycloak/BACKUP_RESTORE.md
# O usar el script de restore
bash scripts/restore-keycloak.sh keycloak/backups/carecore-realm-YYYYMMDD-HHMMSS.json
```

**Nota:** Los backups incluyen toda la configuración del realm, incluyendo scopes, clientes, roles, flows, etc. Si el contenedor de Keycloak se borra, puedes restaurar todo desde el backup.

---

**Última actualización:** 2025-01-27

