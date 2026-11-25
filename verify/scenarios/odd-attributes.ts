import {scenario} from '../harness/scenario';

export default scenario('odd-attributes', async ({tracer, at}) => {
  tracer
    .startSpan('odd', {
      startTime: at(0),
      attributes: {nan: NaN, inf: Infinity, negZero: -0, big: 2 ** 53 + 2, empty: []},
    })
    .end(at(10));
}, {runners: ['seam', 'e2e']});
