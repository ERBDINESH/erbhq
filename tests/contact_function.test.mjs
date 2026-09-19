import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../functions/api/contact.js', import.meta.url), 'utf8');
const { onRequest } = await import(`data:text/javascript,${encodeURIComponent(source)}`);
const originalFetch = globalThis.fetch;
const good = { name: 'Test Visitor', email: 'visitor@example.com', message: 'I want a website for my shop.', website: '', consent: true };
function makeContext(body = good, headers = {}, method = 'POST', env = { RESEND_API_KEY: 'test-secret' }) {
  return {
    request: new Request('https://erbhq.com/api/contact', {
      method,
      ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
      headers: { Origin: 'https://erbhq.com', 'Content-Type': 'application/json', ...headers }
    }),
    env
  };
}

test('valid enquiry sends to public alias without exposing personal inbox', async () => {
  let called = 0;
  globalThis.fetch = async (url, options) => {
    called += 1;
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.headers.Authorization, 'Bearer test-secret');
    const email = JSON.parse(options.body);
    assert.deepEqual(email.to, ['hello@erbhq.com']);
    assert.equal(email.from, 'ERB HQ Enquiries <enquiries@notify.erbhq.com>');
    assert.equal(email.reply_to, good.email);
    assert.match(email.text, /website for my shop/);
    return new Response(JSON.stringify({ id: 'mock-email-id' }), { status: 200 });
  };
  try {
    const response = await onRequest(makeContext());
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
    assert.equal(called, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test('rejects other origins and disallowed methods', async () => {
  assert.equal((await onRequest(makeContext(good, { Origin: 'https://attacker.test' }))).status, 403);
  assert.equal((await onRequest(makeContext(good, {}, 'GET'))).status, 405);
});

test('rejects missing consent, honeypot and invalid inputs', async () => {
  for (const body of [
    { ...good, consent: false },
    { ...good, website: 'https://spam.example' },
    { ...good, email: 'not-an-email' },
    { ...good, message: 'short' },
    { ...good, message: 'x'.repeat(3001) }
  ]) assert.equal((await onRequest(makeContext(body))).status, 400);
});

test('rejects oversized requests and missing secret', async () => {
  assert.equal((await onRequest(makeContext(good, { 'Content-Length': '9000' }))).status, 413);
  assert.equal((await onRequest(makeContext(good, {}, 'POST', {}))).status, 503);
});

test('provider errors do not mislead visitors about sending', async () => {
  globalThis.fetch = async () => new Response('failed', { status: 429 });
  try {
    const response = await onRequest(makeContext());
    assert.equal(response.status, 502);
    assert.equal((await response.json()).ok, undefined);
  } finally { globalThis.fetch = originalFetch; }
});
