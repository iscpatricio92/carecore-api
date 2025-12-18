# Análisis: Patrón "Core + Mappers" vs Nuestra Propuesta

## 🎯 Comparación de Patrones

### Patrón "Core + Mappers" (Propuesto)

```
┌─────────────────────────────────────────────────────────┐
│              Controllers (Endpoints)                     │
├─────────────────────────────────────────────────────────┤
│  FhirController          │  EncountersController       │
└──────────────┬───────────┴──────────────┬──────────────┘
               │                           │
┌──────────────▼───────────┐  ┌───────────▼──────────────┐
│  Application Services    │  │  Application Services     │
│  (Delgados)              │  │  (Delgados)               │
├──────────────────────────┤  ├──────────────────────────┤
│  FhirService             │  │  EncountersService       │
│  - searchEncounters()    │  │  - findAll()              │
│  - getEncounter()        │  │  - findOne()              │
└──────────────┬───────────┘  └──────────────┬───────────┘
               │                             │
               │  Usa Core Service           │
               │                             │
               └──────────────┬──────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│         Core Service (Lógica de Negocio + BD)              │
├────────────────────────────────────────────────────────────┤
│  EncountersCoreService                                     │
│  - findEncountersByQuery() → Entity[]                     │
│  - findEncounterById() → Entity                           │
└──────────────┬────────────────────────────────────────────┘
               │
               │ Retorna Entity[]
               │
┌──────────────▼────────────────────────────────────────────┐
│         Mappers (Funciones Puras)                          │
├────────────────────────────────────────────────────────────┤
│  EncounterToFhirMapper                                     │
│  - toFhir(entity: Entity): FHIR                           │
│  - toFhirList(entities: Entity[]): FHIR[]                  │
│                                                             │
│  EncounterToClientMapper                                   │
│  - toDto(entity: Entity): DTO                              │
│  - toListItem(entity: Entity): ListItemDTO                 │
└────────────────────────────────────────────────────────────┘
```

### Nuestra Propuesta Actual

```
┌─────────────────────────────────────────────────────────┐
│              Controllers (Endpoints)                     │
├─────────────────────────────────────────────────────────┤
│  FhirController          │  EncountersController       │
└──────────────┬───────────┴──────────────┬──────────────┘
               │                           │
┌──────────────▼───────────┐  ┌───────────▼──────────────┐
│  Presentation Services   │  │  Presentation Services   │
│  (Con transformación)    │  │  (Con transformación)    │
├──────────────────────────┤  ├──────────────────────────┤
│  FhirService             │  │  EncountersService       │
│  - searchEncounters()    │  │  - findAll()              │
│  - entityToEncounter()  │  │  - entityToDto()         │
│  (método privado)        │  │  (método privado)        │
└──────────────┬───────────┘  └──────────────┬───────────┘
               │                             │
               │  Usa Domain Service         │
               │                             │
               └──────────────┬──────────────┘
                              │
┌─────────────────────────────▼─────────────────────────────┐
│         Domain Service (Lógica de Negocio + BD)           │
├────────────────────────────────────────────────────────────┤
│  EncountersDomainService                                   │
│  - findEncountersByQuery() → Entity[]                     │
│  - findEncounterById() → Entity                           │
└────────────────────────────────────────────────────────────┘
```

## 📊 Comparación Detallada

| Aspecto                           | Nuestra Propuesta                  | Patrón "Core + Mappers"     | Mejor      |
| --------------------------------- | ---------------------------------- | --------------------------- | ---------- |
| **Core/Domain Service**           | ✅ Domain Service                  | ✅ Core Service             | ✅ Igual   |
| **Separación de transformación**  | ❌ Dentro de Presentation Services | ✅ Mappers independientes   | ✅ Mappers |
| **Reutilización de mappers**      | ❌ No reutilizables                | ✅ Reutilizables            | ✅ Mappers |
| **Testabilidad de mappers**       | ⚠️ Tests del servicio completo     | ✅ Tests de funciones puras | ✅ Mappers |
| **Composición de mappers**        | ❌ No posible                      | ✅ Posible                  | ✅ Mappers |
| **Simplicidad**                   | ✅ Más simple                      | ⚠️ Más archivos             | ⚠️ Nuestra |
| **Claridad de responsabilidades** | ⚠️ Transformación mezclada         | ✅ Separación clara         | ✅ Mappers |

