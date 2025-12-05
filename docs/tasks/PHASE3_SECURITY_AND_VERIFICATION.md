# 📋 Tareas GitHub Projects - Fase 3: Seguridad Avanzada y Verificación

> ⚠️ **ARCHIVO TEMPORAL**
> Este archivo contiene tareas detalladas para agregar en GitHub Projects.
> **Puede ser eliminado** una vez que:
> - Las tareas estén agregadas a GitHub Projects
> - Las tareas estén completadas
> - Ya no se necesite como referencia
>
> Para documentación permanente, ver: [AUTH_IMPLEMENTATION_PLAN.md](../AUTH_IMPLEMENTATION_PLAN.md)

---

## 📖 Historia de Usuario (HU)

### HU: Verificación de Practitioners y Seguridad Avanzada

**Como** administrador del sistema CareCore,
**Quiero** implementar verificación de identidad para practitioners, MFA para roles críticos, y scopes granulares para permisos,
**Para** garantizar que solo profesionales médicos verificados puedan acceder a datos sensibles y mejorar la seguridad general del sistema.

#### Criterios de Aceptación

- ✅ Los practitioners pueden solicitar verificación subiendo documentos
- ✅ Los administradores pueden revisar y aprobar/rechazar verificaciones
- ✅ Los roles se actualizan automáticamente en Keycloak al verificar
- ✅ MFA está configurado y disponible para todos los usuarios
- ✅ MFA es obligatorio para roles críticos (admin, practitioner)
- ✅ Los scopes están definidos y mapeados a permisos FHIR
- ✅ Los endpoints validan scopes además de roles
- ✅ La documentación está actualizada con los nuevos flujos

#### Tareas Relacionadas

Esta HU incluye las siguientes tareas (ver detalles abajo):

**Verificación de Practitioners:**
- ✅ **Tarea 1**: Crear endpoint POST /auth/verify-practitioner
- ✅ **Tarea 2**: Crear entidad PractitionerVerification en base de datos
- ✅ **Tarea 3**: Implementar upload de documentos (cédula/licencia)
- ✅ **Tarea 4**: Crear flujo de revisión manual (admin)
- ✅ **Tarea 5**: Actualizar rol en Keycloak cuando se verifica

**MFA (Multi-Factor Authentication):**
- **Tarea 6**: Configurar MFA en Keycloak (TOTP)
- **Tarea 7**: Crear endpoint POST /auth/mfa/setup - Setup MFA
- **Tarea 8**: Crear endpoint POST /auth/mfa/verify - Verificar código
- **Tarea 9**: Crear endpoint POST /auth/mfa/disable - Deshabilitar MFA
- **Tarea 10**: Forzar MFA para roles críticos (admin, practitioner)

**Scopes y Permisos:**
- **Tarea 11**: Definir scopes en Keycloak (patient:read, patient:write, etc.)
- **Tarea 12**: Crear ScopesGuard que valida scopes
- **Tarea 13**: Crear decorador @Scopes() para endpoints
- **Tarea 14**: Mapear scopes a permisos de recursos FHIR

#### Estimación

- **Tiempo total**: 40-60 horas (6-8 días)
- **Prioridad**: Alta
- **Dependencias**: Fase 1 y Fase 2 completadas ✅

#### Definición de Terminado (DoD)

- [ ] Todas las tareas de la Fase 3 completadas
- [ ] Tests unitarios y E2E pasando
- [ ] Documentación actualizada
- [ ] Verificación de practitioners funcionando end-to-end
- [ ] MFA configurado y funcionando
- [ ] Scopes implementados y validados
- [ ] Integración con Keycloak verificada

---

## 🎯 Tareas Principales

### Tarea 1: Crear endpoint POST /auth/verify-practitioner ✅

**Título:** `feat(auth): crear endpoint POST /auth/verify-practitioner para solicitar verificación`

**Descripción:**
```markdown
## Objetivo
Crear endpoint que permite a los practitioners solicitar verificación de identidad subiendo documentos.

## Tareas
- [x] Crear DTO `VerifyPractitionerDto` con:
  - `practitionerId` (string, required) - ID del Practitioner FHIR
  - `documentType` (enum: 'cedula' | 'licencia', required)
  - `documentFile` (file, required) - Archivo del documento
  - `additionalInfo` (string, optional) - Información adicional
- [x] Crear método `requestVerification()` en `AuthService`
- [x] Implementar validación de archivo (tipo, tamaño)
- [x] Guardar archivo en almacenamiento temporal
- [x] Crear registro en `PractitionerVerification` con estado 'pending'
- [ ] Enviar notificación a administradores (opcional)
- [x] Agregar endpoint en `AuthController`
- [x] Proteger endpoint con `@UseGuards(JwtAuthGuard, RolesGuard)`
- [x] Restringir a rol `practitioner`
- [x] Agregar documentación Swagger

## Endpoint Esperado

```
POST /api/auth/verify-practitioner
Content-Type: multipart/form-data

