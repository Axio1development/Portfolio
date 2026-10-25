(function () {
  var doc = document;
  function $(s, c) { return (c || doc).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); }
  function el(tag, attrs, kids) {
    var n = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return n;
  }
  function clear(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }
  var here = location.pathname.replace(/\/$/, '') || '/home';
  var state = { user: null, csrf: null, offline: false };
  var TYPES = { 'fake-trade': 'Fake trade', phishing: 'Phishing link', impersonation: 'Impersonation', payment: 'Payment scam', other: 'Other' };
  var CATS = { help: 'Helping / carrying', commission: 'Commission', hiring: 'Looking for developers', other: 'Other service' };
  var GSTATUS = { in_development: 'In Development', planned: 'Planned', live: 'Live', coming_soon: 'Coming Soon' };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function api(path, body, method) {
    var controller = new AbortController(), timeout = setTimeout(function () { controller.abort(); }, 20000);
    var headers = { 'Content-Type': 'application/json' };
    var m = method || (body ? 'POST' : 'GET');
    if (m !== 'GET' && state.csrf) headers['X-CSRF-Token'] = state.csrf;
    return fetch('/api/' + path, { method: m, headers: headers, credentials: 'same-origin', signal: controller.signal, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        return r.json().catch(function () { return { ok: false, error: 'Unexpected response from the server.' }; }).then(function (j) {
          if (!r.ok || j.ok === false) { var e = new Error(j.error || 'Request failed.'); e.status = r.status; throw e; }
          return j;
        });
      }).catch(function (e) {
        if (e.name === 'AbortError') throw new Error('The request timed out. Please try again.');
        if (e instanceof TypeError) throw new Error('Unable to connect. Check your internet connection and try again.');
        throw e;
      }).finally(function () { clearTimeout(timeout); });
  }
  function signInUrl() { return '/api/auth/discord?next=' + encodeURIComponent(here + location.hash); }
  function fmtDate(s) { return s ? String(s).slice(0, 10) : ''; }
  function num(n) { return n === null || n === undefined ? '-' : Number(n).toLocaleString('en-US'); }
  function ago(s) {
    var t = Date.parse(String(s).replace(' ', 'T') + 'Z'); if (isNaN(t)) return '';
    var m = Math.max(0, Math.round((Date.now() - t) / 60000));
    return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago';
  }
  function badge(text, kind) { return el('span', { class: 'badge' + (kind ? ' badge--' + kind : ''), text: text }); }
  function statusBadge(s) { return badge(s, { verified: 'ok', accepted: 'ok', active: 'ok', rejected: 'bad', removed: 'bad' }[s] || 'warn'); }
  function link(href, text, cls) { return el('a', { class: cls || '', href: href, rel: 'noopener noreferrer', target: '_blank', text: text }); }

   
  function renderChip() {
    var chip = $('#acct'); if (!chip) return;
    clear(chip); chip.className = 'acct';
    var u = state.user;
    if (u) {
      chip.classList.add(u.verified ? 'is-verified' : 'is-partial');
      chip.appendChild(u.avatar ? el('img', { class: 'acct__img', src: u.avatar, alt: '', width: '22', height: '22' }) : el('i', { class: 'acct__dot' }));
      chip.appendChild(el('span', { class: 'acct__t', text: u.verified ? u.username : 'Verify account' }));
      chip.title = u.verified ? 'Signed in and verified' : 'Link your Roblox account to finish verifying';
    } else {
      chip.appendChild(el('i', { class: 'acct__dot' }));
      chip.appendChild(el('span', { class: 'acct__t', text: state.offline ? 'Account' : 'Sign in' }));
    }
  }

   
  function gateNotice(need) {
    var u = state.user;
    if (state.offline) return el('div', { class: 'gate' }, [el('p', { text: 'Accounts are not available right now. Please try again later.' })]);
    if (!u) return el('div', { class: 'gate' }, [el('p', { text: need === 'verified' ? 'Sign in with Discord and link your Roblox account to use this. It keeps the community safe.' : 'Sign in with Discord to use this form.' }), el('a', { class: 'btn btn--primary btn--sm', href: signInUrl() }, [el('span', { text: 'Sign in with Discord' })])]);
    if (need === 'verified' && !u.verified) return el('div', { class: 'gate' }, [el('p', { text: 'You are signed in. Link your Roblox account to get verified and unlock this.' }), el('a', { class: 'btn btn--primary btn--sm', href: '/account' }, [el('span', { text: 'Verify now' })])]);
    return null;
  }
  function applyGates() {
    $$('form[data-api]').forEach(function (f) {
      var need = f.getAttribute('data-need'); if (!need) return;
      var slot = f.parentNode.querySelector('.gate-slot'); if (slot) clear(slot);
      var g = gateNotice(need), locked = !!g;
      if (slot && g) slot.appendChild(g);
      $$('input,select,textarea,button', f).forEach(function (c) { if (c.name !== 'website') c.disabled = locked; });
    });
  }

   
  function bindForms() {
    $$('form[data-api]').forEach(function (f) {
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var out = $('.form-status', f), btn = $('button[type=submit]', f), data = {};
        new FormData(f).forEach(function (v, k) { data[k] = v; });
        if (out) { out.hidden = true; out.className = 'form-status'; }
        if (btn) btn.disabled = true;
        api(f.getAttribute('data-api'), data).then(function (j) {
          f.reset();
          if (out) { out.className = 'form-status msg-ok'; out.textContent = (f.getAttribute('data-ok') || 'Sent. Thank you!') + (j.ref ? ' Your reference is ' + j.ref + '.' : ''); out.hidden = false; }
          if (f.getAttribute('data-after') === 'reports') renderMyReports();
        }).catch(function (err) {
          if (out) { out.className = 'form-status msg-err'; out.textContent = err.message; out.hidden = false; }
        }).then(function () { if (btn) btn.disabled = false; });
      });
    });
  }

   
  function countTo(node, target) {
    if (reduce) { node.textContent = target; return; }
    var start = null;
    (function step(ts) {
      if (start === null) start = ts;
      var p = Math.min(1, (ts - start) / 900);
      node.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    })(performance.now());
  }
  function renderSummary() {
    var nodes = $$('[data-stat]'); if (!nodes.length) return;
    api('summary').then(function (j) { nodes.forEach(function (n) { countTo(n, Number(j[n.getAttribute('data-stat')]) || 0); }); })
      .catch(function () { nodes.forEach(function (n) { n.textContent = '-'; }); });
  }
   
  function roleTags(m) {
    var tags = (m.tags || []).slice(0, 4);
    if (!tags.length) return el('p', { class: 'ttl', text: (m.titles.length ? m.titles : m.departments).join(' · ') });
    var wrap = el('div', { class: 'person__tags' });
    tags.forEach(function (t) { wrap.appendChild(el('span', { class: 'person__tag' }, [el('i', { style: t.color ? 'background:' + t.color : '' }), t.name])); });
    if ((m.tags || []).length > 4) wrap.appendChild(el('span', { class: 'person__tag person__tag--more', text: '+' + (m.tags.length - 4) }));
    return wrap;
  }
  function person(m) {
    return el('article', { class: 'person' }, [
      el('img', { src: m.avatar, alt: '', width: '64', height: '64', loading: 'lazy' }),
      el('div', { class: 'person__body' }, [el('h3', { text: m.name }), roleTags(m), el('small', { text: 'Discord ID ' + m.discord_id })])
    ]);
  }
  var ROLE_PREVIEW = 10;
   
  function showRole(g, from) {
    var modal = $('#modal'), body = $('#modalBody'), title = $('#modalTitle');
    if (!modal || !body || !title) return;
    title.textContent = g.role.name + ' · ' + g.people.length + (g.people.length === 1 ? ' member' : ' members');
    clear(body);
    var list = el('ul', { class: 'role-list' });
    g.people.forEach(function (m) {
      list.appendChild(el('li', {}, [
        el('img', { src: m.avatar, alt: '', width: '36', height: '36', loading: 'lazy' }),
        el('div', {}, [el('b', { text: m.name }), roleTags(m)])
      ]));
    });
    body.appendChild(list);
    modal.hidden = false; doc.body.classList.add('is-locked');
    var close = $('.modal__close', modal); if (close) close.focus();
    var done = function () { if (modal.hidden) { from.focus(); obs.disconnect(); } };
    var obs = new MutationObserver(done); obs.observe(modal, { attributes: true, attributeFilter: ['hidden'] });
  }
  function renderTeam() {
    var img = $('#founder-img'), root = $('#roster-root');
    if (!img && !root) return;
    api('team').then(function (j) {
      var founder = j.members.filter(function (m) { return m.founder; })[0];
      if (img && founder) img.src = founder.avatar;
      if (!root) return;
      clear(root);
      var others = j.members.filter(function (m) { return !m.founder; });
      if (!others.length) { root.appendChild(el('p', { class: 'empty', text: 'The roster fills in automatically as roles are assigned in the Discord server' })); return; }
       
      var groups = (j.roles || []).map(function (r) { return { role: r, people: others.filter(function (m) { return m.role_id === r.id; }) }; });
      var known = (j.roles || []).map(function (r) { return r.id; });
      var rest = others.filter(function (m) { return known.indexOf(m.role_id) < 0; });
      if (rest.length) groups.push({ role: { name: 'Team', color: null }, people: rest });
      groups.forEach(function (g) {
        if (!g.people.length) return;
        var head = el('div', { class: 'role-head' }, [
          el('span', { class: 'role-dot', style: g.role.color ? 'background:' + g.role.color : '' }),
          el('span', { class: 'role-name', text: g.role.name }),
          el('span', { class: 'role-count', text: String(g.people.length) })
        ]);
        root.appendChild(head);
        var grid = el('div', { class: 'roster' });
        g.people.slice(0, ROLE_PREVIEW).forEach(function (m) { grid.appendChild(person(m)); });
        root.appendChild(grid);
        if (g.people.length > ROLE_PREVIEW) {
          var more = el('button', { class: 'btn btn--ghost role-more', type: 'button' }, [el('span', { text: 'Show all (' + g.people.length + ')' })]);
          more.addEventListener('click', function () { showRole(g, more); });
          root.appendChild(el('div', { class: 'role-more-row' }, [more]));
        }
      });
    }).catch(function () { if (root) { clear(root); root.appendChild(el('p', { class: 'empty', text: 'Could not load the team right now' })); } });
  }

   
  function renderGames() {
    var boxes = $$('[data-game]'), grp = $('#group-stats');
    if (!boxes.length && !grp) return;
    api('games').then(function (j) {
      boxes.forEach(function (box) {
        var g = j.games.filter(function (x) { return x.slug === box.getAttribute('data-game'); })[0]; if (!g) return;
        var st = $('[data-field=status]', box);
        if (st) { st.textContent = GSTATUS[g.status] || g.status; st.className = 'tag' + (g.status === 'in_development' || g.status === 'live' ? ' tag--live' : ''); }
        var rel = $('[data-field=release]', box);
        if (rel) { rel.textContent = g.release_text ? 'Est. release: ' + g.release_text : ''; rel.hidden = !g.release_text; }
        var play = $('[data-field=play]', box);
        if (play) { if (g.play_url && /^https:\/\//.test(g.play_url)) { play.href = g.play_url; play.hidden = false; } else play.hidden = true; }
        var stats = $('[data-field=stats]', box);
        if (stats) {
          clear(stats);
          if (g.stats_at && Number(g.stats_hidden)) {
            stats.appendChild(el('p', { class: 'stamp', text: 'Live stats appear here once the game is public on Roblox.' }));
          } else if (g.stats_at) {
            var votes = Number(g.likes) + Number(g.dislikes);
            var items = [['Playing now', num(g.playing)], ['Visits', num(g.visits)], ['Favorites', num(g.favorites)]];
            if (votes > 0) items.push(['Rating', Math.round(Number(g.likes) / votes * 100) + '%']);
            var line = el('div', { class: 'statline' });
            items.forEach(function (i) { line.appendChild(el('div', {}, [el('b', { text: i[1] }), el('span', { text: i[0] })])); });
            stats.appendChild(line); stats.appendChild(el('p', { class: 'stamp', text: 'Live from Roblox · updated ' + ago(g.stats_at) }));
          }
        }
      });
      if (grp) {
        clear(grp);
        if (j.group && j.group.members !== null && j.group.members !== undefined) {
          grp.appendChild(el('div', { class: 'statline' }, [el('div', {}, [el('b', { text: num(j.group.members) }), el('span', { text: 'Group members' })])]));
          grp.appendChild(el('p', { class: 'stamp', text: (j.group.name || 'Roblox group') + ' · updated ' + ago(j.group.updated_at) }));
        } else grp.appendChild(el('p', { class: 'empty', text: 'Group numbers appear once the Axio Roblox Group Bot is connected' }));
      }
    }).catch(function () {});
  }

   
  function renderLogs() {
    var list = $('#log-list'); if (!list) return;
    var q = $('#log-search'), cat = $('#log-cat'), cnt = $('#log-count'), none = $('#log-empty'), rows = [];
    api('reports/public').then(function (j) { rows = j.reports || []; draw(); }).catch(function () { cnt.textContent = 'Could not load the log right now.'; });
    function draw() {
      clear(list);
      var term = (q.value || '').toLowerCase().trim(), shown = 0;
      rows.forEach(function (r) {
        var hay = (r.roblox_username + ' ' + r.roblox_id + ' ' + (r.public_summary || '')).toLowerCase();
        if ((term && hay.indexOf(term) < 0) || (cat.value && r.type !== cat.value)) return;
        shown++;
        list.appendChild(el('article', { class: 'log' }, [
          el('div', { class: 'log__top' }, [el('span', { class: 'log__id', text: r.ref }), el('span', { class: 'log__handle', text: r.roblox_username }), badge('Confirmed scammer', 'bad'), el('span', { class: 'tag', text: TYPES[r.type] || 'Other' })]),
          el('div', { class: 'log__ids' }, [el('span', { text: 'Roblox user ID: ' + r.roblox_id }), link('https://www.roblox.com/users/' + encodeURIComponent(r.roblox_id) + '/profile', 'View Roblox profile')]),
          el('p', { text: r.public_summary || '' }),
          el('div', { class: 'log__meta' }, [el('span', { text: 'Logged: ' + fmtDate(r.published_at) }), el('span', { text: 'Confirmed by staff' })])
        ]));
      });
      cnt.textContent = shown + ' of ' + rows.length + ' confirmed entries';
      if (!rows.length) { none.hidden = false; none.textContent = 'No confirmed scammers logged yet'; }
      else if (!shown) { none.hidden = false; none.textContent = 'No entries match your search'; }
      else none.hidden = true;
      list.appendChild(none);
    }
    [q, cat].forEach(function (n) { n.addEventListener('input', draw); });
  }
  function renderMyReports() {
    var box = $('#my-reports'); if (!box) return;
    clear(box);
    var g = gateNotice('verified');
    if (g) { box.appendChild(g); return; }
    api('my').then(function (j) {
      if (!j.reports.length) { box.appendChild(el('p', { class: 'empty', text: 'You have not submitted any reports yet' })); return; }
      var l = el('div', { class: 'lst' });
      j.reports.forEach(function (r) {
        var label = r.status === 'verified' ? (r.published ? 'confirmed and published' : 'confirmed') : r.status === 'rejected' ? 'not confirmed' : 'under review';
        l.appendChild(el('div', { class: 'lst__item' }, [el('span', { text: r.ref + ' · ' + r.scammer_name }), el('span', {}, [statusBadge(r.status), el('small', { text: ' ' + label })])]));
      });
      box.appendChild(l);
    }).catch(function () {});
  }

   
   
  var JOBS = [];
  function renderQuestions() {
    var sel = $('#job-select'), wrap = $('#apply-questions'); if (!sel || !wrap) return;
    clear(wrap);
    var job = JOBS.filter(function (x) { return String(x.id) === sel.value; })[0];
    if (!job) { wrap.appendChild(el('p', { class: 'form-note', text: 'Choose a position to see its questions.' })); return; }
    var qs = job.questions && job.questions.length ? job.questions : null;
    if (!qs) wrap.appendChild(el('label', {}, ['About you', el('textarea', { name: 'message', maxlength: '4000', required: 'required', placeholder: 'Tell us about yourself and why you fit this role (at least 20 characters)' })]));
    else qs.forEach(function (q, i) {
      var ctl = q.type === 'long' ? el('textarea', { name: 'a_' + i, maxlength: '2000', rows: '4' }) : el('input', { name: 'a_' + i, type: 'text', maxlength: '300' });
      if (q.required) ctl.setAttribute('required', 'required');
      wrap.appendChild(el('label', {}, [q.q + (q.required ? '' : ' (optional)'), ctl]));
    });
    applyGates();
  }
  function renderApplyAs() {
    var box = $('#apply-as'); if (!box) return;
    clear(box);
    var u = state.user; box.hidden = !u; if (!u) return;
    box.appendChild(el('img', { src: u.avatar || '/assets/brand/avatar.png', alt: '', width: '40', height: '40' }));
    box.appendChild(el('div', {}, [el('small', { text: 'Applying as' }), el('b', { text: u.username }), el('small', { text: 'Discord ID ' + (u.discord_id || '') })]));
  }
  function renderJobs() {
    var box = $('#jobs-list'); if (!box) return;
    var sel = $('#job-select'), card = $('#apply-card');
    if (sel) sel.addEventListener('change', renderQuestions);
    var af = $('#apply-form'); if (af) af.addEventListener('reset', function () { setTimeout(renderQuestions, 0); });
    api('jobs').then(function (j) {
      JOBS = j.jobs || [];
      clear(box);
      if (!j.jobs.length) {
        box.appendChild(el('div', { class: 'empty', text: 'No open positions right now. New roles appear here when management posts them' }));
        if (card) card.hidden = true; return;
      }
      if (card) card.hidden = false;
      j.jobs.forEach(function (job) {
        box.appendChild(el('article', { class: 'job' }, [
          el('div', { class: 'log__top' }, [el('h3', { text: job.title }), el('span', { class: 'tag', text: job.area })]),
          el('p', { text: job.description }),
          job.questions && job.questions.length ? el('p', { class: 'form-note', text: job.questions.length + (job.questions.length === 1 ? ' question' : ' questions') + ' to answer' }) : null,
          el('div', {}, [el('a', { class: 'btn btn--ghost btn--sm', href: '#apply', 'data-job': job.id }, [el('span', { text: 'Apply for this role' })])])
        ]));
        if (sel) sel.appendChild(el('option', { value: String(job.id), text: job.title }));
      });
      $$('a[data-job]', box).forEach(function (a) { a.addEventListener('click', function () { if (sel) { sel.value = a.getAttribute('data-job'); renderQuestions(); } }); });
      renderQuestions();
    }).catch(function () { clear(box); box.appendChild(el('div', { class: 'empty', text: 'Could not load jobs right now' })); });
  }

   
  function renderListings() {
    var box = $('#listings-list'); if (!box) return;
    var q = $('#mk-search'), cat = $('#mk-cat'), cnt = $('#mk-count'), rows = [];
    api('listings').then(function (j) {
      var n = $('#approver-note'); if (n) n.hidden = j.approvers > 0;
      rows = j.listings || [];
      draw();
    }).catch(function () { clear(box); box.appendChild(el('div', { class: 'empty', text: 'Could not load posts right now' })); });
     
    function draw() {
      clear(box);
      var term = q ? (q.value || '').toLowerCase().trim() : '', type = cat ? cat.value : '', shown = 0;
      rows.forEach(function (l) {
        var hay = (l.title + ' ' + l.description + ' ' + (l.seller || '') + ' ' + (l.seller_roblox || '') + ' ' + l.price_text).toLowerCase();
        if ((term && hay.indexOf(term) < 0) || (type && l.category !== type)) return;
        shown++;
        var hiring = l.category === 'hiring';
        box.appendChild(el('article', { class: 'listing' }, [
          el('div', { class: 'log__top' }, [el('h3', { text: l.title }), el('span', { class: 'tag', text: CATS[l.category] || 'Service' }), el('span', { class: 'tag', text: (hiring ? 'Pay: ' : '') + l.price_text })]),
          el('p', { text: l.description }),
          el('div', { class: 'log__meta' }, [el('span', { text: (hiring ? 'Posted by ' : 'By ') + (l.seller || 'member') + (l.seller_roblox ? ' (Roblox: ' + l.seller_roblox + ')' : '') }), el('span', { text: 'Approved by staff' }),
            el('span', { text: l.reposted_at ? 'Reposted: ' + fmtDate(l.reposted_at) : 'Posted: ' + fmtDate(l.created_at) })]),
          /^\d{15,25}$/.test(l.seller_discord || '') ? el('div', { class: 'listing__actions' }, [
            el('a', { class: 'btn btn--ghost btn--sm', href: 'https://discord.com/users/' + l.seller_discord, target: '_blank', rel: 'noopener' }, [el('span', { text: 'Message on Discord' })]),
            l.seller_roblox ? el('a', { class: 'btn btn--ghost btn--sm', href: 'https://www.roblox.com/search/users?keyword=' + encodeURIComponent(l.seller_roblox), target: '_blank', rel: 'noopener' }, [el('span', { text: 'Roblox profile' })]) : null
          ]) : null
        ]));
      });
      if (cnt) cnt.textContent = rows.length ? shown + ' of ' + rows.length + ' post' + (rows.length === 1 ? '' : 's') : '';
      if (!rows.length) box.appendChild(el('div', { class: 'empty', text: 'No approved posts yet. Offer a service below, or use /post in our Discord.' }));
      else if (!shown) box.appendChild(el('div', { class: 'empty', text: 'No posts match your search' }));
    }
    [q, cat].forEach(function (n) { if (n) n.addEventListener('input', draw); });
  }

   
  function renderAccount() {
    var root = $('#account-root'); if (!root) return;
    clear(root);
    var err = new URLSearchParams(location.search).get('error');
    var errText = { discord: 'Discord sign-in did not complete. Please try again.', state: 'That sign-in link expired. Please try again.', 'not-configured': 'Discord sign-in is not set up yet. Please check back soon.' }[err];
    if (errText) root.appendChild(el('div', { class: 'gate' }, [el('p', { class: 'msg-err', text: errText })]));
    var rbx = new URLSearchParams(location.search).get('roblox');
    var rbxText = { linked: 'Your Roblox account is linked!', taken: 'That Roblox account is already linked to another Discord account.', cancelled: 'Roblox sign-in was cancelled.', off: 'Sign in with Roblox is not set up yet. Use the words instead.', error: 'Roblox sign-in did not finish. Try again, or use the words.' }[rbx];
    if (rbxText) root.appendChild(el('div', { class: 'gate' }, [el('p', { class: rbx === 'linked' ? 'msg-ok' : 'msg-err', text: rbxText })]));
    if (state.offline) { root.appendChild(el('div', { class: 'gate' }, [el('p', { text: 'Accounts are not available right now. Please try again later.' })])); return; }
    var u = state.user, steps = el('div', { class: 'steps' });
    function msgLine(parent) { var p = el('p', { class: 'msg-err', hidden: 'hidden' }); parent.appendChild(p); return function (t, ok) { p.hidden = !t; p.className = ok ? 'msg-ok' : 'msg-err'; p.textContent = t || ''; }; }

    var s1 = el('div', { class: 'step' });
    s1.appendChild(el('div', { class: 'step__head' }, [el('span', { class: 'step__n', text: 'STEP 01' }), el('h3', { text: 'Connect Discord' }), u ? badge('Connected', 'ok') : badge('Not connected', 'warn')]));
    if (u) {
      s1.appendChild(el('div', { class: 'me-line' }, [u.avatar ? el('img', { src: u.avatar, alt: '' }) : null, el('strong', { text: u.username })]));
      var out = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, [el('span', { text: 'Sign out' })]);
      out.addEventListener('click', function () { api('auth/logout', {}).then(function () { location.href = '/account'; }); });
      s1.appendChild(el('div', {}, [out]));
    } else {
      s1.appendChild(el('p', { text: 'Sign in with Discord so staff and our bots recognise you. We only receive your public Discord name, ID and avatar.' }));
      s1.appendChild(el('div', {}, [el('a', { class: 'btn btn--primary', href: '/api/auth/discord?next=/account' }, [el('span', { text: 'Sign in with Discord' })])]));
    }
    steps.appendChild(s1);

    var s2 = el('div', { class: 'step' });
    s2.appendChild(el('div', { class: 'step__head' }, [el('span', { class: 'step__n', text: 'STEP 02' }), el('h3', { text: 'Link your Roblox account' }), u && u.verified ? badge('Linked', 'ok') : badge(u ? 'Needs linking' : 'Locked', 'warn')]));
    var robloxStep = s2;
    if (u && !u.verified && u.roblox_oauth) {
      s2.appendChild(el('p', { text: 'Sign in on Roblox to confirm the account is yours, then return here to finish linking.' }));
      s2.appendChild(el('a', { class: 'btn btn--primary', href: '/api/roblox/oauth/start' }, [el('span', { text: 'Sign in with Roblox' })]));
      s2.appendChild(el('p', { class: 'muted', text: 'Roblox sign-in is available for ages 13 and up. You can also verify through your profile below.' }));
      var alternative = el('details', {}, [el('summary', { text: 'Use profile verification instead' })]);
      s2.appendChild(alternative); s2 = alternative;
    }
    if (!u) s2.appendChild(el('p', { text: 'Connect Discord first.' }));
    else if (u.verified) {
      s2.appendChild(el('p', { text: 'Linked to ' + u.roblox.username + ' (ID ' + u.roblox.id + ').' }));
      s2.appendChild(el('div', {}, [link('https://www.roblox.com/users/' + encodeURIComponent(u.roblox.id) + '/profile', 'View Roblox profile', 'btn btn--ghost btn--sm')]));
    } else if (u.roblox_pending) {
      var pend = u.roblox_pending;
      s2.appendChild(el('p', { text: 'Add these words anywhere in the "About" description of the Roblox account ' + pend.username + ', save it, then press Verify. You can remove them afterwards. If Roblox will not save them, use a different username to get new words' + (u.roblox_oauth ? ', or Sign in with Roblox.' : '.') }));
      s2.appendChild(el('div', { class: 'codebox', text: pend.code }));
      var st = el('div', { class: 'me-line' });
      var vb = el('button', { class: 'btn btn--primary', type: 'button' }, [el('span', { text: 'Verify' })]);
      var rb = el('button', { class: 'btn btn--ghost btn--sm', type: 'button' }, [el('span', { text: 'Use a different username' })]);
      st.appendChild(vb); st.appendChild(rb); if (u.roblox_oauth) st.appendChild(el('a', { class: 'btn btn--ghost btn--sm', href: '/api/roblox/oauth/start' }, [el('span', { text: 'Sign in with Roblox' })])); s2.appendChild(st);
      var show = msgLine(s2);
      vb.addEventListener('click', function () { show(''); vb.disabled = true; api('roblox/verify', {}).then(function () { return loadMe(); }).then(renderAll).catch(function (x) { show(x.message); }).then(function () { vb.disabled = false; }); });
      rb.addEventListener('click', function () { state.user.roblox_pending = null; renderAccount(); });
    } else {
      s2.appendChild(el('p', { text: 'Enter your Roblox username to get a few words to add to your public profile description.' }));
      var f = el('form', { novalidate: 'novalidate' }, [el('label', { text: 'Roblox username' }, [el('input', { type: 'text', name: 'username', maxlength: '20', placeholder: 'YourRobloxName', autocomplete: 'off', required: 'required' })]), el('button', { class: 'btn btn--primary', type: 'submit' }, [el('span', { text: 'Get my words' })])]);
      var show2 = msgLine(f);
      f.addEventListener('submit', function (e) { e.preventDefault(); show2(''); api('roblox/start', { username: f.username.value }).then(function () { return loadMe(); }).then(renderAll).catch(function (x) { show2(x.message); }); });
      s2.appendChild(f);
    }
    steps.appendChild(robloxStep);

    var s3 = el('div', { class: 'step' });
    s3.appendChild(el('div', { class: 'step__head' }, [el('span', { class: 'step__n', text: 'STEP 03' }), el('h3', { text: 'Verify in the Discord server' })]));
    s3.appendChild(el('p', { text: 'Once Discord and Roblox are both linked, run /verify in the server. The Axio Community Bot gives you the Verified role. You can also run /reportstatus there to check your scam reports.' }));
    steps.appendChild(s3);
    root.appendChild(steps);

    if (u && u.staff) root.appendChild(el('div', { class: 'gate', style: 'margin-top:1.2rem' }, [el('p', { text: 'You have staff access (' + u.staff + ').' }), el('a', { class: 'btn btn--ghost btn--sm', href: '/staff' }, [el('span', { text: 'Open staff panel' })])]));

    if (u) {
      var sub = el('div');
      root.appendChild(el('p', { class: 'section__index', text: '// My submissions', style: 'margin-top:2.6rem' }));
      root.appendChild(sub);
      api('my').then(function (j) {
        var any = false;
        function group(title, items, line) {
          if (!items.length) return; any = true;
          sub.appendChild(el('p', { class: 'count', text: title, style: 'margin-top:1.4rem' }));
          var l = el('div', { class: 'lst' }); items.forEach(function (i) { l.appendChild(line(i)); }); sub.appendChild(l);
        }
        group('Scam reports', j.reports, function (r) { return el('div', { class: 'lst__item' }, [el('span', { text: r.ref + ' · ' + r.scammer_name }), el('span', {}, [statusBadge(r.status), r.published ? badge('published', 'ok') : null])]); });
        group('Job applications', j.applications, function (a) {
          var label = { new: 'submitted', reviewing: 'being reviewed', accepted: 'accepted', rejected: 'not accepted' }[a.status] || a.status;
          var kind = a.status === 'accepted' ? 'ok' : a.status === 'rejected' ? 'bad' : 'warn';
          var row = el('div', { class: 'lst__item lst__item--app' }, [el('span', { text: (a.job || a.area) + ' · applied ' + fmtDate(a.created_at) }), badge(label, kind)]);
          if (a.note) row.appendChild(el('p', { class: 'lst__note', text: 'Message from staff: ' + a.note }));
          return row;
        });
        group('Marketplace posts', j.listings, function (l) { return el('div', { class: 'lst__item' }, [el('span', { text: l.title }), statusBadge(l.status)]); });
        if (!any) sub.appendChild(el('p', { class: 'empty', text: 'Nothing submitted yet' }));
      }).catch(function () {});
    }
  }

   
  function renderGiveaways() {
    var act = $('#gw-active'), end = $('#gw-ended'); if (!act || !end) return;
    var items = [], kind = 'all', skew = 0;
    function t(s) { return s ? Date.parse(String(s).replace(' ', 'T') + 'Z') : NaN; }
    function left(ms) {
      if (ms <= 0) return 'Drawing...';
      var s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
      return d ? d + 'd ' + h + 'h ' + m + 'm' : h ? h + 'h ' + m + 'm ' + (s % 60) + 's' : m + 'm ' + (s % 60) + 's';
    }
    function local(s) { var v = t(s); return isNaN(v) ? '' : new Date(v).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
    function stat(label, value, attrs) {
      var dd = el('dd', attrs || {}); if (value) dd.textContent = value;
      return el('div', {}, [el('dt', { text: label }), dd]);
    }
    function card(g) {
      var ended = g.status !== 'active', isEvent = g.kind === 'event', now = Date.now() + skew;
      var upcoming = !ended && !isNaN(t(g.starts_at)) && t(g.starts_at) > now;
      var state = ended ? badge('Ended') : upcoming ? badge('Upcoming', 'warn') : badge('Live', 'ok');
      var stats = el('dl', { class: 'gw__stats' });
      if (ended) stats.appendChild(stat('Ended', ago(g.ended_at), { title: local(g.ended_at) }));
      else if (upcoming) stats.appendChild(stat('Starts in', '', { 'data-until': String(t(g.starts_at)), title: local(g.starts_at) }));
      else if (g.ends_at) stats.appendChild(stat('Ends in', '', { 'data-until': String(t(g.ends_at)), title: local(g.ends_at) }));
      else stats.appendChild(stat('Ends', 'When staff close it'));
      if (g.winners_count) stats.appendChild(stat(g.winners_count === 1 ? 'Winner' : 'Winners', String(g.winners_count)));
      stats.appendChild(stat(isEvent ? 'Joined' : 'Entries', num(g.entries)));
      var kids = [
        el('div', { class: 'gw__top' }, [el('span', { class: 'tag', text: isEvent ? 'Event' : 'Giveaway' }), state]),
        el('h3', { class: 'gw__title', text: g.title })
      ];
      if (g.description) kids.push(el('p', { class: 'gw__desc', text: g.description }));
      kids.push(stats);
      if (ended && g.winners_count) {
        var w = el('div', { class: 'gw__winners' }, [el('small', { text: g.winners_count === 1 ? 'Winner' : 'Winners' })]);
        if (g.winners.length) g.winners.forEach(function (n) { w.appendChild(el('span', { class: 'gw__win', text: n || 'Member' })); });
        else w.appendChild(el('span', { class: 'gw__none', text: 'Nobody entered, so there was no winner' }));
        kids.push(w);
      }
      var meta = el('div', { class: 'gw__foot' }, [el('p', { class: 'gw__meta', text: (isEvent ? 'Event' : 'Giveaway') + ' #' + g.id + (g.host_name ? ' · Hosted by ' + g.host_name : '') })]);
      if (g.url) meta.appendChild(el('span', { class: 'gw__go', text: ended ? 'See results in Discord' : (isEvent ? 'Join in Discord' : 'Enter in Discord') }));
      kids.push(meta);
      var cls = 'gw' + (ended ? ' gw--ended' : '') + (isEvent ? ' gw--event' : '');
       
      if (g.url) return el('a', { class: cls + ' gw--link', href: g.url, target: '_blank', rel: 'noopener noreferrer', 'aria-label': (isEvent ? 'Event: ' : 'Giveaway: ') + g.title + ', open in Discord' }, kids);
      return el('article', { class: cls }, kids);
    }
    function fill(box, rows, none) {
      clear(box);
      if (!rows.length) { box.appendChild(el('div', { class: 'empty', text: none })); return; }
      rows.forEach(function (g) { box.appendChild(card(g)); });
    }
    function draw() {
      var shown = items.filter(function (g) { return kind === 'all' || g.kind === kind; });
      var what = kind === 'event' ? 'events' : kind === 'giveaway' ? 'giveaways' : 'giveaways or events';
      fill(act, shown.filter(function (g) { return g.status === 'active'; }), 'No ' + what + ' are running right now. Check back soon');
      fill(end, shown.filter(function (g) { return g.status !== 'active'; }), 'No ' + what + ' ended in the last 7 days');
      tick();
    }
    function tick() {
      $$('[data-until]').forEach(function (n) { n.textContent = left(Number(n.getAttribute('data-until')) - (Date.now() + skew)); });
    }
    function load() {
      return api('giveaways').then(function (j) {
        var s = t(j.now); if (!isNaN(s)) skew = s - Date.now();
        items = j.items || []; draw();
      });
    }
    $$('.gw-chip').forEach(function (b) {
      b.addEventListener('click', function () {
        kind = b.getAttribute('data-kind');
        $$('.gw-chip').forEach(function (x) { var on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
        draw();
      });
    });
    load().catch(function () { [act, end].forEach(function (b) { clear(b); b.appendChild(el('div', { class: 'empty', text: 'Could not load giveaways right now' })); }); });
    setInterval(tick, 1000);
    setInterval(function () { if (!doc.hidden) load().catch(function () {}); }, 60000);
  }

   
  function loadMe() {
    return api('me').then(function (j) { state.user = j.user; state.csrf = j.csrf; state.offline = false; }).catch(function () { state.offline = true; });
  }
   
  function renderMyTicket() {
    var box = $('#my-ticket'); if (!box) return;
    clear(box);
    if (!state.user) return;
    api('my').then(function (j) {
      var t = j.ticket; if (!t) return;
      var state2 = t.status === 'closed' ? 'Closed' : t.claimed_by ? t.claimed_by + ' is handling it' : 'Waiting: #' + t.position + ' in the queue (' + t.waiting + ' waiting)';
      var notes = el('div', { class: 'lst' });
      if (!t.notes.length) notes.appendChild(el('p', { class: 'empty', text: 'No updates from staff yet' }));
      t.notes.forEach(function (n) {
        notes.appendChild(el('div', { class: 'lst__item lst__item--note' }, [el('p', { text: n.text }), el('small', { text: (n.by || 'Staff') + ' · ' + fmtDate(n.at) + (n.edited ? ' (edited)' : '') })]));
      });
      box.appendChild(el('div', { class: 'step' }, [
        el('div', { class: 'step__head' }, [el('span', { class: 'step__n', text: 'TICKET' }), el('h3', { text: t.ref + (t.subject ? ' · ' + t.subject : '') }), badge(t.status === 'closed' ? 'Closed' : 'Open', t.status === 'closed' ? 'warn' : 'ok')]),
        el('p', { text: state2 + (t.status !== 'closed' ? '. A staff member will message you in your Discord DMs, so keep them open.' : '.') }),
        el('h4', { text: 'Updates from staff' }), notes
      ]));
    }).catch(function () {});
  }
  function renderAll() { renderChip(); applyGates(); renderAccount(); renderMyReports(); renderApplyAs(); renderMyTicket(); }
  bindForms();
   
  function subMsg(text, bad) {
    var m = $('#subs-msg'); if (!m) return;
    m.textContent = text; m.hidden = !text; m.classList.toggle('is-bad', !!bad);
  }
  function startSub(tier, btn) {
    if (!state.user) { location.href = signInUrl(); return; }
    btn.disabled = true; subMsg('Opening the secure checkout...');
    api('subscribe', { tier: tier }).then(function (j) { location.href = j.url; })
      .catch(function (e) { btn.disabled = false; subMsg(e.message, true); });
  }
  function manageSub(btn) {
    btn.disabled = true; subMsg('Opening your billing page...');
    api('subscribe/manage', {}).then(function (j) { location.href = j.url; })
      .catch(function (e) { btn.disabled = false; subMsg(e.message, true); });
  }
  function renderSubs() {
    var grid = $('#subs-grid'); if (!grid) return;
    api('subscriptions').then(function (j) {
      clear(grid);
      if (j.intro) { var intro = $('#subs-intro'); if (intro) intro.textContent = j.intro; }
      var sym = { USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$' }[j.currency] || '$';
      if (!j.tiers.length) { grid.appendChild(el('div', { class: 'empty', text: 'Subscriptions are coming soon.' })); return; }
      j.tiers.forEach(function (t) {
        var parts = String(t.price).split('.');
        var list = el('ul', { class: 'sub__perks' });
        (t.benefits.length ? t.benefits : ['Perks are being added. Check back soon.']).forEach(function (b) { list.appendChild(el('li', { text: b })); });
         
        var gift = !!(j.mine && j.mine.gift), paying = !!(j.mine && !gift);
        var mine = j.mine && j.mine.tier === t.key;
        var btn = mine && paying
          ? el('button', { class: 'btn btn--ghost sub__btn', type: 'button' }, [el('span', { text: 'Your plan · Manage' })])
          : t.stripe
          ? el('button', { class: 'btn btn--primary sub__btn', type: 'button' }, [el('span', { text: paying ? 'Switch (Manage)' : mine ? 'Subscribe to keep it' : 'Subscribe' })])
          : el('span', { class: 'btn btn--ghost sub__btn is-off', 'aria-disabled': 'true' }, [el('span', { text: 'Coming soon' })]);
         
        if ((mine && paying) || t.stripe) btn.addEventListener('click', (function (b, key) { return function () { if (paying) manageSub(b); else startSub(key, b); }; })(btn, t.key));
        grid.appendChild(el('article', { class: 'sub' + (t.popular ? ' sub--popular' : '') + (mine ? ' sub--mine' : ''), style: '--tier:' + t.color }, [
          mine ? el('span', { class: 'sub__badge', text: gift ? 'Free trial · ends ' + fmtDate(j.mine.period_end) : j.mine.status === 'trialing' ? 'Your free trial' : 'Your plan' }) : null,
          t.popular ? el('span', { class: 'sub__badge', text: 'You might like' }) : null,
          el('p', { class: 'sub__tier', text: t.key }),
          el('h2', { class: 'sub__name', text: t.name }),
          el('p', { class: 'sub__price' }, [el('span', { class: 'sub__cur', text: sym }), el('b', { text: parts[0] }), el('span', { class: 'sub__cents', text: '.' + (parts[1] || '00') }), el('small', { text: '/ month' })]),
          list, btn
        ]));
      });
    }).catch(function () { clear(grid); grid.appendChild(el('div', { class: 'empty', text: 'Could not load subscriptions right now' })); });
  }
  renderSummary(); renderTeam(); renderGames(); renderLogs(); renderJobs(); renderListings(); renderGiveaways(); renderSubs();
  loadMe().then(renderAll);
})();
