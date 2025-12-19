# Arquitectura Unificada de Servicios

## 🎯 Objetivo

Unificar la lógica de negocio y acceso a BD entre endpoints FHIR y endpoints optimizados para clientes, manteniendo controllers independientes y evitando duplicación de código.

## 📊 Situación Actual

### Problema: Duplicación de Lógica

Actualmente tenemos:

1. **FhirController** (`/api/fhir/*`)
   - Usa `FhirService.searchEncounters()` → Accede directamente a `EncounterEntity`
   - Usa `ConsentsService.findAll()` → Accede directamente a `ConsentEntity`
   - Usa `DocumentsService.findAll()` → Accede directamente a `DocumentReferenceEntity`

2. **EncountersController** (`/api/encounters`)
   - Usa `EncountersService.findAll()` → Accede directamente a `EncounterEntity`
   - **Duplicación**: Misma query, mismo filtrado, diferente formato de salida

3. **ConsentsController** (`/api/consents`)
   - Usa `ConsentsService.findAll()` → Accede directamente a `ConsentEntity`
   - **Duplicación**: `FhirController` también usa `ConsentsService`, pero podría haber lógica duplicada

### Análisis de Duplicación

```typescript
// FhirService.searchEncounters()
const queryBuilder = this.encounterRepository
  .createQueryBuilder('encounter')
  .where('encounter.deletedAt IS NULL');
// ... filtrado por paciente ...
const entities = await queryBuilder.getMany();
return { total, entries: entities.map((e) => this.entityToEncounter(e)) };

// EncountersService.findAll()
const queryBuilder = this.encounterRepository
  .createQueryBuilder('encounter')
  .where('encounter.deletedAt IS NULL');
// ... filtrado por paciente (mismo código) ...
const entities = await queryBuilder.getMany();
return { data: entities.map((e) => this.entityToListItem(e)), total };
```

**Problema**: Misma lógica de query y filtrado, solo cambia la transformación.

## 🏗️ Arquitectura Propuesta

### Estrategia: Capas de Servicios

```
┌─────────────────────────────────────────────────────────┐
│              Controller Layer (Endpoints)                │
├─────────────────────────────────────────────────────────┤
│  FhirController          │  EncountersController        │
│  /api/fhir/Encounter     │  /api/encounters             │
└──────────────┬───────────┴──────────────┬──────────────┘
               │                           │
               │                           │
┌──────────────▼───────────┐  ┌───────────▼──────────────┐
│  Presentation Services   │  │  Presentation Services   │
│  (Transformación)        │  │  (Transformación)        │
├──────────────────────────┤  ├──────────────────────────┤
│  FhirService             │  │  EncountersService       │
│  - entityToEncounter()   │  │  - entityToDto()         │
│  - entityToConsent()     │  │  - entityToListItem()    │
└──────────────┬───────────┘  └──────────────┬───────────┘
               │                             │
               └──────────────┬──────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│         Domain Service Layer (Lógica de Negocio)          │
├────────────────────────────────────────────────────────────┤
│  EncountersDomainService                                   │
│  - findEncountersByQuery()  // Query + filtrado           │
│  - findEncounterById()      // Búsqueda por ID            │
│  - validateAccess()         // Validación de acceso       │
│                                                             │
│  ConsentsDomainService                                     │
│  - findConsentsByQuery()    // Query + filtrado           │
│  - findConsentById()        // Búsqueda por ID            │
│  - validateAccess()         // Validación de acceso       │
│                                                             │
│  DocumentsDomainService                                    │
│  - findDocumentsByQuery()   // Query + filtrado           │
│  - findDocumentById()       // Búsqueda por ID            │
└─────────────────────────────┬─────────────────────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│         Repository Layer (TypeORM)                        │
├────────────────────────────────────────────────────────────┤
│  EncounterEntity, ConsentEntity, DocumentReferenceEntity  │
└────────────────────────────────────────────────────────────┘
```

## 📝 Implementación Propuesta

### 1. Domain Services (Lógica Compartida)

**`EncountersDomainService`** - Contiene toda la lógica de negocio y acceso a BD:

