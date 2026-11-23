import type {Stage} from '../run';

const stage: Stage = {
  name: 'fast-js',
  order: 20,
  e2e: false,
  run({sh}) {
    // the OTLP node transport uses dynamic import()
    sh(['env', 'NODE_OPTIONS=--experimental-vm-modules', 'bunx', 'jest', '--selectProjects', 'scenarios', '--verbose', '--reporters=default']);
  },
};

export default stage;
