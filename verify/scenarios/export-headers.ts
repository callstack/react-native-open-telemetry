import {scenario} from '../harness/scenario';

/**
 * Configured export headers are sent on every export request: the collector's `<n>.headers.json` for this
 * scenario contains `x-api-key: test`. Tasks 16/19 add it to the fixtures `NAMES` with a per-scenario fixture
 * config `exportHeaders: [{key: 'x-api-key', value: 'test'}]` and assert `headers.json` explicitly.
 */
export default scenario(
  'export-headers',
  async ({tracer, at}) => {
    tracer.startSpan('headers', {startTime: at(0)}).end(at(10));
  },
  {runners: ['e2e'], pending: true}, // Tasks 16, 19
);
