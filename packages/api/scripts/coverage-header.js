#!/usr/bin/env node

/**
 * Coverage Header Script
 * Adds a clear header to differentiate between Unit and E2E test coverage reports
 */

const args = process.argv.slice(2);
const testType = args[0] || 'UNIT';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
};

const headers = {
  UNIT: {
    emoji: '📊',
    title: 'UNIT TESTS',
    color: colors.blue,
    description: 'Code coverage from unit tests (spec files)',
  },
  E2E: {
    emoji: '🧪',
    title: 'E2E TESTS',
    color: colors.dim,
    description: 'Endpoint coverage from E2E tests (e2e-spec files)',
  },
};

const header = headers[testType] || headers.UNIT;

console.log('');
console.log(`${colors.bright}${'='.repeat(80)}${colors.reset}`);
console.log(
  `${colors.bright}${header.color}${header.emoji} ${header.title} - Coverage Report${colors.reset}`,
);
console.log(`${colors.dim}${header.description}${colors.reset}`);
console.log(`${colors.bright}${'='.repeat(80)}${colors.reset}`);
console.log('');
