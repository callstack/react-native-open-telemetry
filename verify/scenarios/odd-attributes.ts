import {scenario} from '../harness/scenario';

export default scenario('odd-attributes', async ({tracer, at}) => {
  tracer
    .startSpan('odd', {
      startTime: at(0),
      attributes: {nan: NaN, inf: Infinity, negZero: -0, big: 2 ** 53 + 2, empty: [],
        // not representable on the seam: dropped by toSeamSpan, still exported by upstream
        nul: null, obj: {id: 1}, mixed: ['a', 1], withNull: ['a', null]} as any,
    })
    .end(at(10));
});
