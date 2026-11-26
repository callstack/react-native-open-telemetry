const path = require('path');

module.exports = {
  dependencies: {
    'react-native-open-telemetry': {root: path.join(__dirname, '..')},
    'react-native-test-native': {root: path.join(__dirname, '../example/modules/test-native')},
  },
};
