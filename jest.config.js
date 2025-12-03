module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/*.dto.ts',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: '../coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/common/(.*)$': '<rootDir>/common/$1',
    '^@/config/(.*)$': '<rootDir>/config/$1',
    '^@/modules/(.*)$': '<rootDir>/modules/$1',
  },
  transformIgnorePatterns: ['node_modules/(?!(uuid|@nestjs-pino)/)'],
};
