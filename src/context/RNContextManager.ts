import type {Context} from '@opentelemetry/api';
import {StackContextManager} from '@opentelemetry/sdk-trace';

/** StackContextManager plus a raw enter/leave primitive for the patch wrappers (§6.1). */
export class RNContextManager extends StackContextManager {
  /** Makes `ctx` active and returns the previous context; the caller restores it with another swap. */
  swap(ctx: Context): Context {
    const prev = this._currentContext;
    this._currentContext = ctx;
    return prev;
  }
}
