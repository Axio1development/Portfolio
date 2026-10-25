(function () {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ESC[c]);
  const money = c => (c < 0 ? '−' : '') + '$' + (Math.abs(c) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const signed = c => (c > 0 ? '+' : '') + money(c);
  const short$ = c => { const v = Math.abs(c) / 100; const s = v >= 1000 ? '$' + (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : '$' + Math.round(v); return (c < 0 ? '−' : '') + s; };
  const toDollars = c => (c / 100).toFixed(2);
  const dt = (ts, o) => new Date(ts * 1000).toLocaleDateString('en-US', o || { month: 'short', day: 'numeric', year: 'numeric' });
  const tm = ts => new Date(ts * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const dstr = s => new Date(s + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
  const ago = ts => {
    const s = Math.floor(Date.now() / 1000) - ts;
    if (s < 60) return 'Just now';
    if (s < 3600) return Math.floor(s / 60) + 'm ago';
    if (s < 86400) return Math.floor(s / 3600) + 'h ago';
    if (s < 604800) return Math.floor(s / 86400) + 'd ago';
    return dt(ts, { month: 'short', day: 'numeric' });
  };
  const dayLabel = ts => {
    const d = new Date(ts * 1000); const t = new Date();
    const y = new Date(); y.setDate(t.getDate() - 1);
    if (d.toDateString() === t.toDateString()) return 'Today';
    if (d.toDateString() === y.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: d.getFullYear() === t.getFullYear() ? undefined : 'numeric' });
  };

  const P = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const I = {
    home: P('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>'),
    accounts: P('<path d="M3 10h18M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18M12 3 3 8h18z"/>'),
    move: P('<path d="M7 7h13l-4-4M17 17H4l4 4"/>'),
    send: P('<path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/>'),
    bill: P('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M8 15h3"/>'),
    deposit: P('<path d="M12 3v12m0 0-4-4m4 4 4-4M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>'),
    card: P('<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>'),
    goal: P('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>'),
    doc: P('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>'),
    bell: P('<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
    gear: P('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
    sun: P('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    moon: P('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'),
    search: P('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
    download: P('<path d="M12 3v12m0 0-4-4m4 4 4-4M4 21h16"/>'),
    plus: P('<path d="M12 5v14M5 12h14"/>'),
    check: P('<path d="M20 6 9 17l-5-5"/>'),
    x: P('<path d="M18 6 6 18M6 6l12 12"/>'),
    lock: P('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
    eye: P('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
    edit: P('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
    print: P('<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>'),
    alert: P('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>'),
    info: P('<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>'),
    shield: P('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>'),
    logout: P('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>'),
    more: P('<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'),
    savings: P('<path d="M19 9c0-3-3-5-7-5S5 6 5 9c-1.5 0-2 1-2 2s.5 2 2 2c.5 2 2 3.5 3 4v3h3v-2h2v2h3v-3c1.5-1 3-3 3-5V9zM16 4l1-2M9 9h.01"/>'),
    trash: P('<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
  };
  const CAT = {
    Income: P('<path d="M17 7 7 17M7 8v9h9"/>'),
    Housing: P('<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/>'),
    Utilities: P('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
    Groceries: P('<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h11L21 7H6"/>'),
    Dining: P('<path d="M17 8h1a4 4 0 0 1 0 8h-1M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 2v2M10 2v2M14 2v2"/>'),
    Transportation: P('<path d="M5 17h14M6 17v2M18 17v2M4 12l2-6h12l2 6v5H4zM4 12h16"/><circle cx="8" cy="14.5" r=".8"/><circle cx="16" cy="14.5" r=".8"/>'),
    Shopping: P('<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0"/>'),
    Subscriptions: P('<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>'),
    Health: P('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>'),
    Entertainment: P('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 4v16M17 4v16M2 9h5M17 9h5M2 15h5M17 15h5"/>'),
    Transfer: I.move, Payments: I.send, Interest: P('<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>'),
    Deposit: I.deposit, Bills: I.bill, Insurance: I.shield, Loans: I.doc, Education: I.doc, Other: I.more,
  };
  const catIcon = c => CAT[c] || CAT.Other;
  const acctIcon = t => t === 'credit' ? I.card : t === 'savings' ? I.savings : I.accounts;
  const typeLabel = t => ({ checking: 'Checking', savings: 'Savings', credit: 'Credit card' })[t] || t;

  const state = { user: null, csrf: '', unread: 0, idle: 900 };

  async function api(route, body, params) {
    const qs = params ? '&' + new URLSearchParams(params).toString() : '';
    const res = await fetch('/api/?r=' + route + qs, {
      method: body ? 'POST' : 'GET', credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json', 'X-CSRF-Token': state.csrf } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    let data;
    try { data = await res.json(); } catch (e) { data = { ok: false, error: 'We couldn\'t reach the server. Check your connection.' }; }
    if (res.status === 401) { location.replace('/login' + (data.reason === 'timeout' ? '?timeout=1' : '')); throw new Error('Signed out'); }
    if (data.csrf) state.csrf = data.csrf;
    if (!res.ok || !data.ok) throw new Error(data.error || 'Something went wrong.');
    idle.touch();
    return data;
  }

  function toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast' + (kind === 'error' ? ' error' : '');
    el.innerHTML = (kind === 'error' ? I.alert : I.check) + '<span>' + esc(msg) + '</span>';
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, 3800);
  }

  let lastFocus = null;
  function modal({ title, body, wide, onOpen }) {
    const root = $('#modal-root');
    lastFocus = document.activeElement;
    root.innerHTML = `<div class="modal${wide ? ' wide' : ''}"><div class="modal-head"><h3 id="modal-title">${esc(title)}</h3>
      <button class="icon-btn" type="button" data-close aria-label="Close" style="border:0">${I.x}</button></div><div class="modal-body">${body}</div></div>`;
    root.setAttribute('aria-labelledby', 'modal-title');
    root.classList.add('open');
    document.body.style.overflow = 'hidden';
    const m = $('.modal', root);
    $$('[data-close]', root).forEach(b => b.addEventListener('click', closeModal));
    if (onOpen) onOpen(m);
    const f = $('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea', m) || $('.btn-primary', m) || $('[data-close]', m);
    setTimeout(() => f && f.focus(), 30);
    return m;
  }
  function closeModal() {
    const root = $('#modal-root');
    root.classList.remove('open'); root.innerHTML = ''; delete root.dataset.locked; document.body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $('#modal-root').addEventListener('mousedown', e => { if (e.target.id === 'modal-root' && !e.target.dataset.locked) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && $('#modal-root').classList.contains('open') && !$('#modal-root').dataset.locked) closeModal(); });

  function confirmBox(title, text, okLabel, danger) {
    return new Promise(resolve => {
      const m = modal({ title, body: `<p class="ink-2">${text}</p><div class="modal-actions"><button class="btn btn-secondary" data-close>Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(okLabel)}</button></div>` });
      let done = false;
      $('[data-ok]', m).addEventListener('click', () => { done = true; closeModal(); resolve(true); });
      $$('[data-close]', m).forEach(b => b.addEventListener('click', () => { if (!done) resolve(false); }));
    });
  }

  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>' + esc(label || 'Working'); }
    else { btn.disabled = false; if (btn.dataset.label) btn.innerHTML = btn.dataset.label; }
  }

  function formError(form, msg) {
    let box = $('.form-error', form);
    if (!box) { box = document.createElement('div'); box.className = 'form-error'; box.setAttribute('role', 'alert'); form.prepend(box); }
    box.innerHTML = I.alert.replace('<svg', '<svg width="18" height="18" style="flex:none"') + '<span>' + esc(msg) + '</span>';
    box.classList.add('show');
  }
  const clearError = form => { const b = $('.form-error', form); if (b) b.classList.remove('show'); };

  function reviewAndSubmit({ title, rows, total, confirmLabel, run, receipt }) {
    const m = modal({
      title,
      body: `<dl class="review" style="margin:0">${rows.map(([k, v]) => `<div><span>${esc(k)}</span><b>${v}</b></div>`).join('')}
        <div class="total"><span>Amount</span><b class="num">${money(total)}</b></div></dl>
        <p class="hint" style="margin-top:14px">Simulated transaction. No real money will move.</p>
        <div class="modal-actions"><button class="btn btn-secondary" data-close>Edit</button><button class="btn btn-primary" data-ok>${esc(confirmLabel)}</button></div>`,
    });
    $('[data-ok]', m).addEventListener('click', async e => {
      const btn = e.currentTarget;
      busy(btn, true, 'Processing');
      $('#modal-root').dataset.locked = '1';
      try {
        const res = await run();
        delete $('#modal-root').dataset.locked;
        const r = receipt(res);
        $('.modal-head h3', m).textContent = 'Done';
        $('.modal-body', m).innerHTML = `<div class="receipt"><div class="ok">${I.check}</div><h3>${esc(r.title)}</h3><p>${r.text}</p></div>
          <dl class="review" style="margin:0">${(r.rows || []).map(([k, v]) => `<div><span>${esc(k)}</span><b>${v}</b></div>`).join('')}</dl>
          <div class="modal-actions"><button class="btn btn-primary btn-block" data-close>Done</button></div>`;
        $$('[data-close]', m).forEach(b => b.addEventListener('click', closeModal));
        refreshBadge();
        if (r.after) r.after();
      } catch (err) {
        delete $('#modal-root').dataset.locked;
        busy(btn, false);
        let box = $('.form-error', m);
        if (!box) { box = document.createElement('div'); box.className = 'form-error show'; $('.modal-body', m).prepend(box); }
        box.classList.add('show');
        box.innerHTML = '<span>' + esc(err.message) + '</span>';
      }
    });
  }

  const acctOption = (a, sel) => `<option value="${a.id}"${sel ? ' selected' : ''}>${esc(a.nickname)} ••${esc(a.mask)} — ${a.type === 'credit' ? money(-a.balance) + ' owed' : money(a.available) + ' available'}</option>`;

  function niceTicks(min, max, count) {
    if (min === max) { max = min + 100; }
    const span = max - min;
    const step0 = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) || 10 * mag;
    const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v));
    return ticks;
  }

  function lineChart(el, points, opt = {}) {
    const draw = () => {
      const W = el.clientWidth || 600, H = opt.height || 220;
      const pad = { l: 52, r: 12, t: 12, b: 28 };
      const vals = points.map(p => p.balance);
      const ticks = niceTicks(Math.min(0, ...vals) < 0 ? Math.min(...vals) : Math.min(...vals) * 0.9, Math.max(...vals), 4);
      const y0 = ticks[0], y1 = ticks[ticks.length - 1];
      const x = i => pad.l + (W - pad.l - pad.r) * (points.length < 2 ? 0.5 : i / (points.length - 1));
      const y = v => pad.t + (H - pad.t - pad.b) * (1 - (v - y0) / (y1 - y0 || 1));
      const line = points.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p.balance).toFixed(1)).join('');
      const area = line + `L${x(points.length - 1).toFixed(1)} ${y(y0)}L${x(0).toFixed(1)} ${y(y0)}Z`;
      const xt = [];
      const n = W < 480 ? 3 : 5;
      for (let k = 0; k < n; k++) xt.push(Math.round((points.length - 1) * k / (n - 1)));
      el.innerHTML = `<svg width="${W}" height="${H}" role="img" aria-label="${esc(opt.label || 'Balance over time')}">
        <g class="axis">${ticks.map(t => `<line class="gridline" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${pad.l - 10}" y="${y(t) + 4}" text-anchor="end">${short$(t)}</text>`).join('')}
        ${xt.map(i => `<text x="${x(i)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}">${esc(dstr(points[i].date).replace(/, \d{4}$/, ''))}</text>`).join('')}</g>
        <path class="area" d="${area}"/><path class="line" d="${line}"/>
        <line class="cross" y1="${pad.t}" y2="${H - pad.b}" visibility="hidden"/><circle class="hover-dot" r="5" visibility="hidden"/>
        <rect class="hit" x="${pad.l}" y="0" width="${W - pad.l - pad.r}" height="${H}"/></svg><div class="tip"></div>`;
      const svg = $('svg', el), cross = $('.cross', el), dot = $('.hover-dot', el), tip = $('.tip', el);
      const move = e => {
        const r = svg.getBoundingClientRect();
        const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
        const i = Math.max(0, Math.min(points.length - 1, Math.round((px - pad.l) / (W - pad.l - pad.r) * (points.length - 1))));
        const p = points[i];
        cross.setAttribute('x1', x(i)); cross.setAttribute('x2', x(i)); cross.setAttribute('visibility', 'visible');
        dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(p.balance)); dot.setAttribute('visibility', 'visible');
        tip.innerHTML = `<span class="muted">${esc(dstr(p.date))}</span><b>${money(p.balance)}</b>`;
        tip.style.left = Math.max(70, Math.min(W - 70, x(i))) + 'px'; tip.style.top = y(p.balance) + 'px';
        tip.classList.add('show');
      };
      const leave = () => { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); tip.classList.remove('show'); };
      const hit = $('.hit', el);
      hit.addEventListener('pointermove', move); hit.addEventListener('pointerleave', leave);
      hit.addEventListener('touchmove', move, { passive: true }); hit.addEventListener('touchend', leave);
    };
    draw();
    observeResize(el, draw);
  }

  function cashflowChart(el, months) {
    const draw = () => {
      const W = el.clientWidth || 600, H = 230;
      const pad = { l: 52, r: 8, t: 10, b: 28 };
      const ticks = niceTicks(0, Math.max(1, ...months.flatMap(m => [m.in, m.out])), 4);
      const y1 = ticks[ticks.length - 1];
      const y = v => pad.t + (H - pad.t - pad.b) * (1 - v / y1);
      const gw = (W - pad.l - pad.r) / months.length;
      const bw = Math.min(26, (gw - 18) / 2);
      const bar = (bx, v, cls) => {
        const top = y(v), base = y(0), h = base - top;
        if (h <= 0) return '';
        const r = Math.min(4, h, bw / 2);
        return `<path class="${cls}" d="M${bx} ${base}V${top + r}Q${bx} ${top} ${bx + r} ${top}H${bx + bw - r}Q${bx + bw} ${top} ${bx + bw} ${top + r}V${base}Z"/>`;
      };
      const label = m => new Date(m.month + '-15T12:00:00').toLocaleDateString('en-US', { month: 'short' });
      el.innerHTML = `<svg width="${W}" height="${H}" role="img" aria-label="Money in and out by month">
        <g class="axis">${ticks.map(t => `<line class="gridline" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${pad.l - 10}" y="${y(t) + 4}" text-anchor="end">${short$(t)}</text>`).join('')}</g>
        ${months.map((m, i) => {
          const gx = pad.l + gw * i, cx = gx + gw / 2;
          return `<rect class="grp-hit" data-i="${i}" x="${gx + 2}" y="${pad.t}" width="${gw - 4}" height="${H - pad.t - pad.b}" rx="8"/>
            ${bar(cx - bw - 1, m.in, 'bar-in')}${bar(cx + 1, m.out, 'bar-out')}
            <text class="axis" x="${cx}" y="${H - 6}" text-anchor="middle" style="fill:var(--muted);font-size:11.5px">${label(m)}</text>`;
        }).join('')}
        <line class="baseline" x1="${pad.l}" x2="${W - pad.r}" y1="${y(0)}" y2="${y(0)}"/></svg><div class="tip"></div>`;
      const tip = $('.tip', el);
      $$('.grp-hit', el).forEach(r => {
        r.addEventListener('pointerenter', () => {
          const i = +r.dataset.i, m = months[i];
          const net = m.in - m.out;
          tip.innerHTML = `<span class="muted">${new Date(m.month + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            <div class="k"><i style="background:var(--series-1)"></i>In ${money(m.in)}</div><div class="k"><i style="background:var(--series-2)"></i>Out ${money(m.out)}</div>
            <div class="k" style="margin-top:4px;color:var(--ink)">Net <b style="display:inline;font-size:12.5px;margin-left:4px" class="${net >= 0 ? 'pos' : 'neg'}">${signed(net)}</b></div>`;
          tip.style.left = Math.max(80, Math.min(W - 80, pad.l + gw * i + gw / 2)) + 'px';
          tip.style.top = y(Math.max(m.in, m.out)) + 'px';
          tip.classList.add('show');
        });
        r.addEventListener('pointerleave', () => tip.classList.remove('show'));
      });
    };
    draw();
    observeResize(el, draw);
  }

  const observers = [];
  let mountQueue = [];
  const onMount = fn => mountQueue.push(fn);
  function observeResize(el, fn) {
    if (!window.ResizeObserver) return;
    let w = el.clientWidth, t;
    const ro = new ResizeObserver(() => { if (Math.abs(el.clientWidth - w) < 4) return; w = el.clientWidth; clearTimeout(t); t = setTimeout(fn, 80); });
    ro.observe(el); observers.push(ro);
  }

  function txnRow(t, showAcct) {
    const inflow = t.amount > 0;
    const pending = t.status === 'pending';
    return `<li class="txn" data-txn='${esc(JSON.stringify(t))}' tabindex="0" role="button">
      <span class="ci${inflow ? ' in' : ''}">${catIcon(t.category)}</span>
      <span class="d"><b>${esc(t.description)}</b><small>${esc(t.category)}${showAcct && t.account_name ? ' · ' + esc(t.account_name) : ''} · ${tm(t.created_at)}${pending ? ' <span class="pill pill-warn" style="height:18px;font-size:11px">Pending</span>' : ''}</small></span>
      <span class="a${inflow ? ' in' : ''}">${signed(t.amount)}${t.balance_after !== null && !showAcct ? `<small>${money(t.balance_after)}</small>` : ''}</span></li>`;
  }

  function txnList(txns, showAcct) {
    if (!txns.length) return `<div class="empty">${I.search}<p>No transactions found.</p></div>`;
    let out = '', cur = '';
    for (const t of txns) {
      const lbl = dayLabel(t.created_at);
      if (lbl !== cur) { if (cur) out += '</ul>'; out += `<div class="day-head">${esc(lbl)}</div><ul class="txns">`; cur = lbl; }
      out += txnRow(t, showAcct);
    }
    return out + '</ul>';
  }

  function bindTxnClicks(root) {
    $$('.txn', root).forEach(li => {
      const open = () => showTxn(JSON.parse(li.dataset.txn));
      li.addEventListener('click', open);
      li.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    });
  }

  function showTxn(t) {
    const statusPill = t.status === 'pending' ? '<span class="pill pill-warn">Pending</span>' : t.status === 'failed' ? '<span class="pill pill-neg">Failed</span>' : '<span class="pill pill-pos">Posted</span>';
    modal({
      title: 'Transaction details',
      body: `<div style="text-align:center;padding:4px 0 20px">
          <div class="txn" style="display:block;border:0;padding:0;cursor:default"><span class="ci${t.amount > 0 ? ' in' : ''}" style="margin:0 auto 12px;width:52px;height:52px">${catIcon(t.category)}</span></div>
          <div style="font-size:32px;font-weight:700;letter-spacing:-.03em" class="num ${t.amount > 0 ? 'pos' : ''}">${signed(t.amount)}</div>
          <div style="font-weight:600;margin-top:4px">${esc(t.description)}</div></div>
        <dl class="review" style="margin:0">
          <div><span>Status</span><b>${statusPill}</b></div>
          <div><span>Date</span><b>${dt(t.created_at, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} at ${tm(t.created_at)}</b></div>
          ${t.account_name ? `<div><span>Account</span><b>${esc(t.account_name)}</b></div>` : ''}
          <div><span>Category</span><b>${esc(t.category)}</b></div>
          <div><span>Type</span><b style="text-transform:capitalize">${esc(t.type === 'p2p' ? 'Person to person' : t.type)}</b></div>
          ${t.memo ? `<div><span>Memo</span><b>${esc(t.memo)}</b></div>` : ''}
          ${t.balance_after !== null ? `<div><span>Balance after</span><b class="num">${money(t.balance_after)}</b></div>` : ''}
          <div><span>Reference</span><b class="num" style="font-family:ui-monospace,monospace;font-size:13px">${esc(t.ref || '—')}</b></div>
        </dl>
        ${t.status === 'pending' ? '<p class="hint" style="margin-top:12px">Pending transactions are reflected in your available balance and post automatically.</p>' : ''}
        <div class="modal-actions"><button class="btn btn-secondary btn-block" data-close>Close</button></div>`,
    });
  }

  const skeleton = () => `<div class="page-head"><div><div class="skel" style="width:240px;height:30px"></div><div class="skel" style="width:180px;height:16px;margin-top:10px"></div></div></div>
    <div class="grid g-3">${'<div class="panel skel" style="height:140px"></div>'.repeat(3)}</div><div class="panel skel mt" style="height:320px"></div>`;

  async function viewDashboard(view) {
    const d = await api('dashboard');
    const cash = d.accounts.filter(a => a.type !== 'credit');
    const credit = d.accounts.filter(a => a.type === 'credit');
    const totalCash = cash.reduce((s, a) => s + a.balance, 0);
    const owed = credit.reduce((s, a) => s - a.balance, 0);
    const availCredit = credit.reduce((s, a) => s + a.available, 0);
    const tr = d.trend;
    const change30 = tr.length > 30 ? tr[tr.length - 1].balance - tr[tr.length - 31].balance : 0;
    const h = new Date().getHours();
    const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
    const spendTotal = d.spending.reduce((s, c) => s + c.total, 0);
    const maxSpend = Math.max(1, ...d.spending.map(c => c.total));
    const u = state.user;

    view.innerHTML = `
      <div class="page-head">
        <div class="greet"><h2>${greet}, ${esc(u.first_name)}</h2>
          <p>${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}${u.last_login_at ? ' · Last sign-in ' + dt(u.last_login_at, { month: 'short', day: 'numeric' }) + ' at ' + tm(u.last_login_at) : ''}</p></div>
        <div class="quick">
          <a href="#/move/transfer">${I.move}Transfer</a><a href="#/move/send">${I.send}Send</a>
          <a href="#/move/bills">${I.bill}Pay bills</a><a href="#/move/deposit">${I.deposit}Deposit</a>
        </div>
      </div>

      <div class="grid g-3">
        <div class="panel hero-stat">
          <span class="label">Total cash</span>
          <span class="value num">${money(totalCash)}</span>
          <span class="meta"><span>${change30 >= 0 ? '▲' : '▼'} ${money(Math.abs(change30))} in 30 days</span><span>${cash.length} accounts</span></span>
        </div>
        <div class="panel stat"><span class="label">Card balance</span><div class="value num">${money(owed)}</div><span class="meta">${money(availCredit)} available credit</span></div>
        <div class="panel stat"><span class="label">Spent in the last 30 days</span><div class="value num">${money(spendTotal)}</div><span class="meta">Across ${d.spending.reduce((s, c) => s + c.count, 0)} purchases and bills</span></div>
      </div>

      <div class="grid g-3 mt">${d.accounts.map(a => `
        <a class="panel acct-card" href="#/accounts/${a.id}">
          <div class="top"><span class="acct-ico">${acctIcon(a.type)}</span><span class="mask num">••${esc(a.mask)}</span></div>
          <div class="name">${esc(a.nickname)}</div>
          <div class="bal num">${a.type === 'credit' ? money(-a.balance) : money(a.balance)}</div>
          <div class="sub">${a.type === 'credit' ? `${money(a.available)} available of ${money(a.credit_limit)}` : a.type === 'savings' ? `${(a.apy_bps / 100).toFixed(2)}% APY` : `${money(a.available)} available`}</div>
          ${a.type === 'credit' ? `<div class="util" title="Credit used"><i style="width:${Math.min(100, Math.max(0, -a.balance / a.credit_limit * 100)).toFixed(1)}%"></i></div>` : ''}
        </a>`).join('')}
      </div>

      <div class="grid g-main mt">
        <div class="panel">
          <div class="panel-head"><div><h3>Cash balance</h3><span class="sub">Checking + savings, last 90 days</span></div></div>
          <div class="panel-body"><div class="chart" id="trend"></div></div>
        </div>
        <div class="panel">
          <div class="panel-head"><div><h3>Spending by category</h3><span class="sub">Last 30 days</span></div></div>
          <div class="panel-body">${d.spending.length ? `<ul class="spend">${d.spending.slice(0, 7).map(c => `
            <li><span class="ci">${catIcon(c.category)}</span>
              <div><div class="row"><span>${esc(c.category)}</span><span class="muted">${Math.round(c.total / spendTotal * 100)}%</span></div>
              <div class="bar"><i style="width:${(c.total / maxSpend * 100).toFixed(1)}%"></i></div></div>
              <span class="amt">${money(c.total)}</span></li>`).join('')}</ul>` : '<div class="empty">No spending yet.</div>'}
          </div>
        </div>
      </div>

      <div class="grid g-main mt">
        <div class="panel">
          <div class="panel-head"><div><h3>Cash flow</h3><span class="sub">Money in vs. out, excluding transfers between your accounts</span></div>
            <div class="legend"><span><i style="background:var(--series-1)"></i>In</span><span><i style="background:var(--series-2)"></i>Out</span></div></div>
          <div class="panel-body"><div class="chart" id="cashflow"></div></div>
        </div>
        <div class="stack">
          <div class="panel">
            <div class="panel-head"><h3>Upcoming payments</h3><a href="#/move/bills" style="font-size:13.5px;font-weight:600">Manage</a></div>
            <div class="panel-body">${d.upcoming.length ? `<ul class="mini-list">${d.upcoming.map(s => {
              const dd = new Date(s.date + 'T12:00:00');
              return `<li><span class="date"><small>${dd.toLocaleDateString('en-US', { month: 'short' })}</small><b>${dd.getDate()}</b></span>
                <span class="t"><b>${esc(s.payee)}</b><small>${s.frequency === 'once' ? 'One time' : s.frequency === 'weekly' ? 'Every week' : 'Every month'}</small></span><b class="num">${money(s.amount)}</b></li>`;
            }).join('')}</ul>` : `<p class="muted" style="font-size:14px">No scheduled payments. <a href="#/move/bills">Schedule one</a></p>`}</div>
          </div>
          <div class="panel">
            <div class="panel-head"><h3>Savings goals</h3><a href="#/goals" style="font-size:13.5px;font-weight:600">View all</a></div>
            <div class="panel-body">${d.goals.length ? `<ul class="mini-list">${d.goals.slice(0, 3).map(g => `
              <li style="display:block"><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:8px"><b>${esc(g.emoji)} ${esc(g.name)}</b><span class="muted num">${money(g.saved)} of ${money(g.target)}</span></div>
              <div class="progress"><i style="width:${Math.min(100, g.saved / g.target * 100).toFixed(1)}%"></i></div></li>`).join('')}</ul>`
              : `<p class="muted" style="font-size:14px">Set a goal and track your progress. <a href="#/goals">Create a goal</a></p>`}</div>
          </div>
        </div>
      </div>

      <div class="panel mt">
        <div class="panel-head" style="padding-bottom:14px"><h3>Recent activity</h3><a href="#/accounts" style="font-size:13.5px;font-weight:600">All accounts</a></div>
        ${txnList(d.recent, true)}
      </div>`;

    onMount(() => {
      if (tr.length) lineChart($('#trend', view), tr, { height: 300, label: 'Cash balance over the last 90 days' });
      cashflowChart($('#cashflow', view), d.cashflow);
    });
    bindTxnClicks(view);
  }

  async function viewAccounts(view) {
    const d = await api('accounts.list');
    view.innerHTML = `<div class="page-head"><div><h2>Accounts</h2><p>All of your Axiomate accounts in one place.</p></div></div>
      <div class="panel"><div class="table-scroll"><table class="table">
        <thead><tr><th>Account</th><th>Type</th><th style="text-align:right">Balance</th><th style="text-align:right">Available</th></tr></thead>
        <tbody>${d.accounts.map(a => `<tr style="cursor:pointer" data-href="#/accounts/${a.id}">
          <td><div style="display:flex;gap:12px;align-items:center"><span class="acct-ico">${acctIcon(a.type)}</span><div><a href="#/accounts/${a.id}" style="font-weight:600;color:var(--ink)">${esc(a.nickname)}</a><div class="muted num" style="font-size:13px">••${esc(a.mask)}</div></div></div></td>
          <td>${typeLabel(a.type)}${a.type === 'savings' ? ` <span class="pill pill-accent">${(a.apy_bps / 100).toFixed(2)}% APY</span>` : ''}</td>
          <td style="text-align:right;font-weight:650" class="num">${a.type === 'credit' ? money(-a.balance) + '<div class="muted" style="font-size:12px;font-weight:450">owed</div>' : money(a.balance)}</td>
          <td style="text-align:right" class="num">${money(a.available)}${a.type === 'credit' ? '<div class="muted" style="font-size:12px">credit</div>' : ''}</td></tr>`).join('')}
        </tbody></table></div></div>
      <p class="hint mt">Account numbers are randomly generated for this concept and can't receive real funds.</p>`;
    $$('tr[data-href]', view).forEach(tr => tr.addEventListener('click', e => { if (e.target.tagName !== 'A') location.hash = tr.dataset.href; }));
  }

  async function viewAccount(view, id) {
    const f = { q: '', category: '', dir: '', from: '', to: '', page: 1 };
    const d = await api('accounts.get', null, { id });
    const a = d.account;
    const isCredit = a.type === 'credit';
    setTitle(a.nickname);

    view.innerHTML = `
      <div style="margin:12px 0 4px"><a href="#/accounts" style="font-size:14px;font-weight:600">← Accounts</a></div>
      <div class="panel acct-hero">
        <div>
          <div class="kind"><span class="acct-ico">${acctIcon(a.type)}</span>${typeLabel(a.type)} · <span class="num" id="acct-num">••••${esc(a.mask)}</span> <button class="link-btn" id="reveal">Show</button></div>
          <h2><span id="nick">${esc(a.nickname)}</span> <button class="link-btn" id="rename" aria-label="Rename account">${I.edit.replace('<svg', '<svg width="16" height="16"')}</button></h2>
          <div class="bal num">${isCredit ? money(-a.balance) : money(a.balance)}</div>
          <div class="muted" style="font-size:13.5px">${isCredit ? 'Current balance owed' : 'Current balance'}</div>
          <div class="facts">
            <span>Available${isCredit ? ' credit' : ''}<b>${money(a.available)}</b></span>
            ${a.pending ? `<span>Pending<b>${money(a.pending)}</b></span>` : ''}
            ${isCredit ? `<span>Credit limit<b>${money(a.credit_limit)}</b></span>` : ''}
            ${a.type === 'savings' ? `<span>Interest rate<b>${(a.apy_bps / 100).toFixed(2)}% APY</b></span>` : ''}
            <span>Opened<b>${dt(a.opened_at, { month: 'short', year: 'numeric' })}</b></span>
            ${d.card ? `<span>Card<b>••${esc(d.card.last4)}${d.card.frozen ? ' <span class="pill pill-neg" style="height:20px">Locked</span>' : ''}</b></span>` : ''}
          </div>
        </div>
        <div class="acts">
          ${isCredit ? `<a class="btn btn-primary" href="#/move/transfer?to=${a.id}">Make a payment</a>` : `<a class="btn btn-primary" href="#/move/transfer?from=${a.id}">Transfer</a>`}
          <a class="btn btn-secondary" href="#/statements/${a.id}">${I.doc.replace('<svg', '<svg width="17" height="17"')}Statements</a>
        </div>
      </div>
      <div class="panel mt">
        <div class="panel-head"><div><h3>Balance</h3><span class="sub">Last 60 days</span></div></div>
        <div class="panel-body"><div class="chart" id="acct-trend"></div></div>
      </div>
      <div class="panel mt" id="txn-panel">
        <form class="filters" id="filters" role="search">
          <div class="search">${I.search}<input class="input" name="q" placeholder="Search description, memo or reference" aria-label="Search transactions"></div>
          <select class="input" name="category" aria-label="Category"><option value="">All categories</option>${d.categories.map(c => `<option>${esc(c)}</option>`).join('')}</select>
          <select class="input" name="dir" aria-label="Direction"><option value="">Money in & out</option><option value="in">Money in</option><option value="out">Money out</option></select>
          <input class="input" type="date" name="from" aria-label="From date">
          <input class="input" type="date" name="to" aria-label="To date">
          <a class="btn btn-secondary" id="export" href="#" style="height:40px">${I.download.replace('<svg', '<svg width="17" height="17"')}CSV</a>
        </form>
        <div id="txn-list">${txnList(d.transactions)}</div>
        <div class="pager" id="pager"></div>
      </div>`;

    const trendPts = d.trend.map(p => ({ date: p.date, balance: isCredit ? -p.balance : p.balance }));
    onMount(() => lineChart($('#acct-trend', view), trendPts, { height: 180, label: isCredit ? 'Balance owed over 60 days' : 'Balance over 60 days' }));

    const renderPager = (page, pages, total) => {
      $('#pager', view).innerHTML = `<span>${total} transaction${total === 1 ? '' : 's'}</span><span style="display:flex;gap:8px;align-items:center">
        <button class="btn btn-secondary btn-sm" data-p="${page - 1}" ${page <= 1 ? 'disabled' : ''}>Previous</button><span>Page ${page} of ${pages}</span>
        <button class="btn btn-secondary btn-sm" data-p="${page + 1}" ${page >= pages ? 'disabled' : ''}>Next</button></span>`;
      $$('[data-p]', view).forEach(b => b.addEventListener('click', () => { f.page = +b.dataset.p; load(); $('#txn-panel').scrollIntoView({ behavior: 'smooth' }); }));
    };
    renderPager(d.page, d.pages, d.total);
    bindTxnClicks($('#txn-list', view));

    const params = () => { const p = { id }; for (const k of ['q', 'category', 'dir', 'from', 'to']) if (f[k]) p[k] = f[k]; return p; };
    let seq = 0;
    const load = async () => {
      const my = ++seq;
      const r = await api('accounts.get', null, { ...params(), page: f.page });
      if (my !== seq) return;
      $('#txn-list', view).innerHTML = txnList(r.transactions);
      bindTxnClicks($('#txn-list', view));
      renderPager(r.page, r.pages, r.total);
    };
    const form = $('#filters', view);
    let deb;
    form.addEventListener('input', e => {
      for (const k of ['q', 'category', 'dir', 'from', 'to']) f[k] = form[k].value.trim();
      f.page = 1; clearTimeout(deb); deb = setTimeout(load, e.target.name === 'q' ? 300 : 0);
    });
    form.addEventListener('submit', e => e.preventDefault());
    $('#export', view).addEventListener('click', e => { e.preventDefault(); location.href = '/api/?r=accounts.export&' + new URLSearchParams(params()); });

    $('#reveal', view).addEventListener('click', async e => {
      const b = e.currentTarget;
      if (b.textContent === 'Hide') { $('#acct-num').textContent = '••••' + a.mask; b.textContent = 'Show'; return; }
      const r = await api('accounts.reveal', { id: a.id });
      $('#acct-num').textContent = r.number.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3'); b.textContent = 'Hide';
      setTimeout(() => { if (b.textContent === 'Hide') b.click(); }, 20000);
    });
    $('#rename', view).addEventListener('click', () => {
      const m = modal({ title: 'Rename account', body: `<form><div class="field"><label for="nn">Nickname</label><input class="input" id="nn" name="nickname" maxlength="40" value="${esc(a.nickname)}" required></div>
        <div class="modal-actions"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary">Save</button></div></form>` });
      $('form', m).addEventListener('submit', async e => {
        e.preventDefault();
        try { await api('accounts.rename', { id: a.id, nickname: e.target.nickname.value }); a.nickname = e.target.nickname.value.trim(); $('#nick').textContent = a.nickname; setTitle(a.nickname); closeModal(); toast('Account renamed'); }
        catch (err) { formError(e.target, err.message); }
      });
    });
  }

  async function viewMove(view, tab, query) {
    tab = ['transfer', 'send', 'bills', 'deposit'].includes(tab) ? tab : 'transfer';
    const tabs = [['transfer', 'Transfer'], ['send', 'Send money'], ['bills', 'Pay bills'], ['deposit', 'Deposit check']];
    const { accounts } = await api('accounts.list');
    view.innerHTML = `<div class="page-head"><div><h2>Move money</h2><p>Transfers and payments post instantly. All money is simulated.</p></div></div>
      <nav class="tabs" aria-label="Move money">${tabs.map(([k, l]) => `<a href="#/move/${k}" class="${k === tab ? 'active' : ''}">${l}</a>`).join('')}</nav>
      <div id="move-body"></div>`;
    const body = $('#move-body', view);
    const q = new URLSearchParams(query || '');
    if (tab === 'transfer') return moveTransfer(body, accounts, q);
    if (tab === 'send') return moveSend(body, accounts);
    if (tab === 'bills') return moveBills(body, accounts);
    return moveDeposit(body, accounts);
  }

  const amountField = (name, label, hint) => `<div class="field"><label for="${name}">${label}</label><div class="input-money"><input class="input" id="${name}" name="${name}" inputmode="decimal" autocomplete="off" placeholder="0.00" required></div>${hint ? `<span class="hint">${hint}</span>` : ''}</div>`;
  const parseAmt = v => { const s = String(v).replace(/[$,\s]/g, ''); if (!/^\d+(\.\d{1,2})?$/.test(s)) return 0; return Math.round(parseFloat(s) * 100); };

  function moveTransfer(body, accounts, q) {
    const from0 = q.get('from') || accounts.find(a => a.type === 'checking')?.id;
    const to0 = q.get('to') || accounts.find(a => String(a.id) !== String(from0))?.id;
    body.innerHTML = `<div class="grid g-main"><form class="panel panel-pad form-panel" id="f" novalidate>
        <div class="field"><label for="from">From</label><select class="input" id="from" name="from">${accounts.filter(a => a.type !== 'credit').map(a => acctOption(a, String(a.id) === String(from0))).join('')}</select></div>
        <div class="field"><label for="to">To</label><select class="input" id="to" name="to">${accounts.map(a => acctOption(a, String(a.id) === String(to0))).join('')}</select></div>
        <div id="pay-hint"></div>
        ${amountField('amount', 'Amount')}
        <div class="field"><label for="memo">Memo <span class="muted" style="font-weight:400">(optional)</span></label><input class="input" id="memo" name="memo" maxlength="80"></div>
        <button class="btn btn-primary btn-lg btn-block">Review transfer</button></form>
      <div class="panel panel-pad side-info"><div><h4>Instant between your accounts</h4><p>Transfers between your Axiomate accounts are available immediately, any time of day.</p></div>
        <div><h4>Paying your card</h4><p>Choose your rewards card as the destination to make a payment. You can pay up to the balance owed.</p></div>
        <div><h4>Limit</h4><p>Up to $50,000.00 per transfer.</p></div></div></div>`;
    const form = $('#f', body);
    const hint = () => {
      const to = accounts.find(a => String(a.id) === form.to.value);
      $('#pay-hint', body).innerHTML = to && to.type === 'credit' && to.balance < 0
        ? `<div class="form-note" style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span>Balance owed: <b class="num">${money(-to.balance)}</b></span><button type="button" class="link-btn" id="payfull">Pay in full</button></div>` : '';
      const pf = $('#payfull', body); if (pf) pf.addEventListener('click', () => { form.amount.value = toDollars(-to.balance); });
    };
    form.to.addEventListener('change', hint); hint();
    form.addEventListener('submit', e => {
      e.preventDefault(); clearError(form);
      const amt = parseAmt(form.amount.value);
      if (form.from.value === form.to.value) return formError(form, 'Choose two different accounts.');
      if (!amt) return formError(form, 'Enter a valid amount.');
      const from = accounts.find(a => String(a.id) === form.from.value), to = accounts.find(a => String(a.id) === form.to.value);
      reviewAndSubmit({
        title: to.type === 'credit' ? 'Review card payment' : 'Review transfer',
        rows: [['From', `${esc(from.nickname)} ••${esc(from.mask)}`], ['To', `${esc(to.nickname)} ••${esc(to.mask)}`], ['When', 'Now'], ...(form.memo.value ? [['Memo', esc(form.memo.value)]] : [])],
        total: amt, confirmLabel: 'Confirm transfer',
        run: () => api('transfer.create', { from: from.id, to: to.id, amount: toDollars(amt), memo: form.memo.value }),
        receipt: r => ({ title: 'Transfer complete', text: `${money(r.amount)} moved to ${esc(r.to)}.`, rows: [['Reference', `<span class="num">${esc(r.ref)}</span>`], ['Date', dt(Date.now() / 1000)]], after: () => route() }),
      });
    });
  }

  async function moveSend(body, accounts) {
    const { recent } = await api('p2p.recent');
    body.innerHTML = `<div class="grid g-main"><form class="panel panel-pad form-panel" id="f" novalidate>
        <div class="field"><label for="email">Recipient's email</label><input class="input" id="email" name="email" type="email" autocomplete="off" placeholder="name@example.com" required>
          <div class="lookup" id="lookup" aria-live="polite"></div></div>
        <div class="field"><label for="from">From</label><select class="input" id="from" name="from">${accounts.filter(a => a.type !== 'credit').map(a => acctOption(a, a.type === 'checking')).join('')}</select></div>
        ${amountField('amount', 'Amount', 'Up to $2,500.00 per payment and $5,000.00 per day.')}
        <div class="field"><label for="memo">What's it for? <span class="muted" style="font-weight:400">(optional)</span></label><input class="input" id="memo" name="memo" maxlength="80" placeholder="Dinner, rent, concert tickets…"></div>
        <button class="btn btn-primary btn-lg btn-block">Review payment</button></form>
      <div class="panel panel-pad side-info"><div><h4>Send to any Axiomate member</h4><p>Enter the email they signed up with. Money arrives in their checking account instantly, and they'll get a notification.</p></div>
        <div><h4>Try it out</h4><p>Open a second account in a private window, then send money between the two.</p></div>
        ${recent.length ? `<div><h4>Recent recipients</h4><p>${recent.map(esc).join(', ')}</p></div>` : ''}
        <div><h4>Only send to people you trust</h4><p>Payments to other members can't be cancelled once sent.</p></div></div></div>`;
    const form = $('#f', body);
    let found = null;
    const look = async () => {
      const v = form.email.value.trim(); found = null;
      const box = $('#lookup', body);
      if (!v || !/^\S+@\S+\.\S+$/.test(v)) { box.innerHTML = ''; return; }
      box.innerHTML = '<span class="muted">Looking up member…</span>';
      try { const r = await api('p2p.lookup', { email: v }); found = r.name; box.innerHTML = `<span class="pos" style="font-weight:600">✓ ${esc(r.name)}</span>`; }
      catch (err) { box.innerHTML = `<span class="neg">${esc(err.message)}</span>`; }
    };
    form.email.addEventListener('change', look);
    form.addEventListener('submit', async e => {
      e.preventDefault(); clearError(form);
      const amt = parseAmt(form.amount.value);
      if (!found) await look();
      if (!found) return formError(form, 'Enter the email of an Axiomate member.');
      if (!amt) return formError(form, 'Enter a valid amount.');
      const from = accounts.find(a => String(a.id) === form.from.value);
      reviewAndSubmit({
        title: 'Review payment',
        rows: [['To', `${esc(found)}<div class="muted" style="font-weight:400;font-size:12.5px">${esc(form.email.value)}</div>`], ['From', `${esc(from.nickname)} ••${esc(from.mask)}`], ['Arrives', 'Instantly'], ...(form.memo.value ? [['Memo', esc(form.memo.value)]] : [])],
        total: amt, confirmLabel: 'Send ' + money(amt),
        run: () => api('p2p.send', { from: from.id, email: form.email.value, amount: toDollars(amt), memo: form.memo.value }),
        receipt: r => ({ title: 'Money sent', text: `${money(r.amount)} is on its way to ${esc(r.to)}.`, rows: [['Reference', `<span class="num">${esc(r.ref)}</span>`]], after: () => route() }),
      });
    });
  }

  async function moveBills(body, accounts) {
    const d = await api('payees.list');
    const freq = { once: 'One time', weekly: 'Weekly', monthly: 'Monthly' };
    body.innerHTML = `<div class="grid g-main"><form class="panel panel-pad" id="f" novalidate>
        <div class="field"><label for="payee">Pay to</label><div style="display:flex;gap:8px"><select class="input" id="payee" name="payee">${d.payees.length ? d.payees.map(p => `<option value="${p.id}">${esc(p.name)}${p.hint ? ' ••' + esc(p.hint) : ''}</option>`).join('') : '<option value="">Add a payee first</option>'}</select>
          <button type="button" class="btn btn-secondary" id="add-payee" style="height:44px">${I.plus.replace('<svg', '<svg width="17" height="17"')}Add</button></div></div>
        <div class="field"><label for="from">From</label><select class="input" id="from" name="from">${accounts.filter(a => a.type !== 'credit').map(a => acctOption(a, a.type === 'checking')).join('')}</select></div>
        ${amountField('amount', 'Amount')}
        <div class="grid g-2" style="gap:12px"><div class="field"><label for="date">Payment date</label><input class="input" type="date" id="date" name="date" value="${todayISO()}" min="${todayISO()}"></div>
          <div class="field"><label for="frequency">Repeat</label><select class="input" id="frequency" name="frequency"><option value="once">One time</option><option value="weekly">Every week</option><option value="monthly">Every month</option></select></div></div>
        <div class="field"><label for="memo">Memo <span class="muted" style="font-weight:400">(optional)</span></label><input class="input" id="memo" name="memo" maxlength="80" placeholder="Account or invoice number"></div>
        <button class="btn btn-primary btn-lg btn-block">Review payment</button></form>
      <div class="stack">
        <div class="panel"><div class="panel-head"><h3>Scheduled</h3></div><div class="panel-body">${d.scheduled.length ? `<ul class="mini-list">${d.scheduled.map(s => {
          const dd = new Date(s.date + 'T12:00:00');
          return `<li><span class="date"><small>${dd.toLocaleDateString('en-US', { month: 'short' })}</small><b>${dd.getDate()}</b></span><span class="t"><b>${esc(s.payee)}</b><small>${freq[s.frequency]} · ${money(s.amount)}</small></span>
            <button class="btn btn-ghost btn-sm" data-cancel="${s.id}">Cancel</button></li>`;
        }).join('')}</ul>` : '<p class="muted" style="font-size:14px">Nothing scheduled.</p>'}</div></div>
        <div class="panel"><div class="panel-head"><h3>Payees</h3></div><div class="panel-body"><ul class="mini-list">${d.payees.map(p => `<li><span class="acct-ico" style="width:34px;height:34px">${catIcon(p.category)}</span>
          <span class="t"><b>${esc(p.name)}</b><small>${esc(p.category)}${p.hint ? ' · ••' + esc(p.hint) : ''}</small></span><button class="btn btn-ghost btn-sm" data-del="${p.id}" aria-label="Remove ${esc(p.name)}">${I.trash.replace('<svg', '<svg width="16" height="16"')}</button></li>`).join('') || '<li class="muted">No payees yet.</li>'}</ul></div></div>
      </div></div>
      <div class="panel mt"><div class="panel-head" style="padding-bottom:14px"><h3>Recent bill payments</h3></div>${txnList(d.history, false)}</div>`;
    bindTxnClicks(body);
    const form = $('#f', body);
    const sync = () => { const later = form.date.value > todayISO(); $('button.btn-primary', form).textContent = later ? 'Review scheduled payment' : 'Review payment'; };
    form.date.addEventListener('change', sync);

    $('#add-payee', body).addEventListener('click', () => {
      const m = modal({ title: 'Add a payee', body: `<form novalidate><div class="field"><label for="pn">Payee name</label><input class="input" id="pn" name="name" maxlength="60" placeholder="e.g. Metro Water Co." required></div>
        <div class="field"><label for="pc">Category</label><select class="input" id="pc" name="category">${['Utilities', 'Housing', 'Insurance', 'Loans', 'Subscriptions', 'Health', 'Education', 'Bills'].map(c => `<option>${c}</option>`).join('')}</select></div>
        <div class="field"><label for="ph">Your account number with them <span class="muted" style="font-weight:400">(optional)</span></label><input class="input" id="ph" name="account_hint" inputmode="numeric" maxlength="30"><span class="hint">We only keep the last 4 digits. Don't use a real account number.</span></div>
        <div class="modal-actions"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary">Add payee</button></div></form>` });
      $('form', m).addEventListener('submit', async e => {
        e.preventDefault();
        const f2 = e.target;
        try { await api('payees.add', { name: f2.name.value, category: f2.category.value, account_hint: f2.account_hint.value }); closeModal(); toast('Payee added'); route(); }
        catch (err) { formError(f2, err.message); }
      });
    });
    $$('[data-cancel]', body).forEach(b => b.addEventListener('click', async () => {
      if (!await confirmBox('Cancel payment?', 'This scheduled payment and any future repeats will be cancelled.', 'Cancel payment', true)) return;
      await api('bills.cancel', { id: +b.dataset.cancel }); toast('Payment cancelled'); route();
    }));
    $$('[data-del]', body).forEach(b => b.addEventListener('click', async () => {
      if (!await confirmBox('Remove payee?', 'Any scheduled payments to this payee will also be removed.', 'Remove', true)) return;
      await api('payees.delete', { id: +b.dataset.del }); toast('Payee removed'); route();
    }));
    form.addEventListener('submit', e => {
      e.preventDefault(); clearError(form);
      const amt = parseAmt(form.amount.value);
      if (!form.payee.value) return formError(form, 'Add a payee first.');
      if (!amt) return formError(form, 'Enter a valid amount.');
      const p = d.payees.find(x => String(x.id) === form.payee.value);
      const from = accounts.find(a => String(a.id) === form.from.value);
      const later = form.date.value > todayISO();
      reviewAndSubmit({
        title: later ? 'Review scheduled payment' : 'Review bill payment',
        rows: [['Pay to', esc(p.name)], ['From', `${esc(from.nickname)} ••${esc(from.mask)}`], ['Date', later ? dstr(form.date.value) : 'Today'], ['Repeat', freq[form.frequency.value]], ...(form.memo.value ? [['Memo', esc(form.memo.value)]] : [])],
        total: amt, confirmLabel: later ? 'Schedule payment' : 'Pay now',
        run: () => api('bills.pay', { payee: p.id, from: from.id, amount: toDollars(amt), date: form.date.value, frequency: form.frequency.value, memo: form.memo.value }),
        receipt: r => r.paid
          ? ({ title: 'Payment sent', text: `${money(r.amount)} paid to ${esc(r.payee)}.`, rows: [['Reference', `<span class="num">${esc(r.ref)}</span>`]], after: () => route() })
          : ({ title: 'Payment scheduled', text: `${money(r.amount)} to ${esc(r.payee)} will go out on ${dstr(r.date)}.`, after: () => route() }),
      });
    });
  }

  function moveDeposit(body, accounts) {
    body.innerHTML = `<div class="grid g-main"><form class="panel panel-pad" id="f" novalidate>
        <div class="field"><label for="to">Deposit to</label><select class="input" id="to" name="to">${accounts.filter(a => a.type !== 'credit').map(a => acctOption(a, a.type === 'checking')).join('')}</select></div>
        ${amountField('amount', 'Check amount', 'Up to $5,000.00 per check and $10,000.00 per day.')}
        <div class="field"><label for="cn">Check number <span class="muted" style="font-weight:400">(optional)</span></label><input class="input" id="cn" name="check_number" inputmode="numeric" maxlength="10"></div>
        <div class="grid g-2" style="gap:12px;margin-bottom:18px">
          <label class="drop"><input type="file" accept="image/*" capture="environment" data-side="front"><span>${I.plus.replace('<svg', '<svg width="22" height="22" style="margin:0 auto 6px"')}Front of check</span></label>
          <label class="drop"><input type="file" accept="image/*" capture="environment" data-side="back"><span>${I.plus.replace('<svg', '<svg width="22" height="22" style="margin:0 auto 6px"')}Back of check</span></label>
        </div>
        <button class="btn btn-primary btn-lg btn-block">Review deposit</button></form>
      <div class="panel panel-pad side-info"><div><h4>How mobile deposit works</h4><p>Photos are optional in this concept and never leave your device. Funds show as pending, then become available in about a minute.</p></div>
        <div><h4>Endorse your check</h4><p>Sign the back and write "For mobile deposit at Axiomate only."</p></div>
        <div><h4>Keep the paper check</h4><p>Hold on to it for 14 days after the deposit posts, then shred it.</p></div></div></div>`;
    $$('.drop input', body).forEach(inp => inp.addEventListener('change', () => {
      const file = inp.files[0]; if (!file) return;
      const old = $('img', inp.parentElement); if (old) old.remove();
      const img = document.createElement('img'); img.alt = 'Check ' + inp.dataset.side; img.src = URL.createObjectURL(file);
      inp.parentElement.appendChild(img);
    }));
    const form = $('#f', body);
    form.addEventListener('submit', e => {
      e.preventDefault(); clearError(form);
      const amt = parseAmt(form.amount.value);
      if (!amt) return formError(form, 'Enter the check amount.');
      const to = accounts.find(a => String(a.id) === form.to.value);
      reviewAndSubmit({
        title: 'Review deposit',
        rows: [['Deposit to', `${esc(to.nickname)} ••${esc(to.mask)}`], ...(form.check_number.value ? [['Check number', esc(form.check_number.value)]] : []), ['Availability', 'About 1 minute']],
        total: amt, confirmLabel: 'Deposit check',
        run: () => api('deposit.create', { to: to.id, amount: toDollars(amt), check_number: form.check_number.value }),
        receipt: r => ({ title: 'Deposit received', text: `${money(r.amount)} is pending in ${esc(r.to)} and will be available in about a minute. We'll notify you.`, rows: [['Reference', `<span class="num">${esc(r.ref)}</span>`]], after: () => { form.reset(); $$('.drop img', body).forEach(i => i.remove()); setTimeout(refreshBadge, 65000); } }),
      });
    });
  }

  async function viewCards(view) {
    const { cards } = await api('cards.list');
    view.innerHTML = `<div class="page-head"><div><h2>Cards</h2><p>Lock, limit and manage your cards. Changes apply instantly.</p></div></div>
      <div class="stack">${cards.map(c => `
        <div class="panel panel-pad card-wrap" data-card="${c.id}">
          <div>
            <div class="bank-card ${c.kind}${c.frozen ? ' frozen' : ''}">
              ${c.frozen ? `<div class="frost"><span>${I.lock.replace('<svg', '<svg width="16" height="16"')}LOCKED</span></div>` : ''}
              <div class="r1"><span class="mark">AXIOMATE</span><span style="font-size:12px;opacity:.8;font-weight:600">${c.kind === 'credit' ? 'REWARDS' : 'DEBIT'}</span></div>
              <span class="chip"></span>
              <div class="pan">•••• •••• •••• ${esc(c.last4)}</div>
              <div class="r3"><span><small>CARDHOLDER</small>${esc(c.holder)}</span><span><small>EXPIRES</small>${esc(c.exp)}</span><span style="font-weight:800;font-size:11px;opacity:.85">DEMO</span></div>
            </div>
            <p class="hint" style="margin-top:12px">Linked to ${esc(c.account)}. Display only — this card can't be used for purchases.</p>
          </div>
          <div>
            <h3 style="font-size:17px;margin-bottom:6px">${c.kind === 'credit' ? 'Rewards credit card' : 'Debit card'} ••${esc(c.last4)}</h3>
            <div>
              <div class="toggle-row"><div><b>Lock card</b><small>Temporarily block new purchases and withdrawals.</small></div><label class="switch danger"><input type="checkbox" data-k="frozen" ${c.frozen ? 'checked' : ''} aria-label="Lock card"><span></span></label></div>
              <div class="toggle-row"><div><b>Online purchases</b><small>Allow purchases on websites and apps.</small></div><label class="switch"><input type="checkbox" data-k="online" ${c.online ? 'checked' : ''} aria-label="Online purchases"><span></span></label></div>
              <div class="toggle-row"><div><b>International use</b><small>Allow purchases outside the United States.</small></div><label class="switch"><input type="checkbox" data-k="intl" ${c.intl ? 'checked' : ''} aria-label="International use"><span></span></label></div>
              <div class="toggle-row"><div><b>Contactless</b><small>Allow tap-to-pay.</small></div><label class="switch"><input type="checkbox" data-k="contactless" ${c.contactless ? 'checked' : ''} aria-label="Contactless payments"><span></span></label></div>
              <div class="toggle-row"><div><b>Daily spending limit</b><small class="num">${money(c.daily_limit)} per day</small></div><button class="btn btn-secondary btn-sm" data-limit>Change</button></div>
              <div class="toggle-row"><div><b>Lost, stolen or damaged?</b><small>Deactivate this card and order a replacement.</small></div><button class="btn btn-secondary btn-sm" data-replace>Replace card</button></div>
            </div>
          </div>
        </div>`).join('')}</div>`;

    $$('[data-card]', view).forEach(el => {
      const c = cards.find(x => String(x.id) === el.dataset.card);
      $$('input[data-k]', el).forEach(inp => inp.addEventListener('change', async () => {
        const k = inp.dataset.k;
        try {
          await api('cards.update', { id: c.id, [k]: inp.checked });
          if (k === 'frozen') { toast(inp.checked ? 'Card locked' : 'Card unlocked'); route(); refreshBadge(); }
          else toast('Card settings updated');
        } catch (err) { inp.checked = !inp.checked; toast(err.message, 'error'); }
      }));
      $('[data-limit]', el).addEventListener('click', () => {
        const m = modal({ title: 'Daily spending limit', body: `<form novalidate>${amountField('limit', 'New daily limit', 'Between $100.00 and $10,000.00.')}
          <div class="modal-actions"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary">Save limit</button></div></form>`,
          onOpen: mm => { $('#limit', mm).value = toDollars(c.daily_limit); } });
        $('form', m).addEventListener('submit', async e => {
          e.preventDefault();
          try { await api('cards.update', { id: c.id, daily_limit: e.target.limit.value }); closeModal(); toast('Limit updated'); route(); }
          catch (err) { formError(e.target, err.message); }
        });
      });
      $('[data-replace]', el).addEventListener('click', () => {
        const m = modal({ title: 'Replace card ••' + c.last4, body: `<form><p class="ink-2" style="margin-bottom:16px">Your current card will stop working right away. Your new card keeps the same settings.</p>
          <div class="field"><label for="reason">Reason</label><select class="input" id="reason" name="reason"><option>Lost</option><option>Stolen</option><option>Damaged</option><option>Other</option></select></div>
          <div class="modal-actions"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-danger">Deactivate and replace</button></div></form>` });
        $('form', m).addEventListener('submit', async e => {
          e.preventDefault();
          try { const r = await api('cards.replace', { id: c.id, reason: e.target.reason.value }); closeModal(); toast('New card ending in ' + r.last4 + ' is ready'); route(); refreshBadge(); }
          catch (err) { formError(e.target, err.message); }
        });
      });
    });
  }

  async function viewGoals(view) {
    const [{ goals }, { accounts }] = await Promise.all([api('goals.list'), api('accounts.list')]);
    const saved = goals.reduce((s, g) => s + g.saved, 0);
    view.innerHTML = `<div class="page-head"><div><h2>Savings goals</h2><p>${goals.length ? `${money(saved)} set aside across ${goals.length} goal${goals.length === 1 ? '' : 's'}.` : 'Give your savings a purpose.'} Contributions move from checking to savings.</p></div>
        <button class="btn btn-primary" id="new-goal">${I.plus.replace('<svg', '<svg width="18" height="18"')}New goal</button></div>
      <div class="grid g-3">${goals.map(g => {
        const pct = Math.min(100, g.saved / g.target * 100);
        const left = Math.max(0, g.target - g.saved);
        let pace = '';
        if (g.target_date && left > 0) {
          const months = Math.max(1, Math.round((new Date(g.target_date) - new Date()) / (30.4 * 86400000)));
          pace = `Save ${money(Math.ceil(left / months))}/mo to reach it by ${dstr(g.target_date)}`;
        }
        return `<div class="panel goal" data-goal="${g.id}">
          <div class="top"><span class="emoji">${esc(g.emoji || '🎯')}</span><div><h3>${esc(g.name)}</h3><span class="muted" style="font-size:13px">${pct >= 100 ? '<span class="pos" style="font-weight:600">Goal reached</span>' : g.target_date ? 'By ' + dstr(g.target_date) : 'No deadline'}</span></div></div>
          <div class="amts"><span><b class="num">${money(g.saved)}</b> saved</span><span class="num">of ${money(g.target)}</span></div>
          <div class="progress" role="progressbar" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct.toFixed(1)}%"></i></div>
          <span class="muted" style="font-size:13px">${Math.round(pct)}% complete${pace ? ' · ' + pace : left ? ' · ' + money(left) + ' to go' : ''}</span>
          <div class="acts"><button class="btn btn-primary btn-sm" data-add>Add money</button><button class="btn btn-ghost btn-sm" data-del>Delete</button></div></div>`;
      }).join('')}
        <button class="add-tile" id="new-goal-2"><span>${I.plus}Create a goal</span></button></div>`;

    const create = () => {
      const emojis = ['🏖️', '🏠', '🚗', '🎓', '💍', '🛟', '✈️', '🎁', '💻', '🐶'];
      const m = modal({ title: 'New savings goal', body: `<form novalidate>
        <div class="field"><label for="gn">Goal name</label><input class="input" id="gn" name="name" maxlength="40" placeholder="Emergency fund, vacation…" required></div>
        <div class="field"><span class="label">Icon</span><div class="emoji-pick">${emojis.map((e, i) => `<input type="radio" name="emoji" id="e${i}" value="${e}" ${i === 5 ? 'checked' : ''}><label for="e${i}">${e}</label>`).join('')}</div></div>
        ${amountField('target', 'Target amount')}
        <div class="field"><label for="td">Target date <span class="muted" style="font-weight:400">(optional)</span></label><input class="input" type="date" id="td" name="target_date" min="${todayISO()}"></div>
        <div class="modal-actions"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary">Create goal</button></div></form>` });
      $('form', m).addEventListener('submit', async e => {
        e.preventDefault(); const f = e.target;
        try { await api('goals.create', { name: f.name.value, emoji: f.emoji.value, target: f.target.value, target_date: f.target_date.value }); closeModal(); toast('Goal created'); route(); }
        catch (err) { formError(f, err.message); }
      });
    };
    $('#new-goal', view).addEventListener('click', create);
    $('#new-goal-2', view).addEventListener('click', create);

    $$('[data-goal]', view).forEach(el => {
      const g = goals.find(x => String(x.id) === el.dataset.goal);
      $('[data-add]', el).addEventListener('click', () => {
        const checking = accounts.filter(a => a.type === 'checking');
        const m = modal({ title: 'Add to ' + g.name, body: `<form novalidate>
          <div class="field"><label for="gf">From</label><select class="input" id="gf" name="from">${checking.map(a => acctOption(a)).join('')}</select></div>
          ${amountField('amount', 'Amount', g.target > g.saved ? money(g.target - g.saved) + ' left to reach your goal.' : 'You\'ve already reached this goal.')}
          <div class="modal-actions"><button type="button" class="btn btn-secondary" data-close>Cancel</button><button class="btn btn-primary">Add money</button></div></form>` });
        $('form', m).addEventListener('submit', async e => {
          e.preventDefault(); const f = e.target; const btn = $('.btn-primary', f);
          busy(btn, true, 'Adding');
          try { await api('goals.contribute', { id: g.id, from: f.from.value, amount: f.amount.value }); closeModal(); toast('Added to ' + g.name); refreshBadge(); route(); }
          catch (err) { busy(btn, false); formError(f, err.message); }
        });
      });
      $('[data-del]', el).addEventListener('click', async () => {
        if (!await confirmBox('Delete goal?', `"${esc(g.name)}" will be removed. Money already saved stays in your savings account.`, 'Delete goal', true)) return;
        await api('goals.delete', { id: g.id }); toast('Goal deleted'); route();
      });
    });
  }

  async function viewStatements(view, id, query) {
    const { accounts } = await api('accounts.list');
    id = id || accounts[0].id;
    const month = new URLSearchParams(query || '').get('month') || '';
    const d = await api('statements.get', null, month ? { id, month } : { id });
    const a = d.account;
    const monthName = new Date(d.month + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const isCredit = a.type === 'credit';
    const sign = v => isCredit ? -v : v;
    view.innerHTML = `<div class="page-head no-print"><div><h2>Statements</h2><p>Monthly statements for each account. Print or save as PDF.</p></div></div>
      <div class="panel panel-pad no-print" style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;margin-bottom:20px">
        <div class="field" style="margin:0;flex:1;min-width:200px"><label for="sa">Account</label><select class="input" id="sa">${accounts.map(x => `<option value="${x.id}" ${x.id === a.id ? 'selected' : ''}>${esc(x.nickname)} ••${esc(x.mask)}</option>`).join('')}</select></div>
        <div class="field" style="margin:0;flex:1;min-width:180px"><label for="sm">Period</label><select class="input" id="sm">${d.months.map(m => `<option value="${m}" ${m === d.month ? 'selected' : ''}>${new Date(m + '-15T12:00:00').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}${m === d.months[0] ? ' (in progress)' : ''}</option>`).join('')}</select></div>
        <button class="btn btn-secondary" id="print" style="height:44px">${I.print.replace('<svg', '<svg width="17" height="17"')}Print / Save PDF</button>
      </div>
      <article class="panel statement">
        <div class="s-head">
          <div><div class="brand" style="font-size:20px"><img src="/assets/img/logo.svg" alt="">Axiomate</div><p class="muted" style="font-size:12.5px;margin-top:8px">Concept bank · Simulated statement</p></div>
          <div style="text-align:right"><h3 style="font-size:20px">${typeLabel(a.type)} statement</h3><p class="ink-2" style="font-size:14px;margin-top:4px">${esc(monthName)}${d.complete ? '' : ' · statement in progress'}</p>
            <p class="ink-2" style="font-size:14px">${esc(d.holder)} · ${esc(a.nickname)} ••${esc(a.mask)}</p></div>
        </div>
        <div class="s-sum">
          <div>${isCredit ? 'Previous balance' : 'Opening balance'}<b>${money(sign(d.opening))}</b></div>
          <div>${isCredit ? 'Payments & credits' : 'Deposits & credits'}<b class="pos">+${money(d.credits)}</b></div>
          <div>${isCredit ? 'Purchases & charges' : 'Withdrawals & debits'}<b>−${money(d.debits)}</b></div>
          <div>${isCredit ? 'New balance' : 'Closing balance'}<b>${money(sign(d.closing))}</b></div>
        </div>
        ${d.transactions.length ? `<div class="table-scroll"><table><thead><tr><th>Date</th><th>Description</th><th class="hide-sm">Reference</th><th class="r">Amount</th><th class="r hide-sm">Balance</th></tr></thead><tbody>
          ${d.transactions.map(t => `<tr><td style="white-space:nowrap">${dt(t.created_at, { month: 'short', day: 'numeric' })}</td><td>${esc(t.description)}${t.memo ? `<div class="muted" style="font-size:12px">${esc(t.memo)}</div>` : ''}</td>
            <td class="hide-sm muted" style="font-family:ui-monospace,monospace;font-size:12px">${esc(t.ref)}</td><td class="r ${t.amount > 0 ? 'pos' : ''}">${signed(t.amount)}</td><td class="r hide-sm">${t.balance_after !== null ? money(sign(t.balance_after)) : ''}</td></tr>`).join('')}
          </tbody></table></div>` : '<div class="empty">No posted transactions in this period.</div>'}
        <p class="foot">This statement is generated by Axiomate Bank, a concept project. It is not a real bank statement, has no legal or financial standing, and must not be presented as proof of funds, income or residence. Not FDIC insured.</p>
      </article>`;
    $('#sa', view).addEventListener('change', e => { location.hash = '#/statements/' + e.target.value; });
    $('#sm', view).addEventListener('change', e => { location.hash = '#/statements/' + a.id + '?month=' + e.target.value; });
    $('#print', view).addEventListener('click', () => window.print());
  }

  async function viewNotifications(view) {
    const { notifications } = await api('notifications.list');
    const ic = k => k === 'alert' ? I.alert : k === 'success' ? I.check : I.info;
    view.innerHTML = `<div class="page-head"><div><h2>Notifications</h2><p>Alerts about your accounts, payments and security.</p></div></div>
      <div class="panel">${notifications.length ? notifications.map(n => `<div class="notif${n.read ? '' : ' unread'}"><span class="ni ${esc(n.kind)}">${ic(n.kind)}</span>
        <div><b>${esc(n.title)}</b><p>${esc(n.body)}</p></div><time datetime="${new Date(n.created_at * 1000).toISOString()}" title="${dt(n.created_at)} ${tm(n.created_at)}">${ago(n.created_at)}</time></div>`).join('')
        : `<div class="empty">${I.bell}<p>You're all caught up.</p></div>`}</div>`;
    if (notifications.some(n => !n.read)) { await api('notifications.read', {}); state.unread = 0; paintBadge(); }
  }

  async function viewSettings(view) {
    const d = await api('settings.get');
    const u = d.user;
    const parseUA = s => {
      const b = /Edg\//.test(s) ? 'Edge' : /OPR\//.test(s) ? 'Opera' : /Chrome\//.test(s) ? 'Chrome' : /Firefox\//.test(s) ? 'Firefox' : /Safari\//.test(s) ? 'Safari' : 'Browser';
      const o = /Windows/.test(s) ? 'Windows' : /iPhone|iPad/.test(s) ? 'iOS' : /Android/.test(s) ? 'Android' : /Mac OS/.test(s) ? 'macOS' : /Linux/.test(s) ? 'Linux' : 'Unknown OS';
      return b + ' on ' + o;
    };
    const theme = (() => { try { return localStorage.getItem('axb-theme') || 'system'; } catch (e) { return 'system'; } })();
    view.innerHTML = `<div class="page-head"><div><h2>Settings</h2><p>Manage your profile, alerts and security.</p></div></div>
      ${u.is_demo ? '<div class="form-note" style="margin-bottom:20px">You\'re using a guest demo profile. It will be deleted automatically within 24 hours. <a href="/signup" id="to-signup">Create a free account</a> to keep one.</div>' : ''}
      <div class="grid g-2">
        <form class="panel panel-pad" id="profile" novalidate><h3 style="font-size:17px;margin-bottom:18px">Profile</h3>
          <div class="grid g-2" style="gap:12px"><div class="field"><label for="fn">First name</label><input class="input" id="fn" name="first_name" value="${esc(u.first_name)}" maxlength="40"></div>
            <div class="field"><label for="ln">Last name</label><input class="input" id="ln" name="last_name" value="${esc(u.last_name)}" maxlength="40"></div></div>
          <div class="field"><label>Email</label><input class="input" value="${esc(u.email)}" disabled><span class="hint">Email is your sign-in ID and can't be changed.</span></div>
          <div class="field"><label for="phone">Phone <span class="muted" style="font-weight:400">(optional)</span></label><input class="input" id="phone" name="phone" value="${esc(u.phone)}" maxlength="20" inputmode="tel"></div>
          <p class="hint" style="margin-bottom:16px">Member since ${dt(u.member_since, { month: 'long', year: 'numeric' })}</p>
          <button class="btn btn-primary">Save profile</button></form>

        <div class="stack">
          <form class="panel panel-pad" id="alerts"><h3 style="font-size:17px;margin-bottom:8px">Alerts</h3>
            <div class="toggle-row"><div><b>Large transactions</b><small>When $1,000.00 or more leaves an account.</small></div><label class="switch"><input type="checkbox" name="large_txn" ${d.alerts.large_txn ? 'checked' : ''} aria-label="Large transaction alerts"><span></span></label></div>
            <div class="toggle-row"><div><b>Low balance</b><small>When checking or savings drops below a threshold.</small></div><label class="switch"><input type="checkbox" name="low_balance" ${d.alerts.low_balance ? 'checked' : ''} aria-label="Low balance alerts"><span></span></label></div>
            <div class="field" style="margin:8px 0 0"><label for="thr">Low balance threshold</label><div class="input-money"><input class="input" id="thr" name="low_balance_threshold" inputmode="decimal" value="${toDollars(d.alerts.low_balance_threshold)}"></div></div>
          </form>
          <div class="panel panel-pad"><h3 style="font-size:17px;margin-bottom:12px">Appearance</h3>
            <div class="tabs" style="margin:0" role="radiogroup" aria-label="Theme">${['system', 'light', 'dark'].map(t => `<a href="#" data-theme-set="${t}" class="${t === theme ? 'active' : ''}" role="radio" aria-checked="${t === theme}">${t[0].toUpperCase() + t.slice(1)}</a>`).join('')}</div></div>
        </div>
      </div>

      <div class="grid g-2 mt">
        <form class="panel panel-pad" id="pw" novalidate><h3 style="font-size:17px;margin-bottom:18px">Change password</h3>
          ${u.is_demo ? '<p class="muted" style="font-size:14px">Guest profiles don\'t have a password.</p>' : `
          <div class="field"><label for="cur">Current password</label><input class="input" id="cur" name="current" type="password" autocomplete="current-password"></div>
          <div class="field"><label for="np">New password</label><input class="input" id="np" name="new" type="password" autocomplete="new-password"><span class="hint">At least 10 characters with a letter and a number.</span></div>
          <div class="field"><label for="np2">Confirm new password</label><input class="input" id="np2" name="confirm" type="password" autocomplete="new-password"></div>
          <button class="btn btn-primary">Update password</button><p class="hint" style="margin-top:10px">Other devices will be signed out.</p>`}</form>

        <div class="panel"><div class="panel-head"><div><h3>Sign-in activity</h3><span class="sub">Recent attempts on your profile</span></div></div>
          <div class="panel-body"><ul class="mini-list">${d.logins.map(l => `<li><span class="acct-ico" style="width:34px;height:34px;${l.success ? '' : 'background:var(--neg-soft);color:var(--neg)'}">${l.success ? I.shield : I.alert}</span>
            <span class="t"><b>${l.success ? 'Signed in' : 'Failed attempt'}</b><small>${esc(parseUA(l.agent))} · ${esc(l.ip)}</small></span><span class="muted" style="font-size:12.5px;text-align:right">${dt(l.at, { month: 'short', day: 'numeric' })}<br>${tm(l.at)}</span></li>`).join('')}</ul>
            <button class="btn btn-secondary btn-block mt" id="signout-all">Sign out of all devices</button></div></div>
      </div>

      <div class="panel panel-pad mt" style="border-color:color-mix(in srgb, var(--neg) 35%, var(--line))">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:center;flex-wrap:wrap">
          <div><h3 style="font-size:17px">Close profile</h3><p class="ink-2" style="font-size:14px;margin-top:4px">Permanently delete your profile, accounts and all simulated history. This can't be undone.</p></div>
          <button class="btn btn-danger" id="close">Close profile</button></div></div>`;

    $('#profile', view).addEventListener('submit', async e => {
      e.preventDefault(); const f = e.target; clearError(f);
      try { await api('settings.profile', { first_name: f.first_name.value, last_name: f.last_name.value, phone: f.phone.value });
        state.user.first_name = f.first_name.value.trim(); state.user.last_name = f.last_name.value.trim(); paintUser(); toast('Profile saved'); }
      catch (err) { formError(f, err.message); }
    });
    const alerts = $('#alerts', view);
    let at;
    alerts.addEventListener('change', () => { clearTimeout(at); at = setTimeout(async () => {
      try { await api('settings.alerts', { large_txn: alerts.large_txn.checked, low_balance: alerts.low_balance.checked, low_balance_threshold: alerts.low_balance_threshold.value }); toast('Alert preferences saved'); }
      catch (err) { toast(err.message, 'error'); }
    }, 250); });
    alerts.addEventListener('submit', e => e.preventDefault());
    $$('[data-theme-set]', view).forEach(a => a.addEventListener('click', e => { e.preventDefault(); setTheme(a.dataset.themeSet); route(); }));
    const pw = $('#pw', view);
    if (!u.is_demo) pw.addEventListener('submit', async e => {
      e.preventDefault(); clearError(pw);
      if (pw.new.value !== pw.confirm.value) return formError(pw, 'New passwords don\'t match.');
      try { await api('settings.password', { current: pw.current.value, new: pw.new.value }); pw.reset(); toast('Password updated'); refreshBadge(); }
      catch (err) { formError(pw, err.message); }
    });
    $('#signout-all', view).addEventListener('click', async () => {
      if (!await confirmBox('Sign out everywhere?', 'You\'ll be signed out on every device, including this one.', 'Sign out everywhere')) return;
      await api('settings.signout_all', {}); location.replace('/login?signedout=1');
    });
    $('#close', view).addEventListener('click', () => {
      const m = modal({ title: 'Close your profile?', body: `<form novalidate><p class="ink-2" style="margin-bottom:16px">Your profile, accounts, cards, goals and history will be permanently deleted.</p>
        ${u.is_demo ? '' : '<div class="field"><label for="cp">Enter your password to confirm</label><input class="input" id="cp" name="password" type="password" autocomplete="current-password"></div>'}
        <div class="modal-actions"><button type="button" class="btn btn-secondary" data-close>Keep my profile</button><button class="btn btn-danger">Permanently delete</button></div></form>` });
      $('form', m).addEventListener('submit', async e => {
        e.preventDefault();
        try { await api('settings.close', { password: e.target.password ? e.target.password.value : '' }); location.replace('/login?closed=1'); }
        catch (err) { formError(e.target, err.message); }
      });
    });
  }

  const NAV = [
    ['/', 'Overview', I.home], ['/accounts', 'Accounts', I.accounts], ['/move', 'Move money', I.move],
    ['/cards', 'Cards', I.card], ['/goals', 'Goals', I.goal], ['/statements', 'Statements', I.doc],
  ];
  const NAV2 = [['/notifications', 'Notifications', I.bell], ['/settings', 'Settings', I.gear]];
  const TABS = [['/', 'Home', I.home], ['/accounts', 'Accounts', I.accounts], ['/move', 'Pay', I.move], ['/cards', 'Cards', I.card], ['/settings', 'More', I.more]];

  function paintShell() {
    $('#side-nav').innerHTML = NAV.map(([p, l, i]) => `<a href="#${p}" data-nav="${p}">${i}<span>${l}</span></a>`).join('')
      + '<div class="nav-label">Account</div>' + NAV2.map(([p, l, i]) => `<a href="#${p}" data-nav="${p}">${i}<span>${l}</span>${p === '/notifications' ? '<span class="badge" id="nav-badge" hidden></span>' : ''}</a>`).join('');
    $('#tabbar').innerHTML = TABS.map(([p, l, i]) => `<a href="#${p}" data-nav="${p}">${i}<span>${l}</span></a>`).join('');
    $('#bell').innerHTML = I.bell + '<span class="dot" id="bell-dot" hidden></span>';
    $('#gear').innerHTML = I.gear;
    paintTheme(); paintUser(); paintBadge();
    $$('[data-logout]').forEach(a => a.addEventListener('click', async e => { e.preventDefault(); try { await api('auth.logout', {}); } catch (err) { } location.replace('/login?signedout=1'); }));
    $('#theme-btn').addEventListener('click', () => {
      const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
      setTheme(dark ? 'light' : 'dark'); route();
    });
    window.addEventListener('scroll', () => $('#topbar').classList.toggle('scrolled', scrollY > 4), { passive: true });
  }
  function paintUser() {
    const u = state.user;
    $('#side-user').innerHTML = `<span class="avatar">${esc((u.first_name[0] || '') + (u.last_name[0] || '')).toUpperCase()}</span><span class="t"><b>${esc(u.first_name)} ${esc(u.last_name)}</b><small>${u.is_demo ? 'Guest demo' : 'Personal banking'}</small></span>`;
  }
  function paintBadge() {
    const n = state.unread;
    const dot = $('#bell-dot'), nb = $('#nav-badge');
    if (dot) { dot.hidden = !n; dot.textContent = n > 9 ? '9+' : n; }
    if (nb) { nb.hidden = !n; nb.textContent = n > 9 ? '9+' : n; }
  }
  async function refreshBadge() { try { const r = await api('auth.me'); state.unread = r.unread; paintBadge(); } catch (e) { } }
  function setTheme(t) {
    try { t === 'system' ? localStorage.removeItem('axb-theme') : localStorage.setItem('axb-theme', t); } catch (e) { }
    if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
    paintTheme();
  }
  function paintTheme() {
    const dark = document.documentElement.getAttribute('data-theme') === 'dark' || (!document.documentElement.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches);
    $('#theme-btn').innerHTML = dark ? I.sun : I.moon;
    $('#theme-btn').setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  function setTitle(t) { $('#page-title').textContent = t; document.title = t + ' — Axiomate'; }

  const ROUTES = [
    [/^\/$/, viewDashboard, 'Overview'], [/^\/accounts$/, viewAccounts, 'Accounts'], [/^\/accounts\/(\d+)$/, viewAccount, 'Account'],
    [/^\/move(?:\/(\w+))?$/, viewMove, 'Move money'], [/^\/cards$/, viewCards, 'Cards'], [/^\/goals$/, viewGoals, 'Goals'],
    [/^\/statements(?:\/(\d+))?$/, viewStatements, 'Statements'], [/^\/notifications$/, viewNotifications, 'Notifications'], [/^\/settings$/, viewSettings, 'Settings'],
  ];
  let renderSeq = 0, lastHash = location.hash;
  async function route() {
    const raw = location.hash.replace(/^#/, '') || '/';
    const [path, query] = raw.split('?');
    const match = ROUTES.find(([re]) => re.test(path));
    if (!match) { location.replace('#/'); return; }
    const [re, fn, title] = match;
    const args = path.match(re).slice(1);
    const mr = $('#modal-root');
    if (mr.classList.contains('open') && !mr.dataset.locked && location.hash !== lastHash) closeModal();
    lastHash = location.hash;
    const my = ++renderSeq;
    observers.splice(0).forEach(o => o.disconnect());
    $$('[data-nav]').forEach(a => {
      const p = a.dataset.nav;
      a.classList.toggle('active', p === '/' ? path === '/' : path.startsWith(p) || (p === '/settings' && path === '/notifications' && !!a.closest('#tabbar')));
      if (a.classList.contains('active')) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
    setTitle(title);
    const view = $('#view');
    const stale = view.dataset.path !== path;
    if (stale) { view.innerHTML = skeleton(); window.scrollTo(0, 0); }
    view.dataset.path = path;
    try {
      const tmp = document.createElement('div');
      mountQueue = [];
      await fn(tmp, ...args, query);
      if (my !== renderSeq) return;
      view.replaceChildren(tmp);
      mountQueue.splice(0).forEach(f => f());
      if (stale) view.focus({ preventScroll: true });
    } catch (err) {
      if (my !== renderSeq || err.message === 'Signed out') return;
      view.innerHTML = `<div class="empty" style="padding:80px 20px">${I.alert}<p style="margin-bottom:16px">${esc(err.message)}</p><button class="btn btn-secondary" id="retry">Try again</button></div>`;
      $('#retry').addEventListener('click', route);
    }
  }

  const idle = (() => {
    let lastServer = Date.now(), lastActive = Date.now(), warned = false, timer = null;
    const touch = () => { lastServer = Date.now(); };
    const activity = () => {
      lastActive = Date.now();
      if (!warned && Date.now() - lastServer > 4 * 60 * 1000) api('session.ping', {}).catch(() => { });
    };
    const tick = () => {
      const quiet = (Date.now() - Math.max(lastActive, lastServer)) / 1000;
      const left = Math.round(state.idle - quiet);
      if (left <= 0) { location.replace('/login?timeout=1'); return; }
      if (left <= 120 && !warned) {
        warned = true;
        const m = modal({ title: 'Are you still there?', body: `<p class="ink-2">For your security, you'll be signed out in <b id="idle-left" class="num">2:00</b>.</p>
          <div class="modal-actions"><button class="btn btn-secondary" data-out>Sign out</button><button class="btn btn-primary" data-stay>Stay signed in</button></div>` });
        $('#modal-root').dataset.locked = '1';
        $('[data-stay]', m).addEventListener('click', async () => { delete $('#modal-root').dataset.locked; warned = false; closeModal(); try { await api('session.ping', {}); } catch (e) { } lastActive = Date.now(); });
        $('[data-out]', m).addEventListener('click', async () => { try { await api('auth.logout', {}); } catch (e) { } location.replace('/login?signedout=1'); });
      }
      const el = $('#idle-left');
      if (el && warned) el.textContent = Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
    };
    const start = () => {
      ['pointerdown', 'keydown', 'scroll', 'touchstart'].forEach(ev => window.addEventListener(ev, () => { if (!warned) activity(); }, { passive: true }));
      timer = setInterval(tick, 1000);
    };
    return { touch, start };
  })();

  async function boot() {
    try {
      const me = await api('auth.me');
      state.user = me.user; state.unread = me.unread; state.idle = me.idle_seconds || 900;
    } catch (e) { return; }
    paintShell();
    window.addEventListener('hashchange', route);
    await route();
    idle.start();
    if (new URLSearchParams(location.search).has('welcome')) {
      history.replaceState(null, '', '/app/' + location.hash);
      modal({ title: 'Welcome to Axiomate', body: `<p class="ink-2" style="margin-bottom:14px">Your accounts are open. We've added six months of sample activity so you can explore right away.</p>
        <ul class="ink-2" style="padding-left:18px;margin:0 0 6px;display:grid;gap:6px;font-size:14.5px"><li>Move money between accounts or to other members</li><li>Deposit a check and watch it post</li><li>Lock your card or set a spending limit</li><li>Create a savings goal</li></ul>
        <p class="hint" style="margin-top:12px">Remember: Axiomate is a concept. Nothing here is real money.</p>
        <div class="modal-actions"><button class="btn btn-primary btn-block" data-close>Get started</button></div>` });
    }
  }
  boot();
})();
