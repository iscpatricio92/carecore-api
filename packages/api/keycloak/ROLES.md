# Roles y Permisos del Sistema CareCore

Este documento describe los roles base del sistema y sus permisos asociados.

## 📋 Roles Base

### `patient`

**Descripción:** Usuario paciente, dueño de su información médica.

**Permisos:**

- ✅ **Leer** sus propios datos médicos (Patient, Encounter, Observation, Condition, etc.)
- ✅ **Dar consentimiento** para compartir información con terceros
- ✅ **Revocar consentimientos** en cualquier momento
- ✅ **Compartir** información con practitioners, laboratorios, aseguradoras
- ✅ **Exportar** sus datos en formato estándar (FHIR, PDF, etc.)
- ✅ **Agregar notas personales** a sus registros (sin modificar registros clínicos)
- ❌ **NO puede editar** registros clínicos creados por practitioners
- ❌ **NO puede crear** nuevos registros clínicos
- ❌ **NO puede acceder** a datos de otros pacientes

**Casos de uso:**

- Paciente accede a su historial médico
- Paciente comparte información para segunda opinión
- Paciente exporta sus datos para otro sistema

---

### `practitioner`

**Descripción:** Profesional médico certificado con cédula profesional verificada.

**Permisos:**

- ✅ **Crear** registros clínicos (Encounter, Observation, Condition, DocumentReference)
- ✅ **Actualizar** registros clínicos existentes
- ✅ **Leer** datos de pacientes asignados o con consentimiento
- ✅ **Crear** DocumentReference (notas clínicas, informes)
- ✅ **Desactivar** registros clínicos (no eliminar permanentemente)
- ❌ **NO puede eliminar** registros clínicos permanentemente
- ❌ **NO puede acceder** a pacientes no asignados sin consentimiento
- ❌ **NO puede modificar** datos de otros practitioners sin autorización

**Requisitos:**

- ⚠️ **Verificación de identidad requerida** (cédula profesional)
- ⚠️ **Verificación manual** o integración con servicio gubernamental
- ⚠️ **Estado verified=true** antes de asignar rol

**Casos de uso:**

- Médico crea una consulta (Encounter)
- Médico registra signos vitales (Observation)
- Médico crea un diagnóstico (Condition)
- Médico sube un informe médico (DocumentReference)

---

### `viewer`

**Descripción:** Usuario con acceso de solo lectura temporal para segundas opiniones y consultas.

**Permisos:**

- ✅ **Leer** datos con consentimiento explícito del paciente
- ✅ **Acceso temporal** (limitado por tiempo definido en consentimiento)
- ✅ **Scopes limitados** según consentimiento específico
- ❌ **NO puede crear** ni modificar datos
- ❌ **NO puede exportar** datos
- ❌ **NO puede acceder** sin consentimiento activo

**Casos de uso:**

- Segundo médico consulta historial para segunda opinión
- Especialista revisa caso con permiso temporal
- Consultor externo revisa caso específico

---

### `lab`

**Descripción:** Sistema de laboratorio integrado para crear y leer resultados de laboratorio.

**Permisos:**

- ✅ **Crear** resultados de laboratorio (Observation con tipo "laboratory")
- ✅ **Leer** resultados de laboratorio existentes
- ✅ **Scopes limitados** a datos de laboratorio únicamente
- ❌ **NO puede acceder** a otros tipos de datos (encounters, conditions, etc.)
- ❌ **NO puede modificar** datos existentes
- ❌ **NO puede crear** otros tipos de registros clínicos

**Casos de uso:**

- Laboratorio sube resultados de análisis de sangre
- Laboratorio sube resultados de estudios de imagen
- Sistema de laboratorio consulta resultados previos

---

### `insurer`

**Descripción:** Sistema de aseguradora integrado para acceder a información necesaria para seguros.

**Permisos:**

- ✅ **Leer** datos con consentimiento explícito del paciente
- ✅ **Scopes limitados** según consentimiento específico
- ✅ **Acceso** a información necesaria para seguros (diagnósticos, procedimientos, costos)
- ❌ **NO puede crear** ni modificar datos
- ❌ **NO puede acceder** sin consentimiento activo
- ❌ **NO puede acceder** a información no relacionada con seguros

**Casos de uso:**

- Aseguradora verifica cobertura de procedimiento
- Aseguradora revisa diagnósticos para autorización
- Sistema de aseguradora consulta historial para evaluación

---

### `system`

**Descripción:** Sistema externo integrado con permisos específicos según integración.

**Permisos:**

