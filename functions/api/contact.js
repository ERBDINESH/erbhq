// Cloudflare Pages Function: /api/contact. No database or mail credentials in client code.
const ALLOWED_ORIGINS = new Set([
  'https://erbhq.com',
  'https://www.erbhq.com',
  'https://erbhq.pages.dev'
]);
const MAX_BODY_BYTES = 8192;
const EMAIL_PATTERN = /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/;

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

async function readBoundedJson(request) {
  if (!request.body) throw new Error('empty');
  const reader = request.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) throw new Error('too large');
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  const buffer = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(buffer));
}

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }
  // Cross-site submissions are rejected, but Origin alone is not bot protection.
  if (!ALLOWED_ORIGINS.has(request.headers.get('Origin'))) {
    return jsonResponse({ error: 'Forbidden' }, 403);
  }
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
    return jsonResponse({ error: 'Unsupported content type' }, 415);
  }
  const contentLength = Number(request.headers.get('Content-Length') || '0');
  if (contentLength > MAX_BODY_BYTES) return jsonResponse({ error: 'Request too large' }, 413);

  let data;
  try {
    data = await readBoundedJson(request);
  } catch (error) {
    return jsonResponse({ error: error.message === 'too large' ? 'Request too large' : 'Invalid request' }, error.message === 'too large' ? 413 : 400);
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return jsonResponse({ error: 'Invalid request' }, 400);
  }
  // Basic honeypot only; add Turnstile/WAF rate limits before broad promotion.
  if (typeof data.website !== 'string' || data.website.length > 0) {
    return jsonResponse({ error: 'Invalid request' }, 400);
  }
  if (data.consent !== true || typeof data.name !== 'string' || typeof data.email !== 'string' || typeof data.message !== 'string') {
    return jsonResponse({ error: 'Please complete all fields' }, 400);
  }
  const name = data.name.trim();
  const email = data.email.trim();
  const message = data.message.trim();
  if (!name || name.length > 100 || !email || email.length > 254 || !EMAIL_PATTERN.test(email) || message.length < 10 || message.length > 3000) {
    return jsonResponse({ error: 'Invalid name, email or message' }, 400);
  }
  if (!env?.RESEND_API_KEY) {
    return jsonResponse({ error: 'Email service is temporarily unavailable' }, 503);
  }

  // Deliver to the public address; existing Cloudflare Email Routing forwards to inbox.
  const payload = {
    from: 'ERB HQ Enquiries <enquiries@notify.erbhq.com>',
    to: ['hello@erbhq.com'],
    reply_to: email,
    subject: 'ERB HQ website enquiry',
    text: `New ERB HQ enquiry\n\nName: ${name}\nEmail: ${email}\n\nProject details:\n${message}`
  };
  try {
    const result = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (!result.ok) {
      console.error('ERB contact email provider returned status:', result.status);
      return jsonResponse({ error: 'Email service is temporarily unavailable' }, 502);
    }
    const data = await result.json();
    if (!data || typeof data.id !== 'string' || !data.id) {
      return jsonResponse({ error: 'Email service is temporarily unavailable' }, 502);
    }
    return jsonResponse({ ok: true }, 200);
  } catch (_) {
    // Do not log form data, recipient address or credentials.
    return jsonResponse({ error: 'Email service is temporarily unavailable' }, 502);
  }
}
