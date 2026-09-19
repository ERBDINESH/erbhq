# ERB HQ contact form setup

- Copy `site/`, `functions/`, and `tests/` into your existing ERB HQ repository (replace matching files; do not delete unrelated files).
- Existing Cloudflare Pages project: Git integration, root directory default (repository root), output directory `site`, framework preset None, build command blank. **Functions must be at repository root**, next to `site`, not inside `site`.
- Production secret: `RESEND_API_KEY` (already configured by site owner). Do not place it in HTML, JavaScript, or GitHub.
- Sending domain: `notify.erbhq.com` verified in Resend; sender `enquiries@notify.erbhq.com`. Form sends via Resend to `hello@erbhq.com`, and the existing Cloudflare Email Routing rule forwards the message to the operator's verified Gmail inbox. This avoids exposing the private forwarding destination in the public GitHub source.
- `site/_routes.json` invokes Functions only at `/api/*`; the static Pages site remains served as static assets.
- Validate: `py -m unittest discover -s tests -v` and `node --test tests/contact_function.test.mjs` (requires Node 18+). These tests mock email sending: they **do not** prove live delivery.
- Deploy only after reviewing `site/privacy/index.html` against actual practices. On production, submit a test form once, verify a message arrives in Gmail, check Resend logs if it doesn't. Never put API keys in screenshots.
- Basic honeypot + same-origin + field validation are not sufficient to prevent automated spam. Before promoting the form, enable Cloudflare Turnstile with **server-side token verification** and/or appropriate Cloudflare WAF rate limiting. Avoid publishing API keys or personally identifying fields in logs. If an enquiry is rejected or Resend is unavailable, visitors can copy `hello@erbhq.com`.
- This patch does not set up sending customer replies from `hello@erbhq.com`; replies from your inbox may display your personal sending address until you configure outbound mail.
