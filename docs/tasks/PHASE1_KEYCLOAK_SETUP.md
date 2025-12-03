# 📋 Tareas GitHub Projects - Fase 1: Setup Keycloak

> ⚠️ **ARCHIVO TEMPORAL**
> Este archivo contiene tareas detalladas para agregar en GitHub Projects.
> **Puede ser eliminado** una vez que:
> - Las tareas estén agregadas a GitHub Projects
> - Las tareas estén completadas
> - Ya no se necesite como referencia
>
> Para documentación permanente, ver: [AUTH_IMPLEMENTATION_PLAN.md](../AUTH_IMPLEMENTATION_PLAN.md)

---

## 🎯 Tareas Principales

### Tarea 1: Agregar Keycloak a docker-compose.yml

**Título:** `feat(auth): agregar servicio Keycloak a docker-compose.yml`

**Descripción:**
```markdown
## Objetivo
Agregar el servicio Keycloak al archivo docker-compose.yml para que corra junto con la API y PostgreSQL.

## Tareas
- [ ] Agregar servicio `keycloak` en docker-compose.yml
- [ ] Configurar imagen: `quay.io/keycloak/keycloak:latest`
- [ ] Configurar puerto 8080 (mapear a host)
- [ ] Agregar dependencia de `postgres`
- [ ] Configurar red `carecore-network`
- [ ] Agregar volumen para persistencia de datos de Keycloak
- [ ] Configurar healthcheck para Keycloak

## Configuración Esperada
```yaml
keycloak:
  image: quay.io/keycloak/keycloak:latest
  container_name: carecore-keycloak
  command: start-dev
  environment:
    KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN}
    KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
    KC_DB: postgres
    KC_DB_URL_HOST: postgres
    KC_DB_URL_DATABASE: keycloak_db
    KC_DB_USERNAME: ${DB_USER}
    KC_DB_PASSWORD: ${DB_PASSWORD}
  ports:
    - "${KEYCLOAK_PORT:-8080}:8080"
  depends_on:
    postgres:
      condition: service_healthy
  networks:
    - carecore-network
  volumes:
    - keycloak_data:/var/lib/keycloak/data
```

## Criterios de Aceptación
- [ ] Keycloak inicia correctamente con `docker-compose up`
- [ ] Keycloak accesible en http://localhost:8080
- [ ] Admin console carga correctamente
- [ ] Base de datos keycloak_db se crea automáticamente

## Referencias
- [Keycloak Docker Documentation](https://www.keycloak.org/server/containers)
```

**Labels:** `enhancement`, `auth`, `phase-1`

---

### Tarea 2: Configurar variables de entorno para Keycloak

**Título:** `feat(auth): configurar variables de entorno para Keycloak`

**Descripción:**
```markdown
## Objetivo
Agregar todas las variables de entorno necesarias para Keycloak en los archivos de configuración.

## Tareas
- [ ] Agregar variables a `.env.development.example`:
  - `KEYCLOAK_ADMIN=` (valor vacío, llenar en .env.local)
  - `KEYCLOAK_ADMIN_PASSWORD=` (valor vacío, llenar en .env.local)
  - `KEYCLOAK_URL=http://localhost:8080`
  - `KEYCLOAK_REALM=carecore`
  - `KEYCLOAK_PORT=8080`
- [ ] Agregar variables a `.env.production.example`
- [ ] Documentar variables en `ENV_VARIABLES.md`
- [ ] Agregar validación de variables requeridas

## Variables Requeridas
- `KEYCLOAK_ADMIN`: Usuario administrador de Keycloak
- `KEYCLOAK_ADMIN_PASSWORD`: Contraseña del administrador
- `KEYCLOAK_URL`: URL base de Keycloak
- `KEYCLOAK_REALM`: Nombre del realm por defecto
- `KEYCLOAK_PORT`: Puerto donde corre Keycloak

## Criterios de Aceptación
- [ ] Todas las variables documentadas en ENV_VARIABLES.md
- [ ] Variables tienen valores por defecto seguros
- [ ] Documentación incluye advertencias de seguridad