```typescript
@Injectable()
export class EncountersDomainService {
  constructor(
    @InjectRepository(EncounterEntity)
    private encounterRepository: Repository<EncounterEntity>,
    private patientContextService: PatientContextService,
  ) {}

  /**
   * Busca encounters con filtros y paginación
   * Retorna Entity[] - sin transformación
   */
  async findEncountersByQuery(
    params: {
      page?: number;
      limit?: number;
      subject?: string;
      status?: string;
      date?: string;
      sort?: string;
    },
    user?: User,
  ): Promise<{ entities: EncounterEntity[]; total: number }> {
    const queryBuilder = this.encounterRepository
      .createQueryBuilder('encounter')
      .where('encounter.deletedAt IS NULL');

    // Aplicar filtrado por paciente (lógica compartida)
    const patientReference = this.patientContextService.getPatientReference(user);
    if (patientReference) {
      queryBuilder.andWhere('encounter.subjectReference = :tokenPatientRef', {
        tokenPatientRef: patientReference,
      });
    } else {
      const keycloakUserId = this.patientContextService.getKeycloakUserId(user);
      if (keycloakUserId) {
        // ... lógica de filtrado por keycloakUserId
      }
    }

    // Filtros adicionales (subject, status, date, sort)
    // ...

    const total = await queryBuilder.getCount();
    const entities = await queryBuilder
      .skip((params.page - 1) * params.limit)
      .take(params.limit)
      .getMany();

    return { entities, total };
  }

  /**
   * Busca un encounter por ID
   * Retorna Entity - sin transformación
   */
  async findEncounterById(id: string, user?: User): Promise<EncounterEntity> {
    const entity = await this.encounterRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });

    if (!entity) {
      throw new NotFoundException(`Encounter with ID ${id} not found`);
    }

    // Validar acceso (lógica compartida)
    this.validateAccess(entity, user);

    return entity;
  }

  /**
   * Valida que el usuario tenga acceso al encounter
   */
  private validateAccess(entity: EncounterEntity, user?: User): void {
    // Lógica de validación compartida
    // ...
  }
}
```

### 2. Presentation Services (Transformación)

**`FhirService`** - Transforma Entity → FHIR:

```typescript
@Injectable()
export class FhirService {
  constructor(
    private encountersDomainService: EncountersDomainService,
    // ... otros domain services
  ) {}

  async searchEncounters(
    params: { page?: number; limit?: number; subject?: string; ... },
    user?: User,
  ): Promise<{ total: number; entries: Encounter[] }> {
    // Usar domain service para obtener entities
    const { entities, total } = await this.encountersDomainService.findEncountersByQuery(
      params,
      user,
    );

    // Transformar Entity → FHIR
    return {
      total,
      entries: entities.map((e) => this.entityToEncounter(e)),
    };
  }

  private entityToEncounter(entity: EncounterEntity): Encounter {
    // Transformación a formato FHIR
    return {
      resourceType: 'Encounter',
      id: entity.encounterId,
      status: entity.status,
      // ... resto de campos FHIR
    };
  }
}
```

**`EncountersService`** - Transforma Entity → DTO Optimizado:

```typescript
@Injectable()
export class EncountersService {
  constructor(private encountersDomainService: EncountersDomainService) {}

  async findAll(user?: User): Promise<EncountersListResponse> {
    // Usar domain service para obtener entities
    const { entities, total } = await this.encountersDomainService.findEncountersByQuery(
      { page: 1, limit: 100 },
      user,
    );

    // Transformar Entity → DTO Optimizado
    return {
      total,
      data: entities.map((e) => this.entityToListItem(e)),
    };
  }

  async findOne(id: string, user?: User): Promise<EncounterDetailDto> {
    // Usar domain service para obtener entity
    const entity = await this.encountersDomainService.findEncounterById(id, user);

    // Transformar Entity → DTO Optimizado
    return this.entityToDto(entity);
  }

  private entityToListItem(entity: EncounterEntity): EncounterListItemDto {
    // Transformación a formato optimizado
    return {
      id: entity.id,
      encounterId: entity.encounterId,
      status: entity.status,
      subjectReference: entity.subjectReference,
      createdAt: entity.createdAt,
    };
  }
}
```

## ✅ Ventajas de esta Arquitectura

### 1. **Sin Duplicación de Lógica**