Body:
- practitionerId: string
- documentType: 'cedula' | 'licencia'
- documentFile: File
- additionalInfo?: string
```

## Respuesta

```json
{
  "verificationId": "uuid",
  "status": "pending",
  "message": "Verification request submitted successfully",
  "estimatedReviewTime": "2-3 business days"
}
```

## Criterios de Aceptación
- [x] Endpoint creado y funcional
- [x] Validación de archivos implementada
- [x] Archivos guardados correctamente
- [x] Registro en base de datos creado
- [x] Endpoint protegido con autenticación y roles
- [x] Documentación Swagger completa
- [x] Tests unitarios y E2E pasando

## Referencias
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload)
- [Multer Configuration](https://github.com/expressjs/multer)
```

**Labels:** `enhancement`, `auth`, `phase-3`, `security`

---

### Tarea 2: Crear entidad PractitionerVerification en base de datos ✅

**Título:** `feat(auth): crear entidad PractitionerVerification para tracking de verificaciones`

**Descripción:**
```markdown
## Objetivo
Crear entidad TypeORM para almacenar las solicitudes de verificación de practitioners y su estado.

## Tareas
- [x] Crear `PractitionerVerificationEntity` en `src/entities/practitioner-verification.entity.ts`
- [x] Definir campos:
  - `id` (UUID, primary key)
  - `practitionerId` (string, FK a Practitioner FHIR ID)
  - `keycloakUserId` (string, nullable) - ID del usuario en Keycloak
  - `documentType` (enum: 'cedula' | 'licencia')
  - `documentPath` (string) - Ruta al archivo del documento
  - `status` (enum: 'pending' | 'approved' | 'rejected' | 'expired')
  - `reviewedBy` (string, nullable) - ID del admin que revisó
  - `reviewedAt` (timestamp, nullable)
  - `rejectionReason` (text, nullable)
  - `additionalInfo` (text, nullable)
  - `createdAt` (timestamp)
  - `updatedAt` (timestamp)
- [x] Agregar índices:
  - `practitionerId`
  - `keycloakUserId`
  - `status`
  - `createdAt`
- [x] Crear migración con `npm run migration:create -- CreatePractitionerVerificationTable`
- [x] Ejecutar migración
- [x] Crear repositorio en módulo correspondiente

## Estructura de la Entidad

```typescript
@Entity('practitioner_verifications')
export class PractitionerVerificationEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  practitionerId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  keycloakUserId: string | null;

  @Column({ type: 'enum', enum: ['cedula', 'licencia'] })
  documentType: 'cedula' | 'licencia';

  @Column({ type: 'varchar', length: 500 })
  documentPath: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending'
  })
  status: 'pending' | 'approved' | 'rejected' | 'expired';

  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewedBy: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'text', nullable: true })
  additionalInfo: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## Criterios de Aceptación
- [x] Entidad creada con todos los campos necesarios
- [x] Migración creada y ejecutada exitosamente
- [x] Índices creados para optimizar consultas
- [x] Repositorio disponible para uso en servicios

## Referencias
- [TypeORM Entities](https://typeorm.io/entities)
- Ver entidades existentes como referencia
```

**Labels:** `enhancement`, `auth`, `phase-3`, `database`

---

### Tarea 3: Implementar upload de documentos (cédula/licencia) ✅

**Título:** `feat(auth): implementar upload y almacenamiento de documentos de verificación`

**Descripción:**
```markdown
## Objetivo
Implementar el sistema de almacenamiento de documentos subidos para verificación de practitioners.

## Tareas
- [x] Configurar Multer para manejo de archivos
- [x] Crear servicio `DocumentStorageService`:
  - Método `storeVerificationDocument(file, practitionerId, documentType)`
  - Validar tipo de archivo (PDF, JPG, PNG)
  - Validar tamaño máximo (ej: 10MB)
  - Generar nombre único para el archivo
  - Guardar en directorio `storage/verifications/{practitionerId}/`
  - Retornar ruta relativa del archivo
- [x] Implementar validación de archivos:
  - Tipos permitidos: PDF, JPG, PNG
  - Tamaño máximo: 10MB
  - Validar que el archivo no esté corrupto
- [x] Agregar variables de entorno:
  - `VERIFICATION_DOCUMENTS_PATH` (default: `storage/verifications`)
  - `MAX_DOCUMENT_SIZE` (default: 10485760 - 10MB)
- [x] Agregar `storage/verifications/` a `.gitignore` (ya está en `storage/`)
- [x] Documentar variables en `docs/ENV_VARIABLES.md`
- [ ] Crear método de limpieza para documentos expirados/rechazados (futuro)
- [x] Integrar con `AuthService.requestVerification()`

## Estructura de Almacenamiento

```
storage/
└── verifications/
    └── {practitionerId}/
        ├── cedula_{timestamp}.pdf
        └── licencia_{timestamp}.pdf
```

## Validaciones

- **Tipos permitidos:** PDF, JPG, PNG
- **Tamaño máximo:** 10MB
- **Nombres de archivo:** Sanitizados para evitar path traversal

## Criterios de Aceptación
- [x] Archivos se guardan correctamente
- [x] Validaciones funcionan (tipo, tamaño)
- [x] Rutas de archivos se almacenan en base de datos
- [x] Directorio no se commitea a git
- [ ] Servicio de limpieza implementado (futuro)
- [x] Tests unitarios pasando

## Seguridad
- ⚠️ Validar tipos MIME, no solo extensiones
- ⚠️ Sanitizar nombres de archivo
- ⚠️ Limitar tamaño de archivo
- ⚠️ Considerar encriptación para documentos sensibles

## Referencias
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload)
- Ver `DocumentsService` para referencia de almacenamiento
```

**Labels:** `enhancement`, `auth`, `phase-3`, `security`

---

### Tarea 4: Crear flujo de revisión manual (admin) ✅

**Título:** `feat(auth): crear endpoints para revisión manual de verificaciones por admin`

**Descripción:**
```markdown
## Objetivo
Crear endpoints que permiten a los administradores revisar, aprobar o rechazar solicitudes de verificación.

