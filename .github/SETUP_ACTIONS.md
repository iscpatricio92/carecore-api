# Configuración de GitHub Actions

Esta guía te ayudará a configurar los permisos necesarios para que los workflows de GitHub Actions funcionen correctamente.

## 🔐 Configurar Permisos del Workflow

### Paso 1: Ir a Configuración del Repositorio

1. Ve a tu repositorio en GitHub
2. Click en **Settings** (Configuración)
3. En el menú lateral, click en **Actions** → **General**

### Paso 2: Configurar Permisos de Workflow

En la sección **"Workflow permissions"**:

1. Selecciona: **"Read and write permissions"**
   - Esto permite que los workflows escriban comentarios en PRs

2. Marca la casilla: **"Allow GitHub Actions to create and approve pull requests"**
   - Esto permite crear/actualizar comentarios en PRs

3. Click en **Save** (Guardar)

### Paso 3: Verificar Configuración

Después de guardar, los workflows deberían poder:

- ✅ Crear comentarios en Pull Requests
- ✅ Actualizar comentarios existentes
- ✅ Acceder a información de PRs

## 🚨 Solución al Error 403

Si aún recibes el error `403: Resource not accessible by integration`, prueba lo siguiente:

### Opción 1: Verificar que el PR no viene de un Fork

Los workflows automáticamente verifican que el PR no viene de un fork. Si viene de un fork, el comentario no se creará (esto es normal por seguridad).

### Opción 2: Usar Personal Access Token (PAT)

Si necesitas que funcione con PRs de forks o si el problema persiste:

1. **Crear un PAT:**
   - Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click en "Generate new token (classic)"
   - Nombre: `carecore-api-actions`
   - Permisos necesarios:
     - `repo` (acceso completo al repositorio)
     - `write:discussion` (opcional, para comentarios)
   - Click en "Generate token"
   - **⚠️ Copia el token inmediatamente** (solo se muestra una vez)

2. **Agregar como Secret:**
   - Ve a tu repositorio → Settings → Secrets and variables → Actions
   - Click en "New repository secret"
   - Name: `GITHUB_TOKEN_PAT`
   - Value: Pega el token que copiaste
   - Click en "Add secret"

3. **Actualizar el workflow:**
   - En los workflows, reemplaza `${{ secrets.GITHUB_TOKEN }}` con `${{ secrets.GITHUB_TOKEN_PAT }}`
   - O usa una condición para usar PAT solo cuando sea necesario

## 📋 Checklist de Configuración

- [ ] Permisos de workflow configurados en Settings → Actions → General
- [ ] "Read and write permissions" seleccionado
- [ ] "Allow GitHub Actions to create and approve pull requests" marcado
- [ ] Workflow tiene la sección `permissions:` con `pull-requests: write`
- [ ] Verificación de que PR no viene de fork (ya incluida en workflows)

## 🔍 Verificar que Funciona

1. Crea un Pull Request
2. Haz push de cambios
3. El workflow debería ejecutarse
4. Deberías ver un comentario automático con el coverage

Si no funciona, revisa los logs del workflow en la pestaña "Actions" de GitHub.

## 📚 Recursos

- [GitHub Actions Permissions](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#permissions)
- [GITHUB_TOKEN Permissions](https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token)
- [Troubleshooting GitHub Actions](https://docs.github.com/en/actions/using-workflows/troubleshooting-workflows)
