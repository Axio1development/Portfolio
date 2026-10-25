(function () {
  const AX = window.AX, st = () => AX.store;

  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  AX.money = n => money.format(n || 0);
  AX.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  AX.qs = k => new URLSearchParams(location.search).get(k);
  AX.$ = (s, r = document) => r.querySelector(s);
  AX.$$ = (s, r = document) => [...r.querySelectorAll(s)];
  AX.date = (t, o) => new Date(t).toLocaleDateString('en-US', o || { month: 'short', day: 'numeric', year: 'numeric' });
  AX.day = t => new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  AX.time = t => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  AX.range = eta => !eta ? '—' : (new Date(eta.from).toDateString() === new Date(eta.to).toDateString() ? AX.day(eta.from) : AX.day(eta.from) + ' – ' + AX.day(eta.to));
  AX.stateOptions = sel => Object.entries(AX.states).map(([k, v]) => `<option value="${k}"${k === sel ? ' selected' : ''}>${v[0]}</option>`).join('');

  const I = {
    pen: '<path d="M44 8l12 12L24 52l-14 4 4-14z"/><path d="M38 14l12 12M14 42l8 8"/>',
    marker: '<path d="M40 8l16 16-26 26H14V34z"/><path d="M34 14l16 16M14 50l-6 6"/><path d="M20 40l4 4"/>',
    notebook: '<rect x="16" y="8" width="36" height="48" rx="3"/><path d="M11 16h9M11 26h9M11 36h9M11 46h9M27 20h17M27 28h17M27 36h10"/>',
    stapler: '<path d="M8 46h48v6H8z"/><path d="M12 46v-8c0-4 3-6 7-6h29c4 0 8 2 8 6v4H20"/><path d="M14 32l5-10h29l6 10"/>',
    folder: '<path d="M8 18c0-2 1.5-4 4-4h12l5 6h23c2 0 4 2 4 4v24c0 2-2 4-4 4H12c-2.5 0-4-2-4-4z"/><path d="M8 27h48"/>',
    notes: '<path d="M14 10h36v30L36 54H14z"/><path d="M50 40H36v14M22 20h20M22 28h20"/>',
    paper: '<path d="M14 22h36v32H14z"/><path d="M18 16h28M22 10h20M20 30h24M20 38h24M20 46h16"/>',
    toner: '<rect x="6" y="22" width="52" height="20" rx="4"/><path d="M14 42v6h36v-6M14 30h22"/><circle cx="48" cy="32" r="3"/>',
    printer: '<path d="M18 22V8h28v14"/><rect x="8" y="22" width="48" height="22" rx="4"/><path d="M18 36h28v20H18zM24 44h16M24 50h10"/><circle cx="48" cy="29" r="1.6"/>',
    laptop: '<rect x="12" y="12" width="40" height="28" rx="3"/><path d="M4 48h56l-4 6H8zM28 51h8"/>',
    monitor: '<rect x="6" y="8" width="52" height="34" rx="3"/><path d="M32 42v10M20 56h24"/>',
    keyboard: '<rect x="4" y="20" width="40" height="22" rx="3"/><path d="M10 27h2M16 27h2M22 27h2M28 27h2M34 27h2M10 34h2M16 34h16M36 34h2"/><rect x="48" y="24" width="12" height="18" rx="6"/><path d="M54 24v6"/>',
    dock: '<rect x="10" y="24" width="44" height="18" rx="4"/><path d="M16 33h6M27 33h4M35 33h4M43 33h5M32 24V12M27 12h10"/>',
    headset: '<path d="M12 36v-6a20 20 0 0 1 40 0v6"/><rect x="8" y="34" width="10" height="16" rx="3"/><rect x="46" y="34" width="10" height="16" rx="3"/><path d="M18 46c4 6 10 8 16 8"/><circle cx="36" cy="54" r="2"/>',
    plug: '<rect x="6" y="26" width="46" height="16" rx="4"/><circle cx="15" cy="34" r="2"/><circle cx="25" cy="34" r="2"/><circle cx="35" cy="34" r="2"/><circle cx="44" cy="34" r="2"/><path d="M52 34h4c3 0 3-10-2-14"/>',
    chair: '<path d="M20 8h24c2 0 3 2 3 4l-2 20H19l-2-20c0-2 1-4 3-4z"/><path d="M14 32h36M32 32v12M18 50l14-6 14 6"/><circle cx="18" cy="53" r="2.4"/><circle cx="46" cy="53" r="2.4"/><circle cx="32" cy="53" r="2.4"/>',
    desk: '<path d="M6 20h52v6H6zM14 26v30M50 26v30M14 40h36M8 56h12M44 56h12"/>',
    cabinet: '<rect x="16" y="6" width="32" height="52" rx="2"/><path d="M16 19h32M16 32h32M16 45h32M28 12h8M28 25h8M28 38h8M28 51h8"/>',
    table: '<path d="M4 24h56v5H4zM10 29l-4 22M54 29l4 22M16 29l6 14M48 29l-6 14"/>',
    lamp: '<path d="M22 56h20M32 56V38l-8-12"/><path d="M14 22l14-12 10 10-14 12z"/><path d="M40 28l4 4"/>',
    coffee: '<path d="M12 22h34v18a14 14 0 0 1-14 14h-6a14 14 0 0 1-14-14z"/><path d="M46 26h4a6 6 0 0 1 0 12h-4M22 8c-2 3 2 5 0 8M32 8c-2 3 2 5 0 8"/>',
    cup: '<path d="M16 14h32l-4 42H20zM13 14h38M18 27h28"/>',
    towel: '<ellipse cx="20" cy="32" rx="8" ry="18"/><path d="M20 14h26c5 0 9 8 9 18s-4 18-9 18H20"/><ellipse cx="20" cy="32" rx="3" ry="6"/>',
    spray: '<path d="M24 26h16l4 8v20c0 2-2 4-4 4H24c-2 0-4-2-4-4V34z"/><path d="M26 26v-8h12v8M38 18h8l6 4M26 13h18M53 11l4-2M54 17h4M53 23l4 2"/>',
    bin: '<path d="M12 18h40M26 18v-6h12v6M16 18l3 38h26l3-38M26 28v20M38 28v20"/>',
    gloves: '<path d="M22 56V36l-7-9c-1.5-2 0-4.5 2.5-4 1 .2 2 1 2.5 2l4 5V12a3 3 0 0 1 6 0v16V9a3 3 0 0 1 6 0v19V12a3 3 0 0 1 6 0v16-10a3 3 0 0 1 6 0v20c0 9-4 13-9 15v3"/><path d="M22 50h21"/>',
    hardhat: '<path d="M6 44h52M12 44v-6a20 20 0 0 1 40 0v6M27 19v-3h10v3M32 19v12"/><path d="M8 44c0 4 3 6 7 6h34c4 0 7-2 7-6"/>',
    vest: '<path d="M22 8l10 10 10-10 9 4v42H39V30H25v24H13V12z"/><path d="M13 37h12M39 37h12M13 45h12M39 45h12"/>',
    glasses: '<path d="M6 26h52M8 26v8c0 6 4 10 10 10h4c5 0 8-4 8-10M56 26v8c0 6-4 10-10 10h-4c-5 0-8-4-8-10M30 30h4"/>',
    firstaid: '<rect x="8" y="18" width="48" height="36" rx="4"/><path d="M24 18v-6h16v6M32 28v16M24 36h16"/>',
    drill: '<path d="M8 18h30l6 4v8l-6 4H24M44 26h12M24 34l-4 14h12l2-14M14 18v16"/><rect x="18" y="48" width="18" height="8" rx="2"/>',
    ladder: '<path d="M22 6L10 58M38 6l12 52M19 18h22M16 30h28M14 42h32M11 54h38"/>',
    shelf: '<path d="M12 6v52M52 6v52M12 10h40M12 24h40M12 38h40M12 52h40"/><rect x="18" y="14" width="10" height="10"/><rect x="34" y="42" width="12" height="10"/><rect x="31" y="28" width="15" height="10"/>',
    handtruck: '<path d="M16 6l12 42M12 8h6M28 48h24"/><circle cx="26" cy="52" r="6"/><path d="M24 22l14-4 6 20-14 4z"/>',
    box: '<path d="M32 6l24 12v28L32 58 8 46V18z"/><path d="M8 18l24 12 24-12M32 30v28M20 12l24 12"/>',
    tape: '<circle cx="28" cy="32" r="20"/><circle cx="28" cy="32" r="8"/><path d="M47 38h11v8H40"/>',
    wrap: '<ellipse cx="18" cy="32" rx="8" ry="22"/><path d="M18 10h26M18 54h26"/><ellipse cx="44" cy="32" rx="8" ry="22"/><path d="M52 32h6"/>',
    label: '<path d="M8 14h30l18 18-18 18H8z"/><circle cx="19" cy="32" r="4"/><path d="M28 26h8M28 38h8"/>'
  };
  AX.icon = (key, size = 64) => `<svg viewBox="0 0 64 64" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[key] || I.box}</svg>`;
  AX.thumb = (p, cls = '') => { const c = AX.catById[p.cat]; return `<div class="thumb ${cls}" style="--cat:${c.color}">${AX.icon(p.icon)}</div>`; };

  const UI = {
    search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>',
    cart: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20.5" r="1.3"/><circle cx="18" cy="20.5" r="1.3"/></svg>',
    user: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    pin: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    truck: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/></svg>',
    menu: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
  };
  const BADGE = { cancelled: 'red', rejected: 'red', pending_approval: 'amber', delivered: 'green', collected: 'green', ready: 'green' };
  AX.statusBadge = (st, extra = '') => `<span class="badge ${BADGE[st.key] || 'blue'} ${extra}">${st.label}</span>`;
  AX.serviceName = svc => ({ ground: 'Ground parcel', nextday: 'Next business day', ltl: 'LTL freight' }[svc] || 'Ground parcel');

  AX.netmap = (myBranch, linkPins) => {
    const dcs = AX.locations.filter(l => l.type === 'dc');
    const line = (a, b) => `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`;
    const lines = dcs.flatMap((a, i) => dcs.slice(i + 1).map(b => line(a, b)))
      .concat(AX.locations.filter(l => l.parent).map(l => line(l, AX.locById[l.parent]))).join('');
    const tag = linkPins ? 'a' : 'div';
    const pins = AX.locations.map(l => `<${tag} ${linkPins ? `href="#${l.id}" ` : ''}class="pin ${l.type}${l.id === myBranch ? ' me' : ''}" style="left:${l.x}%;top:${l.y}%"><i></i><span>${l.short.replace(/ (DC|Branch)$/, '')}</span></${tag}>`).join('');
    return `<div class="netmap"><svg class="links" viewBox="0 0 100 100" preserveAspectRatio="none" fill="none" stroke="#9fb3d1" stroke-width=".4" stroke-dasharray="1.4 1.2">${lines}</svg>${pins}</div>`;
  };

  AX.stockBadge = (sku, loc) => {
    const n = st().stock(sku, loc), L = AX.locById[loc];
    if (n > 20) return `<span class="stock ok">In stock at ${AX.esc(L.short)}</span>`;
    if (n > 0) return `<span class="stock low">Only ${n} left at ${AX.esc(L.short)}</span>`;
    const elsewhere = st().totalStock(sku);
    return elsewhere > 0 ? `<span class="stock transfer">Ships from another location</span>` : `<span class="stock out">Backordered</span>`;
  };

  AX.tile = p => {
    const s = st(), co = s.company(), price = s.unitPrice(p, 1, co);
    return `<article class="tile">
      <a href="product.html?sku=${p.sku}" class="tile-link" aria-label="${AX.esc(p.name)}">${AX.thumb(p)}</a>
      <div class="tile-body">
        <div class="tile-brand">${AX.esc(p.brand)} · <span class="mono">${p.sku}</span></div>
        <a href="product.html?sku=${p.sku}" class="tile-name">${AX.esc(p.name)}</a>
        <div class="tile-pack">${AX.esc(p.pack)}</div>
        <div class="tile-price"><strong>${AX.money(price)}</strong><span>/ ${p.unit}</span>${co && price < p.price ? `<s>${AX.money(p.price)}</s>` : ''}</div>
        ${AX.stockBadge(p.sku, s.state.branch)}
        <button class="btn btn-accent btn-sm btn-block" data-add="${p.sku}">Add to cart</button>
      </div>
    </article>`;
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-add]');
    if (!b) return;
    const qtyEl = b.dataset.qty ? AX.$(b.dataset.qty) : null;
    const qty = qtyEl ? parseInt(qtyEl.value, 10) || 1 : 1;
    st().cartAdd(b.dataset.add, qty);
    AX.toast(`Added ${qty} × ${AX.bySku[b.dataset.add].name}`, { href: 'cart.html', label: 'View cart' });
  });

  AX.toast = (msg, link, kind) => {
    let box = AX.$('#toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = document.createElement('div');
    t.className = 'toast' + (kind ? ' ' + kind : '');
    t.innerHTML = `<span>${AX.esc(msg)}</span>${link ? `<a href="${link.href}">${AX.esc(link.label)}</a>` : ''}`;
    box.appendChild(t);
    setTimeout(() => t.classList.add('out'), 3800);
    setTimeout(() => t.remove(), 4300);
  };
  AX.modal = (html, onMount) => {
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><button class="modal-x" aria-label="Close">×</button>${html}</div>`;
    const close = () => { wrap.remove(); document.removeEventListener('keydown', esc); };
    const esc = e => { if (e.key === 'Escape') close(); };
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.modal-x') || e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', esc);
    document.body.appendChild(wrap);
    if (onMount) onMount(wrap.querySelector('.modal'), close);
    return close;
  };

  AX.branchPicker = () => {
    const s = st();
    AX.modal(`<h2>Choose your branch</h2>
      <p class="muted">Your branch sets the stock you see and where pickup orders are staged. Shipping always comes from the distribution center closest to your delivery address.</p>
      <div class="branch-list">${AX.locations.map(l => `
        <label class="branch-opt"><input type="radio" name="br" value="${l.id}" ${l.id === s.state.branch ? 'checked' : ''}>
          <span><strong>${AX.esc(l.name)}</strong><small>${AX.esc(l.street)}, ${AX.esc(l.city)}, ${l.state} · ${l.type === 'dc' ? 'Distribution center' : 'Branch'}</small></span></label>`).join('')}
      </div>
      <div class="modal-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="br-save">Save branch</button></div>`,
      (m, close) => m.querySelector('#br-save').onclick = () => {
        const v = m.querySelector('input[name=br]:checked').value; s.setBranch(v); close();
        AX.toast('Branch set to ' + AX.locById[v].short);
      });
  };

  function header() {
    const s = st(), co = s.company(), u = s.user(), L = AX.locById[s.state.branch], here = location.pathname.split('/').pop() || 'index.html';
    const pending = co && s.canApprove(u) ? s.state.orders.filter(o => o.companyId === co.id && o.state === 'pending_approval').length : 0;
    return `
    <a class="skip" href="#main">Skip to content</a>
    <div class="concept-bar"><strong>Concept store.</strong> Axiomate Shop is a demo: products, prices, locations and accounts are made up. Nothing ships and no payment is taken.</div>
    <div class="util-bar"><div class="wrap">
      <button class="util-branch" id="branch-btn">${UI.pin}<span>My branch: <strong>${AX.esc(L.short)}</strong></span><span class="chev">Change</span></button>
      <span class="util-mid">${UI.truck} Order by ${L.type === 'dc' ? L.cutoff : '4:00 PM'} for same-day shipping · Free ground over $250</span>
      <span class="util-right"><a href="locations.html">Locations</a><a href="business.html">Business accounts</a><span>${AX.company.phone}</span></span>
    </div></div>
    <header class="site-header"><div class="wrap">
      <button class="nav-toggle" id="nav-toggle" aria-label="Menu">${UI.menu}</button>
      <a class="brand" href="index.html"><img src="favicon.svg" alt="" width="32" height="32"><span>Axiomate<em>Shop</em></span></a>
      <form class="search" action="shop.html" role="search">
        <input name="q" type="search" placeholder="Search 40 products, SKUs and brands" value="${AX.esc(AX.qs('q') || '')}" aria-label="Search products">
        <button aria-label="Search">${UI.search}</button>
      </form>
      <nav class="head-actions">
        <a class="head-link" href="${co ? 'account.html' : 'signin.html'}">${UI.user}<span><small>${co ? AX.esc(u.name) : 'Hello, sign in'}</small>${co ? AX.esc(co.name.replace(/,? (LLC|Inc\.?)$/, '')) : 'Business account'}</span>${pending ? `<b class="dot-badge" title="Orders awaiting your approval">${pending}</b>` : ''}</a>
        <a class="head-link cart-link" href="cart.html">${UI.cart}<span><small>Cart</small><b id="cart-count">${s.cartCount()}</b> items</span></a>
      </nav>
    </div></header>
    <nav class="cat-nav" id="cat-nav" aria-label="Categories"><div class="wrap">
      <a href="shop.html" class="${here === 'shop.html' && !AX.qs('cat') ? 'on' : ''}">All products</a>
      ${AX.categories.map(c => `<a href="shop.html?cat=${c.id}" class="${AX.qs('cat') === c.id ? 'on' : ''}">${c.name}</a>`).join('')}
    </div></nav>`;
  }
  function footer() {
    return `<footer class="site-footer"><div class="wrap">
      <div class="foot-grid">
        <div><a class="brand light" href="index.html"><img src="favicon.svg" alt="" width="28" height="28"><span>Axiomate<em>Shop</em></span></a>
          <p>Business supplies from six fictional locations. A concept store by Axiomate.</p>
          <p class="small">${AX.company.phone} · ${AX.company.email}</p></div>
        <div><h4>Shop</h4>${AX.categories.slice(0, 5).map(c => `<a href="shop.html?cat=${c.id}">${c.name}</a>`).join('')}</div>
        <div><h4>Business</h4><a href="business.html">How buying works</a><a href="apply.html">Apply for Net 30 terms</a><a href="account.html">Account dashboard</a><a href="account.html#quotes">Quotes</a><a href="account.html#invoices">Invoices</a></div>
        <div><h4>Locations</h4>${AX.locations.map(l => `<a href="locations.html#${l.id}">${l.short}</a>`).join('')}</div>
      </div>
      <div class="foot-base"><span>© ${new Date().getFullYear()} Axiomate Supply Co. (fictional). Concept project: no real products, orders or payments.</span><span><a href="#" id="reset-demo">Reset demo data</a></span></div>
    </div></footer>`;
  }
  AX.renderChrome = () => {
    const h = AX.$('#ax-header'), f = AX.$('#ax-footer');
    if (h) h.innerHTML = header();
    if (f && !f.innerHTML) f.innerHTML = footer();
    const bb = AX.$('#branch-btn'); if (bb) bb.onclick = AX.branchPicker;
    const nt = AX.$('#nav-toggle'); if (nt) nt.onclick = () => AX.$('#cat-nav').classList.toggle('open');
    const rd = AX.$('#reset-demo'); if (rd) rd.onclick = e => { e.preventDefault(); if (confirm('Reset all demo data in this browser (cart, orders, accounts)?')) { st().reset(); location.href = 'index.html'; } };
  };

  AX.page = fn => {
    document.addEventListener('DOMContentLoaded', () => {
      st().syncCredits();
      AX.renderChrome();
      const run = () => { try { fn(); } catch (e) { console.error(e); } };
      const typing = () => { const a = document.activeElement; return a && /INPUT|TEXTAREA|SELECT/.test(a.tagName) && a.closest('main'); };
      st().on(() => { AX.renderChrome(); if (fn.rerender !== false) run(); });
      run();
      if (fn.live) setInterval(() => { if (typing() || AX.$('.modal-wrap')) return; st().syncCredits(); run(); }, 15000);
    });
  };
})();
