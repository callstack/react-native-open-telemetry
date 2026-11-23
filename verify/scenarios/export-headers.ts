import {scenario} from '../harness/scenario';

/**
 * Configured export headers are sent on every export request: the collector's `<n>.headers.json` for this
 * scenario contains `x-api-key: test` (Tasks 16, 19; checked by the core tests next to the span compare).
 */
export default scenario(
  'export-headers',
  async ({tracer, at}) => {
    tracer.startSpan('headers', {startTime: at(0)}).end(at(10));
  },
  {pending: true}, // Tasks 16, 19
);
