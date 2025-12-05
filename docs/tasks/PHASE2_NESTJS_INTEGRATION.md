# 📋 Tareas GitHub Projects - Fase 2: Integración con NestJS

> ⚠️ **ARCHIVO TEMPORAL**
> Este archivo contiene tareas detalladas para agregar en GitHub Projects.
> **Puede ser eliminado** una vez que:
> - Las tareas estén agregadas a GitHub Projects
> - Las tareas estén completadas
> - Ya no se necesite como referencia
>
> Para documentación permanente, ver: [AUTH_IMPLEMENTATION_PLAN.md](../AUTH_IMPLEMENTATION_PLAN.md)

---

## 📖 Historia de Usuario (HU)

### HU: Integración de Autenticación y Autorización con NestJS

**Como** desarrollador del sistema CareCore,
**Quiero** integrar Keycloak con la aplicación NestJS para implementar autenticación y autorización basada en OAuth2/OIDC,
**Para** que los usuarios puedan autenticarse de forma segura y acceder a los recursos FHIR según sus roles y permisos.

#### Criterios de Aceptación

- ✅ La aplicación NestJS valida tokens JWT emitidos por Keycloak
- ✅ Los endpoints están protegidos por autenticación JWT
- ✅ Los usuarios pueden iniciar sesión mediante flujo OAuth2 Authorization Code
- ✅ Los tokens pueden ser refrescados sin necesidad de re-autenticación
- ✅ Los usuarios pueden cerrar sesión y revocar tokens
- ✅ Los endpoints pueden ser protegidos por roles específicos
- ✅ Los recursos FHIR están estructurados y listos para persistencia en base de datos
- ✅ La documentación Swagger incluye autenticación para pruebas

#### Tareas Relacionadas

Esta HU incluye las siguientes tareas (ver detalles abajo):

- **Tarea 0**: Definir estructura de carpetas y tipos FHIR
- **Tarea 1**: Crear módulo `auth`
- **Tarea 2**: Instalar dependencias Passport
- **Tarea 3**: Implementar JWT strategy
- **Tarea 4**: Crear `JwtAuthGuard`
- **Tarea 5**: Crear decorador `@Public()`
- **Tarea 6**: Crear decorador `@CurrentUser()`
- **Tarea 7**: Implementar `AuthController`
- **Tarea 8**: Implementar endpoint `/auth/login`
- **Tarea 9**: Implementar endpoint `/auth/callback`
- **Tarea 10**: Implementar endpoint `/auth/refresh`
- **Tarea 11**: Implementar endpoint `/auth/logout`
- **Tarea 12**: Implementar endpoint `/auth/user`
- **Tarea 13**: Integrar con Swagger
- **Tarea 14**: Crear `RolesGuard`
- **Tarea 15**: Crear decorador `@Roles()`
- **Tarea 16**: Mapear roles de Keycloak

#### Estimación

- **Tiempo total**: 30-42 horas (4-6 días)
- **Prioridad**: Alta
- **Dependencias**: Fase 1 (Setup Keycloak) completada ✅

#### Definición de Terminado (DoD)

- [ ] Todas las tareas de la Fase 2 completadas
- [ ] Tests unitarios y E2E pasando
- [ ] Documentación actualizada
- [ ] Swagger configurado con autenticación
- [ ] Endpoints protegidos funcionando correctamente
- [ ] Roles y permisos validados

---

## 🎯 Tareas Principales

### Tarea 0: Definir estructura de carpetas y tipos FHIR

**Título:** `feat(fhir): definir estructura de carpetas y tipos TypeScript para recursos FHIR mínimos`

