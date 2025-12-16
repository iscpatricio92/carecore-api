// carecore-frontend/jest-setup.js

// Define React Native globals
global.__DEV__ = true;

// Import extended matchers from Jest Native
import '@testing-library/jest-native/extend-expect';

// Clean up after all tests
afterAll(async () => {
  // Wait for any pending promises to resolve
  await new Promise((resolve) => setImmediate(resolve));
});
