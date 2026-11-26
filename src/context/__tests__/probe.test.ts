import {context} from '@opentelemetry/api';
import {DEGRADED_ATTR, probeAsyncContext, scopeAttributes} from '../probe';
import '../../setup';

const nativeStep = new Function('context', 'return (async () => { await null; return context.active(); })')(context);

test('probe resolves true when then is patched and false when async is native', async () => {
  const err = jest.spyOn(console, 'error').mockImplementation(() => {});
  expect(await probeAsyncContext(() => Promise.resolve().then(() => context.active()))).toBe(true);
  expect(scopeAttributes()).toEqual({});
  expect(err).not.toHaveBeenCalled();

  expect(await probeAsyncContext(nativeStep)).toBe(false);
  expect(err).toHaveBeenCalledTimes(1);
  expect(String(err.mock.calls[0]?.[0])).toMatch(/await/);
  expect(scopeAttributes()).toEqual({[DEGRADED_ATTR]: true});
});
