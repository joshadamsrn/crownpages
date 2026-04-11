const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Clear any potential caching issues
config.resetCache = true;

// Explicitly configure resolver
config.resolver = {
  ...config.resolver,
  // Explicitly list node_modules paths
  nodeModulesPaths: [
    path.resolve(__dirname, 'node_modules'),
  ],
  // Ensure scoped packages are resolved
  extraNodeModules: new Proxy(
    {},
    {
      get: (target, name) => {
        if (name === '@crown-pages') {
          return path.join(__dirname, 'node_modules/@crown-pages');
        }
        return path.join(__dirname, 'node_modules', name);
      },
    }
  ),
};

module.exports = config;
