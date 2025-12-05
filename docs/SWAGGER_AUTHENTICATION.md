# Autenticación en Swagger UI

Esta guía explica cómo autenticarse y usar endpoints protegidos desde Swagger UI.

> ⚠️ **ADVERTENCIA DE SEGURIDAD**: Esta documentación es para **desarrollo y testing únicamente**.
> En producción, Swagger UI debe estar **deshabilitado** o **protegido con autenticación adicional**.
> Nunca expongas Swagger UI públicamente en producción sin protección adecuada.

## Requisitos Previos

1. Keycloak debe estar configurado y ejecutándose
2. Un usuario debe estar creado en Keycloak
3. El cliente de API (`carecore-api`) debe estar configurado en Keycloak

## Pasos para Autenticarse

### Paso 1: Obtener URL de Autorización

1. Abre Swagger UI en `http://localhost:3000/api/docs`
2. Navega al endpoint `POST /api/auth/login`
3. En los parámetros, agrega:
   - `returnUrl`: `true`
4. Ejecuta la petición
5. Copia la `authorizationUrl` de la respuesta

### Paso 2: Completar el Flujo OAuth2

1. Abre la `authorizationUrl` en tu navegador
2. Inicia sesión con tus credenciales de Keycloak
3. Autoriza la aplicación
4. Serás redirigido al frontend con tokens en cookies

### Paso 3: Obtener el Access Token

Para usar Swagger UI, necesitas el access token. Tienes dos opciones:

#### Opción A: Desde el Navegador (Recomendado)

> ⚠️ **Seguridad**: Los tokens en cookies HTTP-only son más seguros que copiarlos manualmente.
> Solo copia tokens cuando sea absolutamente necesario para testing.

1. Después de completar el login, abre las herramientas de desarrollador (F12)
2. Ve a la pestaña "Application" (Chrome) o "Storage" (Firefox)
3. Busca las cookies del dominio `localhost:3000`
4. Copia el valor de la cookie `access_token`
   - ⚠️ **No compartas este token** con nadie
   - ⚠️ **No lo guardes** en archivos de texto o capturas de pantalla
   - ⚠️ **Bórralo** después de usarlo si es posible

#### Opción B: Desde el Endpoint de Usuario

1. Si ya tienes un token válido, usa el endpoint `GET /api/auth/user`
2. Este endpoint requiere autenticación, pero puedes obtener el token de las cookies del navegador

### Paso 4: Autorizar en Swagger UI

> ⚠️ **Seguridad**: El token se almacena en el localStorage del navegador cuando usas Swagger UI.
> Asegúrate de cerrar sesión y limpiar el token cuando termines.

1. En Swagger UI, haz clic en el botón **"Authorize"** (🔒) en la parte superior derecha
2. En la sección **"JWT-auth"**, pega tu access token (sin el prefijo "Bearer ")
   - ⚠️ **No compartas este token** con nadie
   - ⚠️ **No lo captures en pantalla** si vas a compartir la imagen
3. Haz clic en **"Authorize"**
4. Haz clic en **"Close"**
5. **Después de usar**: Haz clic en "Authorize" nuevamente y luego en "Logout" para limpiar el token

### Paso 5: Probar Endpoints Protegidos

Ahora puedes probar cualquier endpoint protegido:

1. Los endpoints protegidos mostrarán un ícono de candado 🔒
2. El token se incluirá automáticamente en todas las peticiones
3. El token se guardará entre recargas de página (si `persistAuthorization` está habilitado)

> ⚠️ **Seguridad**: Recuerda que el token puede quedar en:
> - Historial del navegador
> - Logs del servidor (si se registran headers)
> - Capturas de pantalla
> Siempre usa tokens de prueba, nunca tokens de producción.

## Ejemplos de Uso

### Ejemplo 1: Obtener Información del Usuario

```http
GET /api/auth/user
Authorization: Bearer <your-access-token>
```

**Respuesta:**
```json
{
  "id": "user-uuid",
  "username": "john.doe",
  "email": "john.doe@example.com",
  "roles": ["patient"],
  "name": "John Doe",
  "givenName": "John",
  "familyName": "Doe"
}
```

### Ejemplo 2: Crear un Paciente

```http
POST /api/fhir/Patient
Authorization: Bearer <your-access-token>
Content-Type: application/json

{
  "resourceType": "Patient",
  "name": [
    {
      "family": "Doe",
      "given": ["John"]
    }
  ],
  "gender": "male",
  "birthDate": "1990-01-01"
}
```