**Descripción:**
```markdown
## Objetivo
Definir la estructura de carpetas y los tipos de TypeScript/clases de NestJS para manejar los recursos FHIR mínimos (Patient, Practitioner, Encounter, Consent, DocumentReference).

## Tareas
- [ ] Completar interfaces TypeScript faltantes:
  - [ ] `Consent` en `src/common/interfaces/fhir.interface.ts`
  - [ ] `DocumentReference` en `src/common/interfaces/fhir.interface.ts`
- [ ] Crear DTOs faltantes:
  - [ ] `fhir-consent.dto.ts` con `CreateConsentDto` y `UpdateConsentDto`
  - [ ] `fhir-document-reference.dto.ts` con `CreateDocumentReferenceDto` y `UpdateDocumentReferenceDto`
- [ ] Crear entidades TypeORM para persistencia:
  - [ ] `patient.entity.ts` - Entidad para Patient
  - [ ] `practitioner.entity.ts` - Entidad para Practitioner
  - [ ] `encounter.entity.ts` - Entidad para Encounter
  - [ ] `consent.entity.ts` - Entidad para Consent
  - [ ] `document-reference.entity.ts` - Entidad para DocumentReference
- [ ] Crear estructura de carpetas por módulo:
  - [ ] `src/modules/practitioners/` - Módulo para Practitioner
  - [ ] `src/modules/encounters/` - Módulo para Encounter
  - [ ] `src/modules/documents/` - Módulo para DocumentReference
  - [ ] `src/modules/consents/` - Módulo para Consent
- [ ] Crear migraciones TypeORM para las entidades
- [ ] Actualizar `FhirService` para usar entidades en lugar de Map en memoria
- [ ] Documentar estructura de carpetas en README

## Estructura Esperada
```
src/
├── modules/
│   ├── fhir/              ✅ (ya existe)
│   ├── patients/          ✅ (ya existe)
│   ├── practitioners/     ⏳ (crear)
│   ├── encounters/        ⏳ (crear)
│   ├── documents/         ⏳ (crear)
│   └── consents/          ⏳ (crear)
├── common/
│   ├── interfaces/
│   │   └── fhir.interface.ts  ✅ (completar Consent y DocumentReference)
│   └── dto/
│       ├── fhir-patient.dto.ts              ✅ (ya existe)
│       ├── fhir-practitioner.dto.ts         ✅ (ya existe)
│       ├── fhir-encounter.dto.ts            ✅ (ya existe)
│       ├── fhir-consent.dto.ts              ⏳ (crear)
│       └── fhir-document-reference.dto.ts   ⏳ (crear)
└── entities/              ⏳ (crear carpeta)
    ├── patient.entity.ts
    ├── practitioner.entity.ts
    ├── encounter.entity.ts
    ├── consent.entity.ts
    └── document-reference.entity.ts
```

## Criterios de Aceptación
- [ ] Todas las interfaces TypeScript definidas (Patient, Practitioner, Encounter, Consent, DocumentReference)
- [ ] Todos los DTOs creados con validación
- [ ] Todas las entidades TypeORM creadas
- [ ] Estructura de carpetas por módulo implementada
- [ ] Migraciones TypeORM creadas y ejecutadas
- [ ] FhirService actualizado para usar base de datos
- [ ] Documentación actualizada

## DoD (Definition of Done)
- ✅ La estructura de la carpeta está lista
- ✅ Los types de datos FHIR básicos están definidos en la aplicación

## Referencias
- [FHIR R4 Specification](https://www.hl7.org/fhir/)
- [TypeORM Entities](https://typeorm.io/entities)
- [NestJS Modules](https://docs.nestjs.com/modules)
```

**Labels:** `enhancement`, `fhir`, `phase-2`, `database`

---

### Tarea 1: Crear módulo `auth`

**Título:** `feat(auth): crear módulo de autenticación en NestJS`

**Descripción:**
```markdown
## Objetivo
Crear la estructura base del módulo de autenticación en NestJS con la estructura de carpetas necesaria.

## Tareas
- [x] Crear carpeta `src/modules/auth/`
- [x] Crear `auth.module.ts` con configuración básica
- [x] Crear subcarpetas:
  - [x] `strategies/` - Para estrategias de Passport
  - [x] `guards/` - Para guards de autenticación
  - [x] `decorators/` - Para decoradores personalizados
  - [x] `dto/` - Para DTOs de autenticación
- [x] Integrar `AuthModule` en `AppModule`
- [x] Configurar imports necesarios (ConfigModule, PassportModule, JwtModule)

## Estructura Esperada
```
src/modules/auth/
├── auth.module.ts
├── strategies/
│   └── jwt.strategy.ts
├── guards/
│   ├── jwt-auth.guard.ts
│   └── roles.guard.ts
├── decorators/
│   ├── public.decorator.ts
│   ├── roles.decorator.ts
│   └── current-user.decorator.ts
└── dto/
    └── login.dto.ts
