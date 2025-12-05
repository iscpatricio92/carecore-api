/**
 * Jest E2E Setup File
 * This file runs before all E2E tests
 * Use it to set up test environment, mocks, or global configurations
 */

// Set test environment variables if not already set
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'test';
}

// Increase timeout for E2E tests that might take longer
jest.setTimeout(30000);

// Global test setup
beforeAll(() => {
  // Log test suite start
  console.log('🧪 Starting E2E test suite...');
});

afterAll(() => {
  // Log test suite completion
  console.log('✅ E2E test suite completed');
});
