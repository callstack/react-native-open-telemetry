import {scenario} from '../harness/scenario';

/**
 * Configured export headers are sent on every export request: the collector's `<n>.headers.json` for this
 * scenario contains `x-api-key: test`. Its seam fixture carries a per-scenario config `exportHeaders: [{key: 'x-api-key', value: 'test'}]`; fast-jvm asserts `headers.json`.
 */
export default scenario(
  'export-headers',
  async ({tracer, at}) => {
    tracer.startSpan('headers', {startTime: at(0)}).end(at(10));
  },
  {runners: ['seam', 'e2e'], targets: ['android', 'ios', 'web']}, // every example app's init sends x-api-key: test
);