```

## Criterios de Aceptación
- [x] Módulo auth creado y estructurado
- [x] Módulo integrado en AppModule
- [x] Estructura de carpetas lista para implementación

## Referencias
- [NestJS Modules](https://docs.nestjs.com/modules)
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
```

**Labels:** `enhancement`, `auth`, `phase-2`

---

### Tarea 2: Instalar dependencias Passport

**Título:** `chore(auth): instalar dependencias de Passport para autenticación`

**Descripción:**
```markdown
## Objetivo
Instalar y configurar todas las dependencias necesarias para implementar autenticación JWT con Passport.

## Tareas
- [x] Verificar dependencias ya instaladas:
  - [x] `@nestjs/passport` ✅ (ya instalado - v10.0.3)
  - [x] `passport` ✅ (ya instalado - v0.7.0)
  - [x] `passport-jwt` ✅ (ya instalado - v4.0.1)
  - [x] `@types/passport-jwt` ✅ (ya instalado - v4.0.1)
  - [x] `@nestjs/jwt` ✅ (ya instalado - v10.2.0)
- [x] Verificar que todas las dependencias estén en `package.json`
- [x] Ejecutar `npm install` si es necesario (no necesario, ya instaladas)
- [x] Documentar dependencias en README

## Dependencias Requeridas
```json
{
  "@nestjs/passport": "^10.0.3",
  "@nestjs/jwt": "^10.2.0",
  "passport": "^0.7.0",
  "passport-jwt": "^4.0.1",
  "@types/passport-jwt": "^4.0.0"
}
```

## Criterios de Aceptación
- [x] Todas las dependencias instaladas
- [x] Versiones compatibles verificadas
- [x] Dependencias documentadas

## Notas
- Las dependencias ya están instaladas según package.json
- Solo verificar y documentar
```

**Labels:** `chore`, `auth`, `phase-2`

---

### Tarea 3: Implementar JWT strategy

**Título:** `feat(auth): implementar estrategia JWT para validar tokens de Keycloak`

**Descripción:**
```markdown
## Objetivo
Implementar la estrategia JWT de Passport para validar tokens emitidos por Keycloak.

## Tareas
- [x] Crear `src/modules/auth/strategies/jwt.strategy.ts`
- [x] Configurar extracción del token desde header `Authorization: Bearer <token>`
- [x] Configurar validación del token usando la clave pública de Keycloak
- [x] Obtener URL de Keycloak desde variables de entorno:
  - `KEYCLOAK_URL`
  - `KEYCLOAK_REALM`
- [x] Implementar método `validate()` que extrae información del usuario del token
- [x] Mapear claims del token JWT a objeto de usuario
- [x] Manejar errores de token inválido/expirado
- [x] Agregar tests unitarios

## Configuración Esperada
```typescript
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        // Obtener clave pública de Keycloak
        // ${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs
      },
      issuer: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
    });
  }

  async validate(payload: any) {
    return {
      id: payload.sub,
      username: payload.preferred_username,
      email: payload.email,
      roles: payload.realm_access?.roles || [],
    };
  }
}
```

## Criterios de Aceptación
- [x] Strategy valida tokens de Keycloak correctamente
- [x] Extrae información del usuario del token
- [x] Maneja errores de token inválido
- [x] Tests unitarios pasando

## Referencias
- [Passport JWT Strategy](http://www.passportjs.org/packages/passport-jwt/)
- [Keycloak Token Validation](https://www.keycloak.org/docs/latest/securing_apps/#_token_validation)
```

**Labels:** `enhancement`, `auth`, `phase-2`, `security`

---

### Tarea 4: Crear `JwtAuthGuard`

**Título:** `feat(auth): crear guard de autenticación JWT`

**Descripción:**
```markdown
## Objetivo
Crear un guard de autenticación que proteja endpoints usando la estrategia JWT.

## Tareas
- [x] Crear `src/modules/auth/guards/jwt-auth.guard.ts`
- [x] Extender `AuthGuard('jwt')` de `@nestjs/passport`
- [x] Configurar como guard global opcional (puede ser sobrescrito con `@Public()`)
- [x] Manejar errores de autenticación (401 Unauthorized)
- [x] Agregar tests unitarios

## Implementación Esperada
```typescript
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}
```

## Criterios de Aceptación
- [x] Guard protege endpoints correctamente
- [x] Retorna 401 para tokens inválidos
- [x] Permite acceso con token válido
- [x] Tests unitarios pasando

## Referencias
- [NestJS Guards](https://docs.nestjs.com/guards)
```

