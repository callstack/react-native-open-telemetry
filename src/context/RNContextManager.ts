import type {Context} from '@opentelemetry/api';
import {StackContextManager} from '@opentelemetry/sdk-trace';

export class RNContextManager extends StackContextManager {
  swap(ctx: Context): Context {
    const prev = this._currentContext;
    this._currentContext = ctx;
    return prev;
  }
}
