# Configuración de Roles Base en Keycloak

Esta guía explica cómo crear y configurar los roles base del sistema en el realm "carecore" de Keycloak.

## 🎯 Objetivo

Crear todos los roles base del sistema que definirán los permisos y acceso de los diferentes tipos de usuarios en CareCore.

## 📋 Requisitos Previos

- ✅ Realm "carecore" creado (ver [REALM_SETUP.md](./REALM_SETUP.md))
- ✅ Acceso a Admin Console de Keycloak

## 🚀 Configuración Paso a Paso

### Paso 1: Acceder a Admin Console

1. Iniciar servicios (si no están corriendo):

   ```bash
   npm run docker:up
   ```

2. Acceder a Admin Console:
   - URL: `${KEYCLOAK_URL}` (ver `.env.local`)
   - Usuario: Valor de `KEYCLOAK_ADMIN` en `.env.local`
   - Contraseña: Valor de `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`

3. Seleccionar el realm "carecore" en el dropdown superior izquierdo

### Paso 2: Crear Roles

1. En el menú lateral izquierdo, ir a **Realm roles**
2. Hacer clic en **Create role** (botón en la esquina superior derecha)
3. Para cada rol, seguir estos pasos:
   - Ingresar **Role name** (ver lista abajo)
   - Ingresar **Description** (ver descripciones abajo)
   - Hacer clic en **Save**

### Paso 3: Roles a Crear

#### 1. Rol: `patient`

- **Role name:** `patient`
- **Description:** `Usuario paciente, dueño de su información médica. Puede leer, dar consentimiento, revocar, compartir y exportar sus propios datos.`
- **Composites:** Ninguno (rol base)

**Permisos:**

- ✅ Leer sus propios datos médicos
- ✅ Dar consentimiento para compartir información
- ✅ Revocar consentimientos
- ✅ Compartir información con terceros
- ✅ Exportar sus datos
- ❌ NO puede editar registros clínicos
- ❌ NO puede crear/modificar datos de otros pacientes

#### 2. Rol: `practitioner`

- **Role name:** `practitioner`
- **Description:** `Profesional médico certificado. Puede crear y actualizar registros clínicos, leer datos de pacientes asignados. Requiere verificación de identidad.`
- **Composites:** Ninguno (rol base)

**Permisos:**

- ✅ Crear registros clínicos (Encounter, Observation, Condition, etc.)
- ✅ Actualizar registros clínicos
- ✅ Leer datos de pacientes asignados
- ✅ Crear DocumentReference (notas, informes)
- ❌ NO puede eliminar registros clínicos (solo desactivar)
- ❌ NO puede acceder a pacientes no asignados sin consentimiento

**Nota:** Este rol requiere verificación de identidad (cédula profesional) antes de ser asignado.

#### 3. Rol: `viewer`

- **Role name:** `viewer`
- **Description:** `Usuario con acceso de solo lectura temporal. Usado para segundas opiniones y consultas con scopes temporales.`
- **Composites:** Ninguno (rol base)

**Permisos:**

- ✅ Leer datos con consentimiento explícito
- ✅ Acceso temporal (limitado por tiempo)
- ✅ Scopes limitados según consentimiento
- ❌ NO puede crear ni modificar datos
- ❌ NO puede exportar datos

#### 4. Rol: `lab`

- **Role name:** `lab`
- **Description:** `Sistema de laboratorio integrado. Puede crear y leer resultados de laboratorio con scopes limitados.`
- **Composites:** Ninguno (rol base)

**Permisos:**

- ✅ Crear resultados de laboratorio (Observation)
- ✅ Leer resultados de laboratorio
- ✅ Scopes limitados a datos de laboratorio
- ❌ NO puede acceder a otros tipos de datos
- ❌ NO puede modificar datos existentes

#### 5. Rol: `insurer`

- **Role name:** `insurer`
- **Description:** `Sistema de aseguradora integrado. Puede leer datos con consentimiento y scopes limitados.`
- **Composites:** Ninguno (rol base)

**Permisos:**

- ✅ Leer datos con consentimiento explícito
- ✅ Scopes limitados según consentimiento
- ✅ Acceso a información necesaria para seguros
- ❌ NO puede crear ni modificar datos
- ❌ NO puede acceder sin consentimiento

