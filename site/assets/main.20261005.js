(() => {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');

  if (toggle && nav) {
    const closeMenu = () => {
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open navigation');
      nav.classList.remove('is-open');
      document.body.classList.remove('menu-open');
    };

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      nav.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
    });

    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        closeMenu();
        toggle.focus();
      }
    });
    document.addEventListener('click', event => {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) closeMenu();
    });
    const desktopQuery = window.matchMedia('(min-width: 861px)');
    const handleDesktopChange = event => { if (event.matches) closeMenu(); };
    if (desktopQuery.addEventListener) desktopQuery.addEventListener('change', handleDesktopChange);
    else desktopQuery.addListener(handleDesktopChange);
  }

  document.querySelectorAll('[data-year]').forEach(element => {
    element.textContent = String(new Date().getFullYear());
  });

  document.querySelectorAll('.contact-form').forEach(form => {
    const status = form.querySelector('.contact-form-status');
    const submit = form.querySelector('button[type="submit"]');
    if (!status || !submit) return;

    form.addEventListener('submit', async event => {
      event.preventDefault();
      status.textContent = '';
      status.dataset.state = '';
      if (!form.reportValidity() || submit.disabled) return;

      const data = new FormData(form);
      const payload = {
        name: String(data.get('name') || '').trim(),
        email: String(data.get('email') || '').trim(),
        company: String(data.get('company') || '').trim(),
        projectUrl: String(data.get('projectUrl') || '').trim(),
        stack: String(data.get('stack') || '').trim(),
        timeline: String(data.get('timeline') || '').trim(),
        message: String(data.get('message') || '').trim(),
        fax: String(data.get('fax') || '')
      };

      if (payload.message.length < 10) {
        status.textContent = 'Please provide at least 10 characters about your enquiry.';
        status.dataset.state = 'error';
        return;
      }

      const defaultText = submit.dataset.defaultText || 'Request Technical Review';
      submit.disabled = true;
      form.setAttribute('aria-busy', 'true');
      submit.textContent = 'Sending...';
      status.dataset.state = 'pending';
      status.textContent = 'Sending your enquiry...';

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          status.dataset.state = 'error';
          status.textContent = response.status === 429
            ? 'Too many requests. Please try again later or email hello@erbhq.com.'
            : 'Your enquiry could not be sent. Please try again or email hello@erbhq.com.';
          return;
        }

        form.reset();
        status.dataset.state = 'success';
        status.textContent = 'Thanks — your enquiry was sent. ERB will review it and respond if it is a good fit.';
      } catch (_) {
        status.dataset.state = 'error';
        status.textContent = 'Unable to connect right now. Please try again or email hello@erbhq.com.';
      } finally {
        submit.disabled = false;
        form.removeAttribute('aria-busy');
        submit.innerHTML = `${defaultText} <span aria-hidden="true">↗</span>`;
      }
    });
  });

  document.querySelectorAll('[data-copy-email]').forEach(button => {
    const statusId = button.getAttribute('aria-describedby');
    const status = statusId ? document.getElementById(statusId) : null;
    button.addEventListener('click', async () => {
      const email = button.dataset.copyEmail;
      if (!email) return;
      let copied = false;

      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(email);
          copied = true;
        }
      } catch (_) {
        // The fallback below covers browser permission failures.
      }

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

      if (status) status.textContent = copied ? 'Email copied.' : 'Select and copy the email address manually.';
      if (copied) {
        button.textContent = 'Copied';
        window.setTimeout(() => { button.textContent = 'Copy'; }, 1800);
      }
    });
  });
})();