**Labels:** `enhancement`, `auth`, `phase-2`, `security`

---

### Tarea 5: Crear decorador `@Public()`

**Título:** `feat(auth): crear decorador @Public() para endpoints públicos`

**Descripción:**
```markdown
## Objetivo
Crear un decorador que marque endpoints como públicos, excluyéndolos de la autenticación.

## Tareas
- [x] Crear `src/modules/auth/decorators/public.decorator.ts`
- [x] Usar `SetMetadata` para marcar endpoints como públicos
- [x] Actualizar `JwtAuthGuard` para verificar el metadata y permitir acceso público
- [ ] Aplicar decorador a endpoints públicos (health, metadata, etc.) - Pendiente para cuando se configure guard global
- [ ] Agregar tests - Pendiente (el decorador se prueba indirectamente en JwtAuthGuard tests)

## Implementación Esperada
```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

## Uso
```typescript
@Public()
@Get('health')
getHealth() {
  return { status: 'ok' };
}
```

## Criterios de Aceptación
- [ ] Decorador marca endpoints como públicos
- [ ] Guard permite acceso sin autenticación
- [ ] Endpoints protegidos siguen requiriendo autenticación
- [ ] Tests pasando

## Referencias
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
```

**Labels:** `enhancement`, `auth`, `phase-2`

---

### Tarea 6: Crear decorador `@CurrentUser()`

**Título:** `feat(auth): crear decorador @CurrentUser() para obtener usuario del request`

**Descripción:**
```markdown
## Objetivo
Crear un decorador que extraiga el usuario autenticado del request de forma limpia.

## Tareas
- [x] Crear `src/modules/auth/decorators/current-user.decorator.ts`
- [x] Usar `createParamDecorator` para extraer usuario del request
- [x] Retornar objeto de usuario con información del token JWT
- [x] Manejar caso cuando no hay usuario (lanzar UnauthorizedException)
- [ ] Agregar tests - Pendiente (el decorador se prueba indirectamente cuando se use en controllers)

## Implementación Esperada
```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

## Uso
```typescript
@Get('profile')
getProfile(@CurrentUser() user: any) {
  return user;
}
```

## Criterios de Aceptación
- [x] Decorador extrae usuario del request
- [x] Funciona correctamente en endpoints protegidos
- [x] Soporte para extraer propiedades específicas del usuario
- [ ] Tests pasando - Pendiente (se probará indirectamente en controllers)

## Referencias
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
```

**Labels:** `enhancement`, `auth`, `phase-2`

---

### Tarea 7: Implementar `AuthController`

**Título:** `feat(auth): crear controlador de autenticación con estructura base`

**Descripción:**
```markdown
## Objetivo
Crear el controlador de autenticación con la estructura base para los endpoints de auth.

## Tareas
- [ ] Crear `src/modules/auth/auth.controller.ts`
- [ ] Crear `src/modules/auth/auth.service.ts`
- [ ] Configurar rutas base `/auth`
- [ ] Agregar decoradores de Swagger
- [ ] Implementar estructura básica de métodos (sin lógica aún)
- [ ] Agregar tests básicos

## Estructura Esperada
```typescript
@Controller('auth')
@ApiTags('Authentication')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @Public()
  async login() {
    // TODO: Implementar
  }

  @Get('callback')
  @Public()
  async callback() {
    // TODO: Implementar
  }

  @Post('refresh')
  @Public()
  async refresh() {
    // TODO: Implementar
  }

  @Post('logout')
  async logout() {
    // TODO: Implementar
  }

  @Get('user')
  @ApiBearerAuth()
  async getUser(@CurrentUser() user: any) {
    // TODO: Implementar
  }
}
```

## Criterios de Aceptación
- [ ] Controller creado con estructura base
- [ ] Rutas configuradas correctamente
- [ ] Swagger documentado
- [ ] Tests básicos pasando

## Referencias
- [NestJS Controllers](https://docs.nestjs.com/controllers)
```

**Labels:** `enhancement`, `auth`, `phase-2`

---

### Tarea 8: Implementar endpoint `/auth/login`

**Título:** `feat(auth): implementar endpoint de login que redirige a Keycloak`