#### 6. Rol: `system`

- **Role name:** `system`
- **Description:** `Sistema externo integrado. Permisos específicos según integración.`
- **Composites:** Ninguno (rol base)

**Permisos:**

- ✅ Scopes específicos según integración
- ✅ Acceso según configuración de integración
- ⚠️ Permisos definidos caso por caso

#### 7. Rol: `admin`

- **Role name:** `admin`
- **Description:** `Administrador del sistema. Acceso completo, gestión de usuarios, verificación de practitioners.`
- **Composites:** Ninguno (rol base)

**Permisos:**

- ✅ Acceso completo al sistema
- ✅ Gestión de usuarios
- ✅ Verificación de practitioners
- ✅ Configuración del sistema
- ✅ Asignación de roles
- ⚠️ Usar con precaución

#### 8. Rol: `audit`

- **Role name:** `audit`
- **Description:** `Usuario de auditoría. Puede leer logs de auditoría y operaciones internas.`
- **Composites:** Ninguno (rol base)

**Permisos:**

- ✅ Leer logs de auditoría
- ✅ Acceso a operaciones internas
- ✅ Ver historial de accesos
- ❌ NO puede modificar datos
- ❌ NO puede gestionar usuarios

## ✅ Verificación

### Verificar que los Roles Existen

1. En **Realm roles**, verificar que todos los roles aparecen en la lista:
   - ✅ patient
   - ✅ practitioner
   - ✅ viewer
   - ✅ lab
   - ✅ insurer
   - ✅ system
   - ✅ admin
   - ✅ audit

### Verificar Descripciones

1. Abrir cada rol y verificar que la descripción sea correcta
2. Verificar que no haya roles compuestos configurados (por ahora)

## 📝 Configuración de Roles Compuestos (Futuro)

En el futuro, puedes crear roles compuestos para simplificar la gestión:

**Ejemplo:**

- Rol `practitioner-verified` que incluye `practitioner` + permisos adicionales
- Rol `patient-premium` que incluye `patient` + permisos adicionales

Para configurar roles compuestos:

1. Ir a **Realm roles** → Seleccionar rol
2. Ir a pestaña **Composite roles**
3. Agregar roles base como composites

## 🔒 Asignación de Roles

### Asignar Roles a Usuarios

1. Ir a **Users** en el menú lateral
2. Seleccionar o crear un usuario
3. Ir a pestaña **Role mappings**
4. Hacer clic en **Assign role**
5. Seleccionar roles del realm "carecore"
6. Asignar los roles apropiados

### Asignar Roles a Clientes (Service Accounts)

Para clientes que usan Service Accounts (como `carecore-api`):

1. Ir a **Clients** → `carecore-api`
2. Ir a pestaña **Service account roles**
3. Asignar roles según necesidades del servicio

## 📚 Próximos Pasos

Después de crear los roles, continúa con:

- [Tarea #8: Documentar setup de Keycloak](../docs/tasks/PHASE1_KEYCLOAK_SETUP.md#tarea-8-documentar-setup-de-keycloak)
- [Fase 2: Integración NestJS](../docs/AUTH_IMPLEMENTATION_PLAN.md#fase-2-integración-nestjs)
  - Implementar `RolesGuard`
  - Crear decorador `@Roles()`
  - Mapear roles de Keycloak a la aplicación

## 🐛 Troubleshooting

### No puedo crear roles

1. Verificar que estés en el realm "carecore" (no en "master")
2. Verificar permisos de administrador
3. Verificar logs de Keycloak para errores

### Los roles no aparecen en los tokens

1. Verificar que los roles estén asignados al usuario
2. Verificar configuración de mappers en el cliente
3. Verificar que el scope `roles` esté incluido en la petición

### No puedo asignar roles a usuarios

1. Verificar que el usuario exista
2. Verificar que los roles estén creados
3. Verificar permisos de administrador

## 📖 Referencias

- [Keycloak Roles Documentation](https://www.keycloak.org/docs/latest/server_admin/#_roles)
- [Keycloak Composite Roles](https://www.keycloak.org/docs/latest/server_admin/#_composite_roles)
- [Keycloak Role Mappings](https://www.keycloak.org/docs/latest/server_admin/#_role_mappings)
