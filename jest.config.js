module.exports = {
  // Preset para NestJS con TypeScript
  preset: 'ts-jest',

  // Entorno de pruebas
  testEnvironment: 'node',

  // Directorio raíz para los tests
  rootDir: 'src',

  // Extensiones de archivos que Jest manejará
  moduleFileExtensions: ['js', 'json', 'ts'],

  // Patrones para encontrar archivos de test
  testMatch: ['**/*.spec.ts'],

  // Transformación de archivos TypeScript
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        // Usar el tsconfig.json del proyecto
        tsconfig: {
          module: 'commonjs',
          target: 'ES2021',
          sourceMap: true,
          experimentalDecorators: true,
          emitDecoratorMetadata: true,
        },
      },
    ],
  },

  // Mapeo de módulos (paths de TypeScript)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/common/(.*)$': '<rootDir>/common/$1',
    '^@/config/(.*)$': '<rootDir>/config/$1',
    '^@/modules/(.*)$': '<rootDir>/modules/$1',
  },

  // Directorios para resolver módulos
  moduleDirectories: ['node_modules', '<rootDir>'],

  // Patrones a ignorar en transformación
  transformIgnorePatterns: ['node_modules/(?!(uuid|@nestjs-pino)/)'],

  // Configuración de cobertura
  collectCoverage: false, // Solo cuando se solicite explícitamente
  collectCoverageFrom: [
    '**/*.(t|j)s',
    // Exclude test files
    '!**/*.spec.ts',
    // Exclude configuration files
    '!**/config/**',
    '!**/main.ts',
    // Exclude migrations (database schema changes)
    '!**/migrations/**',
    // Exclude entities (data structures, no business logic)
    '!**/entities/**',
    // Exclude DTOs (data transfer objects, validation only)
    '!**/*.dto.ts',
    // Exclude interfaces (type definitions)
    '!**/*.interface.ts',
    // Exclude decorators (simple metadata wrappers, tested indirectly)
    '!**/*.decorator.ts',
    // Exclude modules (NestJS module definitions)
    '!**/*.module.ts',
    // Exclude scripts (utility scripts)
    '!**/scripts/**',
    // Exclude node_modules
    '!**/node_modules/**',
  ],

  // Directorio para reportes de cobertura
  coverageDirectory: '../coverage',

  // Proveedor de cobertura (v8 es más rápido y preciso)
  coverageProvider: 'v8',

  // Reportes de cobertura
  coverageReporters: [
    'text', // Salida en consola
    'text-summary', // Resumen en consola
    'lcov', // Para herramientas como Codecov
    'html', // Reporte HTML navegable
    'json', // JSON completo
    'json-summary', // JSON resumido
  ],

  // Umbrales de cobertura (aumentados para mantener alta calidad)
  coverageThreshold: {
    global: {
      branches: 80, // 80% de cobertura de ramas
      functions: 80, // 80% de cobertura de funciones
      lines: 80, // 80% de cobertura de líneas
      statements: 80, // 80% de cobertura de statements
    },
  },

  // Rutas a ignorar en cobertura
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '\\.spec\\.ts$',
    '\\.dto\\.ts$',
    '\\.interface\\.ts$',
    '\\.decorator\\.ts$',
    '\\.module\\.ts$',
    '/migrations/',
    '/entities/',
    '/config/',
    '/scripts/',
    'main\\.ts$',
  ],

  // Configuración de mocks
  clearMocks: true, // Limpiar mocks entre tests
  restoreMocks: true, // Restaurar implementaciones originales
  resetMocks: true, // Resetear mocks entre tests

  // Configuración de ejecución
  verbose: true, // Mostrar información detallada
  silent: false, // No silenciar output
  bail: false, // Continuar ejecutando tests aunque uno falle

  // Timeout para tests (30 segundos por defecto)
  testTimeout: 30000,

  // Detección de problemas
  detectOpenHandles: true, // Detectar handles abiertos (ayuda a encontrar leaks)
  forceExit: false, // No forzar salida (mejor para detectar problemas)

  // Optimización de workers
  maxWorkers: '50%', // Usar 50% de los CPUs disponibles

  // Configuración de caché
  cache: true,
  cacheDirectory: '<rootDir>/../.jest-cache',

  // Archivos de setup (si existen)
  // setupFilesAfterEnv: ['<rootDir>/../test/setup.ts'],

  // Configuración de errores
  errorOnDeprecated: true, // Advertir sobre APIs deprecadas
};
