import path from 'path';
import protobuf from 'protobufjs';

export type OtlpJson = {resourceSpans?: any[]};
export type ExportTraceServiceRequest = Record<string, any>;

const root = new protobuf.Root();
root.resolvePath = (_origin, target) =>
  path.isAbsolute(target) ? target : path.join(__dirname, 'proto', target);
root.loadSync('opentelemetry/proto/collector/trace/v1/trace_service.proto');
const Req = root.lookupType(
  'opentelemetry.proto.collector.trace.v1.ExportTraceServiceRequest',
);

export const decodeRequest = (buf: Uint8Array): ExportTraceServiceRequest =>
  Req.decode(buf) as any;

const ID_KEYS = ['traceId', 'spanId', 'parentSpanId'];

function hexIds(v: any): any {
  if (Array.isArray(v)) return v.map(hexIds);
  if (v && typeof v === 'object') {
    const out: any = {};
    for (const [k, x] of Object.entries(v)) {
      if (ID_KEYS.includes(k) && x instanceof Uint8Array) {
        if (x.length) out[k] = Buffer.from(x).toString('hex');
      } else out[k] = hexIds(x);
    }
    return out;
  }
  return v;
}

/** Proto3 JSON: hex ids, int64 as decimal strings, enums as numbers, defaults omitted. */
export function toOtlpJson(req: ExportTraceServiceRequest): OtlpJson {
  const obj = Req.toObject(Req.fromObject(req), {
    longs: String,
    enums: Number,
    bytes: Buffer as any,
  });
  return hexIds(obj);
}
