#!/usr/bin/env node

/**
 * Script para agregar issues existentes al proyecto de GitHub
 *
 * Uso:
 *   node scripts/add-issues-to-project.js
 */

const { execSync } = require('child_process');

const OWNER = 'iscpatricio92';
const REPO = 'carecore-api';
const PROJECT_NUMBER = '2';

// Issues creados (del output anterior)
const ISSUE_NUMBERS = [21, 22, 23, 24, 25, 26, 27, 28];

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

// Agregar issue a GitHub Project
function addIssueToProject(issueNumber) {
  try {
    log(`Agregando issue #${issueNumber} al proyecto...`, 'blue');

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

    log(`   Proyecto encontrado: ${projectData?.data?.user?.projectV2?.title}`, 'blue');

    // Obtener el node ID del issue
    const issueQuery = `
      query {
        repository(owner: "${OWNER}", name: "${REPO}") {
          issue(number: ${issueNumber}) {
            id
            title
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

    log(`   Issue encontrado: ${issueData?.data?.repository?.issue?.title}`, 'blue');

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

    log(`✅ Issue #${issueNumber} agregado al proyecto`, 'green');
    return true;
  } catch (error) {
    const errorOutput = error.stderr?.toString() || error.stdout?.toString() || '';
    log(`❌ Error agregando issue #${issueNumber}:`, 'red');
    if (errorOutput) {
      log(`   ${errorOutput.substring(0, 300)}`, 'red');
    }
    return false;
  }
}

// Main
function main() {
  log('🚀 Agregando issues al proyecto de GitHub\n', 'bright');
  log(`📦 Repositorio: ${OWNER}/${REPO}`, 'blue');
  log(`📋 Proyecto: #${PROJECT_NUMBER}\n`, 'blue');

  const results = [];

  for (const issueNumber of ISSUE_NUMBERS) {
    const success = addIssueToProject(issueNumber);
    results.push({ issueNumber, success });

    // Pequeña pausa para no sobrecargar la API
    require('child_process').execSync('sleep 1', { stdio: 'ignore' });
  }

  // Resumen
  log('\n📊 Resumen:', 'bright');
  const success = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  log(`   ✅ Agregados: ${success}`, 'green');
  if (failed > 0) {
    log(`   ❌ Fallidos: ${failed}`, 'red');
    log('\n⚠️  Si algunos fallaron, puede ser que:', 'yellow');
    log(
      '   - El token no tiene permisos write:project (necesitas autenticarte con más permisos)',
      'yellow',
    );
    log('   - Los issues ya están en el proyecto', 'yellow');
    log('   - El proyecto no existe o no tienes acceso', 'yellow');
  }

  if (success > 0) {
    log(`\n📋 Ver el proyecto:`, 'bright');
    log(`   https://github.com/users/${OWNER}/projects/${PROJECT_NUMBER}`, 'blue');
  }

  log('\n✨ ¡Completado!', 'green');
}

// Ejecutar
if (require.main === module) {
  main();
}

module.exports = { addIssueToProject };
