import {expect} from 'e2e';
import {MOBILE, test} from './harness';

test('native test mode reaches initialize', {platforms: MOBILE}, async ({app, screen}) => {
  await app.open();
  await expect(screen.getByTestId('native-test-mode')).toHaveText('native testMode=true');
});
