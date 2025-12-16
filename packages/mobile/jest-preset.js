// Custom jest preset that extends jest-expo without the problematic setup
const jestExpoPreset = require('jest-expo/jest-preset');

// Remove the problematic setup file
const setupFiles = (jestExpoPreset.setupFiles || []).filter(
  (file) => !file.includes('jest-expo/src/preset/setup'),
);

module.exports = {
  ...jestExpoPreset,
  setupFiles,
  // Add our own setup files
  setupFilesAfterEnv: ['<rootDir>/jest-setup.js'],
};