## Tareas
- [x] Crear DTOs:
  - `ReviewVerificationDto` con:
    - `status` (enum: 'approved' | 'rejected', required)
    - `rejectionReason` (string, optional, required si status='rejected')
- [x] Crear método `reviewVerification()` en `AuthService`
- [x] Implementar lógica:
  - Validar que la verificación existe y está en estado 'pending'
  - Validar que el usuario es admin
  - Actualizar estado de verificación
  - Si aprobada: actualizar rol en Keycloak (ver Tarea 5)
  - Guardar información del revisor
  - Enviar notificación al practitioner (opcional)
- [x] Crear endpoint `PUT /api/auth/verify-practitioner/:id/review`
- [x] Crear endpoint `GET /api/auth/verify-practitioner` (listar todas, solo admin)
- [x] Crear endpoint `GET /api/auth/verify-practitioner/:id` (detalle, solo admin)
- [x] Proteger endpoints con `@UseGuards(JwtAuthGuard, RolesGuard)`
- [x] Restringir a rol `admin`
- [x] Agregar documentación Swagger

## Endpoints Esperados

```
GET /api/auth/verify-practitioner
  - Lista todas las verificaciones (solo admin)
  - Query params: status, page, limit

GET /api/auth/verify-practitioner/:id
  - Obtiene detalle de una verificación (solo admin)

PUT /api/auth/verify-practitioner/:id/review
  - Revisa y aprueba/rechaza una verificación (solo admin)
```

## Respuesta de Revisión

```json
{
  "verificationId": "uuid",
  "status": "approved",
  "reviewedBy": "admin-user-id",
  "reviewedAt": "2025-01-27T10:00:00Z",
  "message": "Verification approved successfully"
}
```

## Criterios de Aceptación
- [x] Endpoints creados y funcionales
- [x] Solo admins pueden acceder
- [x] Validaciones implementadas
- [x] Integración con Keycloak para actualizar roles
- [x] Documentación Swagger completa
- [x] Tests unitarios y E2E pasando

## Referencias
- Ver `ConsentsService` para referencia de flujos de aprobación
```

**Labels:** `enhancement`, `auth`, `phase-3`, `admin`

---

### Tarea 5: Actualizar rol en Keycloak cuando se verifica ✅

**Título:** `feat(auth): integrar actualización automática de roles en Keycloak al verificar practitioner`

**Descripción:**
```markdown
## Objetivo
Cuando un practitioner es verificado, actualizar automáticamente su rol en Keycloak para reflejar el estado verificado.

## Tareas
- [x] Instalar cliente de Keycloak Admin API:
  - `@keycloak/keycloak-admin-client` o similar
- [x] Crear servicio `KeycloakAdminService`:
  - Método `updateUserRoles(userId, roles)`
  - Método `addRoleToUser(userId, roleName)`
  - Método `removeRoleFromUser(userId, roleName)`
- [x] Configurar credenciales de admin de Keycloak:
  - `KEYCLOAK_ADMIN_CLIENT_ID`
  - `KEYCLOAK_ADMIN_CLIENT_SECRET`
- [x] Integrar con `AuthService.reviewVerification()`:
  - Si status='approved': agregar rol 'practitioner-verified' o actualizar rol existente
  - Si status='rejected': mantener rol 'practitioner' sin verificación
- [x] Manejar errores de Keycloak:
  - Logging de errores
  - Rollback de estado en base de datos si falla
- [x] Agregar tests de integración (mock de Keycloak)

## Flujo Esperado

1. Admin aprueba verificación
2. Se actualiza estado en base de datos
3. Se llama a Keycloak Admin API
4. Se agrega rol 'practitioner-verified' al usuario
5. Usuario ahora tiene acceso a endpoints de practitioner verificado

## Roles en Keycloak

- `practitioner` - Rol base (sin verificación)
- `practitioner-verified` - Rol adicional cuando está verificado
- O alternativamente: actualizar atributo `verified: true` en usuario

## Criterios de Aceptación
- [x] Servicio de Keycloak Admin creado
- [x] Integración funcionando correctamente
- [x] Roles se actualizan automáticamente
- [x] Manejo de errores implementado
- [x] Tests de integración pasando (11 pasando, 11 omitidos temporalmente)

