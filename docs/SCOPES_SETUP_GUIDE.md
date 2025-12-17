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

| Scope Name           | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `practitioner:read`  | Read access to Practitioner resources                   |
| `practitioner:write` | Create and update access to Practitioner resources      |
| `encounter:read`     | Read access to Encounter resources                      |
| `encounter:write`    | Create and update access to Encounter resources         |
| `document:read`      | Read access to DocumentReference resources              |
| `document:write`     | Create and update access to DocumentReference resources |
| `consent:read`       | Read access to Consent resources                        |
| `consent:write`      | Create and update access to Consent resources           |
| `consent:share`      | Share consent with practitioners                        |

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

| Scope                | Descripción                      | Recurso FHIR      | Roles que lo tienen          |
| -------------------- | -------------------------------- | ----------------- | ---------------------------- |
| `patient:read`       | Leer datos de pacientes          | Patient           | patient, practitioner, admin |
| `patient:write`      | Crear/actualizar pacientes       | Patient           | patient, practitioner, admin |
| `practitioner:read`  | Leer datos de practitioners      | Practitioner      | practitioner, admin          |
| `practitioner:write` | Crear/actualizar practitioners   | Practitioner      | admin                        |
| `encounter:read`     | Leer encounters                  | Encounter         | practitioner, admin          |
| `encounter:write`    | Crear/actualizar encounters      | Encounter         | practitioner, admin          |
| `document:read`      | Leer documentos                  | DocumentReference | patient, practitioner, admin |
| `document:write`     | Crear/actualizar documentos      | DocumentReference | practitioner, admin          |
| `consent:read`       | Leer consentimientos             | Consent           | patient, practitioner, admin |
| `consent:write`      | Crear/actualizar consentimientos | Consent           | patient, admin               |
| `consent:share`      | Compartir consentimientos        | Consent           | patient, admin               |

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

## 📖 Uso de Scopes en el Código

### Mapeo de Scopes a Permisos FHIR

Los scopes se mapean automáticamente a permisos de recursos FHIR mediante `SCOPE_PERMISSIONS_MAP`:

| Scope                | Recurso FHIR      | Acción | Descripción                                 |
| -------------------- | ----------------- | ------ | ------------------------------------------- |
| `patient:read`       | Patient           | read   | Leer recursos Patient                       |
| `patient:write`      | Patient           | write  | Crear/actualizar recursos Patient           |
| `practitioner:read`  | Practitioner      | read   | Leer recursos Practitioner                  |
| `practitioner:write` | Practitioner      | write  | Crear/actualizar recursos Practitioner      |
| `encounter:read`     | Encounter         | read   | Leer recursos Encounter                     |
| `encounter:write`    | Encounter         | write  | Crear/actualizar recursos Encounter         |
| `document:read`      | DocumentReference | read   | Leer recursos DocumentReference             |
| `document:write`     | DocumentReference | write  | Crear/actualizar recursos DocumentReference |
| `consent:read`       | Consent           | read   | Leer recursos Consent                       |
| `consent:write`      | Consent           | write  | Crear/actualizar recursos Consent           |
| `consent:share`      | Consent           | share  | Compartir consentimientos                   |

Este mapeo está definido en `src/common/constants/fhir-scopes.ts` y es utilizado por `ScopePermissionService` para validar permisos.

### ScopesGuard y Decorador @Scopes()

#### ScopesGuard

El `ScopesGuard` valida que el usuario tenga todos los scopes requeridos para acceder a un endpoint.

**Ubicación:** `src/modules/auth/guards/scopes.guard.ts`

**Funcionamiento:**

1. Extrae scopes requeridos del decorador `@Scopes()`
2. Extrae scopes del usuario del request (seteado por `JwtAuthGuard`)
3. Valida que el usuario tenga **TODOS** los scopes requeridos
4. Lanza `InsufficientScopesException` si faltan scopes

**Ejemplo de uso:**

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScopesGuard } from '../auth/guards/scopes.guard';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { FHIR_SCOPES } from '../../common/constants/fhir-scopes';

@Controller('fhir')
export class FhirController {
  @Get('Patient')
  @Scopes(FHIR_SCOPES.PATIENT_READ)
  @UseGuards(JwtAuthGuard, ScopesGuard)
  async searchPatients() {
    // Requiere scope patient:read
    return this.fhirService.searchPatients();
  }
}
```

#### Decorador @Scopes()

El decorador `@Scopes()` define qué scopes son requeridos para acceder a un endpoint.

**Ubicación:** `src/modules/auth/decorators/scopes.decorator.ts`

**Uso básico:**

```typescript
import { Scopes } from '../auth/decorators/scopes.decorator';
import { FHIR_SCOPES } from '../../common/constants/fhir-scopes';

