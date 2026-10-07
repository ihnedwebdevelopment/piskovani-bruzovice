import test from 'node:test';
import assert from 'node:assert/strict';
import { POST, GET } from '../api/inquiries.js';
import { serviceOptions } from '../src/lib/inquiry.js';
const input = { name: 'Zkouška formuláře', email: 'customer@example.com', service: serviceOptions[0], message: 'Poptávám očištění rámu automobilu před renovací.', privacy: true, submissionId: 'cfa05633-ea25-4c01-97dd-573308a2fd08' };
const request = (data = input, origin = 'https://www.piskovanibruzovice.cz') => new Request('https://www.piskovanibruzovice.cz/api/inquiries', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

function configure(t) {
  const saved = { RESEND_API_KEY: process.env.RESEND_API_KEY, INQUIRY_FROM: process.env.INQUIRY_FROM, INQUIRY_TO: process.env.INQUIRY_TO };
  process.env.RESEND_API_KEY = 'test-only-key';
  delete process.env.INQUIRY_FROM; delete process.env.INQUIRY_TO;
  t.after(() => { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
}

test('Vercel sends only to the business, escapes content, sets visitor reply-to and stable retry key', async t => {
  configure(t);
  let sent;
  t.mock.method(globalThis, 'fetch', async (url, options) => { sent = { url, ...options }; return Response.json({ id: 'provider-receipt' }); });
  const response = await POST(request({ ...input, message: '<script>alert("test")</script> Prosím o cenovou nabídku.', to: 'attacker@example.com' }));
  assert.equal(response.status, 201);
  const payload = JSON.parse(sent.body);
  assert.equal(sent.url, 'https://api.resend.com/emails');
  assert.deepEqual(payload.to, ['gadula.jiri@seznam.cz']);
  assert.match(payload.from, /<web@piskovanibruzovice.cz>$/);
  assert.equal(payload.reply_to, input.email);
  assert.equal(sent.headers['Idempotency-Key'], input.submissionId);
  assert.ok(!payload.html.includes('<script>'));
  assert.ok(payload.html.includes('&lt;script&gt;'));
  assert.equal((await response.json()).reference, 'PB-CFA05633');
});

test('invalid input, wrong origin and bot field never send an email', async t => {
  configure(t);
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected send'); });
  assert.equal((await POST(request({ ...input, privacy: false }))).status, 400);
  assert.equal((await POST(request(input, 'https://other.example'))).status, 403);
  assert.equal((await POST(request({ ...input, website: 'bot' }))).status, 400);
  assert.equal((await GET()).status, 405);
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('missing configuration and provider rejection return failure, never false success', async t => {
  configure(t);
  t.mock.method(console, 'error', () => {});
  delete process.env.RESEND_API_KEY;
  assert.equal((await POST(request())).status, 503);
  process.env.RESEND_API_KEY = 'test-only-key';
  t.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Forbidden' }, { status: 403 }));
  assert.equal((await POST(request())).status, 503);
});

test('oversized UTF-8 request is rejected before contacting Resend', async t => {
  configure(t);
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected send'); });
  assert.equal((await POST(request({ ...input, message: 'ě'.repeat(9000) }))).status, 413);
  assert.equal(fetchMock.mock.callCount(), 0);
});
