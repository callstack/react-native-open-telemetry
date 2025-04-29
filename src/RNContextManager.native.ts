import { ROOT_CONTEXT, propagation } from '@opentelemetry/api';
import type {Context, ContextManager} from '@opentelemetry/api';
import NATIVE from './NativeOpenTelemetry';

/**
 * Stack Context Manager for managing the state in JS,
 * enriched with native-sync capabilities.
 */
export class RNContextManager implements ContextManager {
  private _enabled = false;
  public _currentContext = ROOT_CONTEXT;

  // Bind a function to a given context.
  // This is the same as the default helper.
  private _bindFunction<T extends Function>(
    context = ROOT_CONTEXT,
    target: T
  ): T {
    const manager = this;
    const contextWrapper = function (this: unknown, ...args: unknown[]) {
      return manager.with(context, () => target.apply(this, args));
    };
    Object.defineProperty(contextWrapper, 'length', {
      enumerable: false,
      configurable: true,
      writable: false,
      value: target.length,
    });
    return contextWrapper as unknown as T;
  }

  private _syncToNative() {
    const carrier = {};
    propagation.inject(this._currentContext, carrier);
    console.log({ carrier });
    NATIVE.setContext(carrier);
  }

  /**
   * Returns the active (current) context.
   */
  active(): Context {
    return this._currentContext;
  }

  /**
   * Binds the provided context to a target function (or object) so that when that target is called,
   * the provided context is active during its execution.
   */
  bind<T>(context: Context, target: T): T {
    if (context === undefined) {
      context = this.active();
    }
    if (typeof target === 'function') {
      return this._bindFunction(context, target);
    }
    return target;
  }

  /**
   * Disables the context manager and resets the current context to ROOT_CONTEXT.
   * You could also choose to sync this state to Native if desired.
   */
  disable(): this {
    this._currentContext = ROOT_CONTEXT;
    this._enabled = false;
    // Optionally, notify Native with the ROOT_CONTEXT:
    this._syncToNative();
    return this;
  }

  /**
   * Enables the context manager and initializes the current context.
   * Synchronizes the initial state from Native.
   */
  enable(): this {
    if (this._enabled) {
      return this;
    }
    this._enabled = true;
    // Load any native context into the JS side
    // this._currentContext = NATIVE.getContext() ?? ROOT_CONTEXT;
    this._currentContext = ROOT_CONTEXT;
    return this;
  }

  /**
   * Executes the function [fn] with the provided [context] as the active context.
   * Ensures that the updated context is sent to Native before and after the call.
   */
  with<A extends unknown[], F extends (...args: A) => ReturnType<F>>(
    context: Context | null,
    fn: F,
    thisArg?: ThisParameterType<F>,
    ...args: A
  ): ReturnType<F> {
    const previousContext = this._currentContext;
    // Set new active context (or fallback to ROOT_CONTEXT)
    this._currentContext = context || ROOT_CONTEXT;

    // Sync the new active context to Native
    this._syncToNative();

    try {
      return fn.call(thisArg, ...args);
    } finally {
      // Restore previous context
      this._currentContext = previousContext;
      // Re-sync the restored context back to Native
      this._syncToNative();
    }
  }
}
