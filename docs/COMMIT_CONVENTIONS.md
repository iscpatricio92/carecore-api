# 📝 Convention commits and branches - CareCore

This document describe concentions of commits and branches names using on CareCore.

## Formato de Commits

Los commits siguen el formato **Conventional Commits** con scopes personalizados para el monorepo:

```
<type>(<scope>): <descripción>

[body opcional]

[footer opcional]
```

### Ejemplos

```bash
feat(api): agregar endpoint para crear pacientes
fix(web): corregir error de login con Keycloak
docs(docs): actualizar guía de instalación
refactor(shared): mover interfaces FHIR a packages/shared
build(docker): actualizar Dockerfile para monorepo
test(api): agregar tests para módulo de autenticación
```

## Tipos de Commits

| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| `feat` | Nueva funcionalidad | `feat(api): agregar endpoint de pacientes` |
| `fix` | Corrección de bug | `fix(web): corregir error de validación` |
| `docs` | Cambios en documentación | `docs(docs): actualizar README` |
| `style` | Cambios de formato (no afectan código) | `style(api): formatear código con Prettier` |
| `refactor` | Refactorización de código | `refactor(shared): reorganizar tipos FHIR` |
| `perf` | Mejora de rendimiento | `perf(api): optimizar consultas a base de datos` |
| `test` | Agregar o modificar tests | `test(api): agregar tests para módulo FHIR` |
| `build` | Cambios en sistema de build | `build(docker): actualizar Dockerfile` |
| `ci` | Cambios en CI/CD | `ci: actualizar workflows de GitHub Actions` |
| `chore` | Tareas de mantenimiento | `chore(root): actualizar dependencias` |
| `revert` | Revertir commit anterior | `revert(api): revertir cambio en autenticación` |

## Scopes

Los scopes identifican la parte del monorepo afectada por el cambio:

| Scope | Descripción | Ejemplo |
|-------|-------------|---------|
| `api` | Backend API (NestJS) | `feat(api): agregar endpoint de pacientes` |
| `web` | Frontend Web (Next.js) | `fix(web): corregir error de login` |
| `mobile` | Frontend Mobile (React Native) | `feat(mobile): agregar pantalla de perfil` |
| `shared` | Código compartido (types, constants, utils) | `feat(shared): agregar tipos FHIR` |
| `infra` | Infraestructura (Docker, scripts, config, CI/CD) | `build(infra): actualizar docker-compose` |
| `keycloak` | Configuración de Keycloak | `build(keycloak): agregar nuevos roles` |
| `root` | Cambios en root (docs, package.json, etc.) | `chore(root): actualizar package.json` |

### Scope Personalizado

Si necesitas un scope que no está en la lista, puedes usar un scope personalizado:

```bash
feat(custom-scope): descripción del cambio
```

Sin embargo, se recomienda usar los scopes predefinidos cuando sea posible.

## Descripción

- **Debe estar en minúsculas** (excepto nombres propios, acrónimos, etc.)
- **No debe terminar con punto**
- **Máximo 100 caracteres**
- **Debe ser clara y concisa**

### ✅ Buenas descripciones

```bash
feat(api): agregar endpoint para crear pacientes
fix(web): corregir error de validación en formulario de login
docs(docs): actualizar guía de instalación con Docker
```

### ❌ Malas descripciones

```bash
feat(api): cambios
fix(web): arreglar bug
docs(docs): actualizar docs.
```

## Body (Opcional)

El body proporciona información adicional sobre el cambio:

```bash
feat(api): agregar endpoint para crear pacientes

Implementa el endpoint POST /api/fhir/Patient siguiendo
el estándar FHIR R4. Incluye validación de datos y
manejo de errores.
```

## Footer (Opcional)

El footer se usa para referenciar issues o breaking changes:

```bash
feat(api): agregar endpoint para crear pacientes

Closes #123
Refs #456
```

## Breaking Changes

Para cambios que rompen la compatibilidad, usa el prefijo `BREAKING CHANGE:`:

```bash
feat(api)!: cambiar estructura de respuesta de pacientes

BREAKING CHANGE: La respuesta del endpoint /api/fhir/Patient
ahora incluye un campo adicional 'metadata'. Los clientes
deben actualizar su código para manejar este cambio.
```

