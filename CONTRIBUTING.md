# Guía de Contribución - CareCore API

Esta guía establece las reglas y convenciones para contribuir al proyecto.

## 📝 Convenciones de Commits

Seguimos el estándar [Conventional Commits](https://www.conventionalcommits.org/).

### Formato

```
<tipo>(<scope>): <descripción>

[body opcional]

[footer opcional]
```

### Tipos de Commit

- **`feat`**: Nueva funcionalidad
- **`fix`**: Corrección de bug
- **`docs`**: Cambios en documentación
- **`style`**: Cambios de formato (espacios, comas, etc.) que no afectan el código
- **`refactor`**: Refactorización de código sin cambiar funcionalidad
- **`perf`**: Mejoras de rendimiento
- **`test`**: Agregar o modificar tests
- **`build`**: Cambios en sistema de build, dependencias, etc.
- **`ci`**: Cambios en CI/CD
- **`chore`**: Tareas de mantenimiento
- **`revert`**: Revertir un commit anterior

### Scope (Opcional)

El scope indica el área del código afectada. Ejemplos:
- `auth`: Autenticación
- `patients`: Módulo de pacientes
- `fhir`: Recursos FHIR
- `db`: Base de datos
- `config`: Configuración

### Ejemplos

```bash
# Nueva funcionalidad
git commit -m "feat(patients): agregar endpoint para buscar pacientes por nombre"

# Corrección de bug
git commit -m "fix(auth): corregir validación de token JWT expirado"

# Documentación
git commit -m "docs: actualizar guía de configuración de Docker"

# Refactorización
git commit -m "refactor(fhir): simplificar lógica de validación de recursos"

# Con body y footer
git commit -m "feat(patients): agregar filtros de búsqueda avanzada

Permite buscar pacientes por múltiples criterios:
- Nombre completo
- Fecha de nacimiento
- Identificador nacional

Closes #123"
```

### Reglas

- ✅ El tipo debe estar en minúsculas
- ✅ El scope (si existe) debe estar en minúsculas
- ✅ La descripción debe empezar con minúscula
- ✅ La descripción no debe terminar con punto
- ✅ La descripción debe tener máximo 100 caracteres
- ✅ El header completo debe tener máximo 100 caracteres
- ❌ No uses `WIP`, `fixup`, `squash` en el mensaje principal

## 🌿 Convenciones de Branches

### Formato

```
<tipo>/<descripción>
```

### Tipos de Branch

- **`feature/`**: Nueva funcionalidad
- **`fix/`**: Corrección de bug
- **`hotfix/`**: Corrección urgente en producción
- **`docs/`**: Cambios en documentación
- **`refactor/`**: Refactorización
- **`test/`**: Agregar o mejorar tests
- **`chore/`**: Tareas de mantenimiento

### Ejemplos

```bash
# Feature
feature/patient-search
feature/auth-jwt-implementation

# Fix
fix/database-connection-timeout
fix/fhir-resource-validation

# Hotfix
hotfix/security-patch-cve-2024

# Docs
docs/api-documentation-update

# Refactor
refactor/database-config-module
```

### Reglas

- ✅ Usa minúsculas
- ✅ Separa palabras con guiones (`-`)
- ✅ Sé descriptivo pero conciso
- ✅ No uses caracteres especiales
- ❌ No uses espacios
- ❌ No uses mayúsculas

## 🔄 Flujo de Trabajo

### 1. Crear Branch

```bash
# Desde main actualizada
git checkout main
git pull origin main

# Crear nueva branch
git checkout -b feature/nombre-de-la-funcionalidad
```

### 2. Hacer Cambios

- Escribe código limpio
- Sigue las convenciones de código del proyecto
- Agrega tests si es necesario
- Actualiza documentación si es necesario

### 3. Commit

```bash
# Agregar cambios
git add .

# Commit con mensaje convencional
git commit -m "feat(scope): descripción del cambio"
```

El pre-commit hook ejecutará automáticamente:
- Formateo con Prettier
- Corrección de ESLint
- Validación del mensaje de commit

### 4. Push y Pull Request

```bash
# Push de la branch
git push origin feature/nombre-de-la-funcionalidad
```

Luego crea un Pull Request en GitHub/GitLab con:
- Título descriptivo
- Descripción de los cambios
- Referencias a issues relacionados (si aplica)

## ✅ Checklist Antes de PR

- [ ] Código formateado (se aplica automáticamente)
- [ ] Sin errores de ESLint (se corrige automáticamente)
- [ ] Mensaje de commit sigue convenciones (se valida automáticamente)
- [ ] Tests pasan: `npm test`
- [ ] Documentación actualizada (si aplica)
- [ ] Sin console.logs de debug
- [ ] Sin código comentado innecesario

## 🚫 Qué NO Hacer

- ❌ Commits con mensajes genéricos como "fix", "update", "changes"
- ❌ Branches con nombres como `fix1`, `test`, `new-feature`
- ❌ Commits que mezclan múltiples cambios no relacionados
- ❌ Push directo a `main` o `develop`
- ❌ Commits que rompen el build o los tests

## 📚 Recursos

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [Git Flow](https://nvie.com/posts/a-successful-git-branching-model/)

