(function () {
  const s = AX.store;
  function decide(d) {
    const years = +d.years, spend = +d.spend, req = +d.requested;
    if (years < 1) return { approved: false, limit: 0, tier: 'Standard', pct: 0, reason: 'Businesses under a year old start on card or ACH. Net 30 opens after 6 months of on-time payments.' };
    let cap = Math.max(2500, spend * 2.5);
    if (years >= 3) cap *= 1.5;
    if (years >= 10) cap *= 1.3;
    if (+d.employees >= 50) cap *= 1.2;
    let limit = Math.min(req || cap, cap);
    limit = Math.max(2500, Math.floor(limit / 500) * 500);
    const tier = spend >= 10000 ? 'Gold' : spend >= 3000 ? 'Silver' : 'Standard';
    const pct = { Gold: .05, Silver: .03, Standard: 0 }[tier];
    return { approved: true, limit, tier, pct, reason: limit < req ? `Approved for ${AX.money(limit)} to start. You can request an increase after 90 days of on-time payments.` : 'Approved for the full amount requested.' };
  }

  function view() {
    AX.$('#main').innerHTML = `<div class="wrap" style="max-width:920px">
      <div class="page-head"><div class="crumbs"><a href="business.html">Business accounts</a> / Apply</div><h1>Open a business account</h1>
        <p class="muted">Get an instant decision on Net 30 terms. <strong>This is a concept store: use made-up details.</strong> Nothing leaves your browser.</p></div>
      <form id="app" class="two" novalidate><div>
        <section class="co-step"><h2><b>1</b>Business</h2>
          <label class="field"><span>Legal business name</span><input type="text" name="name" required placeholder="e.g. Bluebird Dental Group, PLLC"></label>
          <div class="row"><label class="field"><span>Industry</span><select name="industry"><option>Construction & trades</option><option>Professional services</option><option>Healthcare</option><option>Education</option><option>Manufacturing</option><option>Hospitality</option><option>Government / nonprofit</option><option>Retail</option><option>Other</option></select></label>
          <label class="field"><span>Federal tax ID (EIN)</span><input type="text" name="ein" placeholder="12-3456789" inputmode="numeric" maxlength="10"><small>Demo: any 9 digits. Never enter a real EIN.</small></label></div>
          <div class="row3"><label class="field"><span>Years in business</span><input type="number" name="years" min="0" value="4" required></label>
          <label class="field"><span>Employees</span><input type="number" name="employees" min="1" value="25"></label>
          <label class="field"><span>State</span><select name="state">${AX.stateOptions('WA')}</select></label></div>
        </section>
        <section class="co-step"><h2><b>2</b>Ship-to & contact</h2>
          <label class="field"><span>Primary ship-to street</span><input type="text" name="line1" required placeholder="Made-up address"></label>
          <div class="row"><label class="field"><span>City</span><input type="text" name="city" required></label><label class="field"><span>ZIP</span><input type="text" name="zip" required inputmode="numeric" maxlength="10"></label></div>
          <div class="row"><label class="field"><span>Your name</span><input type="text" name="contact" required></label><label class="field"><span>Job title</span><input type="text" name="title" value="Office Manager"></label></div>
        </section>
        <section class="co-step"><h2><b>3</b>Credit request</h2>
          <div class="row"><label class="field"><span>Estimated monthly spend</span><input type="number" name="spend" min="0" step="100" value="2500"></label>
          <label class="field"><span>Credit line requested</span><input type="number" name="requested" min="0" step="500" value="10000"></label></div>
          <label class="check"><input type="checkbox" name="po"><span>Require a PO number on every order</span></label>
          <label class="check" style="margin-top:8px"><input type="checkbox" name="terms" required><span>I agree to Net 30 terms: invoices are due 30 days after shipment. Past-due balances pause ordering on terms. (Demo terms; nothing is binding.)</span></label>
        </section>
      </div>
      <aside class="summary"><h3>What happens next</h3>
        <ol class="small" style="padding-left:18px;margin:0 0 14px">
          <li>We score the application on time in business, size and expected spend.</li>
          <li>Approved accounts get a credit line and pricing tier right away.</li>
          <li>You become the account admin and can add buyers with order limits.</li>
          <li>New businesses start on card or ACH and can apply for terms later.</li></ol>
        <div class="plan"><div><span>Gold tier</span><span>$10k+/mo · 5% off</span></div><div><span>Silver tier</span><span>$3k+/mo · 3% off</span></div><div><span>Standard</span><span>list price</span></div></div>
        <div id="app-err"></div>
        <button class="btn btn-accent btn-lg btn-block" style="margin-top:14px">Submit application</button></aside>
      </form></div>`;

    AX.$('#app').onsubmit = e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(e.target).entries());
      const miss = ['name', 'line1', 'city', 'zip', 'contact'].filter(k => !(d[k] || '').trim());
      if (miss.length || !d.terms) { AX.$('#app-err').innerHTML = `<div class="notice red small" style="margin-top:12px">${miss.length ? 'Fill in the business name, address and your name.' : 'Accept the terms to continue.'}</div>`; return; }
      if (d.ein && d.ein.replace(/\D/g, '').length !== 9) { AX.$('#app-err').innerHTML = '<div class="notice red small" style="margin-top:12px">An EIN has 9 digits (any made-up number works).</div>'; return; }
      const r = decide(d);
      const co = s.newCompany({
        name: d.name.trim(), industry: d.industry, account: 'AXB-' + String(200000 + Math.floor(Math.random() * 99999)),
        tier: r.tier, contractPct: r.pct, creditLimit: r.limit, terms: 'Net 30', poRequired: !!d.po,
        card: { brand: 'Business card', last4: String(1000 + Math.floor(Math.random() * 8999)) },
        addresses: [{ id: 'a1', label: 'Main office', attn: d.contact.trim(), line1: d.line1.trim(), city: d.city.trim(), state: d.state, zip: d.zip.trim(), dock: false }],
        users: [{ id: 'u1', name: d.contact.trim(), title: d.title.trim(), email: '', role: 'admin', limit: r.limit || 0 }]
      });
      s.signIn(co.id, 'u1');
      AX.modal(`<h2>${r.approved ? 'Approved' : 'Account opened'}</h2>
        <p>${AX.esc(co.name)} is set up as account <span class="mono">${co.account}</span>.</p>
        <div class="plan" style="margin-bottom:12px"><div><span>Terms</span><strong>${r.approved ? 'Net 30' : 'Card / ACH'}</strong></div><div><span>Credit line</span><strong>${r.approved ? AX.money(r.limit) : '—'}</strong></div><div><span>Pricing tier</span><strong>${r.tier}${r.pct ? ' · ' + r.pct * 100 + '% off' : ''}</strong></div></div>
        <p class="small muted">${r.reason}</p>
        <div class="modal-actions"><a class="btn btn-ghost" href="account.html#company">Add buyers</a><a class="btn btn-primary" href="shop.html">Start shopping</a></div>`);
    };
  }
  view.rerender = false;
  AX.page(view);
})();
