# Tipos Disponibles en @carecore/shared

Este documento lista todos los tipos disponibles en el paquete `@carecore/shared` para referencia rápida.

## Tipos FHIR Base

### Recursos FHIR

- ✅ **`FhirResource`**: Interfaz base para todos los recursos FHIR
- ✅ **`Resource`**: Alias de `FhirResource` para conveniencia (usado en código genérico)
- ✅ **`SpecificResource`**: Unión de todos los tipos específicos de recursos FHIR

### Recursos Específicos

- ✅ **`Patient`**: Recurso Patient (demografía del paciente)
- ✅ **`Practitioner`**: Recurso Practitioner (profesional de salud)
- ✅ **`Encounter`**: Recurso Encounter (interacción paciente-proveedor)
- ✅ **`Consent`**: Recurso Consent (consentimientos del paciente)
- ✅ **`DocumentReference`**: Recurso DocumentReference (referencias a documentos)
- ✅ **`OperationOutcome`**: Recurso OperationOutcome (resultados de operaciones)

### Tipos Auxiliares FHIR

- ✅ **`FhirMeta`**: Metadatos del recurso
- ✅ **`FhirIdentifier`**: Identificadores
- ✅ **`FhirHumanName`**: Nombres de personas
- ✅ **`FhirContactPoint`**: Puntos de contacto (teléfono, email, etc.)
- ✅ **`FhirAddress`**: Direcciones
- ✅ **`FhirReference`**: Referencias a otros recursos
- ✅ **`FhirCodeableConcept`**: Conceptos codificados
- ✅ **`FhirCoding`**: Codificaciones
- ✅ **`FhirPeriod`**: Períodos de tiempo
- ✅ **`FhirQuantity`**: Cantidades
- ✅ **`FhirAttachment`**: Adjuntos/archivos

### Tipos de Consentimiento

- ✅ **`ConsentPolicy`**: Políticas relacionadas con consentimientos
- ✅ **`ConsentVerification`**: Verificación de consentimientos
- ✅ **`ConsentProvision`**: Provisiones de consentimiento
- ✅ **`ConsentProvisionActor`**: Actores en provisiones
- ✅ **`ConsentProvisionData`**: Datos en provisiones

## Tipos de Autenticación

- ✅ **`TokensResponse`**: Respuesta de tokens OAuth2/OIDC
- ✅ **`PatientRegisterPayload`**: Payload para registro de pacientes
- ✅ **`PatientRegisterResponse`**: Respuesta del registro de pacientes

## Tipos de Consentimiento (Payloads)

- ✅ **`CreateConsentPayload`**: Payload para crear consentimientos
- ✅ **`UpdateConsentPayload`**: Payload para actualizar consentimientos
- ✅ **`ShareConsentWithPractitionerPayload`**: Payload para compartir consentimientos

## Tipos de Paginación

- ✅ **`PaginationParams`**: Parámetros de paginación para requests
- ✅ **`PaginationMeta`**: Metadatos de paginación en respuestas
- ✅ **`PaginatedResponse<T>`**: Wrapper genérico para respuestas paginadas

## Tipos de Usuario

- ✅ **`User`**: Información del usuario extraída del JWT

## Tipos de Error

- ✅ **`ErrorType`**: Enum de tipos de error
- ✅ **`ErrorInfo`**: Información de error estructurada

## Tipos de Configuración

- ✅ **`Environment`**: Entornos de la aplicación
- ✅ **`AppConfig`**: Configuración de la aplicación

## Constantes

### Tipos de Recursos FHIR

- ✅ **`FHIR_RESOURCE_TYPES`**: Constantes de tipos de recursos FHIR
- ✅ **`FhirResourceType`**: Tipo para valores de tipos de recursos FHIR
- ✅ **`ALL_FHIR_RESOURCE_TYPES`**: Array de todos los tipos de recursos
- ✅ **`isValidFhirResourceType()`**: Función para validar tipos de recursos
- ✅ **`MODULE_TO_RESOURCE_TYPE`**: Mapeo de módulos a tipos de recursos

### Scopes FHIR

- ✅ **`FHIR_SCOPES`**: Constantes de scopes FHIR

### Acciones FHIR

- ✅ **`FHIR_ACTIONS`**: Constantes de acciones FHIR

### Claves de Almacenamiento

- ✅ **`AUTH_TOKEN_STORAGE_KEY`**: Clave para almacenar tokens de autenticación

## Uso en el Código

### Ejemplo: Importar tipos FHIR

```typescript
import {
  Patient,
  Encounter,
  DocumentReference,
  Consent,
  Resource,
  FhirResourceType,
} from '@carecore/shared';
```

### Ejemplo: Importar tipos de autenticación

```typescript
import {
  TokensResponse,
  PatientRegisterPayload,
  PatientRegisterResponse,
} from '@carecore/shared';
```

### Ejemplo: Importar tipos de consentimiento

```typescript
import {
  CreateConsentPayload,
  UpdateConsentPayload,
  ShareConsentWithPractitionerPayload,
} from '@carecore/shared';
```

### Ejemplo: Importar tipos de paginación

```typescript
import {
  PaginationParams,
  PaginationMeta,
  PaginatedResponse,
} from '@carecore/shared';
```

### Ejemplo: Importar constantes

```typescript
import {
  FHIR_RESOURCE_TYPES,
  FhirResourceType,
  AUTH_TOKEN_STORAGE_KEY,
} from '@carecore/shared';
```

## Notas

- Todos los tipos están exportados desde `@carecore/shared` usando barrel exports
- Los tipos base FHIR están en `types/fhir.interface.ts`
- Los tipos específicos de dominio están en sus propios archivos (auth, consent, pagination)
- Las constantes están en `constants/`
- Los tipos se pueden usar tanto en mobile como en web (futuro)