## ✅ Ventajas del Patrón "Core + Mappers"

### 1. **Mappers como Funciones Puras**

```typescript
// ✅ Patrón "Core + Mappers"
export class EncounterToFhirMapper {
  static toFhir(entity: EncounterEntity): Encounter {
    // Función pura, sin dependencias
    return {
      resourceType: 'Encounter',
      id: entity.encounterId,
      status: entity.status,
      // ...
    };
  }

  static toFhirList(entities: EncounterEntity[]): Encounter[] {
    return entities.map((e) => this.toFhir(e));
  }
}

// Tests súper simples
describe('EncounterToFhirMapper', () => {
  it('should transform entity to FHIR', () => {
    const entity = createMockEntity();
    const result = EncounterToFhirMapper.toFhir(entity);
    expect(result.resourceType).toBe('Encounter');
  });
});
```

**Ventaja**: Tests unitarios puros, sin mocks, sin dependencias.

### 2. **Reutilización de Mappers**

```typescript
// Mapper puede ser usado en múltiples lugares
export class EncounterToFhirMapper {
  static toFhir(entity: EncounterEntity): Encounter { ... }
}

// FhirService lo usa
class FhirService {
  async searchEncounters() {
    const entities = await coreService.findEncountersByQuery();
    return EncounterToFhirMapper.toFhirList(entities);
  }
}

// GraphQL resolver también lo puede usar
class EncounterResolver {
  async getEncounter(id: string) {
    const entity = await coreService.findEncounterById(id);
    return EncounterToFhirMapper.toFhir(entity);
  }
}
```

**Ventaja**: Un solo mapper, múltiples usos.

### 3. **Composición de Mappers**

```typescript
// Mappers pueden componerse
export class PatientToFhirMapper {
  static toFhir(entity: PatientEntity): Patient {
    return {
      resourceType: 'Patient',
      id: entity.patientId,
      name: NameMapper.toFhir(entity.fhirResource.name),
      address: AddressMapper.toFhirList(entity.fhirResource.address),
      // ...
    };
  }
}
```

**Ventaja**: Mappers complejos pueden usar mappers simples.

### 4. **Separación Clara de Responsabilidades**

```typescript
// Core Service: Solo lógica de negocio
class EncountersCoreService {
  async findEncountersByQuery() {
    // Query, filtrado, validación
    return entities; // Entity[]
  }
}

// Mapper: Solo transformación
class EncounterToFhirMapper {
  static toFhir(entity: EncounterEntity): Encounter {
    // Transformación pura
  }
}

// Application Service: Solo orquestación
class FhirService {
  async searchEncounters() {
    const entities = await coreService.findEncountersByQuery();
    return EncounterToFhirMapper.toFhirList(entities);
  }
}
```

**Ventaja**: Cada clase tiene una responsabilidad única y clara.

## ⚠️ Desventajas del Patrón "Core + Mappers"

### 1. **Más Archivos/Clases**

```
encounters/
├── encounters-core.service.ts      # Core
├── encounter-to-fhir.mapper.ts     # Mapper FHIR
├── encounter-to-client.mapper.ts   # Mapper DTO
├── encounters.service.ts           # Application Service
└── encounters.controller.ts       # Controller
```

**Desventaja**: Más archivos que mantener (pero más organizados).

### 2. **Posible Over-Engineering**

Si las transformaciones son muy simples (ej: solo copiar campos), puede ser excesivo.

**Solución**: Usar mappers solo cuando la transformación es compleja o reutilizable.

## 🎯 Mi Opinión