## Referencias
- [Keycloak Admin REST API](https://www.keycloak.org/docs-api/latest/rest-api/)
- [Keycloak Admin Client](https://www.keycloak.org/docs/latest/server_admin/#admin-cli)
```

**Labels:** `enhancement`, `auth`, `phase-3`, `integration`

---

### Tarea 6: Configurar MFA en Keycloak (TOTP)

**Título:** `feat(auth): configurar MFA TOTP en Keycloak realm`

**Descripción:**
```markdown
## Objetivo
Configurar Multi-Factor Authentication usando TOTP (Time-based One-Time Password) en Keycloak.

## Tareas
- [ ] Acceder a admin console de Keycloak
- [ ] Navegar a Authentication > Flows
- [ ] Crear o modificar flow de autenticación:
  - Agregar step "OTP Form" después de "Username Password Form"
- [ ] Configurar TOTP:
  - Habilitar TOTP como método de autenticación
  - Configurar algoritmo: SHA1
  - Configurar dígitos: 6
  - Configurar período: 30 segundos
  - Configurar look ahead window: 1
- [ ] Crear Authentication Flow para MFA:
  - Flow name: "Browser with MFA"
  - Basado en "Browser" flow
  - Agregar "OTP Form" como step requerido
- [ ] Configurar Conditional OTP (opcional):
  - Hacer MFA condicional basado en roles
  - Roles críticos (admin, practitioner) requieren MFA obligatorio
- [ ] Exportar configuración del realm (para versionado)
- [ ] Documentar configuración en `keycloak/README.md`

## Configuración Esperada

- **Método:** TOTP (Time-based One-Time Password)
- **Algoritmo:** SHA1
- **Dígitos:** 6
- **Período:** 30 segundos
- **Look ahead window:** 1

## Flujos de Autenticación

1. **Browser Flow (sin MFA):** Para usuarios normales
2. **Browser with MFA:** Para roles críticos o usuarios que habilitaron MFA

## Criterios de Aceptación
- [ ] MFA configurado en Keycloak
- [ ] TOTP funcionando correctamente
- [ ] Flujos de autenticación creados
- [ ] Configuración exportada y versionada
- [ ] Documentación actualizada

## Referencias
- [Keycloak Authentication Flows](https://www.keycloak.org/docs/latest/server_admin/#_authentication-flows)
- [Keycloak TOTP](https://www.keycloak.org/docs/latest/server_admin/#_otp)
```

**Labels:** `enhancement`, `auth`, `phase-3`, `security`, `keycloak`

---

### Tarea 7: Crear endpoint POST /auth/mfa/setup - Setup MFA

**Título:** `feat(auth): crear endpoint para configurar MFA para usuarios`

**Descripción:**
```markdown
## Objetivo
Crear endpoint que permite a los usuarios configurar MFA en su cuenta.

## Tareas
- [ ] Crear método `setupMFA()` en `AuthService`
- [ ] Integrar con Keycloak Admin API:
  - Llamar a endpoint de Keycloak para generar secret TOTP
  - Obtener QR code para escanear con app autenticadora
- [ ] Crear DTO `SetupMFAResponseDto` con:
  - `secret` (string) - Secret para TOTP
  - `qrCode` (string) - URL o base64 del QR code
  - `manualEntryKey` (string) - Clave para entrada manual
- [ ] Crear endpoint `POST /api/auth/mfa/setup`
- [ ] Proteger endpoint con `@UseGuards(JwtAuthGuard)`
- [ ] Validar que el usuario no tenga MFA ya configurado
- [ ] Generar QR code usando librería (ej: `qrcode`)
- [ ] Retornar secret y QR code
- [ ] Agregar documentación Swagger

## Endpoint Esperado

```
POST /api/auth/mfa/setup
Authorization: Bearer <token>
```

## Respuesta

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KG...",
  "manualEntryKey": "JBSWY3DPEHPK3PXP",
  "message": "Scan the QR code with your authenticator app"
}
```

## Flujo

1. Usuario llama a `/auth/mfa/setup`
2. Sistema genera secret TOTP
3. Sistema genera QR code con secret
4. Usuario escanea QR code con app autenticadora
5. Usuario verifica con código (ver Tarea 8)

## Criterios de Aceptación
- [ ] Endpoint creado y funcional
- [ ] Secret TOTP generado correctamente
- [ ] QR code generado y retornado
- [ ] Integración con Keycloak funcionando
- [ ] Documentación Swagger completa
- [ ] Tests unitarios pasando

## Referencias
- [Keycloak Admin API - TOTP](https://www.keycloak.org/docs-api/latest/rest-api/#_users_resource)
- [QR Code Generation](https://www.npmjs.com/package/qrcode)
```

**Labels:** `enhancement`, `auth`, `phase-3`, `security`

---

### Tarea 8: Crear endpoint POST /auth/mfa/verify - Verificar código

**Título:** `feat(auth): crear endpoint para verificar código MFA y completar setup`

**Descripción:**
```markdown
## Objetivo
Crear endpoint que permite verificar el código TOTP durante el setup de MFA y habilitarlo permanentemente.

## Tareas
- [ ] Crear DTO `VerifyMFADto` con:
  - `code` (string, required) - Código TOTP de 6 dígitos
- [ ] Crear método `verifyMFASetup()` en `AuthService`
- [ ] Implementar validación:
  - Verificar que el código TOTP es válido
  - Validar contra el secret generado en setup
  - Considerar ventana de tiempo (look ahead)
- [ ] Integrar con Keycloak:
  - Habilitar MFA para el usuario en Keycloak
  - Configurar TOTP credential
- [ ] Crear endpoint `POST /api/auth/mfa/verify`
- [ ] Proteger endpoint con `@UseGuards(JwtAuthGuard)`
- [ ] Retornar éxito si código es válido
- [ ] Retornar error si código es inválido (con mensaje claro)
- [ ] Agregar documentación Swagger

## Endpoint Esperado

```
POST /api/auth/mfa/verify
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "123456"
}
```

## Respuesta Exitosa

```json
{
  "success": true,
  "message": "MFA enabled successfully",
  "mfaEnabled": true
}
```

## Respuesta de Error

```json
{
  "success": false,
  "message": "Invalid TOTP code. Please try again.",
  "mfaEnabled": false
}
```

## Criterios de Aceptación
- [ ] Endpoint creado y funcional
- [ ] Validación de código TOTP implementada
- [ ] Integración con Keycloak funcionando
- [ ] MFA se habilita correctamente
- [ ] Manejo de errores implementado
- [ ] Documentación Swagger completa
- [ ] Tests unitarios pasando

## Referencias
- [TOTP Validation](https://tools.ietf.org/html/rfc6238)
- Ver librerías como `otplib` para validación TOTP
```

**Labels:** `enhancement`, `auth`, `phase-3`, `security`

---

### Tarea 9: Crear endpoint POST /auth/mfa/disable - Deshabilitar MFA

**Título:** `feat(auth): crear endpoint para deshabilitar MFA (requiere verificación)`

**Descripción:**
```markdown
## Objetivo
Crear endpoint que permite a los usuarios deshabilitar MFA, requiriendo verificación con código TOTP actual.

## Tareas
- [ ] Crear DTO `DisableMFADto` con:
  - `code` (string, required) - Código TOTP actual para verificar
- [ ] Crear método `disableMFA()` en `AuthService`
- [ ] Implementar validación de seguridad:
  - Requerir código TOTP válido para deshabilitar
  - Validar que el usuario tiene MFA habilitado
  - Para roles críticos: requerir aprobación de admin (opcional)
- [ ] Integrar con Keycloak:
  - Remover credential TOTP del usuario
  - Deshabilitar MFA requirement
- [ ] Crear endpoint `POST /api/auth/mfa/disable`
- [ ] Proteger endpoint con `@UseGuards(JwtAuthGuard)`
- [ ] Agregar validación especial para roles críticos
- [ ] Agregar documentación Swagger

## Endpoint Esperado

```
POST /api/auth/mfa/disable
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "123456"
}
```

## Respuesta

```json
{
  "success": true,
  "message": "MFA disabled successfully",
  "mfaEnabled": false
}
```

## Seguridad

- ⚠️ Requerir código TOTP válido para deshabilitar
- ⚠️ Para roles críticos (admin, practitioner), considerar requerir aprobación adicional
- ⚠️ Registrar acción en audit log

## Criterios de Aceptación
- [ ] Endpoint creado y funcional
- [ ] Validación de código TOTP requerida
- [ ] Integración con Keycloak funcionando
- [ ] MFA se deshabilita correctamente
- [ ] Validaciones de seguridad implementadas
- [ ] Documentación Swagger completa
- [ ] Tests unitarios pasando

## Referencias
- Ver Tarea 8 para referencia de validación TOTP
```

**Labels:** `enhancement`, `auth`, `phase-3`, `security`

---

### Tarea 10: Forzar MFA para roles críticos (admin, practitioner)

**Título:** `feat(auth): implementar requerimiento obligatorio de MFA para roles críticos`

**Descripción:**
```markdown
## Objetivo
Implementar lógica que fuerza a usuarios con roles críticos (admin, practitioner) a configurar MFA antes de acceder al sistema.

## Tareas
- [ ] Crear guard `MFARequiredGuard`:
  - Verificar si el usuario tiene rol crítico (admin, practitioner)
  - Verificar si el usuario tiene MFA habilitado
  - Si tiene rol crítico y no tiene MFA: retornar error 403 con mensaje
- [ ] Crear decorador `@RequireMFA()` para endpoints críticos
- [ ] Integrar guard en `AuthModule`
- [ ] Aplicar guard a endpoints críticos:
  - Endpoints de administración
  - Endpoints de creación/modificación de recursos FHIR
  - Endpoints de gestión de usuarios
- [ ] Crear endpoint de verificación de estado MFA:
  - `GET /api/auth/mfa/status` - Retorna si MFA está habilitado
- [ ] Modificar flujo de login:
  - Si usuario tiene rol crítico y no tiene MFA: redirigir a setup MFA
- [ ] Agregar validación en middleware/interceptor:
  - Verificar MFA antes de procesar requests de roles críticos
- [ ] Agregar documentación

## Guard Esperado

```typescript
@Injectable()
export class MFARequiredGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = context.switchToHttp().getRequest().user;
    const criticalRoles = [ROLES.ADMIN, ROLES.PRACTITIONER];

    if (criticalRoles.some(role => user.roles.includes(role))) {
      return user.mfaEnabled === true;
    }

    return true;
  }
}
```

## Respuesta de Error

```json
{
  "statusCode": 403,
  "message": "MFA is required for your role. Please configure MFA first.",
  "error": "Forbidden",
  "mfaSetupUrl": "/api/auth/mfa/setup"
}
```

## Criterios de Aceptación
- [ ] Guard creado y funcional
- [ ] Validación aplicada a roles críticos
- [ ] Endpoints protegidos correctamente
- [ ] Flujo de redirección a setup MFA implementado
- [ ] Documentación actualizada
- [ ] Tests unitarios y E2E pasando

## Referencias
- Ver `RolesGuard` para referencia de implementación de guards
```

