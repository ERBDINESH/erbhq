// Cloudflare Pages Function: /api/contact. No database or mail credentials in client code.
const ALLOWED_ORIGINS = new Set([
  'https://erbhq.com',
  'https://www.erbhq.com',
  'https://erbhq.pages.dev'
]);
const MAX_BODY_BYTES = 8192;
const EMAIL_PATTERN = /^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/;
const ALLOWED_STACKS = new Set([
  '',
  'SwiftUI',
  'UIKit',
  'Swift + Objective-C',
  'Objective-C',
  'Not sure',
  'Other'
]);

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

function optionalText(value, maxLength) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length <= maxLength ? text : null;
}

function validPublicUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch (_) {
    return false;
  }
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
  if (typeof data.fax !== 'string' || data.fax.length > 0) {
    return jsonResponse({ error: 'Invalid request' }, 400);
  }
  if (typeof data.name !== 'string' || typeof data.email !== 'string' || typeof data.message !== 'string') {
    return jsonResponse({ error: 'Please complete all fields' }, 400);
  }
  const name = data.name.trim();
  const email = data.email.trim();
  const message = data.message.trim();
  const company = optionalText(data.company, 120);
  const projectUrl = optionalText(data.projectUrl, 500);
  const stack = optionalText(data.stack, 40);
  const timeline = optionalText(data.timeline, 120);
  if (
    !name || name.length > 100 || !email || email.length > 254 || !EMAIL_PATTERN.test(email) ||
    message.length < 10 || message.length > 3000 || company === null || projectUrl === null ||
    stack === null || timeline === null || !ALLOWED_STACKS.has(stack) || !validPublicUrl(projectUrl)
  ) {
    return jsonResponse({ error: 'Invalid name, email or message' }, 400);
  }
  if (!env?.RESEND_API_KEY) {
    return jsonResponse({ error: 'Email service is temporarily unavailable' }, 503);
  }

  // Deliver to the public address; existing Cloudflare Email Routing forwards to inbox.
  const details = [
    `Name: ${name}`,
    `Work email: ${email}`,
    company ? `Company: ${company}` : null,
    projectUrl ? `Website / App Store URL: ${projectUrl}` : null,
    stack ? `Current stack: ${stack}` : null,
    timeline ? `Timeline: ${timeline}` : null
  ].filter(Boolean).join('\n');
  const payload = {
    from: 'ERB HQ Enquiries <enquiries@notify.erbhq.com>',
    to: ['hello@erbhq.com'],
    reply_to: email,
    subject: 'ERB iOS technical review enquiry',
    text: `New iOS technical review enquiry\n\n${details}\n\nWhat they need help with:\n${message}`
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