**Descripción:**
```markdown
## Objetivo
Implementar el endpoint de login que inicia el flujo OAuth2 redirigiendo al usuario a Keycloak.

## Tareas
- [ ] Implementar método `login()` en `AuthController`
- [ ] Construir URL de autorización de Keycloak:
  - `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`
- [ ] Configurar parámetros OAuth2:
  - `client_id`: `KEYCLOAK_CLIENT_ID` (carecore-api)
  - `response_type`: `code`
  - `scope`: `openid profile email`
  - `redirect_uri`: `${API_URL}/api/auth/callback`
  - `state`: (generar token CSRF)
- [ ] Redirigir al usuario a Keycloak
- [ ] Manejar errores
- [ ] Agregar tests

## Implementación Esperada
```typescript
@Post('login')
@Public()
@ApiOperation({ summary: 'Iniciar sesión (redirige a Keycloak)' })
async login(@Res() res: Response) {
  const authUrl = this.authService.getAuthorizationUrl();
  return res.redirect(authUrl);
}
```

## Criterios de Aceptación
- [ ] Endpoint redirige a Keycloak correctamente
- [ ] Parámetros OAuth2 configurados correctamente
- [ ] State token generado para CSRF protection
- [ ] Tests pasando

## Referencias
- [OAuth2 Authorization Code Flow](https://oauth.net/2/grant-types/authorization-code/)
```

**Labels:** `enhancement`, `auth`, `phase-2`, `oauth2`

---

### Tarea 9: Implementar endpoint `/auth/callback`

**Título:** `feat(auth): implementar callback de Keycloak para obtener tokens`

**Descripción:**
```markdown
## Objetivo
Implementar el endpoint de callback que recibe el código de autorización de Keycloak y obtiene los tokens.

## Tareas
- [ ] Implementar método `callback()` en `AuthController`
- [ ] Validar parámetro `state` (CSRF protection)
- [ ] Extraer `code` del query parameter
- [ ] Intercambiar código por tokens:
  - Hacer POST a `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`
  - Parámetros:
    - `grant_type`: `authorization_code`
    - `code`: código recibido
    - `client_id`: `KEYCLOAK_CLIENT_ID`
    - `client_secret`: `KEYCLOAK_CLIENT_SECRET`
    - `redirect_uri`: `${API_URL}/api/auth/callback`
- [ ] Guardar tokens en cookies HTTP-only (o retornar en response)
- [ ] Redirigir al frontend con tokens
- [ ] Manejar errores (código inválido, etc.)
- [ ] Agregar tests

## Implementación Esperada
```typescript
@Get('callback')
@Public()
@ApiOperation({ summary: 'Callback de Keycloak OAuth2' })
async callback(
  @Query('code') code: string,
  @Query('state') state: string,
  @Res() res: Response,
) {
  // Validar state
  // Intercambiar código por tokens
  // Guardar tokens
  // Redirigir
}
```

## Criterios de Aceptación
- [ ] Callback recibe código correctamente
- [ ] Intercambia código por tokens
- [ ] Tokens guardados de forma segura
- [ ] Maneja errores correctamente
- [ ] Tests pasando

## Referencias
- [OAuth2 Token Exchange](https://oauth.net/2/grant-types/authorization-code/)
```

**Labels:** `enhancement`, `auth`, `phase-2`, `oauth2`

---

### Tarea 10: Implementar endpoint `/auth/refresh`

**Título:** `feat(auth): implementar refresh de tokens`

**Descripción:**
```markdown
## Objetivo
Implementar el endpoint que refresca el access token usando el refresh token.

## Tareas
- [ ] Implementar método `refresh()` en `AuthController`
- [ ] Extraer refresh token del request (cookie o body)
- [ ] Intercambiar refresh token por nuevo access token:
  - POST a `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`
  - Parámetros:
    - `grant_type`: `refresh_token`
    - `refresh_token`: token recibido
    - `client_id`: `KEYCLOAK_CLIENT_ID`
    - `client_secret`: `KEYCLOAK_CLIENT_SECRET`
- [ ] Retornar nuevos tokens
- [ ] Manejar errores (token expirado, inválido)
- [ ] Agregar tests

## Implementación Esperada
```typescript
@Post('refresh')
@Public()
@ApiOperation({ summary: 'Refrescar access token' })
async refresh(@Body() body: { refresh_token: string }) {
  const tokens = await this.authService.refreshToken(body.refresh_token);
  return tokens;
}
```

## Criterios de Aceptación
- [ ] Endpoint refresca tokens correctamente
- [ ] Maneja tokens expirados
- [ ] Retorna nuevos tokens
- [ ] Tests pasando

## Referencias
- [OAuth2 Refresh Token](https://oauth.net/2/grant-types/refresh-token/)
```