@Get('patient')
@Scopes(FHIR_SCOPES.PATIENT_READ)
@UseGuards(JwtAuthGuard, ScopesGuard)
async getPatient() {
  // Requiere scope patient:read
}
```

**Múltiples scopes (AND lógico):**

```typescript
@Post('consent/:id/share')
@Scopes(FHIR_SCOPES.CONSENT_READ, FHIR_SCOPES.CONSENT_SHARE)
@UseGuards(JwtAuthGuard, ScopesGuard)
async shareConsent() {
  // Requiere AMBOS scopes: consent:read Y consent:share
}
```

**Orden de Guards:**

⚠️ **IMPORTANTE:** `JwtAuthGuard` debe ir **siempre primero**:

```typescript
// ✅ Correcto
@UseGuards(JwtAuthGuard, ScopesGuard)

// ❌ Incorrecto - user no estará disponible
@UseGuards(ScopesGuard, JwtAuthGuard)
```

### ScopePermissionService

El `ScopePermissionService` proporciona métodos para validar permisos basados en scopes.

**Ubicación:** `src/modules/auth/services/scope-permission.service.ts`

**Métodos principales:**

```typescript
// Verificar si un scope otorga permiso para un recurso/acción
hasPermission(scope: string, resourceType: string, action: string): boolean

// Obtener scopes requeridos para un recurso/acción
getRequiredScopes(resourceType: string, action: string): string[]

// Validar si el usuario tiene todos los scopes requeridos
validateScopes(userScopes: string[], requiredScopes: string[]): boolean

// Verificar si el usuario tiene permiso (combina roles y scopes)
hasResourcePermission(user: User, resourceType: string, action: string): boolean
```

**Ejemplo de uso en el servicio:**

```typescript
import { ScopePermissionService } from '../auth/services/scope-permission.service';

@Injectable()
export class FhirService {
  constructor(private scopePermissionService: ScopePermissionService) {}

  async getPatient(id: string, user: User) {
    // Validar permisos usando el servicio
    const hasPermission = this.scopePermissionService.hasResourcePermission(
      user,
      FHIR_RESOURCE_TYPES.PATIENT,
      FHIR_ACTIONS.READ,
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.patientRepository.findOne(id);
  }
}
```

---

## 🔄 Ejemplos de Requests con Scopes

### Solicitar Scopes en OAuth2

Al iniciar el flujo OAuth2, puedes solicitar scopes específicos:

```bash
# Request de autorización con scopes
GET /api/auth/login?scope=patient:read%20patient:write%20encounter:read
```

**En el código (JavaScript/TypeScript):**

```typescript
const scopes = ['patient:read', 'patient:write', 'encounter:read'];
const scopeString = scopes.join(' ');
const authUrl = `${baseUrl}/api/auth/login?scope=${encodeURIComponent(scopeString)}`;
```

### Token Response con Scopes

Después de la autenticación, el token incluirá los scopes otorgados:

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh-token-xyz",
  "scope": "openid profile email roles patient:read patient:write encounter:read"
}
```

**Nota:** El servidor puede otorgar un subconjunto de los scopes solicitados, dependiendo de los permisos del usuario y la configuración del cliente.

### Usar Token con Scopes en Requests

```bash
# Request con token que incluye scopes
curl -H "Authorization: Bearer <access-token>" \
     -H "Accept: application/fhir+json" \
     "https://carecore.example.com/api/fhir/Patient"
```

El servidor validará automáticamente que el token tenga el scope `patient:read` requerido para este endpoint.

### Validar Scopes en el Código

```typescript
@Get('patient/:id')
@Scopes(FHIR_SCOPES.PATIENT_READ)
@UseGuards(JwtAuthGuard, ScopesGuard)
async getPatient(@Param('id') id: string, @CurrentUser() user: User) {
  // El ScopesGuard ya validó que el usuario tiene patient:read
  // user.scopes contiene: ['patient:read', 'patient:write', ...]

  return this.fhirService.getPatient(id, user);
}
```

---

## 🚀 Scopes SMART on FHIR

SMART on FHIR extiende los scopes OAuth2 con contexto de paciente y usuario.

### Scopes con Contexto de Paciente

Los scopes SMART on FHIR pueden incluir contexto de paciente:

- `patient/123.read`: Leer recursos del paciente 123
- `patient/123.write`: Escribir recursos del paciente 123
- `patient/*.read`: Leer recursos de cualquier paciente (requiere permisos especiales)

**Ejemplo de solicitud:**

```bash
GET /api/fhir/authorize?scope=patient/123.read%20patient/123.write
```

### Scopes con Contexto de Usuario

Los scopes SMART on FHIR también pueden incluir contexto de usuario:

- `user/Practitioner/456.read`: Leer recursos del practitioner 456
- `user/*.read`: Leer recursos del usuario actual

### Scopes SMART on FHIR Estándar

SMART on FHIR define scopes estándar adicionales:

| Scope              | Descripción              | Uso                                    |
| ------------------ | ------------------------ | -------------------------------------- |
| `openid`           | OpenID Connect           | Siempre incluido                       |
| `profile`          | Información del perfil   | Información básica del usuario         |
| `fhirUser`         | FHIR User Resource       | Referencia al recurso FHIR del usuario |
| `launch`           | Launch context           | Contexto de launch desde EHR           |
| `launch/patient`   | Patient launch context   | Launch con contexto de paciente        |
| `launch/encounter` | Encounter launch context | Launch con contexto de encuentro       |

### Ejemplo de Flujo SMART on FHIR con Scopes

```typescript
// 1. Solicitar autorización con scopes SMART on FHIR
const authUrl =
  `${fhirBaseUrl}/api/fhir/auth?` +
  `client_id=smart-app-123&` +
  `response_type=code&` +
  `redirect_uri=${encodeURIComponent('https://app.com/callback')}&` +
  `scope=${encodeURIComponent('patient:read patient:write launch/patient')}&` +
  `launch=launch-token-123`;

// 2. Después de autorización, intercambiar código por token
const tokenResponse = await fetch(`${fhirBaseUrl}/api/fhir/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: authorizationCode,
    redirect_uri: 'https://app.com/callback',
    client_id: 'smart-app-123',
    client_secret: 'secret-xyz',
  }),
});

