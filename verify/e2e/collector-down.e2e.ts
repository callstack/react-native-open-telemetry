import {anyTarget, expectScenario, platformOf, tapFlush} from './harness';

anyTarget('collector-down', async ({app, screen, collector, target}) => {
  await expectScenario('collector-down', target, {app, screen, collector}, {
    afterBegin: () => collector.refuse(503, 3),
    afterDone: async () => {
      const timeout = platformOf(target) === 'web' ? 10_000 : 6_000;
      for (let n = 1; n <= 3; n++) await tapFlush(screen, n, timeout);
      await new Promise(r => setTimeout(r, 1_000));
    },
  });
});