**Labels:** `enhancement`, `auth`, `phase-2`, `oauth2`

---

### Tarea 11: Implementar endpoint `/auth/logout`

**Título:** `feat(auth): implementar logout y revocación de tokens`

**Descripción:**
```markdown
## Objetivo
Implementar el endpoint de logout que revoca los tokens en Keycloak y limpia la sesión.

## Tareas
- [ ] Implementar método `logout()` en `AuthController`
- [ ] Extraer refresh token del request
- [ ] Revocar tokens en Keycloak:
  - POST a `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout`
  - Parámetros:
    - `client_id`: `KEYCLOAK_CLIENT_ID`
    - `client_secret`: `KEYCLOAK_CLIENT_SECRET`
    - `refresh_token`: token a revocar
- [ ] Limpiar cookies/tokens locales
- [ ] Retornar confirmación
- [ ] Manejar errores
- [ ] Agregar tests

## Implementación Esperada
```typescript
@Post('logout')
@ApiOperation({ summary: 'Cerrar sesión y revocar tokens' })
async logout(
  @CurrentUser() user: any,
  @Body() body: { refresh_token?: string },
) {
  await this.authService.logout(body.refresh_token);
  return { message: 'Logged out successfully' };
}
```

## Criterios de Aceptación
- [ ] Endpoint revoca tokens en Keycloak
- [ ] Limpia sesión local
- [ ] Maneja errores correctamente
- [ ] Tests pasando

## Referencias
- [Keycloak Logout](https://www.keycloak.org/docs/latest/securing_apps/#_logout_endpoint)
```

**Labels:** `enhancement`, `auth`, `phase-2`, `oauth2`

---

### Tarea 12: Implementar endpoint `/auth/user`

**Título:** `feat(auth): implementar endpoint para obtener información del usuario actual`

**Descripción:**
```markdown
## Objetivo
Implementar el endpoint que retorna la información del usuario autenticado desde el token JWT.

## Tareas
- [ ] Implementar método `getUser()` en `AuthController`
- [ ] Usar decorador `@CurrentUser()` para obtener usuario del request
- [ ] Retornar información del usuario (id, username, email, roles)
- [ ] Agregar documentación Swagger
- [ ] Agregar tests

## Implementación Esperada
```typescript
@Get('user')
@ApiBearerAuth()
@ApiOperation({ summary: 'Obtener información del usuario actual' })
async getUser(@CurrentUser() user: any) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
  };
}
```

## Criterios de Aceptación
- [ ] Endpoint retorna información del usuario
- [ ] Requiere autenticación
- [ ] Documentado en Swagger
- [ ] Tests pasando

## Referencias
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
```

**Labels:** `enhancement`, `auth`, `phase-2`

---

### Tarea 13: Integrar con Swagger

**Título:** `feat(auth): integrar autenticación con Swagger/OpenAPI`

**Descripción:**
```markdown
## Objetivo
Configurar Swagger para que los usuarios puedan autenticarse y probar endpoints protegidos desde la UI.

## Tareas
- [ ] Configurar `@ApiBearerAuth()` en endpoints protegidos
- [ ] Agregar configuración de seguridad en `main.ts`:
  ```typescript
  const config = new DocumentBuilder()
    .addBearerAuth()
    .build();
  ```
- [ ] Configurar botón de autenticación en Swagger UI
- [ ] Documentar cómo usar autenticación en Swagger
- [ ] Agregar ejemplos de requests

## Configuración Esperada
```typescript
const config = new DocumentBuilder()
  .setTitle('CareCore API')
  .setDescription('API de historial médico digital con FHIR')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'JWT',
      description: 'Enter JWT token',
      in: 'header',
    },
    'JWT-auth',
  )
  .build();