### Ejemplo 3: Buscar Pacientes

```http
GET /api/fhir/Patient?name=John&page=1&limit=10
Authorization: Bearer <your-access-token>
```

## Refrescar el Token

Si tu access token expira:

1. Usa el endpoint `POST /api/auth/refresh`
2. Proporciona el `refreshToken` (puede estar en una cookie o en el body)
3. Obtendrás un nuevo `accessToken`
4. Actualiza el token en Swagger UI usando el botón "Authorize"

## Cerrar Sesión

Para cerrar sesión:

1. Usa el endpoint `POST /api/auth/logout`
2. Proporciona el `refreshToken` (puede estar en una cookie o en el body)
3. Esto revocará los tokens en Keycloak y limpiará las cookies locales

## Solución de Problemas

### Error: "Unauthorized - JWT token required"

- Verifica que hayas hecho clic en "Authorize" en Swagger UI
- Verifica que el token no haya expirado
- Verifica que el token sea válido (puedes decodificarlo en [jwt.io](https://jwt.io) - ⚠️ **solo usa tokens de prueba**, nunca tokens reales de producción)

### Error: "Token issuer mismatch"

- Verifica que `KEYCLOAK_URL` y `KEYCLOAK_REALM` estén configurados correctamente
- Verifica que el token sea del realm correcto

### Error: "Invalid token format"

- Asegúrate de pegar solo el token, sin el prefijo "Bearer "
- Verifica que no haya espacios adicionales

### El botón "Authorize" no aparece

- Verifica que `addBearerAuth()` esté configurado en `main.ts`
- Verifica que los endpoints tengan `@ApiBearerAuth('JWT-auth')`

## Notas Importantes

### Seguridad

1. **Nunca compartas tokens**: Los tokens de acceso son credenciales sensibles. No los compartas con nadie, ni los incluyas en:
   - Capturas de pantalla
   - Documentación pública
   - Logs o mensajes de error
   - Repositorios de código
   - Mensajes de chat o email

2. **Tokens de prueba únicamente**: Esta guía es para desarrollo. En producción:
   - Swagger UI debe estar deshabilitado o protegido
   - Usa tokens solo en entornos controlados
   - Nunca uses tokens de producción en herramientas de testing

3. **Limpieza de tokens**: Después de usar Swagger UI:
   - Haz clic en "Authorize" → "Logout" para limpiar el token
   - Cierra la sesión del navegador si es necesario
   - Limpia el historial del navegador si contiene tokens

4. **Almacenamiento**: Los tokens se almacenan en:
   - **Cookies HTTP-only** (más seguro, no accesible desde JavaScript)
   - **localStorage del navegador** (cuando usas Swagger UI)
   - ⚠️ El localStorage puede ser accedido por scripts maliciosos si hay XSS

### Funcionalidad

5. **Expiración**: Los access tokens tienen un tiempo de vida limitado (típicamente 5-15 minutos). Usa el endpoint de refresh para obtener nuevos tokens.

6. **Roles**: Algunos endpoints pueden requerir roles específicos. Verifica que tu usuario tenga los roles necesarios en Keycloak.

7. **Cookies vs Headers**:
   - En producción, los tokens se manejan principalmente a través de cookies HTTP-only (más seguro)
   - En Swagger UI, usamos el header `Authorization` para mayor flexibilidad (solo para desarrollo/testing)

### Producción

8. **Swagger en Producción**:
   - ⚠️ **Deshabilita Swagger UI en producción** o protégelo con autenticación adicional
   - Considera usar variables de entorno para controlar la visibilidad de Swagger
   - Ejemplo de código para deshabilitar en producción:
     ```typescript
     // En src/main.ts
     if (process.env.NODE_ENV !== 'production') {
       SwaggerModule.setup('api/docs', app, document, { ... });
     }
     ```
   - Alternativamente, protege Swagger con autenticación básica o IP whitelist
   - Nunca expongas Swagger UI públicamente sin protección

## Referencias

- [NestJS Swagger Documentation](https://docs.nestjs.com/openapi/introduction)
- [OpenAPI Security Schemes](https://swagger.io/docs/specification/authentication/)
- [JWT.io - JWT Debugger](https://jwt.io)