// 3. Token response incluye scopes y contexto de paciente
const tokens = await tokenResponse.json();
// {
//   "access_token": "...",
//   "scope": "patient:read patient:write launch/patient",
//   "patient": "patient-123"  // Contexto de paciente
// }

// 4. Usar token para acceder a recursos
const patientResponse = await fetch(`${fhirBaseUrl}/api/fhir/Patient/patient-123`, {
  headers: {
    Authorization: `Bearer ${tokens.access_token}`,
    Accept: 'application/fhir+json',
  },
});
```

### Validación de Scopes SMART on FHIR

El servidor valida automáticamente los scopes SMART on FHIR:

```typescript
@Get('Patient/:id')
@Scopes(FHIR_SCOPES.PATIENT_READ)
@UseGuards(JwtAuthGuard, ScopesGuard)
async getPatient(@Param('id') id: string, @CurrentUser() user: User) {
  // Si el token tiene contexto de paciente (user.patient),
  // el servicio filtra automáticamente para solo ese paciente
  return this.fhirService.getPatient(id, user);
}
```

**En el servicio:**

```typescript
async getPatient(id: string, user: User) {
  // Si hay contexto de paciente, validar que el ID coincida
  if (user.patient) {
    const patientId = user.patient.replace(/^Patient\//, '');
    if (id !== patientId) {
      throw new ForbiddenException('Cannot access this patient');
    }
  }

  return this.patientRepository.findOne(id);
}
```

Para más información sobre SMART on FHIR, ver [SMART_ON_FHIR_GUIDE.md](./SMART_ON_FHIR_GUIDE.md).

---

## 📚 Referencias Adicionales

### Documentación del Proyecto

- [DEVELOPER_GUIDE_AUTH.md](./DEVELOPER_GUIDE_AUTH.md) - Guía de desarrollo para autenticación
- [ROLES_AND_PERMISSIONS.md](./ROLES_AND_PERMISSIONS.md) - Roles y permisos
- [SMART_ON_FHIR_GUIDE.md](./SMART_ON_FHIR_GUIDE.md) - Guía de integración SMART on FHIR
- [AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md) - Flujos de autenticación

### Código de Referencia

- `src/common/constants/fhir-scopes.ts` - Constantes de scopes
- `src/modules/auth/guards/scopes.guard.ts` - Implementación de ScopesGuard
- `src/modules/auth/decorators/scopes.decorator.ts` - Decorador @Scopes()
- `src/modules/auth/services/scope-permission.service.ts` - Servicio de validación de permisos
- `src/modules/fhir/fhir.controller.ts` - Ejemplos de uso de scopes

### Especificaciones

- [OAuth2 Scopes (RFC 6749)](https://datatracker.ietf.org/doc/html/rfc6749#section-3.3)
- [JWT Scope Claim (RFC 8693)](https://datatracker.ietf.org/doc/html/rfc8693)
- [SMART on FHIR Scopes](http://hl7.org/fhir/smart-app-launch/scopes-and-launch-context/)

---

**Última actualización:** 2025-12-12