### ✅ **SÍ, el patrón "Core + Mappers" es MEJOR que nuestra propuesta actual**

**Razones:**

1. **Testabilidad Superior**
   - Mappers como funciones puras son más fáciles de testear
   - No necesitas mocks complejos
   - Tests más rápidos y simples

2. **Reutilización**
   - Mappers pueden usarse en GraphQL, gRPC, WebSockets, etc.
   - Un solo mapper, múltiples formatos de salida

3. **Separación de Responsabilidades**
   - Core = Negocio
   - Mappers = Transformación
   - Application Services = Orquestación
   - Más claro y mantenible

4. **Escalabilidad**
   - Fácil agregar nuevos formatos (ej: GraphQL)
   - Fácil componer mappers complejos
   - Fácil mantener y evolucionar

### 📋 Recomendación: Implementar Patrón "Core + Mappers"

**Estructura propuesta:**

```
packages/api/src/modules/encounters/
├── encounters.controller.ts              # Endpoint /api/encounters
├── encounters.service.ts                 # Application Service (delgado)
├── encounters-core.service.ts            # Core: Lógica + BD
├── mappers/
│   ├── encounter-to-fhir.mapper.ts       # Entity → FHIR
│   └── encounter-to-client.mapper.ts     # Entity → DTO
└── encounters.module.ts
```

**Ejemplo de implementación:**

```typescript
// encounters-core.service.ts
@Injectable()
export class EncountersCoreService {
  async findEncountersByQuery(params: QueryParams, user?: User) {
    // Lógica de negocio + BD
    return { entities: EncounterEntity[], total: number };
  }
}

// mappers/encounter-to-fhir.mapper.ts
export class EncounterToFhirMapper {
  static toFhir(entity: EncounterEntity): Encounter {
    return {
      resourceType: 'Encounter',
      id: entity.encounterId,
      status: entity.status,
      // ...
    };
  }

  static toFhirList(entities: EncounterEntity[]): Encounter[] {
    return entities.map(e => this.toFhir(e));
  }
}

// mappers/encounter-to-client.mapper.ts
export class EncounterToClientMapper {
  static toDto(entity: EncounterEntity): EncounterDetailDto {
    return {
      id: entity.id,
      encounterId: entity.encounterId,
      status: entity.status,
      // ...
    };
  }

  static toListItem(entity: EncounterEntity): EncounterListItemDto {
    return {
      id: entity.id,
      encounterId: entity.encounterId,
      status: entity.status,
      createdAt: entity.createdAt,
    };
  }
}

// encounters.service.ts (Application Service - Delgado)
@Injectable()
export class EncountersService {
  constructor(
    private coreService: EncountersCoreService,
  ) {}

  async findAll(user?: User): Promise<EncountersListResponse> {
    const { entities, total } = await this.coreService.findEncountersByQuery(
      { page: 1, limit: 100 },
      user,
    );

    return {
      total,
      data: entities.map(e => EncounterToClientMapper.toListItem(e)),
    };
  }
}

// fhir.service.ts (Application Service - Delgado)
@Injectable()
export class FhirService {
  constructor(
    private encountersCoreService: EncountersCoreService,
  ) {}

  async searchEncounters(params: QueryParams, user?: User) {
    const { entities, total } = await this.encountersCoreService.findEncountersByQuery(
      params,
      user,
    );

    return {
      total,
      entries: EncounterToFhirMapper.toFhirList(entities),
    };
  }
}
```

## 🎯 Conclusión

**El patrón "Core + Mappers" es una evolución natural y mejor de nuestra propuesta:**

- ✅ **Misma separación de Core/Domain** (ya lo tenemos)
- ✅ **Mappers independientes** (mejora sobre métodos privados)
- ✅ **Application Services delgados** (mejora sobre servicios con transformación)
- ✅ **Mejor testabilidad y reutilización**

**Recomendación**: Implementar el patrón "Core + Mappers" como evolución de nuestra arquitectura actual.
