export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Tipo debe ser uno de los siguientes
    'type-enum': [
      2,
      'always',
      [
        'feat', // Nueva funcionalidad
        'fix', // Corrección de bug
        'docs', // Documentación
        'style', // Cambios de formato (no afectan código)
        'refactor', // Refactorización
        'perf', // Mejora de rendimiento
        'test', // Tests
        'build', // Sistema de build
        'ci', // CI/CD
        'chore', // Tareas de mantenimiento
        'revert', // Revertir commit
      ],
    ],
    // El tipo debe estar en minúsculas
    'type-case': [2, 'always', 'lower-case'],
    // El tipo no puede estar vacío
    'type-empty': [2, 'never'],
    // El scope es opcional pero debe estar en minúsculas si existe
    'scope-case': [2, 'always', 'lower-case'],
    // Scopes permitidos (opcional, pero recomendado para consistencia)
    'scope-enum': [1, 'always', ['api', 'web', 'mobile', 'shared', 'infra', 'keycloak', 'root']],
    // El subject no puede estar vacío
    'subject-empty': [2, 'never'],
    // El subject debe terminar con punto
    'subject-full-stop': [2, 'never', '.'],
    // El subject debe tener máximo 100 caracteres
    'subject-max-length': [2, 'always', 100],
    // El header completo debe tener máximo 100 caracteres
    'header-max-length': [2, 'always', 100],
    // El body debe tener una línea en blanco antes
    'body-leading-blank': [2, 'always'],
    // El footer debe tener una línea en blanco antes
    'footer-leading-blank': [2, 'always'],
  },
};
