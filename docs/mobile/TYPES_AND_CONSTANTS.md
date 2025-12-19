# Tipos y Constantes - Mobile App

## 📦 Uso de @carecore/shared

### ✅ Tipos y Constantes que DEBEN venir de shared

Todos los siguientes tipos y constantes deben importarse desde `@carecore/shared`:

#### Tipos FHIR

- `Patient`, `Encounter`, `DocumentReference`, `Consent` - Recursos FHIR
- `Resource`, `Bundle` - Tipos base FHIR
- `FhirResourceType` - Tipo para tipos de recursos FHIR
- `FhirAction` - Tipo para acciones FHIR

#### Constantes FHIR

- `FHIR_RESOURCE_TYPES` - Constantes de tipos de recursos
- `FHIR_ACTIONS` - Constantes de acciones
- `FHIR_SCOPES` - Constantes de scopes OAuth2

#### Tipos de Autenticación

- `User` - Información del usuario
- `TokensResponse` - Respuesta de tokens
- `AUTH_TOKEN_STORAGE_KEY` - Clave de almacenamiento

#### Tipos de Configuración

- `Environment` - Entornos (development, production, etc.)
- `AppConfig` - Configuración de la app

#### Tipos de Error

- `ErrorType` - Tipos de error
- `ErrorInfo` - Información de error

#### Tipos de Registro

- `PatientRegisterPayload` - Payload para registro
- `PatientRegisterResponse` - Respuesta de registro

#### Tipos de Filtros (Mobile)

- `ResourceFilter` - Filtro por tipo de recurso ('all' | 'Encounter' | 'DocumentReference')
- `DateFilter` - Filtro por fecha ('all' | 'week' | 'month' | 'year')
- `ConsentStatusFilter` - Filtro por estado de consentimiento ('all' | 'active' | 'revoked' | 'expired')

#### Tipos de Paginación

- `PaginationParams` - Parámetros de paginación
- `PaginationMeta` - Metadatos de paginación
- `PaginatedResponse<T>` - Respuesta paginada

### 📝 Tipos Locales (Específicos de Mobile)

Los siguientes tipos son específicos de la app móvil y NO deben estar en shared:

#### Interfaces de Componentes

- `LoadingSpinnerProps` - Props del componente LoadingSpinner
- `EmptyStateProps` - Props del componente EmptyState
- `ClinicalRecordCardProps` - Props del componente ClinicalRecordCard
- `ConsentStatusCardProps` - Props del componente ConsentStatusCard
- `AppHeaderProps` - Props del componente AppHeader
- `FormInputProps` - Props del componente FormInput
- `PrimaryButtonProps` - Props del componente PrimaryButton

#### Interfaces de Hooks

- `FetchState<T>` - Estado de datos del hook `useFHIRData` (específico del hook)
- `AuthState` - Estado del hook `useAuth` (específico del hook)

#### Interfaces de Servicios

- Interfaces internas de servicios (HttpClient, ErrorService, etc.)

### ⚠️ Reglas de Uso

1. **NUNCA duplicar tipos que ya existen en shared**
   - Si un tipo existe en shared, úsalo desde allí
   - Si necesitas un tipo similar, considera si debería estar en shared

2. **Tipos específicos de UI pueden estar en mobile**
   - Props de componentes React Native
   - Estados locales de hooks específicos
   - Estilos y configuraciones de UI

3. **Tipos de dominio deben estar en shared**
   - Tipos FHIR
   - Tipos de autenticación
   - Tipos de configuración
   - Tipos de error
   - Tipos de filtros (si se usan en múltiples lugares)

4. **Constantes siempre en shared**
   - Todas las constantes deben estar en shared
   - Usa `FHIR_RESOURCE_TYPES` en lugar de strings literales
   - Usa `FHIR_ACTIONS` en lugar de strings literales

### 🔍 Verificación

Para verificar que estás usando shared correctamente:

```bash
# Buscar tipos duplicados
grep -r "type.*=" packages/mobile --include="*.ts" --include="*.tsx" | grep -v "node_modules"

# Buscar constantes duplicadas
grep -r "const.*=" packages/mobile --include="*.ts" --include="*.tsx" | grep -v "node_modules"

# Verificar imports de shared
grep -r "from '@carecore/shared'" packages/mobile --include="*.ts" --include="*.tsx"
```

### 📚 Referencias

- [Shared Package Index](../../packages/shared/src/index.ts) - Todos los exports de shared
- [FHIR Types](../../packages/shared/src/types/fhir.interface.ts) - Tipos FHIR
- [Constants](../../packages/shared/src/constants/) - Todas las constantes
