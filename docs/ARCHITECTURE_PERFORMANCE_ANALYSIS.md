# Análisis de Performance: Arquitectura Unificada

## 🎯 Pregunta

¿La implementación de Domain Services genera más "carga" o problemas de performance?

## 📊 Análisis de Overhead

### 1. Overhead de Llamadas entre Servicios

#### Situación Actual (Sin Domain Services)

```
Request → Controller → Service → Repository → DB
         (1 llamada)
```

#### Situación Propuesta (Con Domain Services)

```
Request → Controller → Presentation Service → Domain Service → Repository → DB
         (2 llamadas)
```

**Overhead**: ~0.001-0.01ms por llamada adicional (en memoria, sin I/O)

**Conclusión**: ✅ **Despreciable** - Las llamadas entre servicios en Node.js son muy rápidas (solo referencias en memoria).

### 2. Queries a Base de Datos

#### Situación Actual

```typescript
// FhirService.searchEncounters()
const entities = await queryBuilder.getMany(); // 1 query a BD
return { entries: entities.map((e) => this.entityToEncounter(e)) };

// EncountersService.findAll()
const entities = await queryBuilder.getMany(); // 1 query a BD (duplicada)
return { data: entities.map((e) => this.entityToListItem(e)) };
```

**Problema**: Si ambos endpoints se llaman, se ejecutan **2 queries idénticas**.

#### Situación Propuesta

```typescript
// Domain Service (compartido)
const entities = await queryBuilder.getMany(); // 1 query a BD

// Presentation Services (transformación)
FhirService → Domain Service → 1 query
EncountersService → Domain Service → 1 query
```

**Resultado**: ✅ **Mismo número de queries** - No hay overhead adicional en BD.

**Ventaja**: Si ambos endpoints se llaman simultáneamente, podríamos implementar caching compartido.

### 3. Uso de Memoria

#### Situación Actual

```
Request 1: Controller → FhirService → Entity[] → FHIR[]
Request 2: Controller → EncountersService → Entity[] → DTO[]
```

**Memoria**: 2x Entity[] en memoria (si se llaman ambos)

#### Situación Propuesta

```
Request 1: Controller → FhirService → Domain Service → Entity[] → FHIR[]
Request 2: Controller → EncountersService → Domain Service → Entity[] → DTO[]
```

**Memoria**: 2x Entity[] en memoria (igual que antes)

**Conclusión**: ✅ **Sin cambio** - Mismo uso de memoria.

### 4. Transformación de Datos

#### Situación Actual

```typescript
// FhirService
entities.map((e) => this.entityToEncounter(e)); // Transformación inline

// EncountersService
entities.map((e) => this.entityToListItem(e)); // Transformación inline
```

#### Situación Propuesta

```typescript
// Domain Service retorna Entity[]
const { entities } = await domainService.findEncountersByQuery();

// Presentation Services transforman
FhirService: entities.map((e) => this.entityToEncounter(e));
EncountersService: entities.map((e) => this.entityToListItem(e));
```

**Conclusión**: ✅ **Mismo costo** - La transformación se hace igual, solo cambia dónde.

## ⚡ Optimizaciones Posibles con Domain Services

### 1. Caching Compartido

**Con Domain Services, podemos implementar caching a nivel de domain:**

```typescript
@Injectable()
export class EncountersDomainService {
  private cache = new Map<string, { entities: EncounterEntity[]; timestamp: number }>();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutos

  async findEncountersByQuery(params: QueryParams, user?: User) {
    const cacheKey = this.generateCacheKey(params, user);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.entities; // Cache hit - sin query a BD
    }

    // Query a BD solo si no hay cache
    const entities = await queryBuilder.getMany();
    this.cache.set(cacheKey, { entities, timestamp: Date.now() });
    return entities;
  }
}
```

**Beneficio**: Si `FhirService` y `EncountersService` llaman con los mismos parámetros, solo se ejecuta **1 query** en lugar de 2.

### 2. Query Optimization Centralizada

**Con Domain Services, podemos optimizar queries en un solo lugar:**