```

## Criterios de Aceptación
- [ ] Swagger muestra botón de autenticación
- [ ] Usuarios pueden ingresar token JWT
- [ ] Endpoints protegidos funcionan desde Swagger
- [ ] Documentación clara

## Referencias
- [NestJS Swagger](https://docs.nestjs.com/openapi/introduction)
```

**Labels:** `enhancement`, `auth`, `phase-2`, `documentation`

---

### Tarea 14: Crear `RolesGuard`

**Título:** `feat(auth): crear guard para validar roles de usuario`

**Descripción:**
```markdown
## Objetivo
Crear un guard que valide que el usuario tenga los roles necesarios para acceder a un endpoint.

## Tareas
- [ ] Crear `src/modules/auth/guards/roles.guard.ts`
- [ ] Implementar `CanActivate` interface
- [ ] Extraer roles requeridos del metadata (decorador `@Roles()`)
- [ ] Extraer roles del usuario del request
- [ ] Validar que el usuario tenga al menos uno de los roles requeridos
- [ ] Lanzar `ForbiddenException` si no tiene permisos
- [ ] Agregar tests

## Implementación Esperada
```typescript
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
```

## Criterios de Aceptación
- [ ] Guard valida roles correctamente
- [ ] Retorna 403 Forbidden si no tiene permisos
- [ ] Permite acceso si tiene rol requerido
- [ ] Tests pasando

## Referencias
- [NestJS Guards](https://docs.nestjs.com/guards)
```

**Labels:** `enhancement`, `auth`, `phase-2`, `security`

---

### Tarea 15: Crear decorador `@Roles()`

**Título:** `feat(auth): crear decorador @Roles() para proteger endpoints por roles`

**Descripción:**
```markdown
## Objetivo
Crear un decorador que defina qué roles pueden acceder a un endpoint.

## Tareas
- [ ] Crear `src/modules/auth/decorators/roles.decorator.ts`
- [ ] Usar `SetMetadata` para almacenar roles requeridos
- [ ] Aplicar decorador junto con `RolesGuard`
- [ ] Documentar uso
- [ ] Agregar tests

## Implementación Esperada
```typescript
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

## Uso
```typescript
@Get('admin')
@Roles('admin')
async adminEndpoint() {
  return { message: 'Admin only' };
}

@Get('practitioner')
@Roles('practitioner', 'admin')
async practitionerEndpoint() {
  return { message: 'Practitioner or admin' };
}
```

## Criterios de Aceptación
- [ ] Decorador define roles requeridos
- [ ] Funciona con `RolesGuard`
- [ ] Tests pasando

## Referencias
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)
```

**Labels:** `enhancement`, `auth`, `phase-2`, `security`

---

### Tarea 16: Mapear roles de Keycloak

**Título:** `feat(auth): mapear roles de Keycloak a la aplicación`

**Descripción:**
```markdown
## Objetivo
Asegurar que los roles definidos en Keycloak se mapeen correctamente a la aplicación y estén disponibles en el token JWT.

## Tareas
- [ ] Verificar que roles de Keycloak estén en el token JWT:
  - `patient`
  - `practitioner`
  - `viewer`
  - `lab`
  - `insurer`
  - `system`
  - `admin`
  - `audit`
- [ ] Configurar mapeo en `JwtStrategy.validate()`:
  - Extraer roles de `payload.realm_access.roles`
  - Mapear a objeto de usuario
- [ ] Crear constantes de roles en la aplicación:
  - `src/common/constants/roles.ts`
- [ ] Documentar mapeo de roles
- [ ] Agregar tests

## Implementación Esperada
```typescript
// src/common/constants/roles.ts
export const ROLES = {
  PATIENT: 'patient',
  PRACTITIONER: 'practitioner',
  VIEWER: 'viewer',
  LAB: 'lab',
  INSURER: 'insurer',
  SYSTEM: 'system',
  ADMIN: 'admin',
  AUDIT: 'audit',
} as const;

// En JwtStrategy
async validate(payload: any) {
  return {
    id: payload.sub,
    username: payload.preferred_username,
    email: payload.email,
    roles: payload.realm_access?.roles || [],
  };
}
```

## Criterios de Aceptación
- [ ] Roles extraídos correctamente del token
- [ ] Roles disponibles en `@CurrentUser()`
- [ ] Constantes de roles definidas
- [ ] Documentación completa
- [ ] Tests pasando

