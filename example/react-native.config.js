const path = require('path');

// Autolink the library from the repo root (no npm dependency needed).
module.exports = {
  dependencies: {
    'react-native-open-telemetry': {root: path.join(__dirname, '..')},
  },
};
