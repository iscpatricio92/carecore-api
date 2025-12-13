# Guía de Desarrollo - Autenticación y Autorización

Esta guía práctica está diseñada para desarrolladores que necesitan integrar autenticación y autorización en nuevos endpoints y módulos de CareCore API.

## Tabla de Contenidos

1. [Introducción](#introducción)
2. [Proteger Endpoints](#proteger-endpoints)
3. [Validar Roles](#validar-roles)
4. [Validar Scopes](#validar-scopes)
5. [Acceder al Usuario Autenticado](#acceder-al-usuario-autenticado)
6. [Filtrado por Contexto](#filtrado-por-contexto)
7. [Patrones Comunes](#patrones-comunes)
8. [Mejores Prácticas](#mejores-prácticas)
9. [Anti-Patrones](#anti-patrones)
10. [Ejemplos Completos](#ejemplos-completos)

---

## Introducción

CareCore API utiliza un sistema de autenticación y autorización basado en:

- **JWT Tokens**: Emitidos por Keycloak
- **Guards**: `JwtAuthGuard`, `RolesGuard`, `ScopesGuard`, `MFARequiredGuard`
- **Decorators**: `@Roles()`, `@Scopes()`, `@CurrentUser()`
- **RBAC + Scope-Based**: Combinación de roles y scopes para control granular

### Componentes Disponibles

```typescript
// Guards
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopesGuard } from '../auth/guards/scopes.guard';
import { MFARequiredGuard } from '../auth/guards/mfa-required.guard';

// Decorators
import { Roles } from '../auth/decorators/roles.decorator';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

// Constants
import { ROLES } from '../../common/constants/roles';
import { FHIR_SCOPES } from '../../common/constants/fhir-scopes';

// Interfaces
import { User } from '../auth/interfaces/user.interface';
```

---

## Proteger Endpoints

### Protección Básica (Solo Autenticación)

Para proteger un endpoint y requerir solo autenticación (sin validar roles o scopes):

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/interfaces/user.interface';

@Controller('profile')
export class ProfileController {
  @Get()
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
    };
  }
}
```

**Características:**
- ✅ Requiere token JWT válido
- ✅ Extrae información del usuario del token
- ✅ No valida roles ni scopes específicos

### Protección con Roles

Para requerir roles específicos:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles';

@Controller('admin')
export class AdminController {
  @Get('users')
  @Roles(ROLES.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async listUsers() {
    // Solo admins pueden acceder
    return this.userService.findAll();
  }
}
```

**Características:**
- ✅ Requiere token JWT válido
- ✅ Valida que el usuario tenga al menos uno de los roles especificados
- ✅ Lanza `ForbiddenException` si no tiene el rol

**Múltiples Roles (OR lógico):**

```typescript
@Get('encounter')
@Roles(ROLES.PRACTITIONER, ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
async createEncounter() {
  // Practitioners O admins pueden acceder
}
```

### Protección con Scopes

Para requerir scopes específicos:

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

**Características:**
- ✅ Requiere token JWT válido
- ✅ Valida que el token tenga todos los scopes especificados
- ✅ Lanza `ForbiddenException` si faltan scopes

**Múltiples Scopes (AND lógico):**

```typescript
@Post('Patient')
@Scopes(FHIR_SCOPES.PATIENT_READ, FHIR_SCOPES.PATIENT_WRITE)
@UseGuards(JwtAuthGuard, ScopesGuard)
async createPatient() {
  // Requiere AMBOS scopes: patient:read Y patient:write
}
```

### Protección Combinada (Roles + Scopes)

Para requerir tanto roles como scopes:

```typescript
@Post('Patient')
@Roles(ROLES.ADMIN)
@Scopes(FHIR_SCOPES.PATIENT_WRITE)
@UseGuards(JwtAuthGuard, RolesGuard, ScopesGuard)
async createPatient() {
  // Requiere rol admin Y scope patient:write
  return this.fhirService.createPatient();
}
```

**Orden de Guards:**

⚠️ **IMPORTANTE:** `JwtAuthGuard` debe ir **siempre primero**:

```typescript
// ✅ Correcto
@UseGuards(JwtAuthGuard, RolesGuard, ScopesGuard)

// ❌ Incorrecto - user no estará disponible
@UseGuards(RolesGuard, JwtAuthGuard)
```

### Protección con MFA

Para requerir MFA (Multi-Factor Authentication):

```typescript
import { MFARequiredGuard } from '../auth/guards/mfa-required.guard';

@Get('admin/sensitive')
@Roles(ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard, MFARequiredGuard)
async getSensitiveData() {
  // Requiere admin con MFA configurado
  return this.adminService.getSensitiveData();
}
```

**Características:**
- ✅ Valida que el usuario tenga MFA configurado
- ✅ Lanza `ForbiddenException` si MFA no está configurado
- ✅ Típicamente usado con roles críticos (admin, practitioner)

---

## Validar Roles

### Validación en el Controlador

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

### Validación en el Servicio

```typescript
@Injectable()
export class ResourceService {
  async findAll(user: User) {
    // Validar en el servicio
    if (!user.roles.includes(ROLES.ADMIN)) {
      throw new ForbiddenException('Admin access required');
    }

    return this.repository.find();
  }
}
```

### Validación con Múltiples Roles

```typescript
const hasAccess = [ROLES.ADMIN, ROLES.PRACTITIONER].some(
  (role) => user.roles.includes(role),
);

if (!hasAccess) {
  throw new ForbiddenException('Insufficient permissions');
}
```

---

## Validar Scopes

### Validación Manual

```typescript
@Get('resource')
@UseGuards(JwtAuthGuard)
async getResource(@CurrentUser() user: User) {
  const requiredScopes = [FHIR_SCOPES.PATIENT_READ];
  const hasScopes = requiredScopes.every(
    (scope) => user.scopes?.includes(scope),
  );

  if (!hasScopes) {
    throw new ForbiddenException('Insufficient scopes');
  }

  return this.resourceService.findAll();
}
```

### Validación con ScopePermissionService

```typescript
import { ScopePermissionService } from '../auth/services/scope-permission.service';

@Injectable()
export class ResourceService {
  constructor(
    private scopePermissionService: ScopePermissionService,
  ) {}

  async findAll(user: User) {
    // Validar permisos usando el servicio
    const hasPermission = this.scopePermissionService.hasResourcePermission(
      user,
      FHIR_RESOURCE_TYPES.PATIENT,
      FHIR_ACTIONS.READ,
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return this.repository.find();
  }
}
```

---

## Acceder al Usuario Autenticado

### Usar el Decorador @CurrentUser()

```typescript
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../auth/interfaces/user.interface';

@Controller('example')
export class ExampleController {
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      roles: user.roles,
      scopes: user.scopes,
    };
  }
}
```

### Propiedades del Usuario

El objeto `User` contiene:

```typescript
interface User {
  id: string;                    // Keycloak user ID
  email: string;                 // Email del usuario
  username: string;              // Username
  roles: string[];                // Roles del usuario
  scopes: string[];              // Scopes del token
  patient?: string;               // Patient context (SMART on FHIR)
  fhirUser?: string;             // FHIR user context
  mfaEnabled?: boolean;           // MFA habilitado
}
```

### Ejemplo de Uso

```typescript
@Get('my-data')
@UseGuards(JwtAuthGuard)
async getMyData(@CurrentUser() user: User) {
  // Filtrar por usuario
  if (user.roles.includes(ROLES.PATIENT)) {
    return this.service.findByUserId(user.id);
  }

  // Admin puede ver todo
  if (user.roles.includes(ROLES.ADMIN)) {
    return this.service.findAll();
  }

  throw new ForbiddenException('Insufficient permissions');
}
```

---

## Filtrado por Contexto

### Filtrado por Patient Context (SMART on FHIR)

Cuando un token tiene contexto de paciente, automáticamente filtra recursos:

```typescript
@Get('Patient')
@Scopes(FHIR_SCOPES.PATIENT_READ)
@UseGuards(JwtAuthGuard, ScopesGuard)
async searchPatients(@CurrentUser() user: User) {
  // El servicio aplica filtros automáticamente según el contexto
  return this.fhirService.searchPatients({}, user);
}
```

**En el Servicio:**

```typescript
async searchPatients(query: SearchPatientsDto, user: User) {
  // Admin puede ver todos
  if (user.roles.includes(ROLES.ADMIN)) {
    return this.patientRepository.find(query);
  }

  // Si hay contexto de paciente, solo ese paciente
  if (user.patient) {
    const patientId = user.patient.replace(/^Patient\//, '');
    return this.patientRepository.find({
      ...query,
      patientId,
    });
  }

  // Patient solo puede ver sus propios datos
  if (user.roles.includes(ROLES.PATIENT)) {
    return this.patientRepository.find({
      ...query,
      keycloakUserId: user.id,
    });
  }

  throw new ForbiddenException('Insufficient permissions');
}
```

### Filtrado por Practitioner

```typescript
async searchEncounters(user: User, query: SearchEncountersDto) {
  // Admin puede ver todos
  if (user.roles.includes(ROLES.ADMIN)) {
    return this.encounterRepository.find(query);
  }

  // Practitioner solo puede ver encounters donde es participante
  if (user.roles.includes(ROLES.PRACTITIONER)) {
    return this.encounterRepository.find({
      ...query,
      'fhirResource.participant': {
        $elemMatch: {
          'actor.reference': `Practitioner/${user.practitionerId}`,
        },
      },
    });
  }

  throw new ForbiddenException('Insufficient permissions');
}
```

---

## Patrones Comunes

### Patrón 1: Endpoint Público

```typescript
@Get('public')
// Sin guards - endpoint público
async getPublicData() {
  return { message: 'Public data' };
}
```

### Patrón 2: Endpoint Solo Autenticado

```typescript
@Get('protected')
@UseGuards(JwtAuthGuard)
async getProtectedData(@CurrentUser() user: User) {
  return { message: 'Protected data', userId: user.id };
}
```

### Patrón 3: Endpoint por Rol

```typescript
@Get('admin-only')
@Roles(ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
async getAdminData() {
  return { message: 'Admin only data' };
}
```

### Patrón 4: Endpoint por Scope

```typescript
@Get('scoped')
@Scopes(FHIR_SCOPES.PATIENT_READ)
@UseGuards(JwtAuthGuard, ScopesGuard)
async getScopedData() {
  return { message: 'Scoped data' };
}
```

### Patrón 5: Endpoint con Validación en Servicio

```typescript
@Get('complex')
@UseGuards(JwtAuthGuard)
async getComplexData(@CurrentUser() user: User) {
  // Validación compleja en el servicio
  return this.service.getComplexData(user);
}
```

### Patrón 6: Endpoint con Filtrado Automático

```typescript
@Get('filtered')
@Scopes(FHIR_SCOPES.PATIENT_READ)
@UseGuards(JwtAuthGuard, ScopesGuard)
async getFilteredData(@CurrentUser() user: User) {
  // El servicio aplica filtros según el usuario
  return this.service.getFilteredData(user);
}
```

---

## Mejores Prácticas

### 1. Usar Constantes en Lugar de Strings

✅ **Correcto:**
```typescript
@Roles(ROLES.ADMIN)
@Scopes(FHIR_SCOPES.PATIENT_READ)
```

❌ **Incorrecto:**
```typescript
@Roles('admin')
@Scopes('patient:read')
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

### 3. Validar en el Nivel Correcto

✅ **Correcto:** Validar en el guard cuando es simple
```typescript
@Roles(ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
```

✅ **Correcto:** Validar en el servicio cuando es complejo
```typescript
@UseGuards(JwtAuthGuard)
async complexOperation(@CurrentUser() user: User) {
  return this.service.complexOperation(user); // Validación en servicio
}
```

### 4. Documentar Roles y Scopes Requeridos

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

### 5. Manejar Errores Apropiadamente

✅ **Correcto:**
```typescript
if (!user.roles.includes(ROLES.ADMIN)) {
  throw new ForbiddenException('Admin access required');
}
```

❌ **Incorrecto:**
```typescript
if (!user.roles.includes(ROLES.ADMIN)) {
  throw new UnauthorizedException('Admin access required'); // Error incorrecto
}
```

### 6. No Exponer Información Sensible en Errores

✅ **Correcto:**
```typescript
throw new ForbiddenException('Insufficient permissions');
```

❌ **Incorrecto:**
```typescript
throw new ForbiddenException(
  `User ${user.id} with roles ${user.roles} cannot access this`,
);
```

### 7. Usar TypeScript para Type Safety

✅ **Correcto:**
```typescript
@CurrentUser() user: User
```

❌ **Incorrecto:**
```typescript
@CurrentUser() user: any
```

---

## Anti-Patrones

### ❌ Anti-Patrón 1: Validar Roles en el Controlador cuando se puede usar Guard

```typescript
// ❌ Incorrecto
@Get('admin')
@UseGuards(JwtAuthGuard)
async adminEndpoint(@CurrentUser() user: User) {
  if (!user.roles.includes(ROLES.ADMIN)) {
    throw new ForbiddenException('Admin required');
  }
  // ...
}

// ✅ Correcto
@Get('admin')
@Roles(ROLES.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
async adminEndpoint() {
  // ...
}
```

### ❌ Anti-Patrón 2: Orden Incorrecto de Guards

```typescript
// ❌ Incorrecto
@UseGuards(RolesGuard, JwtAuthGuard) // user no estará disponible

// ✅ Correcto
@UseGuards(JwtAuthGuard, RolesGuard)
```

### ❌ Anti-Patrón 3: Strings en Lugar de Constantes

```typescript
// ❌ Incorrecto
@Roles('admin')
@Scopes('patient:read')

// ✅ Correcto
@Roles(ROLES.ADMIN)
@Scopes(FHIR_SCOPES.PATIENT_READ)
```

### ❌ Anti-Patrón 4: No Validar en el Servicio cuando es Necesario

```typescript
// ❌ Incorrecto - confiar solo en guards cuando hay lógica compleja
@Get('resource')
@Roles(ROLES.PRACTITIONER)
@UseGuards(JwtAuthGuard, RolesGuard)
async getResource(@CurrentUser() user: User) {
  // No valida si el practitioner tiene acceso a este recurso específico
  return this.service.getResource(id);
}

// ✅ Correcto - validar en el servicio
@Get('resource')
@Roles(ROLES.PRACTITIONER)
@UseGuards(JwtAuthGuard, RolesGuard)
async getResource(@Param('id') id: string, @CurrentUser() user: User) {
  return this.service.getResource(id, user); // Validación en servicio
}
```

### ❌ Anti-Patrón 5: Exponer Información Sensible

```typescript
// ❌ Incorrecto
throw new ForbiddenException(
  `User ${user.id} with email ${user.email} cannot access resource ${resourceId}`,
);

// ✅ Correcto
throw new ForbiddenException('Insufficient permissions');
```

---

## Ejemplos Completos

### Ejemplo 1: Endpoint Simple con Rol

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles';

@Controller('admin')
export class AdminController {
  @Get('users')
  @Roles(ROLES.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async listUsers() {
    return this.userService.findAll();
  }
}
```

### Ejemplo 2: Endpoint con Scope

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
    return this.fhirService.searchPatients();
  }
}
```

### Ejemplo 3: Endpoint con Roles y Scopes

```typescript
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ScopesGuard } from '../auth/guards/scopes.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ROLES } from '../../common/constants/roles';
import { FHIR_SCOPES } from '../../common/constants/fhir-scopes';
import { User } from '../auth/interfaces/user.interface';

@Controller('fhir')
export class FhirController {
  @Post('Patient')
  @Roles(ROLES.ADMIN)
  @Scopes(FHIR_SCOPES.PATIENT_WRITE)
  @UseGuards(JwtAuthGuard, RolesGuard, ScopesGuard)
  async createPatient(
    @Body() dto: CreatePatientDto,
    @CurrentUser() user: User,
  ) {
    return this.fhirService.createPatient(dto, user);
  }
}
```

### Ejemplo 4: Endpoint con Validación en Servicio

```typescript
import { Controller, Get, Param, UseGuards, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ROLES } from '../../common/constants/roles';
import { User } from '../auth/interfaces/user.interface';

@Controller('encounters')
export class EncounterController {
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getEncounter(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    // Validación compleja en el servicio
    const encounter = await this.encounterService.getEncounter(id, user);

    if (!encounter) {
      throw new NotFoundException('Encounter not found');
    }

    return encounter;
  }
}

// En el servicio
@Injectable()
export class EncounterService {
  async getEncounter(id: string, user: User) {
    const encounter = await this.repository.findOne(id);

    if (!encounter) {
      return null;
    }

    // Admin puede ver todos
    if (user.roles.includes(ROLES.ADMIN)) {
      return encounter;
    }

    // Patient solo puede ver sus propios encounters
    if (user.roles.includes(ROLES.PATIENT)) {
      const patientId = encounter.fhirResource.subject?.reference?.replace(
        /^Patient\//,
        '',
      );
      if (patientId && this.isUserPatient(user, patientId)) {
        return encounter;
      }
    }

    // Practitioner solo puede ver encounters donde participa
    if (user.roles.includes(ROLES.PRACTITIONER)) {
      const practitionerId = user.practitionerId;
      const isParticipant = encounter.fhirResource.participant?.some(
        (p) => p.actor?.reference === `Practitioner/${practitionerId}`,
      );
      if (isParticipant) {
        return encounter;
      }
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
```

### Ejemplo 5: Endpoint con Filtrado Automático

```typescript
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ScopesGuard } from '../auth/guards/scopes.guard';
import { Scopes } from '../auth/decorators/scopes.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FHIR_SCOPES } from '../../common/constants/fhir-scopes';
import { User } from '../auth/interfaces/user.interface';

@Controller('fhir')
export class FhirController {
  @Get('Patient')
  @Scopes(FHIR_SCOPES.PATIENT_READ)
  @UseGuards(JwtAuthGuard, ScopesGuard)
  async searchPatients(
    @Query() query: SearchPatientsDto,
    @CurrentUser() user: User,
  ) {
    // El servicio aplica filtros automáticamente según el usuario
    return this.fhirService.searchPatients(query, user);
  }
}

// En el servicio
@Injectable()
export class FhirService {
  async searchPatients(query: SearchPatientsDto, user: User) {
    // Admin puede ver todos (bypass de filtros)
    if (user.roles.includes(ROLES.ADMIN)) {
      return this.patientRepository.find(query);
    }

    // Si hay contexto de paciente (SMART on FHIR), solo ese paciente
    if (user.patient) {
      const patientId = user.patient.replace(/^Patient\//, '');
      return this.patientRepository.find({
        ...query,
        patientId,
      });
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
      return this.patientRepository.findAssignedToPractitioner(
        user.practitionerId,
        query,
      );
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
```

### Ejemplo 6: Endpoint con MFA

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MFARequiredGuard } from '../auth/guards/mfa-required.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles';

@Controller('admin')
export class AdminController {
  @Get('sensitive')
  @Roles(ROLES.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard, MFARequiredGuard)
  async getSensitiveData() {
    // Requiere admin con MFA configurado
    return this.adminService.getSensitiveData();
  }
}
```

---

## Referencias

### Documentación del Proyecto

- [AUTHENTICATION_FLOW.md](./AUTHENTICATION_FLOW.md) - Flujos de autenticación completos
- [ROLES_AND_PERMISSIONS.md](./ROLES_AND_PERMISSIONS.md) - Sistema de roles y permisos
- [SMART_ON_FHIR_GUIDE.md](./SMART_ON_FHIR_GUIDE.md) - Integración SMART on FHIR
- [KEYCLOAK_CONFIGURATION.md](./KEYCLOAK_CONFIGURATION.md) - Configuración de Keycloak

### Código de Referencia

- `src/modules/auth/guards/` - Implementación de guards
- `src/modules/auth/decorators/` - Decoradores personalizados
- `src/modules/fhir/fhir.controller.ts` - Ejemplos completos de uso
- `src/modules/auth/auth.controller.ts` - Ejemplos de endpoints de autenticación

### Constantes

- `src/common/constants/roles.ts` - Constantes de roles
- `src/common/constants/fhir-scopes.ts` - Constantes de scopes
- `src/common/constants/fhir-actions.ts` - Constantes de acciones FHIR

---

**Última actualización:** 2025-12-12