```typescript
@Injectable()
export class EncountersDomainService {
  async findEncountersByQuery(params: QueryParams, user?: User) {
    const queryBuilder = this.encounterRepository
      .createQueryBuilder('encounter')
      .where('encounter.deletedAt IS NULL');

    // Optimización: Solo seleccionar campos necesarios
    queryBuilder.select([
      'encounter.id',
      'encounter.encounterId',
      'encounter.status',
      'encounter.subjectReference',
      'encounter.createdAt',
    ]);

    // Optimización: Usar índices explícitamente
    if (params.status) {
      queryBuilder.useIndex('idx_encounter_status');
    }

    return queryBuilder.getMany();
  }
}
```

**Beneficio**: Optimizaciones aplicadas a todos los endpoints automáticamente.

### 3. Batch Operations

**Con Domain Services, podemos implementar operaciones batch:**

```typescript
@Injectable()
export class EncountersDomainService {
  async findEncountersByIds(ids: string[], user?: User) {
    // Una sola query para múltiples IDs
    const entities = await this.encounterRepository
      .createQueryBuilder('encounter')
      .where('encounter.id IN (:...ids)', { ids })
      .andWhere('encounter.deletedAt IS NULL')
      .getMany();

    // Validar acceso para todos
    entities.forEach((e) => this.validateAccess(e, user));
    return entities;
  }
}
```

**Beneficio**: Reducción de queries cuando se necesitan múltiples recursos.

## 📈 Comparación de Performance

### Escenario 1: Un Solo Endpoint Llamado

| Métrica                  | Actual   | Propuesta    | Diferencia       |
| ------------------------ | -------- | ------------ | ---------------- |
| Llamadas entre servicios | 1        | 2            | +1 (0.001ms)     |
| Queries a BD             | 1        | 1            | 0                |
| Transformaciones         | 1        | 1            | 0                |
| Memoria                  | Entity[] | Entity[]     | 0                |
| **Total Overhead**       | -        | **+0.001ms** | **Despreciable** |

### Escenario 2: Ambos Endpoints Llamados (Mismo Usuario)

| Métrica                  | Actual      | Propuesta                               | Diferencia           |
| ------------------------ | ----------- | --------------------------------------- | -------------------- |
| Llamadas entre servicios | 2           | 4                                       | +2 (0.002ms)         |
| Queries a BD             | 2           | 2 (o 1 con cache)                       | 0 (o -1 con cache)   |
| Transformaciones         | 2           | 2                                       | 0                    |
| Memoria                  | 2x Entity[] | 2x Entity[] (o 1x con cache)            | 0 (o -50% con cache) |
| **Total Overhead**       | -           | **+0.002ms** (o **-1 query** con cache) | **Mejora con cache** |

### Escenario 3: Alto Tráfico (1000 req/s)

| Métrica            | Actual | Propuesta                  | Diferencia                   |
| ------------------ | ------ | -------------------------- | ---------------------------- |
| Overhead adicional | -      | 1ms/s                      | **0.1% del tiempo total**    |
| Queries a BD       | 1000/s | 1000/s (o menos con cache) | 0 (o reducción)              |
| **Impacto**        | -      | **Despreciable**           | **Posible mejora con cache** |

## 🎯 Conclusión

### ✅ No Hay Problema de Performance

1. **Overhead de llamadas**: ~0.001ms por request (despreciable)
2. **Queries a BD**: Mismo número (o menos con caching)
3. **Memoria**: Mismo uso (o menos con caching compartido)
4. **CPU**: Mismo uso (transformaciones iguales)

### ✅ Posibles Mejoras

1. **Caching compartido**: Reduce queries cuando ambos endpoints se usan
2. **Optimizaciones centralizadas**: Mejoras aplicadas automáticamente
3. **Batch operations**: Reducción de queries en operaciones múltiples

### 📊 Recomendación

**Implementar Domain Services** porque:

- ✅ Overhead despreciable (< 0.1% del tiempo total)
- ✅ Posibilidad de optimizaciones (caching, batch)
- ✅ Mejor mantenibilidad (código DRY)
- ✅ Escalabilidad mejorada

**El overhead es mínimo comparado con los beneficios de mantenibilidad y las oportunidades de optimización.**

## 🔧 Optimizaciones Recomendadas

Si en el futuro necesitas mejorar performance:

1. **Implementar caching en Domain Services** (Redis o in-memory)
2. **Query optimization** (índices, select específicos)
3. **Connection pooling** (ya configurado en TypeORM)
4. **Lazy loading** para relaciones complejas

Pero estas optimizaciones son **independientes** de la arquitectura de Domain Services.
