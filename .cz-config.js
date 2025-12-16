module.exports = {
  types: [
    { value: 'feat', name: 'feat:     Nueva funcionalidad' },
    { value: 'fix', name: 'fix:      Corrección de bug' },
    { value: 'docs', name: 'docs:     Cambios en documentación' },
    { value: 'style', name: 'style:    Cambios de formato (no afectan código)' },
    { value: 'refactor', name: 'refactor: Refactorización de código' },
    { value: 'perf', name: 'perf:     Mejora de rendimiento' },
    { value: 'test', name: 'test:     Agregar o modificar tests' },
    { value: 'build', name: 'build:    Cambios en sistema de build' },
    { value: 'ci', name: 'ci:       Cambios en CI/CD' },
    { value: 'chore', name: 'chore:    Tareas de mantenimiento' },
    { value: 'revert', name: 'revert:   Revertir commit anterior' },
  ],

  scopes: [
    { name: 'api', description: 'Backend API (NestJS)' },
    { name: 'web', description: 'Frontend Web (Next.js)' },
    { name: 'mobile', description: 'Frontend Mobile (React Native)' },
    { name: 'shared', description: 'Código compartido (types, constants, utils)' },
    { name: 'infra', description: 'Infraestructura (scripts, config, CI/CD)' },
    { name: 'docker', description: 'Docker (Dockerfile, docker-compose, Makefile)' },
    { name: 'keycloak', description: 'Configuración de Keycloak' },
    { name: 'root', description: 'Cambios en root (docs, package.json, etc.)' },
  ],

  // Usar scope por defecto si no se especifica
  defaultScope: '',
  scopeOverrides: {
    // Scopes específicos por tipo de commit
    feat: [{ name: 'api' }, { name: 'web' }, { name: 'mobile' }, { name: 'shared' }],
    fix: [{ name: 'api' }, { name: 'web' }, { name: 'mobile' }, { name: 'shared' }],
    docs: [{ name: 'api' }, { name: 'web' }, { name: 'mobile' }, { name: 'root' }],
    build: [{ name: 'infra' }, { name: 'docker' }, { name: 'keycloak' }, { name: 'root' }],
  },

  // Permitir scope personalizado
  allowCustomScopes: true,
  allowBreakingChanges: ['feat', 'fix'],

  // Preguntas del prompt
  messages: {
    type: 'Selecciona el tipo de cambio que estás haciendo:',
    scope: '\nSelecciona el SCOPE de este cambio (opcional):',
    customScope: 'Ingresa el SCOPE personalizado:',
    subject: 'Escribe una descripción CORTA del cambio:\n',
    body: 'Proporciona una descripción MÁS DETALLADA del cambio (opcional). Usa "|" para nuevas líneas:\n',
    breaking: 'Lista los BREAKING CHANGES (opcional). Usa "|" para nuevas líneas:\n',
    footer: 'Issues cerrados por este cambio (opcional). E.g.: #31, #234:\n',
    confirmCommit: '¿Estás seguro de que quieres proceder con el commit anterior?',
  },

  // Límites de caracteres
  subjectLimit: 100,
  breaklineChar: '|',
  skipQuestions: [],

  // Prefijo para breaking changes
  breakingPrefix: 'BREAKING CHANGE:',
};
