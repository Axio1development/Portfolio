 

(function () {
  var doc = document, bootEl = doc.getElementById('mb-boot'), root = doc.getElementById('mb'), form = doc.getElementById('mb-form');
  if (!bootEl || !root || !form) return;
  var boot = JSON.parse(bootEl.textContent);
  var KEY = 'axm-mb-draft';
  var LIM = { content: 2000, title: 256, description: 4096, fields: 25, fname: 256, fvalue: 1024, footer: 2048, author: 256, embeds: 10, total: 6000 };

  function el(tag, attrs, kids) {
    var n = doc.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === 'text') n.textContent = v;
      else if (k === 'class') n.className = v;
      else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c) n.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); });
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }

   
  function blankEmbed() { return { color: '#7c4dff', author: { name: '', url: '', icon_url: '' }, title: '', url: '', description: '', fields: [], image: '', thumbnail: '', footer: { text: '', icon_url: '' }, timestamp: false }; }
  function blank() { return { content: '', allow_pings: false, embeds: [blankEmbed()], buttons: [], reactions: [], reaction_unique: false, guild: '', channel: '' }; }
  var LIM_REACTIONS = 20;
   
  function blankButton() { var h = blankEmbed(); h.color = '#2b2d31'; return { label: 'Read more', emoji: '', style: 'secondary', kind: 'reveal', url: '', hidden: { content: '', embed: h } }; }
  var LIM_BUTTONS = 5;
  var S = blank();

  function hex(n) { return '#' + ('000000' + (Number(n) || 0).toString(16)).slice(-6); }
  function embedFromDiscord(e) {
    var b = blankEmbed();
    b.color = e.color !== undefined && e.color !== null ? hex(e.color) : '#7c4dff';
    b.author = { name: (e.author || {}).name || '', url: (e.author || {}).url || '', icon_url: (e.author || {}).icon_url || '' };
    b.title = e.title || ''; b.url = e.url || ''; b.description = e.description || '';
    b.fields = (e.fields || []).map(function (f) { return { name: f.name || '', value: f.value || '', inline: !!f.inline }; });
    b.image = (e.image || {}).url || ''; b.thumbnail = (e.thumbnail || {}).url || '';
    b.footer = { text: (e.footer || {}).text || '', icon_url: (e.footer || {}).icon_url || '' };
    b.timestamp = e.timestamp || false;
    return b;
  }
  function fromDiscord(m) {
    var out = { content: m.content || '', allow_pings: !!m.allow_pings, embeds: [], buttons: [] };
    (m.embeds || []).slice(0, LIM.embeds).forEach(function (e) { out.embeds.push(embedFromDiscord(e)); });
    (m.buttons || []).slice(0, LIM_BUTTONS).forEach(function (x) {
      var btn = blankButton();
      btn.label = x.label || ''; btn.emoji = x.emoji || ''; btn.style = x.style || 'secondary'; btn.kind = x.kind === 'link' ? 'link' : 'reveal'; btn.url = x.url || '';
      if (x.hidden) { btn.hidden.content = x.hidden.content || ''; if ((x.hidden.embeds || [])[0]) btn.hidden.embed = embedFromDiscord(x.hidden.embeds[0]); }
      out.buttons.push(btn);
    });
    out.reactions = (m.reactions || []).slice(0, 20).map(function (r) { return { emoji: r.emoji || '', role_id: r.role_id || '' }; });
    out.reaction_unique = !!m.reaction_unique;
    return out;
  }
  function embedToDiscord(b) {
    var e = {};
    if (b.title) e.title = b.title;
    if (b.url) e.url = b.url;
    if (b.description) e.description = b.description;
    if (b.color) e.color = parseInt(b.color.slice(1), 16);
    if (b.author.name) { e.author = { name: b.author.name }; if (b.author.url) e.author.url = b.author.url; if (b.author.icon_url) e.author.icon_url = b.author.icon_url; }
    if (b.fields.length) e.fields = b.fields.map(function (f) { return { name: f.name, value: f.value, inline: !!f.inline }; });
    if (b.image) e.image = { url: b.image };
    if (b.thumbnail) e.thumbnail = { url: b.thumbnail };
    if (b.footer.text) { e.footer = { text: b.footer.text }; if (b.footer.icon_url) e.footer.icon_url = b.footer.icon_url; }
    if (b.timestamp) e.timestamp = b.timestamp === true ? new Date().toISOString() : b.timestamp;
    return e;
  }
  function hasBody(e) { return Object.keys(e).length > (e.color !== undefined ? 1 : 0); }
   
  function toDiscord(forSend, withButtons) {
    var m = { content: S.content, embeds: S.embeds.map(embedToDiscord).filter(hasBody) };
    if (forSend) {
      m.allow_pings = S.allow_pings;
      var rr = (S.reactions || []).filter(function (r) { return r.emoji.trim() && r.role_id; });
      if (rr.length) { m.reactions = rr.map(function (r) { return { emoji: r.emoji.trim(), role_id: r.role_id }; }); m.reaction_unique = !!S.reaction_unique; }
    }
    if (forSend || withButtons) {
      m.buttons = (S.buttons || []).map(function (x) {
        var o = { label: x.label, emoji: x.emoji, style: x.style, kind: x.kind };
        if (x.kind === 'link') o.url = x.url;
        else { var he = embedToDiscord(x.hidden.embed); o.hidden = { content: x.hidden.content, embeds: hasBody(he) ? [he] : [] }; }
        return o;
      });
    }
    return m;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  if (boot.load && boot.load.message) { S = fromDiscord(boot.load.message); S.guild = boot.load.guild_id; S.channel = boot.load.channel_id; if (!S.embeds.length) S.embeds.push(blankEmbed()); }
  else { try { var d = JSON.parse(localStorage.getItem(KEY) || 'null'); if (d && d.embeds) S = d; } catch (e) {} }
  S.buttons = S.buttons || []; S.reactions = S.reactions || [];

   
  function b64urlDecode(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    var bin = atob(s), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }
  function b64urlEncode(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function parseImport(text) {
    text = (text || '').trim();
    if (!text) throw new Error('Paste a Discohook link or JSON first.');
    var data;
    if (/^https?:\/\//i.test(text)) {
      var u = new URL(text);
      if (u.searchParams.get('share')) throw new Error('Discohook "share" links are stored on Discohook\'s servers and cannot be read here. In Discohook, use Options > Copy link with data (or copy the JSON) instead.');
      var raw = u.searchParams.get('data');
      if (!raw) throw new Error('That link has no message data in it.');
      data = JSON.parse(b64urlDecode(raw));
    } else data = JSON.parse(text);
    var msg = data;
    if (data && Array.isArray(data.messages)) {
      if (!data.messages.length) throw new Error('That Discohook link is empty. Build the message there first, or start here.');
      msg = data.messages[0].data || data.messages[0];
    }
    if (!msg || (typeof msg.content !== 'string' && !Array.isArray(msg.embeds))) throw new Error('No message found. Expected Discohook data or {"content": ..., "embeds": [...]}.');
    return msg;
  }
  function discohookLink() {
    var m = toDiscord(false, false);
    return 'https://discohook.app/?data=' + b64urlEncode(JSON.stringify({ version: 'd2', messages: [{ data: { content: m.content || null, embeds: m.embeds.length ? m.embeds : null, attachments: [] } }] }));
  }

   
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function md(text, rich) {
    var blocks = [], s = esc(text || '');
    s = s.replace(/```(?:[a-z0-9]+\n)?([\s\S]*?)```/gi, function (_, code) { blocks.push('<pre class="dc-pre"><code>' + code.replace(/^\n|\n$/g, '') + '</code></pre>'); return '\u0000' + (blocks.length - 1) + '\u0000'; });
    s = s.replace(/`([^`\n]+)`/g, function (_, code) { blocks.push('<code class="dc-code">' + code + '</code>'); return '\u0000' + (blocks.length - 1) + '\u0000'; });
    s = s.replace(/^(#{1,3}) (.+)$/gm, function (_, h, t) { return '<span class="dc-h' + h.length + '">' + t + '</span>'; });
    s = s.replace(/^-# (.+)$/gm, '<span class="dc-sub">$1</span>');
    s = s.replace(/^&gt; (.*)$/gm, '<span class="dc-quote">$1</span>');
    s = s.replace(/^[-*] (.+)$/gm, '<span class="dc-li">$1</span>');
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<b><i>$1</i></b>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<u>$1</u>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>').replace(/(^|[^\w_])_([^_\n]+)_(?!\w)/g, '$1<i>$2</i>');
    s = s.replace(/~~([^~]+)~~/g, '<s>$1</s>').replace(/\|\|([^|]+)\|\|/g, '<span class="dc-spoiler">$1</span>');
    if (rich) s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>');
    s = s.replace(/&lt;@!?(\d+)&gt;/g, '<span class="dc-ping">@user</span>').replace(/&lt;@&amp;(\d+)&gt;/g, '<span class="dc-ping">@role</span>')
      .replace(/&lt;#(\d+)&gt;/g, '<span class="dc-ping">#channel</span>').replace(/@(everyone|here)\b/g, '<span class="dc-ping">@$1</span>');
    s = s.replace(/&lt;t:(\d+)(?::[tTdDfFR])?&gt;/g, function (_, t) { return '<span class="dc-time">' + new Date(Number(t) * 1000).toLocaleString() + '</span>'; });
    s = s.replace(/\n/g, '<br>');
    return s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return blocks[Number(i)]; });
  }
  function html(tag, cls, h) { var n = el(tag, { class: cls }); n.innerHTML = h; return n; }
  function safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : null; }

   
  var preview = el('div', { class: 'dc' });
  var openHidden = -1;
  var STYLE_CLASS = { primary: 'dc-btn--primary', secondary: 'dc-btn--secondary', success: 'dc-btn--success', danger: 'dc-btn--danger' };
  function embedPreview(b, time) {
    var main = el('div', { class: 'dc-embed-main' });
    if (b.author.name) {
      var a = el('div', { class: 'dc-author' });
      if (safeUrl(b.author.icon_url)) a.appendChild(el('img', { src: b.author.icon_url, alt: '' }));
      a.appendChild(safeUrl(b.author.url) ? el('a', { href: b.author.url, target: '_blank', rel: 'noopener', text: b.author.name }) : el('span', { text: b.author.name }));
      main.appendChild(a);
    }
    if (b.title) { var t = html('div', 'dc-title', md(b.title, false)); if (safeUrl(b.url)) t.classList.add('dc-title--link'); main.appendChild(t); }
    if (b.description) main.appendChild(html('div', 'dc-desc', md(b.description, true)));
    if (b.fields.length) {
      var grid = el('div', { class: 'dc-fields' });
      b.fields.forEach(function (f) {
        var cell = el('div', { class: 'dc-field', style: 'grid-column: span ' + (f.inline ? 4 : 12) });
        cell.appendChild(html('div', 'dc-fname', md(f.name || '\u200b', false)));
        cell.appendChild(html('div', 'dc-fvalue', md(f.value || '\u200b', true)));
        grid.appendChild(cell);
      });
      main.appendChild(grid);
    }
    if (safeUrl(b.image)) main.appendChild(el('img', { class: 'dc-image', src: b.image, alt: '' }));
    if (b.footer.text || b.timestamp) {
      var ft = el('div', { class: 'dc-footer' });
      if (safeUrl(b.footer.icon_url) && b.footer.text) ft.appendChild(el('img', { src: b.footer.icon_url, alt: '' }));
      var when = b.timestamp ? (b.timestamp === true ? 'Today at ' + time : new Date(b.timestamp).toLocaleString()) : '';
      ft.appendChild(el('span', { text: [b.footer.text, when].filter(Boolean).join(' • ') }));
      main.appendChild(ft);
    }
    var inner = el('div', { class: 'dc-embed-grid' }, [main]);
    if (safeUrl(b.thumbnail)) inner.appendChild(el('img', { class: 'dc-thumb', src: b.thumbnail, alt: '' }));
    return el('div', { class: 'dc-embed', style: 'border-left-color:' + (b.color || '#1e1f22') }, [inner]);
  }
  function msgHead(time) { return el('div', { class: 'dc-head' }, [el('b', { text: boot.bot.name }), el('span', { class: 'dc-app', text: 'APP' }), el('small', { text: 'Today at ' + time })]); }
  function renderPreview() {
    clear(preview);
    var now = new Date(), time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    var body = el('div', { class: 'dc-body' }, [msgHead(time)]);
    if (S.content) body.appendChild(html('div', 'dc-content', md(S.content, true)));
    S.embeds.forEach(function (b) { body.appendChild(embedPreview(b, time)); });
    if (S.buttons.length) {
      var row = el('div', { class: 'dc-buttons' });
      S.buttons.forEach(function (x, n) {
        var label = [x.emoji, x.label || 'Button'].filter(Boolean).join(' ');
        var btn = el('button', { type: 'button', class: 'dc-btn ' + (x.kind === 'link' ? 'dc-btn--secondary' : STYLE_CLASS[x.style] || 'dc-btn--secondary'), title: x.kind === 'link' ? (x.url || 'No link yet') : 'Click to preview the hidden message' }, [label + (x.kind === 'link' ? ' ↗' : '')]);
        btn.addEventListener('click', function () { if (x.kind === 'link') { if (safeUrl(x.url)) window.open(x.url, '_blank', 'noopener'); return; } openHidden = openHidden === n ? -1 : n; renderPreview(); });
        row.appendChild(btn);
      });
      body.appendChild(row);
    }
    var rx = (S.reactions || []).filter(function (r) { return r.emoji.trim(); });
    if (rx.length) {
      var rrow = el('div', { class: 'dc-reactions' });
      rx.forEach(function (r) {
        var custom = /^<a?:([A-Za-z0-9_~]+):(\d+)>$/.exec(r.emoji.trim());
        var face = custom ? el('img', { src: 'https://cdn.discordapp.com/emojis/' + custom[2] + '.webp?size=44', alt: ':' + custom[1] + ':', title: ':' + custom[1] + ':' }) : el('span', { text: r.emoji.trim() });
        rrow.appendChild(el('span', { class: 'dc-reaction', title: roleName(r.role_id) ? 'Gives ' + roleName(r.role_id) : 'Pick a role' }, [face, el('b', { text: '1' })]));
      });
      body.appendChild(rrow);
    }
    if (!S.content && !S.embeds.length) body.appendChild(el('p', { class: 'dc-empty', text: 'Nothing to preview yet.' }));
    preview.appendChild(el('div', { class: 'dc-msg' }, [el('img', { class: 'dc-avatar', src: boot.bot.avatar, alt: '' }), body]));
    var h = S.buttons[openHidden];
    if (h && h.kind === 'reveal') {
      var hb = el('div', { class: 'dc-body' }, [msgHead(time)]);
      if (h.hidden.content) hb.appendChild(html('div', 'dc-content', md(h.hidden.content, true)));
      if (hasBody(embedToDiscord(h.hidden.embed))) hb.appendChild(embedPreview(h.hidden.embed, time));
      if (!h.hidden.content && !hasBody(embedToDiscord(h.hidden.embed))) hb.appendChild(el('p', { class: 'dc-empty', text: 'This button has no hidden message yet.' }));
      hb.appendChild(el('div', { class: 'dc-ephemeral', text: '👁  Only you can see this  ·  Dismiss message' }));
      preview.appendChild(el('div', { class: 'dc-msg dc-msg--hidden' }, [el('img', { class: 'dc-avatar', src: boot.bot.avatar, alt: '' }), hb]));
    }
    renderCount();
  }

   
  var countEl = el('p', { class: 'mb-count' });
  function totalChars() {
    var n = 0;
    S.embeds.forEach(function (b) { n += b.title.length + b.description.length + b.author.name.length + b.footer.text.length; b.fields.forEach(function (f) { n += f.name.length + f.value.length; }); });
    return n;
  }
  function problems() {
    var p = [];
    if (S.content.length > LIM.content) p.push('Message text is over ' + LIM.content + ' characters.');
    if (totalChars() > LIM.total) p.push('Embeds have more than ' + LIM.total + ' characters in total.');
    S.embeds.forEach(function (b, i) {
      if (b.title.length > LIM.title) p.push('Embed ' + (i + 1) + ': title is over ' + LIM.title + ' characters.');
      if (b.description.length > LIM.description) p.push('Embed ' + (i + 1) + ': description is over ' + LIM.description + ' characters.');
      b.fields.forEach(function (f, j) { if (f.value.length > LIM.fvalue) p.push('Embed ' + (i + 1) + ', field ' + (j + 1) + ': value is over ' + LIM.fvalue + ' characters.'); });
      ['url', 'image', 'thumbnail'].forEach(function (k) { if (b[k] && !safeUrl(b[k])) p.push('Embed ' + (i + 1) + ': ' + k + ' must start with https://'); });
    });
    S.buttons.forEach(function (x, n) {
      var name = 'Button ' + (n + 1);
      if (!x.label.trim()) p.push(name + ' needs a label.');
      if (x.kind === 'link' && !safeUrl(x.url)) p.push(name + ': the link must start with https://');
      if (x.kind === 'reveal' && !x.hidden.content.trim() && !hasBody(embedToDiscord(x.hidden.embed))) p.push(name + ' has no hidden message yet.');
      if (x.hidden.content.length > LIM.content) p.push(name + ': hidden text is over ' + LIM.content + ' characters.');
    });
    if (isRulesPost()) {
      var first = S.embeds[0], last = S.embeds[S.embeds.length - 1], filled = function (b) { return !!(b && (b.title.trim() || b.description.trim())); };
      if (!first || first.part !== 'intro') p.push('Rules post: the beginning message must be the first embed.');
      else if (!filled(first)) p.push('Rules post: write the beginning message (a title or description) above the rules.');
      ruleProblems().forEach(function (x) { p.push(x); });
      if (!last || last.part !== 'outro') p.push('Rules post: the ending message must be the last embed.');
      else if (!filled(last)) p.push('Rules post: write the ending message (a title or description) after the rules.');
    }
    var used = {};
    (S.reactions || []).forEach(function (r, n) {
      var name = 'Reaction role ' + (n + 1), e = r.emoji.trim();
      if (!e && !r.role_id) return;
      if (!e) p.push(name + ' needs an emoji.');
      else if (!/^<a?:[A-Za-z0-9_~]{2,32}:\d{15,25}>$/.test(e) && (e.length > 16 || /[A-Za-z<>:]/.test(e))) p.push(name + ': use one emoji, or a server emoji like <:name:123456789012345678>.');
      if (!r.role_id) p.push(name + ' needs a role.');
      else if (S.guild && !(boot.roles[S.guild] || []).some(function (x) { return x.id === r.role_id; })) p.push(name + ': that role is not in this server. Pick it again.');
      var k = e.replace(/\uFE0F/g, '');
      if (k && used[k]) p.push(name + ': that emoji is already used.');
      used[k] = true;
    });
    var m = toDiscord(false);
    if (!m.content && !m.embeds.length) p.push('The message is empty.');
    return p;
  }
  function isRulesPost() { return S.embeds.some(function (b) { return !!b.part; }); }
  function renderCount() {
    var t = totalChars(), bad = problems();
    countEl.textContent = 'Text ' + S.content.length + '/' + LIM.content + '  ·  Embeds ' + S.embeds.length + '/' + LIM.embeds + '  ·  Embed characters ' + t + '/' + LIM.total + (bad.length ? '  ·  ' + bad[0] : '');
    countEl.classList.toggle('mb-count--bad', bad.length > 0 && !(bad.length === 1 && bad[0] === 'The message is empty.'));
  }
  function changed() { save(); renderPreview(); }

   
  function input(label, value, onset, opts) {
    opts = opts || {};
    var ctl = opts.area ? el('textarea', { rows: opts.rows || 3, maxlength: opts.max, placeholder: opts.ph || '' }) : el('input', { type: opts.type || 'text', maxlength: opts.max, placeholder: opts.ph || '' });
    ctl.value = value || '';
    ctl.addEventListener('input', function () { onset(ctl.value); changed(); });
    return el('label', { class: 'mb-label' + (opts.wide ? ' mb-label--wide' : '') }, [label, ctl]);
  }
  var editor = el('div', { class: 'mb-editor' });
   
  var PART_PH = {
    intro: { title: 'Required: e.g. Welcome to Axiomate Games', description: 'Required: the beginning message, shown above the rules. e.g. Please read and follow these rules. Breaking them leads to the punishments listed under each rule.' },
    outro: { title: 'e.g. Thanks for reading', description: 'Required: the ending message, shown after the rules. e.g. By staying in this server you agree to these rules. Questions? Open a ticket with /ticket.' }
  };
   
  var drag = null;
  function dragHandle(list, i, done, group) {
    var h = el('span', { class: 'mb-drag', title: 'Drag to move', 'aria-hidden': 'true', text: '\u283f' });
    h.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); });
    h.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      var box = h.closest('[data-dnd]'); if (!box) return;
      e.preventDefault(); e.stopPropagation();
      drag = { list: list, from: i, to: i, done: done, group: group, y: e.clientY };
       
      drag.timer = setInterval(function () {
        if (!drag) return;
        var edge = 80, v = drag.y < edge ? -(edge - drag.y) / 4 : drag.y > window.innerHeight - edge ? (drag.y - window.innerHeight + edge) / 4 : 0;
        if (v) { window.scrollBy(0, v); aim(drag.y); }
      }, 16);
      box.classList.add('mb-dragging'); doc.body.classList.add('mb-dragbody');
      try { h.setPointerCapture(e.pointerId); } catch (x) {}
    });
     
    var aim = function (y) {
      var boxes = [].slice.call(root.querySelectorAll('[data-dnd="' + drag.group + '"]')), to = boxes.length, mark = boxes[boxes.length - 1], after = true;
      boxes.forEach(function (b) { b.classList.remove('mb-drop-before', 'mb-drop-after'); });
      for (var k = 0; k < boxes.length; k++) { var r = boxes[k].getBoundingClientRect(); if (y < r.top + r.height / 2) { to = k; mark = boxes[k]; after = false; break; } }
      if (mark) mark.classList.add(after ? 'mb-drop-after' : 'mb-drop-before');
      drag.to = to;
    };
    h.addEventListener('pointermove', function (e) { if (drag) { drag.y = e.clientY; aim(e.clientY); } });
    var finish = function (cancel) {
      if (!drag) return;
      var d = drag, to = d.to; drag = null; clearInterval(d.timer);
      root.querySelectorAll('.mb-dragging, .mb-drop-before, .mb-drop-after').forEach(function (n) { n.classList.remove('mb-dragging', 'mb-drop-before', 'mb-drop-after'); });
      doc.body.classList.remove('mb-dragbody');
      if (d.from < to) to--;
      if (!cancel && to !== d.from) { d.list.splice(to, 0, d.list.splice(d.from, 1)[0]); d.done(); }
    };
    h.addEventListener('pointerup', function () { finish(false); });
    h.addEventListener('pointercancel', function () { finish(true); });
    return h;
  }
  function dropTarget(box, group) { box.setAttribute('data-dnd', group); }
  function embedBox(b, i, list, heading) {
    var box = el('details', { class: 'mb-embed', open: true });
    var colorPick = el('input', { type: 'color', value: b.color || '#7c4dff', 'aria-label': 'Embed colour' });
    colorPick.addEventListener('input', function () { b.color = colorPick.value; box.style.borderLeftColor = b.color; changed(); });
    box.style.borderLeftColor = b.color;
    var tools = list ? el('span', { class: 'mb-tools' }, [
      el('button', { type: 'button', class: 'mb-mini', text: '↑', title: 'Move up', disabled: i === 0, onclick: function (e) { e.preventDefault(); list.splice(i - 1, 0, list.splice(i, 1)[0]); rebuild(); } }),
      el('button', { type: 'button', class: 'mb-mini', text: '↓', title: 'Move down', disabled: i === list.length - 1, onclick: function (e) { e.preventDefault(); list.splice(i + 1, 0, list.splice(i, 1)[0]); rebuild(); } }),
      el('button', { type: 'button', class: 'mb-mini', text: 'Copy', disabled: list.length >= LIM.embeds, onclick: function (e) { e.preventDefault(); list.splice(i + 1, 0, JSON.parse(JSON.stringify(b))); rebuild(); } }),
      el('button', { type: 'button', class: 'mb-mini mb-mini--bad', text: 'Remove', onclick: function (e) { e.preventDefault(); list.splice(i, 1); rebuild(); } })
    ]) : null;
    box.appendChild(el('summary', {}, [el('span', { class: 'mb-head' }, [list && list.length > 1 ? dragHandle(list, i, rebuild, 'embeds') : null, el('span', { text: heading })]), tools]));
    if (list) dropTarget(box, 'embeds');
    var g = el('div', { class: 'mb-grid' });
    g.appendChild(el('label', { class: 'mb-label' }, ['Colour', colorPick]));
    g.appendChild(input('Author name', b.author.name, function (v) { b.author.name = v; }, { max: LIM.author }));
    g.appendChild(input('Author link', b.author.url, function (v) { b.author.url = v; }, { ph: 'https://' }));
    g.appendChild(input('Author icon', b.author.icon_url, function (v) { b.author.icon_url = v; }, { ph: 'https:// image link' }));
    var ph = PART_PH[b.part] || {};
    g.appendChild(input('Title', b.title, function (v) { b.title = v; }, { max: LIM.title, wide: true, ph: ph.title }));
    g.appendChild(input('Title link', b.url, function (v) { b.url = v; }, { ph: 'https://', wide: true }));
    g.appendChild(input('Description', b.description, function (v) { b.description = v; }, { area: true, rows: 5, max: LIM.description, wide: true, ph: ph.description }));
    box.appendChild(g);
    var fl = el('div', { class: 'mb-fields' });
    b.fields.forEach(function (f, j) {
      var inl = el('input', { type: 'checkbox' }); inl.checked = !!f.inline;
      inl.addEventListener('change', function () { f.inline = inl.checked; changed(); });
      fl.appendChild(el('div', { class: 'mb-field' }, [
        input('Field ' + (j + 1) + ' name', f.name, function (v) { f.name = v; }, { max: LIM.fname }),
        input('Value', f.value, function (v) { f.value = v; }, { area: true, rows: 2, max: LIM.fvalue }),
        el('div', { class: 'mb-fieldtools' }, [el('label', { class: 'mb-check' }, [inl, 'Side by side']), el('button', { type: 'button', class: 'mb-mini mb-mini--bad', text: 'Remove field', onclick: function () { b.fields.splice(j, 1); rebuild(); } })])
      ]));
    });
    fl.appendChild(el('button', { type: 'button', class: 'btn btn--ghost btn--sm', text: '+ Add field', disabled: b.fields.length >= LIM.fields, onclick: function () { b.fields.push({ name: '', value: '', inline: false }); rebuild(); } }));
    box.appendChild(fl);
    var g2 = el('div', { class: 'mb-grid' });
    g2.appendChild(input('Large image', b.image, function (v) { b.image = v; }, { ph: 'https:// image link' }));
    g2.appendChild(input('Thumbnail (top right)', b.thumbnail, function (v) { b.thumbnail = v; }, { ph: 'https:// image link' }));
    g2.appendChild(input('Footer text', b.footer.text, function (v) { b.footer.text = v; }, { max: LIM.footer }));
    g2.appendChild(input('Footer icon', b.footer.icon_url, function (v) { b.footer.icon_url = v; }, { ph: 'https:// image link' }));
    var ts = el('input', { type: 'checkbox' }); ts.checked = !!b.timestamp;
    ts.addEventListener('change', function () { b.timestamp = ts.checked ? true : false; changed(); });
    g2.appendChild(el('label', { class: 'mb-check mb-label--wide' }, [ts, 'Show the time it is posted in the footer']));
    box.appendChild(g2);
    return box;
  }
  function select(label, value, options, onset) {
    var sel = el('select', {});
    options.forEach(function (o) { sel.appendChild(el('option', { value: o[0], text: o[1], selected: o[0] === value })); });
    sel.addEventListener('change', function () { onset(sel.value); });
    return el('label', { class: 'mb-label' }, [label, sel]);
  }
  function buttonBox(x, n) {
    var box = el('div', { class: 'mb-button' });
    box.appendChild(el('div', { class: 'mb-buttonhead' }, [el('span', { text: 'Button ' + (n + 1) }), el('span', { class: 'mb-tools' }, [
      el('button', { type: 'button', class: 'mb-mini', text: '←', title: 'Move left', disabled: n === 0, onclick: function () { S.buttons.splice(n - 1, 0, S.buttons.splice(n, 1)[0]); rebuild(); } }),
      el('button', { type: 'button', class: 'mb-mini', text: '→', title: 'Move right', disabled: n === S.buttons.length - 1, onclick: function () { S.buttons.splice(n + 1, 0, S.buttons.splice(n, 1)[0]); rebuild(); } }),
      el('button', { type: 'button', class: 'mb-mini mb-mini--bad', text: 'Remove', onclick: function () { S.buttons.splice(n, 1); if (openHidden >= S.buttons.length) openHidden = -1; rebuild(); } })])]));
    var g = el('div', { class: 'mb-grid' });
    g.appendChild(input('Label', x.label, function (v) { x.label = v; }, { max: 80, ph: 'e.g. Punishments' }));
    g.appendChild(input('Emoji (optional)', x.emoji, function (v) { x.emoji = v; }, { max: 8, ph: 'e.g. 📜' }));
    g.appendChild(select('What it does', x.kind, [['reveal', 'Show a hidden message'], ['link', 'Open a link']], function (v) { x.kind = v; rebuild(); }));
    if (x.kind === 'link') g.appendChild(input('Link', x.url, function (v) { x.url = v; }, { ph: 'https://' }));
    else g.appendChild(select('Colour', x.style, [['secondary', 'Grey'], ['primary', 'Blurple'], ['success', 'Green'], ['danger', 'Red']], function (v) { x.style = v; changed(); }));
    box.appendChild(g);
    if (x.kind === 'reveal') {
      box.appendChild(el('p', { class: 'mb-hint', text: 'Only the person who clicks sees this message. It is not part of the post. Click the button in the preview to check it.' }));
      box.appendChild(input('Hidden message text', x.hidden.content, function (v) { x.hidden.content = v; }, { area: true, rows: 3, max: LIM.content, wide: true }));
      box.appendChild(embedBox(x.hidden.embed, 0, null, 'Hidden embed'));
    }
    return box;
  }
  function renderEditor() {
    clear(editor);
    editor.appendChild(input('Message text', S.content, function (v) { S.content = v; }, { area: true, rows: 4, max: LIM.content, wide: true, ph: 'Text above the embeds. Supports **bold**, *italic*, links and <@&role> pings.' }));
    var shown = false;
    S.embeds.forEach(function (b, i) {
      if (b.part === 'rules') {
        if (shown) return;
        shown = true;
        var n = R.list.length;
        var card = el('div', { class: 'mb-embed mb-embed--rules' }, [el('p', { class: 'mb-ptitle', text: 'The rules' }),
          el('p', { class: 'mb-hint', text: n ? n + ' rule' + (n === 1 ? '' : 's') + ', each with its punishments. They come from the rules editor above, so change them there.' : 'No rules yet. Add them in the rules editor above.' })]);
        card.style.borderLeftColor = b.color;
        editor.appendChild(card);
        return;
      }
      var head = b.part === 'intro' ? 'Beginning message (required)' : b.part === 'outro' ? 'Ending message (required)' : 'Embed ' + (i + 1);
      editor.appendChild(embedBox(b, i, b.part ? null : S.embeds, head));
    });
    editor.appendChild(el('button', { type: 'button', class: 'btn btn--ghost', text: '+ Add embed', disabled: S.embeds.length >= LIM.embeds, onclick: function () { S.embeds.push(blankEmbed()); rebuild(); } }));
    var sec = el('div', { class: 'mb-buttons' }, [el('p', { class: 'mb-ptitle', text: 'Buttons under the message (up to ' + LIM_BUTTONS + ')' })]);
    S.buttons.forEach(function (x, n) { sec.appendChild(buttonBox(x, n)); });
    sec.appendChild(el('button', { type: 'button', class: 'btn btn--ghost', text: '+ Add button', disabled: S.buttons.length >= LIM_BUTTONS, onclick: function () { S.buttons.push(blankButton()); openHidden = S.buttons.length - 1; rebuild(); } }));
    editor.appendChild(sec);
    editor.appendChild(reactionsBox());
  }
  function roleName(id) { var r = (boot.roles[S.guild] || []).filter(function (x) { return x.id === id; })[0]; return r ? r.name : ''; }
  function reactionsBox() {
    var sec = el('div', { class: 'mb-buttons mb-reactions' }, [el('p', { class: 'mb-ptitle', text: 'Reaction roles (up to ' + LIM_REACTIONS + ')' }),
      el('p', { class: 'mb-hint', text: 'The bot adds these reactions under the message. Reacting gives the role, removing the reaction takes it away. Paste an emoji (like 🎮) or a server emoji (type \\:name: in Discord and copy what it shows, like <:name:123...>).' })]);
    var roles = boot.roles[S.guild] || [];
    if (!S.guild) sec.appendChild(el('p', { class: 'mb-hint', text: 'Pick a server at the top to choose its roles.' }));
    else if (!roles.length) sec.appendChild(el('p', { class: 'mb-hint', text: 'No roles from this server yet. They appear a few minutes after the Axio Verification Bot (latest files) is in it.' }));
    S.reactions.forEach(function (r, n) {
      var em = el('input', { type: 'text', maxlength: 64, placeholder: '🎮', 'aria-label': 'Emoji' }); em.value = r.emoji;
      em.addEventListener('input', function () { r.emoji = em.value; changed(); });
      var sel = el('select', { 'aria-label': 'Role' }, [el('option', { value: '', text: 'Choose a role' })]);
      roles.forEach(function (x) { sel.appendChild(el('option', { value: x.id, text: '@' + x.name, selected: x.id === r.role_id })); });
      if (r.role_id && !roles.some(function (x) { return x.id === r.role_id; })) sel.appendChild(el('option', { value: r.role_id, text: 'Role ' + r.role_id + ' (not in this server)', selected: true }));
      sel.addEventListener('change', function () { r.role_id = sel.value; changed(); });
      sec.appendChild(el('div', { class: 'mb-rr' }, [el('b', { class: 'mb-rr__n', text: String(n + 1) }), em, sel,
        el('button', { type: 'button', class: 'mb-mini mb-mini--bad', text: 'Remove', onclick: function () { S.reactions.splice(n, 1); rebuild(); } })]));
    });
    sec.appendChild(el('button', { type: 'button', class: 'btn btn--ghost', text: '+ Add reaction role', disabled: S.reactions.length >= LIM_REACTIONS, onclick: function () { S.reactions.push({ emoji: '', role_id: '' }); rebuild(); var all = editor.querySelectorAll('.mb-rr input'); if (all.length) all[all.length - 1].focus(); } }));
    if (S.reactions.length) {
      var one = el('input', { type: 'checkbox' }); one.checked = !!S.reaction_unique;
      one.addEventListener('change', function () { S.reaction_unique = one.checked; changed(); });
      sec.appendChild(el('label', { class: 'mb-check' }, [one, 'Members can have only one of these roles (picking another swaps it)']));
    }
    return sec;
  }
  function rebuild() { renderEditor(); changed(); }

   
  var guildSel = el('select', { 'aria-label': 'Server' }), chanSel = el('select', { 'aria-label': 'Channel' });
  function fillGuilds() {
    clear(guildSel);
    guildSel.appendChild(el('option', { value: '', text: boot.guilds.length ? 'Choose a server' : 'No servers yet' }));
    boot.guilds.forEach(function (g) { guildSel.appendChild(el('option', { value: g.id, text: g.name, selected: g.id === S.guild })); });
    fillChannels();
  }
  function fillChannels() {
    clear(chanSel);
    var list = boot.channels[S.guild] || [];
    chanSel.appendChild(el('option', { value: '', text: S.guild ? (list.length ? 'Choose a channel' : 'No channels reported yet') : 'Pick a server first' }));
    var groups = {};
    list.forEach(function (c) { (groups[c.category || 'No category'] = groups[c.category || 'No category'] || []).push(c); });
    Object.keys(groups).forEach(function (cat) {
      var og = el('optgroup', { label: cat });
      groups[cat].forEach(function (c) { og.appendChild(el('option', { value: c.id, text: '#' + c.name, selected: c.id === S.channel })); });
      chanSel.appendChild(og);
    });
  }
  guildSel.addEventListener('change', function () { S.guild = guildSel.value; S.channel = ''; fillChannels(); save(); renderEditor(); renderPreview(); });
  chanSel.addEventListener('change', function () { S.channel = chanSel.value; save(); });
  var pings = el('input', { type: 'checkbox' }); pings.checked = !!S.allow_pings;
  pings.addEventListener('change', function () { S.allow_pings = pings.checked; save(); });

  var status = el('p', { class: 'mb-status', role: 'status' });
  function say(t, bad) { status.textContent = t; status.classList.toggle('mb-status--bad', !!bad); }
  var importBox = el('textarea', { rows: 3, placeholder: 'https://discohook.app/?data=...   or   {"content": "...", "embeds": [...]}' });
  function doImport() {
    try {
      var m = parseImport(importBox.value), g = S.guild, c = S.channel;
      S = fromDiscord(m); S.guild = g; S.channel = c; pings.checked = S.allow_pings;
      if (!S.embeds.length && !S.content) S.embeds.push(blankEmbed());
      importBox.value = ''; rebuild(); say('Imported. Check the preview, then send.');
    } catch (e) { say(e.message || 'Could not read that.', true); }
  }
  function copy(text, done) {
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(function () { say(done); }, function () { importBox.value = text; say('Copied into the box below. Select it and copy.'); });
  }
  function send() {
    var bad = problems();
    if (!S.guild || !S.channel) return say('Choose a server and a channel first.', true);
    if (bad.length) return say(bad[0], true);
    var where = (chanSel.options[chanSel.selectedIndex] || {}).text || 'that channel';
    var saveFirst = isRulesPost() && R.dirty && canRules;
    if (!confirm('Post this message in ' + where + '?' + (saveFirst ? ' Your rule changes are saved first.' : '') + ' The Axio Community Bot sends it within about 30 seconds.')) return;
    var go = function () {
      form.elements.guild_id.value = S.guild; form.elements.channel_id.value = S.channel; form.elements.payload.value = JSON.stringify(toDiscord(true)); form.elements.kind.value = isRulesPost() ? 'rules' : '';
      form.submit();
    };
    if (saveFirst) saveRules().then(go, function () {}); else go();
  }

  var bar = el('div', { class: 'mb-bar' }, [
    el('label', { class: 'mb-label' }, ['Server', guildSel]),
    el('label', { class: 'mb-label' }, ['Channel', chanSel]),
    el('label', { class: 'mb-check', title: 'Off: @everyone, @here and role pings show but do not notify anyone' }, [pings, 'Allow pings (@everyone, roles)']),
    el('button', { type: 'button', class: 'btn btn--primary', onclick: send }, [el('span', { text: 'Send to Discord' })])
  ]);
  var io = el('details', { class: 'mb-io' }, [
    el('summary', { text: 'Import / export (Discohook, JSON)' }),
    importBox,
    el('div', { class: 'mb-iobtns' }, [
      el('button', { type: 'button', class: 'btn btn--ghost btn--sm', text: 'Import', onclick: doImport }),
      el('button', { type: 'button', class: 'btn btn--ghost btn--sm', text: 'Open in Discohook', onclick: function () { window.open(discohookLink(), '_blank', 'noopener'); } }),
      el('button', { type: 'button', class: 'btn btn--ghost btn--sm', text: 'Copy Discohook link', onclick: function () { copy(discohookLink(), 'Discohook link copied.'); } }),
      el('button', { type: 'button', class: 'btn btn--ghost btn--sm', text: 'Copy JSON', onclick: function () { copy(JSON.stringify(toDiscord(false, true), null, 2), 'JSON copied.'); } }),
      el('button', { type: 'button', class: 'btn btn--ghost btn--sm mb-mini--bad', text: 'Start over', onclick: function () { if (confirm('Clear the whole message?')) { var g = S.guild, c = S.channel; S = blank(); S.guild = g; S.channel = c; pings.checked = false; rebuild(); say('Cleared.'); } } })
    ])
  ]);

   
  var TYPES = {
    member: { color: '#7c4dff', title: 'Server Rules', footer: 'Look up any rule with /rule  ·  axiomategames.com' },
    staff: { color: '#e8c37a', title: 'Staff Rules', footer: 'Staff only  ·  do not share outside the staff team' }
  };
  var LADDER = boot.ladder || [], canRules = !!boot.canRules;
  var typeSel = el('select', { 'aria-label': 'Message type' }, [
    el('option', { value: 'regular', text: 'Regular message' }), el('option', { value: 'rules', text: 'Rules post' }), el('option', { value: 'staff', text: 'Staff notice' })]);
  var audSel = el('select', { 'aria-label': 'Which rules' }, [el('option', { value: 'member', text: 'Member rules' }), el('option', { value: 'staff', text: 'Staff rules' })]);
  var typeHint = el('p', { class: 'mb-hint' });
  var typeBtn = el('button', { type: 'button', class: 'btn btn--ghost btn--sm', text: 'Apply staff layout' });
  var R = { aud: S.rulesAud === 'staff' ? 'staff' : 'member', scope: S.rulesScope || '', list: [], dirty: false, saving: false };
   
  if (!S.rulesScope) { var have = (boot.rules || []).filter(function (r) { return r.audience === R.aud; }); if (have.length && !have.some(function (r) { return r.guild_id === ''; })) R.scope = have[0].guild_id; }

  function steps(text) {
    var parts = String(text || '').split(/\s*(?:-->|->|\u2192)\s*/).map(function (x) { return x.trim().toLowerCase(); });
    return LADDER.filter(function (x) { return parts.indexOf(x.toLowerCase()) >= 0; });
  }
  function rulesFor(aud) {
    return (boot.rules || []).filter(function (r) { return r.audience === aud && r.guild_id === R.scope; })
      .sort(function (a, b) { return a.num - b.num || a.id - b.id; });
  }
  function loadRules() {
    R.list = rulesFor(R.aud).map(function (r) { return { id: r.id, title: r.title, body: r.body, punishment: steps(r.punishment) }; });
    R.dirty = false;
  }
  function ruleProblems() {
    var p = [];
    if (!R.list.length) p.push('Rules post: add at least one rule.');
    R.list.forEach(function (r, i) {
      var n = 'Rule ' + (ruleStart() + i + 1) + (r.title.trim() ? ' (' + r.title.trim() + ')' : '');
      if (!r.title.trim()) p.push(n + ' needs a title.');
      else if (!r.body.trim()) p.push(n + ' needs its text.');
      else if (!r.punishment.length) p.push(n + ' needs at least one punishment.');
    });
    return p;
  }
   
  function applyRules(recolor) {
    var t = TYPES[R.aud], find = function (part) { return S.embeds.filter(function (b) { return b.part === part; })[0]; };
    var intro = find('intro'), outro = find('outro');
    if (!intro) { intro = blankEmbed(); recolor = true; }
    if (!outro) { outro = blankEmbed(); recolor = true; }
    intro.part = 'intro'; outro.part = 'outro';
    if (recolor) { intro.color = outro.color = t.color; if (!outro.footer.text || outro.footer.text === TYPES.member.footer || outro.footer.text === TYPES.staff.footer) outro.footer.text = t.footer; }
    var rules = [], cur = null, start = R.scope === '' ? 0 : (boot.rules || []).filter(function (r) { return r.audience === R.aud && r.guild_id === ''; }).length;
    R.list.forEach(function (r, i) {
      if (!cur || cur.fields.length >= LIM.fields) { cur = blankEmbed(); cur.color = t.color; cur.part = 'rules'; if (!rules.length) cur.title = rulesTitle(); rules.push(cur); }
      var full = (r.body.trim() || '(write this rule)') + '\n> **Punishments:** ' + (r.punishment.length ? r.punishment.join(' \u2192 ') : '(pick at least one)');
      cur.fields.push({ name: (start + i + 1) + '. ' + (r.title.trim() || 'New rule'), value: full.length > LIM.fvalue ? full.slice(0, LIM.fvalue - 1) + '\u2026' : full, inline: false });
    });
    if (!rules.length) { cur = blankEmbed(); cur.color = t.color; cur.part = 'rules'; cur.title = rulesTitle(); cur.description = '(no rules yet)'; rules.push(cur); }
    S.embeds = [intro].concat(rules.slice(0, LIM.embeds - 2), [outro]);
    S.rulesAud = R.aud;
  }

   
  var rulesBox = el('div', { class: 'mb-rules' });
  var rulesState = el('span', { class: 'mb-rules__state' });
  function renderRulesState() {
    rulesState.textContent = R.saving ? 'Saving…' : R.dirty ? 'Unsaved changes' : 'Saved';
    rulesState.classList.toggle('mb-rules__state--dirty', R.dirty && !R.saving);
  }
  function ruleChanged(structural) { R.dirty = true; applyRules(false); rebuild(); if (structural) renderRules(); else renderRulesState(); }
  function ruleInput(label, value, onset, opts) {
    var lbl = input(label, value, function (v) { onset(v); R.dirty = true; applyRules(false); renderEditor(); renderRulesState(); }, opts);
    var ctl = lbl.querySelector('input,textarea'); if (ctl && !canRules) ctl.disabled = true;
    return lbl;
  }
  function ruleBox(r, i) {
    var box = el('div', { class: 'mb-rule' });
    var mini = function (txt, title, off, fn) { return el('button', { type: 'button', class: 'mb-mini', text: txt, title: title, disabled: off, onclick: fn }); };
    if (canRules) dropTarget(box, 'rules');
    box.appendChild(el('div', { class: 'mb-buttonhead' }, [el('span', { class: 'mb-head' }, [canRules && R.list.length > 1 ? dragHandle(R.list, i, function () { ruleChanged(true); }, 'rules') : null, el('span', { text: 'Rule ' + (ruleStart() + i + 1) })]), canRules ? el('span', { class: 'mb-tools' }, [
      mini('\u2191', 'Move up', i === 0, function () { R.list.splice(i - 1, 0, R.list.splice(i, 1)[0]); ruleChanged(true); }),
      mini('\u2193', 'Move down', i === R.list.length - 1, function () { R.list.splice(i + 1, 0, R.list.splice(i, 1)[0]); ruleChanged(true); }),
      el('button', { type: 'button', class: 'mb-mini mb-mini--bad', text: 'Remove', onclick: function () { if (confirm('Remove rule ' + (i + 1) + '?')) { R.list.splice(i, 1); ruleChanged(true); } } })
    ]) : null]));
    var g = el('div', { class: 'mb-grid' });
    g.appendChild(ruleInput('Title', r.title, function (v) { r.title = v; }, { max: 100, wide: true, ph: 'e.g. Be respectful' }));
    g.appendChild(ruleInput('Rule', r.body, function (v) { r.body = v; }, { area: true, rows: 3, max: 800, wide: true, ph: 'e.g. Treat everyone with respect. No harassment, hate speech or slurs.' }));
    box.appendChild(g);
    var pun = el('div', { class: 'mb-pun' }, [el('span', { class: 'mb-pun__label', text: 'Punishments (pick at least one; shown mildest first)' })]);
    LADDER.forEach(function (step, n) {
      var cb = el('input', { type: 'checkbox', disabled: !canRules }); cb.checked = r.punishment.indexOf(step) >= 0;
      var chip = el('label', { class: 'mb-chip' + (cb.checked ? ' mb-chip--on' : '') }, [cb, el('b', { text: String(n + 1) }), step]);
      cb.addEventListener('change', function () {
        r.punishment = LADDER.filter(function (x) { return x === step ? cb.checked : r.punishment.indexOf(x) >= 0; });
        chip.classList.toggle('mb-chip--on', cb.checked); ruleChanged(false);
      });
      pun.appendChild(chip);
    });
    if (canRules) pun.appendChild(el('span', { class: 'mb-tools' }, [
      el('button', { type: 'button', class: 'mb-mini', text: 'Tick all', onclick: function () { r.punishment = LADDER.slice(); ruleChanged(true); } }),
      el('button', { type: 'button', class: 'mb-mini', text: 'Clear', onclick: function () { r.punishment = []; ruleChanged(true); } })]));
    box.appendChild(pun);
    return box;
  }
  function ruleStart() { return R.scope === '' ? 0 : (boot.rules || []).filter(function (r) { return r.audience === R.aud && r.guild_id === ''; }).length; }
   
  function rulesTitle() { var t = (S.rulesTitle || {})[R.aud]; return typeof t === 'string' ? t : TYPES[R.aud].title; }
  function guildName(id) { var g = (boot.guilds || []).filter(function (x) { return x.id === id; })[0]; return g ? g.name : id; }
  function rulesChannel() { return ((boot.rulesChannels || {})[S.guild] || {})[R.aud] || ''; }
   
  function pickRulesChannel() {
    var c = rulesChannel();
    if (!c || !(boot.channels[S.guild] || []).some(function (x) { return x.id === c; })) return;
    S.channel = c; fillChannels(); save();
  }
  var postSel = el('select', { 'aria-label': 'Post the rules in' });
  postSel.addEventListener('change', function () { S.channel = postSel.value; fillChannels(); save(); renderRules(); });
  function fillPostSel() {
    clear(postSel);
    var list = boot.channels[S.guild] || [];
    postSel.appendChild(el('option', { value: '', text: S.guild ? (list.length ? 'Choose a channel' : 'No channels reported yet') : 'Pick a server at the top first' }));
    list.forEach(function (c) { postSel.appendChild(el('option', { value: c.id, text: '#' + c.name + (c.category ? '  (' + c.category + ')' : ''), selected: c.id === S.channel })); });
    postSel.disabled = !S.guild;
  }
  function saveRulesChannel() {
    if (!S.guild || !S.channel) return say('Pick the server and the channel first.', true);
    var fd = new FormData();
    fd.append('_csrf', form.elements._csrf.value); fd.append('_do', 'rules_channel'); fd.append('audience', R.aud); fd.append('guild_id', S.guild); fd.append('channel_id', S.channel);
    fetch(location.pathname, { method: 'POST', body: fd, credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (res) { return res.json(); })
      .then(function (j) {
        if (!j.ok) throw new Error(j.error || 'Could not save the channel.');
        boot.rulesChannels = boot.rulesChannels || {}; boot.rulesChannels[S.guild] = boot.rulesChannels[S.guild] || {};
        boot.rulesChannels[S.guild][R.aud] = S.channel; renderRules();
        say('Saved. ' + (R.aud === 'staff' ? 'Staff rules' : 'Rules') + ' posts for ' + guildName(S.guild) + ' now go to this channel.');
      })
      .catch(function (e) { say(e.message || 'Could not save the channel.', true); });
  }
  var scopeSel = el('select', { 'aria-label': 'Rules for' });
  scopeSel.addEventListener('change', function () {
    if (R.dirty && !confirm('Your rule changes are not saved. Switch anyway?')) { scopeSel.value = R.scope; return; }
    R.scope = scopeSel.value; S.rulesScope = R.scope;
     
    if (R.scope && R.scope !== S.guild && boot.channels[R.scope]) { S.guild = R.scope; S.channel = ''; fillGuilds(); pickRulesChannel(); save(); }
    loadRules(); applyRules(false); rebuild(); renderRules();
  });
  function renderRules() {
    clear(rulesBox);
    clear(scopeSel);
    scopeSel.appendChild(el('option', { value: '', text: 'Every server' }));
    (boot.guilds || []).forEach(function (g) { scopeSel.appendChild(el('option', { value: g.id, text: g.name + ' only' })); });
    if (R.scope && !(boot.guilds || []).some(function (g) { return g.id === R.scope; })) scopeSel.appendChild(el('option', { value: R.scope, text: R.scope + ' only' }));
    scopeSel.value = R.scope;
    var count = function (scope) { return (boot.rules || []).filter(function (r) { return r.audience === R.aud && r.guild_id === scope; }).length; };
    fillPostSel();
    var saved = rulesChannel(), isSaved = saved && saved === S.channel;
    var where = el('div', { class: 'mb-rules__where' }, [
      el('label', { class: 'mb-label' }, ['Rules for', scopeSel]),
      el('p', { class: 'mb-hint', text: R.scope === '' ? 'These rules apply in every server: /rule shows them everywhere.' : 'These rules are only for ' + guildName(R.scope) + ': /rule shows them there, after the every-server rules (' + count('') + ').' }),
      input('Rules heading', rulesTitle(), function (v) { S.rulesTitle = S.rulesTitle || {}; S.rulesTitle[R.aud] = v; applyRules(false); renderEditor(); }, { max: LIM.title, ph: 'e.g. Server Rules (leave empty for no heading)' }),
      el('p', { class: 'mb-hint', text: 'Shown in bold above the first rule. Leave it empty for no heading.' }),
      el('label', { class: 'mb-label' }, ['Post in' + (S.guild ? ' (' + guildName(S.guild) + ')' : ''), postSel]),
      el('div', { class: 'mb-rules__post' }, [
        el('p', { class: 'mb-hint', text: !S.guild ? 'Pick the server to post in at the top.' : isSaved ? 'This is the saved ' + (R.aud === 'staff' ? 'staff rules' : 'rules') + ' channel for ' + guildName(S.guild) + ', so it is picked automatically next time.'
          : saved ? 'The saved ' + (R.aud === 'staff' ? 'staff rules' : 'rules') + ' channel for this server is a different one.' : 'No ' + (R.aud === 'staff' ? 'staff rules' : 'rules') + ' channel is saved for this server yet.' }),
        boot.canBotcfg && S.guild && S.channel && !isSaved ? el('button', { type: 'button', class: 'btn btn--ghost btn--sm', text: 'Always post ' + (R.aud === 'staff' ? 'staff rules' : 'rules') + ' here', onclick: saveRulesChannel }) : null
      ])
    ]);
    rulesBox.appendChild(where);
    rulesBox.appendChild(el('div', { class: 'mb-rules__head' }, [
      el('p', { class: 'mb-ptitle', text: (R.aud === 'staff' ? 'Staff' : 'Member') + ' rules (' + R.list.length + ')' }), rulesState,
      canRules ? el('button', { type: 'button', class: 'btn btn--ghost btn--sm', text: 'Save rules', onclick: function () { saveRules().catch(function () {}); } }) : null]));
    rulesBox.appendChild(el('p', { class: 'mb-hint', text: canRules
      ? 'Write the rules here and the post updates as you type. Drag a rule by its \u283f handle (or use the arrows) to put it where it should be. Saving keeps them for /rule and the Helper Bot (sending the post saves them too). Every rule needs at least one punishment.'
      : 'Your rank can post the rules but not change them.' }));
    R.list.forEach(function (r, i) { rulesBox.appendChild(ruleBox(r, i)); });
    if (canRules) rulesBox.appendChild(el('button', { type: 'button', class: 'btn btn--ghost', text: '+ Add rule', disabled: R.list.length >= 60, onclick: function () {
      R.list.push({ id: 0, title: '', body: '', punishment: [] }); ruleChanged(true);
      var all = rulesBox.querySelectorAll('.mb-rule'), last = all[all.length - 1]; if (last) last.querySelector('input').focus();
    } }));
    renderRulesState();
  }
  function saveRules() {
    var bad = ruleProblems();
    if (bad.length) { say(bad[0], true); return Promise.reject(new Error(bad[0])); }
    var fd = new FormData();
    fd.append('_csrf', form.elements._csrf.value); fd.append('_do', 'rules_save'); fd.append('audience', R.aud); fd.append('scope', R.scope);
    fd.append('rules', JSON.stringify(R.list.map(function (r) { return { id: r.id, title: r.title.trim(), body: r.body.trim(), punishment: r.punishment }; })));
    R.saving = true; renderRulesState();
    return fetch(location.pathname, { method: 'POST', body: fd, credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (res) { return res.json().catch(function () { throw new Error('The panel did not answer. Refresh the page and try again.'); }); })
      .then(function (j) {
        R.saving = false;
        if (!j.ok) throw new Error(j.error || 'Could not save the rules.');
        boot.rules = j.rules; loadRules(); applyRules(false); rebuild(); renderRules();
        say('Rules saved. /rule and the Helper Bot use them now.');
      })
      .catch(function (e) { R.saving = false; renderRulesState(); say(e.message, true); throw e; });
  }

  function enterRules(ask) {
    if (!isRulesPost()) {
      if (ask && (toDiscord(false).embeds.length || S.content) && !confirm('Start a rules post? The current embeds are replaced by a beginning message, the rules and an ending message.')) return false;
      S.embeds = [];
    }
    audSel.value = R.aud; loadRules(); applyRules(true); rebuild(); renderRules(); pickRulesChannel();
    return true;
  }
  function leaveRules() {
    if (R.dirty && !confirm('Your rule changes are not saved. Leave the rules post anyway?')) return false;
    S.embeds.forEach(function (b) { delete b.part; }); delete S.rulesAud; R.dirty = false; rebuild();
    return true;
  }
  function staffLayout() {
    if (!S.embeds.length) S.embeds.push(blankEmbed());
    S.embeds.forEach(function (b, i) {
      b.color = TYPES.staff.color;
      if (i === 0) {
        if (!b.author.name) b.author.name = 'AXIOMATE GAMES  ·  STAFF';
        if (!b.title) b.title = 'Staff notice';
      }
    });
    S.embeds[S.embeds.length - 1].footer.text = TYPES.staff.footer;
    rebuild();
    say('Staff layout applied. Post it in a staff-only channel.');
  }
  var curType = 'regular';
  function syncType() {
    var t = typeSel.value; curType = t;
    audSel.parentNode.hidden = t !== 'rules'; typeBtn.hidden = t !== 'staff'; rulesBox.hidden = t !== 'rules';
    typeHint.textContent = t === 'rules' ? 'A rules post has three parts: a beginning message you write, the rules (written right below, each with its punishments), and an ending message you write. Both messages are required. Staff rules use the staff colours and a "staff only" footer.'
      : t === 'staff' ? 'Gives the message the staff look (amber colour, STAFF header and a "staff only" footer). Use it for posts in staff channels.' : '';
  }
  typeSel.addEventListener('change', function () {
    var ok = typeSel.value === 'rules' ? enterRules(true) : (curType === 'rules' ? leaveRules() : true);
    if (!ok) typeSel.value = curType;
    syncType();
  });
  audSel.addEventListener('change', function () {
    if (R.dirty && !confirm('Your rule changes are not saved. Switch anyway?')) { audSel.value = R.aud; return; }
    R.aud = audSel.value; loadRules(); applyRules(true); rebuild(); renderRules(); pickRulesChannel();
  });
  typeBtn.addEventListener('click', staffLayout);
   
  guildSel.addEventListener('change', function () { if (curType === 'rules') { pickRulesChannel(); renderRules(); } });
  chanSel.addEventListener('change', function () { if (curType === 'rules') renderRules(); });
  var typeRow = el('div', { class: 'mb-type' }, [el('label', { class: 'mb-label' }, ['Message type', typeSel]), el('label', { class: 'mb-label' }, ['Rules', audSel]), typeBtn, typeHint]);
  if (boot.openRules === 'member' || boot.openRules === 'staff') { R.aud = boot.openRules; typeSel.value = 'rules'; enterRules(true); }
  else if (isRulesPost()) { typeSel.value = 'rules'; audSel.value = R.aud; loadRules(); applyRules(false); renderRules(); }
  syncType();

  root.appendChild(bar);
  root.appendChild(typeRow);
  root.appendChild(status);
  root.appendChild(io);
  root.appendChild(el('div', { class: 'mb-split' }, [el('div', { class: 'mb-left' }, [rulesBox, editor]), el('div', { class: 'mb-right' }, [el('p', { class: 'mb-ptitle', text: 'Preview' }), preview, countEl])]));
  fillGuilds();
  renderEditor();
  renderPreview();
  if (boot.load) say('Loaded message for editing. Sending posts it again as a new message.');
})();
