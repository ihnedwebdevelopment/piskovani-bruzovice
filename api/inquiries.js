// Vercel Function: přijme poptávku z formuláře a pošle ji e-mailem přes Resend.
// Potřebné proměnné prostředí (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  – API klíč z https://resend.com (povinné)
//   INQUIRY_TO      – příjemce (výchozí gadula.jiri@seznam.cz)
//   INQUIRY_FROM    – adresa na ověřené doméně piskovanibruzovice.cz
import { validateInquiry } from '../src/lib/inquiry.js';

const MAX_BODY = 16384;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const json = (body, status = 200, extra = {}) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });

const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function requestOrigin(request) {
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || url.host;
  const proto = request.headers.get('x-forwarded-proto') || url.protocol.replace(':', '');
  return `${proto}://${host}`;
}

const methodNotAllowed = () => json({ message: 'Tato metoda není dostupná.' }, 405, { Allow: 'POST' });
export const GET = methodNotAllowed;
export const PUT = methodNotAllowed;
export const DELETE = methodNotAllowed;
export const PATCH = methodNotAllowed;
export const HEAD = methodNotAllowed;
export const OPTIONS = methodNotAllowed;

async function readBody(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY) return null;
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function POST(request) {
  const origin = request.headers.get('origin');
  if (origin !== requestOrigin(request) || request.headers.get('sec-fetch-site') === 'cross-site') {
    return json({ message: 'Poptávku odešlete přímo z našeho webu.' }, 403);
  }
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return json({ message: 'Nepodporovaný formát zprávy.' }, 415);
  }

  let input;
  try {
    const text = await readBody(request);
    if (text === null) return json({ message: 'Zpráva je příliš dlouhá.' }, 413);
    input = JSON.parse(text);
  } catch {
    return json({ message: 'Zprávu se nepodařilo přečíst.' }, 400);
  }
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.website) {
    return json({ message: 'Zprávu se nepodařilo ověřit.' }, 400);
  }
  if (typeof input.submissionId !== 'string' || !UUID.test(input.submissionId)) {
    return json({ message: 'Obnovte stránku a zkuste to prosím znovu.' }, 400);
  }

  const { data, errors, valid } = validateInquiry(input);
  if (!valid) return json({ message: 'Zkontrolujte prosím označená pole.', errors }, 400);

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('RESEND_API_KEY is not set – inquiry was not delivered');
    return json({ message: 'Formulář teď nejde odeslat. Vaše údaje zůstaly vyplněné – použijte prosím odkaz „Raději e-mailem“.' }, 503);
  }

  const reference = `PB-${input.submissionId.slice(0, 8).toUpperCase()}`;
  const rows = [
    ['Číslo poptávky', reference],
    ['Druh zakázky', data.service],
    ['Jméno', data.name],
    ['E-mail', data.email],
    ['Telefon', data.phone || 'neuveden'],
    ['Místo realizace', data.location || 'dle domluvy'],
  ];
  const text = `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${data.message}\n`;
  const html = `<div style="background:#f7f4ec;padding:24px;font-family:Arial,sans-serif;color:#17231d"><div style="max-width:600px;margin:auto"><div style="background:#17231d;color:#fff;padding:28px;border-top:5px solid #f37846"><p style="color:#f9a17d;font-size:12px;letter-spacing:2px">PÍSKOVÁNÍ BRUZOVICE</p><h1 style="font-size:26px;margin:12px 0">Nová nezávazná poptávka</h1></div><div style="padding:24px;background:#fff"><table cellpadding="6" style="border-collapse:collapse;width:100%;font-size:14px">${rows
    .map(([k, v]) => `<tr><th align="left" style="color:#555">${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`)
    .join('')}</table><h2 style="font-size:18px;margin-top:28px">Popis zakázky</h2><p style="line-height:1.7;white-space:pre-wrap;overflow-wrap:anywhere">${escapeHtml(data.message)}</p><p style="font-size:12px;color:#626e64;border-top:1px solid #d8dcd2;padding-top:20px">Odpovědí na tento e-mail kontaktujete přímo zákazníka. Zákazník souhlasil s použitím údajů pro vyřízení této poptávky.</p></div></div></div>`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // Stejné submissionId = stejný e-mail, opakované odeslání nevytvoří duplikát.
        'Idempotency-Key': input.submissionId,
      },
      body: JSON.stringify({
        from: process.env.INQUIRY_FROM || 'Jiří Gadula – Pískování Bruzovice <web@piskovanibruzovice.cz>',
        to: [process.env.INQUIRY_TO || 'gadula.jiri@seznam.cz'],
        reply_to: data.email,
        subject: `Poptávka ${reference} – ${data.service} – ${data.name}`,
        text,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      console.error('Resend rejected inquiry, HTTP status:', response.status);
      throw new Error('send failed');
    }
    const sent = await response.json();
    if (typeof sent.id !== 'string' || !sent.id) throw new Error('Missing delivery receipt');
  } catch {
    return json({ message: 'Poptávku teď nemůžeme odeslat. Vaše údaje zůstaly vyplněné; zkuste to znovu nebo použijte e-mail.' }, 503);
  }

  return json({ reference }, 201);
}
