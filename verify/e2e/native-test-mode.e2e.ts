import {expect} from 'e2e';
import {test} from './harness';

test('native test mode reaches initialize', async ({app, screen}) => {
  await app.open();
  await expect(screen.getByTestId('native-test-mode')).toHaveText('native testMode=true');
});
