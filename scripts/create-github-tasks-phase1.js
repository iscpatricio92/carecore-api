#!/usr/bin/env node

/**
 * Script para crear issues de GitHub desde el archivo de tareas de la Fase 1
 *
 * Requisitos:
 * - GitHub CLI instalado: https://cli.github.com/
 * - Autenticado: gh auth login
 *
 * Uso:
 *   node scripts/create-github-tasks-phase1.js
 *   node scripts/create-github-tasks-phase1.js --dry-run  # Solo muestra lo que haría
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');
const REPO = process.argv.find((arg) => arg.startsWith('--repo='))?.split('=')[1] || 'carecore-api';
const OWNER =
  process.argv.find((arg) => arg.startsWith('--owner='))?.split('=')[1] || 'iscpatricio92';
const PROJECT_NUMBER =
  process.argv.find((arg) => arg.startsWith('--project='))?.split('=')[1] || '2';

// Colores para output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Parsear el archivo de tareas
function parseTasksFile() {
  const tasksFile = path.join(__dirname, '../docs/tasks/PHASE1_KEYCLOAK_SETUP.md');

  if (!fs.existsSync(tasksFile)) {
    log(`❌ Archivo no encontrado: ${tasksFile}`, 'red');
    process.exit(1);
  }

  const content = fs.readFileSync(tasksFile, 'utf-8');
  const tasks = [];

  // Buscar cada sección de tarea
  const taskRegex =
    /### Tarea (\d+): (.+?)\n\n\*\*Título:\*\* `(.+?)`\n\n\*\*Descripción:\*\*\n```markdown\n([\s\S]+?)```\n\n\*\*Labels:\*\* `(.+?)`/g;

  let match;
  while ((match = taskRegex.exec(content)) !== null) {
    const [, taskNum, taskName, title, description, labels] = match;

    tasks.push({
      number: parseInt(taskNum),
      name: taskName.trim(),
      title: title.trim(),
      description: description.trim(),
      labels: labels.split('`, `').map((l) => l.replace(/`/g, '').trim()),
    });
  }

  return tasks;
}

// Crear issue en GitHub usando archivo temporal para el body
function createIssue(task, milestone = null) {
  const labels = task.labels.join(',');
  const body = task.description;

  // Agregar metadata al body
  const fullBody = `${body}\n\n---\n\n**Tarea ${task.number} de la Fase 1: Setup Keycloak**\n\nVer [AUTH_IMPLEMENTATION_PLAN.md](../docs/AUTH_IMPLEMENTATION_PLAN.md) para contexto completo.`;

  if (DRY_RUN) {
    log(`\n📝 [DRY RUN] Crearía issue:`, 'yellow');
    log(`   Título: ${task.title}`, 'blue');
    log(`   Labels: ${labels}`, 'blue');
    log(`   Body length: ${fullBody.length} caracteres`, 'blue');
    return null;
  }

  // Crear archivo temporal para el body (más confiable que pasar por línea de comandos)
  const tmpDir = path.join(__dirname, '..');
  const tmpFile = path.join(tmpDir, `.tmp-issue-${task.number}-${Date.now()}.md`);

  try {
    // Escribir body a archivo temporal
    fs.writeFileSync(tmpFile, fullBody, 'utf-8');
    log(`   Archivo temporal creado: ${tmpFile}`, 'blue');

    try {
      log(`   Ejecutando: gh issue create...`, 'blue');

      // Usar --body-file en lugar de --body para evitar problemas con caracteres especiales
      const command = [
        'gh issue create',
        `--title "${task.title.replace(/"/g, '\\"')}"`,
        `--body-file "${tmpFile}"`,
        `--label "${labels}"`,
        milestone ? `--milestone "${milestone}"` : '',
        `--repo "${OWNER}/${REPO}"`,
      ]
        .filter(Boolean)
        .join(' ');

      const output = execSync(command, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 30000, // 30 segundos timeout
      });

      const issueUrl = output.trim();

      if (!issueUrl || !issueUrl.includes('github.com')) {
        log(`⚠️  Respuesta inesperada: ${output}`, 'yellow');
        if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
        return null;
      }

      log(`✅ Issue creado: ${issueUrl}`, 'green');

      // Extraer número de issue de la URL
      const issueNumber = issueUrl.match(/\/issues\/(\d+)/)?.[1];

      // Limpiar archivo temporal
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }

      return { url: issueUrl, number: issueNumber };
    } catch (execError) {
      // Limpiar archivo temporal en caso de error
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
      throw execError;
    }
  } catch (error) {
    const errorOutput = error.stderr?.toString() || error.stdout?.toString() || '';
    const errorMessage = error.message || 'Error desconocido';

    log(`❌ Error creando issue "${task.title}":`, 'red');
    if (errorOutput) {
      log(`   Output: ${errorOutput.substring(0, 500)}`, 'red');
    }
    log(`   Error: ${errorMessage}`, 'red');

    return null;
  }
}

// Agregar issue a GitHub Project
function addIssueToProject(issueNumber) {
  if (!issueNumber) return false;

  // Obtener el project ID usando la API de GitHub
  try {
    // Primero obtener el project ID
    const projectQuery = `
      query {
        user(login: "${OWNER}") {
          projectV2(number: ${PROJECT_NUMBER}) {
            id
            title
          }
        }
      }
    `;

    const projectResult = execSync(
      `gh api graphql -f query='${projectQuery.replace(/\n/g, ' ')}'`,
      { encoding: 'utf-8', stdio: 'pipe' },
    );

    const projectData = JSON.parse(projectResult);
    const projectId = projectData?.data?.user?.projectV2?.id;

    if (!projectId) {
      log(`⚠️  No se pudo encontrar el proyecto #${PROJECT_NUMBER}`, 'yellow');
      return false;
    }

    // Obtener el node ID del issue
    const issueQuery = `
      query {
        repository(owner: "${OWNER}", name: "${REPO}") {
          issue(number: ${issueNumber}) {
            id
          }
        }
      }
    `;

    const issueResult = execSync(`gh api graphql -f query='${issueQuery.replace(/\n/g, ' ')}'`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    const issueData = JSON.parse(issueResult);
    const issueId = issueData?.data?.repository?.issue?.id;

    if (!issueId) {
      log(`⚠️  No se pudo encontrar el issue #${issueNumber}`, 'yellow');
      return false;
    }

    // Agregar issue al proyecto
    const addMutation = `
      mutation {
        addProjectV2ItemById(input: {
          projectId: "${projectId}",
          contentId: "${issueId}"
        }) {
          item {
            id
          }
        }
      }
    `;

    execSync(`gh api graphql -f query='${addMutation.replace(/\n/g, ' ')}'`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    log(`   📌 Agregado al proyecto #${PROJECT_NUMBER}`, 'green');
    return true;
  } catch (error) {
    log(`⚠️  No se pudo agregar al proyecto: ${error.message}`, 'yellow');
    return false;
  }
}

// Verificar que gh CLI está instalado y autenticado
function checkGitHubCLI() {
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch (error) {
    log('❌ GitHub CLI (gh) no está instalado.', 'red');
    log('   Instala desde: https://cli.github.com/', 'yellow');
    process.exit(1);
  }

  try {
    execSync('gh auth status', { stdio: 'ignore' });
  } catch (error) {
    log('❌ No estás autenticado con GitHub CLI.', 'red');
    log('   Ejecuta: gh auth login', 'yellow');
    process.exit(1);
  }
}

// Verificar y solicitar scope 'project' si falta
function checkProjectScope() {
  try {
    const authStatus = execSync('gh auth status', { encoding: 'utf-8', stdio: 'pipe' });
    const hasProjectScope = authStatus.includes("'project'") || authStatus.includes('project');

    if (!hasProjectScope) {
      log(
        '\n⚠️  El token de GitHub CLI no tiene el scope "project" necesario para agregar issues al proyecto.',
        'yellow',
      );
      log('   Intentando agregar el scope automáticamente...', 'blue');

      try {
        execSync('gh auth refresh -h github.com -s project', {
          encoding: 'utf-8',
          stdio: 'pipe',
          timeout: 60000, // 60 segundos para dar tiempo a la autenticación
        });
        log('✅ Scope "project" agregado exitosamente.', 'green');
        return true;
      } catch (error) {
        log('⚠️  No se pudo agregar el scope automáticamente.', 'yellow');
        log('   Por favor, ejecuta manualmente:', 'yellow');
        log('   gh auth refresh -h github.com -s project', 'blue');
        log(
          '\n   Los issues se crearán, pero NO se agregarán al proyecto automáticamente.',
          'yellow',
        );
        return false;
      }
    }
    return true;
  } catch (error) {
    // Si no podemos verificar, continuar de todas formas
    log('⚠️  No se pudo verificar los scopes del token.', 'yellow');
    log(
      '   Continuando... (si falla, ejecuta: gh auth refresh -h github.com -s project)',
      'yellow',
    );
    return true;
  }
}

// Main
async function main() {
  log('🚀 Script de creación de issues para Fase 1: Setup Keycloak\n', 'bright');

  if (DRY_RUN) {
    log('⚠️  MODO DRY RUN - No se crearán issues reales\n', 'yellow');
  }

  // Verificar GitHub CLI
  checkGitHubCLI();

  // Verificar scope 'project' para agregar issues al proyecto
  if (!DRY_RUN) {
    checkProjectScope();
  }

  // Parsear tareas
  log('📖 Leyendo archivo de tareas...', 'blue');
  const tasks = parseTasksFile();
  log(`✅ Encontradas ${tasks.length} tareas\n`, 'green');

  // Mostrar resumen
  log('📋 Tareas a crear:', 'bright');
  tasks.forEach((task) => {
    log(`   ${task.number}. ${task.name}`, 'blue');
  });

  // Confirmar (solo en modo interactivo)
  if (!DRY_RUN && process.stdin.isTTY) {
    log('\n⚠️  Esto creará issues reales en GitHub.', 'yellow');
    log('   Presiona Ctrl+C para cancelar, o Enter para continuar...', 'yellow');

    try {
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      await new Promise((resolve) => {
        rl.question('', () => {
          rl.close();
          resolve();
        });
      });
    } catch (error) {
      // Si no hay readline o hay error, continuar
      log('   Continuando automáticamente...', 'blue');
    }
  } else if (!DRY_RUN) {
    log('\n⚠️  Creando issues (modo no-interactivo)...', 'yellow');
  }

  // Crear issues
  log('\n📝 Creando issues...\n', 'bright');
  log(`📦 Repositorio: ${OWNER}/${REPO}`, 'blue');
  log(
    `📋 Proyecto: #${PROJECT_NUMBER} (https://github.com/users/${OWNER}/projects/${PROJECT_NUMBER})\n`,
    'blue',
  );

  const results = [];

  for (const task of tasks) {
    log(`Creando tarea ${task.number}: ${task.name}...`, 'blue');
    const issueResult = createIssue(task);

    if (issueResult && !DRY_RUN) {
      // Agregar al proyecto
      log(`   Agregando al proyecto...`, 'blue');
      addIssueToProject(issueResult.number);
      results.push({ task, issueUrl: issueResult.url, issueNumber: issueResult.number });
    } else if (DRY_RUN) {
      results.push({ task, issueUrl: null, issueNumber: null });
    } else {
      results.push({ task, issueUrl: null, issueNumber: null });
    }

    // Pequeña pausa para no sobrecargar la API
    if (!DRY_RUN) {
      require('child_process').execSync('sleep 2', { stdio: 'ignore' });
    }
  }

  // Resumen
  log('\n📊 Resumen:', 'bright');
  const created = results.filter((r) => r.issueUrl).length;
  const failed = results.filter((r) => !r.issueUrl).length;

  log(`   ✅ Creados: ${created}`, 'green');
  if (failed > 0) {
    log(`   ❌ Fallidos: ${failed}`, 'red');
  }

  if (!DRY_RUN && created > 0) {
    log('\n🔗 Issues creados:', 'bright');
    results.forEach(({ task, issueUrl }) => {
      if (issueUrl) {
        log(`   ${task.number}. ${issueUrl}`, 'blue');
      }
    });
    log(`\n📋 Ver todos los issues en el proyecto:`, 'bright');
    log(`   https://github.com/users/${OWNER}/projects/${PROJECT_NUMBER}`, 'blue');
  }

  log('\n✨ ¡Completado!', 'green');
}

// Ejecutar
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { parseTasksFile, createIssue };
