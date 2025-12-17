# Estrategia de Testing para KeycloakAdminService

## Problema Identificado

Los tests unitarios para `KeycloakAdminService` tienen problemas con el mock de `KcAdminClient`, específicamente con el flujo de autenticación y la extracción del token del `tokenSet`. Esto resulta en 35 tests fallando.

## Solución Recomendada: Tests de Integración

Para `KeycloakAdminService`, que interactúa directamente con la API de administración de Keycloak, **recomendamos usar tests de integración con Keycloak real** en lugar de intentar mockear toda la complejidad del cliente de Keycloak.

### Ventajas de Tests de Integración

1. **Más confiables**: Prueban la interacción real con Keycloak
2. **Detectan problemas de compatibilidad**: Pueden detectar cambios en la API de Keycloak
3. **Más fáciles de mantener**: No requieren mantener mocks complejos
4. **Cobertura real**: Prueban el flujo completo de autenticación y operaciones

### Desventajas

1. **Requieren Keycloak en ejecución**: Necesitas un Keycloak de prueba
2. **Más lentos**: Son más lentos que los tests unitarios
3. **Configuración**: Requieren configuración de variables de entorno

## Estructura de Tests

### Tests Unitarios (mantener para lógica simple)

- Tests para validación de configuración
- Tests para manejo de errores básicos
- Tests para lógica de negocio que no depende de Keycloak

### Tests de Integración (nuevos)

- Tests para operaciones de usuarios (`findUserById`, `getUserRoles`, etc.)
- Tests para operaciones de roles (`addRoleToUser`, `removeRoleFromUser`, etc.)
- Tests para operaciones de clientes (`findClientById`, `validateRedirectUri`)
- Tests para operaciones de MFA (`userHasMFA`, `generateTOTPSecret`, etc.)

## Configuración

### Variables de Entorno para Tests de Integración

```bash
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=carecore
KEYCLOAK_ADMIN_CLIENT_ID=admin-cli
KEYCLOAK_ADMIN_CLIENT_SECRET=your-secret
```

### Ejecutar Tests de Integración

```bash
# Todos los tests de integración
npm run test:integration

# Solo tests de KeycloakAdminService
npm run test:integration -- keycloak-admin.service.int-spec.ts

# Con cobertura
npm run test:integration:cov
```

## Alternativa: Mejorar Mocks (si no puedes usar Keycloak real)

Si no puedes usar Keycloak real para tests, puedes intentar mejorar los mocks, pero esto requiere:

1. Mockear correctamente el flujo de autenticación
2. Mockear todos los métodos del `KcAdminClient`
3. Mantener los mocks actualizados con cambios en la API

**Nota**: Los mocks complejos son difíciles de mantener y pueden no reflejar el comportamiento real de Keycloak.

## Recomendación Final

**Usa tests de integración con Keycloak real** para `KeycloakAdminService`. Esto te dará:

- Mayor confianza en el código
- Detección temprana de problemas de compatibilidad
- Tests más fáciles de mantener
- Cobertura real del flujo completo

Los tests unitarios pueden mantenerse para casos simples (validación, manejo de errores básicos), pero las operaciones complejas deben probarse con Keycloak real.
