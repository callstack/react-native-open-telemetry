import fs from 'fs';
import http from 'http';
import path from 'path';
import zlib from 'zlib';
import {normalize} from './normalize';
import {decodeRequest, toOtlpJson, type OtlpJson} from './otlpJson';

export type Collector = {
  url: string;
  begin(scenario: string, platform: string): void;
  end(): Promise<OtlpJson>;
  refuse(status: number, count: number): void;
  received(): number;
  close(): Promise<void>;
};

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': '*',
};

export async function startCollector(
  opts: {port?: number; artifactsDir?: string} = {},
): Promise<Collector> {
  const dir = opts.artifactsDir ?? path.join(__dirname, '..', 'artifacts');
  let cur: {name: string; requests: OtlpJson[]; n: number} | null = null;
  let refusal = {status: 0, count: 0};

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      let body = Buffer.concat(chunks);
      const send = (status: number, payload?: unknown) => {
        res.writeHead(status, {
          ...CORS,
          ...(payload === undefined ? {} : {'content-type': 'application/json'}),
        });
        res.end(payload === undefined ? undefined : JSON.stringify(payload));
      };
      try {
        if (req.headers['content-encoding'] === 'gzip') body = zlib.gunzipSync(body);
        const route = `${req.method} ${req.url?.split('?')[0]}`;
        if (req.method === 'OPTIONS') return send(204);
        if (route === 'POST /v1/traces') {
          if (refusal.count > 0) {
            refusal.count--;
            return send(refusal.status, {});
          }
          const isJson = (req.headers['content-type'] ?? '').includes('json');
          const json = isJson
            ? toOtlpJson(JSON.parse(body.toString()))
            : toOtlpJson(decodeRequest(body));
          if (cur) {
            const raw = path.join(dir, 'raw', cur.name);
            fs.mkdirSync(raw, {recursive: true});
            fs.writeFileSync(
              path.join(raw, `${cur.n}.${isJson ? 'json' : 'pb'}`),
              body,
            );
            fs.writeFileSync(
              path.join(raw, `${cur.n}.headers.json`),
              JSON.stringify(req.headers, null, 2),
            );
            cur.n++;
            cur.requests.push(json);
          }
          return send(200, {});
        }
        const ctl = body.length ? JSON.parse(body.toString()) : {};
        if (route === 'POST /_verify/begin') {
          c.begin(ctl.scenario, ctl.platform);
          return send(200, {});
        }
        if (route === 'POST /_verify/end')
          return void c.end().then(
            o => send(200, o),
            e => send(400, {error: String(e)}),
          );
        if (route === 'POST /_verify/refuse') {
          c.refuse(ctl.status, ctl.count);
          return send(200, {});
        }
        send(404, {});
      } catch (e) {
        send(400, {error: String(e)});
      }
    });
  });

  await new Promise<void>(r => server.listen(opts.port ?? 4318, r));
  const port = (server.address() as {port: number}).port;

  const c: Collector = {
    url: `http://localhost:${port}`,
    begin(scenario, platform) {
      for (const v of [scenario, platform])
        if (typeof v !== 'string' || !/^[\w.-]+$/.test(v) || v.includes('..'))
          throw new Error(`collector: bad scenario/platform name ${JSON.stringify(v)}`);
      refusal = {status: 0, count: 0};
      cur = {name: `${scenario}.${platform}`, requests: [], n: 0};
      fs.rmSync(path.join(dir, 'raw', cur.name), {recursive: true, force: true});
    },
    async end() {
      if (!cur) throw new Error('collector: end() without begin()');
      const out = normalize(cur.requests);
      fs.mkdirSync(dir, {recursive: true});
      fs.writeFileSync(
        path.join(dir, `${cur.name}.otlp.json`),
        JSON.stringify(out, null, 2) + '\n',
      );
      cur = null;
      return out;
    },
    refuse(status, count) {
      refusal = {status, count};
    },
    received: () => cur?.n ?? 0,
    close: () =>
      new Promise<void>(r => {
        server.closeAllConnections();
        server.close(() => r());
      }),
  };
  return c;
}