**Labels:** `enhancement`, `auth`, `phase-3`, `security`

---

### Tarea 11: Definir scopes en Keycloak (patient:read, patient:write, etc.)

**Título:** `feat(auth): definir scopes OAuth2 en Keycloak para permisos granulares`

**Descripción:**
```markdown
## Objetivo
Definir scopes OAuth2 en Keycloak que mapean a permisos específicos de recursos FHIR.

## Tareas
- [ ] Acceder a admin console de Keycloak
- [ ] Navegar a Clients > carecore-api > Client Scopes
- [ ] Crear client scopes para recursos FHIR:
  - `patient:read` - Leer datos de pacientes
  - `patient:write` - Crear/actualizar pacientes
  - `practitioner:read` - Leer datos de practitioners
  - `practitioner:write` - Crear/actualizar practitioners
  - `encounter:read` - Leer encounters
  - `encounter:write` - Crear/actualizar encounters
  - `document:read` - Leer documentos
  - `document:write` - Crear/actualizar documentos
  - `consent:read` - Leer consentimientos
  - `consent:write` - Crear/actualizar consentimientos
  - `consent:share` - Compartir consentimientos
- [ ] Configurar cada scope:
  - Display name
  - Description
  - Include in Token Scope: ON
- [ ] Asignar scopes a client "carecore-api"
- [ ] Crear scope groups (opcional):
  - `fhir:read` - Agrupa todos los scopes de lectura
  - `fhir:write` - Agrupa todos los scopes de escritura
- [ ] Exportar configuración del realm
- [ ] Documentar scopes en `docs/AUTH_IMPLEMENTATION_PLAN.md`

## Scopes a Crear

| Scope | Descripción | Recurso FHIR |
|-------|-------------|--------------|
| `patient:read` | Leer datos de pacientes | Patient |
| `patient:write` | Crear/actualizar pacientes | Patient |
| `practitioner:read` | Leer datos de practitioners | Practitioner |
| `practitioner:write` | Crear/actualizar practitioners | Practitioner |
| `encounter:read` | Leer encounters | Encounter |
| `encounter:write` | Crear/actualizar encounters | Encounter |
| `document:read` | Leer documentos | DocumentReference |
| `document:write` | Crear/actualizar documentos | DocumentReference |
| `consent:read` | Leer consentimientos | Consent |
| `consent:write` | Crear/actualizar consentimientos | Consent |
| `consent:share` | Compartir consentimientos | Consent |

## Criterios de Aceptación
- [ ] Todos los scopes creados en Keycloak
- [ ] Scopes asignados al client correcto
- [ ] Configuración exportada y versionada
- [ ] Documentación actualizada

## Referencias
- [Keycloak Client Scopes](https://www.keycloak.org/docs/latest/server_admin/#_client_scopes)
- [OAuth2 Scopes](https://oauth.net/2/scope/)
```

