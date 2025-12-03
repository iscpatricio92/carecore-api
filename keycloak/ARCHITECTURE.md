# Arquitectura de Keycloak en CareCore

Este documento describe la arquitectura de Keycloak en el proyecto CareCore.

## 🏗️ Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         CareCore API                             │
│                                                                   │
│  ┌──────────────┐         ┌──────────────┐                     │
│  │   Frontend   │         │  Backend     │                     │
│  │  (Web/Mobile)│         │  (NestJS)    │                     │
│  └──────┬───────┘         └──────┬───────┘                     │
│         │                        │                               │
│         │ OAuth2/OIDC            │ OAuth2/OIDC                  │
│         │ Authorization Code     │ Client Credentials           │
│         │ + PKCE                 │                               │
│         │                        │                               │
└─────────┼────────────────────────┼───────────────────────────────┘
          │                        │
          │                        │
          ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                         Keycloak                                │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Realm: "carecore"                     │  │
│  │                                                            │  │
│  │  ┌──────────────────┐    ┌──────────────────┐          │  │
│  │  │  Cliente:        │    │  Cliente:        │          │  │
│  │  │  carecore-web    │    │  carecore-api    │          │  │
│  │  │  (Public)        │    │  (Confidential)   │          │  │
│  │  │                  │    │                  │          │  │
│  │  │  - PKCE          │    │  - Client Secret │          │  │
│  │  │  - Standard Flow │    │  - Service Acct  │          │  │
│  │  └──────────────────┘    └──────────────────┘          │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │              Roles del Sistema                    │   │  │
│  │  │  - patient      - practitioner  - viewer         │   │  │
│  │  │  - lab         - insurer       - system         │   │  │
│  │  │  - admin       - audit                          │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │              Usuarios                             │   │  │
│  │  │  - Pacientes                                      │   │  │
│  │  │  - Practitioners (verificados)                    │   │  │
│  │  │  - Administradores                               │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                │ JDBC
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      PostgreSQL                                  │
│                                                                   │
│  ┌──────────────────┐    ┌──────────────────┐                 │
│  │  Base de Datos:   │    │  Base de Datos:   │                 │
│  │  carecore_db      │    │  keycloak_db      │                 │
│  │  (API Data)       │    │  (Keycloak Data)  │                 │
│  └──────────────────┘    └──────────────────┘                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Flujos de Autenticación

### Flujo 1: Frontend (Web/Mobile) - Authorization Code + PKCE

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│Frontend │         │Keycloak │         │ Backend │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │ 1. Redirect       │                   │
     │──────────────────>│                   │
     │                   │                   │
     │ 2. Login          │                   │
     │<─────────────────>│                   │
     │                   │                   │
     │ 3. Authorization  │                   │
     │    Code + PKCE    │                   │
     │<──────────────────│                   │
     │                   │                   │
     │ 4. Exchange Code  │                   │
     │    for Tokens     │                   │
     │──────────────────>│                   │
     │                   │                   │
     │ 5. Access Token   │                   │
     │    + Refresh Token│                   │
     │<──────────────────│                   │
     │                   │                   │
     │ 6. API Request    │                   │
     │    + Access Token │                   │
     │──────────────────────────────────────>│
     │                   │                   │
     │ 7. Validate Token │                   │
     │<──────────────────│                   │
     │                   │                   │
     │ 8. Response       │                   │
     │<──────────────────────────────────────│
```

### Flujo 2: Backend (NestJS) - Client Credentials

```
┌─────────┐         ┌─────────┐
│ Backend │         │Keycloak │
└────┬────┘         └────┬────┘
     │                   │
     │ 1. Client         │
     │    Credentials    │
     │    Request        │
     │──────────────────>│
     │                   │
     │ 2. Validate       │
     │    Client ID +    │
     │    Secret         │
     │<─────────────────>│
     │                   │
     │ 3. Access Token   │
     │    (Service Acct) │
     │<──────────────────│
     │                   │
     │ 4. Use Token for  │
     │    API Calls      │
     │──────────────────>│