## Referencias
- Ver ENV_VARIABLES.md para formato
```

**Labels:** `enhancement`, `auth`, `phase-1`, `documentation`

---

### Tarea 3: Crear script de inicialización de Keycloak

**Título:** `feat(auth): crear scripts de inicialización para Keycloak`

**Descripción:**
```markdown
## Objetivo
Crear scripts y estructura de carpetas para inicializar y configurar Keycloak automáticamente.

## Tareas
- [ ] Crear carpeta `keycloak/` en raíz del proyecto
- [ ] Crear subcarpeta `keycloak/init/` para scripts
- [ ] Crear script SQL para crear base de datos `keycloak_db` (opcional, Keycloak lo hace automáticamente)
- [ ] Crear script de export/import de realm (opcional para MVP)
- [ ] Crear README.md en `keycloak/` explicando la estructura
- [ ] Documentar proceso de inicialización

## Estructura Esperada
```
keycloak/
├── README.md
├── init/
│   └── (scripts de inicialización)
└── realms/
    └── (exports de realms, futuro)
```

## Criterios de Aceptación
- [ ] Carpeta keycloak/ creada y documentada
- [ ] Scripts funcionan correctamente
- [ ] README explica cómo usar los scripts

## Notas
- Keycloak crea automáticamente la base de datos si no existe
- Los scripts de inicialización son opcionales para MVP
```

**Labels:** `enhancement`, `auth`, `phase-1`

---

### Tarea 4: Crear Realm "carecore" en Keycloak

**Título:** `feat(auth): crear y configurar realm "carecore" en Keycloak`

**Descripción:**
```markdown
## Objetivo
Crear el realm principal "carecore" en Keycloak con configuración básica para el MVP.

