# Implementación: Patrón "Core + Mappers"

## ✅ Implementación Completada

Se ha implementado exitosamente el patrón "Core + Mappers" para los módulos de **Encounters**, **Documents** y **Consents**, manteniendo toda la lógica de seguridad, roles y permisos. Todos los tests han sido actualizados y están pasando.

## 📁 Estructura de Archivos

### Encounters

```
packages/api/src/modules/encounters/
├── encounters.controller.ts              # Endpoint /api/encounters
├── encounters.service.ts                 # Application Service (delgado)
├── encounters-core.service.ts            # Core: Lógica + BD + Seguridad
├── mappers/
│   ├── encounter-to-fhir.mapper.ts       # Entity → FHIR
│   └── encounter-to-client.mapper.ts     # Entity → DTO
└── encounters.module.ts
```

### Documents

```
packages/api/src/modules/documents/
├── documents.controller.ts               # Endpoint /api/v1/documents
├── documents.service.ts                   # Application Service (delgado)
├── documents-core.service.ts              # Core: Lógica + BD + Seguridad
├── mappers/
│   └── document-to-fhir.mapper.ts        # Entity → FHIR
└── documents.module.ts
```

### Consents

```
packages/api/src/modules/consents/
├── consents.controller.ts                # Endpoint /api/v1/consents
├── consents.service.ts                    # Application Service (delgado)
├── consents-core.service.ts               # Core: Lógica + BD + Seguridad
├── mappers/
│   └── consent-to-fhir.mapper.ts         # Entity → FHIR
└── consents.module.ts
```

## 🔐 Seguridad Mantenida

### ✅ Lógica de Seguridad en Core Services

Todos los Core Services (`EncountersCoreService`, `DocumentsCoreService`, `ConsentsCoreService`) implementan la misma lógica de seguridad:

1. **Role-Based Access Control (RBAC)**
   - Admins: Acceso completo (bypass filtering)
   - Practitioners: Acceso a todos los recursos
   - Patients: Solo sus propios recursos

2. **Patient Context Filtering**
   - Filtrado por `patient` claim en JWT
   - Filtrado por `fhirUser` claim en JWT
   - Filtrado por `keycloakUserId` (búsqueda en BD)
   - Centralizado en `PatientContextService`

3. **Access Validation**
   - `validateAccess()`: Valida acceso individual a recursos
   - `applyPatientContextFilter()`: Aplica filtros en queries
   - Verificación de permisos por scope (ej: `encounter:read`, `patient:read`, `consent:read`, `document:read`)

4. **Scope-Based Permissions**
   - Integración con `ScopePermissionService`
   - Validación de permisos FHIR (`FHIR_ACTIONS.READ`, `FHIR_ACTIONS.WRITE`)

5. **Recursos Específicos**
   - **Consents**: Validación de expiración, lógica de compartir con practitioners
   - **Documents**: Almacenamiento seguro de attachments (temporal local, migrar a S3/MinIO)

## 🏗️ Arquitectura

### 1. Core Services (Capa de Negocio y Seguridad)

Todos los Core Services siguen el mismo patrón:

#### EncountersCoreService

- `findEncountersByQuery()`: Búsqueda con filtros FHIR (subject, status, date, sort)
- `findEncounterById()`: Por UUID de BD
- `findEncounterByEncounterId()`: Por FHIR resource ID
- `create()`, `update()`, `remove()`: Operaciones CRUD

#### DocumentsCoreService

- `findDocumentsByQuery()`: Búsqueda con filtros FHIR (subject, status, sort)
- `findDocumentById()`: Por UUID de BD
- `findDocumentByDocumentReferenceId()`: Por FHIR resource ID
- `create()`, `update()`, `remove()`: Operaciones CRUD con almacenamiento de attachments

#### ConsentsCoreService

- `findConsentsByQuery()`: Búsqueda con filtros FHIR (status, sort)
- `findConsentById()`: Por UUID de BD
- `findConsentByConsentId()`: Por FHIR resource ID
- `create()`, `update()`, `remove()`: Operaciones CRUD
- `shareWithPractitioner()`: Lógica específica de compartir consents
- Validación de expiración de consents

**Todos retornan:** `Entity[]` (sin transformación)

### 2. Mappers (Transformación Pura)

#### EncounterToFhirMapper

- `toFhir(entity)`: Entity → FHIR Encounter
- `toFhirList(entities)`: Entity[] → FHIR Encounter[]

#### EncounterToClientMapper

- `toDto(entity)`: Entity → EncounterDto
- `toDetailDto(entity)`: Entity → EncounterDetailDto
- `toListItem(entity)`: Entity → EncounterListItemDto
- `toListItemList(entities)`: Entity[] → EncounterListItemDto[]

#### DocumentToFhirMapper

- `toFhir(entity)`: Entity → FHIR DocumentReference
- `toFhirList(entities)`: Entity[] → FHIR DocumentReference[]

#### ConsentToFhirMapper

- `toFhir(entity)`: Entity → FHIR Consent
- `toFhirList(entities)`: Entity[] → FHIR Consent[]

### 3. Application Services (Orquestación Delgada)

#### EncountersService

- Usa `EncountersCoreService` para obtener entities
- Usa `EncounterToClientMapper` para transformar
- Retorna DTOs optimizados para mobile/web

#### DocumentsService

- Usa `DocumentsCoreService` para obtener entities
- Usa `DocumentToFhirMapper` para transformar
- Retorna recursos FHIR

#### ConsentsService

- Usa `ConsentsCoreService` para obtener entities
- Usa `ConsentToFhirMapper` para transformar
- Maneja audit logging
- Retorna recursos FHIR

