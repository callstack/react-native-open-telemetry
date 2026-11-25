import type {Stage} from '../run';

const stage: Stage = {
  name: 'fast-js',
  order: 20,
  e2e: false,
  run({sh}) {
    sh(['bun', 'run', 'test', '--selectProjects', 'unit', 'scenarios', '--verbose', '--reporters=default']);
  },
};

export default stage;