**Labels:** `enhancement`, `auth`, `phase-3`, `keycloak`, `security`

---

### Tarea 12: Crear ScopesGuard que valida scopes

**Título:** `feat(auth): crear ScopesGuard para validar scopes OAuth2 en requests`

**Descripción:**
```markdown
## Objetivo
Crear guard que valida que el token JWT contiene los scopes necesarios para acceder a un endpoint.

## Tareas
- [ ] Crear `ScopesGuard` en `src/modules/auth/guards/scopes.guard.ts`
- [ ] Implementar `CanActivate`:
  - Extraer scopes del token JWT (campo `scope` o `scp`)
  - Comparar con scopes requeridos del decorador `@Scopes()`
  - Retornar `true` si todos los scopes requeridos están presentes
  - Retornar `false` si falta algún scope (403 Forbidden)
- [ ] Manejar formato de scopes:
  - Pueden venir como string separado por espacios: "patient:read patient:write"
  - O como array: ["patient:read", "patient:write"]
- [ ] Crear error personalizado:
  - `InsufficientScopesException` con mensaje claro
- [ ] Integrar guard en `AuthModule`
- [ ] Agregar tests unitarios

## Guard Esperado

```typescript
@Injectable()
export class ScopesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const requiredScopes = this.reflector.get<string[]>('scopes', context.getHandler());

    if (!requiredScopes || requiredScopes.length === 0) {
      return true; // No scopes required
    }

    const userScopes = this.extractScopes(user);
    const hasAllScopes = requiredScopes.every(scope => userScopes.includes(scope));

    if (!hasAllScopes) {
      throw new InsufficientScopesException(requiredScopes, userScopes);
    }

    return true;
  }

  private extractScopes(user: User): string[] {
    // Extract from JWT token
    const token = user.token; // Assuming token is attached
    const decoded = jwt.decode(token);
    const scopeString = decoded?.scope || '';
    return scopeString.split(' ').filter(Boolean);
  }
}
```

## Criterios de Aceptación
- [ ] Guard creado y funcional
- [ ] Validación de scopes implementada
- [ ] Manejo de errores implementado
- [ ] Integrado en AuthModule
- [ ] Tests unitarios pasando

## Referencias
- Ver `RolesGuard` para referencia de implementación
- [JWT Scope Claim](https://datatracker.ietf.org/doc/html/rfc8693)
```

