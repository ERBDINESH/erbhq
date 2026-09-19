(() => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    const close = () => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation');
      nav.classList.remove('is-open');
    };
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      nav.classList.toggle('is-open', open);
    });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') close(); });
    document.addEventListener('click', event => { if (!nav.contains(event.target) && !toggle.contains(event.target)) close(); });
  }
  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = String(new Date().getFullYear()); });
  const form = document.getElementById('contact-form');
  const formStatus = document.getElementById('contact-form-status');
  if (form && formStatus) {
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const submit = form.querySelector('button[type="submit"]');
      if (!submit || submit.disabled) return;
      const data = new FormData(form);
      const payload = {
        name: String(data.get('name') || '').trim(),
        email: String(data.get('email') || '').trim(),
        message: String(data.get('message') || '').trim(),
        website: String(data.get('website') || ''),
        consent: data.get('consent') === 'on'
      };
      if (payload.message.length < 10) {
        formStatus.textContent = 'Please provide at least 10 characters about your enquiry.';
        formStatus.dataset.state = 'error';
        return;
      }
      submit.disabled = true;
      submit.textContent = 'Sending…';
      formStatus.dataset.state = 'pending';
      formStatus.textContent = 'Sending your message…';
      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!response.ok) {
          formStatus.dataset.state = 'error';
          formStatus.textContent = response.status === 429
            ? 'Too many requests. Please try again later or copy our email address.'
            : 'Your message could not be sent. Please try again or copy our email address.';
          return;
        }
        form.reset();
        formStatus.dataset.state = 'success';
        formStatus.textContent = 'Thanks! Your enquiry was submitted. We’ll review it and respond if appropriate.';
      } catch (_) {
        formStatus.dataset.state = 'error';
        formStatus.textContent = 'Unable to connect right now. Please try again or copy our email address.';
      } finally {
        submit.disabled = false;
        submit.textContent = 'Send message ↗';
      }
    });
  }
  const copyEmailButton = document.getElementById('copy-contact-email');
  const copyEmailStatus = document.getElementById('copy-contact-status');
  if (copyEmailButton && copyEmailStatus) {
    copyEmailButton.addEventListener('click', async () => {
      const email = copyEmailButton.dataset.copyEmail;
      if (!email) return;
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(email);
          copied = true;
        }
      } catch (_) { /* Fall through to legacy copy for browser permission failures. */ }
      if (!copied) {
        const input = document.createElement('textarea');
        input.value = email;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        try { copied = document.execCommand('copy'); } catch (_) { copied = false; }
        input.remove();
      }
      copyEmailStatus.textContent = copied ? 'Email address copied!' : 'Copy unavailable. Please select the email address above and copy it manually.';
      if (copied) copyEmailButton.textContent = 'Copied!';
    });
  }
})();
