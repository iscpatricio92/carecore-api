# Configuración del Scope `fhirUser` en Keycloak

Esta guía explica cómo configurar el scope `fhirUser` en Keycloak para aplicaciones SMART on FHIR.

## 🎯 ¿Qué es `fhirUser`?

El scope `fhirUser` es un scope estándar de SMART on FHIR que proporciona una referencia al recurso FHIR del usuario autenticado (Patient o Practitioner).

**Ejemplo de uso:**

- Si el usuario es un Patient, `fhirUser` contendría: `Patient/123`
- Si el usuario es un Practitioner, `fhirUser` contendría: `Practitioner/456`

Este scope se incluye en el token JWT como un claim adicional.

## 📋 Requisitos Previos

- ✅ Realm "carecore" creado
- ✅ Cliente configurado (`carecore-api` o `carecore-mobile`)
- ✅ Acceso a Admin Console de Keycloak

## 🚀 Configuración Paso a Paso

### Paso 1: Acceder a Admin Console

1. Accede a Keycloak Admin Console:
   - URL: `http://localhost:8080/admin`
   - Usuario: valor de `KEYCLOAK_ADMIN` en `.env.local`
   - Password: valor de `KEYCLOAK_ADMIN_PASSWORD` en `.env.local`

2. Selecciona el realm `carecore` (dropdown superior izquierdo)

### Paso 2: Crear Client Scope `fhirUser`

1. En el menú lateral izquierdo, ve a **Client scopes**

2. Haz clic en **Create client scope** (botón en la esquina superior derecha)

3. En "General settings":
   - **Name:** `fhirUser`
   - **Description:** `FHIR User Resource - Reference to the authenticated user's FHIR resource (Patient or Practitioner)`
   - **Type:** Default (se incluirá en tokens por defecto)
   - Haz clic en **Next**

4. En "Settings":
   - **Include in Token Scope:** ON ✅
   - **Display on consent screen:** OFF (para MVP, no mostrar consent screen)
   - Haz clic en **Save**

### Paso 3: Crear Mapper para `fhirUser`

Para que el scope `fhirUser` funcione correctamente, necesitas crear un mapper que agregue el claim `fhirUser` al token JWT.

1. En la página del scope `fhirUser`, ve a la pestaña **Mappers**

2. Haz clic en **Create mapper** (botón en la esquina superior derecha)

3. Selecciona **By configuration** → **User Attribute**

4. Configura el mapper:
   - **Name:** `fhirUser`
   - **User Attribute:** `fhirUser` (o el nombre del atributo donde guardas la referencia FHIR)
   - **Token Claim Name:** `fhirUser`
   - **Claim JSON Type:** String
   - **Add to ID token:** ON ✅
   - **Add to access token:** ON ✅
   - **Add to userinfo:** ON ✅
   - Haz clic en **Save**

**Nota:** Si no tienes un atributo de usuario `fhirUser`, puedes crear un mapper más complejo que construya la referencia basándose en el ID del usuario y su rol.

### Paso 4: Asignar Scope al Cliente

1. Ve a **Clients** → busca tu cliente (`carecore-api` o `carecore-mobile`) → ábrelo

2. Ve a la pestaña **Client scopes**

3. En la sección **Default Client Scopes**, haz clic en **Add client scope**

4. Selecciona `fhirUser` de la lista

5. Haz clic en **Add**

### Paso 5: Configurar Atributo de Usuario (Opcional)

Si quieres que el claim `fhirUser` se genere automáticamente, puedes configurar un atributo de usuario:

1. Ve a **Users** → selecciona un usuario

2. Ve a la pestaña **Attributes**

3. Agrega un atributo:
   - **Key:** `fhirUser`
   - **Value:** `Patient/123` (o `Practitioner/456` según el tipo de usuario)

4. Haz clic en **Save**

**Nota:** En producción, este atributo debería generarse automáticamente cuando se crea el usuario o cuando se crea el recurso FHIR correspondiente.

## ✅ Verificación

### Verificar que el Scope Existe

1. Ve a **Client scopes** → busca `fhirUser`
2. Verifica que esté en la lista

### Verificar que el Mapper Funciona

1. Obtén un token de acceso usando el cliente configurado
2. Decodifica el token JWT (usando [jwt.io](https://jwt.io) o similar)
3. Verifica que el campo `fhirUser` esté presente:

```json
{
  "sub": "user-uuid",
  "fhirUser": "Patient/123",
  "scope": "openid profile email fhirUser"
}
```

### Probar desde la App Móvil

1. Actualiza `packages/mobile/config/AppConfig.ts` para incluir `fhirUser`:

```typescript
scopes: ['openid', 'profile', 'email', 'fhirUser'],
```

2. Reinicia la app móvil
3. Haz login
4. Verifica que el token incluya el claim `fhirUser`

## 🐛 Troubleshooting

### Error: "Invalid scopes: fhirUser"

**Causa:** El scope `fhirUser` no está creado en Keycloak.

**Solución:**

1. Sigue los pasos anteriores para crear el scope
2. Asegúrate de asignarlo al cliente

### El claim `fhirUser` no aparece en el token

**Causa:** El mapper no está configurado correctamente o el atributo de usuario no existe.

**Solución:**

1. Verifica que el mapper esté creado y configurado
2. Verifica que el atributo de usuario `fhirUser` exista
3. Verifica que el mapper esté asignado al scope `fhirUser`

### El valor de `fhirUser` es incorrecto

**Causa:** El atributo de usuario tiene un valor incorrecto.

**Solución:**

1. Verifica el formato: debe ser `Patient/123` o `Practitioner/456`
2. Verifica que el ID del recurso FHIR sea correcto
3. Actualiza el atributo de usuario si es necesario

## 📚 Referencias

- [SMART on FHIR Scopes](http://hl7.org/fhir/smart-app-launch/scopes-and-launch-context/)
- [Keycloak Client Scopes](https://www.keycloak.org/docs/latest/server_admin/#_client_scopes)
- [Keycloak Protocol Mappers](https://www.keycloak.org/docs/latest/server_admin/#_protocol_mappers)

## 🔄 Alternativa: Generar `fhirUser` Dinámicamente

Si prefieres no usar atributos de usuario, puedes crear un mapper más complejo que genere el `fhirUser` dinámicamente basándose en:

1. El ID del usuario en Keycloak
2. El rol del usuario (patient, practitioner)
3. Una consulta a la base de datos para obtener el ID del recurso FHIR

Esto requiere un mapper personalizado o lógica en el backend que agregue el claim al token después de la autenticación.
