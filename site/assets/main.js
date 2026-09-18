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
