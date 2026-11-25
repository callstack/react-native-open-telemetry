import {ROOT_CONTEXT, createContextKey} from '@opentelemetry/api';
import {RNContextManager} from '../RNContextManager';
import {installContextPatch} from '../patch';

// Spy installed before the patch: it stands in for the original `then` and records what reaches it.
const realThen = Promise.prototype.then;
const seen: unknown[] = [];
Promise.prototype.then = function (this: Promise<unknown>, ok?: any, err?: any) {
  seen.push(ok);
  return realThen.call(this, ok, err);
} as typeof realThen;
const spy = Promise.prototype.then;

const cm = new RNContextManager().enable();
installContextPatch(cm);
const patched = {then: Promise.prototype.then, setTimeout: globalThis.setTimeout};

test('installContextPatch twice wraps once', () => {
  installContextPatch(new RNContextManager().enable());
  expect(Promise.prototype.then).toBe(patched.then);
  expect(globalThis.setTimeout).toBe(patched.setTimeout);
  expect((globalThis as any)[Symbol.for('com.callstack.otel.patched')]).toMatchObject({then: spy, contextManager: cm});
});

test('then registered at ROOT is not wrapped', () => {
  const cb = () => {};
  seen.length = 0;
  Promise.resolve().then(cb);
  expect(cm.active()).toBe(ROOT_CONTEXT);
  expect(seen).toEqual([cb]);
  const ctx = ROOT_CONTEXT.setValue(createContextKey('k'), 1);
  cm.with(ctx, () => Promise.resolve().then(cb));
  expect(seen[1]).not.toBe(cb);
});

test('timers forward extra arguments and restore the context', async () => {
  const ctx = ROOT_CONTEXT.setValue(createContextKey('k'), 1);
  const got = await new Promise<unknown[]>(r => cm.with(ctx, () => setTimeout((a, b) => r([a, b, cm.active()]), 0, 'a', 'b')));
  expect(got).toEqual(['a', 'b', ctx]);
  expect(cm.active()).toBe(ROOT_CONTEXT);
});

test('setInterval ticks run at ROOT', async () => {
  const ctx = ROOT_CONTEXT.setValue(createContextKey('k'), 1);
  const got = await new Promise(r =>
    cm.with(ctx, () => {
      const id = setInterval(() => (clearInterval(id), r(cm.active())), 0);
    }),
  );
  expect(got).toBe(ROOT_CONTEXT);
});
