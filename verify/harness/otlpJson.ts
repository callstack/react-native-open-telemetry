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

// Hex id strings (OTLP/JSON) -> bytes, so fromObject does not base64-decode them.
function idsToBytes(v: any): any {
  if (Array.isArray(v)) return v.map(idsToBytes);
  if (v && typeof v === 'object' && !(v instanceof Uint8Array)) {
    const out: any = {};
    for (const [k, x] of Object.entries(v))
      out[k] =
        ID_KEYS.includes(k) && typeof x === 'string'
          ? Buffer.from(x, 'hex')
          : idsToBytes(x);
    return out;
  }
  return v;
}

function format(v: any, key?: string): any {
  if (Array.isArray(v)) return v.map(x => format(x));
  if (v instanceof Uint8Array) {
    // ids are hex, any other bytes (AnyValue.bytesValue) are base64 per proto3 JSON
    if (key && ID_KEYS.includes(key))
      return v.length ? Buffer.from(v).toString('hex') : undefined;
    return Buffer.from(v).toString('base64');
  }
  if (typeof v === 'number' && !Number.isFinite(v))
    return Number.isNaN(v) ? 'NaN' : v > 0 ? 'Infinity' : '-Infinity';
  if (v && typeof v === 'object') {
    const out: any = {};
    for (const [k, x] of Object.entries(v)) {
      const f = format(x, k);
      if (f !== undefined) out[k] = f;
    }
    return out;
  }
  return v;
}

/**
 * Proto3 JSON: hex ids, int64 as decimal strings, enums as numbers, defaults omitted,
 * NaN/Infinity as strings. Accepts protobuf-decoded objects or OTLP/JSON (hex ids).
 * -0 stays -0 in the returned object; JSON.stringify writes it as 0.
 */
export function toOtlpJson(req: ExportTraceServiceRequest): OtlpJson {
  const obj = Req.toObject(Req.fromObject(idsToBytes(req)), {
    longs: String,
    enums: Number,
    bytes: Buffer as any,
  });
  return format(obj);
}
