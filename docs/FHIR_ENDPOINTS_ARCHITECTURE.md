# Arquitectura de Endpoints FHIR

## 📋 Situación Actual

Actualmente existen **dos conjuntos de endpoints** para los mismos recursos:

### 1. Endpoints FHIR Estándar (`/api/fhir/ResourceType`)

- ✅ `GET /api/fhir/Consent`
- ✅ `GET /api/fhir/Consent/:id`
- ✅ `GET /api/fhir/DocumentReference`
- ✅ `GET /api/fhir/DocumentReference/:id`
- ✅ `GET /api/fhir/Encounter`
- ✅ `GET /api/fhir/Encounter/:id`
- ✅ `GET /api/fhir/Patient`
- ✅ `GET /api/fhir/Patient/:id`
- ✅ `GET /api/fhir/Practitioner`
- ✅ `GET /api/fhir/Practitioner/:id`

### 2. Endpoints REST Tradicionales (`/api/resource`)

- ✅ `GET /api/consents`
- ✅ `GET /api/consents/:id`
- ✅ `GET /api/documents`
- ✅ `GET /api/documents/:id`
- ✅ `GET /api/encounters`
- ✅ `GET /api/encounters/:id`

## 🎯 ¿Cuál Debería Usarse?

### Recomendación: **Usar `/api/fhir/ResourceType` como estándar principal**

**Razones:**

1. **Estándar FHIR R4**: Los endpoints `/fhir/ResourceType` son el estándar oficial de HL7 FHIR
2. **Interoperabilidad**: Necesarios para integraciones SMART on FHIR con sistemas externos
3. **Consistencia**: Todos los recursos FHIR deberían seguir el mismo patrón
4. **Documentación**: El móvil ya está usando `/api/fhir/` según `PLAN_IMPLEMENTACION.md`
5. **CapabilityStatement**: El endpoint `/api/fhir/metadata` expone estos endpoints como disponibles

## 📊 Comparación

| Aspecto               | `/api/fhir/ResourceType`           | `/api/resource`           |
| --------------------- | ---------------------------------- | ------------------------- |
| **Estándar FHIR**     | ✅ Sí (HL7 FHIR R4)                | ❌ No                     |
| **SMART on FHIR**     | ✅ Compatible                      | ❌ No compatible          |
| **Interoperabilidad** | ✅ Alta                            | ❌ Baja                   |
| **Parámetros FHIR**   | ✅ `_count`, `_sort`, etc.         | ❌ Solo paginación custom |
| **Uso en móvil**      | ✅ Sí (documentado)                | ❌ No                     |
| **Metadata endpoint** | ✅ Expuesto en CapabilityStatement | ❌ No                     |

## 🔄 Estrategia de Migración

### Opción 1: Unificar (Recomendado) ✅

**Estrategia:**

1. **Mantener `/api/fhir/ResourceType`** como único estándar
2. **Deprecar `/api/consents` y `/api/documents`** (marcar como deprecated)
3. **Redirigir o eliminar** los endpoints REST tradicionales después de un período de transición

**Ventajas:**

- ✅ Arquitectura consistente
- ✅ Cumple con estándares FHIR
- ✅ Facilita interoperabilidad
- ✅ Reduce confusión

**Desventajas:**

- ⚠️ Requiere actualizar cualquier código que use los endpoints antiguos
- ⚠️ Puede romper integraciones existentes (si las hay)

### Opción 2: Mantener Ambos (No Recomendado) ❌

**Estrategia:**

- Mantener ambos conjuntos de endpoints
- `/api/fhir/` para interoperabilidad
- `/api/resource` para uso interno

**Desventajas:**

- ❌ Duplicación de código
- ❌ Confusión sobre cuál usar
- ❌ Mantenimiento duplicado
- ❌ Inconsistencia arquitectónica

## 📝 Recomendación Final

### **Usar `/api/fhir/ResourceType` exclusivamente**

**Plan de acción:**

1. ✅ **Ya implementado**: Endpoints FHIR estándar en `FhirController`
2. ⏳ **Pendiente**: Documentar que `/api/fhir/` es el estándar
3. ⏳ **Pendiente**: Marcar `/api/consents` y `/api/documents` como deprecated
4. ⏳ **Futuro**: Eliminar endpoints REST tradicionales después de verificar que no se usan

## 🔍 Verificación de Uso Actual

**Resultado del análisis:**

✅ **Móvil**: Usa `/api/fhir/` (según `PLAN_IMPLEMENTACION.md`)
❌ **Tests E2E**: Usan `/api/consents`, `/api/documents`, `/api/encounters`
✅ **Audit Interceptor**: Detecta ambos tipos de endpoints

**Conclusión:**

- Los endpoints REST tradicionales (`/api/consents`, `/api/documents`) están **solo en tests E2E**
- El móvil ya usa `/api/fhir/` (correcto)
- Los endpoints tradicionales pueden mantenerse temporalmente para tests, pero **deben marcarse como deprecated**

## 📚 Referencias

- [FHIR RESTful API Specification](http://hl7.org/fhir/http.html)
- [SMART on FHIR Scopes and Launch Context](http://docs.smarthealthit.org/authorization/scopes-and-launch-context/)
- [HL7 FHIR Resource Operations](http://hl7.org/fhir/operations.html)

## ✅ Conclusión

### Uso de Endpoints FHIR

**Para sistemas externos (interoperabilidad):**

- ✅ **Usar `/api/fhir/ResourceType`** (estándar FHIR)
- ✅ Laboratorios, clínicas, aseguradoras
- ✅ Integraciones SMART on FHIR

**Para clientes internos (móvil/web):**

- ⚠️ **Temporalmente usando `/api/fhir/ResourceType`**
- ⏳ **Futuro: Migrar a `/api/v1/*` optimizados** (ver `API_ARCHITECTURE_DECISION.md`)

**Ejemplos correctos:**

- ✅ `GET /api/fhir/Consent?status=active` (interoperabilidad)
- ✅ `GET /api/fhir/DocumentReference?_count=5&_sort=-date` (interoperabilidad)
- ✅ `GET /api/fhir/Encounter?_count=5&_sort=-date` (interoperabilidad)

**Ejemplos incorrectos (deprecated):**

- ❌ `GET /api/consents?status=active`
- ❌ `GET /api/documents`

---

## 📋 Nota Importante sobre Arquitectura

**Ver:** [`docs/API_ARCHITECTURE_DECISION.md`](./API_ARCHITECTURE_DECISION.md) para la decisión arquitectónica sobre endpoints FHIR vs REST optimizados.

**Resumen:** FHIR está diseñado para interoperabilidad entre sistemas de salud. Para clientes móviles y web, se recomienda crear endpoints REST optimizados (`/api/v1/*`) que solo envíen la información necesaria para mejorar rendimiento y experiencia de usuario.