```

## 🗂️ Componentes

### 1. Realm: "carecore"

El realm "carecore" es el contenedor principal de configuración:
- **Usuarios:** Pacientes, practitioners, administradores
- **Clientes:** carecore-api, carecore-web
- **Roles:** patient, practitioner, viewer, lab, insurer, system, admin, audit
- **Políticas:** Brute force protection, password policy, etc.

### 2. Cliente: "carecore-api"

**Tipo:** Confidential
- **Propósito:** Autenticación del backend NestJS
- **Grant Type:** Client Credentials
- **Service Account:** Habilitado
- **Client Secret:** Requerido (almacenado en `.env.local`)

**Uso:**
- Backend obtiene tokens para llamadas internas
- Validación de tokens de usuarios
- Gestión de usuarios y roles

### 3. Cliente: "carecore-web"

**Tipo:** Public
- **Propósito:** Autenticación del frontend (web/mobile)
- **Grant Type:** Authorization Code
- **PKCE:** Habilitado (S256)
- **Client Secret:** No requerido (cliente público)

**Uso:**
- Usuarios inician sesión desde frontend
- Obtienen tokens para acceder a la API
- Refresh tokens para renovar sesiones

### 4. Roles del Sistema

**Roles Base:**
- `patient` - Usuario paciente
- `practitioner` - Profesional médico
- `viewer` - Acceso temporal de solo lectura
- `lab` - Sistema de laboratorio
- `insurer` - Sistema de aseguradora
- `system` - Sistema externo
- `admin` - Administrador
- `audit` - Auditoría

**Jerarquía (Futuro):**
- Roles compuestos para simplificar gestión
- Roles anidados para permisos granulares

### 5. Base de Datos

**PostgreSQL:**
- **Base de datos:** `keycloak_db`
- **Almacena:**
  - Configuración de realms
  - Usuarios y credenciales (hasheadas)
  - Roles y permisos
  - Tokens y sesiones
  - Clientes y configuraciones

## 🔐 Seguridad

### Medidas Implementadas

1. **Brute Force Protection:**
   - Máximo 5 intentos fallidos
   - Bloqueo temporal progresivo

2. **Password Policy:**
   - Mínimo 8 caracteres
   - Requiere mayúsculas, minúsculas, números y caracteres especiales
   - No puede ser igual al username

3. **PKCE para Clientes Públicos:**
   - Protección contra ataques de interceptación
   - Code verifier y code challenge

4. **Client Secret para Clientes Confidenciales:**
   - Almacenado de forma segura en `.env.local`
   - No commitado al repositorio

5. **Tokens:**
   - Access tokens con vida corta (5-15 minutos)
   - Refresh tokens con vida larga (30 días)
   - Tokens revocables

### Mejores Prácticas

1. **Variables de Entorno:**
   - Todas las credenciales en `.env.local`
   - Nunca commitear secrets

2. **HTTPS en Producción:**
   - TLS 1.2+ requerido
   - Certificados válidos

3. **Rotación de Secrets:**
   - Rotar Client Secrets periódicamente
   - Rotar contraseñas de administrador

4. **Auditoría:**
   - Logs de todos los accesos
   - Logs de cambios de configuración
   - Monitoreo de intentos fallidos

## 📊 Integración con NestJS

### Flujo de Validación de Tokens

```
┌─────────┐         ┌─────────┐         ┌─────────┐
│ Client  │         │ NestJS  │         │Keycloak │
└────┬────┘         └────┬────┘         └────┬────┘
     │                   │                   │
     │ 1. Request        │                   │
     │    + JWT Token    │                   │
     │──────────────────>│                   │
     │                   │                   │
     │ 2. Validate JWT   │                   │
     │    (local)        │                   │
     │                   │                   │
     │ 3. If needed:     │                   │
     │    Verify with    │                   │
     │    Keycloak       │                   │
     │──────────────────────────────────────>│
     │                   │                   │
     │ 4. Token Info     │                   │
     │<──────────────────────────────────────│
     │                   │                   │
     │ 5. Extract Roles  │                   │
     │    from Token     │                   │
     │                   │                   │
     │ 6. Check Permissions                  │
     │                   │                   │
     │ 7. Response       │                   │
     │<──────────────────│                   │
```

### Componentes NestJS (Futuro)

1. **Auth Module:**
   - JWT Strategy
   - Guards (JwtAuthGuard, RolesGuard)
   - Decorators (@Public(), @Roles(), @CurrentUser())

2. **Endpoints:**
   - `/auth/login` - Redirige a Keycloak
   - `/auth/callback` - Callback de Keycloak
   - `/auth/refresh` - Refresh token
   - `/auth/logout` - Logout
   - `/auth/user` - Información del usuario

## 🚀 Escalabilidad

### Desarrollo (Actual)

- Keycloak en Docker Compose
- Base de datos compartida con API
- Configuración simple

### Producción (Futuro)

- Keycloak en Kubernetes
- Base de datos dedicada
- Alta disponibilidad
- Load balancing
- Replicación de base de datos

## 📚 Referencias

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [OAuth 2.0 Specification](https://oauth.net/2/)
- [OpenID Connect Specification](https://openid.net/connect/)
- [PKCE Specification](https://oauth.net/2/pkce/)
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)

