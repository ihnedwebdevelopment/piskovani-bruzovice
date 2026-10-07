import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../worker/index.js';

function setup() {
  const sql = new DatabaseSync(':memory:');
  sql.exec(readFileSync(new URL('../drizzle/0000_kind_marauders.sql', import.meta.url), 'utf8'));
  const statement = (query, values = []) => ({
    bind: (...params) => statement(query, params),
    first: async () => sql.prepare(query).get(...values) || null,
    run: async () => sql.prepare(query).run(...values),
  });
  const DB = { prepare: statement, batch: async statements => {
    sql.exec('BEGIN');
    try { const results = []; for (const s of statements) results.push(await s.run()); sql.exec('COMMIT'); return results; }
    catch (error) { sql.exec('ROLLBACK'); throw error; }
  } };
  const data = { submissionId: crypto.randomUUID(), service: 'Karoserie a veteráni', name: 'Testovací zákazník', email: 'test@example.com', phone: '+420 123 456 789', location: 'Bruzovice', message: 'Potřebuji očistit rám veterána před další opravou.', privacy: true, website: '' };
  const request = (body = data, origin = 'https://test.example') => new Request('https://test.example/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'CF-Connecting-IP': '127.0.0.1' }, body: JSON.stringify(body) });
  return { sql, DB, data, request };
}

test('valid inquiry is persisted and a retry does not create a duplicate', async () => {
  const { sql, DB, data, request } = setup();
  assert.equal((await worker.fetch(request(), { DB })).status, 201);
  assert.equal((await worker.fetch(request(), { DB })).status, 200);
  assert.equal(sql.prepare('SELECT count(*) AS n FROM inquiries').get().n, 1);
  assert.equal(sql.prepare('SELECT email FROM inquiries').get().email, 'test@example.com');
  assert.equal((await worker.fetch(request({ ...data, message: 'Změněná poptávka se stejným identifikátorem.' }), { DB })).status, 409);
  sql.close();
});
test('invalid input and missing consent cannot create a lead', async () => {
  const { sql, DB, data, request } = setup();
  const result = await worker.fetch(request({ ...data, email: 'bad', privacy: false }), { DB });
  assert.equal(result.status, 400);
  const body = await result.json();
  assert.ok(body.errors.email); assert.ok(body.errors.privacy);
  assert.equal(sql.prepare('SELECT count(*) AS n FROM inquiries').get().n, 0);
  sql.close();
});
test('cross-origin, honeypot and read requests are rejected', async () => {
  const { sql, DB, data, request } = setup();
  assert.equal((await worker.fetch(request(data, 'https://other.example'), { DB })).status, 403);
  assert.equal((await worker.fetch(request({ ...data, website: 'spam' }), { DB })).status, 400);
  assert.equal((await worker.fetch(new Request('https://test.example/api/inquiries'), { DB })).status, 405);
  sql.close();
});
test('rate limiting persists across requests and caps new inquiries', async () => {
  const { sql, DB, data, request } = setup();
  for (let i = 0; i < 5; i++) assert.equal((await worker.fetch(request({ ...data, submissionId: crypto.randomUUID() }), { DB })).status, 201);
  const response = await worker.fetch(request({ ...data, submissionId: crypto.randomUUID() }), { DB });
  assert.equal(response.status, 429);
  assert.equal(sql.prepare('SELECT count(*) AS n FROM inquiries').get().n, 5);
  sql.close();
});
test('oversized bodies and storage failures return recoverable errors', async () => {
  const { sql, data, request } = setup();
  assert.equal((await worker.fetch(request({ ...data, message: 'x'.repeat(20000) }), {})).status, 413);
  assert.equal((await worker.fetch(request(), {})).status, 503);
  sql.close();
});
