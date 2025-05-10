import type { Context } from "@opentelemetry/api";
import type {
  Span,
  SpanProcessor,
  ReadableSpan,
} from "@opentelemetry/sdk-trace-base";

type GetSessionId = () => string | null;

export class SessionIdProcessor implements SpanProcessor {
  getSessionId: GetSessionId;

  constructor(getSessionId: GetSessionId) {
    this.getSessionId = getSessionId;
  }

  onStart(span: Span, _parentContext: Context): void {
    const sessionId = this.getSessionId();
    if (!sessionId) return;
    span.setAttribute("session.id", sessionId);
  }

  onEnd(_span: ReadableSpan): void {}

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
