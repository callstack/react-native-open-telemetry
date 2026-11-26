import {ROOT_CONTEXT, type Context} from '@opentelemetry/api';
import type {RNContextManager} from './RNContextManager';

export const MARKER = Symbol.for('com.callstack.otel.patched');
const TIMERS = ['setTimeout', 'setImmediate', 'queueMicrotask', 'requestAnimationFrame'] as const;
type Fn = (...args: any[]) => any;

export type PatchMarker = {
  then: typeof Promise.prototype.then;
  setInterval: Fn;
  contextManager: RNContextManager;
} & Partial<Record<(typeof TIMERS)[number], Fn>>;

export function installContextPatch(cm: RNContextManager): void {
  const g = globalThis as any;
  if (g[MARKER]) return;
  const marker: PatchMarker = {then: Promise.prototype.then, setInterval: g.setInterval, contextManager: cm};

  const wrap = (ctx: Context, fn: Fn) =>
    function (this: unknown, v: unknown) {
      const prev = cm.swap(ctx);
      try {
        return fn.call(this, v);
      } finally {
        cm.swap(prev);
      }
    };
  const wrapArgs = (ctx: Context, fn: Fn) =>
    function (this: unknown, ...args: unknown[]) {
      const prev = cm.swap(ctx);
      try {
        return fn.apply(this, args);
      } finally {
        cm.swap(prev);
      }
    };

  const then = marker.then;
  Promise.prototype.then = function (this: Promise<unknown>, ok?: any, err?: any) {
    const ctx = cm.active();
    if (ctx === ROOT_CONTEXT) return then.call(this, ok, err);
    return then.call(
      this,
      typeof ok === 'function' ? wrap(ctx, ok) : ok,
      typeof err === 'function' ? wrap(ctx, err) : err,
    );
  } as typeof then;

  for (const name of TIMERS) {
    const orig: Fn | undefined = g[name];
    if (typeof orig !== 'function') continue;
    marker[name] = orig;
    g[name] = function (cb: unknown, ...rest: unknown[]) {
      const ctx = cm.active();
      return orig(ctx === ROOT_CONTEXT || typeof cb !== 'function' ? cb : wrapArgs(ctx, cb as Fn), ...rest);
    };
  }

  const setInterval = marker.setInterval;
  g.setInterval = function (cb: unknown, ...rest: unknown[]) {
    const root = cm.active() === ROOT_CONTEXT || typeof cb !== 'function';
    return setInterval(root ? cb : wrapArgs(ROOT_CONTEXT, cb as Fn), ...rest);
  };

  g[MARKER] = marker;
}
