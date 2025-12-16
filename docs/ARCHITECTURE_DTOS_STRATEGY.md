# Estrategia para DTOs y Tipos Compartidos

## Problema

Los DTOs del API (NestJS) tienen decoradores de validación (`@IsString`, `@IsEmail`, etc.) y Swagger (`@ApiProperty`) que son específicos de NestJS y no funcionan en TypeScript puro (frontend).

## Estrategia Recomendada

### 1. **Principio: Separación de Responsabilidades**

- **DTOs en API** (`packages/api/src/**/*.dto.ts`):
  - Mantienen decoradores de validación y Swagger
  - Usados para validación de entrada/salida en el backend
  - Pueden extender o implementar tipos de `@carecore/shared`

- **Tipos/Interfaces en Shared** (`packages/shared/src/types/**/*.interface.ts`):
  - Versiones "limpias" sin decoradores
  - Usados por frontend (mobile/web) y backend
  - Representan contratos de datos compartidos

### 2. **Cuándo Crear Tipos Compartidos**

✅ **SÍ crear tipos compartidos cuando:**
- El frontend necesita enviar datos al API (requests)
- El frontend necesita tipar respuestas del API (responses)
- Los datos son parte del contrato público entre frontend y backend
- Se usan en múltiples lugares (mobile + web futuro)

❌ **NO crear tipos compartidos cuando:**
- Son DTOs internos del API (solo usados entre servicios)
- Son específicos de validación de NestJS
- No se usan en el frontend

### 3. **Ejemplos Actuales**

#### ✅ Ya Implementado Correctamente:

**`PatientRegisterPayload`** (shared):
- Usado por mobile para enviar datos de registro
- Versión limpia de `RegisterPatientDto` (API)
- Sin decoradores, solo estructura de datos

**`TokensResponse`** (shared):
- Usado por mobile y futuro web
- Representa respuesta estándar OAuth2
- Contrato compartido entre frontend y backend

#### ✅ Ya Implementado:

**Paginación:**
- ✅ `PaginationParams`, `PaginationMeta`, `PaginatedResponse<T>` (shared)
- Usado en queries del frontend para paginación

**Consent:**
- ✅ `CreateConsentPayload`, `UpdateConsentPayload`, `ShareConsentWithPractitionerPayload` (shared)
- Usado cuando mobile/web crea/actualiza/comparte consentimientos
- Reutiliza tipos base de `fhir.interface.ts` (ConsentPolicy, ConsentVerification, etc.)

**FHIR Resources:**
- Ya tenemos tipos FHIR en `@carecore/shared` (Patient, Consent, etc.)
- Los DTOs pueden extender estos tipos base

### 4. **Patrón de Implementación**

```typescript
// packages/shared/src/types/consent.interface.ts
export interface CreateConsentPayload {
  status: 'draft' | 'proposed' | 'active' | 'rejected' | 'inactive' | 'entered-in-error';
  scope: { coding?: Array<...>; text?: string };
  category: Array<{ coding?: Array<...>; text?: string }>;
  patient: { reference: string; display?: string };
  dateTime?: string;
  // ... otros campos
}

// packages/api/src/common/dto/fhir-consent.dto.ts
import { CreateConsentPayload } from '@carecore/shared';

export class CreateConsentDto implements CreateConsentPayload {
  @ApiProperty({ ... })
  @IsEnum([...])
  status!: CreateConsentPayload['status'];

  // ... decoradores de validación
}
```

### 5. **Ventajas de Esta Estrategia**

✅ **Mantiene separación de responsabilidades**
- DTOs con validación en API
- Tipos limpios en shared

✅ **Evita duplicación innecesaria**
- Solo creamos tipos compartidos cuando realmente se necesitan

✅ **Facilita mantenimiento**
- Un solo lugar para la estructura de datos compartidos
- Los DTOs pueden validar contra los tipos base

✅ **TypeScript funciona correctamente**
- Frontend no necesita decoradores de NestJS
- Backend mantiene validación robusta

### 6. **Recomendación para el Proyecto**

**Enfoque incremental:**
1. ✅ Ya tenemos `PatientRegisterPayload`, `TokensResponse`, `PatientRegisterResponse`
2. Crear tipos compartidos **solo cuando el frontend los necesite**
3. Priorizar según uso real:
   - **Alta prioridad**: Tipos usados en requests/responses del frontend
   - **Baja prioridad**: DTOs internos del API

**No es necesario:**
- Mover todos los DTOs a shared
- Crear versiones compartidas "por si acaso"
- Duplicar DTOs que solo se usan en el backend

## Conclusión

La estrategia actual es correcta: **crear tipos compartidos solo cuando el frontend los necesita**. Ya lo estamos haciendo bien con los tipos de autenticación. Continuemos con este enfoque incremental.