## Referencias
- [Keycloak Token Claims](https://www.keycloak.org/docs/latest/securing_apps/#_token_claims)
```

**Labels:** `enhancement`, `auth`, `phase-2`, `security`

---

## 📊 Resumen de Tareas

| # | Tarea | Estimación | Prioridad | Labels |
|---|-------|------------|-----------|--------|
| 0 | Definir estructura de carpetas y tipos FHIR | 4-6 horas | Alta | `enhancement`, `fhir`, `phase-2`, `database` |
| 1 | Crear módulo `auth` | 1-2 horas | Alta | `enhancement`, `auth`, `phase-2` |
| 2 | Instalar dependencias Passport | 0.5 horas | Alta | `chore`, `auth`, `phase-2` |
| 3 | Implementar JWT strategy | 3-4 horas | Alta | `enhancement`, `auth`, `phase-2`, `security` |
| 4 | Crear `JwtAuthGuard` | 2-3 horas | Alta | `enhancement`, `auth`, `phase-2`, `security` |
| 5 | Crear decorador `@Public()` | 1-2 horas | Media | `enhancement`, `auth`, `phase-2` |
| 6 | Crear decorador `@CurrentUser()` | 1-2 horas | Media | `enhancement`, `auth`, `phase-2` |
| 7 | Implementar `AuthController` | 2-3 horas | Alta | `enhancement`, `auth`, `phase-2` |
| 8 | Implementar endpoint `/auth/login` | 2-3 horas | Alta | `enhancement`, `auth`, `phase-2`, `oauth2` |
| 9 | Implementar endpoint `/auth/callback` | 3-4 horas | Alta | `enhancement`, `auth`, `phase-2`, `oauth2` |
| 10 | Implementar endpoint `/auth/refresh` | 2-3 horas | Media | `enhancement`, `auth`, `phase-2`, `oauth2` |
| 11 | Implementar endpoint `/auth/logout` | 2-3 horas | Media | `enhancement`, `auth`, `phase-2`, `oauth2` |
| 12 | Implementar endpoint `/auth/user` | 1-2 horas | Media | `enhancement`, `auth`, `phase-2` |
| 13 | Integrar con Swagger | 2-3 horas | Media | `enhancement`, `auth`, `phase-2`, `documentation` |
| 14 | Crear `RolesGuard` | 2-3 horas | Alta | `enhancement`, `auth`, `phase-2`, `security` |
| 15 | Crear decorador `@Roles()` | 1-2 horas | Alta | `enhancement`, `auth`, `phase-2`, `security` |
| 16 | Mapear roles de Keycloak | 2-3 horas | Alta | `enhancement`, `auth`, `phase-2`, `security` |

**Tiempo Total Estimado:** 30-42 horas (4-6 días)

---

## 🚀 Cómo Usar Esta Lista

### Opción 1: Crear Issues Individuales
1. Copia cada tarea como un nuevo Issue en GitHub
2. Usa el título y descripción proporcionados
3. Agrega los labels sugeridos
4. Asigna a un milestone "Fase 2: Integración NestJS"

### Opción 2: Crear Issue Épico
1. Crea un issue principal "Fase 2: Integración NestJS"
2. Crea issues hijos para cada tarea
3. Usa GitHub Projects para organizar

### Opción 3: Usar GitHub Projects Directamente
1. Crea cards en GitHub Projects
2. Copia el título de cada tarea
3. Agrega la descripción en el body de la card
4. Usa los labels sugeridos

---

## 📝 Notas Importantes

### Orden de Implementación Recomendado

1. **Tarea 0** (Estructura FHIR) - Base para todo
2. **Tareas 1-2** (Módulo y dependencias) - Setup inicial
3. **Tareas 3-6** (Strategy, Guards, Decoradores) - Infraestructura de auth
4. **Tarea 7** (Controller base) - Estructura de endpoints
5. **Tareas 8-12** (Endpoints) - Funcionalidad principal
6. **Tareas 13-16** (Swagger, Roles) - Funcionalidades avanzadas

### Dependencias entre Tareas

- Tarea 0 debe completarse primero (base para todo)
- Tareas 3-6 son independientes y pueden hacerse en paralelo
- Tareas 8-12 dependen de las tareas 3-7
- Tareas 14-16 dependen de la tarea 3 (JWT strategy)

---

**Última actualización**: 2025-12-03
**Versión**: 1.0.0

