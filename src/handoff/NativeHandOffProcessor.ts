import {diag, TraceFlags} from '@opentelemetry/api';
import type {ReadableSpan, SpanProcessor} from '@opentelemetry/sdk-trace';
import type {Otel} from '../native/Otel.nitro';
import {toSeamSpan} from './toSeamSpan';

/** No buffer (spec §4.3): every sampled span goes straight to native. */
export class NativeHandOffProcessor implements SpanProcessor {
  private reported = false;
  constructor(private readonly native: Otel) {}
  onStart(): void {}
  onEnd(span: ReadableSpan): void {
    if (!(span.spanContext().traceFlags & TraceFlags.SAMPLED)) return;
    try {
      this.native.handOff([toSeamSpan(span)]);
    } catch (e) {
      // never into the app; one report, not one per span
      if (!this.reported) diag.error('handOff failed, dropping spans', e);
      this.reported = true;
    }
  }
  forceFlush(): Promise<void> {
    return this.native.flush(5000);
  }
  shutdown(): Promise<void> {
    return this.native.flush(5000);
  }
}
