AX.page(function home() {
  const s = AX.store, co = s.company(), L = AX.locById[s.state.branch];
  const featured = ['AX-PP-2001', 'AX-FN-4001', 'AX-TC-3002', 'AX-SF-6001', 'AX-BR-5001', 'AX-MR-7001', 'AX-SH-8001', 'AX-TC-3004', 'AX-BR-5003', 'AX-OF-1001'].map(k => AX.bySku[k]);

  AX.$('#main').innerHTML = `
  <section class="hero"><div class="wrap">
    <div>
      <span class="eyebrow">Business supply, done properly</span>
      <h1>Everything your business runs on, <span>on terms that fit.</span></h1>
      <p class="lede">Office, tech, furniture, safety and warehouse supplies from three distribution centers and three local branches. Buy on Net 30 with PO numbers, approvals and one monthly statement.</p>
      <div class="ctas">
        ${co ? `<a class="btn btn-accent btn-lg" href="shop.html">Start an order</a><a class="btn btn-ghost btn-lg" href="account.html">${AX.esc(co.name.split(',')[0])} dashboard</a>`
             : `<a class="btn btn-accent btn-lg" href="shop.html">Shop the catalog</a><a class="btn btn-ghost btn-lg" href="signin.html">Try the demo business account</a>`}
      </div>
      <div class="hero-stats">
        <div><strong>6</strong>locations</div><div><strong>4 PM</strong>same-day ship cutoff</div><div><strong>Net 30</strong>terms for approved accounts</div><div><strong>1–2 days</strong>ground in-region</div>
      </div>
    </div>
    <div class="hero-card" aria-label="Example purchase order">
      <h3><span>PO KR-24-1262</span><span class="badge green">Approved</span></h3>
      <div class="muted small">Kestrel Ridge Engineering · requested by Sam Okafor · approved by Jordan Avery</div>
      <div style="margin-top:12px">
        <div class="po-line"><span>Copy Paper, 20 lb · 12 cases</span><strong>${AX.money(12 * s.unitPrice(AX.bySku['AX-PP-2001'], 12, { contractPct: .03 }))}</strong></div>
        <div class="po-line"><span>Ergo Mesh Task Chair · 6</span><strong>${AX.money(6 * s.unitPrice(AX.bySku['AX-FN-4001'], 6, { contractPct: .03 }))}</strong></div>
        <div class="po-line"><span>Nitrile Gloves, L · 20 boxes</span><strong>${AX.money(20 * s.unitPrice(AX.bySku['AX-SF-6001'], 20, { contractPct: .03 }))}</strong></div>
      </div>
      <div class="mini-steps"><i class="on"></i><i class="on"></i><i class="on"></i><i></i></div>
      <div class="small muted">Shipped from Harbor Point DC · invoice due in 30 days</div>
    </div>
  </div></section>

  <div class="wrap">
    <section class="section">
      <div class="section-head"><h2>Shop by category</h2><a href="shop.html">View all products →</a></div>
      <div class="cats">${AX.categories.map(c => {
        const p = AX.products.find(p => p.cat === c.id);
        return `<a class="cat-card" href="shop.html?cat=${c.id}" style="--cat:${c.color}"><span class="ic">${AX.icon(p.icon)}</span><span><strong>${c.name}</strong><small>${c.blurb}</small></span></a>`;
      }).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Reordered most by businesses</h2><span class="muted small">Stock shown for ${AX.esc(L.short)}</span></div>
      <div class="grid">${featured.map(AX.tile).join('')}</div>
    </section>

    <section class="section">
      <div class="section-head"><h2>How business buying works here</h2><a href="business.html">Full details →</a></div>
      <div class="steps">
        <div class="step"><h3>Open a business account</h3><p>Apply in a few minutes. Established businesses get a Net 30 credit line, newer ones start on card or ACH.</p></div>
        <div class="step"><h3>Set buyers and limits</h3><p>Add buyers with order limits. Anything over a buyer's limit waits for a manager to approve it.</p></div>
        <div class="step"><h3>Order with a PO</h3><p>Every order carries your PO and job number. Ship it, or pick it up at a branch counter.</p></div>
        <div class="step"><h3>Pay one invoice</h3><p>Each shipment is invoiced with 30-day terms. Pay by ACH from the dashboard, or ask us for a quote on big orders.</p></div>
      </div>
    </section>

    <section class="section">
      <div class="band">
        <div>
          <span class="eyebrow" style="color:var(--blue)">Our network</span>
          <h2 style="font-size:26px">Three distribution centers. Three branches.</h2>
          <p>Orders ship from the DC closest to your delivery address. If it's short on stock, we transfer from another DC instead of making you wait. Branches restock overnight from their parent DC for next-morning pickup.</p>
          <p class="small muted">Your branch: <strong>${AX.esc(L.name)}</strong>, ${AX.esc(L.city)}, ${L.state}. ${AX.esc(L.counter)}.</p>
          <a class="btn btn-primary" href="locations.html">See all locations</a>
        </div>
        ${AX.netmap(s.state.branch)}
      </div>
    </section>
  </div>`;
});
