# GitHub Actions Workflows

Este directorio contiene los workflows de GitHub Actions para automatizar CI/CD.

## Workflows Disponibles

### 🔍 CI (`ci.yml`)
Workflow de integración continua que se ejecuta en:
- Push a `main`, `develop`, `feature/**`, `fix/**`
- Pull requests a `main` y `develop`

**Jobs:**
1. **lint-and-format**: Verifica ESLint y formato de código
2. **test**: Ejecuta tests con PostgreSQL en Docker
3. **build**: Compila la aplicación
4. **security**: Escaneo de seguridad con Snyk y npm audit

**Nota:** Los comentarios de coverage se manejan en el workflow separado `coverage-comment.yml` para evitar problemas de permisos.

### 📊 Coverage Comment (`coverage-comment.yml`)
Workflow dedicado para comentarios automáticos de coverage en PRs:
- Se ejecuta en PRs a `main` y `develop`
- Solo funciona con PRs del mismo repositorio (no forks)
- Crea/actualiza comentario con métricas de coverage
- Requiere permisos `pull-requests: write` e `issues: write`

### 🚀 CD (`cd.yml`)
Workflow de despliegue continuo que se ejecuta en:
- Push a `main` (producción)
- Push a `develop` (staging)

**Nota:** Requiere configuración de secrets y lógica de deployment personalizada.

### 🐳 Docker (`docker.yml`)
Build y push de imágenes Docker a GitHub Container Registry:
- Push a `main` o `develop`
- Tags de versión (`v*.*.*`)
- Pull requests (solo build, sin push)

### 🤖 Dependabot Auto-merge (`dependabot-auto-merge.yml`)
Auto-merge automático de PRs de Dependabot después de que pasen los checks de CI.

## Configuración Requerida

### Secrets de GitHub

Para que los workflows funcionen completamente, necesitas configurar estos secrets en GitHub:

1. **Para CD:**
   - `DB_HOST`: Host de la base de datos
   - `DB_PORT`: Puerto de la base de datos
   - `DB_USER`: Usuario de la base de datos
   - `DB_PASSWORD`: Contraseña de la base de datos
   - `DB_NAME`: Nombre de la base de datos

2. **Para Security Scan (opcional):**
   - `SNYK_TOKEN`: Token de Snyk para escaneo de seguridad

3. **Para Code Coverage (opcional):**
   - `CODECOV_TOKEN`: Token de Codecov

### Cómo Configurar Secrets

1. Ve a tu repositorio en GitHub
2. Settings → Secrets and variables → Actions
3. Click en "New repository secret"
4. Agrega cada secret con su valor

## Personalización

### Modificar CD para tu plataforma

El workflow `cd.yml` tiene un placeholder para deployment. Reemplaza el step "Deploy to server" con tu lógica:

**Ejemplo para Docker:**
```yaml
- name: Deploy to server
  run: |
    docker build -t carecore-api:${{ github.sha }} .
    docker push carecore-api:${{ github.sha }}
    # Tu lógica de deployment aquí
```

**Ejemplo para AWS:**
```yaml
- name: Deploy to AWS
  uses: aws-actions/configure-aws-credentials@v2
  with:
    aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
    aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    aws-region: us-east-1
```

## Badges (Opcional)

Puedes agregar badges a tu README.md:

```markdown
![CI](https://github.com/tu-usuario/carecore-api/workflows/CI/badge.svg)
![CD](https://github.com/tu-usuario/carecore-api/workflows/CD/badge.svg)
```

