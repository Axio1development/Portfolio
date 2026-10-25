(function () {
  function view() {
    const s = AX.store, p = AX.bySku[AX.qs('sku')], main = AX.$('#main');
    if (!p) { main.innerHTML = `<div class="wrap"><div class="card empty" style="margin-top:32px"><h2>Product not found</h2><p>That SKU isn't in the catalog.</p><a class="btn btn-primary" href="shop.html">Browse the catalog</a></div></div>`; return; }
    document.title = p.name + ' · Axiomate Shop';
    const co = s.company(), c = AX.catById[p.cat], tiers = s.tiers(p);
    const related = AX.products.filter(x => x.cat === p.cat && x.sku !== p.sku).slice(0, 4);
    const avail = AX.locations.map(l => { const n = s.stock(p.sku, l.id);
      return `<li class="${l.id === s.state.branch ? 'me' : ''}"><span>${AX.esc(l.short)}${l.id === s.state.branch ? ' <span class="badge blue">My branch</span>' : ''}<br><small class="muted">${l.city}, ${l.state} · ${l.type === 'dc' ? 'Ships & will-call' : 'Counter pickup'}</small></span><span class="n ${n ? '' : 'zero'}">${n ? n.toLocaleString() + ' on hand' : 'None'}</span></li>`; }).join('');

    main.innerHTML = `<div class="wrap">
      <div class="page-head" style="padding-bottom:8px"><div class="crumbs"><a href="index.html">Home</a> / <a href="shop.html?cat=${c.id}">${c.name}</a> / <span class="mono">${p.sku}</span></div></div>
      <div class="pdp">
        <div>${AX.thumb(p, 'lg')}
          <div class="card" style="margin-top:16px"><h3>Availability by location</h3><ul class="avail">${avail}</ul>
            <p class="small muted" style="margin:10px 0 0">Live counts from each location's inventory. Branches restock overnight from their parent DC.</p></div>
        </div>
        <div class="pdp-info">
          <div class="muted small">${AX.esc(p.brand)}</div>
          <h1>${AX.esc(p.name)}</h1>
          <div class="pdp-meta"><span>SKU <span class="mono">${p.sku}</span></span><span>Unit: ${p.unit} (${AX.esc(p.pack)})</span></div>
          <p>${AX.esc(p.desc)}</p>
          <div class="flags">
            ${p.heavy ? '<span class="badge amber">Ships LTL freight</span>' : '<span class="badge">Ships parcel</span>'}
            ${p.hazmat ? '<span class="badge red">Ground only · limited-quantity hazmat</span>' : ''}
            ${p.dcOnly ? '<span class="badge">Stocked at DCs only</span>' : '<span class="badge green">Branch pickup available</span>'}
            ${p.noContract ? '<span class="badge">Contract discount not applicable</span>' : ''}
            ${['furniture', 'tech'].includes(p.cat) ? '<span class="badge">15% restocking fee on returns</span>' : '<span class="badge">30-day returns</span>'}
          </div>
          <h3 style="margin-top:22px">Specifications</h3>
          <table class="specs">${Object.entries(p.specs).map(([k, v]) => `<tr><th>${AX.esc(k)}</th><td>${AX.esc(v)}</td></tr>`).join('')}
            <tr><th>Category</th><td>${c.name}</td></tr><tr><th>Unit of measure</th><td>${p.unit.toUpperCase()} · ${AX.esc(p.pack)}</td></tr></table>
        </div>
        <aside class="buybox">
          <div id="pricebox"></div>
          <table class="tier-table" id="tiers"><thead><tr><th>Quantity</th><th>Price / ${p.unit}</th><th>Save</th></tr></thead><tbody></tbody></table>
          <div style="display:flex;gap:10px;align-items:center;margin-bottom:12px">
            <div class="qty"><button type="button" data-step="-1" aria-label="Less">−</button><input id="qty" type="number" min="1" value="1" aria-label="Quantity"><button type="button" data-step="1" aria-label="More">+</button></div>
            <button class="btn btn-accent" style="flex:1" data-add="${p.sku}" data-qty="#qty">Add to cart</button>
          </div>
          <button class="btn btn-ghost btn-block" id="quote-btn">Request a volume quote</button>
          <div id="est" style="margin-top:16px"></div>
        </aside>
      </div>
      ${related.length ? `<section class="section"><div class="section-head"><h2>More in ${c.name}</h2></div><div class="grid">${related.map(AX.tile).join('')}</div></section>` : ''}
    </div>`;

    const qtyEl = AX.$('#qty');
    AX.$$('[data-step]').forEach(b => b.onclick = () => { qtyEl.value = Math.max(1, (parseInt(qtyEl.value, 10) || 1) + +b.dataset.step); refresh(); });
    qtyEl.oninput = refresh;
    AX.$('#quote-btn').onclick = () => quoteModal(p, parseInt(qtyEl.value, 10) || 1);

    function refresh() {
      const qty = Math.max(1, parseInt(qtyEl.value, 10) || 1), co = s.company();
      const unit = s.unitPrice(p, qty, co);
      AX.$('#pricebox').innerHTML = `<div class="price-big">${AX.money(unit)} <small>/ ${p.unit}</small></div>
        ${co && !p.noContract && co.contractPct ? `<div class="small" style="color:var(--green)">${co.tier} contract price: ${Math.round(co.contractPct * 100)}% off list (${AX.money(p.price)})</div>` : !co ? `<div class="small muted">List price. <a href="signin.html">Sign in</a> for your contract price.</div>` : ''}
        <div class="small muted" style="margin-top:4px">Line total: <strong style="color:var(--ink)">${AX.money(unit * qty)}</strong></div>`;
      AX.$('#tiers tbody').innerHTML = tiers.map((t, i) => { const nx = tiers[i + 1]; const on = qty >= t.min && (!nx || qty < nx.min);
        return `<tr class="${on ? 'on' : ''}"><td>${t.min}${nx ? '–' + (nx.min - 1) : '+'}</td><td>${AX.money(s.unitPrice(p, t.min, co))}</td><td>${t.pct ? Math.round(t.pct * 100) + '%' : '—'}</td></tr>`; }).join('');
      const st = s.state.destState, ship = s.plan([{ sku: p.sku, qty }], { method: 'ship', state: st, service: p.heavy ? 'ltl' : 'ground' });
      const pick = s.plan([{ sku: p.sku, qty }], { method: 'pickup', branch: s.state.branch });
      const sl = ship.lines[0], pk = pick.lines[0], B = AX.locById[s.state.branch];
      const from = sl.alloc.map(a => `${a.qty} from ${AX.locById[a.loc].short}${a.transfer ? ' (out of region)' : ''}`).join(', ');
      AX.$('#est').innerHTML = `
        <label class="field" style="margin-bottom:8px"><span>Deliver to</span><select id="dest">${AX.stateOptions(st)}</select></label>
        <div class="plan">
          <div><span>${p.heavy ? 'LTL freight' : 'Ground'} delivery</span><strong>${ship.eta ? AX.range(ship.eta) : '—'}</strong></div>
          ${from ? `<div class="muted"><span>Ships ${from}</span></div>` : ''}
          ${sl.backorder ? `<div style="color:var(--red)"><span>${sl.backorder} backordered</span><span>restock ~${AX.day(sl.restock)}</span></div>` : ''}
        </div>
        <div class="plan">
          <div><span>Pickup at ${AX.esc(B.short)}</span><strong>${pick.eta ? (pk.alloc.every(a => !a.transfer) && new Date(pick.eta.from).toDateString() === new Date().toDateString() ? 'Today, ~2 hrs' : AX.day(pick.eta.from) + ', 9 AM') : '—'}</strong></div>
          ${pk.alloc.some(a => a.transfer) ? `<div class="muted"><span>${pk.alloc.filter(a => a.transfer).reduce((t, a) => t + a.qty, 0)} transferred overnight from ${AX.locById[B.parent || B.id].short}</span></div>` : ''}
          ${pk.backorder ? `<div style="color:var(--red)"><span>${pk.backorder} not available for pickup</span></div>` : ''}
        </div>`;
      AX.$('#dest').onchange = e => { s.setDestState(e.target.value); refresh(); };
    }
    refresh();
  }

  function quoteModal(p, qty) {
    const s = AX.store;
    if (!s.company()) {
      AX.modal(`<h2>Quotes are for business accounts</h2><p>Sign in or open a business account to request volume pricing. Our account team responds within one business day (about a minute in this demo).</p>
        <div class="modal-actions"><a class="btn btn-ghost" href="apply.html">Open an account</a><a class="btn btn-primary" href="signin.html?next=${encodeURIComponent(location.pathname.split('/').pop() + location.search)}">Sign in</a></div>`);
      return;
    }
    AX.modal(`<h2>Request a volume quote</h2><p class="muted">${AX.esc(p.name)} · current price ${AX.money(s.unitPrice(p, qty))} / ${p.unit}</p>
      <label class="field"><span>Quantity</span><input type="number" id="q-qty" min="1" value="${Math.max(qty, s.tiers(p).slice(-1)[0].min)}"></label>
      <label class="field"><span>Notes for your account manager</span><textarea id="q-note" placeholder="Delivery schedule, job name, competing quote…"></textarea></label>
      <p class="small muted">${AX.company.rep.name}, your ${AX.company.rep.title.toLowerCase()}, reviews quotes. Accepted quotes hold their price for 30 days.</p>
      <div class="modal-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="q-send">Submit request</button></div>`,
      (m, close) => m.querySelector('#q-send').onclick = () => {
        const q = s.requestQuote([{ sku: p.sku, qty: Math.max(1, parseInt(m.querySelector('#q-qty').value, 10) || 1) }], m.querySelector('#q-note').value);
        close(); AX.toast('Quote ' + q.id + ' submitted', { href: 'account.html#quotes', label: 'View quotes' });
      });
  }

  view.rerender = false;
  AX.page(view);
})();