- ✅ **Scopes específicos** según configuración de integración
- ✅ **Acceso** según necesidades de la integración
- ⚠️ **Permisos definidos caso por caso** según tipo de integración

**Casos de uso:**

- Integración con sistema de hospital externo
- Integración con sistema de farmacia
- Integración con sistema de telemedicina

---

### `admin`

**Descripción:** Administrador del sistema con acceso completo.

**Permisos:**

- ✅ **Acceso completo** al sistema
- ✅ **Gestión de usuarios** (crear, modificar, desactivar)
- ✅ **Verificación de practitioners** (aprobar/rechazar verificaciones)
- ✅ **Configuración del sistema**
- ✅ **Asignación de roles** a usuarios
- ✅ **Acceso a logs** y auditoría
- ⚠️ **Usar con precaución** - acceso completo

**Casos de uso:**

- Administrador verifica cédula de nuevo practitioner
- Administrador gestiona usuarios del sistema
- Administrador configura integraciones
- Administrador revisa logs de seguridad

---

### `audit`

**Descripción:** Usuario de auditoría con acceso de solo lectura a logs y operaciones.

**Permisos:**

- ✅ **Leer logs** de auditoría
- ✅ **Acceso a operaciones internas** (solo lectura)
- ✅ **Ver historial de accesos** y modificaciones
- ✅ **Exportar logs** para análisis
- ❌ **NO puede modificar** datos
- ❌ **NO puede gestionar** usuarios
- ❌ **NO puede acceder** a datos clínicos de pacientes

**Casos de uso:**

- Auditor revisa logs de acceso
- Compliance verifica cumplimiento de políticas
- Análisis de seguridad y detección de anomalías

---

## 🔄 Jerarquía de Roles (Futuro)

En el futuro, se pueden crear roles compuestos para simplificar la gestión:

```
admin
  └── (incluye todos los permisos)

practitioner-verified
  └── practitioner (base)
      └── (permisos adicionales de practitioner verificado)

patient-premium
  └── patient (base)
      └── (permisos adicionales de paciente premium)
```

## 📊 Matriz de Permisos

| Rol            | Crear Registros | Leer Propios | Leer Otros | Modificar | Eliminar | Consentimiento | Exportar   |
| -------------- | --------------- | ------------ | ---------- | --------- | -------- | -------------- | ---------- |
| `patient`      | ❌              | ✅           | ❌         | ❌        | ❌       | ✅             | ✅         |
| `practitioner` | ✅              | ✅           | ✅\*       | ✅        | ❌\*\*   | ❌             | ❌         |
| `viewer`       | ❌              | ❌           | ✅\*       | ❌        | ❌       | ❌             | ❌         |
| `lab`          | ✅\*\*\*        | ✅\*\*\*     | ❌         | ❌        | ❌       | ❌             | ❌         |
| `insurer`      | ❌              | ❌           | ✅\*       | ❌        | ❌       | ❌             | ❌         |
| `system`       | ⚠️              | ⚠️           | ⚠️         | ⚠️        | ❌       | ❌             | ⚠️         |
| `admin`        | ✅              | ✅           | ✅         | ✅        | ✅       | ✅             | ✅         |
| `audit`        | ❌              | ❌           | ❌         | ❌        | ❌       | ❌             | ✅\*\*\*\* |

**Leyenda:**

- `*` Solo con consentimiento explícito del paciente
- `**` Solo desactivar, no eliminar permanentemente
- `***` Solo resultados de laboratorio
- `****` Solo logs de auditoría

## 🔒 Asignación de Roles

### Reglas de Asignación

1. **patient**: Asignado automáticamente al crear cuenta de paciente
2. **practitioner**: Requiere verificación de identidad antes de asignar
3. **viewer**: Asignado temporalmente con consentimiento del paciente
4. **lab**: Asignado a sistemas de laboratorio integrados
5. **insurer**: Asignado a sistemas de aseguradoras integrados
6. **system**: Asignado a sistemas externos según integración
7. **admin**: Solo asignado manualmente por super administrador
8. **audit**: Asignado a usuarios de auditoría y compliance

### Múltiples Roles

Un usuario puede tener múltiples roles según su función:

- Un médico puede ser `practitioner` y también `patient` (si es paciente)
- Un administrador puede ser `admin` y también `audit`

## 📚 Referencias

- [ROLES_SETUP.md](./ROLES_SETUP.md) - Guía de configuración de roles
- [AUTH_IMPLEMENTATION_PLAN.md](../docs/AUTH_IMPLEMENTATION_PLAN.md) - Plan completo de autenticación
- [Keycloak Roles Documentation](https://www.keycloak.org/docs/latest/server_admin/#_roles)
