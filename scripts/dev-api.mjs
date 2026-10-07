// Local adapter for the same Request/Response handler Vercel runs in production.
import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import * as inquiries from '../api/inquiries.js';
import * as admin from '../api/admin.js';
import * as content from '../api/content.js';
const port = Number(process.env.API_PORT || 8787);
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const routes = { '/api/inquiries': inquiries, '/api/admin': admin, '/api/content': content };
    const handler = routes[url.pathname]?.[req.method];
    if (!handler) { res.writeHead(404); res.end(); return; }
    const request = new Request(url, {
      method: req.method, headers: req.headers,
      ...(!['GET', 'HEAD'].includes(req.method) ? { body: Readable.toWeb(req), duplex: 'half' } : {}),
    });
    const response = await handler(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Náhled API teď není dostupný.' }));
  }
}).listen(port, '127.0.0.1', () => console.log(`Vercel inquiry API preview: http://127.0.0.1:${port}`));