**Labels:** `enhancement`, `auth`, `phase-3`, `security`

---

### Tarea 13: Crear decorador @Scopes() para endpoints

**Título:** `feat(auth): crear decorador @Scopes() para especificar scopes requeridos en endpoints`

**Descripción:**
```markdown
## Objetivo
Crear decorador que permite especificar qué scopes son requeridos para acceder a un endpoint.

## Tareas
- [ ] Crear decorador `@Scopes()` en `src/modules/auth/decorators/scopes.decorator.ts`
- [ ] Implementar usando `SetMetadata`:
  - Key: 'scopes'
  - Value: array de strings (scopes requeridos)
- [ ] Crear tipos TypeScript:
  - `FhirResourceType` - Tipos de recursos FHIR
  - `FhirAction` - Acciones (read, write, share, etc.)
- [ ] Crear helper function para generar scopes:
  - `fhirScope(resource: FhirResourceType, action: FhirAction)` - Retorna "resource:action"
- [ ] Documentar uso del decorador
- [ ] Agregar ejemplos en código

## Decorador Esperado

```typescript
export const SCOPES_KEY = 'scopes';

export const Scopes = (...scopes: string[]) => SetMetadata(SCOPES_KEY, scopes);

// Helper functions
export const fhirScope = (resource: string, action: string) => `${resource}:${action}`;
```

## Uso Esperado

```typescript
@Get(':id')
@Scopes('patient:read')
@UseGuards(JwtAuthGuard, ScopesGuard)
getPatient(@Param('id') id: string) {
  // ...
}

@Post()
@Scopes('patient:write')
@UseGuards(JwtAuthGuard, ScopesGuard)
createPatient(@Body() dto: CreatePatientDto) {
  // ...
}

// Múltiples scopes
@Post(':id/share')
@Scopes('consent:read', 'consent:share')
@UseGuards(JwtAuthGuard, ScopesGuard)
shareConsent(@Param('id') id: string) {
  // ...
}
```

## Criterios de Aceptación
- [ ] Decorador creado y funcional
- [ ] Helper functions implementadas
- [ ] Documentación y ejemplos agregados
- [ ] Integrado con ScopesGuard
- [ ] Tests unitarios pasando

## Referencias
- Ver `@Roles()` decorator para referencia
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
```

**Labels:** `enhancement`, `auth`, `phase-3`, `security`

---

### Tarea 14: Mapear scopes a permisos de recursos FHIR

**Título:** `feat(auth): implementar mapeo de scopes OAuth2 a permisos de recursos FHIR`

