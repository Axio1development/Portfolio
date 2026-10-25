(function () {
  'use strict';
  let csrf = '';

  async function api(route, body) {
    if (!csrf && body) await loadSession();
    const res = await fetch('/api/?r=' + route, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    let data;
    try { data = await res.json(); } catch (e) { data = { ok: false, error: 'The server could not be reached. Please try again.' }; }
    if (data.csrf) csrf = data.csrf;
    if (!res.ok || !data.ok) throw new Error(data.error || 'Something went wrong.');
    return data;
  }

  async function loadSession() {
    try { return await api('session.csrf'); } catch (e) { return { signed_in: false }; }
  }

  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>' + (label || 'Please wait'); }
    else { btn.disabled = false; btn.innerHTML = btn.dataset.label || btn.innerHTML; }
  }

  function showError(form, msg) {
    const box = form.querySelector('.form-error');
    if (!box) return alert(msg);
    box.querySelector('span').textContent = msg;
    box.classList.add('show');
    box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  loadSession().then(s => {
    if (!s.signed_in) return;
    document.querySelectorAll('[data-guest]').forEach(el => el.hidden = true);
    document.querySelectorAll('[data-member]').forEach(el => el.hidden = false);
    if (document.body.dataset.page === 'auth') location.replace('/app/');
  });

  document.querySelectorAll('[data-demo]').forEach(btn => btn.addEventListener('click', async () => {
    busy(btn, true, 'Opening demo');
    try { await api('auth.demo', {}); location.href = '/app/'; }
    catch (e) { busy(btn, false); alert(e.message); }
  }));

  document.querySelectorAll('.pw-toggle').forEach(t => t.addEventListener('click', () => {
    const input = t.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    t.textContent = show ? 'Hide' : 'Show';
    t.setAttribute('aria-pressed', String(show));
  }));

  const params = new URLSearchParams(location.search);
  const note = document.querySelector('[data-note]');
  if (note) {
    const msgs = { timeout: 'You were signed out after 15 minutes of inactivity.', signedout: 'You\'ve been signed out securely.', closed: 'Your profile has been closed and its data deleted.' };
    const key = Object.keys(msgs).find(k => params.has(k));
    if (key) { note.textContent = msgs[key]; note.hidden = false; }
  }

  const login = document.getElementById('login-form');
  if (login) login.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = login.querySelector('[type=submit]');
    login.querySelector('.form-error').classList.remove('show');
    busy(btn, true, 'Signing in');
    try {
      await api('auth.login', { email: login.email.value, password: login.password.value });
      location.href = '/app/';
    } catch (err) { busy(btn, false); showError(login, err.message); login.password.select(); }
  });

  const signup = document.getElementById('signup-form');
  if (signup) {
    const meter = signup.querySelector('.meter');
    const meterText = signup.querySelector('[data-meter-text]');
    signup.password.addEventListener('input', () => {
      const v = signup.password.value;
      let s = 0;
      if (v.length >= 10) s++;
      if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
      if (/\d/.test(v)) s++;
      if (/[^A-Za-z0-9]/.test(v) || v.length >= 16) s++;
      if (!v) s = 0;
      meter.dataset.s = String(s);
      meterText.textContent = ['At least 10 characters, with a letter and a number.', 'Weak', 'Fair', 'Good', 'Strong'][s];
    });
    signup.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = signup.querySelector('[type=submit]');
      signup.querySelector('.form-error').classList.remove('show');
      if (signup.password.value !== signup.confirm.value) return showError(signup, 'Passwords don\'t match.');
      busy(btn, true, 'Opening your accounts');
      try {
        await api('auth.signup', {
          first_name: signup.first_name.value, last_name: signup.last_name.value, email: signup.email.value,
          password: signup.password.value, accept: signup.accept.checked,
        });
        location.href = '/app/?welcome=1';
      } catch (err) { busy(btn, false); showError(signup, err.message); }
    });
  }
})();
