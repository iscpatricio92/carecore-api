# 🛠️ Scripts de Automatización

Scripts útiles para automatizar tareas comunes del proyecto.

## 📋 create-github-tasks-phase1.js

Script para crear issues de GitHub automáticamente desde el archivo de tareas de la Fase 1.

### Requisitos

1. **GitHub CLI instalado:**

   ```bash
   # macOS
   brew install gh

   # Linux
   # Ver: https://cli.github.com/
   ```

2. **Autenticado con GitHub:**

   ```bash
   gh auth login
   ```

3. **Permisos del token (se solicita automáticamente):**
   El script verificará y solicitará automáticamente el scope `project` necesario para agregar issues al proyecto.
   Si prefieres hacerlo manualmente:
   ```bash
   gh auth refresh -h github.com -s project
   ```

### Uso

#### Modo Dry Run (solo muestra lo que haría)

```bash
node scripts/create-github-tasks-phase1.js --dry-run
```

#### Crear issues reales

```bash
node scripts/create-github-tasks-phase1.js
```

#### Especificar repositorio o proyecto diferente

```bash
# Cambiar repositorio
node scripts/create-github-tasks-phase1.js --owner=tu-usuario --repo=tu-repo

# Cambiar proyecto (por defecto usa proyecto #2)
node scripts/create-github-tasks-phase1.js --project=3
```

**Configuración por defecto:**

- Repositorio: `iscpatricio92/carecore-api`
- Proyecto: `#2` (https://github.com/users/iscpatricio92/projects/2)

### Qué hace el script

1. ✅ Lee el archivo `docs/tasks/PHASE1_KEYCLOAK_SETUP.md`
2. ✅ Parsea todas las tareas (título, descripción, labels)
3. ✅ Crea un issue en GitHub por cada tarea
4. ✅ Asigna los labels correspondientes
5. ✅ **Agrega cada issue al proyecto de GitHub Projects #2**
6. ✅ Muestra un resumen de issues creados con links

### Ejemplo de salida

```
🚀 Script de creación de issues para Fase 1: Setup Keycloak

📖 Leyendo archivo de tareas...
✅ Encontradas 8 tareas

📋 Tareas a crear:
   1. Agregar Keycloak a docker-compose.yml
   2. Configurar variables de entorno para Keycloak
   ...

📝 Creando issues...

📦 Repositorio: iscpatricio92/carecore-api
📋 Proyecto: #2 (https://github.com/users/iscpatricio92/projects/2)

Creando tarea 1: Agregar Keycloak a docker-compose.yml...
✅ Issue creado: https://github.com/iscpatricio92/carecore-api/issues/14
   📌 Agregado al proyecto #2

...

📊 Resumen:
   ✅ Creados: 8
   ❌ Fallidos: 0

🔗 Ver todos los issues en el proyecto:
   https://github.com/users/iscpatricio92/projects/2

✨ ¡Completado!
```

### Troubleshooting

**Error: "GitHub CLI (gh) no está instalado"**

- Instala GitHub CLI: https://cli.github.com/

**Error: "No estás autenticado con GitHub CLI"**

- Ejecuta: `gh auth login`
- Sigue las instrucciones para autenticarte

**Error: "Permission denied"**

- Verifica que tienes permisos de escritura en el repositorio
- Verifica que estás autenticado: `gh auth status`

---

**Nota:** Este script es temporal y puede ser eliminado una vez que las tareas estén creadas.
