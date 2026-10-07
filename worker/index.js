import { validateInquiry } from '../src/lib/inquiry.js';
import { inquiryDatabase } from './database.js';

const json = (body, status = 200, extra = {}) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
async function digest(text) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
async function readLimitedBody(request) {
  if (Number(request.headers.get('Content-Length')) > 16384) return null;
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16384) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
  return new TextDecoder().decode(buffer);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/inquiries') {
      if (url.pathname.startsWith('/api/')) return json({ message: 'Nenalezeno.' }, 404);
      return env.ASSETS.fetch(request);
    }
    if (request.method !== 'POST') return json({ message: 'Tato metoda není dostupná.' }, 405, { Allow: 'POST' });
    const origin = request.headers.get('Origin');
    if (origin !== url.origin || request.headers.get('Sec-Fetch-Site') === 'cross-site') return json({ message: 'Poptávku odešlete přímo z našeho webu.' }, 403);
    if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) return json({ message: 'Nepodporovaný formát zprávy.' }, 415);
    let input;
    try {
      const text = await readLimitedBody(request);
      if (text === null) return json({ message: 'Zpráva je příliš dlouhá.' }, 413);
      input = JSON.parse(text);
    } catch { return json({ message: 'Zprávu se nepodařilo přečíst.' }, 400); }
    if (!input || typeof input !== 'object' || Array.isArray(input) || input.website) return json({ message: 'Zprávu se nepodařilo ověřit.' }, 400);
    if (typeof input.submissionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.submissionId)) return json({ message: 'Obnovte stránku a zkuste to prosím znovu.' }, 400);
    const { data, errors, valid } = validateInquiry(input);
    if (!valid) return json({ message: 'Zkontrolujte prosím označená pole.', errors }, 400);
    try {
      const db = inquiryDatabase(env);
      const hash = await digest(JSON.stringify(data));
      const existing = await db.find(input.submissionId);
      if (existing) return existing.payload_hash === hash ? json({ reference: existing.reference }) : json({ message: 'Obsah poptávky se změnil. Obnovte stránku.' }, 409);
      const now = Date.now();
      const windowStart = Math.floor(now / 900000) * 900000;
      const client = request.headers.get('CF-Connecting-IP') || 'local';
      const key = await digest(`${client}:${windowStart}`);
      if (!await db.consumeQuota(key, windowStart)) return json({ message: 'Přišlo příliš mnoho poptávek najednou. Počkejte 15 minut nebo nám napište e-mail.' }, 429, { 'Retry-After': '900' });
      const reference = `PB-${input.submissionId.slice(0, 8).toUpperCase()}`;
      await db.save(input.submissionId, reference, data, hash, now);
      const saved = await db.find(input.submissionId);
      if (saved?.payload_hash !== hash) return json({ message: 'Poptávku se nepodařilo ověřit. Obnovte stránku.' }, 409);
      return json({ reference: saved.reference }, 201);
    } catch (error) {
      console.error('Inquiry persistence failed', error instanceof Error ? error.message : 'unknown');
      return json({ message: 'Poptávku teď nemůžeme uložit. Vaše údaje zůstaly vyplněné; zkuste to znovu nebo použijte e-mail.' }, 503);
    }
  },
};
