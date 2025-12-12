# Roles y Permisos

Esta documentación describe el sistema de roles y permisos implementado en CareCore API, incluyendo cómo se asignan, validan y usan en el código.

## Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Roles Disponibles](#roles-disponibles)
3. [Permisos por Rol](#permisos-por-rol)
4. [Asignación de Roles](#asignación-de-roles)
5. [Validación de Roles](#validación-de-roles)
6. [Uso en el Código](#uso-en-el-código)
7. [Integración con Scopes](#integración-con-scopes)
8. [Tabla de Permisos por Recurso](#tabla-de-permisos-por-recurso)
9. [Ejemplos Prácticos](#ejemplos-prácticos)
10. [Mejores Prácticas](#mejores-prácticas)

---

## Visión General

CareCore API utiliza un sistema de **Role-Based Access Control (RBAC)** combinado con **Scope-Based Access Control** para gestionar permisos.

### Componentes del Sistema

1. **Roles**: Definidos en Keycloak y extraídos del JWT token
2. **Scopes**: Permisos granulares OAuth2 para recursos específicos
3. **Guards**: `JwtAuthGuard`, `RolesGuard`, `ScopesGuard` para validar acceso
4. **Decorators**: `@Roles()`, `@Scopes()` para marcar endpoints

### Flujo de Autorización

```
┌─────────┐
│ Request │
└────┬────┘
     │
     ▼
┌─────────────────┐
│ JwtAuthGuard    │ ← Valida token JWT
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ RolesGuard      │ ← Valida roles requeridos
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ ScopesGuard     │ ← Valida scopes requeridos (opcional)
└────┬────────────┘
     │
     ▼
┌─────────────────┐
│ Endpoint        │ ← Ejecuta lógica del endpoint
└─────────────────┘
```

---

## Roles Disponibles

### 1. `patient`

**Descripción:** Usuario paciente, dueño de su información médica.

**Constante:** `ROLES.PATIENT`

**Permisos:**
- ✅ Leer sus propios datos médicos (Patient, Encounter, Observation, etc.)
- ✅ Dar consentimiento para compartir información
- ✅ Revocar consentimientos
- ✅ Compartir información con terceros
- ✅ Exportar sus datos
- ❌ NO puede editar registros clínicos
- ❌ NO puede crear nuevos registros clínicos
- ❌ NO puede acceder a datos de otros pacientes

**Asignación:**
- Automática al crear cuenta de paciente
- Se asigna en Keycloak al crear usuario

**Ejemplo de uso:**
```typescript
@Get('patient')
@Roles(ROLES.PATIENT)
@UseGuards(JwtAuthGuard, RolesGuard)
async getPatientData(@CurrentUser() user: User) {
  // Solo pacientes pueden acceder
}
```

---

### 2. `practitioner`

**Descripción:** Profesional médico certificado.

**Constante:** `ROLES.PRACTITIONER`

**Permisos:**
- ✅ Crear registros clínicos (Encounter, Observation, Condition, DocumentReference)
- ✅ Actualizar registros clínicos existentes
- ✅ Leer datos de pacientes asignados o con consentimiento
- ✅ Crear DocumentReference (notas clínicas, informes)
- ✅ Desactivar registros clínicos (no eliminar permanentemente)
- ❌ NO puede eliminar registros clínicos permanentemente
- ❌ NO puede acceder a pacientes no asignados sin consentimiento

**Requisitos:**
- ⚠️ Verificación de identidad requerida (cédula profesional)
- ⚠️ Verificación manual o integración con servicio gubernamental
- ⚠️ Estado `verified=true` antes de asignar rol

**Asignación:**
- Manual por admin después de verificación
- Se puede asignar automáticamente cuando admin aprueba verificación

**Ejemplo de uso:**
```typescript
@Post('encounter')
@Roles(ROLES.PRACTITIONER, ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
async createEncounter(@Body() dto: CreateEncounterDto) {
  // Practitioners y admins pueden crear encounters
}
```

---

### 3. `practitioner-verified`

**Descripción:** Practitioner con identidad verificada.

**Constante:** No definida como constante (se usa string `'practitioner-verified'`)

**Permisos:**
- Mismos permisos que `practitioner`
- Indica que la identidad del practitioner ha sido verificada

**Asignación:**
- Automática cuando admin aprueba verificación
- Se agrega en Keycloak mediante `KeycloakAdminService.addRoleToUser()`

**Nota:** Este rol se agrega además del rol `practitioner`, no lo reemplaza.

---

### 4. `admin`

**Descripción:** Administrador del sistema con acceso completo.

**Constante:** `ROLES.ADMIN`

**Permisos:**
- ✅ Acceso completo al sistema
- ✅ Gestión de usuarios (crear, modificar, desactivar)
- ✅ Verificación de practitioners (aprobar/rechazar)
- ✅ Configuración del sistema
- ✅ Asignación de roles a usuarios
- ✅ Acceso a logs y auditoría
- ✅ Bypass de filtros de paciente (puede acceder a todos los pacientes)

**Asignación:**
- Solo manual por super administrador
- Requiere MFA habilitado

**Ejemplo de uso:**
```typescript
@Get('admin/users')
@Roles(ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard, MFARequiredGuard)
async listUsers() {
  // Solo admins con MFA pueden acceder
}
```

---

### 5. `viewer`

**Descripción:** Usuario con acceso de solo lectura temporal.

**Constante:** `ROLES.VIEWER`

**Permisos:**
- ✅ Leer datos con consentimiento explícito del paciente
- ✅ Acceso temporal (limitado por tiempo definido en consentimiento)
- ✅ Scopes limitados según consentimiento específico
- ❌ NO puede crear ni modificar datos
- ❌ NO puede exportar datos
- ❌ NO puede acceder sin consentimiento activo

**Asignación:**
- Temporal con consentimiento del paciente
- Se asigna cuando paciente comparte información

---

### 6. `lab`

**Descripción:** Sistema de laboratorio integrado.

**Constante:** `ROLES.LAB`

**Permisos:**
- ✅ Crear resultados de laboratorio (Observation con tipo "laboratory")
- ✅ Leer resultados de laboratorio existentes
- ✅ Scopes limitados a datos de laboratorio únicamente
- ❌ NO puede acceder a otros tipos de datos
- ❌ NO puede modificar datos existentes

**Asignación:**
- A sistemas de laboratorio integrados
- Configuración manual en Keycloak

---

### 7. `insurer`

**Descripción:** Sistema de aseguradora integrado.

**Constante:** `ROLES.INSURER`

**Permisos:**
- ✅ Leer datos con consentimiento explícito del paciente
- ✅ Scopes limitados según consentimiento específico
- ✅ Acceso a información necesaria para seguros
- ❌ NO puede crear ni modificar datos
- ❌ NO puede acceder sin consentimiento activo

**Asignación:**
- A sistemas de aseguradoras integrados
- Configuración manual en Keycloak

---

### 8. `system`

**Descripción:** Sistema externo integrado.

**Constante:** `ROLES.SYSTEM`

**Permisos:**
- ⚠️ Scopes específicos según configuración de integración
- ⚠️ Permisos definidos caso por caso según tipo de integración

**Asignación:**
- A sistemas externos según integración
- Configuración manual en Keycloak

---

### 9. `audit`

**Descripción:** Usuario de auditoría con acceso de solo lectura a logs.

**Constante:** `ROLES.AUDIT`

**Permisos:**
- ✅ Leer logs de auditoría
- ✅ Acceso a operaciones internas (solo lectura)
- ✅ Ver historial de accesos y modificaciones
- ✅ Exportar logs para análisis
- ❌ NO puede modificar datos
- ❌ NO puede gestionar usuarios
- ❌ NO puede acceder a datos clínicos de pacientes

**Asignación:**
- A usuarios de auditoría y compliance
- Configuración manual en Keycloak

---

## Permisos por Rol

### Matriz de Permisos por Recurso

| Recurso | Acción | patient | practitioner | admin | viewer | lab | insurer | system | audit |
|---------|--------|---------|--------------|-------|--------|-----|---------|--------|-------|
| **Patient** | Read (propio) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Patient** | Read (otros) | ❌ | ✅* | ✅ | ✅* | ❌ | ✅* | ⚠️ | ❌ |
| **Patient** | Write | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Patient** | Create | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Patient** | Delete | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Practitioner** | Read | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ⚠️ | ❌ |
| **Practitioner** | Write | ❌ | ✅** | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Practitioner** | Create | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Encounter** | Read (propio) | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ⚠️ | ❌ |
| **Encounter** | Read (otros) | ❌ | ✅* | ✅ | ✅* | ❌ | ✅* | ⚠️ | ❌ |
| **Encounter** | Write | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Encounter** | Create | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Encounter** | Delete | ❌ | ❌*** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **DocumentReference** | Read | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ⚠️ | ❌ |
| **DocumentReference** | Write | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **DocumentReference** | Create | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Consent** | Read | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Consent** | Write | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Consent** | Create | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Consent** | Share | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ⚠️ | ❌ |
| **Audit Logs** | Read | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Audit Logs** | Export | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |

**Leyenda:**
- `✅` = Permitido
- `❌` = No permitido
- `⚠️` = Depende de configuración específica
- `*` = Solo con consentimiento explícito del paciente
- `**` = Solo su propio registro
- `***` = Solo desactivar, no eliminar permanentemente

### Reglas Especiales

1. **Admin Bypass**: Los usuarios con rol `admin` pueden acceder a todos los recursos, independientemente de otros filtros.

2. **Patient Context (SMART on FHIR)**: Si el token tiene contexto de paciente (`patient` claim), el usuario solo puede acceder a ese paciente específico, incluso si tiene rol `practitioner` o `admin`.

3. **Consentimiento**: Los roles `viewer`, `insurer` y algunos casos de `practitioner` requieren consentimiento explícito del paciente para acceder a datos.

4. **Múltiples Roles**: Un usuario puede tener múltiples roles. El sistema verifica si el usuario tiene **al menos uno** de los roles requeridos.

---

## Asignación de Roles

### En Keycloak (Manual)

1. Acceder a Admin Console de Keycloak
2. Ir a **Users** → Seleccionar usuario
3. Ir a la pestaña **Role mapping**
4. Hacer clic en **Assign role**
5. Seleccionar roles y hacer clic en **Assign**

### Automática

#### Asignación de `patient`

Se asigna automáticamente cuando:
- Se crea un nuevo usuario en Keycloak
- El usuario se registra (si el registro está habilitado)

#### Asignación de `practitioner-verified`

Se asigna automáticamente cuando:
- Un admin aprueba la verificación de un practitioner
- Se ejecuta `KeycloakAdminService.addRoleToUser(userId, 'practitioner-verified')`

**Código:**
```typescript
// En AuthService.reviewVerification()
if (newStatus === VerificationStatus.APPROVED) {
  await this.keycloakAdminService.addRoleToUser(
    verification.keycloakUserId,
    'practitioner-verified',
  );
}
```

### Programática (API)

Para asignar roles programáticamente:

```typescript
import { KeycloakAdminService } from './services/keycloak-admin.service';

// Agregar rol
await keycloakAdminService.addRoleToUser(userId, 'practitioner');

// Remover rol
await keycloakAdminService.removeRoleFromUser(userId, 'practitioner');

// Actualizar roles
await keycloakAdminService.updateUserRoles(userId, ['patient', 'practitioner']);
```

---

## Validación de Roles

### RolesGuard

El `RolesGuard` valida que el usuario tenga al menos uno de los roles requeridos.

**Ubicación:** `src/modules/auth/guards/roles.guard.ts`

**Funcionamiento:**
1. Extrae roles requeridos del decorador `@Roles()`
2. Extrae roles del usuario del request (seteado por `JwtAuthGuard`)
3. Valida que el usuario tenga al menos uno de los roles requeridos
4. Lanza `ForbiddenException` si no tiene los roles

**Código:**
```typescript
@Injectable()
export class RolesGuard {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required
    }

    const user: User = request.user;
    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
```

### Orden de Guards

**IMPORTANTE:** `JwtAuthGuard` debe ejecutarse **antes** de `RolesGuard`:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard) // ✅ Correcto
@UseGuards(RolesGuard, JwtAuthGuard) // ❌ Incorrecto - user no estará disponible
```

---

## Uso en el Código

### Decorador @Roles()

El decorador `@Roles()` define qué roles son requeridos para acceder a un endpoint.

**Ubicación:** `src/modules/auth/decorators/roles.decorator.ts`

**Uso básico:**
```typescript
import { Roles } from './decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles';

@Get('admin')
@Roles(ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
async adminEndpoint() {
  return { message: 'Admin only' };
}
```

**Múltiples roles (OR lógico):**
```typescript
@Post('encounter')
@Roles(ROLES.PRACTITIONER, ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
async createEncounter(@Body() dto: CreateEncounterDto) {
  // Practitioners O admins pueden acceder
}
```

### Ejemplos en el Código

#### AuthController

```typescript
@Get('user')
@UseGuards(JwtAuthGuard) // Solo requiere autenticación
async getUser(@CurrentUser() user: User): Promise<User> {
  return user;
}

@Post('verify-practitioner')
@Roles(ROLES.PRACTITIONER, ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
async verifyPractitioner(@Body() dto: VerifyPractitionerDto) {
  // Solo practitioners o admins
}

@Get('verify-practitioner')
@Roles(ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard, MFARequiredGuard)
async listVerifications() {
  // Solo admins con MFA
}
```

#### FhirController

```typescript
@Get('Patient')
@Scopes(FHIR_SCOPES.PATIENT_READ)
@UseGuards(JwtAuthGuard, ScopesGuard)
async searchPatients(@Query() query: SearchPatientsDto) {
  // Requiere scope patient:read
}

@Post('Patient')
@Roles(ROLES.ADMIN)
@Scopes(FHIR_SCOPES.PATIENT_WRITE)
@UseGuards(JwtAuthGuard, RolesGuard, ScopesGuard)
async createPatient(@Body() dto: CreatePatientDto) {
  // Requiere rol admin Y scope patient:write
}

@Get('Encounter')
@Scopes(FHIR_SCOPES.ENCOUNTER_READ)
@UseGuards(JwtAuthGuard, ScopesGuard)
async searchEncounters(@CurrentUser() user: User) {
  // Requiere scope encounter:read
  // El servicio aplica filtros según rol y contexto
}
```

### Obtener Roles del Usuario

```typescript
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './interfaces/user.interface';

@Get('profile')
@UseGuards(JwtAuthGuard)
async getProfile(@CurrentUser() user: User) {
  // user.roles contiene los roles del usuario
  console.log(user.roles); // ['patient', 'practitioner']

  // Verificar si tiene un rol específico
  if (user.roles.includes(ROLES.ADMIN)) {
    // Usuario es admin
  }
}
```

---

## Integración con Scopes

Los roles y scopes trabajan juntos para proporcionar control de acceso granular.

### Roles vs Scopes

| Aspecto | Roles | Scopes |
|---------|-------|--------|
| **Nivel** | Alto nivel (tipo de usuario) | Granular (recurso/acción) |
| **Ejemplo** | `patient`, `practitioner` | `patient:read`, `patient:write` |
| **Asignación** | En Keycloak (realm roles) | En token OAuth2 |
| **Validación** | `RolesGuard` | `ScopesGuard` |
| **Uso** | Control de acceso general | Control de acceso específico |

### Combinación de Roles y Scopes

Puedes usar ambos juntos:

```typescript
@Post('Patient')
@Roles(ROLES.ADMIN)           // Requiere rol admin
@Scopes(FHIR_SCOPES.PATIENT_WRITE) // Y scope patient:write
@UseGuards(JwtAuthGuard, RolesGuard, ScopesGuard)
async createPatient(@Body() dto: CreatePatientDto) {
  // Usuario debe ser admin Y tener scope patient:write
}
```

### Lógica de Validación

1. **Roles**: Se validan primero (más rápido)
2. **Scopes**: Se validan después (más granular)
3. **Ambos deben pasar**: Si ambos decoradores están presentes, ambos deben ser válidos

---

## Tabla de Permisos por Recurso

### Patient

| Rol | Read | Write | Create | Delete |
|-----|------|-------|--------|--------|
| `patient` | ✅ (propio) | ❌ | ❌ | ❌ |
| `practitioner` | ✅ (todos*) | ❌ | ❌ | ❌ |
| `admin` | ✅ (todos) | ✅ | ✅ | ✅ |
| `viewer` | ✅ (con consentimiento) | ❌ | ❌ | ❌ |

### Practitioner

| Rol | Read | Write | Create | Delete |
|-----|------|-------|--------|--------|
| `patient` | ✅ | ❌ | ❌ | ❌ |
| `practitioner` | ✅ | ✅ (propio) | ✅ | ❌ |
| `admin` | ✅ | ✅ | ✅ | ✅ |
| `viewer` | ✅ (con consentimiento) | ❌ | ❌ | ❌ |

### Encounter

| Rol | Read | Write | Create | Delete |
|-----|------|-------|--------|--------|
| `patient` | ✅ (propio) | ❌ | ❌ | ❌ |
| `practitioner` | ✅ (todos*) | ✅ | ✅ | ❌*** |
| `admin` | ✅ (todos) | ✅ | ✅ | ✅ |
| `viewer` | ✅ (con consentimiento) | ❌ | ❌ | ❌ |

### DocumentReference

| Rol | Read | Write | Create | Delete |
|-----|------|-------|--------|--------|
| `patient` | ✅ (propio) | ❌ | ❌ | ❌ |
| `practitioner` | ✅ (todos*) | ✅ | ✅ | ❌ |
| `admin` | ✅ (todos) | ✅ | ✅ | ✅ |
| `viewer` | ✅ (con consentimiento) | ❌ | ❌ | ❌ |

### Consent

| Rol | Read | Write | Create | Share |
|-----|------|-------|--------|-------|
| `patient` | ✅ (propio) | ✅ | ✅ | ✅ |
| `practitioner` | ✅ | ❌ | ❌ | ❌ |
| `admin` | ✅ (todos) | ✅ | ✅ | ✅ |
| `viewer` | ❌ | ❌ | ❌ | ❌ |

**Notas:**
- `*` = Con consentimiento o asignación
- `***` = Solo desactivar, no eliminar permanentemente

---

## Ejemplos Prácticos

### Ejemplo 1: Endpoint Solo para Pacientes

```typescript
@Get('my-records')
@Roles(ROLES.PATIENT)
@UseGuards(JwtAuthGuard, RolesGuard)
async getMyRecords(@CurrentUser() user: User) {
  // Solo pacientes pueden ver sus propios registros
  return this.fhirService.searchPatients({ keycloakUserId: user.id });
}
```

### Ejemplo 2: Endpoint para Practitioners y Admins

```typescript
@Post('encounter')
@Roles(ROLES.PRACTITIONER, ROLES.ADMIN)
@Scopes(FHIR_SCOPES.ENCOUNTER_WRITE)
@UseGuards(JwtAuthGuard, RolesGuard, ScopesGuard)
async createEncounter(
  @Body() dto: CreateEncounterDto,
  @CurrentUser() user: User,
) {
  // Practitioners o admins con scope encounter:write
  return this.fhirService.createEncounter(dto, user.id);
}
```

### Ejemplo 3: Endpoint Solo para Admins con MFA

```typescript
@Get('admin/users')
@Roles(ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard, MFARequiredGuard)
async listUsers() {
  // Solo admins con MFA habilitado
  return this.userService.findAll();
}
```

### Ejemplo 4: Validación Manual de Roles

```typescript
@Get('resource')
@UseGuards(JwtAuthGuard)
async getResource(@CurrentUser() user: User) {
  // Validación manual
  if (!user.roles.includes(ROLES.ADMIN)) {
    throw new ForbiddenException('Admin access required');
  }

  return this.resourceService.findAll();
}
```

### Ejemplo 5: Filtrado por Rol en el Servicio

```typescript
// En FhirService
async searchPatients(user: User, query: SearchPatientsDto) {
  // Admin puede ver todos
  if (user.roles.includes(ROLES.ADMIN)) {
    return this.patientRepository.find(query);
  }

  // Patient solo puede ver sus propios datos
  if (user.roles.includes(ROLES.PATIENT)) {
    return this.patientRepository.find({
      ...query,
      keycloakUserId: user.id,
    });
  }

  // Practitioner puede ver pacientes asignados
  if (user.roles.includes(ROLES.PRACTITIONER)) {
    // Lógica para pacientes asignados
  }
}
```

---

## Mejores Prácticas

### 1. Usar Constantes en Lugar de Strings

✅ **Correcto:**
```typescript
@Roles(ROLES.ADMIN)
```

❌ **Incorrecto:**
```typescript
@Roles('admin')
```

### 2. Orden Correcto de Guards

✅ **Correcto:**
```typescript
@UseGuards(JwtAuthGuard, RolesGuard, ScopesGuard)
```

❌ **Incorrecto:**
```typescript
@UseGuards(RolesGuard, JwtAuthGuard) // user no estará disponible
```

### 3. Múltiples Roles (OR lógico)

```typescript
// Usuario necesita AL MENOS UNO de estos roles
@Roles(ROLES.PRACTITIONER, ROLES.ADMIN)
```

### 4. Combinar Roles y Scopes

```typescript
// Requiere rol Y scope
@Roles(ROLES.PRACTITIONER)
@Scopes(FHIR_SCOPES.ENCOUNTER_WRITE)
```

### 5. Validación en el Servicio

Para lógica compleja, validar en el servicio además del guard:

```typescript
@Get('patient/:id')
@UseGuards(JwtAuthGuard)
async getPatient(@Param('id') id: string, @CurrentUser() user: User) {
  // Validación en el servicio
  const patient = await this.fhirService.getPatient(id, user);
  return patient;
}
```

### 6. Documentar Roles Requeridos

```typescript
/**
 * Get patient data
 * @requires Roles: patient, admin
 * @requires Scopes: patient:read
 */
@Get('patient/:id')
@Roles(ROLES.PATIENT, ROLES.ADMIN)
@Scopes(FHIR_SCOPES.PATIENT_READ)
@UseGuards(JwtAuthGuard, RolesGuard, ScopesGuard)
async getPatient(@Param('id') id: string) {
  // ...
}
```

### 7. No Exponer Información Sensible en Errores

✅ **Correcto:**
```typescript
throw new ForbiddenException('Insufficient permissions');
```

❌ **Incorrecto:**
```typescript
throw new ForbiddenException(`User ${user.id} with roles ${user.roles} cannot access this`);
```

---

## Referencias

### Documentación del Código

- `src/common/constants/roles.ts` - Constantes de roles
- `src/modules/auth/guards/roles.guard.ts` - Guard de validación de roles
- `src/modules/auth/decorators/roles.decorator.ts` - Decorador @Roles()
- `keycloak/ROLES.md` - Documentación de roles en Keycloak

### Documentación del Proyecto

- [AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md) - Flujos de autenticación
- [KEYCLOAK_CONFIGURATION.md](./KEYCLOAK_CONFIGURATION.md) - Configuración de Keycloak
- [SCOPES_SETUP_GUIDE.md](./SCOPES_SETUP_GUIDE.md) - Configuración de scopes

### Especificaciones

- [OAuth2 RBAC](https://oauth.net/2/)
- [Keycloak Roles Documentation](https://www.keycloak.org/docs/latest/server_admin/#_roles)

---

**Última actualización:** 2025-12-12

