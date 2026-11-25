import {scenario} from '../harness/scenario';

/**
 * Configured export headers are sent on every export request: the collector's `<n>.headers.json` for this
 * scenario contains `x-api-key: test` (every example app's init sets it; verify/e2e/export-headers.e2e.ts asserts it).
 */
export default scenario(
  'export-headers',
  async ({tracer, at}) => {
    tracer.startSpan('headers', {startTime: at(0)}).end(at(10));
  },
  {runners: ['e2e'], targets: ['android', 'ios', 'web']},
);
