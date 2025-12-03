# 🔐 Plan de Implementación: Autenticación y Autorización

> Plan detallado paso a paso para implementar autenticación y autorización en CareCore API

---

## 🎯 Resumen Ejecutivo

### Decisión Recomendada: **Keycloak**

**Para MVP:**
- ✅ **Tiempo**: 12-18 días vs 25-44 días (ahorro de 2-3 semanas)
- ✅ **Costo**: $0 desarrollo, $20-50/mes producción
- ✅ **Arquitectura**: Misma infraestructura, bases de datos separadas, mismo repositorio
- ✅ **Riesgo**: Bajo (software probado y mantenido)
- ✅ **Funcionalidades**: Todas incluidas (OAuth2/OIDC, MFA, roles, SMART on FHIR)

### Arquitectura MVP

```
┌─────────────────────────────────────────┐
│    Docker Compose (Mismo Servidor)      │
│  ┌──────────────┐  ┌──────────────┐   │
│  │  CareCore    │  │   Keycloak   │   │
│  │     API      │◄─┤   (IdP)      │   │
│  │  Port: 3000  │  │  Port: 8080  │   │
│  └──────┬───────┘  └──────┬───────┘   │
│         └────────┬─────────┘            │
│         ┌────────▼─────────┐            │
│         │   PostgreSQL     │            │
│         │  - carecore_db   │            │
│         │  - keycloak_db   │            │
│         └──────────────────┘           │
└─────────────────────────────────────────┘
```

**Respuestas a tus preguntas:**
1. **¿Infraestructura diferente?** ❌ NO para MVP - Mismo servidor/container host
2. **¿Bases de datos independientes?** ✅ SÍ - Bases separadas (`carecore_db` y `keycloak_db`), mismo servidor PostgreSQL
3. **¿Repositorios distintos?** ❌ NO para MVP - Mismo repositorio, más simple

---

## 📋 Tabla de Contenidos