O usa el símbolo `!` después del tipo:

```bash
feat(api)!: cambiar estructura de respuesta
```

## Uso de Commitizen

Para facilitar la creación de commits con el formato correcto, usa Commitizen:

```bash
npm run commit
```

Esto iniciará un prompt interactivo que te guiará a través del proceso de creación del commit.

## Validación

Los commits son validados automáticamente por:

- **Husky**: Ejecuta hooks de pre-commit y commit-msg
- **Commitlint**: Valida el formato del mensaje de commit
- **Lint-staged**: Ejecuta linters y formatters en archivos modificados

Si el commit no cumple con las convenciones, el hook lo rechazará y mostrará un mensaje de error.

## Ejemplos Completos

### Commit simple

```bash
feat(api): agregar endpoint para crear pacientes
```

### Commit con body

```bash
feat(api): agregar endpoint para crear pacientes

Implementa el endpoint POST /api/fhir/Patient siguiendo
el estándar FHIR R4. Incluye validación de datos y
manejo de errores.
```

### Commit con footer

```bash
fix(web): corregir error de login con Keycloak

El error ocurría cuando el token de acceso expiraba
y el refresh token no se renovaba correctamente.

Closes #123
```

### Commit con breaking change

```bash
feat(api)!: cambiar estructura de respuesta de pacientes

BREAKING CHANGE: La respuesta del endpoint /api/fhir/Patient
ahora incluye un campo adicional 'metadata'. Los clientes
deben actualizar su código para manejar este cambio.

Refs #456
```

---

## 🌿 Convenciones de Nombres de Branches

Los nombres de branches deben seguir un formato específico para mantener la consistencia y facilitar la organización.

### Formato de Branch

```
<tipo>(<scope>)/<iniciales>-#<numero>/<descripcion>
```

### Componentes

| Componente | Descripción | Ejemplo |
|------------|-------------|---------|
| `<tipo>` | Tipo de cambio (mismo que en commits) | `feat`, `fix`, `docs`, etc. |
| `<scope>` | Scope del cambio (mismo que en commits) | `api`, `web`, `mobile`, etc. |
| `<iniciales>` | Iniciales del desarrollador (minúsculas) | `ps`, `jd`, `am` |
| `<numero>` | Número de tarea/issue (solo números) | `123`, `456`, `789` |
| `<descripcion>` | Descripción corta (minúsculas, guiones) | `agregar-endpoint-pacientes` |

### Ejemplos

```bash
# Feature en API
feat(api)/ps-#123/agregar-endpoint-pacientes

# Fix en Web
fix(web)/ps-#456/corregir-error-login

# Documentación
docs(root)/ps-#789/actualizar-readme

# Build/Infraestructura
build(infra)/ps-#101/actualizar-dockerfile

# Refactor en Shared
refactor(shared)/ps-#202/reorganizar-tipos-fhir
```

### Reglas

1. **Tipo y Scope**: Deben coincidir con los tipos y scopes de commits
2. **Iniciales**: Solo letras minúsculas (ej: `ps`, `jd`, `am`)
3. **Número de tarea**: Solo números (ej: `123`, `456`)
4. **Descripción**: Solo letras minúsculas, números y guiones (ej: `agregar-endpoint-pacientes`)
5. **Sin espacios**: Usar guiones para separar palabras en la descripción

### Validación Automática

El proyecto incluye un hook de Git (`.husky/pre-push`) que valida automáticamente el formato del nombre del branch antes de hacer push. Si el nombre no sigue la convención, el push será rechazado.

### Script Helper

Para facilitar la creación de branches con el formato correcto, usa el script helper:

```bash
./scripts/create-branch.sh <tipo> <scope> <iniciales> <numero-tarea> <descripcion>
```

**Ejemplo:**
```bash
./scripts/create-branch.sh feat api ps 123 agregar-endpoint-pacientes
```

Esto creará el branch: `feat(api)/ps-#123/agregar-endpoint-pacientes`

### Branches Principales

Los siguientes branches están exentos de la validación:
- `main`
- `master`
- `develop`

---

## Referencias

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Commitizen](https://github.com/commitizen/cz-cli)
- [Commitlint](https://commitlint.js.org/)