**Descripción:**
```markdown
## Objetivo
Crear sistema que mapea scopes OAuth2 a permisos específicos de recursos FHIR y valida acceso según scopes.

## Tareas
- [ ] Crear servicio `ScopePermissionService`:
  - Método `hasPermission(scope: string, resourceType: string, action: string): boolean`
  - Método `getRequiredScopes(resourceType: string, action: string): string[]`
  - Método `validateScopes(userScopes: string[], requiredScopes: string[]): boolean`
- [ ] Crear mapeo de scopes a permisos:
  ```typescript
  const SCOPE_PERMISSIONS = {
    'patient:read': { resource: 'Patient', action: 'read' },
    'patient:write': { resource: 'Patient', action: 'write' },
    // ... más mapeos
  };
  ```
- [ ] Integrar con servicios FHIR:
  - Modificar `FhirService` para validar scopes antes de operaciones
  - Modificar `ConsentsService` para validar scopes
  - Modificar `DocumentsService` para validar scopes
- [ ] Crear helper functions:
  - `getScopeForResource(resourceType, action)` - Genera scope string
  - `parseScope(scope)` - Parsea scope string a objeto
- [ ] Actualizar guards existentes:
  - Combinar validación de roles y scopes
  - Roles pueden otorgar scopes automáticamente (ej: admin tiene todos los scopes)
- [ ] Agregar logging de validaciones de scopes
- [ ] Documentar mapeo de scopes

## Mapeo Esperado

| Scope | Resource | Action | Descripción |
|-------|----------|--------|-------------|
| `patient:read` | Patient | read | Leer datos de pacientes |
| `patient:write` | Patient | write | Crear/actualizar pacientes |
| `practitioner:read` | Practitioner | read | Leer datos de practitioners |
| `practitioner:write` | Practitioner | write | Crear/actualizar practitioners |
| `encounter:read` | Encounter | read | Leer encounters |
| `encounter:write` | Encounter | write | Crear/actualizar encounters |
| `document:read` | DocumentReference | read | Leer documentos |
| `document:write` | DocumentReference | write | Crear/actualizar documentos |
| `consent:read` | Consent | read | Leer consentimientos |
| `consent:write` | Consent | write | Crear/actualizar consentimientos |
| `consent:share` | Consent | share | Compartir consentimientos |

## Lógica de Validación

1. Verificar roles primero (más permisivo)
2. Si no tiene rol privilegiado, verificar scopes
3. Admin tiene todos los scopes automáticamente
4. Practitioner tiene scopes de lectura/escritura de sus recursos

## Criterios de Aceptación
- [ ] Servicio de mapeo creado
- [ ] Mapeo completo de scopes implementado
- [ ] Integración con servicios FHIR funcionando
- [ ] Validación combinada de roles y scopes
- [ ] Documentación actualizada
- [ ] Tests unitarios pasando

## Referencias
- Ver `FhirService.canAccessPatient()` para referencia de validación
```

**Labels:** `enhancement`, `auth`, `phase-3`, `security`, `fhir`

---

## 📊 Resumen de Tareas

| # | Tarea | Estimación | Prioridad | Labels |
|---|-------|------------|-----------|--------|
| 1 | Crear endpoint POST /auth/verify-practitioner ✅ | 4-6 horas | Alta | `enhancement`, `auth`, `phase-3`, `security` |
| 2 | Crear entidad PractitionerVerification ✅ | 2-3 horas | Alta | `enhancement`, `auth`, `phase-3`, `database` |
| 3 | Implementar upload de documentos ✅ | 4-6 horas | Alta | `enhancement`, `auth`, `phase-3`, `security` |
| 4 | Crear flujo de revisión manual (admin) ✅ | 4-6 horas | Alta | `enhancement`, `auth`, `phase-3`, `admin` |
| 5 | Actualizar rol en Keycloak cuando se verifica ✅ | 3-4 horas | Alta | `enhancement`, `auth`, `phase-3`, `integration` |
| 6 | Configurar MFA en Keycloak (TOTP) | 2-3 horas | Alta | `enhancement`, `auth`, `phase-3`, `security`, `keycloak` |
| 7 | Crear endpoint POST /auth/mfa/setup | 3-4 horas | Alta | `enhancement`, `auth`, `phase-3`, `security` |
| 8 | Crear endpoint POST /auth/mfa/verify | 2-3 horas | Alta | `enhancement`, `auth`, `phase-3`, `security` |
| 9 | Crear endpoint POST /auth/mfa/disable | 2-3 horas | Media | `enhancement`, `auth`, `phase-3`, `security` |
| 10 | Forzar MFA para roles críticos | 3-4 horas | Alta | `enhancement`, `auth`, `phase-3`, `security` |
| 11 | Definir scopes en Keycloak | 2-3 horas | Alta | `enhancement`, `auth`, `phase-3`, `keycloak`, `security` |
| 12 | Crear ScopesGuard | 3-4 horas | Alta | `enhancement`, `auth`, `phase-3`, `security` |
| 13 | Crear decorador @Scopes() | 2-3 horas | Alta | `enhancement`, `auth`, `phase-3`, `security` |
| 14 | Mapear scopes a permisos FHIR | 4-6 horas | Alta | `enhancement`, `auth`, `phase-3`, `security`, `fhir` |

**Tiempo Total Estimado:** 40-60 horas (6-8 días)

---

## 🚀 Cómo Usar Esta Lista

### Opción 1: Crear Issues Individuales
1. Copia cada tarea como un nuevo Issue en GitHub
2. Usa el título y descripción proporcionados
3. Agrega los labels sugeridos
4. Asigna a un milestone "Fase 3: Seguridad Avanzada y Verificación"

### Opción 2: Crear Issue Épico (HU)
1. Crea un issue principal "Fase 3: Seguridad Avanzada y Verificación" (HU)
2. Crea issues hijos para cada tarea
3. Usa GitHub Projects para organizar

### Opción 3: Usar Script Automático
1. Ejecuta: `node scripts/create-github-tasks-phase3.js`
2. El script creará la HU y todas las tareas automáticamente
3. Las tareas se vincularán a la HU como parent

---

**Última actualización**: 2025-01-27
