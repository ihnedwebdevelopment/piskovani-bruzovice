import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, createSession, requireSession, uploadPermission } from '../server/cms.js';
import { POST } from '../api/admin.js';
import { safeMedia } from '../src/lib/content-schema.js';

function configure(t) {
  const saved = { ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH, ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET };
  process.env.ADMIN_PASSWORD_HASH = hashPassword('správné-heslo');
  process.env.ADMIN_SESSION_SECRET = 'test-secret';
  t.after(() => { for (const [key, value] of Object.entries(saved)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } });
}
const withCookie = token => new Request('https://example.cz/api/admin', { headers: { cookie: `bruzovice_admin=${token}` } });
const post = (action, body) => new Request(`https://example.cz/api/admin?action=${action}`, { method: 'POST', headers: { Origin: 'https://example.cz', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('password check accepts only the admin user with the right password', t => {
  configure(t);
  assert.equal(verifyPassword('admin', 'správné-heslo'), true);
  assert.equal(verifyPassword('admin', 'špatné'), false);
  assert.equal(verifyPassword('root', 'správné-heslo'), false);
});

test('signed sessions are accepted, while forged, expired or re-keyed ones are rejected', t => {
  configure(t);
  const token = createSession();
  assert.equal(requireSession(withCookie(token)), token);
  assert.throws(() => requireSession(withCookie(token.replace(/.$/, c => c === '0' ? '1' : '0'))), { status: 401 });
  assert.throws(() => requireSession(withCookie(createSession(Date.now() - 13 * 3600000))), { status: 401 });
  process.env.ADMIN_PASSWORD_HASH = hashPassword('nové-heslo');
  assert.throws(() => requireSession(withCookie(token)), { status: 401 });
});

test('login sets a session cookie and rejects a wrong password', async t => {
  configure(t);
  const ok = await POST(post('login', { username: 'admin', password: 'správné-heslo' }));
  assert.equal(ok.status, 200);
  assert.match(ok.headers.get('set-cookie'), /^bruzovice_admin=\d{13}\.[a-f0-9]{64}; Path=\/api\/admin; HttpOnly; SameSite=Strict/);
  const bad = await POST(post('login', { username: 'admin', password: 'x' }));
  assert.equal(bad.status, 401);
});

test('saving and uploads require a session', async t => {
  configure(t);
  assert.equal((await POST(post('save', { content: {}, revision: 0 }))).status, 401);
  assert.equal((await POST(post('upload', { type: 'blob.generate-client-token', payload: { pathname: 'photos/x.webp' } }))).status, 401);
});

test('uploads are limited to known folders and file types', () => {
  assert.deepEqual(uploadPermission('photos/0b0b6d5e-1c1a-4c4e-9a8f-2b2b2b2b2b2b.webp').allowedContentTypes, ['image/webp']);
  assert.deepEqual(uploadPermission('videos/0b0b6d5e-1c1a-4c4e-9a8f-2b2b2b2b2b2b.mp4').allowedContentTypes, ['video/mp4', 'video/webm']);
  assert.throws(() => uploadPermission('cms/content-00000001.json'), { status: 400 });
  assert.throws(() => uploadPermission('photos/../x.webp'), { status: 400 });
});

test('content accepts uploaded Blob files only in the matching field type', () => {
  const photo = 'https://abc123.public.blob.vercel-storage.com/photos/0b0b6d5e-1c1a-4c4e-9a8f-2b2b2b2b2b2b.webp';
  const clip = 'https://abc123.public.blob.vercel-storage.com/videos/0b0b6d5e-1c1a-4c4e-9a8f-2b2b2b2b2b2b.mp4';
  assert.equal(safeMedia(photo), true);
  assert.equal(safeMedia(photo, true), false);
  assert.equal(safeMedia(clip, true), true);
  assert.equal(safeMedia('https://evil.example.com/photos/0b0b6d5e-1c1a-4c4e-9a8f-2b2b2b2b2b2b.webp'), false);
});
