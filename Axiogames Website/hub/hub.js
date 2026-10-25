 


(function () {
  'use strict';
  var doc = document, root = doc.getElementById('hub'), modalRoot = doc.getElementById('modal-root');
  var S = { servers: [], roles: [], roleMap: {}, perms: {}, server: 0, me: null, csrf: '', channels: [], dms: [], online: [], ticket: null, staffWaiting: 0, section: 'chat', view: null, install: null, app: {}, icons: {}, prefs: {}, friendRequests: 0, lastDmUnread: -1 };
  var STATUS = { online: 'Online', idle: 'Idle', dnd: 'Do Not Disturb', invisible: 'Invisible', offline: 'Offline' };
  var conv = null;             
  var timers = { msgs: 0, state: 0 };

   
  function el(tag, attrs, kids) {
    var n = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else if (k === 'html') n.innerHTML = v;           
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c !== null && c !== undefined && c !== false) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  var ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3 2 11h3v9h5v-6h4v6h5v-9h3z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4V6a2 2 0 0 1 2-2z"/></svg>',
    ticket: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4zm7 0v2h2V7zm0 4v2h2v-2zm0 4v2h2v-2z"/></svg>',
    roblox: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.2 2 2 17.8 17.8 22 22 6.2zm7.6 13.4-4.2-1.1 1.1-4.2 4.2 1.1z"/></svg>',
    staff: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5z"/></svg>',
    install: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 3h2v9l3.5-3.5 1.4 1.4L12 15.8 6.1 9.9l1.4-1.4L11 12zM4 18h16v2H4z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
    gear: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m19.4 13 .1-1-.1-1 2.1-1.6-2-3.5-2.5 1a7 7 0 0 0-1.7-1L15 3h-4l-.4 2.9a7 7 0 0 0-1.7 1l-2.5-1-2 3.5L6.5 11l-.1 1 .1 1-2.1 1.6 2 3.5 2.5-1c.5.4 1.1.7 1.7 1L11 21h4l.4-2.9c.6-.3 1.2-.6 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 3H4v18h6v-2H6V5h4zm5.6 4.4L14.2 8.8 16.4 11H9v2h7.4l-2.2 2.2 1.4 1.4L20.2 12z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z"/></svg>',
    reply: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M10 9V5l-7 7 7 7v-4.1c5 0 8.5 1.6 11 5.1-1-5-4-10-11-11z"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.2V21h3.8L17.8 9.9l-3.7-3.7zM20.7 7c.4-.4.4-1 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7z"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/></svg>',
    qr: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm8-2h3v3h-3zm3 3h3v3h-3zm-3 3h3v2h-3zm5-6h1v3h-1zm0 5h1v3h-3v-1h2z"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6 10.6 12 5 6.4z"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 3h7v7h-2V6.4l-8.3 8.3-1.4-1.4L17.6 5H14zM5 5h6v2H7v10h10v-4h2v6H5z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m9.5 16.2-4.2-4.2-1.4 1.4 5.6 5.6L21 7.5l-1.4-1.4z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 6h-3a15.7 15.7 0 0 0-1.4-3.6A8 8 0 0 1 18.9 8zM12 4c.8 1.2 1.5 2.5 1.9 4h-3.8c.4-1.5 1.1-2.8 1.9-4zM4.3 14a8 8 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4zm.8 2h3a15.7 15.7 0 0 0 1.4 3.6A8 8 0 0 1 5.1 16zm3-8h-3a8 8 0 0 1 4.4-3.6C8.9 5.5 8.4 6.7 8.1 8zM12 20c-.8-1.2-1.5-2.5-1.9-4h3.8c-.4 1.5-1.1 2.8-1.9 4zm2.3-6H9.7a14.7 14.7 0 0 1 0-4h4.6a14.7 14.7 0 0 1 0 4zm.2 5.6c.6-1.1 1.1-2.3 1.4-3.6h3a8 8 0 0 1-4.4 3.6zM16.3 14a16.5 16.5 0 0 0 0-4h3.4a8 8 0 0 1 0 4z"/></svg>'
  };
  function icon(name) { return el('span', { class: 'ico', html: ICONS[name] || '' }); }
   
  function cicon(key, cls) {
    var i = S.icons[key] || S.icons.hash;
    if (!i) return el('span', { class: 'ico' + (cls ? ' ' + cls : '') });
    return el('span', { class: 'ico' + (i.color ? ' ico--color' : '') + (cls ? ' ' + cls : ''), html: '<svg viewBox="' + (i.box || '0 0 24 24') + '"' + (i.color ? '' : ' fill="currentColor"') + ' aria-hidden="true">' + i.svg + '</svg>' });
  }
  function homeIcon() {
    var key = S.app.home_icon || 'brand';
    return S.prefs.theme !== 'blossom' && key === 'blossom-tree' ? 'shield' : key;
  }
  function applyLook() {
    var a = S.app || {}, r = doc.documentElement.style;
    var blossom = S.prefs && S.prefs.theme === 'blossom';
    if (!blossom && /^#[0-9a-f]{6}$/i.test(a.accent || '')) { r.setProperty('--accent', a.accent); r.setProperty('--accent2', a.accent); }
    else { r.removeProperty('--accent'); r.removeProperty('--accent2'); }
  }
  function toast(text, bad) {
    var t = el('div', { class: 'toast' + (bad ? ' bad' : ''), text: text, role: 'status' });
    doc.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3500);
  }
  function api(path, data, method) {
    var controller = new AbortController(), timeout = setTimeout(function () { controller.abort(); }, 20000);
    var opts = { method: method || (data ? 'POST' : 'GET'), credentials: 'same-origin', headers: {} };
    opts.signal = controller.signal;
    if (data) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(data); }
    if (opts.method !== 'GET') opts.headers['X-CSRF-Token'] = S.csrf;
    return fetch('/api/' + path, opts).then(function (r) {
      return r.json().catch(function () { throw new Error('The server returned an unexpected response. Please try again.'); }).then(function (j) {
        if (!r.ok || j.ok === false) { var e = new Error(j.error || 'Something went wrong. Please try again.'); e.status = r.status; throw e; }
        return j;
      });
    }).catch(function (e) {
      if (e.name === 'AbortError') throw new Error('The request timed out. Check your connection and try again.');
      if (e instanceof TypeError) throw new Error('Unable to connect. Check your internet connection and try again.');
      throw e;
    }).finally(function () { clearTimeout(timeout); });
  }
  var COSMETICS = {
    effect: [['smoke', 'Shadow Smoke'], ['petals', 'Falling Petals'], ['arise', 'Arise'], ['lightning', 'Lightning'], ['snow', 'Snowfall'], ['embers', 'Embers'], ['stars', 'Starlight'], ['scan', 'System Scan'], ['aura', 'Monarch Aura'], ['rain', 'Rain']],
    deco: [['shadow-flame', 'Shadow Flame'], ['blossom-wreath', 'Blossom Wreath'], ['system-frame', 'System Frame'], ['crown', 'Crown'], ['halo', 'Halo'], ['lightning', 'Lightning Ring'], ['rune', 'Rune Circle'], ['monarch', 'Monarch'], ['frost', 'Frost'], ['ember', 'Ember Ring']],
    plate: [['shadow-mist', 'Shadow Mist'], ['blossom', 'Blossom'], ['system-grid', 'System Grid'], ['gate', 'Dungeon Gate'], ['aurora', 'Aurora'], ['ember', 'Ember'], ['starfield', 'Starfield'], ['glitch', 'Glitch'], ['gold', 'Gold'], ['void', 'Void']],
    namestyle: [['violet', 'Violet'], ['blossom', 'Blossom'], ['system', 'System'], ['monarch', 'Monarch'], ['fire', 'Fire'], ['ice', 'Ice'], ['gold', 'Gold'], ['rainbow', 'Rainbow'], ['glitch', 'Glitch'], ['chrome', 'Chrome']]
  };
  function decoClass(u) { return u && u.deco ? ' deco deco--' + u.deco : ''; }
  function nameClass(u) { return u && u.namestyle ? ' ns ns--' + u.namestyle : ''; }
  function plateClass(u) { return u && u.plate ? ' np np--' + u.plate : ''; }
  function nameEl(u, tag) { return el(tag || 'span', { class: 'nm' + nameClass(u), text: u.name, 'data-text': u.name }); }
  function statusDot(status) { return status && status !== 'offline' ? el('span', { class: 'dot dot--' + status, title: STATUS[status] || '' }) : null; }
  function avatarS(user, cls) { return el('span', { class: 'avwrap' + decoClass(user) }, [avatar(user, cls), statusDot(user && user.status)]); }
  function avatar(user, cls) {
    if (user && user.avatar) return el('img', { class: 'av' + (cls ? ' ' + cls : ''), src: user.avatar, alt: '', loading: 'lazy' });
    return el('span', { class: 'av' + (cls ? ' ' + cls : ''), text: ((user && user.name) || '?').slice(0, 1).toUpperCase() });
  }
   
  function topRole(u, sid, want) {
    var best = null;
    ((u && u.roles) || []).forEach(function (id) { var r = S.roleMap[id]; if (r && r.server_id === sid && (!want || r[want]) && (!best || r.position < best.position)) best = r; });
    return best;
  }
  function roleTint(u, sid) { var r = sid && !(u && u.namestyle) ? topRole(u, sid, 'color') : null; return r ? 'color:' + r.color : null; }
  function roleIcon(u, sid) { var r = sid ? topRole(u, sid, 'icon') : null; if (!r) return null; var i = cicon(r.icon, 'role-ic'); i.title = r.name; if (r.color) i.style.color = r.color; return i; }
  function hasPerm(sid, perm) { return S.me.rank >= 1 || ((S.perms[sid] || []).indexOf(perm) >= 0); }
  function serverIcon(sv) {
    if (sv.icon_img) return el('img', { src: sv.icon_img, alt: '' });
    if (!sv.icon || sv.icon === 'brand') return el('img', { src: '/assets/brand/mark-256.png', alt: '' });
    return cicon(sv.icon);
  }
  function currentServer() {
    var sv = S.servers.filter(function (x) { return x.id === S.server; })[0];
    if (!sv) { sv = S.servers[0] || null; S.server = sv ? sv.id : 0; }
    return sv;
  }
  function openServer(id) { S.server = id; try { localStorage.setItem('hub.server', String(id)); } catch (e) {   } go('chat', null); }
  function staffBadge(role) {
    if (!role) return null;
    return el('span', { class: 'badge ' + (role === 'owner' ? 'badge--owner' : 'badge--staff'), text: role === 'owner' ? 'Owner' : role === 'admin' ? 'Admin' : 'Staff' });
  }
  function utc(s) { return s ? new Date(String(s).replace(' ', 'T') + 'Z') : null; }
  function timeText(s) {
    var d = utc(s); if (!d) return '';
    var now = new Date(), t = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (d.toDateString() === now.toDateString()) return 'Today at ' + t;
    var y = new Date(now); y.setDate(now.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Yesterday at ' + t;
    return d.toLocaleDateString() + ' ' + t;
  }
  function dayText(s) { var d = utc(s); return d ? d.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : ''; }
   
  function richText(text) {
    var frag = doc.createDocumentFragment(), re = /https?:\/\/[^\s<>"']+/g, last = 0, m;
    while ((m = re.exec(text))) {
      if (m.index > last) frag.appendChild(doc.createTextNode(text.slice(last, m.index)));
      frag.appendChild(el('a', { href: m[0], target: '_blank', rel: 'noopener noreferrer nofollow', text: m[0] }));
      last = m.index + m[0].length;
    }
    if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)));
    return frag;
  }
  function modal(build) {
    var previousFocus = doc.activeElement;
    var box = el('div', { class: 'modal__box', role: 'dialog', 'aria-modal': 'true' });
    var wrap = el('div', { class: 'modal', onclick: function (e) { if (e.target === wrap) close(); } }, [box]);
    function close() { wrap.remove(); doc.removeEventListener('keydown', esc); if (previousFocus && previousFocus.isConnected) previousFocus.focus(); }
    function esc(e) {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); close(); }
      if (e.key === 'Tab') {
        var nodes = Array.prototype.filter.call(box.querySelectorAll('input,textarea,select,button,a[href],[tabindex="0"]'), function (n) { return !n.disabled && n.getClientRects().length; });
        if (!nodes.length) { e.preventDefault(); return; }
        var first = nodes[0], last = nodes[nodes.length - 1];
        if (e.shiftKey && (doc.activeElement === first || !box.contains(doc.activeElement))) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (doc.activeElement === last || !box.contains(doc.activeElement))) { e.preventDefault(); first.focus(); }
      }
    }
    doc.addEventListener('keydown', esc);
    build(box, close);
    modalRoot.appendChild(wrap);
    var f = box.querySelector('input,textarea,select,button.btn--primary'); if (f) f.focus();
    return close;
  }
   
  function gifPicker(kind, done) {
    modal(function (box, close) {
      var q = el('input', { type: 'search', class: 'input', placeholder: 'Search GIFs', 'aria-label': 'Search GIFs' });
      var grid = el('div', { class: 'gifs' }), more = el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'More', hidden: true }), note = el('p', { class: 'gifs__note' });
      var page = 1, timer = 0, seq = 0, busy = false;
      function load(reset) {
        if (reset) { page = 1; clear(grid); }
        var my = ++seq; note.textContent = 'Loading…'; more.hidden = true;
        api('hub/gifs?q=' + encodeURIComponent(q.value.trim()) + '&page=' + page).then(function (j) {
          if (my !== seq) return;
          note.textContent = j.results.length || !reset ? 'Powered by ' + (j.provider === 'giphy' ? 'GIPHY' : 'KLIPY') : 'No GIFs found. Try other words.';
          j.results.forEach(function (g) {
            var img = el('img', { src: g.preview, alt: g.title || 'GIF', loading: 'lazy' });
            grid.appendChild(el('button', { class: 'gifs__item', type: 'button', title: g.title || '', onclick: function () {
              if (busy) return; busy = true; note.textContent = 'Setting your ' + kind + '…';
              api('hub/' + kind, { gif_url: kind === 'avatar' ? g.avatar : g.banner }).then(function () { close(); done(); })
                .catch(function (x) { note.textContent = x.message; }).then(function () { busy = false; });
            } }, [img]));
          });
          more.hidden = !j.next;
        }).catch(function (x) { if (my === seq) note.textContent = x.message; });
      }
      q.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { load(true); }, 350); });
      more.addEventListener('click', function () { page++; load(false); });
      box.classList.add('modal__box--wide');
      box.appendChild(el('h2', { text: kind === 'avatar' ? 'Pick a GIF avatar' : 'Pick a GIF banner' }));
      box.appendChild(q); box.appendChild(grid);
      box.appendChild(el('div', { class: 'modal__actions' }, [note, more, el('button', { class: 'btn btn--ghost', type: 'button', text: 'Close', onclick: close })]));
      load(true);
    });
  }
  function confirmBox(title, text, yes, danger) {
    return new Promise(function (resolve) {
      modal(function (box, close) {
        box.appendChild(el('h2', { text: title }));
        box.appendChild(el('p', { text: text }));
        box.appendChild(el('div', { class: 'modal__actions' }, [
          el('button', { class: 'btn btn--ghost', type: 'button', text: 'Cancel', onclick: function () { close(); resolve(false); } }),
          el('button', { class: 'btn ' + (danger ? 'btn--danger' : 'btn--primary'), type: 'button', text: yes, onclick: function () { close(); resolve(true); } })
        ]));
      });
    });
  }
  var qrParam = new URLSearchParams(location.search).get('qr');

   
  var authView = 'signin', authTicket = '', authLogin = '';
  function renderLogin(note) {
    stopTimers();
    clear(root);
    var left = el('div', { class: 'auth' });
    var card = el('div', { class: 'login__card' + (authView === 'signin' ? '' : ' login__card--single') }, [left]);
    if (authView === 'signin') {
      var qrBox = el('div', { class: 'qr__box' }), qrState = el('small', { text: 'Getting a code…' });
      card.appendChild(el('div', { class: 'qr' }, [qrBox, el('h2', { text: 'Log in with QR code' }), el('small', { text: 'Scan this with the camera on a phone where you are signed in to ' + (S.app.name || 'Axiomate Hub') + ', then approve the login.' }), qrState]));
    }
    root.appendChild(el('div', { class: 'login' }, [card]));
    drawAuth(left, note);
    if (authView === 'signin' && !qrParam) startQr(qrBox, qrState);
  }
  function authGo(view, note) { authView = view; renderLogin(note); }
  function fieldRow(label, input, hint) { return el('label', { class: 'field' }, [el('span', { text: label }), input, hint || null]); }
  function afterSignIn() { location.replace('/hub' + (qrParam ? '?qr=' + encodeURIComponent(qrParam) : '')); }
  function authForm(left, title, text, fields, button, submit, links) {
    var err = el('p', { class: 'err', hidden: true }), btn = el('button', { class: 'btn btn--primary btn--block', type: 'submit', text: button });
    var form = el('form', { novalidate: true }, fields.concat([err, btn]));
    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (btn.disabled) return; err.hidden = true; btn.disabled = true;
      Promise.resolve().then(submit).catch(function (x) { err.hidden = false; err.textContent = x.message; }).then(function () { btn.disabled = false; });
    });
    left.appendChild(el('div', { class: 'login__brand' }, [cicon(homeIcon(), 'login__logo'), el('b', { text: S.app.name || 'Axiomate Hub' })]));
    left.appendChild(el('h1', { text: title }));
    if (text) left.appendChild(el('p', { text: text }));
    left.appendChild(form);
    if (links) left.appendChild(el('p', { class: 'auth__links' }, links));
    var f = form.querySelector('input'); if (f) setTimeout(function () { f.focus(); }, 0);
  }
  function linkBtn(text, fn) { return el('button', { class: 'linkbtn', type: 'button', text: text, onclick: fn }); }
  function drawAuth(left, note) {
    if (authView === 'register') {
      var user = el('input', { autocomplete: 'username', maxlength: '20', placeholder: 'letters, numbers, _ and .' }), avail = el('small', { class: 'field__hint' });
      var pw = el('input', { type: 'password', autocomplete: 'new-password', maxlength: '128' }), pw2 = el('input', { type: 'password', autocomplete: 'new-password', maxlength: '128' });
      var email = el('input', { type: 'email', autocomplete: 'email', maxlength: '190', placeholder: 'you@example.com' });
      var t = 0, checkSequence = 0;
      user.addEventListener('input', function () {
        clearTimeout(t); var sequence = ++checkSequence; avail.className = 'field__hint'; avail.textContent = '';
        if (user.value.length < 3) return;
        t = setTimeout(function () { api('hub/auth/check', { username: user.value }).then(function (j) { if (sequence !== checkSequence) return; avail.className = 'field__hint ' + (j.available ? 'okmsg' : 'err'); avail.textContent = j.available ? 'That username is free.' : j.problem; }).catch(function () { if (sequence === checkSequence) avail.textContent = 'Unable to check availability right now.'; }); }, 300);
      });
      return authForm(left, 'Create an account', 'Pick a username nobody has used before. It is yours for good.', [
        fieldRow('Username', user, avail), fieldRow('Password', pw, el('small', { class: 'field__hint', text: 'At least 8 characters, with a letter and a number.' })), fieldRow('Confirm password', pw2),
        fieldRow('Email', email, el('small', { class: 'field__hint', text: 'We send a code to verify it.' })),
        el('div', { class: 'field field--off' }, [el('span', {}, ['Phone number ', el('em', { class: 'soon', text: 'Coming soon' })]), el('input', { disabled: true, placeholder: 'Phone verification is coming soon' })])
      ], 'Continue', function () {
        if (pw.value !== pw2.value) throw new Error('The two passwords are not the same.');
        return api('hub/auth/register', { username: user.value, password: pw.value, email: email.value }).then(function (j) { if (j && j.email_sent === false) { try { sessionStorage.setItem('hub.mailfail', '1'); } catch (e) {   } } afterSignIn(); });
      }, ['Already have an account? ', linkBtn('Sign in', function () { authGo('signin'); })]);
    }
    if (authView === 'twofa') {
      var code = el('input', { inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '9', placeholder: '123456' });
      return authForm(left, 'Two-factor check', 'Enter the 6 digit code from your authenticator app. Lost your phone? Use one of your backup codes.', [fieldRow('Code', code)], 'Sign In', function () {
        return api('hub/auth/2fa', { ticket: authTicket, code: code.value }).then(afterSignIn).catch(function (x) { if (x.status === 410) authGo('signin', x.message); throw x; });
      }, [linkBtn('Back to sign in', function () { authGo('signin'); })]);
    }
    if (authView === 'forgot') {
      var who = el('input', { autocomplete: 'username', value: authLogin });
      return authForm(left, 'Forgot your password?', 'Enter your username or email. If the account has a verified email, we send it a reset code.', [fieldRow('Username or email', who)], 'Send Code', function () {
        authLogin = who.value.trim();
        return api('hub/auth/forgot', { username: authLogin }).then(function () { authGo('reset', 'If that account exists, a code is on its way to its email.'); });
      }, [linkBtn('Back to sign in', function () { authGo('signin'); })]);
    }
    if (authView === 'reset') {
      var rc = el('input', { inputmode: 'numeric', maxlength: '6', autocomplete: 'one-time-code' }), np = el('input', { type: 'password', autocomplete: 'new-password' }), np2 = el('input', { type: 'password', autocomplete: 'new-password' });
      return authForm(left, 'Reset your password', note || 'Enter the code from the email and your new password.', [fieldRow('Code', rc), fieldRow('New password', np), fieldRow('Confirm new password', np2)], 'Reset Password', function () {
        if (np.value !== np2.value) throw new Error('The two passwords are not the same.');
        return api('hub/auth/reset', { username: authLogin, code: rc.value, password: np.value }).then(function (j) { if (j.signin) authGo('signin', 'Password changed. Sign in with your new password.'); else afterSignIn(); });
      }, [linkBtn('Send a new code', function () { authGo('forgot'); })]);
    }
    var u = el('input', { autocomplete: 'username', maxlength: '190' }), p = el('input', { type: 'password', autocomplete: 'current-password', maxlength: '128' });
    authForm(left, qrParam ? 'Sign in to approve' : (S.app.login_title || 'Welcome back!'), note || (qrParam ? 'Sign in on this device first, then approve the login on your other device.' : (S.app.login_text || 'Chat with the community, open and track tickets, and link your Roblox account.')),
      [fieldRow('Username or email', u), fieldRow('Password', p), el('p', { class: 'auth__forgot' }, [linkBtn('Forgot your password?', function () { authLogin = u.value.trim(); authGo('forgot'); })])], 'Sign In', function () {
        return api('hub/auth/login', { username: u.value, password: p.value }).then(function (j) { if (j.two_factor) { authTicket = j.ticket; authGo('twofa'); } else afterSignIn(); });
      }, ['Need an account? ', linkBtn('Register', function () { authGo('register'); })]);
  }
   
  function renderVerify(me, note) {
    stopTimers();
    try { if (!note && sessionStorage.getItem('hub.mailfail')) { sessionStorage.removeItem('hub.mailfail'); note = 'We could not send the code to ' + me.email + ' just now. Press "Send a new code" in a minute, or ask a staff member to verify you.'; } } catch (e) {   }
    clear(root);
    var left = el('div', { class: 'auth' });
    root.appendChild(el('div', { class: 'login' }, [el('div', { class: 'login__card login__card--single' }, [left])]));
    var code = el('input', { inputmode: 'numeric', autocomplete: 'one-time-code', maxlength: '6', placeholder: '123456', class: 'code-input' });
    authForm(left, 'Verify your email', note || ('We sent a 6 digit code to ' + me.email + '. Enter it to finish making your account. Not there? Check your junk or spam folder, or send a new code.'), [fieldRow('Code', code),
      el('div', { class: 'field field--off' }, [el('span', {}, ['Verify with a phone number ', el('em', { class: 'soon', text: 'Coming soon' })])])], 'Verify', function () {
      return api('hub/email/verify', { code: code.value }).then(function () { location.replace('/hub'); });
    }, [linkBtn('Send a new code', function () { api('hub/email/send', {}).then(function () { toast('A new code is on its way. Check your junk or spam folder too.'); }).catch(function (x) { toast(x.message, true); }); }), ' · ',
      linkBtn('Change email', function () { changeEmail(function () { refreshVerify(); }); }), ' · ', linkBtn('Sign out', function () { api('hub/logout', {}).then(function () { location.replace('/hub'); }); })]);
  }
  function refreshVerify() { api('hub/state').then(function (j) { S.csrf = j.csrf; renderVerify(j.me, 'We sent a new code to ' + j.me.email + '.'); }); }
  function changeEmail(done) {
    modal(function (box, close) {
      var email = el('input', { type: 'email', class: 'input', placeholder: 'New email' }), pw = el('input', { type: 'password', class: 'input', placeholder: 'Your password' }), err = el('p', { class: 'err', hidden: true });
      box.appendChild(el('h2', { text: 'Change email' }));
      box.appendChild(el('p', { text: 'We send a code to the new address. Until you verify it, the app stays locked.' }));
      box.appendChild(fieldRow('New email', email)); box.appendChild(fieldRow('Password', pw)); box.appendChild(err);
      box.appendChild(el('div', { class: 'modal__actions' }, [el('button', { class: 'btn btn--ghost', type: 'button', text: 'Cancel', onclick: close }), el('button', { class: 'btn btn--primary', type: 'button', text: 'Change', onclick: function () {
        api('hub/email/change', { email: email.value, password: pw.value }).then(function () { close(); done(); }).catch(function (x) { err.hidden = false; err.textContent = x.message; });
      } })]));
    });
  }
  var qrPoll = 0;
  function startQr(box, state) {
    clearTimeout(qrPoll);
    api('hub/qr/start', {}).then(function (j) {
      var q = qrcode(0, 'M'); q.addData(j.url); q.make();
      clear(box); box.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      state.textContent = 'The code changes every 2 minutes.';
      var until = Date.now() + j.expires_in * 1000;
      (function poll() {
        if (Date.now() > until) return startQr(box, state);
        fetch('/api/hub/qr/status?token=' + j.token + '&secret=' + j.secret, { credentials: 'same-origin' }).then(function (r) { return r.json(); }).then(function (s) {
          if (s.status === 'approved') { state.textContent = 'Approved. Signing you in…'; location.replace('/hub'); return; }
          if (s.status === 'denied') { box.appendChild(el('div', { class: 'qr__over' }, [el('b', { text: 'Login denied' }), el('button', { class: 'btn btn--sm btn--primary', type: 'button', text: 'New code', onclick: function () { startQr(box, state); } })])); return; }
          if (s.status === 'expired') return startQr(box, state);
          if (s.scanned && !box.querySelector('.qr__over')) box.appendChild(el('div', { class: 'qr__over' }, [el('b', { text: 'Check your phone' }), el('span', { text: 'Approve the login there.' })]));
          qrPoll = setTimeout(poll, 2000);
        }).catch(function () { qrPoll = setTimeout(poll, 4000); });
      })();
    }).catch(function (e) { state.textContent = e.message; });
  }
   
  function approveQr(token) {
    history.replaceState(null, '', '/hub');
    api('hub/qr/info?token=' + encodeURIComponent(token)).then(function (j) {
      modal(function (box, close) {
        box.appendChild(el('h2', { text: 'Log in on another device?' }));
        box.appendChild(el('p', {}, ['Someone wants to sign in to your account on ', el('b', { text: j.device }), '. Only approve this if it is you, right now. Never approve a code someone else sent you.']));
        box.appendChild(el('div', { class: 'modal__actions' }, [
          el('button', { class: 'btn btn--ghost', type: 'button', text: 'No, deny', onclick: function () { api('hub/qr/approve', { token: token, approve: false }).then(function () { close(); toast('Login denied.'); }); } }),
          el('button', { class: 'btn btn--primary', type: 'button', text: 'Yes, log in', onclick: function () { api('hub/qr/approve', { token: token, approve: true }).then(function () { close(); toast('Approved. The other device is now signed in.'); }).catch(function (e) { toast(e.message, true); }); } })
        ]));
      });
    }).catch(function (e) { toast(e.message, true); });
  }
   
  function scanQr() {
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices) return toast('Use your phone camera app to scan the code instead.');
    var stream = null, stop = false;
    modal(function (box, close) {
      var video = el('video', { playsinline: true, muted: true });
      box.appendChild(el('h2', { text: 'Scan a login code' }));
      box.appendChild(el('div', { class: 'scanner' }, [video]));
      box.appendChild(el('p', { text: 'Point the camera at the QR code on the other device.' }));
      box.appendChild(el('div', { class: 'modal__actions' }, [el('button', { class: 'btn btn--ghost', type: 'button', text: 'Cancel', onclick: done })]));
      function done() { stop = true; if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); close(); }
      var det = new BarcodeDetector({ formats: ['qr_code'] });
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (s) {
        stream = s; video.srcObject = s; video.play();
        (function look() {
          if (stop) return;
          det.detect(video).then(function (codes) {
            var hit = codes.map(function (c) { return c.rawValue; }).filter(function (v) { return /\/hub\?qr=[a-f0-9]{32}$/.test(v); })[0];
            if (hit) { done(); approveQr(hit.split('qr=')[1]); } else setTimeout(look, 300);
          }).catch(function () { setTimeout(look, 500); });
        })();
      }).catch(function () { done(); toast('The camera is not available. Use your phone camera app instead.', true); });
    });
  }

   
  var F = {};    
  function renderApp() {
    clear(root);
    F.rail = el('nav', { class: 'rail', 'aria-label': 'Sections' });
    F.side = el('aside', { class: 'side' });
    F.main = el('main', { class: 'main' });
    F.members = el('aside', { class: 'members', 'aria-label': 'Online members' });
    F.app = el('div', { class: 'app' }, [F.rail, F.side, F.main, F.members]);
    F.app.addEventListener('click', function (e) { if (F.app.classList.contains('drawer') && e.target === F.app) F.app.classList.remove('drawer'); });
    root.appendChild(F.app);
    drawRail();
    go(S.section, S.view);
  }
  function railBtn(section, tip, inner, count) {
    var b = el('button', { class: 'rail__btn' + (S.section === section ? ' on' : ''), type: 'button', 'data-tip': tip, 'aria-label': tip, onclick: function () { go(section); } }, [inner, count ? el('span', { class: 'count', text: count > 99 ? '99+' : String(count) }) : null]);
    return b;
  }
  function drawRail() {
    clear(F.rail);
    var dmUnread = S.dms.reduce(function (n, d) { return n + d.unread; }, 0);
    var chUnread = S.channels.reduce(function (n, c) { return n + c.unread; }, 0);
    var home = railBtn('home', 'Direct messages', cicon(homeIcon()), dmUnread); home.classList.add('rail__btn--home');
    F.rail.appendChild(home);
    F.rail.appendChild(el('div', { class: 'rail__sep' }));
    S.servers.forEach(function (sv) {
      var n = S.channels.reduce(function (t, c) { return t + (c.server_id === sv.id ? c.unread : 0); }, 0);
      F.rail.appendChild(el('button', { class: 'rail__btn rail__btn--server' + (S.section === 'chat' && S.server === sv.id ? ' on' : ''), type: 'button', 'data-tip': sv.name, 'aria-label': sv.name, onclick: function () { openServer(sv.id); } },
        [serverIcon(sv), n ? el('span', { class: 'count', text: n > 99 ? '99+' : String(n) }) : null]));
    });
    F.rail.appendChild(el('div', { class: 'rail__sep' }));
    F.rail.appendChild(railBtn('market', 'Marketplace', cicon('shop'), 0));
    F.rail.appendChild(railBtn('tickets', 'Tickets', cicon('ticket'), 0));
    F.rail.appendChild(railBtn('roblox', 'Roblox account', cicon('roblox'), S.me && !S.me.verified ? 1 : 0));
     
    if (S.me && S.me.rank >= 1) F.rail.appendChild(el('a', { class: 'rail__btn', href: '/hub-admin', target: '_blank', rel: 'noopener', 'data-tip': 'App panel (opens in the browser)', 'aria-label': 'App panel' }, [cicon('shield'), S.staffWaiting ? el('span', { class: 'count', text: S.staffWaiting > 99 ? '99+' : String(S.staffWaiting) }) : null]));
    F.rail.appendChild(el('div', { class: 'rail__grow' }));
    if (S.install || isIos()) F.rail.appendChild(el('button', { class: 'rail__btn', type: 'button', 'data-tip': 'Install the app', 'aria-label': 'Install the app', onclick: installApp }, [icon('install')]));
    F.rail.appendChild(el('a', { class: 'rail__btn', href: '/home', 'data-tip': 'Website', 'aria-label': 'Website' }, [icon('globe')]));
    var n = dmUnread + chUnread;
    doc.title = (n ? '(' + n + ') ' : '') + (S.app.name || 'Axiomate Hub');
  }
  function sideFrame(title, tools) {
    clear(F.side);
    var body = el('div', { class: 'side__body' });
    F.side.appendChild(el('div', { class: 'side__head' }, [el('span', { text: title }), tools || null]));
    F.side.appendChild(body);
    F.side.appendChild(meBar());
    return body;
  }
  function meBar() {
    var me = S.me;
    var mine = me.status === 'invisible' ? 'offline' : me.status;
    return el('div', { class: 'me' }, [
      el('button', { class: 'me__btn', type: 'button', title: 'Your profile', 'aria-label': 'Your profile', onclick: function (e) { e.stopPropagation(); mePopout(e.currentTarget); } }, [
        el('span', { class: 'avwrap' + decoClass(me) }, [avatar({ avatar: me.avatar, name: me.name }), el('span', { class: 'dot dot--' + (mine || 'online') })]),
        el('span', { class: 'me__who' }, [nameEl(me, 'b'), el('small', { text: me.custom_status || STATUS[me.status] || 'Online' })])
      ]),
      'BarcodeDetector' in window ? el('button', { class: 'iconbtn', type: 'button', title: 'Scan a login code', 'aria-label': 'Scan a login code', onclick: scanQr }, [icon('qr')]) : null,
      el('button', { class: 'iconbtn', type: 'button', title: 'User settings', 'aria-label': 'User settings', onclick: function () { openSettings('account'); } }, [icon('gear')])
    ]);
  }

  function openNavigator() {
    if (!S.me || doc.querySelector('.palette__search')) return;
    modal(function (box, close) {
      box.setAttribute('aria-label', 'Quick navigation');
      box.appendChild(el('h2', { text: 'Where to next?' }));
      var search = el('input', { class: 'input palette__search', type: 'search', placeholder: 'Search sections and channels...', 'aria-label': 'Search sections and channels' });
      var results = el('div', { class: 'palette__results' });
      var destinations = [
        { name: 'Friends & messages', detail: 'Home', run: function () { go('home'); } },
        { name: 'Marketplace', detail: 'Community', run: function () { go('market'); } },
        { name: 'Support tickets', detail: 'Help', run: function () { go('tickets'); } },
        { name: 'Roblox account', detail: S.me.verified ? 'Verified' : 'Link account', run: function () { go('roblox'); } },
        { name: 'Account settings', detail: 'Settings', run: function () { openSettings('account'); } },
        { name: 'Appearance', detail: 'Settings', run: function () { openSettings('appearance'); } }
      ];
      S.channels.forEach(function (ch) { destinations.push({ name: '# ' + ch.name, detail: (S.servers.filter(function (sv) { return sv.id === ch.server_id; })[0] || {}).name || 'Channel', run: function () { S.server = ch.server_id; go('chat', ch.id); } }); });
      function draw() {
        clear(results);
        var matches = destinations.filter(function (d) { return (d.name + ' ' + d.detail).toLowerCase().indexOf(search.value.trim().toLowerCase()) !== -1; });
        matches.forEach(function (d) { results.appendChild(el('button', { class: 'palette__result', type: 'button', onclick: function () { close(); d.run(); } }, [el('span', { text: d.name }), el('small', { text: d.detail })])); });
        if (!matches.length) results.appendChild(el('p', { class: 'hint', text: 'No matches. Try a section or channel name.' }));
      }
      search.addEventListener('input', draw);
      box.addEventListener('keydown', function (e) {
        var buttons = Array.prototype.slice.call(results.querySelectorAll('button')), index = buttons.indexOf(doc.activeElement);
        if (e.key === 'ArrowDown' && buttons.length) { e.preventDefault(); buttons[(index + 1) % buttons.length].focus(); }
        if (e.key === 'ArrowUp' && buttons.length) { e.preventDefault(); buttons[(index - 1 + buttons.length) % buttons.length].focus(); }
        if (e.key === 'Enter' && doc.activeElement === search && buttons.length) { e.preventDefault(); buttons[0].click(); }
      });
      box.appendChild(search); box.appendChild(results);
      box.appendChild(el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Close', onclick: close }));
      draw();
    });
  }
  doc.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && S.me && !doc.querySelector('.settings')) { e.preventDefault(); openNavigator(); }
  });
  function connectionNotice(message) {
    var old = doc.getElementById('hub-connection');
    if (!message) { if (old) old.remove(); return; }
    if (old) return;
    doc.body.appendChild(el('div', { class: 'connection', id: 'hub-connection', role: 'status' }, [el('span', { text: message }), el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Retry', onclick: function () { refreshState(); } })]));
  }
  window.addEventListener('offline', function () { if (S.me) connectionNotice('You are offline. Reconnect to receive new messages.'); });
  window.addEventListener('online', function () { if (S.me) refreshState(); });
  function hubOverview() {
    var me = S.me;
    return el('section', { class: 'hub-overview', 'aria-label': 'Your Hub overview' }, [
      el('p', { class: 'hub-overview__label', text: 'Axiomate / Your command center' }),
      el('h2', { text: 'Welcome back, ' + me.name + '.' }),
      el('p', { text: me.verified ? 'Your account is linked. Find your people and pick up where you left off.' : 'Your next chapter starts here. Link Roblox to unlock community chat and marketplace posts.' }),
      el('div', { class: 'hub-overview__actions' }, [
        el('button', { class: 'btn btn--primary', type: 'button', text: me.verified ? 'Explore channels' : 'Link Roblox', onclick: function () { if (me.verified) openNavigator(); else go('roblox'); } }),
        el('button', { class: 'btn btn--ghost', type: 'button', text: 'Support tickets', onclick: function () { go('tickets'); } })
      ]),
      el('div', { class: 'hub-overview__stats' }, [el('span', {}, [el('b', { text: String(S.servers.length) }), 'Communities']), el('span', {}, [el('b', { text: String(S.channels.length) }), 'Channels']), el('span', {}, [el('b', { text: me.verified ? 'Linked' : 'Pending' }), 'Roblox account'])])
    ]);
  }

  function mainFrame(titleNodes, extra) {
    clear(F.main);
    var head = el('header', { class: 'main__head' }, [el('button', { class: 'iconbtn menu-btn', type: 'button', 'aria-label': 'Menu', onclick: function () { F.app.classList.toggle('drawer'); } }, [icon('menu')])].concat(titleNodes, [el('span', { class: 'grow' })], extra || []));
    var body = el('div', { class: 'main__body' });
    if (S.me && !S.me.two_factor && !S.hideSecBar) F.main.appendChild(el('div', { class: 'secbar', role: 'alert' }, [cicon('shield', 'secbar__ic'), el('span', {}, [el('b', { text: 'Your account is not secure. ' }), 'Turn on two-factor authentication so nobody else can sign in as you.']),
      el('button', { class: 'btn btn--sm btn--primary', type: 'button', text: 'Enable 2FA', onclick: function () { openSettings('security'); } }),
      el('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Hide for now', title: 'Hide for now', onclick: function () { S.hideSecBar = true; var b2 = F.main.querySelector('.secbar'); if (b2) b2.remove(); } }, [icon('x')])]));
    head.appendChild(el('button', { class: 'quick-open', type: 'button', 'aria-label': 'Quick navigation', onclick: openNavigator }, [icon('globe'), el('span', { class: 'quick-open__text', text: 'Quick jump' }), el('kbd', { text: 'Ctrl K' })]));
    F.main.appendChild(head); F.main.appendChild(body);
    return body;
  }
  function setMembers(on) { F.app.classList.toggle('has-members', !!on); F.members.hidden = !on; }
  function go(section, view) {
    S.section = section; S.view = view === undefined ? null : view;
    F.app.classList.remove('drawer');
    closeConv();
    drawRail();
    setMembers(false);
    ({ home: showHome, chat: showChat, market: showMarket, tickets: showTickets, roblox: showRoblox }[section] || showChat)();
    try { localStorage.setItem('hub.section', section); } catch (e) {   }
  }
  function signOut() {
    confirmBox('Sign out?', 'You can sign back in with Discord or a QR code.', 'Sign out').then(function (yes) {
      if (yes) api('hub/logout', {}).then(function () { location.replace('/hub'); });
    });
  }

   
  function showHome() {
    var body = sideFrame('Direct messages', el('button', { class: 'iconbtn', type: 'button', title: 'New message', 'aria-label': 'New message', onclick: newDm }, [icon('plus')]));
    body.appendChild(el('button', { class: 'item item--find', type: 'button', onclick: newDm }, [el('span', { class: 'item__name', text: 'Find or start a conversation' })]));
    body.appendChild(el('button', { class: 'item item--big' + (!S.view || S.view === 'friends' ? ' on' : ''), type: 'button', onclick: function () { go('home', 'friends'); } }, [cicon('people', 'item__ico'), el('span', { class: 'item__name', text: 'Friends' }),
      S.friendRequests ? el('span', { class: 'count', text: String(S.friendRequests) }) : null]));
    body.appendChild(el('p', { class: 'side__label', text: 'Direct messages' }));
    if (!S.dms.length) body.appendChild(el('p', { class: 'hint', style: 'padding:0 .5rem', text: 'No conversations yet.' }));
    S.dms.forEach(function (d) {
      body.appendChild(el('button', { class: 'item' + plateClass(d.user) + (S.view === d.id ? ' on' : '') + (d.unread ? ' unread' : ''), type: 'button', onclick: function () { go('home', d.id); } }, [
        avatarS(d.user),
        el('span', { class: 'item__name' }, [nameEl(d.user), d.user.custom_status ? el('small', { text: d.user.custom_status }) : null]), d.unread ? el('span', { class: 'count', text: String(d.unread) }) : null
      ]));
    });
    var dm = S.dms.filter(function (d) { return d.id === S.view; })[0];
    if (dm) return openConv('dm', dm.id, [el('button', { class: 'head-user', type: 'button', onclick: function () { openProfile(dm.user.id); } }, [avatarS(dm.user), el('h1', { text: dm.user.name })]), dm.user.custom_status ? el('span', { class: 'topic', text: dm.user.custom_status }) : null], { title: dm.user.name, text: 'This is the start of your direct messages with ' + dm.user.name + '.', user: dm.user });
    showFriends();
  }
  function newDm() {
    modal(function (box, close) {
      var input = el('input', { class: 'input', placeholder: 'Search by Discord or Roblox name', 'aria-label': 'Search members' }), list = el('div', { style: 'margin-top:.8rem;display:grid;gap:.2rem' });
      box.appendChild(el('h2', { text: 'Message someone' }));
      box.appendChild(input); box.appendChild(list);
      var t = 0;
      input.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () {
          api('hub/users?q=' + encodeURIComponent(input.value)).then(function (j) {
            clear(list);
            if (!j.users.length && input.value.length >= 2) list.appendChild(el('p', { class: 'hint', text: 'Nobody found. They need to have signed in once.' }));
            j.users.forEach(function (u) { list.appendChild(el('button', { class: 'member', type: 'button', onclick: function () { close(); startDm(u.id); } }, [avatar(u), el('span', {}, [u.name, u.roblox ? el('small', { text: 'Roblox: ' + u.roblox }) : null])])); });
          });
        }, 250);
      });
    });
  }
  function startDm(userId) {
    api('hub/dm', { user_id: userId }).then(function (j) { return refreshState().then(function () { go('home', j.dm); }); }).catch(function (e) { toast(e.message, true); });
  }

   
  function showChat() {
    var admin = S.me.rank >= 2;
     
    var target = S.view !== null ? S.channels.filter(function (c) { return c.id === S.view; })[0] : null;
    if (target) S.server = target.server_id;
    var srv = currentServer();
    if (!srv) { sideFrame('Servers'); mainFrame([el('h1', { text: 'No servers yet' })]).appendChild(el('p', { class: 'empty', text: 'Staff can add servers in the App panel.' })); return; }
    var chans = S.channels.filter(function (c) { return c.server_id === srv.id; });
    var body = sideFrame(srv.name, admin ? el('button', { class: 'iconbtn', type: 'button', title: 'Add a channel', 'aria-label': 'Add a channel', onclick: function () { editChannel(null); } }, [icon('plus')]) : null);
    if (srv.description) body.appendChild(el('p', { class: 'side__desc', text: srv.description }));
    if (S.view === null && chans.length) {
      var saved = 0; try { saved = parseInt(localStorage.getItem('hub.channel.' + srv.id) || '0', 10); } catch (e) {   }
      S.view = (chans.filter(function (c) { return c.id === saved; })[0] || chans.filter(function (c) { return c.name === 'general'; })[0] || chans[0]).id;
    }
    var lastCat = null;
    chans.forEach(function (c) {
      var cat = c.category || 'Text channels';
      if (cat !== lastCat) { body.appendChild(el('p', { class: 'side__label', text: cat })); lastCat = cat; }
      body.appendChild(el('button', { class: 'item' + (S.view === c.id ? ' on' : '') + (c.unread ? ' unread' : ''), type: 'button', onclick: function () { go('chat', c.id); } }, [
        cicon(c.icon || 'hash', 'item__ico'), el('span', { class: 'item__name', text: c.name }), c.staff_only && c.icon !== 'lock' ? cicon('lock', 'item__lock') : null,
        c.unread && S.view !== c.id ? el('span', { class: 'count', text: c.unread > 99 ? '99+' : String(c.unread) }) : null,
        admin ? el('span', { class: 'tools iconbtn', role: 'button', title: 'Edit channel', onclick: function (e) { e.stopPropagation(); editChannel(c); } }, [icon('gear')]) : null
      ]));
    });
    var ch = chans.filter(function (c) { return c.id === S.view; })[0];
    if (!ch) { mainFrame([el('h1', { text: srv.name })]).appendChild(el('p', { class: 'empty', text: 'No channels you can see here yet.' })); return; }
    try { localStorage.setItem('hub.channel.' + srv.id, String(ch.id)); localStorage.setItem('hub.server', String(srv.id)); } catch (e) {   }
    drawMembers();
    openConv('channel', ch.id, [el('h1', {}, [cicon(ch.icon || 'hash', 'hash'), ch.name]), ch.topic ? el('span', { class: 'topic', text: ch.topic }) : null],
      { title: 'Welcome to ' + ch.name + '!', text: ch.topic || 'This is the start of the ' + ch.name + ' channel.', readOnly: !ch.can_post, lockText: ch.read_only ? 'Only staff can post in this channel.' : 'Your roles cannot post in this channel.', icon: ch.icon || 'hash', server: srv.id });
  }
   
  function drawMembers() {
    setMembers(true);
    clear(F.members);
    var sid = S.server, groups = {}, order = [];
    S.online.forEach(function (u) {
      var r = topRole(u, sid, 'hoist'), k = r ? r.id : 0;
      if (!groups[k]) { groups[k] = []; order.push(r); }
      groups[k].push(u);
    });
    order.sort(function (a, b) { return !a ? 1 : !b ? -1 : a.position - b.position; });
    order.forEach(function (r) {
      var list = groups[r ? r.id : 0];
      F.members.appendChild(el('p', { class: 'side__label', style: r && r.color ? 'color:' + r.color : null, text: (r ? r.name : 'Online') + ' — ' + list.length }));
      list.forEach(function (u) {
        F.members.appendChild(el('button', { class: 'member' + plateClass(u), type: 'button', title: 'View profile', onclick: function () { openProfile(u.id); } }, [
          avatarS(u), el('span', {}, [el('span', { class: 'nm' + nameClass(u), text: u.name, 'data-text': u.name, style: roleTint(u, sid) }), roleIcon(u, sid), el('small', { text: u.custom_status || (u.roblox ? '@' + u.roblox : STATUS[u.status] || '') })])
        ]));
      });
    });
  }
  function editChannel(c) {
    modal(function (box, close) {
      var name = el('input', { value: c ? c.name : '', maxlength: '40', required: true }), topic = el('input', { value: c ? c.topic : '', maxlength: '200' }), cat = el('input', { value: c ? c.category : '', maxlength: '40', placeholder: 'e.g. Community' });
      var chosen = c ? c.icon : 'hash', grid = el('div', { class: 'icon-grid' });
      Object.keys(S.icons).forEach(function (k) {
        if (S.icons[k].color) return;
        var b = el('button', { class: 'icon-pick' + (k === chosen ? ' on' : ''), type: 'button', title: S.icons[k].label, 'aria-label': S.icons[k].label, onclick: function () { chosen = k; grid.querySelectorAll('.icon-pick').forEach(function (x) { x.classList.remove('on'); }); b.classList.add('on'); } }, [cicon(k)]);
        grid.appendChild(b);
      });
      var staff = el('input', { type: 'checkbox' }), ro = el('input', { type: 'checkbox' }); staff.checked = !!(c && c.staff_only); ro.checked = !!(c && c.read_only);
      var err = el('p', { class: 'err', hidden: true });
      box.appendChild(el('h2', { text: c ? 'Edit #' + c.name : 'Add a channel' }));
      box.appendChild(el('label', { class: 'field' }, [el('span', { text: 'Name' }), name]));
      box.appendChild(el('label', { class: 'field' }, [el('span', { text: 'Topic' }), topic]));
      box.appendChild(el('label', { class: 'field' }, [el('span', { text: 'Category' }), cat]));
      box.appendChild(el('div', { class: 'field' }, [el('span', { text: 'Icon' }), grid]));
      box.appendChild(el('label', { class: 'row', style: 'margin-bottom:.5rem' }, [staff, 'Staff only (hidden from members)']));
      box.appendChild(el('label', { class: 'row' }, [ro, 'Only staff can post (announcements)']));
      box.appendChild(err);
      box.appendChild(el('div', { class: 'modal__actions' }, [
        c ? el('button', { class: 'btn btn--danger', type: 'button', text: 'Delete', style: 'margin-right:auto', onclick: function () {
          confirmBox('Delete #' + c.name + '?', 'The channel and its messages disappear for everyone.', 'Delete', true).then(function (yes) { if (yes) api('hub/channels', { id: c.id, delete: true }).then(function () { close(); S.view = null; refreshState().then(function () { go('chat'); }); }); });
        } }) : null,
        el('button', { class: 'btn btn--ghost', type: 'button', text: 'Cancel', onclick: close }),
        el('button', { class: 'btn btn--primary', type: 'button', text: 'Save', onclick: function () {
          api('hub/channels', { id: c ? c.id : 0, server: S.server, name: name.value, topic: topic.value, category: cat.value, icon: chosen, staff_only: staff.checked, read_only: ro.checked }).then(function (j) { close(); refreshState().then(function () { go('chat', j.id); }); })
            .catch(function (e) { err.hidden = false; err.textContent = e.message; });
        } })
      ]));
    });
  }

   
  function closeConv() { clearTimeout(timers.msgs); conv = null; }
  function openConv(kind, id, titleNodes, start) {
    var body = mainFrame(titleNodes);
    var list = el('div', { class: 'msgs', role: 'log', 'aria-live': 'polite' });
    var composer = el('div', { class: 'composer' });
    body.style.display = 'flex'; body.style.flexDirection = 'column'; body.style.overflow = 'hidden';
    body.appendChild(el('div', { class: 'chat' }, [list, composer]));
    conv = { kind: kind, id: id, msgs: [], byId: {}, last: 0, first: 0, more: false, reply: null, list: list, composer: composer, start: start };
    drawComposer();
    list.addEventListener('scroll', function () { if (list.scrollTop < 60 && conv && conv.more && !conv.loading) loadOlder(); });
    var mine = conv;
    api('hub/messages?' + (kind === 'dm' ? 'dm=' : 'channel=') + id).then(function (j) {
      if (conv !== mine) return;
      conv.more = j.more;
      j.messages.forEach(function (m) { conv.msgs.push(m); conv.byId[m.id] = m; });
      conv.last = j.messages.length ? j.messages[j.messages.length - 1].id : 0;
      conv.first = j.messages.length ? j.messages[0].id : 0;
      drawMessages(true);
      clearUnread(kind, id);
      schedulePoll();
    }).catch(function (e) { clear(list).appendChild(el('p', { class: 'empty', text: e.message })); });
  }
  function clearUnread(kind, id) {
    var it = (kind === 'dm' ? S.dms : S.channels).filter(function (x) { return x.id === id; })[0];
    if (it && it.unread) { it.unread = 0; drawRail(); }
  }
  function schedulePoll() {
    clearTimeout(timers.msgs);
    timers.msgs = setTimeout(pollMessages, doc.hidden ? 8000 : 2500);
  }
  function pollMessages() {
    if (!conv) return;
    var mine = conv;
    api('hub/messages?' + (conv.kind === 'dm' ? 'dm=' : 'channel=') + conv.id + '&after=' + conv.last).then(function (j) {
      if (conv !== mine) return;
      var atBottom = conv.list.scrollHeight - conv.list.scrollTop - conv.list.clientHeight < 80, added = false;
      j.messages.forEach(function (m) { if (!conv.byId[m.id]) { conv.msgs.push(m); conv.byId[m.id] = m; added = true; } conv.last = Math.max(conv.last, m.id); });
      var changed = false;
      (j.changed || []).forEach(function (m) { var old = conv.byId[m.id]; if (old && (old.body !== m.body || old.deleted !== m.deleted || old.edited !== m.edited)) { Object.assign(old, m); changed = true; } });
      if (added || changed) drawMessages(atBottom);
    }).catch(function () {   }).then(function () { if (conv === mine) schedulePoll(); });
  }
  function loadOlder() {
    conv.loading = true;
    var mine = conv, h = conv.list.scrollHeight;
    api('hub/messages?' + (conv.kind === 'dm' ? 'dm=' : 'channel=') + conv.id + '&before=' + conv.first).then(function (j) {
      if (conv !== mine) return;
      conv.more = j.messages.length === 50;
      conv.msgs = j.messages.filter(function (m) { return !conv.byId[m.id]; }).concat(conv.msgs);
      j.messages.forEach(function (m) { conv.byId[m.id] = m; });
      if (j.messages.length) conv.first = j.messages[0].id;
      drawMessages(false);
      conv.list.scrollTop = conv.list.scrollHeight - h;
    }).then(function () { if (conv === mine) conv.loading = false; });
  }
  function drawMessages(scrollDown) {
    var list = conv.list, prev = null;
    clear(list);
    if (!conv.more) {
      var st = conv.start;
      list.appendChild(el('div', { class: 'msgs__start' }, [st.user ? avatar(st.user, 'av--xl') : el('div', { class: 'big' }, [cicon(st.icon || 'hash')]), el('h2', { text: st.title }), el('p', { text: st.text })]));
    }
    conv.msgs.forEach(function (m) {
      var newDay = !prev || utc(prev.at).toDateString() !== utc(m.at).toDateString();
      if (newDay) list.appendChild(el('div', { class: 'day', text: dayText(m.at) }));
      var first = newDay || !prev || prev.author.id !== m.author.id || (utc(m.at) - utc(prev.at)) > 5 * 60 * 1000 || m.reply_to;
      list.appendChild(messageRow(m, first));
      prev = m;
    });
    if (scrollDown) list.scrollTop = list.scrollHeight;
  }
  function messageRow(m, first) {
    var row = el('div', { class: 'msg' + (first ? ' first' : ''), 'data-id': m.id });
    var sid = conv.kind === 'channel' ? conv.start.server : 0;
    var mine = m.author.id === S.me.id, canDelete = !m.deleted && (mine || (conv.kind === 'channel' && hasPerm(sid, 'manage_messages')));
    if (m.reply_to) {
      var r = conv.byId[m.reply_to];
      row.appendChild(el('div', { class: 'msg__reply' }, [r ? el('b', { text: r.author.name }) : null, r ? (r.deleted ? ' (deleted message)' : ' ' + r.body.slice(0, 120)) : ' an earlier message']));
    }
    row.appendChild(first ? el('button', { class: 'msg__av' + decoClass(m.author), type: 'button', 'aria-label': 'View profile of ' + m.author.name, onclick: function () { openProfile(m.author.id); } }, [avatar(m.author, 'av--lg')]) : el('span', { class: 'msg__gut', text: utc(m.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }));
    var content = el('div', {});
    if (first) content.appendChild(el('div', { class: 'msg__head' }, [el('button', { class: 'msg__name' + nameClass(m.author), type: 'button', text: m.author.name, 'data-text': m.author.name, style: roleTint(m.author, sid), onclick: function () { openProfile(m.author.id); } }), roleIcon(m.author, sid), staffBadge(m.author.staff), m.author.roblox ? el('span', { class: 'rbx', text: '@' + m.author.roblox }) : null, el('time', { text: timeText(m.at) })]));
    var bodyEl = el('div', { class: 'msg__body' + (m.deleted ? ' gone' : '') });
    if (m.deleted) bodyEl.textContent = 'This message was deleted.';
    else { bodyEl.appendChild(richText(m.body)); if (m.edited) bodyEl.appendChild(el('span', { class: 'msg__edited', text: '(edited)' })); }
    content.appendChild(bodyEl);
    row.appendChild(content);
    if (!m.deleted) {
      row.appendChild(el('div', { class: 'msg__tools' }, [
        canPost() ? el('button', { class: 'iconbtn', type: 'button', title: 'Reply', 'aria-label': 'Reply', onclick: function () { conv.reply = m; drawComposer(); } }, [icon('reply')]) : null,
        mine ? el('button', { class: 'iconbtn', type: 'button', title: 'Edit', 'aria-label': 'Edit', onclick: function () { editMessage(m, row, bodyEl); } }, [icon('edit')]) : null,
        canDelete ? el('button', { class: 'iconbtn', type: 'button', title: 'Delete', 'aria-label': 'Delete', onclick: function () { deleteMessage(m); } }, [icon('trash')]) : null
      ]));
      row.addEventListener('click', function (e) { if (window.innerWidth <= 760 && !e.target.closest('a,button')) row.classList.toggle('tools-open'); });
    }
    return row;
  }
  function editMessage(m, row, bodyEl) {
    row.classList.add('editing');
    var ta = el('textarea', { rows: '2', maxlength: '2000' }); ta.value = m.body;
    var box = el('div', { class: 'msg__edit' }, [ta, el('small', { text: 'Enter to save · Escape to cancel' })]);
    bodyEl.replaceWith(box); ta.focus();
    ta.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { drawMessages(false); }
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        api('hub/messages/' + m.id + '/edit', { body: ta.value }).then(function () { m.body = ta.value.trim(); m.edited = new Date().toISOString(); drawMessages(false); }).catch(function (x) { toast(x.message, true); });
      }
    });
  }
  function deleteMessage(m) {
    confirmBox('Delete message?', 'This removes the message for everyone.', 'Delete', true).then(function (yes) {
      if (yes) api('hub/messages/' + m.id + '/delete', {}).then(function () { m.deleted = true; m.body = ''; drawMessages(false); }).catch(function (x) { toast(x.message, true); });
    });
  }
  function needsRoblox() { return (S.app.chat_rule || 'roblox') === 'roblox' && !S.me.verified; }
  function canPost() {
    if (!conv) return false;
    if (needsRoblox() || S.me.muted_until) return false;
    if (conv.start.readOnly) return false;
    return true;
  }
  function drawComposer() {
    var c = clear(conv.composer);
    if (S.me.muted_until) { c.appendChild(el('div', { class: 'composer__locked', text: 'You are muted in the app until ' + timeText(S.me.muted_until) + '. You can still read.' })); return; }
    if (needsRoblox()) {
      c.appendChild(el('div', { class: 'composer__locked' }, [el('span', { text: 'Link your Roblox account to chat. It keeps the chat free of spam accounts.' }), el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'Link Roblox', onclick: function () { go('roblox'); } })]));
      return;
    }
    if (conv.start.readOnly) { c.appendChild(el('div', { class: 'composer__locked', text: conv.start.lockText || 'Only staff can post in this channel.' })); return; }
    if (conv.reply) c.appendChild(el('div', { class: 'composer__reply' }, [el('span', {}, ['Replying to ', el('b', { text: conv.reply.author.name })]), el('button', { class: 'iconbtn', type: 'button', 'aria-label': 'Cancel reply', onclick: function () { conv.reply = null; drawComposer(); } }, [icon('x')])]));
    var ta = el('textarea', { rows: '1', maxlength: '2000', placeholder: 'Message ' + (conv.kind === 'dm' ? conv.start.user.name : (S.channels.filter(function (x) { return x.id === conv.id; })[0] || {}).name), 'aria-label': 'Message' });
    var send = el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'Send' });
    var draftKey = 'hub.draft.' + S.me.id + '.' + conv.kind + '.' + conv.id;
    try { ta.value = sessionStorage.getItem(draftKey) || ''; } catch (e) {   }
    function grow() { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, window.innerHeight * 0.4) + 'px'; }
    function submit() {
      var text = ta.value.trim(); if (!text || send.disabled) return;
      send.disabled = true; ta.disabled = true;
      var mine = conv, payload = { body: text, reply_to: conv.reply ? conv.reply.id : 0 };
      payload[conv.kind === 'dm' ? 'dm' : 'channel'] = conv.id;
      api('hub/messages', payload).then(function (j) {
        try { sessionStorage.removeItem(draftKey); } catch (e) {   }
        if (conv !== mine) return;
        ta.value = ''; grow(); conv.reply = null;
        if (!conv.byId[j.message.id]) { conv.msgs.push(j.message); conv.byId[j.message.id] = j.message; }
        conv.last = Math.max(conv.last, j.message.id);
        drawMessages(true); drawComposer();
        var f = conv.composer.querySelector('textarea'); if (f) f.focus();
      }).catch(function (e) { toast(e.message, true); }).then(function () { send.disabled = false; ta.disabled = false; });
    }
    ta.addEventListener('input', function () { grow(); try { if (ta.value) sessionStorage.setItem(draftKey, ta.value); else sessionStorage.removeItem(draftKey); } catch (e) {   } });
    ta.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); } });
    send.addEventListener('click', submit);
    c.appendChild(el('div', { class: 'composer__box' }, [ta, send]));
    grow();
    if (window.innerWidth > 760) setTimeout(function () { ta.focus(); }, 0);
  }

   
  function showTickets() {
    var body = sideFrame('Tickets');
    var views = [['mine', 'Your ticket'], ['new', 'Open a ticket'], ['past', 'Past tickets']];
    if (!S.view || S.view === 'inbox') S.view = 'mine';
    views.forEach(function (v) {
      body.appendChild(el('button', { class: 'item' + (S.view === v[0] ? ' on' : ''), type: 'button', onclick: function () { go('tickets', v[0]); } }, [el('span', { class: 'item__name', text: v[1] }),
]));
    });
    if (S.me.rank >= 1) body.appendChild(el('a', { class: 'item', href: '/staff/tickets', target: '_blank', rel: 'noopener' }, [el('span', { class: 'item__name', text: 'Staff ticket inbox', title: 'Opens the Discord panel in the browser' }), icon('ext'),
      S.staffWaiting ? el('span', { class: 'count', text: String(S.staffWaiting) }) : null]));
    var page = el('div', { class: 'page' });
    mainFrame([el('h1', { text: { mine: 'Your ticket', new: 'Open a ticket', past: 'Past tickets' }[S.view] })]).appendChild(page);
    page.appendChild(el('p', { class: 'empty', text: 'Loading…' }));
    api('hub/tickets').then(function (j) {
      clear(page);
      if (S.view === 'mine') ticketMine(page, j);
      else if (S.view === 'new') ticketNew(page, j);
      else ticketPast(page, j);
    }).catch(function (e) { clear(page).appendChild(el('p', { class: 'err', text: e.message })); });
  }
  function ticketMine(page, j) {
    var t = j.current;
    if (!t) {
      page.appendChild(el('div', { class: 'card' }, [el('h2', { text: 'No ticket right now' }), el('p', { class: 'hint', text: 'Need help from staff? Open a ticket. A staff member will message you in your Discord DMs, and you can follow everything here.' }),
        el('button', { class: 'btn btn--primary', type: 'button', text: 'Open a ticket', onclick: function () { go('tickets', 'new'); } })]));
      return;
    }
    var line = t.status === 'closed' ? 'This ticket is closed.' : t.claimed_by ? t.claimed_by + ' is handling your ticket and will message you in your Discord DMs.' : 'You are #' + t.position + ' in the queue (' + t.waiting + ' waiting). A staff member will message you in your Discord DMs, so keep them open.';
    page.appendChild(el('div', { class: 'card card--accent' }, [
      el('div', { class: 'row' }, [el('h2', { text: t.ref }), el('span', { class: 'badge ' + (t.status === 'closed' ? 'badge--warn' : 'badge--ok'), text: t.status === 'closed' ? 'Closed' : t.claimed_by ? 'Being handled' : 'Waiting' }),
        t.scam_result ? el('span', { class: 'badge ' + (t.scam_result === 'scam' ? 'badge--bad' : 'badge--ok'), text: t.scam_result === 'scam' ? 'Scam confirmed' : 'No scam found' }) : null]),
      el('p', { text: line }),
      el('dl', { class: 'kv' }, [el('dt', { text: 'About' }), el('dd', { text: t.subject || '-' }), el('dt', { text: 'Type' }), el('dd', { text: t.type || '-' }), el('dt', { text: 'Priority' }), el('dd', { text: t.priority }), el('dt', { text: 'Opened' }), el('dd', { text: timeText(t.created_at) })]),
      t.status !== 'closed' ? el('div', { class: 'row', style: 'margin-top:1rem' }, [el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Close ticket', onclick: function () {
        confirmBox('Close ' + t.ref + '?', 'Only close it if you do not need help anymore.', 'Close ticket', true).then(function (yes) { if (yes) api('hub/tickets/close', {}).then(function () { toast('Ticket closed.'); showTickets(); }).catch(function (e) { toast(e.message, true); }); });
      } })]) : null
    ]));
    page.appendChild(el('h3', { text: 'Updates from staff' }));
    if (!t.notes.length) page.appendChild(el('p', { class: 'hint', text: 'No updates yet. They show up here, and the bot sends you a DM when there is one.' }));
    t.notes.forEach(function (n) { page.appendChild(el('div', { class: 'note' }, [el('p', { text: n.text }), el('small', { text: (n.by || 'Staff') + ' · ' + timeText(n.at) + (n.edited ? ' (edited)' : '') })])); });
  }
  function ticketNew(page, j) {
    if (j.current && j.current.status !== 'closed') {
      page.appendChild(el('div', { class: 'card' }, [el('h2', { text: 'You already have a ticket' }), el('p', { class: 'hint', text: j.current.ref + ' is still open. Follow it under Your ticket.' }), el('button', { class: 'btn btn--primary', type: 'button', text: 'See your ticket', onclick: function () { go('tickets', 'mine'); } })]));
      return;
    }
    var type = el('select', {}, Object.keys(j.types).map(function (k) { return el('option', { value: k, text: j.types[k] }); }));
    var subject = el('input', { maxlength: '100', placeholder: 'A short title' }), details = el('textarea', { maxlength: '3000', rows: '5', placeholder: 'What happened, or what you need help with' });
    var suspects = el('input', { maxlength: '500', placeholder: 'Discord ID or Roblox username of who scammed you' }), evidence = el('textarea', { maxlength: '1000', rows: '2', placeholder: 'Links to screenshots or videos (optional)' });
    var scamBox = el('div', { hidden: true }, [el('label', { class: 'field' }, [el('span', { text: 'Who scammed you' }), suspects]), el('label', { class: 'field' }, [el('span', { text: 'Evidence' }), evidence])]);
    var err = el('p', { class: 'err', hidden: true }), send = el('button', { class: 'btn btn--primary', type: 'submit', text: 'Open ticket' });
    type.addEventListener('change', function () { scamBox.hidden = type.value !== 'scam'; });
    var form = el('form', { class: 'card' }, [
      el('p', { class: 'hint', text: 'A staff member will message you directly in your Discord DMs, so make sure your DMs are open for the Axiomate server. You can follow your ticket and staff updates here.' }),
      el('label', { class: 'field' }, [el('span', { text: 'Type' }), type]), el('label', { class: 'field' }, [el('span', { text: 'Title' }), subject]),
      el('label', { class: 'field' }, [el('span', { text: 'Details' }), details]), scamBox, err, send
    ]);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); err.hidden = true; send.disabled = true;
      api('hub/tickets', { category: type.value, subject: subject.value, details: details.value, suspects: suspects.value, evidence: evidence.value })
        .then(function (r) { toast('Ticket ' + r.ref + ' opened.'); refreshState(); go('tickets', 'mine'); })
        .catch(function (x) { err.hidden = false; err.textContent = x.message; }).then(function () { send.disabled = false; });
    });
    page.appendChild(form);
  }
  function ticketPast(page, j) {
    if (!j.past.length) { page.appendChild(el('p', { class: 'empty', text: 'You have not opened any tickets yet.' })); return; }
    page.appendChild(el('div', { class: 'card', style: 'padding:.4rem .8rem' }, [el('table', { class: 'table' }, [
      el('thead', {}, [el('tr', {}, ['Ticket', 'About', 'Status', 'Opened'].map(function (h) { return el('th', { text: h }); }))]),
      el('tbody', {}, j.past.map(function (t) { return el('tr', {}, [el('td', { text: t.ref }), el('td', { text: t.subject }), el('td', {}, [el('span', { class: 'badge ' + (t.status === 'closed' ? '' : 'badge--ok'), text: t.status })]), el('td', { text: timeText(t.created_at) })]); }))
    ])]));
  }

   
  function showRoblox() {
    var body = sideFrame('Roblox');
    if (!S.view) S.view = 'account';
    [['account', 'Your Roblox account']].concat(S.me.rank >= 1 ? [['lookup', 'Look up a member (staff)']] : []).forEach(function (v) {
      body.appendChild(el('button', { class: 'item' + (S.view === v[0] ? ' on' : ''), type: 'button', onclick: function () { go('roblox', v[0]); } }, [el('span', { class: 'item__name', text: v[1] })]));
    });
    var page = el('div', { class: 'page' });
    mainFrame([el('h1', { text: S.view === 'lookup' ? 'Look up a member' : 'Your Roblox account' })]).appendChild(page);
    if (S.view === 'lookup') return robloxLookup(page);
    robloxAccount(page);
  }
  function headshot(robloxId, img) {
    api('hub/roblox/thumb?id=' + encodeURIComponent(robloxId)).then(function (j) { if (j.url) img.src = j.url; }).catch(function () {   });
  }
  function robloxAccount(page) {
    var me = S.me;
    if (me.verified && me.roblox) {
      var img = el('img', { class: 'av av--xl', alt: '', src: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=' });
      headshot(me.roblox.id, img);
      page.appendChild(el('div', { class: 'card card--accent' }, [el('div', { class: 'row' }, [img, el('div', {}, [
        el('div', { class: 'row' }, [el('h2', { text: me.roblox.username }), el('span', { class: 'badge badge--ok', text: 'Verified' })]),
        el('p', { class: 'hint', style: 'margin:.2rem 0 0', text: 'Linked to your Discord account ' + me.username + '.' })
      ])]), el('dl', { class: 'kv' }, [el('dt', { text: 'Roblox user ID' }), el('dd', { text: me.roblox.id }), el('dt', { text: 'Discord' }), el('dd', { text: me.username + ' (' + me.discord_id + ')' })]),
      el('div', { class: 'row', style: 'margin-top:1rem' }, [
        el('a', { class: 'btn btn--ghost btn--sm', href: 'https://www.roblox.com/users/' + encodeURIComponent(me.roblox.id) + '/profile', target: '_blank', rel: 'noopener' }, ['Roblox profile']),
        el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Switch account', onclick: function () {
          confirmBox('Switch Roblox account?', 'This unlinks ' + me.roblox.username + '. You can then link another account. Until you do, you cannot chat, post on the marketplace or get the verified roles in Discord.', 'Unlink', true)
            .then(function (yes) { if (yes) api('hub/roblox/unlink', {}).then(function () { return refreshState(); }).then(function () { go('roblox'); }); });
        } })
      ])]));
      page.appendChild(el('div', { class: 'card' }, [el('h3', { style: 'margin-top:0', text: 'What being verified gives you' }), el('ul', { class: 'hint' }, [el('li', { text: 'Chat in the app' }), el('li', { text: 'The verified roles in our Discord servers (use /verify in Discord)' }), el('li', { text: 'Marketplace posts, scam reports and job applications' })])]));
      return;
    }
    var p = me.roblox_pending;
    var card = el('div', { class: 'card card--accent' });
    page.appendChild(card);
    var verificationCard = card;
    function resetVerification() {
      clear(verificationCard); card = verificationCard;
      if (!me.roblox_oauth) return;
      card.appendChild(el('h2', { text: 'Link your Roblox account' }));
      card.appendChild(el('p', { class: 'hint', text: 'Sign in on Roblox to confirm the account is yours, then return here to finish linking.' }));
      card.appendChild(el('a', { class: 'btn btn--primary btn--block rbx-signin', href: '/api/roblox/oauth/start?for=hub' }, [cicon('roblox', 'inline-ic'), 'Sign in with Roblox']));
      card.appendChild(el('p', { class: 'hint', text: 'Roblox sign-in is available for ages 13 and up. You can also verify through your profile below.' }));
      var alternative = el('details', {}, [el('summary', { text: 'Use profile verification instead' })]);
      card.appendChild(alternative); card = alternative;
    }
    function step1() {
      resetVerification();
      var name = el('input', { maxlength: '20', placeholder: 'Your Roblox username', autocomplete: 'off' }), err = el('p', { class: 'err', hidden: true }), btn = el('button', { class: 'btn btn--primary', type: 'submit', text: 'Continue' });
      var f = el('form', {}, [el('h2', { text: 'Verify through your profile' })].concat([el('p', { class: 'hint', text: 'Prove the Roblox account is yours by putting a few words in its About. It takes about a minute.' }), el('label', { class: 'field' }, [el('span', { text: 'Roblox username' }), name]), err, btn]));
      f.addEventListener('submit', function (e) {
        e.preventDefault(); btn.disabled = true; err.hidden = true;
        api('hub/roblox/start', { username: name.value }).then(function (j) { step2(j.username, j.code); }).catch(function (x) { err.hidden = false; err.textContent = x.message; }).then(function () { btn.disabled = false; });
      });
      card.appendChild(f); if (!me.roblox_oauth) name.focus();
    }
    function step2(username, code) {
      resetVerification();
      if (card !== verificationCard) card.open = true;
      var err = el('p', { class: 'err', hidden: true }), btn = el('button', { class: 'btn btn--primary', type: 'button', text: 'Verify' });
      card.appendChild(el('h2', { text: 'Link ' + username }));
      card.appendChild(el('p', { class: 'hint', text: 'Put these words anywhere in the About section of your Roblox profile and save it:' }));
      card.appendChild(el('div', { class: 'row' }, [el('div', { class: 'code', text: code }), el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Copy', onclick: function () { if (navigator.clipboard) navigator.clipboard.writeText(code).then(function () { toast('Copied.'); }); } })]));
      card.appendChild(el('p', { class: 'hint', style: 'margin-top:1rem' }, ['Open ', el('a', { href: 'https://www.roblox.com/users/profile', target: '_blank', rel: 'noopener', text: 'your Roblox profile' }), ', paste the words in About, save, then press Verify. You can remove them again afterwards. If Roblox will not save them, press Get new words' + (me.roblox_oauth ? ', or use Sign in with Roblox.' : '.')]));
      card.appendChild(err);
      card.appendChild(el('div', { class: 'row' }, [btn,
        el('button', { class: 'btn btn--ghost', type: 'button', text: 'Get new words', onclick: function () { api('hub/roblox/start', { username: username }).then(function (j) { step2(j.username, j.code); toast('New words. Try saving these.'); }).catch(function (x) { err.hidden = false; err.textContent = x.message; }); } }),
        me.roblox_oauth ? el('a', { class: 'btn btn--ghost', href: '/api/roblox/oauth/start?for=hub' }, ['Sign in with Roblox']) : null,
        el('button', { class: 'btn btn--ghost', type: 'button', text: 'Use another username', onclick: step1 })]));
      btn.addEventListener('click', function () {
        btn.disabled = true; err.hidden = true;
        api('hub/roblox/verify', {}).then(function () { toast('Your Roblox account is linked!'); return refreshState(); }).then(function () { go('roblox'); })
          .catch(function (x) { err.hidden = false; err.textContent = x.message; }).then(function () { btn.disabled = false; });
      });
    }
    if (p && p.code) step2(p.username, p.code); else step1();
  }
  function robloxLookup(page) {
    var input = el('input', { class: 'input', placeholder: 'Discord ID, Roblox ID, Discord name or Roblox username', 'aria-label': 'Search' }), out = el('div', { style: 'margin-top:1rem' });
    page.appendChild(el('p', { class: 'hint', text: 'Find who is linked to which account. Results include confirmed scams and banned accounts.' }));
    page.appendChild(input); page.appendChild(out);
    var t = 0;
    input.addEventListener('input', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        if (input.value.trim().length < 2) return clear(out);
        api('hub/lookup?q=' + encodeURIComponent(input.value.trim())).then(function (j) {
          clear(out);
          if (!j.results.length) out.appendChild(el('p', { class: 'empty', text: 'Nobody found.' }));
          j.results.forEach(function (r) {
            var img = avatar(r, 'av--lg');
            out.appendChild(el('div', { class: 'card' }, [el('div', { class: 'row' }, [img, el('div', {}, [el('div', { class: 'row' }, [el('b', { text: r.name }), staffBadge(r.staff),
              r.verified ? el('span', { class: 'badge badge--ok', text: 'Verified' }) : el('span', { class: 'badge', text: 'Not verified' }), r.banned ? el('span', { class: 'badge badge--bad', text: 'Banned on the site' }) : null,
              r.confirmed_scams ? el('span', { class: 'badge badge--bad', text: r.confirmed_scams + ' confirmed scam' + (r.confirmed_scams === 1 ? '' : 's') }) : null])])]),
              el('dl', { class: 'kv' }, [el('dt', { text: 'Discord ID' }), el('dd', { text: r.discord_id }), el('dt', { text: 'Roblox' }), el('dd', {}, r.roblox ? [el('a', { href: 'https://www.roblox.com/users/' + encodeURIComponent(r.roblox_id) + '/profile', target: '_blank', rel: 'noopener', text: r.roblox + ' (' + r.roblox_id + ')' })] : ['Not linked']),
                el('dt', { text: 'Tickets' }), el('dd', { text: String(r.tickets) }), el('dt', { text: 'First seen' }), el('dd', { text: timeText(r.joined) })]),
              el('div', { class: 'row', style: 'margin-top:.8rem' }, [r.id !== S.me.id ? el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Message', onclick: function () { startDm(r.id); } }) : null,
                el('a', { class: 'btn btn--ghost btn--sm', href: '/staff/users?q=' + encodeURIComponent(r.discord_id), target: '_blank', rel: 'noopener', text: 'Open in the Discord panel' }, [icon('ext')])])
            ]));
          });
        }).catch(function (e) { clear(out).appendChild(el('p', { class: 'err', text: e.message })); });
      }, 300);
    });
    input.focus();
  }


   
  var friendTab = 'online';
  function showFriends() {
    var tabs = [['online', 'Online'], ['all', 'All'], ['pending', 'Pending'], ['blocked', 'Blocked']];
    var bar = el('div', { class: 'tabs' }, tabs.map(function (t) {
      return el('button', { class: 'tab' + (friendTab === t[0] ? ' on' : ''), type: 'button', onclick: function () { friendTab = t[0]; showFriends(); } }, [t[1], t[0] === 'pending' && S.friendRequests ? el('span', { class: 'count', text: String(S.friendRequests) }) : null]);
    }).concat([el('button', { class: 'tab tab--add' + (friendTab === 'add' ? ' on' : ''), type: 'button', onclick: function () { friendTab = 'add'; showFriends(); } }, ['Add Friend'])]));
    var body = mainFrame([cicon('people', 'hash'), el('h1', { text: 'Friends' }), bar]);
    var page = el('div', { class: 'page page--wide' });
    body.appendChild(hubOverview());
    body.appendChild(page);
    if (friendTab === 'add') return addFriendPage(page);
    page.appendChild(el('p', { class: 'empty', text: 'Loading…' }));
    api('hub/friends').then(function (j) {
      clear(page);
      var list = friendTab === 'online' ? j.friends.filter(function (f) { return f.status !== 'offline'; }) : friendTab === 'all' ? j.friends : friendTab === 'blocked' ? j.blocked : null;
      if (friendTab === 'pending') {
        if (!j.incoming.length && !j.outgoing.length) return page.appendChild(emptyFriends('There are no pending friend requests.'));
        if (j.incoming.length) { page.appendChild(el('p', { class: 'side__label', text: 'Incoming — ' + j.incoming.length })); j.incoming.forEach(function (u) { page.appendChild(friendRow(u, [['Accept', 'accept', 'ok'], ['Decline', 'decline', 'bad']])); }); }
        if (j.outgoing.length) { page.appendChild(el('p', { class: 'side__label', text: 'Outgoing — ' + j.outgoing.length })); j.outgoing.forEach(function (u) { page.appendChild(friendRow(u, [['Cancel', 'cancel', 'bad']], 'Outgoing friend request')); }); }
        return;
      }
      if (!list.length) return page.appendChild(emptyFriends(friendTab === 'blocked' ? 'You have not blocked anyone.' : friendTab === 'online' ? 'None of your friends are online right now.' : 'You have no friends yet. Add some!'));
      page.appendChild(el('p', { class: 'side__label', text: { online: 'Online', all: 'All friends', blocked: 'Blocked' }[friendTab] + ' — ' + list.length }));
      list.forEach(function (u) { page.appendChild(friendTab === 'blocked' ? friendRow(u, [['Unblock', 'unblock', '']]) : friendRow(u, [['Message', 'message', ''], ['Remove', 'remove', 'bad']])); });
    }).catch(function (e) { clear(page).appendChild(el('p', { class: 'err', text: e.message })); });
  }
  function emptyFriends(text) { return el('div', { class: 'empty empty--big' }, [cicon(homeIcon(), 'empty__art'), el('p', { text: text })]); }
  function friendRow(u, actions, note) {
    return el('div', { class: 'friend' }, [
      el('button', { class: 'friend__who', type: 'button', onclick: function () { openProfile(u.id); } }, [avatarS(u, 'av--lg'), el('span', {}, [nameEl(u, 'b'), el('small', { text: note || u.custom_status || STATUS[u.status] || '' })])]),
      el('div', { class: 'friend__acts' }, actions.map(function (a) {
        return el('button', { class: 'roundbtn' + (a[2] ? ' roundbtn--' + a[2] : ''), type: 'button', title: a[0], 'aria-label': a[0], onclick: function () {
          if (a[1] === 'message') return startDm(u.id);
          if (a[1] === 'remove') return confirmBox('Remove ' + u.name + '?', 'You will no longer be friends. You can add them again later.', 'Remove friend', true).then(function (y) { if (y) friendAction(a[1], u.id); });
          friendAction(a[1], u.id);
        } }, [icon({ message: 'chat', accept: 'check', decline: 'x', cancel: 'x', remove: 'trash', unblock: 'check' }[a[1]] || 'check')]);
      }))
    ]);
  }
  function friendAction(action, userId, username) {
    return api('hub/friends', { action: action, user_id: userId || 0, username: username || '' }).then(function (j) {
      if (j.message) toast(j.message);
      return refreshState().then(function () { if (S.section === 'home' && (!S.view || S.view === 'friends')) showFriends(); return j; });
    }).catch(function (e) { toast(e.message, true); throw e; });
  }
  function addFriendPage(page) {
    var input = el('input', { class: 'input', placeholder: 'You can add friends with their username or display name', maxlength: '40', 'aria-label': 'Username' });
    var send = el('button', { class: 'btn btn--primary', type: 'submit', text: 'Send Friend Request' }), msg = el('p', { class: 'hint', hidden: true });
    var form = el('form', { class: 'addfriend' }, [input, send]);
    form.addEventListener('submit', function (e) {
      e.preventDefault(); if (!input.value.trim()) return;
      send.disabled = true;
      friendAction('request', 0, input.value.trim()).then(function (j) { msg.hidden = false; msg.className = 'okmsg'; msg.textContent = j.message; input.value = ''; })
        .catch(function (x) { msg.hidden = false; msg.className = 'err'; msg.textContent = x.message; }).then(function () { send.disabled = false; });
    });
    page.appendChild(el('h2', { text: 'Add Friend' }));
    page.appendChild(el('p', { class: 'hint', text: 'Type their Discord username or the display name they use in the app.' }));
    page.appendChild(form); page.appendChild(msg);
    page.appendChild(emptyFriends('Friends can see when you are online, and you can set your DMs to friends only in Settings.'));
    input.focus();
  }

   
  function openProfile(userId) {
    api('hub/profile?id=' + userId).then(function (j) {
      var p = j.profile;
      modal(function (box, close) {
        box.classList.add('profile');
        if (p.effect) { box.classList.add('fx', 'fx--' + p.effect); box.appendChild(el('div', { class: 'fx__layer', 'aria-hidden': 'true' })); }
        var banner = el('div', { class: 'profile__banner', style: p.banner_img ? 'background-image:url(' + p.banner_img + ')' : p.banner ? 'background:' + p.banner : '' });
        var acts = el('div', { class: 'profile__acts' });
        function act(label, cls, fn) { acts.appendChild(el('button', { class: 'btn btn--sm ' + (cls || 'btn--ghost'), type: 'button', text: label, onclick: fn })); }
        if (p.relation === 'self') act('Edit Profile', 'btn--primary', function () { close(); openSettings('profile'); });
        else {
          if (p.relation !== 'blocked') act('Message', 'btn--primary', function () { close(); startDm(p.id); });
          if (p.relation === 'none') act('Add Friend', '', function () { friendAction('request', p.id).then(function () { close(); }); });
          if (p.relation === 'incoming') act('Accept Request', '', function () { friendAction('accept', p.id).then(function () { close(); }); });
          if (p.relation === 'outgoing') act('Request Sent', '', function () { friendAction('cancel', p.id).then(function () { close(); }); });
          if (p.relation === 'friends') act('Remove Friend', '', function () { friendAction('remove', p.id).then(function () { close(); }); });
          act(p.relation === 'blocked' ? 'Unblock' : 'Block', 'btn--danger-ghost', function () {
            if (p.relation === 'blocked') return friendAction('unblock', p.id).then(function () { close(); });
            confirmBox('Block ' + p.name + '?', 'They will not be able to message you or send you friend requests.', 'Block', true).then(function (y) { if (y) friendAction('block', p.id).then(function () { close(); }); });
          });
        }
        box.appendChild(banner);
        box.appendChild(el('div', { class: 'profile__top' }, [el('span', { class: 'profile__av' + decoClass(p) }, [avatar(p, 'av--xl'), statusDot(p.status)]), acts]));
        box.appendChild(el('div', { class: 'profile__body' }, [
          el('h2', {}, [nameEl(p), staffBadge(p.staff)]),
          el('p', { class: 'profile__user', text: '@' + p.username + (p.pronouns ? ' · ' + p.pronouns : '') }),
          p.custom_status ? el('p', { class: 'profile__status', text: p.custom_status }) : null,
          p.bio ? el('div', { class: 'profile__sec' }, [el('h3', { text: 'About me' }), el('p', { class: 'profile__bio', text: p.bio })]) : null,
          el('div', { class: 'profile__sec' }, [el('h3', { text: 'Member since' }), el('p', { text: utc(p.joined) ? utc(p.joined).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : '-' })]),
          p.roblox ? el('div', { class: 'profile__sec' }, [el('h3', { text: 'Roblox' }), el('p', {}, [cicon('roblox', 'inline-ic'), p.roblox])]) : null,
          p.relation !== 'self' ? el('p', { class: 'hint', text: p.mutual + ' mutual friend' + (p.mutual === 1 ? '' : 's') }) : null
        ]));
      });
    }).catch(function (e) { toast(e.message, true); });
  }
   
  function mePopout(anchor) {
    var old = doc.querySelector('.popout'); if (old) { old.remove(); return; }
    var me = S.me, mine = me.status === 'invisible' ? 'offline' : (me.status || 'online');
    var pop = el('div', { class: 'popout' + (me.effect ? ' fx fx--' + me.effect : ''), role: 'dialog', 'aria-label': 'Your profile' });
    function close() { pop.remove(); doc.removeEventListener('click', outside, true); doc.removeEventListener('keydown', esc); }
    function outside(e) { if (!pop.contains(e.target)) close(); }
    function esc(e) { if (e.key === 'Escape') close(); }
    if (me.effect) pop.appendChild(el('div', { class: 'fx__layer', 'aria-hidden': 'true' }));
    pop.appendChild(el('div', { class: 'popout__banner', style: me.banner_img ? 'background-image:url(' + me.banner_img + ')' : me.banner ? 'background:' + me.banner : null }));
    pop.appendChild(el('span', { class: 'popout__av profile__av' + decoClass(me) }, [avatar({ avatar: me.avatar, name: me.name }, 'av--xl'), el('span', { class: 'dot dot--' + mine })]));
    var roles = S.section === 'chat' ? (me.roles || []).map(function (id) { return S.roleMap[id]; }).filter(function (r) { return r && r.server_id === S.server; }) : [];
    var srv = S.section === 'chat' ? currentServer() : null;
    pop.appendChild(el('div', { class: 'popout__body' }, [
      el('h3', {}, [nameEl(me), staffBadge(me.rank >= 3 ? 'owner' : me.rank >= 2 ? 'admin' : me.rank >= 1 ? 'staff' : '')]),
      el('p', { class: 'profile__user', text: '@' + (me.login || me.username) + (me.pronouns ? ' · ' + me.pronouns : '') }),
      el('p', { class: 'popout__status' }, [el('span', { class: 'dot dot--' + mine }), me.custom_status || STATUS[me.status] || 'Online']),
      me.bio ? el('div', { class: 'profile__sec' }, [el('h3', { text: 'About me' }), el('p', { class: 'profile__bio', text: me.bio })]) : null,
      roles.length ? el('div', { class: 'profile__sec' }, [el('h3', { text: 'Roles in ' + srv.name }), el('div', { class: 'rolechips' }, roles.map(function (r) { return el('span', { class: 'rolechip' }, [el('i', { style: 'background:' + (r.color || 'var(--mute)') }), r.name]); }))]) : null,
      el('div', { class: 'popout__acts' }, [
        el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'Edit Profile', onclick: function () { close(); openSettings('profile'); } }),
        el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Set Status', onclick: function () { close(); statusMenu(); } }),
        el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Full Profile', onclick: function () { close(); openProfile(me.id); } })
      ])
    ]));
    doc.body.appendChild(pop);
    var r = anchor.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - pop.offsetWidth - 8)) + 'px';
    pop.style.bottom = Math.max(8, window.innerHeight - r.top + 8) + 'px';
    setTimeout(function () { doc.addEventListener('click', outside, true); }, 0);
    doc.addEventListener('keydown', esc);
  }

   
  var MK_CATS = [['', 'All posts'], ['help', 'Help'], ['commission', 'Commissions'], ['hiring', 'Hiring'], ['other', 'Other']], mkQuery = '';
  function showMarket() {
    var body = sideFrame('Marketplace');
    var v = S.view || '';
    body.appendChild(el('p', { class: 'side__label', text: 'Browse' }));
    MK_CATS.forEach(function (c) { body.appendChild(el('button', { class: 'item' + (v === c[0] ? ' on' : ''), type: 'button', onclick: function () { go('market', c[0] || null); } }, [cicon(c[0] === 'hiring' ? 'people' : c[0] === 'commission' ? 'star' : c[0] === 'help' ? 'help' : 'shop', 'item__ico'), el('span', { class: 'item__name', text: c[1] })])); });
    body.appendChild(el('p', { class: 'side__label', text: 'Your posts' }));
    body.appendChild(el('button', { class: 'item' + (v === 'mine' ? ' on' : ''), type: 'button', onclick: function () { go('market', 'mine'); } }, [cicon('rules', 'item__ico'), el('span', { class: 'item__name', text: 'My posts' })]));
    body.appendChild(el('button', { class: 'item' + (v === 'new' ? ' on' : ''), type: 'button', onclick: function () { go('market', 'new'); } }, [el('span', { class: 'ico item__ico', html: ICONS.plus }), el('span', { class: 'item__name', text: 'Post a service' })]));
    var title = v === 'mine' ? 'My posts' : v === 'new' ? 'Post a service' : (MK_CATS.filter(function (c) { return c[0] === v; })[0] || MK_CATS[0])[1];
    var page = el('div', { class: 'page page--wide' });
    mainFrame([cicon('shop', 'hash'), el('h1', { text: title })], v === 'new' ? [] : [el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'Post a service', onclick: function () { go('market', 'new'); } })]).appendChild(page);
    if (v === 'new') return marketNew(page);
    page.appendChild(el('p', { class: 'empty', text: 'Loading…' }));
    var cat = v === 'mine' ? '' : v;
    api('hub/market?cat=' + encodeURIComponent(cat) + '&q=' + encodeURIComponent(v === 'mine' ? '' : mkQuery)).then(function (j) {
      if (S.section !== 'market' || (S.view || '') !== v) return;
      clear(page);
      if (v === 'mine') return marketMine(page, j);
      var q = el('input', { type: 'search', class: 'input', placeholder: 'Search the marketplace', value: mkQuery, 'aria-label': 'Search the marketplace' }), t = 0;
      q.addEventListener('input', function () { clearTimeout(t); t = setTimeout(function () { mkQuery = q.value.trim(); go('market', v || null); var f = F.main.querySelector('input[type=search]'); if (f) { f.focus(); f.setSelectionRange(f.value.length, f.value.length); } }, 400); });
      page.appendChild(el('div', { class: 'mk__top' }, [q]));
      page.appendChild(el('p', { class: 'mk__safe' }, [cicon('shield', 'inline-ic'), 'Agree on the details before you pay, and never share your password. If someone scams you, open a ticket and staff will look into it.']));
      if (!j.listings.length) { page.appendChild(el('div', { class: 'empty empty--big' }, [cicon('shop', 'empty__art'), el('p', { text: mkQuery ? 'Nothing matches that search.' : 'No posts here yet. Be the first to offer a service.' })])); return; }
      var grid = el('div', { class: 'mk' });
      j.listings.forEach(function (l) { grid.appendChild(listingCard(l, j.cats)); });
      page.appendChild(grid);
    }).catch(function (e) { clear(page).appendChild(el('p', { class: 'empty', text: e.message })); });
  }
  function listingCard(l, cats) {
    var desc = el('p', { class: 'mk__desc', text: l.description });
    var acts = el('div', { class: 'mk__acts' });
    if (l.seller_app && l.seller_app !== S.me.id) acts.appendChild(el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'Message seller', onclick: function () { startDm(l.seller_app); } }));
    else if (!l.seller_app && l.seller_discord) acts.appendChild(el('a', { class: 'btn btn--ghost btn--sm', href: 'https://discord.com/users/' + l.seller_discord, target: '_blank', rel: 'noopener', text: 'Message on Discord' }));
    if (l.description.length > 220) acts.appendChild(el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Read more', onclick: function (e) { desc.classList.toggle('open'); e.currentTarget.textContent = desc.classList.contains('open') ? 'Show less' : 'Read more'; } }));
    if (S.me.rank >= 1 || l.seller_app === S.me.id) acts.appendChild(el('button', { class: 'btn btn--danger-ghost btn--sm', type: 'button', text: 'Remove', onclick: function () { removeListing(l); } }));
    return el('article', { class: 'mk__card' }, [
      el('div', { class: 'mk__head' }, [el('span', { class: 'mk__cat', text: (cats && cats[l.category]) || l.category }), el('b', { class: 'mk__price', text: l.price })]),
      el('h3', { text: l.title }), desc,
      el('div', { class: 'mk__seller' }, [avatar(l.seller), el('span', {}, [l.seller.id ? el('button', { class: 'linkbtn', type: 'button', text: l.seller.name, onclick: function () { openProfile(l.seller.id); } }) : el('b', { text: l.seller.name }),
        el('small', { text: (l.seller.roblox ? 'Roblox @' + l.seller.roblox + ' · ' : '') + timeText(l.at) })])]),
      acts
    ]);
  }
  function removeListing(l) {
    confirmBox('Remove this post?', '"' + l.title + '" disappears from the marketplace.', 'Remove', true).then(function (yes) {
      if (yes) api('hub/market/' + l.id + '/remove', {}).then(function () { toast('Post removed.'); go('market', S.view); }).catch(function (e) { toast(e.message, true); });
    });
  }
  function marketMine(page, j) {
    if (!j.mine.length) { page.appendChild(el('div', { class: 'empty empty--big' }, [cicon('shop', 'empty__art'), el('p', { text: 'You have not posted anything yet.' }), el('button', { class: 'btn btn--primary', type: 'button', text: 'Post a service', onclick: function () { go('market', 'new'); } })])); return; }
    j.mine.forEach(function (l) {
      var st = l.status === 'pending' ? 'Waiting for review' + (l.position ? ' · #' + l.position + ' in the queue' : '') : l.status === 'active' ? 'Live' : l.status;
      page.appendChild(el('div', { class: 'card mk__mine' }, [el('div', {}, [el('b', { text: l.title }), el('small', { text: l.price + ' · ' + timeText(l.at) })]), el('span', { class: 'mk__st mk__st--' + l.status, text: st }),
        el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Remove', onclick: function () { removeListing(l); } })]));
    });
  }
  function marketNew(page) {
    if (!S.me.verified) {
      page.appendChild(el('div', { class: 'card' }, [el('h2', { text: 'Link Roblox to sell' }), el('p', { text: 'Every seller is verified, so buyers know who they deal with. Link your Roblox account first.' }),
        el('button', { class: 'btn btn--primary', type: 'button', text: 'Link Roblox', onclick: function () { go('roblox'); } })]));
      return;
    }
    var cat = el('select', { class: 'input' }, MK_CATS.slice(1).map(function (c) { return el('option', { value: c[0], text: c[1] }); }));
    var title = el('input', { class: 'input', maxlength: '120', placeholder: 'e.g. I build Roblox maps' }), price = el('input', { class: 'input', maxlength: '60', placeholder: 'e.g. 500 Robux, or $10' });
    var desc = el('textarea', { class: 'input', rows: '6', maxlength: '3000', placeholder: 'What you offer, what is included, how long it takes, and how to pay.' }), err = el('p', { class: 'err', hidden: true });
    var btn = el('button', { class: 'btn btn--primary', type: 'button', text: 'Send for review', onclick: function () {
      err.hidden = true; btn.disabled = true;
      api('hub/market', { category: cat.value, title: title.value, price: price.value, description: desc.value }).then(function (j) {
        toast('Sent for review. You are #' + j.position + ' in the queue.'); go('market', 'mine');
      }).catch(function (e) { err.hidden = false; err.textContent = e.message; }).then(function () { btn.disabled = false; });
    } });
    page.appendChild(el('div', { class: 'card' }, [el('p', { class: 'hint', text: 'A post approver checks every post before it goes live. Approved posts also show in the Discord marketplace channel.' }),
      fieldRow('Category', cat), fieldRow('Title', title), fieldRow('Price', price), fieldRow('Description', desc), err, btn]));
  }
  function statusMenu() {
    modal(function (box, close) {
      box.classList.add('modal__box--sm');
      var custom = el('input', { class: 'input', maxlength: '80', value: S.me.custom_status || '', placeholder: 'Set a custom status' });
      box.appendChild(el('h2', { text: 'Set your status' }));
      ['online', 'idle', 'dnd', 'invisible'].forEach(function (st) {
        box.appendChild(el('button', { class: 'statusopt' + (S.me.status === st ? ' on' : ''), type: 'button', onclick: function () { saveStatus(st, custom.value, close); } }, [
          el('span', { class: 'dot dot--' + (st === 'invisible' ? 'offline' : st) }), el('span', {}, [el('b', { text: STATUS[st] }), el('small', { text: { online: 'You are around', idle: 'Away for a bit', dnd: 'You will not get desktop notifications', invisible: 'You will look offline, but can use the app' }[st] })])
        ]));
      });
      box.appendChild(el('label', { class: 'field', style: 'margin-top:1rem' }, [el('span', { text: 'Custom status' }), custom]));
      box.appendChild(el('div', { class: 'modal__actions' }, [el('button', { class: 'btn btn--ghost', type: 'button', text: 'Clear', onclick: function () { saveStatus(S.me.status, '', close); } }), el('button', { class: 'btn btn--primary', type: 'button', text: 'Save', onclick: function () { saveStatus(S.me.status, custom.value, close); } })]));
    });
  }
  function saveStatus(st, custom, close) {
    api('hub/status', { status: st, custom_status: custom }).then(function () { close(); return refreshState(); }).then(function () { go(S.section, S.view); }).catch(function (e) { toast(e.message, true); });
  }

   
  var SETTINGS = [['User settings', [['account', 'My Account'], ['profile', 'Profile'], ['security', 'Security'], ['connections', 'Connections'], ['privacy', 'Privacy & Safety'], ['devices', 'Devices']]], ['App settings', [['appearance', 'Appearance'], ['notifications', 'Notifications']]]];
  var settingsCloser = null;
  function openSettings(tab) {
    var layer = el('div', { class: 'settings', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Settings' });
    var nav = el('nav', { class: 'settings__nav' }), content = el('div', { class: 'settings__content' });
    function close(nextSection) { layer.remove(); root.inert = false; settingsCloser = null; doc.removeEventListener('keydown', esc); go(typeof nextSection === 'string' ? nextSection : S.section, typeof nextSection === 'string' ? undefined : S.view); var button = F.side.querySelector('[aria-label="User settings"]'); if (button) button.focus(); }
    function esc(e) {
      if (modalRoot.querySelector('.modal')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        var nodes = Array.prototype.filter.call(layer.querySelectorAll('button,input,textarea,select,a[href]'), function (n) { return !n.disabled && n.getClientRects().length; });
        if (!nodes.length) return;
        if (e.shiftKey && doc.activeElement === nodes[0]) { e.preventDefault(); nodes[nodes.length - 1].focus(); }
        else if (!e.shiftKey && doc.activeElement === nodes[nodes.length - 1]) { e.preventDefault(); nodes[0].focus(); }
      }
    }
    function show(t) {
      tab = t;
      clear(nav);
      SETTINGS.forEach(function (g) {
        nav.appendChild(el('p', { class: 'settings__group', text: g[0] }));
        g[1].forEach(function (x) { nav.appendChild(el('button', { class: 'settings__link' + (x[0] === t ? ' on' : ''), type: 'button', text: x[1], onclick: function () { show(x[0]); } })); });
      });
      nav.appendChild(el('div', { class: 'settings__sep' }));
      nav.appendChild(el('button', { class: 'settings__link settings__link--bad', type: 'button', onclick: signOut }, ['Log Out', icon('logout')]));
      clear(content);
      ({ account: setAccount, profile: setProfile, security: setSecurity, connections: setConnections, privacy: setPrivacy, devices: setDevices, appearance: setAppearance, notifications: setNotifications }[t] || setAccount)(content, show);
    }
    layer.appendChild(el('div', { class: 'settings__side' }, [nav]));
    layer.appendChild(el('div', { class: 'settings__main' }, [content, el('button', { class: 'settings__close', type: 'button', 'aria-label': 'Close settings', title: 'Close (Esc)', onclick: close }, [icon('x'), el('small', { text: 'ESC' })])]));
    doc.body.appendChild(layer);
    root.inert = true; settingsCloser = close;
    doc.addEventListener('keydown', esc);
    show(tab || 'account');
    nav.querySelector('button').focus();
  }
  function sHead(c, title, text) { c.appendChild(el('h2', { class: 'settings__title', text: title })); if (text) c.appendChild(el('p', { class: 'hint', text: text })); }
  function profileCard(me) {
    return el('div', { class: 'acct' + (me.effect ? ' fx fx--' + me.effect : '') }, [el('div', { class: 'fx__layer', 'aria-hidden': 'true' }), el('div', { class: 'acct__banner', style: me.banner_img ? 'background:center/cover url(' + me.banner_img + ')' : me.banner ? 'background:' + me.banner : '' }),
      el('div', { class: 'acct__row' }, [el('span', { class: 'profile__av' + decoClass(me) }, [avatar({ avatar: me.avatar, name: me.name }, 'av--xl')]), el('div', {}, [el('h3', { class: 'nm' + nameClass(me), text: me.name, 'data-text': me.name }), el('small', { text: '@' + (me.login || me.username) })])]),
      el('div', { class: 'acct__plate member' + plateClass(me) }, [avatar({ avatar: me.avatar, name: me.name }), el('span', {}, [el('span', { class: 'nm' + nameClass(me), text: me.name }), el('small', { text: 'How you look in member lists' })])])]);
  }
  function cosmeticPicker(label, kind, sel, onPick) {
    var grid = el('div', { class: 'cos-grid' });
    function draw() {
      clear(grid);
      [['', 'None']].concat(COSMETICS[kind]).forEach(function (o) {
        var sample = kind === 'namestyle' ? el('span', { class: 'cos__name nm' + (o[0] ? ' ns ns--' + o[0] : ''), text: 'Name', 'data-text': 'Name' })
          : kind === 'deco' ? el('span', { class: 'avwrap' + (o[0] ? ' deco deco--' + o[0] : '') }, [el('span', { class: 'av', text: 'A' })])
          : kind === 'plate' ? el('span', { class: 'cos__plate' + (o[0] ? ' np np--' + o[0] : '') })
          : el('span', { class: 'cos__fx' + (o[0] ? ' fx fx--' + o[0] : '') }, [el('span', { class: 'fx__layer' })]);
        grid.appendChild(el('button', { class: 'cos' + (sel[kind] === o[0] ? ' on' : ''), type: 'button', title: o[1], onclick: function () { sel[kind] = o[0]; draw(); onPick(); } }, [sample, el('small', { text: o[1] })]));
      });
    }
    draw();
    return el('div', { class: 'field' }, [el('span', { text: label }), grid]);
  }
  function setAccount(c, show) {
    var me = S.me;
    sHead(c, 'My Account');
    var card = profileCard(me);
    card.appendChild(el('div', { class: 'acct__list' }, [
      kvRow('Username', me.login || me.username),
      kvRow('Display name', me.display_name || me.username, 'Edit', function () { show('profile'); }),
      kvRow('Email', me.email + (me.email_verified ? ' · verified' : ''), 'Change', function () { changeEmail(function () { location.replace('/hub'); }); }),
      kvRow('Phone number', 'Coming soon'),
      kvRow('Two-factor authentication', me.two_factor ? 'On · ' + me.backup_left + ' backup code' + (me.backup_left === 1 ? '' : 's') + ' left' : 'Off', me.two_factor ? 'Manage' : 'Enable', function () { show('security'); }),
      kvRow('Discord account', me.discord_linked ? 'Linked (' + me.discord_id + ')' : 'Not linked', 'Manage', function () { show('connections'); }),
      kvRow('Roblox account', me.roblox ? me.roblox.username + ' · verified' : 'Not linked', me.roblox ? 'Manage' : 'Link', function () { closeSettingsTo('roblox'); }),
      kvRow('Staff role', { 3: 'Owner', 2: 'Admin', 1: 'Staff' }[me.rank] || 'Member')
    ]));
    c.appendChild(card);
  }
  function kvRow(label, value, btn, fn) {
    return el('div', { class: 'kvrow' }, [el('div', {}, [el('small', { text: label }), el('b', { text: value })]), btn ? el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: btn, onclick: fn }) : null]);
  }
  function setSecurity(c) {
    var me = S.me;
    sHead(c, 'Security', 'Keep your account safe.');
     
    c.appendChild(el('h3', { class: 'settings__h', text: 'Two-factor authentication' }));
    var tfa = el('div', { class: 'card' });
    c.appendChild(tfa);
    if (!me.two_factor) {
      tfa.appendChild(el('p', {}, [el('span', { class: 'badge badge--bad', text: 'Off' }), ' Anyone with your password could sign in. With two-factor, they also need a code from your phone.']));
      tfa.appendChild(el('button', { class: 'btn btn--primary', type: 'button', text: 'Set Up Two-Factor', onclick: function () {
        api('hub/2fa/setup', {}).then(function (j) {
          clear(tfa);
          var q = qrcode(0, 'M'); q.addData(j.uri); q.make();
          var code = el('input', { class: 'input code-input', inputmode: 'numeric', maxlength: '6', placeholder: '123456' }), err = el('p', { class: 'err', hidden: true });
          tfa.appendChild(el('p', { text: '1. Install an authenticator app (Google Authenticator, Microsoft Authenticator, Authy or 2FAS).' }));
          tfa.appendChild(el('p', { text: '2. Scan this QR code with it, or type the key below.' }));
          tfa.appendChild(el('div', { class: 'tfa' }, [el('div', { class: 'qr__box', html: q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }) }), el('div', {}, [el('small', { class: 'hint', text: 'Key' }), el('div', { class: 'code', text: j.secret.replace(/(.{4})/g, '$1 ').trim() })])]));
          tfa.appendChild(el('p', { text: '3. Enter the 6 digit code the app shows.' }));
          tfa.appendChild(code); tfa.appendChild(err);
          tfa.appendChild(el('button', { class: 'btn btn--primary', type: 'button', text: 'Turn On', style: 'margin-top:.8rem', onclick: function () {
            api('hub/2fa/enable', { code: code.value }).then(function (r) { return refreshState().then(function () { showBackupCodes(r.backup_codes); clear(c); setSecurity(c); }); }).catch(function (x) { err.hidden = false; err.textContent = x.message; });
          } }));
          code.focus();
        }).catch(function (x) { toast(x.message, true); });
      } }));
    } else {
      tfa.appendChild(el('p', {}, [el('span', { class: 'badge badge--ok', text: 'On' }), ' Your account is protected. You have ' + me.backup_left + ' unused backup code' + (me.backup_left === 1 ? '' : 's') + '.']));
      tfa.appendChild(el('div', { class: 'row' }, [
        el('button', { class: 'btn btn--ghost', type: 'button', text: 'New Backup Codes', onclick: function () { askCode('New backup codes', 'Enter a code from your authenticator app. Your old backup codes stop working.', false, function (code) { return api('hub/2fa/backup', { code: code }).then(function (r) { return refreshState().then(function () { showBackupCodes(r.backup_codes); clear(c); setSecurity(c); }); }); }); } }),
        el('button', { class: 'btn btn--danger-ghost', type: 'button', text: 'Turn Off', onclick: function () { askCode('Turn off two-factor?', 'Your account becomes less safe. Enter a code and your password.', true, function (code, pw) { return api('hub/2fa/disable', { code: code, password: pw }).then(function () { return refreshState().then(function () { toast('Two-factor authentication is off.'); clear(c); setSecurity(c); }); }); }); } })
      ]));
    }
     
    c.appendChild(el('h3', { class: 'settings__h', text: 'Password' }));
    var cur = el('input', { type: 'password', autocomplete: 'current-password' }), np = el('input', { type: 'password', autocomplete: 'new-password' }), np2 = el('input', { type: 'password', autocomplete: 'new-password' }), perr = el('p', { class: 'err', hidden: true });
    c.appendChild(el('div', { class: 'card' }, [fieldRow('Current password', cur), fieldRow('New password', np), fieldRow('Confirm new password', np2), perr, el('button', { class: 'btn btn--primary', type: 'button', text: 'Change Password', onclick: function () {
      perr.hidden = true;
      if (np.value !== np2.value) { perr.hidden = false; perr.textContent = 'The two passwords are not the same.'; return; }
      api('hub/password', { current: cur.value, password: np.value }).then(function () { toast('Password changed. Other devices were signed out.'); cur.value = np.value = np2.value = ''; }).catch(function (x) { perr.hidden = false; perr.textContent = x.message; });
    } })]));
    c.appendChild(el('h3', { class: 'settings__h', text: 'Email and phone' }));
    c.appendChild(el('div', { class: 'card' }, [kvRow('Email', me.email + ' · verified', 'Change', function () { changeEmail(function () { location.replace('/hub'); }); }), kvRow('Phone number', 'Coming soon')]));
  }
  function askCode(title, text, withPassword, fn) {
    modal(function (box, close) {
      var code = el('input', { class: 'input', inputmode: 'numeric', placeholder: 'Code or backup code' }), pw = el('input', { class: 'input', type: 'password', placeholder: 'Password' }), err = el('p', { class: 'err', hidden: true });
      box.appendChild(el('h2', { text: title })); box.appendChild(el('p', { text: text }));
      box.appendChild(fieldRow('Code', code)); if (withPassword) box.appendChild(fieldRow('Password', pw)); box.appendChild(err);
      box.appendChild(el('div', { class: 'modal__actions' }, [el('button', { class: 'btn btn--ghost', type: 'button', text: 'Cancel', onclick: close }), el('button', { class: 'btn btn--primary', type: 'button', text: 'Continue', onclick: function () {
        fn(code.value, pw.value).then(close).catch(function (x) { err.hidden = false; err.textContent = x.message; });
      } })]));
    });
  }
   
  function showBackupCodes(codes) {
    modal(function (box, close) {
      var text = 'Axiomate Hub backup codes for ' + S.me.username + '\n' + codes.join('\n') + '\n\nEach code works once. Keep them somewhere safe.';
      box.appendChild(el('h2', { text: 'Save your backup codes' }));
      box.appendChild(el('p', { text: 'If you lose your phone, sign in with one of these. Each works once. This is the only time you will see them.' }));
      box.appendChild(el('div', { class: 'backup' }, codes.map(function (x) { return el('code', { text: x }); })));
      box.appendChild(el('div', { class: 'modal__actions' }, [
        el('button', { class: 'btn btn--ghost', type: 'button', text: 'Copy', onclick: function () { if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Copied.'); }); } }),
        el('a', { class: 'btn btn--ghost', href: 'data:text/plain;charset=utf-8,' + encodeURIComponent(text), download: 'axiomate-backup-codes.txt', text: 'Download' }),
        el('button', { class: 'btn btn--primary', type: 'button', text: 'I Saved Them', onclick: close })
      ]));
      toast('Your account is now protected with two-factor authentication.');
    });
  }
  function setConnections(c) {
    var me = S.me;
    sHead(c, 'Connections', 'Your app account is separate from Discord. Link Discord to open tickets (staff talk to you in your Discord DMs) and to use your staff rank in the app.');
    c.appendChild(el('div', { class: 'card conn' }, [el('div', { class: 'conn__who' }, [el('b', { text: 'Discord' }), el('small', { text: me.discord_linked ? 'Linked · ' + me.discord_id : 'Not linked' })]),
      me.discord_linked ? el('button', { class: 'btn btn--ghost', type: 'button', text: 'Unlink', onclick: function () { api('hub/discord/unlink', {}).then(function () { return refreshState(); }).then(function () { clear(c); setConnections(c); }); } })
        : el('a', { class: 'btn btn--primary discord-btn', href: '/api/hub/discord/link', text: 'Link Discord' })]));
    c.appendChild(el('div', { class: 'card conn' }, [el('div', { class: 'conn__who' }, [el('b', { text: 'Roblox' }), el('small', { text: me.roblox ? 'Linked · ' + me.roblox.username : 'Not linked' })]),
      el('button', { class: 'btn btn--ghost', type: 'button', text: me.roblox ? 'Manage' : 'Link Roblox', onclick: function () { closeSettingsTo('roblox'); } })]));
  }
  function closeSettingsTo(section) { if (settingsCloser) settingsCloser(section); else go(section); }
  function setProfile(c) {
    var me = S.me;
    sHead(c, 'Profile', 'How you look to everyone in the app. Your Discord account stays the same.');
    var name = el('input', { maxlength: '32', value: me.display_name || '', placeholder: me.username }), pron = el('input', { maxlength: '30', value: me.pronouns || '', placeholder: 'e.g. he/him' });
    var bio = el('textarea', { maxlength: '190', rows: '4', placeholder: 'Tell people a little about yourself' }); bio.value = me.bio || '';
    var custom = el('input', { maxlength: '80', value: me.custom_status || '', placeholder: 'e.g. Grinding in Locked Ego' });
    var banner = el('input', { type: 'color', value: me.banner || '#3b2a7a' }), noBanner = !me.banner;
    var file = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp', hidden: true }), bfile = el('input', { type: 'file', accept: 'image/png,image/jpeg,image/gif,image/webp', hidden: true });
    var sel = { effect: me.effect || '', deco: me.deco || '', plate: me.plate || '', namestyle: me.namestyle || '' };
    var preview = profileCard(me), err = el('p', { class: 'err', hidden: true });
    function refreshPreview() {
      var nb = preview.querySelector('.acct__banner'); nb.style.background = me.banner_img ? 'center/cover url(' + me.banner_img + ')' : noBanner ? '' : banner.value;
      var h = preview.querySelector('h3'); h.textContent = name.value.trim() || me.username; h.setAttribute('data-text', h.textContent);
      h.className = 'nm' + nameClass(sel);
      preview.querySelector('.profile__av').className = 'profile__av' + decoClass(sel);
      preview.className = 'acct' + (sel.effect ? ' fx fx--' + sel.effect : '');
      var plate = preview.querySelector('.acct__plate'); plate.className = 'acct__plate member' + plateClass(sel);
    }
    bfile.addEventListener('change', function () { if (bfile.files[0]) uploadImage('banner', bfile.files[0]); bfile.value = ''; });
    setTimeout(refreshPreview, 0);
    [name, banner].forEach(function (x) { x.addEventListener('input', function () { if (x === banner) noBanner = false; refreshPreview(); }); });
    file.addEventListener('change', function () { if (file.files[0]) uploadImage('avatar', file.files[0]); file.value = ''; });
    var form = el('div', { class: 'settings__split' }, [
      el('div', {}, [
        el('div', { class: 'field' }, [el('span', { text: 'Avatar' }), el('div', { class: 'row' }, [el('button', { class: 'btn btn--primary btn--sm', type: 'button', text: 'Change Avatar', onclick: function () { file.click(); } }),
          el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Search GIFs', onclick: function () { gifPicker('avatar', afterSave); } }),
          me.custom_avatar ? el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Use my Discord avatar', onclick: function () { api('hub/avatar', { reset: true }).then(afterSave); } }) : null, file])]),
        el('label', { class: 'field' }, [el('span', { text: 'Display name' }), name]),
        el('label', { class: 'field' }, [el('span', { text: 'Pronouns' }), pron]),
        el('div', { class: 'field' }, [el('span', { text: 'Banner colour' }), el('div', { class: 'row' }, [banner, el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Default', onclick: function () { noBanner = true; refreshPreview(); } })])]),
        el('label', { class: 'field' }, [el('span', { text: 'About me' }), bio]),
        el('label', { class: 'field' }, [el('span', { text: 'Custom status' }), custom]),
        el('div', { class: 'field' }, [el('span', { text: 'Banner picture' }), el('div', { class: 'row' }, [el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: me.banner_img ? 'Change Banner' : 'Upload Banner', onclick: function () { bfile.click(); } }),
          el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Search GIFs', onclick: function () { gifPicker('banner', afterSave); } }),
          me.banner_img ? el('button', { class: 'btn btn--ghost btn--sm', type: 'button', text: 'Remove', onclick: function () { api('hub/banner', { reset: true }).then(afterSave); } }) : null, bfile]),
          el('small', { class: 'field__hint', text: 'PNG, JPG, WEBP or an animated GIF. Avatars can be animated GIFs too.' })]),
        cosmeticPicker('Profile effect', 'effect', sel, refreshPreview), cosmeticPicker('Avatar decoration', 'deco', sel, refreshPreview), cosmeticPicker('Nameplate', 'plate', sel, refreshPreview), cosmeticPicker('Display name style', 'namestyle', sel, refreshPreview),
        err,
        el('button', { class: 'btn btn--primary', type: 'button', text: 'Save Changes', onclick: function () {
          err.hidden = true;
          api('hub/profile', { display_name: name.value, pronouns: pron.value, bio: bio.value, banner: noBanner ? '' : banner.value, custom_status: custom.value, status: me.status, effect: sel.effect, deco: sel.deco, plate: sel.plate, namestyle: sel.namestyle }).then(afterSave)
            .catch(function (e) { err.hidden = false; err.textContent = e.message; });
        } })
      ]),
      el('div', {}, [el('p', { class: 'settings__group', text: 'Preview' }), preview])
    ]);
    c.appendChild(form);
    function afterSave() { return refreshState().then(function () { toast('Profile saved.'); clear(c); setProfile(c); }); }
    function uploadImage(kind, f) {
      if (!/^image\/(png|jpeg|gif|webp)$/.test(f.type)) return toast('Pick a PNG, JPG, GIF or WEBP picture.', true);
      var send = function (data) { api('hub/' + kind, { data: data }).then(afterSave).catch(function (e) { toast(e.message, true); }); };
      if (f.type === 'image/gif') {    
        if (f.size > 1000000) return toast('GIFs must be smaller than 1 MB.', true);
        var r = new FileReader(); r.onload = function () { send(r.result); }; r.readAsDataURL(f); return;
      }
      var img = new Image(), url = URL.createObjectURL(f);
      img.onload = function () {
        var W2 = kind === 'banner' ? 960 : 256, H2 = kind === 'banner' ? 340 : 256, cv = doc.createElement('canvas'); cv.width = W2; cv.height = H2;
        var k = Math.max(W2 / img.width, H2 / img.height), w = img.width * k, h = img.height * k;
        cv.getContext('2d').drawImage(img, (W2 - w) / 2, (H2 - h) / 2, w, h);
        URL.revokeObjectURL(url);
        send(cv.toDataURL(f.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.9));
      };
      img.onerror = function () { toast('That picture could not be opened.', true); };
      img.src = url;
    }
  }
  function radioGroup(name, options, value, onChange) {
    return el('div', { class: 'radios' }, options.map(function (o) {
      var input = el('input', { type: 'radio', name: name, value: o[0] }); input.checked = o[0] === value;
      input.addEventListener('change', function () { if (input.checked) onChange(o[0]); });
      return el('label', { class: 'radio' }, [input, el('span', {}, [el('b', { text: o[1] }), o[2] ? el('small', { text: o[2] }) : null])]);
    }));
  }
  function savePrefs(change) {
    return api('hub/prefs', change).then(function (j) { S.prefs = j.prefs; applyPrefs(); toast('Saved.'); }).catch(function (e) { toast(e.message, true); });
  }
  function setPrivacy(c) {
    sHead(c, 'Privacy & Safety');
    c.appendChild(el('h3', { class: 'settings__h', text: 'Who can send you direct messages' }));
    c.appendChild(radioGroup('dm', [['everyone', 'Everyone', 'Anyone in the app can message you'], ['friends', 'Friends only', 'Only your friends (staff can still reach you)']], S.prefs.dm_from, function (v) { savePrefs({ dm_from: v }); }));
    c.appendChild(el('h3', { class: 'settings__h', text: 'Who can send you friend requests' }));
    c.appendChild(radioGroup('fr', [['everyone', 'Everyone'], ['nobody', 'Nobody', 'You can still send requests yourself']], S.prefs.fr_from, function (v) { savePrefs({ fr_from: v }); }));
    c.appendChild(el('h3', { class: 'settings__h', text: 'Blocked members' }));
    c.appendChild(el('button', { class: 'btn btn--ghost', type: 'button', text: 'See blocked members', onclick: function () { friendTab = 'blocked'; closeSettingsTo('home'); } }));
  }
  function setDevices(c) {
    sHead(c, 'Devices', 'Every browser and installed app where you are signed in.');
    var line = el('p', { text: 'Checking…' });
    c.appendChild(el('div', { class: 'card' }, [line, el('button', { class: 'btn btn--danger', type: 'button', text: 'Log out of all other devices', onclick: function () {
      confirmBox('Log out everywhere else?', 'Every other device signed in to your account is signed out. This one stays signed in.', 'Log out others', true).then(function (y) {
        if (y) api('hub/sessions/others', {}).then(function () { toast('Other devices are signed out.'); clear(c); setDevices(c); });
      });
    } })]));
    api('hub/sessions').then(function (j) { line.textContent = 'You are signed in on ' + j.count + ' device' + (j.count === 1 ? '' : 's') + ', including this one.'; });
  }
  function setAppearance(c) {
    sHead(c, 'Appearance');
    c.appendChild(el('h3', { class: 'settings__h', text: 'Theme' }));
    c.appendChild(el('div', { class: 'themes' }, [['shadow', 'Shadow', 'Dark and violet, like the Shadow Monarch'], ['blossom', 'Blossom', 'Dark with cherry blossom pink']].map(function (t) {
      return el('button', { class: 'theme-pick theme-pick--' + t[0] + (S.prefs.theme === t[0] ? ' on' : ''), type: 'button', onclick: function () { savePrefs({ theme: t[0] }).then(function () { clear(c); setAppearance(c); }); } }, [el('span', { class: 'theme-pick__sw' }), el('b', { text: t[1] }), el('small', { text: t[2] })]);
    })));
    c.appendChild(el('h3', { class: 'settings__h', text: 'Message display' }));
    c.appendChild(radioGroup('compact', [['cozy', 'Cozy', 'Pictures and names on every group of messages'], ['compact', 'Compact', 'More messages on screen']], S.prefs.compact ? 'compact' : 'cozy', function (v) { savePrefs({ compact: v === 'compact' }); }));
    c.appendChild(el('h3', { class: 'settings__h', text: 'Text size' }));
    c.appendChild(radioGroup('font', [['90', 'Small'], ['100', 'Normal'], ['110', 'Large'], ['120', 'Extra large']], String(S.prefs.font || 100), function (v) { savePrefs({ font: parseInt(v, 10) }); }));
  }
  function setNotifications(c) {
    sHead(c, 'Notifications', 'A desktop notification when you get a direct message while the app is in the background.');
    var can = 'Notification' in window;
    c.appendChild(radioGroup('notify', [['on', 'On'], ['off', 'Off']], S.prefs.notify ? 'on' : 'off', function (v) {
      if (v === 'on' && can && Notification.permission === 'default') Notification.requestPermission();
      savePrefs({ notify: v === 'on' });
    }));
    if (!can) c.appendChild(el('p', { class: 'hint', text: 'This browser does not support notifications.' }));
    else if (Notification.permission === 'denied') c.appendChild(el('p', { class: 'err', text: 'Notifications are blocked for this site in your browser settings.' }));
    c.appendChild(el('p', { class: 'hint', text: 'While your status is Do Not Disturb you get no notifications.' }));
  }
   
  function applyPrefs() {
    var p = S.prefs || {}, d = doc.documentElement;
    d.setAttribute('data-theme', p.theme === 'blossom' ? 'blossom' : 'shadow');
    d.classList.toggle('compact', !!p.compact);
    d.style.fontSize = (p.font || 100) + '%';
    applyLook();
  }
  function notifyDms() {
    var n = S.dms.reduce(function (t, d) { return t + d.unread; }, 0);
    if (S.lastDmUnread >= 0 && n > S.lastDmUnread && doc.hidden && S.prefs.notify && S.me.status !== 'dnd' && 'Notification' in window && Notification.permission === 'granted') {
      var d = S.dms.filter(function (x) { return x.unread; })[0];
      try { new Notification(d ? d.user.name : (S.app.name || 'Axiomate Hub'), { body: 'New direct message', icon: '/hub/icon-192.png', tag: 'hub-dm' }); } catch (e) {   }
    }
    S.lastDmUnread = n;
  }

   
  function applyState(j) {
    if (j.app) { S.app = j.app; applyLook(); }
    S.servers = j.servers || []; S.roles = j.roles || []; S.perms = j.perms || {}; S.roleMap = {};
    S.roles.forEach(function (r) { S.roleMap[r.id] = r; });
    S.me = j.me; S.csrf = j.csrf; S.channels = j.channels; S.dms = j.dms; S.online = j.online; S.ticket = j.ticket; S.staffWaiting = j.staff_waiting;
    S.friendRequests = j.friend_requests || 0;
    if (j.prefs) { S.prefs = j.prefs; applyPrefs(); }
    if (conv) clearUnread(conv.kind, conv.id);
    notifyDms();
  }
  function refreshState() {
    if (doc.hidden) return Promise.resolve();
    return api('hub/state').then(function (j) {
      connectionNotice('');
      var sig = function () { return JSON.stringify([S.servers, S.roles, S.channels.map(function (c) { return [c.id, c.server_id, c.can_post, c.name, c.unread, c.topic, c.icon, c.category]; }), S.online.map(function (u) { return u.roles; }), S.dms.map(function (d) { return [d.id, d.unread, d.user.status, d.user.name, d.user.custom_status]; }), S.online.map(function (u) { return [u.id, u.status, u.name]; }), S.staffWaiting, S.friendRequests, S.me && [S.me.name, S.me.status, S.me.custom_status, S.me.avatar]]); };
      var before = sig();
      applyState(j);
      var after = sig();
      if (before !== after && F.app) {
        drawRail();
         
        if (S.section === 'chat' || S.section === 'home') redrawSide();
        else { var mb = F.side.querySelector('.me'); if (mb) mb.replaceWith(meBar()); }
        if (S.section === 'chat') drawMembers();
      }
    }).catch(function (e) { if (e.status === 401) { connectionNotice(''); stopTimers(); S.me = null; F = {}; renderLogin('You were signed out. Sign in again to continue.'); } else connectionNotice('Unable to sync. Your connection may be interrupted.'); });
  }
  function redrawSide() {
    var keepConv = conv; conv = null;
    var main = F.main, frag = doc.createDocumentFragment();
    while (main.firstChild) frag.appendChild(main.firstChild);
    ({ home: showHome, chat: showChat }[S.section])();
    clearTimeout(timers.msgs);
    if (keepConv || (S.section === 'home' && (!S.view || S.view === 'friends') && friendTab === 'add')) { clear(main); main.appendChild(frag); conv = keepConv; if (conv) schedulePoll(); }
  }
  function stopTimers() { clearInterval(timers.state); clearTimeout(timers.msgs); clearTimeout(qrPoll); }
  doc.addEventListener('visibilitychange', function () { if (!doc.hidden && S.me) { refreshState(); if (conv) { clearTimeout(timers.msgs); pollMessages(); } } });

   
  function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.navigator.standalone; }
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); S.install = e; if (F.rail) drawRail(); });
  window.addEventListener('appinstalled', function () { S.install = null; if (F.rail) drawRail(); toast('Axiomate Hub is installed.'); });
  function installApp() {
    if (S.install) { S.install.prompt(); S.install.userChoice.then(function () { S.install = null; drawRail(); }); return; }
    modal(function (box, close) {
      box.appendChild(el('h2', { text: 'Install Axiomate Hub' }));
      box.appendChild(el('p', { text: isIos() ? 'On iPhone or iPad: tap the Share button in Safari, then "Add to Home Screen".' : 'In Chrome or Edge: open the browser menu and choose "Install Axiomate Hub" (or "Apps → Install this site as an app").' }));
      box.appendChild(el('div', { class: 'modal__actions' }, [el('button', { class: 'btn btn--primary', type: 'button', text: 'OK', onclick: close })]));
    });
  }
   
  var wantInstall = new URLSearchParams(location.search).get('install') === '1' && !window.matchMedia('(display-mode: standalone)').matches && !window.navigator.standalone;
  function installOffer() {
    if (!wantInstall) return;
    wantInstall = false;
    try { var u = new URL(location.href); u.searchParams.delete('install'); history.replaceState(null, '', u.pathname + u.search); } catch (e) {   }
    modal(function (box, close) {
      var body = el('div', {});
      function draw() {
        clear(body);
        if (S.install) {
          body.appendChild(el('p', { text: 'Install ' + (S.app.name || 'Axiomate Hub') + ' on this device. It opens in its own window, with its own icon, and updates itself.' }));
          body.appendChild(el('div', { class: 'modal__actions' }, [el('button', { class: 'btn btn--ghost', type: 'button', text: 'Continue on Web', onclick: close }),
            el('button', { class: 'btn btn--primary', type: 'button', text: 'Install', onclick: function () { S.install.prompt(); S.install.userChoice.then(function () { S.install = null; close(); if (F.rail) drawRail(); }); } })]));
        } else {
          var ua = navigator.userAgent;
          var how = isIos() ? 'On iPhone or iPad, open this page in Safari, tap the Share button, then "Add to Home Screen".'
            : /Firefox\//.test(ua) ? 'Firefox cannot install apps. Open this page in Chrome or Edge to install it, or keep using it here in the browser.'
            : /Android/.test(ua) ? 'Open the browser menu (the three dots) and tap "Install app" or "Add to Home screen".'
            : 'Click the install icon at the right end of the address bar, or open the browser menu and choose "Install ' + (S.app.name || 'Axiomate Hub') + '" (in Edge: Apps, then Install this site as an app).';
          body.appendChild(el('p', { text: how }));
          body.appendChild(el('div', { class: 'modal__actions' }, [el('button', { class: 'btn btn--primary', type: 'button', text: 'Continue on Web', onclick: close })]));
        }
      }
      box.appendChild(el('h2', { text: 'Download the app' }));
      box.appendChild(body);
      draw();
       
      window.addEventListener('beforeinstallprompt', function () { setTimeout(draw, 0); });
    });
  }
  setTimeout(installOffer, 900);
  if ('serviceWorker' in navigator) {
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.register('/hub-sw.js', { scope: '/hub', updateViaCache: 'none' }).then(function (reg) { reg.update(); setInterval(function () { reg.update(); }, 30 * 60 * 1000); }).catch(function () {   });
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (hadController && !S.reloading) { S.reloading = true; location.reload(); } });
  }

   
  Promise.all([
    fetch('/hub/icons.json?v=3').then(function (r) { return r.json(); }).catch(function () { return {}; }),
    fetch('/api/hub/config').then(function (r) { return r.json(); }).catch(function () { return {}; })
  ]).then(function (got) {
    S.icons = got[0] || {}; S.app = (got[1] && got[1].app) || {};
    try { S.prefs = JSON.parse(localStorage.getItem('hub.prefs') || '{}'); } catch (e) { S.prefs = {}; }
    applyPrefs();
    return api('hub/state');
  }).then(function (j) {
    if (j.needs_email) { S.csrf = j.csrf; renderVerify(j.me); return; }
    applyState(j);
    var rbx = new URLSearchParams(location.search).get('roblox');
    if (rbx) { history.replaceState(null, '', '/hub'); S.section = 'roblox'; setTimeout(function () { toast({ linked: 'Your Roblox account is linked!', taken: 'That Roblox account is already linked to another app account.', cancelled: 'Roblox sign-in was cancelled.', off: 'Sign in with Roblox is not set up yet. Use the words instead.', error: 'Roblox sign-in did not finish. Try again, or use the words.' }[rbx] || '', rbx !== 'linked'); }, 500); }
    var linked = new URLSearchParams(location.search).get('linked');
    if (linked) { history.replaceState(null, '', '/hub'); setTimeout(function () { toast({ '1': 'Your Discord account is linked.', taken: 'That Discord account is already linked to another app account.', error: 'Discord linking did not finish. Try again.' }[linked] || '', linked !== '1'); }, 500); }
    try { var s = localStorage.getItem('hub.section'); if (s && s !== 'staff') S.section = s; S.server = parseInt(localStorage.getItem('hub.server') || '0', 10) || 0; } catch (e) {   }
    var want = new URLSearchParams(location.search).get('section');
    if (want) S.section = want;
    if (rbx) S.section = 'roblox';
    renderApp();
    timers.state = setInterval(refreshState, 10000);
    if (qrParam) approveQr(qrParam);
    try { localStorage.setItem('hub.prefs', JSON.stringify(S.prefs)); } catch (e) {   }
  }).catch(function (e) {
    if (e.status === 401) renderLogin();
    else { clear(root).appendChild(el('div', { class: 'boot' }, [el('p', { text: e.message }), el('button', { class: 'btn btn--primary', type: 'button', text: 'Try again', onclick: function () { location.reload(); } })])); }
  });
})();