- ✅ Una sola implementación de queries y filtrado
- ✅ Una sola implementación de validación de acceso
- ✅ Cambios en lógica de negocio se reflejan en ambos endpoints

### 2. **Separación de Responsabilidades**

- ✅ **Domain Services**: Lógica de negocio y acceso a BD
- ✅ **Presentation Services**: Transformación de datos (Entity → FHIR/DTO)
- ✅ **Controllers**: Solo routing y validación de entrada

### 3. **Mantenibilidad**

- ✅ Cambios en queries solo en un lugar
- ✅ Cambios en formato de salida solo en presentation services
- ✅ Fácil agregar nuevos formatos (ej: GraphQL, gRPC)

### 4. **Testabilidad**

- ✅ Domain services fáciles de testear (solo lógica de negocio)
- ✅ Presentation services fáciles de testear (solo transformación)
- ✅ Mocks más simples y enfocados

### 5. **Escalabilidad**

- ✅ Fácil agregar nuevos formatos de salida (ej: GraphQL)
- ✅ Fácil agregar nuevos filtros o lógica de negocio
- ✅ Fácil migrar a otro ORM (solo cambiar domain services)

## 🔄 Migración Propuesta

### Fase 1: Crear Domain Services

1. Crear `EncountersDomainService` con lógica compartida
2. Crear `ConsentsDomainService` con lógica compartida
3. Crear `DocumentsDomainService` con lógica compartida

### Fase 2: Refactorizar Presentation Services

1. `FhirService` usa domain services
2. `EncountersService` usa `EncountersDomainService`
3. `ConsentsService` usa `ConsentsDomainService`
4. `DocumentsService` usa `DocumentsDomainService`

### Fase 3: Limpiar Código Duplicado

1. Eliminar queries duplicadas
2. Eliminar lógica de filtrado duplicada
3. Actualizar tests

## 📋 Estructura de Archivos Propuesta

```
packages/api/src/modules/
├── encounters/
│   ├── encounters.controller.ts          # Endpoint /api/encounters
│   ├── encounters.service.ts             # Transformación Entity → DTO
│   ├── encounters-domain.service.ts      # Lógica de negocio + BD
│   └── encounters-domain.service.spec.ts
├── consents/
│   ├── consents.controller.ts            # Endpoint /api/consents
│   ├── consents.service.ts               # Transformación Entity → DTO
│   ├── consents-domain.service.ts        # Lógica de negocio + BD
│   └── consents-domain.service.spec.ts
├── documents/
│   ├── documents.controller.ts           # Endpoint /api/documents
│   ├── documents.service.ts              # Transformación Entity → DTO
│   ├── documents-domain.service.ts       # Lógica de negocio + BD
│   └── documents-domain.service.spec.ts
└── fhir/
    ├── fhir.controller.ts                # Endpoint /api/fhir/*
    └── fhir.service.ts                   # Transformación Entity → FHIR
                                          # (usa domain services)
```

## ⚡ Análisis de Performance

**¿Genera más carga o problemas de performance?**

### Respuesta: No, el overhead es despreciable

1. **Overhead de llamadas**: ~0.001ms por request (llamadas en memoria)
2. **Queries a BD**: Mismo número (o menos con caching compartido)
3. **Memoria**: Mismo uso (o menos con caching compartido)
4. **CPU**: Mismo uso (transformaciones iguales)

### Posibles Mejoras con Domain Services

- ✅ **Caching compartido**: Si ambos endpoints se llaman, solo 1 query en lugar de 2
- ✅ **Optimizaciones centralizadas**: Mejoras aplicadas automáticamente
- ✅ **Batch operations**: Reducción de queries en operaciones múltiples

**Ver análisis detallado en**: `docs/ARCHITECTURE_PERFORMANCE_ANALYSIS.md`

## 🎯 Conclusión

**Sí, es buena idea unificar la lógica** manteniendo:

- ✅ **Controllers independientes** (ya lo tenemos)
- ✅ **Lógica de negocio compartida** (domain services)
- ✅ **Acceso a BD compartido** (domain services)
- ✅ **Transformación separada** (presentation services)
- ✅ **Sin impacto negativo en performance** (overhead < 0.1%)

Esta arquitectura elimina duplicación, mejora mantenibilidad y facilita futuras extensiones.