## Tareas
- [ ] Acceder a admin console de Keycloak (http://localhost:8080)
- [ ] Crear nuevo realm "carecore"
- [ ] Configurar settings básicos del realm:
  - Display name: "CareCore"
  - Enabled: ON
  - User managed access: OFF (para MVP)
- [ ] Configurar login settings:
  - User registration: OFF (para MVP, solo admins crean usuarios)
  - Remember me: ON
  - Email as username: OFF
- [ ] Configurar email settings (opcional para MVP):
  - SMTP server (si se necesita notificaciones)
- [ ] Exportar configuración del realm (para versionado)
- [ ] Documentar configuración en keycloak/README.md

## Configuración del Realm
- **Name:** carecore
- **Display Name:** CareCore
- **Enabled:** Yes
- **User Registration:** No (MVP)
- **Email as username:** No
- **Remember me:** Yes

## Criterios de Aceptación
- [ ] Realm "carecore" creado y funcional
- [ ] Configuración básica aplicada
- [ ] Realm exportado y guardado en keycloak/realms/ (opcional)

## Referencias
- [Keycloak Realm Configuration](https://www.keycloak.org/docs/latest/server_admin/#_realm)
```

**Labels:** `enhancement`, `auth`, `phase-1`

---

### Tarea 5: Configurar cliente "carecore-api" en Keycloak

**Título:** `feat(auth): configurar cliente confidential "carecore-api" en Keycloak`

**Descripción:**
```markdown
## Objetivo
Configurar el cliente OAuth2/OIDC "carecore-api" de tipo confidential para la API backend.

## Tareas
- [ ] Crear cliente "carecore-api" en realm "carecore"
- [ ] Configurar tipo: Confidential
- [ ] Configurar Client ID: `carecore-api`
- [ ] Generar y guardar Client Secret de forma segura
- [ ] Configurar valid redirect URIs:
  - `http://localhost:3000/api/auth/callback`
  - `http://localhost:3000/api/auth/callback/*`
- [ ] Configurar Web origins:
  - `http://localhost:3000`
- [ ] Configurar Access Token Settings:
  - Access token lifespan: 5 minutos
  - Refresh token lifespan: 30 días
- [ ] Habilitar Standard Flow (Authorization Code)
- [ ] Habilitar Direct Access Grants (para testing)
- [ ] Guardar Client Secret en variables de entorno
- [ ] Documentar configuración

## Configuración del Cliente
- **Client ID:** carecore-api
- **Client Protocol:** openid-connect
- **Access Type:** confidential
- **Standard Flow Enabled:** Yes
- **Direct Access Grants Enabled:** Yes (solo para desarrollo)
- **Valid Redirect URIs:** http://localhost:3000/api/auth/callback
- **Web Origins:** http://localhost:3000

## Criterios de Aceptación
- [ ] Cliente creado y configurado correctamente
- [ ] Client Secret guardado de forma segura
- [ ] Redirect URIs configurados
- [ ] Configuración documentada

## Seguridad
- ⚠️ Client Secret NUNCA debe estar en el código
- ⚠️ Usar variables de entorno para Client Secret
- ⚠️ Rotar Client Secret periódicamente en producción
```

**Labels:** `enhancement`, `auth`, `phase-1`, `security`

---

### Tarea 6: Configurar cliente "carecore-web" en Keycloak

**Título:** `feat(auth): configurar cliente public "carecore-web" en Keycloak`

**Descripción:**
```markdown
## Objetivo
Configurar el cliente OAuth2/OIDC "carecore-web" de tipo public para la aplicación frontend.

## Tareas
- [ ] Crear cliente "carecore-web" en realm "carecore"
- [ ] Configurar tipo: Public
- [ ] Configurar Client ID: `carecore-web`
- [ ] Configurar valid redirect URIs:
  - `http://localhost:3001/auth/callback` (desarrollo)
  - `http://localhost:3000/auth/callback` (si frontend en mismo puerto)
- [ ] Configurar Web origins:
  - `http://localhost:3001`
  - `http://localhost:3000`
- [ ] Configurar Access Token Settings:
  - Access token lifespan: 15 minutos
  - Refresh token lifespan: 30 días
- [ ] Habilitar Standard Flow (Authorization Code)
- [ ] Habilitar PKCE (Recomendado para clientes públicos)
- [ ] Documentar configuración

## Configuración del Cliente
- **Client ID:** carecore-web
- **Client Protocol:** openid-connect
- **Access Type:** public
- **Standard Flow Enabled:** Yes
- **PKCE Code Challenge Method:** S256
- **Valid Redirect URIs:** http://localhost:3001/auth/callback
- **Web Origins:** http://localhost:3001

## Criterios de Aceptación
- [ ] Cliente creado y configurado correctamente
- [ ] PKCE habilitado para seguridad
- [ ] Redirect URIs configurados
- [ ] Configuración documentada

## Notas
- Cliente público no requiere Client Secret
- PKCE es obligatorio para clientes públicos en producción
```

**Labels:** `enhancement`, `auth`, `phase-1`

---

### Tarea 7: Definir roles base en Keycloak

**Título:** `feat(auth): definir roles base del sistema en Keycloak`

**Descripción:**
```markdown
## Objetivo
Crear todos los roles base del sistema en el realm "carecore" de Keycloak.

## Tareas
- [ ] Crear rol "patient" con descripción
- [ ] Crear rol "practitioner" con descripción
- [ ] Crear rol "viewer" con descripción
- [ ] Crear rol "lab" con descripción
- [ ] Crear rol "insurer" con descripción
- [ ] Crear rol "system" con descripción
- [ ] Crear rol "admin" con descripción
- [ ] Crear rol "audit" con descripción
- [ ] Documentar permisos de cada rol
- [ ] Crear documento ROLES.md con descripción de cada rol

## Roles a Crear

### patient
- **Descripción:** Usuario paciente, dueño de su información
- **Permisos:** read/consent/revoke/share/export de sus propios datos

### practitioner
- **Descripción:** Profesional médico certificado
- **Permisos:** create/update registros clínicos, read datos de pacientes asignados

### viewer
- **Descripción:** Usuario con acceso de solo lectura temporal
- **Permisos:** read datos con consentimiento, scopes temporales

### lab
- **Descripción:** Sistema de laboratorio integrado
- **Permisos:** create/read resultados de laboratorio, scopes limitados

### insurer
- **Descripción:** Sistema de aseguradora integrado
- **Permisos:** read datos con consentimiento, scopes limitados

### system
- **Descripción:** Sistema externo integrado
- **Permisos:** scopes específicos según integración

### admin
- **Descripción:** Administrador del sistema
- **Permisos:** acceso completo, gestión de usuarios, verificación de practitioners

### audit
- **Descripción:** Usuario de auditoría
- **Permisos:** read logs de auditoría, operaciones internas

## Criterios de Aceptación
- [ ] Todos los roles creados en Keycloak
- [ ] Roles documentados en ROLES.md
- [ ] Descripción clara de permisos de cada rol

## Referencias
- Ver sección 2.3 del AUTH_IMPLEMENTATION_PLAN.md
```

**Labels:** `enhancement`, `auth`, `phase-1`, `documentation`

---

### Tarea 8: Documentar setup de Keycloak

**Título:** `docs(auth): documentar setup y configuración de Keycloak`

**Descripción:**
```markdown
## Objetivo
Crear documentación completa sobre el setup, configuración y uso de Keycloak en el proyecto.

## Tareas
- [ ] Crear sección "Keycloak Setup" en README.md
- [ ] Documentar acceso a admin console:
  - URL: http://localhost:8080
  - Usuario: (valor de KEYCLOAK_ADMIN de .env.local)
  - Contraseña: (de variable de entorno)
- [ ] Documentar estructura de carpetas keycloak/
- [ ] Crear guía de troubleshooting común:
  - Keycloak no inicia
  - Error de conexión a base de datos
  - Problemas con realm
- [ ] Documentar proceso de backup/restore
- [ ] Agregar diagrama de arquitectura
- [ ] Documentar variables de entorno relacionadas

## Documentación a Crear

### README.md - Sección Keycloak
```markdown
## 🔐 Keycloak Setup

### Acceso
- Admin Console: http://localhost:8080
- Usuario: ${KEYCLOAK_ADMIN}
- Contraseña: (ver .env.local)

### Estructura
- `keycloak/` - Configuración de Keycloak
  - `init/` - Scripts de inicialización
  - `realms/` - Exports de realms (futuro)

### Troubleshooting
- Ver [KEYCLOAK_TROUBLESHOOTING.md](docs/KEYCLOAK_TROUBLESHOOTING.md)
```

### KEYCLOAK_TROUBLESHOOTING.md
- Problemas comunes y soluciones
- Logs importantes
- Comandos útiles

## Criterios de Aceptación
- [ ] Documentación completa en README
- [ ] Guía de troubleshooting creada
- [ ] Diagrama de arquitectura incluido
- [ ] Ejemplos de configuración incluidos
```

**Labels:** `documentation`, `auth`, `phase-1`

---

## 📊 Resumen de Tareas

| # | Tarea | Estimación | Prioridad | Labels |
|---|-------|------------|-----------|--------|
| 1 | Agregar Keycloak a docker-compose.yml | 2-3 horas | Alta | `enhancement`, `auth`, `phase-1` |
| 2 | Configurar variables de entorno | 1-2 horas | Alta | `enhancement`, `auth`, `phase-1`, `documentation` |
| 3 | Crear scripts de inicialización | 2-3 horas | Media | `enhancement`, `auth`, `phase-1` |
| 4 | Crear Realm "carecore" | 1-2 horas | Alta | `enhancement`, `auth`, `phase-1` |
| 5 | Configurar cliente "carecore-api" | 2-3 horas | Alta | `enhancement`, `auth`, `phase-1`, `security` |
| 6 | Configurar cliente "carecore-web" | 1-2 horas | Media | `enhancement`, `auth`, `phase-1` |
| 7 | Definir roles base | 2-3 horas | Alta | `enhancement`, `auth`, `phase-1`, `documentation` |
| 8 | Documentar setup | 2-3 horas | Media | `documentation`, `auth`, `phase-1` |

**Tiempo Total Estimado:** 13-21 horas (2-3 días)

---

## 🚀 Cómo Usar Esta Lista

### Opción 1: Crear Issues Individuales
1. Copia cada tarea como un nuevo Issue en GitHub
2. Usa el título y descripción proporcionados
3. Agrega los labels sugeridos
4. Asigna a un milestone "Fase 1: Setup Keycloak"

### Opción 2: Crear Issue Épico
1. Crea un issue principal "Fase 1: Setup Keycloak"
2. Crea issues hijos para cada tarea
3. Usa GitHub Projects para organizar

### Opción 3: Usar GitHub Projects Directamente
1. Crea cards en GitHub Projects
2. Copia el título de cada tarea
3. Agrega la descripción en el body de la card
4. Usa los labels sugeridos

---

**Última actualización**: 2025-01-27