1. [Análisis de Opciones](#1-análisis-de-opciones)
2. [Requisitos del Proyecto](#2-requisitos-del-proyecto)
3. [Decisión Recomendada](#3-decisión-recomendada)
4. [Plan de Implementación](#4-plan-de-implementación)
5. [Checklist de Tareas](#5-checklist-de-tareas)

---

## 1. Arquitectura para MVP

### 1.1 Infraestructura y Despliegue

**Para MVP (Desarrollo y Producción inicial):**

✅ **Misma infraestructura (recomendado para MVP)**
- API y Keycloak en el mismo servidor/container host
- Mismo `docker-compose.yml` (más simple, menor costo)
- Misma red Docker (`carecore-network`)
- **Ventaja**: Setup simple, costo mínimo, fácil de mantener

⚠️ **Infraestructura separada (solo cuando escale)**
- API y Keycloak en servidores diferentes
- Solo necesario cuando:
  - Alto tráfico (miles de usuarios concurrentes)
  - Requisitos de alta disponibilidad
  - Separación por seguridad/regulación
- **Ventaja**: Aislamiento, escalado independiente
- **Desventaja**: Mayor complejidad y costo

### 1.2 Bases de Datos

**Para MVP:**

✅ **Bases de datos separadas, mismo servidor PostgreSQL (recomendado)**
- `carecore_db` - Base de datos de la API (Patient, Practitioner, Encounter, etc.)
- `keycloak_db` - Base de datos de Keycloak (usuarios, roles, tokens, etc.)
- Mismo servidor PostgreSQL, diferentes bases de datos
- **Ventaja**: Aislamiento de datos, fácil backup/restore, mismo servidor = menor costo

⚠️ **Bases de datos en servidores diferentes**
- Solo necesario para:
  - Alto volumen de datos
  - Requisitos de seguridad específicos
  - Escalado independiente
- **Desventaja**: Mayor costo y complejidad

### 1.3 Repositorios

**Para MVP:**

✅ **Mismo repositorio (recomendado)**
- Todo el código en `carecore-api`
- Keycloak como servicio en `docker-compose.yml`
- Configuración de Keycloak en el mismo repo
- **Ventaja**: Desarrollo más simple, cambios coordinados, menos overhead

⚠️ **Repositorios separados**
- Solo necesario si:
  - Equipos diferentes trabajan en cada parte
  - Diferentes ciclos de release
  - Keycloak se usa en múltiples proyectos
- **Desventaja**: Más complejidad de gestión

---

## 2. Análisis Comparativo Detallado: Keycloak vs IdP Propio

### Tabla Comparativa Completa

| Aspecto | Keycloak | IdP Propio (NestJS) | Ganador MVP |
|---------|----------|---------------------|-------------|
| **💰 Costo Inicial** |
| Software | Gratis (open source) | Gratis | Empate |
| Desarrollo | 0 horas (ya existe) | 80-120 horas | ✅ Keycloak |
| Infraestructura MVP | $0-20/mes (mismo servidor) | $0-20/mes (mismo servidor) | Empate |
| Infraestructura Producción | $50-200/mes (servidor dedicado) | $30-100/mes (servidor dedicado) | ✅ IdP Propio |
| **⏱️ Tiempo de Implementación** |
| Setup inicial | 1-2 días | 0 días (ya en proyecto) | ✅ IdP Propio |
| Configuración básica | 2-3 días | 5-7 días | ✅ Keycloak |
| OAuth2/OIDC completo | 3-5 días | 10-15 días | ✅ Keycloak |
| MFA | 1 día (configuración) | 5-7 días (desarrollo) | ✅ Keycloak |
| Roles y permisos | 2-3 días | 3-5 días | ✅ Keycloak |
| SMART on FHIR | 3-5 días | 7-10 días | ✅ Keycloak |
| **TOTAL MVP** | **12-18 días** | **25-44 días** | ✅ **Keycloak** |
| **🔧 Complejidad Técnica** |
| Curva de aprendizaje | Media (documentación extensa) | Baja (ya conoces NestJS) | ✅ IdP Propio |
| Mantenimiento | Medio (actualizaciones Keycloak) | Alto (todo el código propio) | ✅ Keycloak |
| Debugging | Medio (logs de Keycloak) | Bajo (tu código) | ✅ IdP Propio |
| Personalización | Alta (pero requiere conocimiento) | Total (tu código) | ✅ IdP Propio |
| **🔒 Seguridad** |
| Auditoría de seguridad | ✅ Comunidad activa, parches rápidos | ❌ Tu responsabilidad | ✅ Keycloak |
| Vulnerabilidades conocidas | ✅ Documentadas y parcheadas | ❌ Debes descubrirlas | ✅ Keycloak |
| Cumplimiento (HIPAA/GDPR) | ✅ Certificaciones disponibles | ⚠️ Debes implementar | ✅ Keycloak |
| MFA | ✅ Integrado (TOTP, SMS, etc.) | ❌ Debes implementar | ✅ Keycloak |
| Social logins | ✅ Integrado (Google, Facebook, etc.) | ❌ Debes implementar | ✅ Keycloak |
| **📈 Escalabilidad** |
| Usuarios concurrentes | ✅ Probado (miles) | ⚠️ Debes probar | ✅ Keycloak |
| Escalado horizontal | ✅ Soporte nativo | ⚠️ Debes implementar | ✅ Keycloak |
| Performance | ✅ Optimizado | ⚠️ Depende de tu código | ✅ Keycloak |
| **🎯 Funcionalidades MVP** |
| OAuth2/OIDC | ✅ Completo | ❌ Debes implementar | ✅ Keycloak |
| Roles y grupos | ✅ Avanzado | ⚠️ Básico (debes extender) | ✅ Keycloak |
| Scopes granulares | ✅ Completo | ⚠️ Debes implementar | ✅ Keycloak |
| Refresh tokens | ✅ Integrado | ⚠️ Debes implementar | ✅ Keycloak |
| Revocación de tokens | ✅ Integrado | ⚠️ Debes implementar | ✅ Keycloak |
| Admin UI | ✅ Completa | ❌ Debes construir | ✅ Keycloak |
| **🔌 Integración** |
| SMART on FHIR | ✅ Soporte nativo | ⚠️ Debes implementar | ✅ Keycloak |
| NestJS | ✅ SDK disponible | ✅ Nativo | Empate |
| PostgreSQL | ✅ Soporte nativo | ✅ Ya lo usas | Empate |
| **📊 Resumen MVP** |
| **Tiempo total** | 12-18 días | 25-44 días | ✅ **Keycloak** |
| **Costo total MVP** | $0-20/mes | $0-20/mes + tiempo dev | ✅ **Keycloak** |
| **Riesgo técnico** | Bajo | Medio-Alto | ✅ **Keycloak** |
| **Recomendación MVP** | ✅ **RECOMENDADO** | ⚠️ Solo si tienes tiempo | ✅ **Keycloak** |

### Análisis Detallado por Categoría

#### 💰 Costo Total de Propiedad (TCO) - Primer Año

**Keycloak:**
- Desarrollo: 0 horas (ya existe)
- Setup y configuración: 12-18 días de desarrollo
- Infraestructura MVP: $0-20/mes (mismo servidor que API)
- Infraestructura producción: $50-200/mes (servidor dedicado)
- Mantenimiento: 2-4 horas/mes (actualizaciones)
- **TOTAL primer año**: ~$600-2,400 + 12-18 días desarrollo

**IdP Propio:**
- Desarrollo: 25-44 días de desarrollo
- Setup: 0 días (ya en proyecto)
- Infraestructura MVP: $0-20/mes (mismo servidor)
- Infraestructura producción: $30-100/mes
- Mantenimiento: 8-12 horas/mes (seguridad, features, bugs)
- **TOTAL primer año**: ~$360-1,200 + 25-44 días desarrollo + mantenimiento continuo

**Ganador MVP**: ✅ **Keycloak** (menos tiempo de desarrollo, menos mantenimiento)

---

#### ⏱️ Tiempo de Lanzamiento al Mercado

**Keycloak:**
- MVP funcional: 2-3 semanas
- Producción lista: 3-4 semanas

**IdP Propio:**
- MVP funcional: 5-6 semanas
- Producción lista: 8-10 semanas

**Ganador MVP**: ✅ **Keycloak** (lanzamiento 2-3x más rápido)

---

#### 🔒 Seguridad y Cumplimiento

**Keycloak:**
- ✅ Parches de seguridad regulares
- ✅ Comunidad activa reportando vulnerabilidades
- ✅ Certificaciones disponibles (FIPS, Common Criteria)
- ✅ MFA integrado y probado
- ✅ Best practices implementadas

**IdP Propio:**
- ⚠️ Debes implementar todas las medidas de seguridad
- ⚠️ Debes mantenerte actualizado con vulnerabilidades
- ⚠️ Debes probar y auditar tu código
- ⚠️ Mayor riesgo de errores de seguridad

**Ganador MVP**: ✅ **Keycloak** (seguridad probada y mantenida)

---

#### 🎯 Funcionalidades para MVP

**Requisitos MVP:**
- [x] OAuth2/OIDC
- [x] Roles básicos (patient, practitioner, admin)
- [x] JWT tokens
- [x] Refresh tokens
- [x] Login/logout
- [ ] MFA (opcional para MVP)
- [ ] Social logins (opcional para MVP)
- [ ] SMART on FHIR (Fase 2)

**Keycloak:**
- ✅ Todas las funcionalidades MVP incluidas
- ✅ MFA disponible si se necesita
- ✅ Social logins disponibles si se necesita
- ✅ SMART on FHIR soportado

**IdP Propio:**
- ⚠️ Debes implementar cada funcionalidad
- ⚠️ MFA requiere desarrollo adicional
- ⚠️ Social logins requieren integraciones
- ⚠️ SMART on FHIR requiere desarrollo completo

**Ganador MVP**: ✅ **Keycloak** (funcionalidades listas para usar)

---

## 3. Recomendación Final para MVP

### 🎯 Decisión: **Keycloak**

**Justificación para MVP:**

1. **Tiempo**: 2-3 semanas vs 5-6 semanas (ahorro de 3 semanas)
2. **Costo**: Mismo costo de infraestructura, menos tiempo de desarrollo
3. **Riesgo**: Menor riesgo técnico y de seguridad
4. **Funcionalidades**: Todas las necesarias para MVP incluidas
5. **Escalabilidad**: Listo para crecer sin reescribir

**Arquitectura Recomendada para MVP:**

```
┌─────────────────────────────────────────┐
│         Docker Compose (Local)         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │  CareCore    │  │   Keycloak   │   │
│  │     API      │  │   (IdP)      │   │
│  │  (NestJS)    │  │              │   │
│  │  Port: 3000  │  │  Port: 8080  │   │
│  └──────┬───────┘  └──────┬───────┘   │
│         │                 │            │
│         └────────┬─────────┘            │
│                  │                      │
│         ┌────────▼─────────┐            │
│         │   PostgreSQL     │            │
│         │  Port: 5432      │            │
│         │                  │            │
│         │  - carecore_db   │            │
│         │  - keycloak_db   │            │
│         └──────────────────┘           │
└─────────────────────────────────────────┘
```

**Configuración:**
- ✅ Mismo `docker-compose.yml`
- ✅ Misma red Docker
- ✅ Mismo servidor PostgreSQL (bases de datos separadas)
- ✅ Mismo repositorio
- ✅ Costo: $0 en desarrollo, $50-200/mes en producción

---

### ⚠️ Cuándo Considerar IdP Propio

Solo considera IdP propio si:
- ✅ Tienes 6+ semanas disponibles para desarrollo
- ✅ Tienes experiencia en seguridad de autenticación
- ✅ Requisitos muy específicos que Keycloak no puede cumplir
- ✅ Presupuesto limitado para infraestructura pero tiempo ilimitado
- ✅ Necesitas control total sobre cada línea de código

**Para MVP, esto NO es recomendable.**

---

## 2. Arquitectura de Infraestructura para MVP

### 2.1 Infraestructura: ¿Separada o Junta?

**✅ RECOMENDADO PARA MVP: Misma Infraestructura**

```
┌─────────────────────────────────────────────────┐
│         Servidor/Container Host                  │
│  (Puede ser: Local, VPS, Cloud Instance)       │
│                                                 │
│  ┌──────────────────────────────────────────┐  │
│  │      Docker Compose (docker-compose.yml)  │  │
│  │                                           │  │
│  │  ┌──────────────┐    ┌──────────────┐   │  │
│  │  │  CareCore    │    │   Keycloak   │   │  │
│  │  │     API      │    │   (IdP)      │   │  │
│  │  │  (NestJS)    │◄───┤              │   │  │
│  │  │  Port: 3000  │    │  Port: 8080  │   │  │
│  │  └──────┬───────┘    └──────┬───────┘   │  │
│  │         │                   │            │  │
│  │         └─────────┬──────────┘            │  │
│  │                   │                      │  │
│  │         ┌─────────▼──────────┐            │  │
│  │         │   PostgreSQL       │            │  │
│  │         │   Port: 5432       │            │  │
│  │         │                    │            │  │
│  │         │  - carecore_db     │            │  │
│  │         │  - keycloak_db     │            │  │
│  │         └────────────────────┘            │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Ventajas:**
- ✅ Setup simple (un solo `docker-compose up`)
- ✅ Costo mínimo (un solo servidor)
- ✅ Fácil de mantener y debuggear
- ✅ Comunicación local (más rápida)
- ✅ Ideal para MVP (hasta ~1000 usuarios concurrentes)

**Cuándo separar:**
- ⚠️ Alto tráfico (>1000 usuarios concurrentes)
- ⚠️ Requisitos de alta disponibilidad
- ⚠️ Separación por regulación/seguridad
- ⚠️ Escalado independiente necesario

---

### 2.2 Bases de Datos: ¿Separadas o Compartidas?

**✅ RECOMENDADO PARA MVP: Bases Separadas, Mismo Servidor**

```
PostgreSQL (mismo servidor, puerto 5432)
├── carecore_db          (Base de datos de la API)
│   ├── patients
│   ├── practitioners
│   ├── encounters
│   ├── consents
│   └── ...
│
└── keycloak_db          (Base de datos de Keycloak)
    ├── users
    ├── roles
    ├── clients
    ├── tokens
    └── ...
```

**Configuración en docker-compose.yml:**
```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}  # carecore_db
    # Keycloak creará su propia base de datos

  keycloak:
    image: quay.io/keycloak/keycloak:latest
    environment:
      DB_VENDOR: postgres
      DB_ADDR: postgres
      DB_DATABASE: keycloak_db  # Base separada
      DB_USER: ${DB_USER}
      DB_PASSWORD: ${DB_PASSWORD}
    depends_on:
      - postgres
```

**Ventajas:**
- ✅ Aislamiento de datos (seguridad)
- ✅ Backup/restore independiente
- ✅ Mismo servidor = menor costo
- ✅ Fácil migración futura si es necesario
- ✅ Performance adecuada para MVP

**Cuándo usar servidores diferentes:**
- ⚠️ Alto volumen de datos (>100GB)
- ⚠️ Requisitos de performance específicos
- ⚠️ Separación por regulación
- ⚠️ Escalado independiente necesario

---

### 2.3 Repositorios: ¿Separados o Juntos?

**✅ RECOMENDADO PARA MVP: Mismo Repositorio**

```
carecore-api/
├── src/                    # Código de la API
│   ├── modules/
│   │   └── auth/          # Módulo de autenticación
│   └── ...
├── docker-compose.yml      # Incluye Keycloak
├── keycloak/               # Configuración de Keycloak
│   ├── realms/            # Export de realms
│   ├── themes/            # Temas personalizados (opcional)
│   └── init/              # Scripts de inicialización
├── .env.development.example
└── README.md
```

**Ventajas:**
- ✅ Cambios coordinados (API + Auth juntos)
- ✅ Setup simple (un solo `git clone`)
- ✅ Menos overhead de gestión
- ✅ Fácil de mantener para equipo pequeño
- ✅ Versionado coordinado

**Cuándo separar:**
- ⚠️ Equipos diferentes trabajan en cada parte
- ⚠️ Diferentes ciclos de release
- ⚠️ Keycloak se usa en múltiples proyectos
- ⚠️ Políticas de seguridad requieren separación

---

### 2.4 Costo Estimado por Configuración

| Configuración | Desarrollo | Producción MVP | Producción Escalada |
|---------------|------------|----------------|---------------------|
| **Misma infraestructura** | $0 (local) | $20-50/mes | $100-200/mes |
| **Bases separadas, mismo servidor** | $0 (local) | $20-50/mes | $100-200/mes |
| **Mismo repositorio** | $0 | $0 | $0 |
| **TOTAL MVP** | **$0** | **$20-50/mes** | **$100-200/mes** |

**Desglose de costos producción:**
- VPS básico (2 CPU, 4GB RAM): $10-20/mes
- VPS medio (4 CPU, 8GB RAM): $30-50/mes
- Cloud instance (AWS/GCP): $50-100/mes
- Base de datos managed (opcional): +$20-50/mes

**Recomendación MVP:**
- Desarrollo: Local (Docker) = $0
- Producción inicial: VPS básico = $10-20/mes
- Producción escalada: VPS medio = $30-50/mes

---

## 3. Requisitos del Proyecto

### 2.1 Requisitos Funcionales

- ✅ OAuth2/OIDC para SMART on FHIR
- ✅ Roles: `patient`, `practitioner`, `viewer`, `lab/insurer/system`, `admin/audit`
- ✅ Verificación de identidad para practitioners (cédula/licencia)
- ✅ MFA (Multi-Factor Authentication)
- ✅ Gestión de consentimientos (FHIR Consent)
- ✅ Scopes granulares para acceso a recursos
- ✅ Refresh tokens
- ✅ Revocación de tokens

### 2.2 Requisitos No Funcionales

- ✅ Cumplimiento HIPAA/GDPR
- ✅ Alta disponibilidad
- ✅ Escalabilidad
- ✅ Seguridad robusta
- ✅ Audit logging
- ✅ Integración con PostgreSQL existente

### 2.3 Contexto del Proyecto

- ✅ Backend NestJS ya establecido
- ✅ PostgreSQL como base de datos
- ✅ Docker para desarrollo
- ✅ Presupuesto: considerar costo vs. tiempo de desarrollo
- ✅ Equipo: tamaño y experiencia

---

## 3. Decisión Recomendada

### 🎯 Recomendación: **Keycloak**

**Justificación:**

1. **Control y Privacidad**: Datos de salud requieren control total sobre dónde se almacenan
2. **Costo**: Open source, solo costo de infraestructura
3. **Flexibilidad**: Personalización completa para requisitos específicos (verificación de cédula)
4. **SMART on FHIR**: Soporte nativo OAuth2/OIDC
5. **Escalabilidad**: Puede crecer con el proyecto
6. **Comunidad**: Activa y bien mantenida

**Alternativa si se necesita velocidad inicial:**
- Empezar con Auth0 para MVP
- Migrar a Keycloak cuando se necesite más control

---

## 4. Plan de Implementación

### Fase 1: Setup y Configuración Inicial (Semana 1)

#### 1.1 Instalación de Keycloak

**Tareas:**
- [ ] Agregar Keycloak a `docker-compose.yml`
- [ ] Configurar variables de entorno para Keycloak
- [ ] Crear script de inicialización
- [ ] Documentar acceso y credenciales

**Entregables:**
- Keycloak corriendo en Docker
- Admin console accesible
- Documentación de setup

**Criterios de aceptación:**
- Keycloak accesible en `http://localhost:8080`
- Admin login funcional
- Base de datos de Keycloak persistente

---

#### 1.2 Configuración Básica de Keycloak

**Tareas:**
- [ ] Crear Realm para CareCore
- [ ] Configurar clientes (confidential, public)
- [ ] Configurar redirect URIs
- [ ] Configurar scopes básicos
- [ ] Configurar roles iniciales

**Entregables:**
- Realm "carecore" configurado
- Cliente "carecore-api" (confidential)
- Cliente "carecore-web" (public)
- Roles base definidos

**Criterios de aceptación:**
- Realm funcional
- Clientes creados y configurados
- Roles visibles en admin console

---

### Fase 2: Integración con NestJS (Semana 2)

#### 2.1 Módulo de Autenticación Base

**Tareas:**
- [ ] Crear módulo `auth` en NestJS
- [ ] Instalar dependencias: `passport`, `passport-jwt`, `@nestjs/passport`
- [ ] Configurar JWT strategy
- [ ] Crear guards básicos (`JwtAuthGuard`)
- [ ] Crear decorador `@Public()` para endpoints públicos
- [ ] Integrar con `ConfigModule` para variables de Keycloak

**Estructura:**
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

**Entregables:**
- Módulo auth funcional
- JWT strategy validando tokens de Keycloak
- Guards aplicables a endpoints

**Criterios de aceptación:**
- Token de Keycloak validado correctamente
- Guard protege endpoints
- Decorador `@Public()` funciona

---

#### 2.2 Endpoints de Autenticación

**Tareas:**
- [ ] Crear `AuthController` con endpoints:
  - `POST /auth/login` - Login (redirige a Keycloak)
  - `GET /auth/callback` - Callback de Keycloak
  - `POST /auth/refresh` - Refresh token
  - `POST /auth/logout` - Logout
  - `GET /auth/user` - Información del usuario actual
- [ ] Implementar flujo OAuth2 Authorization Code
- [ ] Manejar tokens (access + refresh)
- [ ] Integrar con Swagger (autenticación)

**Entregables:**
- Endpoints de auth funcionales
- Flujo OAuth2 completo
- Swagger con autenticación

**Criterios de aceptación:**
- Login redirige a Keycloak
- Callback recibe código y obtiene tokens
- Refresh token funciona
- Logout revoca tokens

---

#### 2.3 Sistema de Roles y Permisos

**Tareas:**
- [ ] Definir roles en Keycloak:
  - `patient`
  - `practitioner`
  - `viewer`
  - `lab`
  - `insurer`
  - `system`
  - `admin`
  - `audit`
- [ ] Crear `RolesGuard` que valida roles del token
- [ ] Crear decorador `@Roles()` para endpoints
- [ ] Mapear roles de Keycloak a aplicación
- [ ] Documentar permisos por rol

**Entregables:**
- Roles definidos en Keycloak
- Guard de roles funcional
- Decorador `@Roles()` aplicable

**Criterios de aceptación:**
- Roles extraídos del token JWT
- Guard valida roles correctamente
- Endpoints protegidos por rol

---

### Fase 3: Funcionalidades Avanzadas (Semana 3)

#### 3.1 Verificación de Practitioners

**Tareas:**
- [ ] Crear endpoint `POST /auth/verify-practitioner`
- [ ] Crear entidad `PractitionerVerification` en base de datos
- [ ] Implementar upload de documentos (cédula/licencia)
- [ ] Crear flujo de revisión manual (admin)
- [ ] Actualizar rol en Keycloak cuando se verifica
- [ ] Notificaciones de estado de verificación

**Estructura DB:**
```sql
CREATE TABLE practitioner_verifications (
  id UUID PRIMARY KEY,
  practitioner_id UUID REFERENCES practitioners(id),
  license_number VARCHAR,
  document_url VARCHAR,
  status VARCHAR, -- pending, approved, rejected
  reviewed_by UUID,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

**Entregables:**
- Endpoint de verificación
- Flujo completo de verificación
- Integración con roles de Keycloak

**Criterios de aceptación:**
- Practitioners pueden subir documentos
- Admins pueden revisar y aprobar
- Rol se actualiza automáticamente

---

#### 3.2 MFA (Multi-Factor Authentication)

**Tareas:**
- [ ] Configurar MFA en Keycloak (TOTP)
- [ ] Crear endpoint `POST /auth/mfa/setup` - Setup MFA
- [ ] Crear endpoint `POST /auth/mfa/verify` - Verificar código
- [ ] Crear endpoint `POST /auth/mfa/disable` - Deshabilitar MFA
- [ ] UI para configuración de MFA
- [ ] Forzar MFA para roles críticos (admin, practitioner)

**Entregables:**
- MFA configurado en Keycloak
- Endpoints para gestión de MFA
- Política de MFA por rol

**Criterios de aceptación:**
- Usuarios pueden configurar MFA
- Login requiere código MFA cuando está habilitado
- Políticas de MFA funcionan

---

#### 3.3 Scopes y Permisos Granulares

**Tareas:**
- [ ] Definir scopes en Keycloak:
  - `patient:read`, `patient:write`
  - `practitioner:read`, `practitioner:write`
  - `encounter:read`, `encounter:write`
  - `document:read`, `document:write`
  - `consent:read`, `consent:write`
- [ ] Crear `ScopesGuard` que valida scopes
- [ ] Crear decorador `@Scopes()` para endpoints
- [ ] Mapear scopes a permisos de recursos FHIR
- [ ] Documentar scopes disponibles

**Entregables:**
- Scopes definidos en Keycloak
- Guard de scopes funcional
- Endpoints protegidos por scope

**Criterios de aceptación:**
- Scopes extraídos del token
- Guard valida scopes correctamente
- Acceso granular funciona

---

### Fase 4: Integración con FHIR y SMART on FHIR (Semana 4)

#### 4.1 SMART on FHIR Launch Sequence

**Tareas:**
- [ ] Implementar endpoint `GET /fhir/auth` - Authorization endpoint
- [ ] Implementar endpoint `POST /fhir/token` - Token endpoint
- [ ] Implementar endpoint `GET /fhir/authorize` - Launch endpoint
- [ ] Implementar flujo SMART on FHIR completo
- [ ] Actualizar CapabilityStatement con endpoints de auth
- [ ] Documentar flujo SMART on FHIR

**Entregables:**
- Endpoints SMART on FHIR funcionales
- Flujo completo de launch
- CapabilityStatement actualizado

**Criterios de aceptación:**
- Launch sequence funciona
- Tokens generados correctamente
- Integración con Keycloak completa

---

#### 4.2 Protección de Endpoints FHIR

**Tareas:**
- [ ] Aplicar guards a todos los endpoints FHIR
- [ ] Validar scopes en cada endpoint
- [ ] Validar roles según recurso
- [ ] Implementar filtrado por paciente (solo ver sus propios datos)
- [ ] Logging de accesos a recursos FHIR

**Entregables:**
- Todos los endpoints FHIR protegidos
- Validación de permisos funcional
- Audit logging de accesos

**Criterios de aceptación:**
- Endpoints requieren autenticación
- Permisos validados correctamente
- Logs de acceso generados

---

### Fase 5: Testing y Documentación (Semana 5)

#### 5.1 Tests

**Tareas:**
- [ ] Tests unitarios para módulo auth
- [ ] Tests unitarios para guards
- [ ] Tests unitarios para strategies
- [ ] Tests E2E para flujo de login
- [ ] Tests E2E para flujo OAuth2
- [ ] Tests E2E para verificación de practitioner
- [ ] Tests E2E para SMART on FHIR

**Entregables:**
- Suite completa de tests
- Cobertura > 80%

**Criterios de aceptación:**
- Todos los tests pasan
- Cobertura mínima alcanzada

---

#### 5.2 Documentación

**Tareas:**
- [ ] Documentar flujo de autenticación
- [ ] Documentar configuración de Keycloak
- [ ] Documentar roles y permisos
- [ ] Documentar scopes disponibles
- [ ] Documentar SMART on FHIR
- [ ] Actualizar README con sección de auth
- [ ] Crear guía de desarrollo para auth

**Entregables:**
- Documentación completa
- README actualizado
- Guías de desarrollo

**Criterios de aceptación:**
- Documentación clara y completa
- Ejemplos de uso incluidos

---

## 5. Checklist de Tareas

### Fase 1: Setup Keycloak

#### Tareas para GitHub Projects

**Formato para copiar/pegar en GitHub Projects:**

```
Fase 1.1: Agregar Keycloak a docker-compose.yml
- Agregar servicio keycloak en docker-compose.yml
- Configurar imagen: quay.io/keycloak/keycloak:latest
- Configurar puerto 8080
- Agregar dependencia de postgres
- Configurar red carecore-network
- Agregar volumen para persistencia de datos

Fase 1.2: Configurar variables de entorno para Keycloak
- Agregar KEYCLOAK_ADMIN a .env.development.example
- Agregar KEYCLOAK_ADMIN_PASSWORD a .env.development.example
- Agregar KEYCLOAK_URL a .env.development.example
- Agregar KEYCLOAK_REALM a .env.development.example
- Documentar variables en ENV_VARIABLES.md

Fase 1.3: Crear script de inicialización de Keycloak
- Crear carpeta keycloak/init/
- Crear script para crear base de datos keycloak_db
- Crear script de inicialización de realm (opcional)
- Documentar proceso de inicialización

Fase 1.4: Crear Realm "carecore" en Keycloak
- Acceder a admin console de Keycloak
- Crear nuevo realm "carecore"
- Configurar settings básicos del realm
- Configurar login settings
- Configurar email settings (opcional para MVP)
- Exportar configuración del realm

Fase 1.5: Configurar cliente "carecore-api" en Keycloak
- Crear cliente "carecore-api" tipo confidential
- Configurar Client ID y Secret
- Configurar valid redirect URIs
- Configurar Web origins
- Configurar Access Token Settings
- Guardar credenciales de forma segura

Fase 1.6: Configurar cliente "carecore-web" en Keycloak
- Crear cliente "carecore-web" tipo public
- Configurar Client ID
- Configurar valid redirect URIs
- Configurar Web origins
- Configurar Access Token Settings

Fase 1.7: Definir roles base en Keycloak
- Crear rol "patient"
- Crear rol "practitioner"
- Crear rol "viewer"
- Crear rol "lab"
- Crear rol "insurer"
- Crear rol "system"
- Crear rol "admin"
- Crear rol "audit"
- Documentar permisos de cada rol

Fase 1.8: Documentar setup de Keycloak
- Crear sección en README sobre Keycloak
- Documentar acceso a admin console
- Documentar credenciales por defecto
- Crear guía de troubleshooting
- Documentar estructura de carpetas keycloak/
```

**Tareas detalladas con descripción:**

- [ ] **1.1** Agregar Keycloak a docker-compose.yml
- [ ] **1.2** Configurar variables de entorno
- [ ] **1.3** Crear script de inicialización
- [ ] **1.4** Crear Realm "carecore"
- [ ] **1.5** Configurar cliente "carecore-api"
- [ ] **1.6** Configurar cliente "carecore-web"
- [ ] **1.7** Definir roles base
- [ ] **1.8** Documentar setup

### Fase 2: Integración NestJS
- [ ] **2.1** Crear módulo `auth`
- [ ] **2.2** Instalar dependencias Passport
- [ ] **2.3** Implementar JWT strategy
- [ ] **2.4** Crear `JwtAuthGuard`
- [ ] **2.5** Crear decorador `@Public()`
- [ ] **2.6** Crear decorador `@CurrentUser()`
- [ ] **2.7** Implementar `AuthController`
- [ ] **2.8** Implementar endpoint `/auth/login`
- [ ] **2.9** Implementar endpoint `/auth/callback`
- [ ] **2.10** Implementar endpoint `/auth/refresh`
- [ ] **2.11** Implementar endpoint `/auth/logout`
- [ ] **2.12** Implementar endpoint `/auth/user`
- [ ] **2.13** Integrar con Swagger
- [ ] **2.14** Crear `RolesGuard`
- [ ] **2.15** Crear decorador `@Roles()`
- [ ] **2.16** Mapear roles de Keycloak

### Fase 3: Funcionalidades Avanzadas
- [ ] **3.1** Crear entidad `PractitionerVerification`
- [ ] **3.2** Implementar endpoint `/auth/verify-practitioner`
- [ ] **3.3** Implementar upload de documentos
- [ ] **3.4** Crear flujo de revisión manual
- [ ] **3.5** Integrar actualización de roles
- [ ] **3.6** Configurar MFA en Keycloak
- [ ] **3.7** Implementar endpoint `/auth/mfa/setup`
- [ ] **3.8** Implementar endpoint `/auth/mfa/verify`
- [ ] **3.9** Implementar endpoint `/auth/mfa/disable`
- [ ] **3.10** Definir scopes en Keycloak
- [ ] **3.11** Crear `ScopesGuard`
- [ ] **3.12** Crear decorador `@Scopes()`
- [ ] **3.13** Mapear scopes a permisos FHIR

### Fase 4: SMART on FHIR
- [ ] **4.1** Implementar endpoint `/fhir/auth`
- [ ] **4.2** Implementar endpoint `/fhir/token`
- [ ] **4.3** Implementar endpoint `/fhir/authorize`
- [ ] **4.4** Implementar launch sequence
- [ ] **4.5** Actualizar CapabilityStatement
- [ ] **4.6** Aplicar guards a endpoints FHIR
- [ ] **4.7** Validar scopes en endpoints
- [ ] **4.8** Implementar filtrado por paciente
- [ ] **4.9** Implementar audit logging

### Fase 5: Testing y Documentación
- [ ] **5.1** Tests unitarios módulo auth
- [ ] **5.2** Tests unitarios guards
- [ ] **5.3** Tests unitarios strategies
- [ ] **5.4** Tests E2E login
- [ ] **5.5** Tests E2E OAuth2
- [ ] **5.6** Tests E2E verificación
- [ ] **5.7** Tests E2E SMART on FHIR
- [ ] **5.8** Documentar flujo de autenticación
- [ ] **5.9** Documentar configuración Keycloak
- [ ] **5.10** Documentar roles y permisos
- [ ] **5.11** Documentar scopes
- [ ] **5.12** Documentar SMART on FHIR
- [ ] **5.13** Actualizar README

---

## 📊 Estimación de Tiempo

| Fase | Tareas | Tiempo Estimado |
|------|--------|-----------------|
| Fase 1: Setup Keycloak | 8 tareas | 3-5 días |
| Fase 2: Integración NestJS | 16 tareas | 5-7 días |
| Fase 3: Funcionalidades Avanzadas | 13 tareas | 5-7 días |
| Fase 4: SMART on FHIR | 9 tareas | 4-6 días |
| Fase 5: Testing y Documentación | 13 tareas | 4-6 días |
| **TOTAL** | **59 tareas** | **21-31 días** |

---

## 🚀 Próximos Pasos Inmediatos

1. **Revisar y aprobar este plan**
2. **Decidir definitivamente entre Keycloak/Auth0/IdP propio**
3. **Crear issue/ticket para Fase 1**
4. **Asignar recursos al proyecto**
5. **Comenzar con Fase 1: Setup Keycloak**

---

## 📚 Recursos y Referencias

- [Keycloak Documentation](https://www.keycloak.org/documentation)
- [NestJS Authentication](https://docs.nestjs.com/security/authentication)
- [SMART on FHIR](http://docs.smarthealthit.org/)
- [OAuth2 Specification](https://oauth.net/2/)
- [OpenID Connect](https://openid.net/connect/)

---

**Última actualización**: 2025-01-27
**Versión del plan**: 1.0.0

