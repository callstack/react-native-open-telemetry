const path = require('path');

// Autolink the library from the repo root and the example-only TestNative module (no npm dependency needed).
module.exports = {
  dependencies: {
    'react-native-open-telemetry': {root: path.join(__dirname, '..')},
    'react-native-test-native': {root: path.join(__dirname, 'modules/test-native')},
  },
};
