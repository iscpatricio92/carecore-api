// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// 2. Let Metro know where to resolve packages and workspaces
// This allows Metro to find packages in both the project and monorepo root
// Order matters: check project node_modules first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Configure extraNodeModules to help Metro resolve workspace packages
// This ensures @carecore/shared can be resolved from the workspace
config.resolver.extraNodeModules = {
  '@carecore/shared': path.resolve(monorepoRoot, 'packages/shared'),
};

// Note: We don't set disableHierarchicalLookup to true because it breaks
// Expo's internal module resolution. Metro will check nodeModulesPaths first,
// then do hierarchical lookup as a fallback, which is needed for Expo packages.

module.exports = config;