#### FhirService (métodos de recursos)

- `searchEncounters()`: Usa `EncountersCoreService` + `EncounterToFhirMapper`
- `getEncounter()`: Usa `EncountersCoreService` + `EncounterToFhirMapper`
- `searchDocumentReferences()`: Usa `DocumentsCoreService` + `DocumentToFhirMapper`
- `getDocumentReference()`: Usa `DocumentsCoreService` + `DocumentToFhirMapper`
- `searchConsents()`: Usa `ConsentsCoreService` + `ConsentToFhirMapper`
- `getConsent()`: Usa `ConsentsCoreService` + `ConsentToFhirMapper`

## 🔄 Flujo de Datos

### Endpoint Optimizado (`/api/encounters`)

```
Request
  ↓
EncountersController
  ↓
EncountersService (Application Service)
  ↓
EncountersCoreService (Core Service)
  ├─→ Aplica filtros de seguridad
  ├─→ Query a BD
  └─→ Retorna EncounterEntity[]
  ↓
EncounterToClientMapper
  └─→ Transforma Entity → DTO
  ↓
Response (EncountersListResponse)
```

### Endpoint FHIR (`/api/fhir/Encounter`, `/api/fhir/DocumentReference`, `/api/fhir/Consent`)

```
Request
  ↓
FhirController
  ↓
FhirService (Application Service)
  ↓
[EncountersCoreService | DocumentsCoreService | ConsentsCoreService]
  ├─→ Aplica filtros de seguridad
  ├─→ Query a BD
  └─→ Retorna Entity[]
  ↓
[EncounterToFhirMapper | DocumentToFhirMapper | ConsentToFhirMapper]
  └─→ Transforma Entity → FHIR
  ↓
Response (FHIR Bundle)
```

### Endpoint Optimizado (`/api/v1/documents`, `/api/v1/consents`)

```
Request
  ↓
[DocumentsController | ConsentsController]
  ↓
[DocumentsService | ConsentsService] (Application Service)
  ↓
[DocumentsCoreService | ConsentsCoreService] (Core Service)
  ├─→ Aplica filtros de seguridad
  ├─→ Query a BD
  └─→ Retorna Entity[]
  ↓
[DocumentToFhirMapper | ConsentToFhirMapper]
  └─→ Transforma Entity → FHIR
  ↓
Response (FHIR Bundle)
```

## ✅ Ventajas Logradas

1. **Sin Duplicación**
   - Una sola implementación de queries y seguridad
   - Misma lógica de filtrado para FHIR y endpoints optimizados

2. **Separación Clara**
   - Core = Negocio + Seguridad + BD
   - Mappers = Transformación pura
   - Application Services = Orquestación delgada

3. **Testabilidad**
   - Mappers: Funciones puras, fáciles de testear
   - Core Service: Tests de lógica de negocio y seguridad
   - Application Services: Tests de orquestación

4. **Reutilización**
   - Mismo Core Service para FHIR y endpoints optimizados
   - Mappers reutilizables en GraphQL, gRPC, etc.

5. **Mantenibilidad**
   - Cambios en seguridad solo en Core Service
   - Cambios en transformación solo en Mappers
   - Fácil agregar nuevos formatos de salida

## 🔒 Seguridad Verificada

✅ **Filtrado por paciente**: Patients solo ven sus propios recursos (encounters, documents, consents)
✅ **Validación de acceso**: `validateAccess()` en cada consulta individual
✅ **Role-based filtering**: Admins y Practitioners tienen acceso apropiado
✅ **Scope permissions**: Validación de permisos FHIR
✅ **Keycloak integration**: Filtrado por `keycloakUserId` cuando es necesario
✅ **Consent expiration**: Validación automática de consents expirados
✅ **Attachment security**: Almacenamiento seguro de documentos (temporal local, migrar a S3/MinIO)

## ✅ Estado de Implementación

### Encounters

- ✅ Core Service implementado
- ✅ Mappers implementados (FHIR y Client)
- ✅ Application Service implementado
- ✅ Tests actualizados y pasando
- ✅ Integración con FhirService

### Documents

- ✅ Core Service implementado
- ✅ Mapper implementado (FHIR)
- ✅ Application Service implementado
- ✅ Tests actualizados y pasando
- ✅ Integración con FhirService
- ✅ Almacenamiento de attachments

### Consents

- ✅ Core Service implementado
- ✅ Mapper implementado (FHIR)
- ✅ Application Service implementado
- ✅ Tests actualizados y pasando
- ✅ Integración con FhirService
- ✅ Lógica de compartir con practitioners
- ✅ Validación de expiración

## 📊 Estadísticas de Tests

- ✅ **793 tests pasando**
- ✅ **39 tests skipped**
- ✅ **0 tests fallando**
- ✅ Todos los tests de Core Services actualizados
- ✅ Todos los tests de Application Services actualizados
- ✅ Todos los tests de FhirService actualizados

## 📝 Próximos Pasos (Opcionales)

1. **Optimizaciones**: Agregar caching en Core Services si es necesario
2. **Almacenamiento**: Migrar attachments de Documents a S3/MinIO para producción
3. **Client Mappers**: Implementar mappers para Documents y Consents si se necesitan endpoints optimizados
4. **GraphQL**: Usar los mismos Core Services y Mappers para endpoints GraphQL

## 🎯 Conclusión

El patrón "Core + Mappers" ha sido implementado exitosamente para **Encounters**, **Documents** y **Consents**, manteniendo toda la lógica de seguridad, roles y permisos. La arquitectura es más clara, mantenible y escalable. Todos los tests están actualizados y pasando, confirmando que la refactorización fue exitosa sin perder funcionalidad.
