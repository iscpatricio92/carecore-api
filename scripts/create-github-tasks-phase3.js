#!/usr/bin/env node

/**
 * Script para crear issues de GitHub desde el archivo de tareas de la Fase 3
 * Incluye creación de Historia de Usuario (HU) y vinculación de tareas como hijos
 *
 * Requisitos:
 * - GitHub CLI instalado: https://cli.github.com/
 * - Autenticado: gh auth login
 *
 * Uso:
 *   node scripts/create-github-tasks-phase3.js
 *   node scripts/create-github-tasks-phase3.js --dry-run  # Solo muestra lo que haría
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
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Parsear el archivo de tareas
function parseTasksFile() {
  const tasksFile = path.join(__dirname, '../docs/tasks/PHASE3_SECURITY_AND_VERIFICATION.md');

  if (!fs.existsSync(tasksFile)) {
    log(`❌ Archivo no encontrado: ${tasksFile}`, 'red');
    process.exit(1);
  }

  const content = fs.readFileSync(tasksFile, 'utf-8');
  const tasks = [];

  // Buscar la Historia de Usuario (HU)
  const huMatch = content.match(
    /### HU: (.+?)\n\n\*\*Como\*\* (.+?)\n\*\*Quiero\*\* (.+?)\n\*\*Para\*\* (.+?)\n\n#### Criterios de Aceptación\n\n([\s\S]+?)\n\n#### Tareas Relacionadas/,
  );

  let hu = null;
  if (huMatch) {
    hu = {
      title: huMatch[1].trim(),
      como: huMatch[2].trim(),
      quiero: huMatch[3].trim(),
      para: huMatch[4].trim(),
      criterios: huMatch[5].trim(),
    };
  }

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

  return { hu, tasks };
}

// Crear Historia de Usuario (HU)
function createUserStory(hu) {
  if (!hu) {
    log('⚠️  No se encontró Historia de Usuario en el archivo', 'yellow');
    return null;
  }

  const body = `## Historia de Usuario

**Como** ${hu.como}
**Quiero** ${hu.quiero}
**Para** ${hu.para}

### Criterios de Aceptación

${hu.criterios}

---

**Fase 3: Seguridad Avanzada y Verificación**

Ver [PHASE3_SECURITY_AND_VERIFICATION.md](../docs/tasks/PHASE3_SECURITY_AND_VERIFICATION.md) para tareas detalladas.
Ver [AUTH_IMPLEMENTATION_PLAN.md](../docs/AUTH_IMPLEMENTATION_PLAN.md) para contexto completo.`;

  if (DRY_RUN) {
    log(`\n📖 [DRY RUN] Crearía Historia de Usuario:`, 'yellow');
    log(`   Título: ${hu.title}`, 'cyan');
    log(`   Body length: ${body.length} caracteres`, 'blue');
    return null;
  }

  const tmpFile = path.join(__dirname, '..', `.tmp-hu-phase3-${Date.now()}.md`);

  try {
    fs.writeFileSync(tmpFile, body, 'utf-8');

    const command = [
      'gh issue create',
      `--title "${hu.title.replace(/"/g, '\\"')}"`,
      `--body-file "${tmpFile}"`,
      `--label "enhancement,auth,phase-3,security,user-story"`,
      `--repo "${OWNER}/${REPO}"`,
    ].join(' ');

    const output = execSync(command, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 1024 * 1024 * 10,
      timeout: 30000,
    });

    const issueUrl = output.trim();
    const issueNumber = issueUrl.match(/\/issues\/(\d+)/)?.[1];

    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }

    if (issueNumber) {
      log(`✅ Historia de Usuario creada: ${issueUrl}`, 'green');
      return { url: issueUrl, number: issueNumber };
    }

    return null;
  } catch (error) {
    if (fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
    log(`❌ Error creando HU: ${error.message}`, 'red');
    return null;
  }
}

// Crear issue en GitHub usando archivo temporal para el body
function createIssue(task, parentIssueNumber = null) {
  const labels = task.labels.join(',');
  const body = task.description;

  // Agregar metadata al body
  let fullBody = `${body}\n\n---\n\n**Tarea ${task.number} de la Fase 3: Seguridad Avanzada y Verificación**\n\nVer [PHASE3_SECURITY_AND_VERIFICATION.md](../docs/tasks/PHASE3_SECURITY_AND_VERIFICATION.md) para contexto completo.`;

  if (parentIssueNumber) {
    fullBody += `\n\n**Parent Issue:** #${parentIssueNumber}`;
  }

  if (DRY_RUN) {
    log(`\n📝 [DRY RUN] Crearía issue:`, 'yellow');
    log(`   Título: ${task.title}`, 'blue');
    log(`   Labels: ${labels}`, 'blue');
    log(`   Parent: ${parentIssueNumber ? `#${parentIssueNumber} (HU)` : 'None'}`, 'blue');
    log(`   Body length: ${fullBody.length} caracteres`, 'blue');
    return null;
  }

  // Crear archivo temporal para el body
  const tmpDir = path.join(__dirname, '..');
  const tmpFile = path.join(tmpDir, `.tmp-issue-phase3-${task.number}-${Date.now()}.md`);

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

      // Vincular como hijo de la HU si hay parent
      if (parentIssueNumber && issueNumber) {
        linkAsChild(issueNumber, parentIssueNumber);
      }

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

// Vincular issue como hijo de otro issue (parent)
function linkAsChild(childIssueNumber, parentIssueNumber) {
  if (!childIssueNumber || !parentIssueNumber) return false;

  try {
    // Usar GitHub API GraphQL para vincular issues
    const mutation = `
      mutation {
        updateIssue(input: {
          id: "${getIssueNodeId(childIssueNumber)}",
          body: "${getIssueBody(childIssueNumber)}\\n\\n**Parent:** #${parentIssueNumber}"
        }) {
          issue {
            id
          }
        }
      }
    `;

    // Alternativa: usar comentario para vincular
    // Esto es más simple y funciona mejor con GitHub Projects
    const comment = `This issue is a child of #${parentIssueNumber}`;

    try {
      execSync(
        `gh issue comment ${childIssueNumber} --body "${comment}" --repo "${OWNER}/${REPO}"`,
        {
          encoding: 'utf-8',
          stdio: 'pipe',
        },
      );

      // También actualizar el body del issue para incluir el parent
      const currentBody = getIssueBody(childIssueNumber);
      const updatedBody = currentBody + `\n\n**Parent Issue:** #${parentIssueNumber}`;

      execSync(
        `gh issue edit ${childIssueNumber} --body "${updatedBody.replace(/"/g, '\\"')}" --repo "${OWNER}/${REPO}"`,
        {
          encoding: 'utf-8',
          stdio: 'pipe',
        },
      );

      log(`   🔗 Vinculado como hijo de #${parentIssueNumber}`, 'cyan');
      return true;
    } catch (error) {
      log(`⚠️  No se pudo vincular a parent: ${error.message}`, 'yellow');
      return false;
    }
  } catch (error) {
    log(`⚠️  Error vinculando issue: ${error.message}`, 'yellow');
    return false;
  }
}

// Obtener node ID de un issue (para GraphQL)
function getIssueNodeId(issueNumber) {
  try {
    const query = `
      query {
        repository(owner: "${OWNER}", name: "${REPO}") {
          issue(number: ${issueNumber}) {
            id
          }
        }
      }
    `;

    const result = execSync(`gh api graphql -f query='${query.replace(/\n/g, ' ')}'`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    const data = JSON.parse(result);
    return data?.data?.repository?.issue?.id;
  } catch (error) {
    return null;
  }
}

// Obtener body de un issue
function getIssueBody(issueNumber) {
  try {
    const result = execSync(`gh issue view ${issueNumber} --repo "${OWNER}/${REPO}" --json body`, {
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    const data = JSON.parse(result);
    return data.body || '';
  } catch (error) {
    return '';
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
          timeout: 60000,
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
  log('🚀 Script de creación de issues para Fase 3: Seguridad Avanzada y Verificación\n', 'bright');

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
  const { hu, tasks } = parseTasksFile();
  log(`✅ Encontrada HU y ${tasks.length} tareas\n`, 'green');

  // Mostrar resumen
  if (hu) {
    log('📖 Historia de Usuario:', 'bright');
    log(`   ${hu.title}`, 'cyan');
  }
  log('\n📋 Tareas a crear:', 'bright');
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
      // Si no hay TTY, continuar sin confirmación
    }
  }

  let huIssueNumber = null;

  // Crear Historia de Usuario primero
  if (hu) {
    log('\n📖 Creando Historia de Usuario...', 'bright');
    const huIssue = createUserStory(hu);
    if (huIssue) {
      huIssueNumber = huIssue.number;
      addIssueToProject(huIssueNumber);
    }
    log('');
  }

  // Crear issues de tareas
  log('📝 Creando issues de tareas...\n', 'bright');
  const createdIssues = [];

  for (const task of tasks) {
    log(`\n📋 Creando tarea ${task.number}: ${task.name}`, 'blue');
    const issue = createIssue(task, huIssueNumber);

    if (issue) {
      createdIssues.push(issue);
      addIssueToProject(issue.number);
    }

    // Pequeña pausa para evitar rate limiting
    if (!DRY_RUN && task.number < tasks.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Resumen final
  log('\n' + '='.repeat(80), 'bright');
  log('✅ Resumen de creación de issues', 'bright');
  log('='.repeat(80), 'bright');

  if (huIssueNumber) {
    log(`\n📖 Historia de Usuario:`, 'cyan');
    log(`   https://github.com/${OWNER}/${REPO}/issues/${huIssueNumber}`, 'blue');
  }

  log(`\n📋 Issues de tareas creados: ${createdIssues.length}/${tasks.length}`, 'green');
  createdIssues.forEach((issue) => {
    log(`   ${issue.url}`, 'blue');
  });

  if (!DRY_RUN) {
    log(
      `\n📋 Proyecto: #${PROJECT_NUMBER} (https://github.com/users/${OWNER}/projects/${PROJECT_NUMBER})\n`,
      'cyan',
    );
  }

  log('✅ Proceso completado!', 'green');
}

// Ejecutar
main().catch((error) => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  if (error.stack) {
    log(`\nStack trace:\n${error.stack}`, 'red');
  }
  process.exit(1);
});
