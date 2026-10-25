(function () {
  const s = AX.store;
  let f = null;

  function init() {
    const co = s.company();
    const addr = co && co.addresses[0];
    f = {
      method: 'ship', branch: s.state.branch, service: 'ground', acc: addr && !addr.dock ? ['liftgate', 'appt'] : ['appt'],
      addrId: addr ? addr.id : 'new',
      address: addr ? Object.assign({}, addr) : { attn: '', company: '', line1: '', city: '', state: s.state.destState || 'WA', zip: '' },
      newAddr: { attn: '', company: co ? co.name : '', line1: '', city: '', state: s.state.destState || 'WA', zip: '' },
      po: '', job: '', notes: '', contact: { name: '', email: '' },
      payment: co && co.creditLimit ? 'net30' : 'card'
    };
  }
  const cur = () => (f.addrId === 'new' ? f.newAddr : f.address);

  function view() {
    const co = s.company(), u = s.user(), main = AX.$('#main');
    if (!s.state.cart.length) { main.innerHTML = `<div class="wrap"><div class="card empty" style="margin-top:32px"><h2>Nothing to check out</h2><p>Your cart is empty.</p><a class="btn btn-accent" href="shop.html">Shop the catalog</a></div></div>`; return; }
    if (!f) init();
    const a = cur();
    const fx = { method: f.method, branch: f.branch, state: a.state, service: f.service, acc: f.acc };
    const priced = s.priceLines(s.state.cart);
    const shipOpts = s.shippingOptions(priced);
    if (f.method === 'ship' && !shipOpts.find(o => o.id === f.service && !o.disabled)) f.service = fx.service = shipOpts[0].id;
    const t = s.totals(s.state.cart, fx);
    const cr = s.credit(co);
    const needsApproval = co && u.role === 'buyer' && t.total > u.limit;
    const approver = co && co.users.find(x => x.role !== 'buyer');
    const pl = s.plan(s.state.cart, fx);
    if (f.payment === 'net30' && (!co || !co.creditLimit)) f.payment = 'card';

    const planRows = pl.lines.map(pl1 => {
      const p = AX.bySku[pl1.sku];
      return pl1.alloc.map(x => `<div><span>${x.qty} × ${AX.esc(p.name.slice(0, 44))}${p.name.length > 44 ? '…' : ''}</span><span>${f.method === 'pickup' ? (x.transfer ? 'Transfer from ' + AX.locById[x.loc].short : 'On the shelf') : AX.locById[x.loc].short + (x.transfer ? ' (transfer)' : '')}</span></div>`).join('')
        + (pl1.backorder ? `<div style="color:var(--red)"><span>${pl1.backorder} × ${AX.esc(p.name.slice(0, 44))} backordered</span><span>ships ~${AX.day(pl1.restock)}</span></div>` : '');
    }).join('');

    const etaFor = svc => { const e = s.plan(s.state.cart, Object.assign({}, fx, { service: svc })).eta; return e ? AX.range(e) : 'Backordered'; };

    const shipBlock = `
      ${co ? `<div class="opts" style="margin-bottom:14px">${co.addresses.map(ad => `
        <label class="opt"><input type="radio" name="addr" value="${ad.id}" ${f.addrId === ad.id ? 'checked' : ''}><span class="grow"><strong>${AX.esc(ad.label)}</strong><small>${AX.esc(ad.attn)} · ${AX.esc(ad.line1)}, ${AX.esc(ad.city)}, ${ad.state} ${ad.zip}${ad.dock ? ' · loading dock' : ''}</small></span></label>`).join('')}
        <label class="opt"><input type="radio" name="addr" value="new" ${f.addrId === 'new' ? 'checked' : ''}><span class="grow"><strong>Ship somewhere else</strong><small>Job site, new office, one-off delivery</small></span></label></div>` : ''}
      ${f.addrId === 'new' ? `
        <div class="row"><label class="field"><span>Attention / recipient</span><input type="text" data-k="newAddr.attn" value="${AX.esc(f.newAddr.attn)}" autocomplete="name"></label>
        <label class="field"><span>Company</span><input type="text" data-k="newAddr.company" value="${AX.esc(f.newAddr.company)}" autocomplete="organization"></label></div>
        <label class="field"><span>Street address</span><input type="text" data-k="newAddr.line1" value="${AX.esc(f.newAddr.line1)}" autocomplete="street-address"></label>
        <div class="row3"><label class="field"><span>City</span><input type="text" data-k="newAddr.city" value="${AX.esc(f.newAddr.city)}"></label>
        <label class="field"><span>State</span><select data-k="newAddr.state" data-re>${AX.stateOptions(f.newAddr.state)}</select></label>
        <label class="field"><span>ZIP</span><input type="text" inputmode="numeric" maxlength="10" data-k="newAddr.zip" value="${AX.esc(f.newAddr.zip)}"></label></div>
        <p class="small muted" style="margin-top:-6px">Demo: use a made-up address. It's stored only in this browser.</p>` : ''}
      <h3 style="margin-top:8px">Delivery method</h3>
      <div class="opts">${shipOpts.map(o => `<label class="opt${o.disabled ? ' disabled' : ''}"><input type="radio" name="svc" value="${o.id}" ${f.service === o.id ? 'checked' : ''} ${o.disabled ? 'disabled' : ''}>
        <span class="grow"><strong>${o.name}</strong><small>${o.disabled ? o.note : 'Arrives ' + etaFor(o.id) + ' · ' + o.note}</small></span><span class="price">${o.disabled ? '' : o.price ? AX.money(o.price) : 'Free'}</span></label>`).join('')}</div>
      ${f.service === 'ltl' ? `<h3 style="margin-top:16px">Freight services</h3><div class="opts">${s.ACCESSORIALS.map(x => `<label class="check"><input type="checkbox" name="acc" value="${x.id}" ${f.acc.includes(x.id) ? 'checked' : ''}><span><strong>${x.name}</strong> ${x.price ? '· ' + AX.money(x.price) : '· Free'}<br><small class="muted">${x.note}</small></span></label>`).join('')}</div>` : ''}`;

    const pickBlock = `<div class="opts">${AX.locations.map(l => {
        const e = s.plan(s.state.cart, { method: 'pickup', branch: l.id });
        const ok = e.lines.every(x => !x.backorder), today = e.eta && new Date(e.eta.from).toDateString() === new Date().toDateString();
        return `<label class="opt"><input type="radio" name="branch" value="${l.id}" ${f.branch === l.id ? 'checked' : ''}><span class="grow"><strong>${AX.esc(l.name)}</strong>
          <small>${AX.esc(l.street)}, ${l.city}, ${l.state} · ${AX.esc(l.counter)}</small>
          <small style="color:${ok ? (today ? 'var(--green)' : 'var(--blue)') : 'var(--red)'}">${!e.eta ? 'Nothing available here' : today ? 'Ready today in about 2 hours' : 'Ready ' + AX.day(e.eta.from) + ' at 9 AM'}${ok ? '' : ' · some items backordered'}</small></span><span class="price">Free</span></label>`; }).join('')}</div>
      <p class="small muted" style="margin-top:10px">Bring your order number. Whoever picks up signs at the counter; for business accounts, any authorized buyer can collect.</p>`;

    const payOpts = [];
    if (co && co.creditLimit) {
      const ok = t.total <= cr.available;
      payOpts.push(`<label class="opt${ok ? '' : ' disabled'}"><input type="radio" name="pay" value="net30" ${f.payment === 'net30' ? 'checked' : ''} ${ok ? '' : 'disabled'}><span class="grow"><strong>Net 30 on account</strong>
        <small>${ok ? `Invoiced when it ships, due 30 days later. ${AX.money(cr.available)} of ${AX.money(cr.limit)} available.` : `Over available credit (${AX.money(cr.available)}). Pay an open invoice or use card/ACH.`}</small></span></label>`);
    } else if (co) {
      payOpts.push(`<div class="opt disabled"><span class="grow"><strong>Net 30 on account</strong><small>Not on this account yet. Terms open after 6 months of on-time card/ACH payments.</small></span></div>`);
    }
    payOpts.push(`<label class="opt"><input type="radio" name="pay" value="card" ${f.payment === 'card' ? 'checked' : ''}><span class="grow"><strong>${co && co.card ? AX.esc(co.card.brand) + ' •••• ' + co.card.last4 : 'Credit card (simulated)'}</strong>
      <small>Authorized now, charged when it ships.${co && co.card ? '' : ' Demo: no card details are collected.'}</small></span></label>`);
    if (co && co.ach) payOpts.push(`<label class="opt"><input type="radio" name="pay" value="ach" ${f.payment === 'ach' ? 'checked' : ''}><span class="grow"><strong>ACH bank debit · ${AX.esc(co.ach.bank)} •••• ${co.ach.last4}</strong><small>Debited when it ships. No card fees.</small></span></label>`);

    main.innerHTML = `<div class="wrap">
      <div class="page-head"><div class="crumbs"><a href="cart.html">Cart</a> / Checkout</div><h1>Checkout</h1>
        ${co ? `<p class="muted">Ordering for <strong>${AX.esc(co.name)}</strong> as ${AX.esc(u.name)} (${u.role === 'buyer' ? 'buyer, ' + AX.money(u.limit) + ' limit' : u.role})</p>` : `<p class="muted">Checking out as a guest. <a href="signin.html?next=checkout.html">Sign in</a> for Net 30, saved addresses and contract pricing.</p>`}</div>
      <div class="two"><div>
        <section class="co-step"><h2><b>1</b>Fulfillment</h2>
          <div class="seg">
            <label class="opt"><input type="radio" name="method" value="ship" ${f.method === 'ship' ? 'checked' : ''}><span class="grow"><strong>Ship it</strong><small>From the DC closest to the address</small></span></label>
            <label class="opt"><input type="radio" name="method" value="pickup" ${f.method === 'pickup' ? 'checked' : ''}><span class="grow"><strong>Pick it up</strong><small>Free counter or will-call pickup</small></span></label>
          </div>
          ${f.method === 'ship' ? shipBlock : pickBlock}
          <div class="plan"><div><strong>Fulfillment plan</strong><span class="muted">${f.method === 'ship' ? 'Ships from' : 'Source'}</span></div>${planRows}</div>
        </section>
        <section class="co-step"><h2><b>2</b>Purchase details</h2>
          ${co ? '' : `<div class="row"><label class="field"><span>Your name</span><input type="text" data-k="contact.name" value="${AX.esc(f.contact.name)}" autocomplete="name"></label>
            <label class="field"><span>Email for order updates</span><input type="email" data-k="contact.email" value="${AX.esc(f.contact.email)}" autocomplete="email"><small>Demo: no email is sent.</small></label></div>`}
          <div class="row"><label class="field"><span>PO number ${co && co.poRequired ? '<em style="color:var(--red);font-style:normal">· required by your company</em>' : '(optional)'}</span><input type="text" data-k="po" value="${AX.esc(f.po)}" placeholder="${co ? 'e.g. KR-24-1270' : 'Optional'}"></label>
          <label class="field"><span>Job / cost center</span><input type="text" data-k="job" value="${AX.esc(f.job)}" placeholder="Shown on the invoice"></label></div>
          <label class="field"><span>Delivery or order notes</span><textarea data-k="notes" placeholder="Gate code, receiving hours, call before delivery…">${AX.esc(f.notes)}</textarea></label>
        </section>
        <section class="co-step"><h2><b>3</b>Payment</h2>
          <div class="opts">${payOpts.join('')}</div>
          <p class="small muted" style="margin-top:12px">${t.taxRate === 0 && co && co.taxExempt ? `Tax exempt: certificate ${AX.esc(co.exemptCert.number)} on file.` : `Sales tax uses the ${AX.states[t.taxState][0]} base rate (${AX.states[t.taxState][1]}%).${co ? ' Tax exempt? Add a certificate in <a href="account.html#company">Company settings</a>.' : ''}`}</p>
        </section>
      </div>
      <aside class="summary">
        <h3>Summary</h3>
        ${t.priced.map(l => `<div class="sum-row"><span>${l.qty} × ${AX.esc(l.p.name.length > 34 ? l.p.name.slice(0, 34) + '…' : l.p.name)}</span><span>${AX.money(l.ext)}</span></div>`).join('')}
        <div class="sum-row" style="border-top:1px solid var(--line);margin-top:8px;padding-top:12px"><span>Subtotal</span><strong>${AX.money(t.subtotal)}</strong></div>
        ${t.savings > 0 ? `<div class="sum-row save"><span>Savings</span><span>−${AX.money(t.savings)}</span></div>` : ''}
        <div class="sum-row"><span>${f.method === 'pickup' ? 'Pickup' : (shipOpts.find(o => o.id === f.service) || shipOpts[0]).name}</span><span>${t.shipping ? AX.money(t.shipping) : 'Free'}</span></div>
        ${t.accessorials ? `<div class="sum-row"><span>Freight services</span><span>${AX.money(t.accessorials)}</span></div>` : ''}
        <div class="sum-row"><span>Sales tax (${t.taxState})</span><span>${AX.money(t.tax)}</span></div>
        <div class="sum-row total"><span>Total</span><span>${AX.money(t.total)}</span></div>
        ${needsApproval ? `<div class="notice amber small" style="margin-top:12px">Over your ${AX.money(u.limit)} limit: this goes to <strong>${AX.esc(approver ? approver.name : 'an approver')}</strong> for approval before it's released to the warehouse.</div>` : ''}
        <div id="err"></div>
        <button class="btn btn-accent btn-lg btn-block" id="place" style="margin-top:12px">${needsApproval ? 'Submit for approval' : 'Place order'}</button>
        <p class="small muted" style="margin-top:10px">Concept store: placing an order only updates this demo. Nothing ships and nothing is charged.</p>
      </aside></div></div>`;

    main.oninput = e => { const k = e.target.dataset.k; if (!k || e.target.tagName === 'SELECT') return; const [a1, b1] = k.split('.'); if (b1) f[a1][b1] = e.target.value; else f[a1] = e.target.value; };
    main.onchange = e => {
      const el = e.target;
      if (el.dataset.k && el.tagName === 'SELECT') { const [a1, b1] = el.dataset.k.split('.'); f[a1][b1] = el.value; if (a1 === 'newAddr') s.setDestState(el.value); return view(); }
      if (el.name === 'method') f.method = el.value;
      else if (el.name === 'addr') { f.addrId = el.value; const ad = co && co.addresses.find(x => x.id === el.value); if (ad) { f.address = Object.assign({}, ad); f.acc = ad.dock ? ['appt'] : ['liftgate', 'appt']; } }
      else if (el.name === 'svc') f.service = el.value;
      else if (el.name === 'acc') f.acc = AX.$$('input[name=acc]:checked').map(i => i.value);
      else if (el.name === 'branch') f.branch = el.value;
      else if (el.name === 'pay') f.payment = el.value;
      else return;
      view();
    };
    AX.$('#place').onclick = () => {
      try {
        const ad = cur();
        if (!co && f.method === 'ship' && !ad.attn) throw new Error('Add a recipient name for the delivery.');
        if (!co && !f.contact.name.trim()) throw new Error('Add your name so the order can be identified.');
        const o = s.placeOrder({ method: f.method, branch: f.branch, state: ad.state, service: f.service, acc: f.acc, address: f.method === 'ship' ? Object.assign({}, ad) : null,
          po: f.po, job: f.job, notes: f.notes, payment: f.payment, contact: co ? null : f.contact });
        location.href = 'order.html?id=' + o.id + '&new=1';
      } catch (err) {
        AX.$('#err').innerHTML = `<div class="notice red small" style="margin-top:12px">${AX.esc(err.message)}</div>`;
      }
    };
  }
  view.rerender = false;
  AX.page(view);
})();
