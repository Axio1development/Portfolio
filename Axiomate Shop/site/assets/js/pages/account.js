(function () {
  const s = AX.store;
  const TABS = [['overview', 'Overview'], ['orders', 'Orders'], ['approvals', 'Approvals'], ['invoices', 'Invoices'], ['quotes', 'Quotes'], ['returns', 'Returns'], ['company', 'Company settings']];
  const tab = () => { const h = location.hash.slice(1); return TABS.some(t => t[0] === h) ? h : 'overview'; };
  window.addEventListener('hashchange', () => view());

  const ordersTable = list => !list.length ? '<div class="empty"><p>No orders yet.</p><a class="btn btn-accent" href="shop.html">Start an order</a></div>' : `<div class="table-wrap"><table class="data">
    <thead><tr><th>Order</th><th>Placed</th><th>PO</th><th>Buyer</th><th>Fulfillment</th><th>Status</th><th class="num">Total</th></tr></thead><tbody>
    ${list.map(o => { const st = s.status(o); return `<tr><td><a href="order.html?id=${o.id}">${o.id}</a></td><td>${AX.date(o.placedAt)}</td><td class="mono">${AX.esc(o.po || '—')}</td><td>${AX.esc(o.placedBy)}</td>
      <td>${o.method === 'pickup' ? 'Pickup · ' + AX.locById[o.branch].short : AX.serviceName(o.service) + ' · ' + AX.esc(o.shipTo.city)}</td>
      <td>${AX.statusBadge(st)}</td><td class="num">${AX.money(o.total)}</td></tr>`; }).join('')}</tbody></table></div>`;

  function invoices(co) {
    return s.state.orders.filter(o => o.companyId === co.id).map(o => ({ o, inv: s.invoice(o) })).filter(x => x.inv).sort((a, b) => b.inv.date - a.inv.date);
  }

  function view() {
    const main = AX.$('#main'), co = s.company();
    if (!co) { location.replace('signin.html?next=account.html'); return; }
    const u = s.user(), t = tab(), cr = s.credit(co);
    const mine = s.state.orders.filter(o => o.companyId === co.id);
    const pending = mine.filter(o => o.state === 'pending_approval');
    const invs = invoices(co);
    const open = invs.filter(x => x.inv.balance > 0);
    const pastDue = open.filter(x => x.inv.pastDue);
    const quotes = s.state.quotes.filter(q => q.companyId === co.id);
    const readyQuotes = quotes.filter(q => s.quoteStatus(q).key === 'quoted');
    const counts = { approvals: pending.length, quotes: readyQuotes.length, invoices: pastDue.length };

    let body = '';
    if (t === 'overview') {
      const active = mine.filter(o => { const st = s.status(o); return st.idx >= 0 && !['delivered', 'collected'].includes(st.key); });
      const mtd = mine.filter(o => o.state !== 'cancelled' && o.state !== 'rejected' && new Date(o.placedAt).getMonth() === new Date().getMonth()).reduce((a, o) => a + o.total, 0);
      body = `
        ${pastDue.length ? `<div class="notice red"><strong>${pastDue.length} invoice${pastDue.length > 1 ? 's are' : ' is'} past due</strong> (${AX.money(pastDue.reduce((a, x) => a + x.inv.balance, 0))}). Past-due balances still count against your credit line. <a href="#invoices">Pay now</a></div>` : ''}
        ${pending.length && s.canApprove(u) ? `<div class="notice amber"><strong>${pending.length} order${pending.length > 1 ? 's' : ''} waiting for your approval.</strong> <a href="#approvals">Review</a></div>` : ''}
        ${readyQuotes.length ? `<div class="notice green"><strong>${readyQuotes.length} quote${readyQuotes.length > 1 ? 's are' : ' is'} ready.</strong> <a href="#quotes">View pricing</a></div>` : ''}
        <div class="kpis">
          <div class="kpi"><small>Available credit</small><strong>${AX.money(cr.available)}</strong><small>of ${AX.money(cr.limit)} · ${co.terms}</small><div class="meter"><i style="width:${cr.limit ? Math.min(100, cr.used / cr.limit * 100) : 0}%"></i></div></div>
          <div class="kpi"><small>Open balance</small><strong>${AX.money(open.reduce((a, x) => a + x.inv.balance, 0))}</strong><small>${open.length} open invoice${open.length === 1 ? '' : 's'}${pastDue.length ? ` · <span style="color:var(--red)">${pastDue.length} past due</span>` : ''}</small></div>
          <div class="kpi"><small>In progress</small><strong>${active.length}</strong><small>orders being processed or shipped</small></div>
          <div class="kpi"><small>Spend this month</small><strong>${AX.money(mtd)}</strong><small>${co.tier} tier · ${Math.round(co.contractPct * 100)}% contract discount</small></div>
        </div>
        <div class="two">
          <section class="card"><div class="card-head"><h3>Recent orders</h3><a href="#orders">All orders</a></div>${ordersTable(mine.slice(0, 5))}</section>
          <aside>
            <div class="card"><h3>Your account team</h3><p style="margin:0"><strong>${AX.company.rep.name}</strong><br><span class="muted">${AX.company.rep.title}</span><br>${AX.company.rep.phone}</p>
              <p class="small muted" style="margin:10px 0 0">Account <span class="mono">${co.account || co.id.toUpperCase()}</span> · home DC ${AX.locById[AX.regionOfState(co.addresses[0] ? co.addresses[0].state : 'WA')].short}</p></div>
            <div class="card"><h3>Quick actions</h3><div style="display:grid;gap:8px">
              <a class="btn btn-ghost btn-block" href="shop.html">New order</a>
              ${mine[0] ? `<button class="btn btn-ghost btn-block" data-reorder="${mine[0].id}">Reorder ${mine[0].id}</button>` : ''}
              <a class="btn btn-ghost btn-block" href="#company">Manage buyers & limits</a></div></div>
          </aside></div>`;
    }
    if (t === 'orders') body = `<section class="card">${ordersTable(mine)}</section>`;
    if (t === 'approvals') {
      body = `<section class="card"><div class="card-head"><h3>Orders awaiting approval</h3><span class="muted small">${s.canApprove(u) ? 'You can approve orders for ' + AX.esc(co.name) : 'Viewing as a buyer: you can see but not approve these'}</span></div>
        ${!pending.length ? '<div class="empty"><p>Nothing waiting. Orders over a buyer\'s limit show up here.</p></div>' : `<div class="table-wrap"><table class="data"><thead><tr><th>Order</th><th>Buyer</th><th>PO / job</th><th>Submitted</th><th class="num">Total</th><th></th></tr></thead><tbody>
        ${pending.map(o => { const b = co.users.find(x => x.name === o.placedBy); return `<tr><td><a href="order.html?id=${o.id}">${o.id}</a><br><small class="muted">${o.lines.length} lines</small></td><td>${AX.esc(o.placedBy)}<br><small class="muted">limit ${b ? AX.money(b.limit) : '—'}</small></td>
          <td class="mono">${AX.esc(o.po || '—')}<br><small class="muted">${AX.esc(o.job || '')}</small></td><td>${AX.time(o.placedAt)}</td><td class="num"><strong>${AX.money(o.total)}</strong></td>
          <td class="num">${s.canApprove(u) ? `<button class="btn btn-primary btn-sm" data-approve="${o.id}">Approve</button> <button class="btn btn-danger btn-sm" data-reject="${o.id}">Reject</button>` : ''}</td></tr>`; }).join('')}</tbody></table></div>`}
        <p class="small muted" style="margin:14px 0 0">Approval rules: buyers can place orders up to their limit. Anything over goes to an admin or approver. Stock is reserved while an order waits.</p></section>`;
    }
    if (t === 'invoices') {
      const now = Date.now();
      const bucket = (lo, hi) => open.filter(x => { const d = (now - x.inv.due) / AX.DAY; return d > lo && d <= hi; }).reduce((a, x) => a + x.inv.balance, 0);
      body = `<div class="kpis">
          <div class="kpi"><small>Current (not yet due)</small><strong>${AX.money(bucket(-Infinity, 0))}</strong></div>
          <div class="kpi"><small>1–30 days past due</small><strong style="${bucket(0, 30) ? 'color:var(--red)' : ''}">${AX.money(bucket(0, 30))}</strong></div>
          <div class="kpi"><small>31–60 days past due</small><strong>${AX.money(bucket(30, 60))}</strong></div>
          <div class="kpi"><small>60+ days past due</small><strong>${AX.money(bucket(60, Infinity))}</strong></div></div>
        <section class="card"><div class="card-head"><h3>Invoices</h3>${open.length ? `<button class="btn btn-primary btn-sm" id="pay-sel" disabled>Pay selected by ACH</button>` : ''}</div>
        ${!invs.length ? '<div class="empty"><p>No invoices yet. Net 30 orders are invoiced when they ship.</p></div>' : `<div class="table-wrap"><table class="data"><thead><tr><th></th><th>Invoice</th><th>Order / PO</th><th>Date</th><th>Due</th><th class="num">Amount</th><th class="num">Balance</th><th>Status</th></tr></thead><tbody>
        ${invs.map(({ o, inv }) => `<tr><td>${inv.balance > 0 ? `<input type="checkbox" class="inv-sel" value="${o.id}" data-amt="${inv.balance}" aria-label="Select ${inv.id}">` : ''}</td>
          <td><a href="invoice.html?id=${o.id}">${inv.id}</a></td><td><a href="order.html?id=${o.id}">${o.id}</a><br><small class="mono muted">${AX.esc(o.po || '')}</small></td>
          <td>${AX.date(inv.date)}</td><td>${o.payment.type === 'net30' ? AX.date(inv.due) : '—'}</td><td class="num">${AX.money(o.total - (o.creditMemo || 0))}</td><td class="num">${AX.money(inv.balance)}</td>
          <td>${o.payment.type !== 'net30' ? '<span class="badge">Paid by ' + (o.payment.type === 'ach' ? 'ACH' : 'card') + '</span>' : inv.paid ? '<span class="badge green">Paid ' + AX.date(o.paidAt, { month: 'short', day: 'numeric' }) + '</span>' : inv.pastDue ? '<span class="badge red">Past due ' + Math.floor((now - inv.due) / AX.DAY) + ' days</span>' : '<span class="badge amber">Open</span>'}</td></tr>`).join('')}
        </tbody></table></div>`}
        <p class="small muted" style="margin:14px 0 0">Remit to ${AX.company.remit.join(', ')}. Pay by ACH here, or reference the invoice number on a check.</p></section>`;
    }
    if (t === 'quotes') {
      body = `<section class="card"><div class="card-head"><h3>Quotes</h3><span class="muted small">Request from any product page or your cart</span></div>
        ${!quotes.length ? '<div class="empty"><p>No quotes yet. Ask for volume pricing on a product page or from your cart.</p><a class="btn btn-ghost" href="shop.html">Browse products</a></div>' :
        quotes.map(q => { const qs = s.quoteStatus(q); const tot = q.lines.reduce((a, l) => a + l.quoted * l.qty, 0), cur = q.lines.reduce((a, l) => a + l.current * l.qty, 0);
          return `<div class="card" style="background:var(--soft)"><div class="card-head"><div><strong>${q.id}</strong> <span class="muted small">· requested ${AX.time(q.createdAt)} by ${AX.esc(q.by)}${q.note ? ' · “' + AX.esc(q.note) + '”' : ''}</span></div>
            <span class="badge ${{ review: 'amber', quoted: 'green', accepted: 'blue', ordered: 'navy', expired: 'red' }[qs.key]}">${qs.label}</span></div>
            <table class="data"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Your price</th><th class="num">Quoted</th><th class="num">Ext.</th></tr></thead><tbody>
            ${q.lines.map(l => `<tr><td><a href="product.html?sku=${l.sku}">${AX.esc(AX.bySku[l.sku].name)}</a></td><td class="num">${l.qty}</td><td class="num">${AX.money(l.current)}</td><td class="num">${qs.key === 'review' ? '—' : '<strong>' + AX.money(l.quoted) + '</strong>'}</td><td class="num">${qs.key === 'review' ? '—' : AX.money(l.quoted * l.qty)}</td></tr>`).join('')}
            </tbody></table>
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap">
              <span class="small muted">${qs.key === 'review' ? AX.company.rep.name + ' is reviewing this request (about a minute in the demo).' : qs.key === 'quoted' ? `Saves ${AX.money(cur - tot)} vs. your price · valid until ${AX.date(q.createdAt + 30 * AX.DAY)}` : qs.key === 'ordered' ? 'Ordered on <a href="order.html?id=' + q.orderedIn + '">' + q.orderedIn + '</a>' : qs.key === 'accepted' ? 'In your cart at the quoted price' : ''}</span>
              ${qs.key === 'quoted' ? `<button class="btn btn-accent btn-sm" data-accept="${q.id}">Accept & add to cart · ${AX.money(tot)}</button>` : qs.key === 'accepted' ? '<a class="btn btn-ghost btn-sm" href="cart.html">Go to cart</a>' : ''}
            </div></div>`; }).join('')}</section>`;
    }
    if (t === 'returns') {
      const rets = s.state.returns.filter(r => r.companyId === co.id);
      body = `<section class="card"><div class="card-head"><h3>Returns</h3><span class="muted small">Start a return from a delivered order</span></div>
        ${!rets.length ? '<div class="empty"><p>No returns. Open a delivered order and choose “Start a return”.</p></div>' : `<div class="table-wrap"><table class="data"><thead><tr><th>RMA</th><th>Order</th><th>Items</th><th>Reason</th><th>Status</th><th class="num">Restocking</th><th class="num">Credit</th></tr></thead><tbody>
        ${rets.map(r => { const rs = s.returnStatus(r); return `<tr><td class="mono">${r.id}</td><td><a href="order.html?id=${r.orderId}">${r.orderId}</a></td><td>${r.lines.map(l => l.qty + ' × ' + AX.esc(l.name)).join('<br>')}</td><td>${AX.esc(r.reason)}</td>
          <td><span class="badge ${rs.key === 'credited' ? 'green' : 'blue'}">${rs.label}</span></td><td class="num">${r.fee ? '−' + AX.money(r.fee) : '—'}</td><td class="num"><strong>${AX.money(r.credit)}</strong></td></tr>`; }).join('')}</tbody></table></div>`}
        <p class="small muted" style="margin:14px 0 0">Flow: authorized → in transit to Harbor Point → received & inspected → credit applied to the original invoice. Damaged, wrong or defective items have no restocking fee.</p></section>`;
    }
    if (t === 'company') {
      const admin = u.role === 'admin';
      body = `<div class="two"><div>
        <section class="card"><div class="card-head"><h3>Buyers & approval limits</h3>${admin ? '<button class="btn btn-ghost btn-sm" id="add-user">Add buyer</button>' : ''}</div>
          <div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Role</th><th class="num">Order limit</th></tr></thead><tbody>
          ${co.users.map(x => `<tr><td><strong>${AX.esc(x.name)}</strong><br><small class="muted">${AX.esc(x.title || '')} · ${AX.esc(x.email || '')}</small></td>
            <td>${admin && x.id !== u.id ? `<select data-role="${x.id}" style="width:auto">${['admin', 'approver', 'buyer'].map(r => `<option ${x.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select>` : `<span class="badge ${x.role === 'buyer' ? '' : 'navy'}">${x.role}</span>`}</td>
            <td class="num">${admin && x.role === 'buyer' ? `<input type="number" min="0" step="250" value="${x.limit}" data-limit="${x.id}" style="width:120px;text-align:right">` : x.role === 'buyer' ? AX.money(x.limit) : 'Approves'}</td></tr>`).join('')}
          </tbody></table></div>${admin ? '' : '<p class="small muted" style="margin:12px 0 0">Only admins can change roles and limits. Switch “Viewing as” to Jordan Avery to try it.</p>'}</section>
        <section class="card"><div class="card-head"><h3>Ship-to addresses</h3>${admin ? '<button class="btn btn-ghost btn-sm" id="add-addr">Add address</button>' : ''}</div>
          ${co.addresses.length ? co.addresses.map(a => `<div class="sum-row"><span><strong>${AX.esc(a.label)}</strong><br><small class="muted">${AX.esc(a.attn)} · ${AX.esc(a.line1)}, ${AX.esc(a.city)}, ${a.state} ${a.zip}</small></span><span class="small">${a.dock ? 'Loading dock' : 'No dock'}</span></div>`).join('') : '<p class="muted">No saved addresses yet.</p>'}</section>
      </div><aside>
        <section class="card"><h3>Account</h3><dl class="kv" style="grid-template-columns:110px 1fr">
          <dt>Company</dt><dd>${AX.esc(co.name)}</dd><dt>Account #</dt><dd class="mono">${co.account || co.id.toUpperCase()}</dd><dt>Pricing tier</dt><dd>${co.tier} · ${Math.round(co.contractPct * 100)}% off list</dd>
          <dt>Terms</dt><dd>${co.creditLimit ? co.terms + ' · ' + AX.money(co.creditLimit) + ' line' : 'Card / ACH (prepay)'}</dd>
          <dt>Payment</dt><dd>${co.card ? AX.esc(co.card.brand) + ' •••• ' + co.card.last4 : 'No card'}${co.ach ? '<br>ACH ' + AX.esc(co.ach.bank) + ' •••• ' + co.ach.last4 : ''}</dd></dl>
          ${co.creditLimit && admin ? '<button class="btn btn-ghost btn-sm" id="cli" style="margin-top:14px">Request a credit limit increase</button>' : ''}</section>
        <section class="card"><h3>Purchasing controls</h3>
          <label class="check"><input type="checkbox" id="po-req" ${co.poRequired ? 'checked' : ''} ${admin ? '' : 'disabled'}><span>Require a PO number on every order</span></label></section>
        <section class="card"><h3>Sales tax exemption</h3>
          ${co.taxExempt && co.exemptCert ? `<p><span class="badge green">Exempt</span> Certificate <span class="mono">${AX.esc(co.exemptCert.number)}</span> · ${co.exemptCert.state === 'ALL' ? 'multi-state' : AX.states[co.exemptCert.state][0]}</p>${admin ? '<button class="btn btn-danger btn-sm" id="tax-rm">Remove certificate</button>' : ''}` :
          `<p class="small muted">Resellers, nonprofits and government buyers can upload an exemption or resale certificate. Tax is removed for orders shipping to the covered state.</p>
           ${admin ? `<div class="row"><label class="field"><span>Certificate #</span><input type="text" id="tax-no" placeholder="Any made-up number"></label><label class="field"><span>State</span><select id="tax-st"><option value="ALL">Multi-state (MTC)</option>${AX.stateOptions('WA')}</select></label></div><button class="btn btn-primary btn-sm" id="tax-add">Save certificate</button>` : ''}`}</section>
      </aside></div>`;
    }

    main.innerHTML = `<div class="wrap">
      <div class="acct-head"><div><div class="crumbs">Business account · ${AX.esc(co.account || co.id.toUpperCase())}${co.demo ? ' · demo company' : ''}</div><h1>${AX.esc(co.name)}</h1></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <label class="viewas">Viewing as <select id="viewas">${co.users.map(x => `<option value="${x.id}" ${x.id === u.id ? 'selected' : ''}>${AX.esc(x.name)} · ${x.role}${x.role === 'buyer' ? ' (' + AX.money(x.limit) + ')' : ''}</option>`).join('')}</select></label>
          <button class="btn btn-ghost btn-sm" id="signout">Sign out</button></div></div>
      <nav class="tabs">${TABS.map(([k, n]) => `<a href="#${k}" class="${t === k ? 'on' : ''}">${n}${counts[k] ? `<span class="badge ${k === 'invoices' ? 'red' : k === 'quotes' ? 'green' : 'amber'}">${counts[k]}</span>` : ''}</a>`).join('')}</nav>
      ${body}</div>`;

    wire(co, u);
  }

  function wire(co, u) {
    const main = AX.$('#main');
    AX.$('#viewas').onchange = e => { s.switchUser(e.target.value); AX.toast('Now viewing as ' + co.users.find(x => x.id === e.target.value).name); };
    AX.$('#signout').onclick = () => { s.signOut(); location.href = 'index.html'; };
    main.onclick = e => {
      const el = e.target.closest('button,[data-accept]'); if (!el) return;
      if (el.dataset.approve) { s.approve(el.dataset.approve); AX.toast(el.dataset.approve + ' approved and released'); }
      if (el.dataset.reject) { const r = prompt('Reason (shared with the buyer):', 'Over budget for this month'); if (r !== null) s.reject(el.dataset.reject, r); }
      if (el.dataset.accept) { s.acceptQuote(el.dataset.accept); AX.toast('Quoted items added to cart', { href: 'cart.html', label: 'View cart' }); }
      if (el.dataset.reorder) { s.reorder(el.dataset.reorder); AX.toast('Items added to your cart', { href: 'cart.html', label: 'View cart' }); }
      if (el.id === 'pay-sel') {
        const sel = AX.$$('.inv-sel:checked'); if (!sel.length) return;
        const amt = sel.reduce((a, i) => a + +i.dataset.amt, 0);
        AX.modal(`<h2>Pay ${sel.length} invoice${sel.length > 1 ? 's' : ''}</h2><p>Debit <strong>${AX.money(amt)}</strong> from ${co.ach ? AX.esc(co.ach.bank) + ' •••• ' + co.ach.last4 : 'your bank account'} today. Funds clear in 1–2 business days and your available credit updates right away.</p>
          <p class="small muted">Demo: no money moves.</p><div class="modal-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="pay-go">Pay ${AX.money(amt)}</button></div>`,
          (m, close) => m.querySelector('#pay-go').onclick = () => { sel.forEach(i => s.payInvoice(i.value, 'ach')); close(); AX.toast('Payment of ' + AX.money(amt) + ' scheduled'); });
      }
      if (el.id === 'add-user') AX.modal(`<h2>Add a buyer</h2>
          <label class="field"><span>Full name</span><input type="text" id="nu-name"></label><label class="field"><span>Job title</span><input type="text" id="nu-title"></label>
          <div class="row"><label class="field"><span>Role</span><select id="nu-role"><option>buyer</option><option>approver</option><option>admin</option></select></label><label class="field"><span>Order limit</span><input type="number" id="nu-limit" value="1500" step="250"></label></div>
          <div class="modal-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="nu-go">Add buyer</button></div>`,
        (m, close) => m.querySelector('#nu-go').onclick = () => {
          const name = m.querySelector('#nu-name').value.trim(); if (!name) return;
          co.users.push({ id: 'u' + Date.now().toString(36), name, title: m.querySelector('#nu-title').value.trim(), email: name.toLowerCase().replace(/[^a-z]+/g, '.') + '@' + co.name.split(/[ ,]/)[0].toLowerCase() + '.example', role: m.querySelector('#nu-role').value, limit: +m.querySelector('#nu-limit').value || 0 });
          s.save(); close();
        });
      if (el.id === 'add-addr') AX.modal(`<h2>Add a ship-to address</h2>
          <label class="field"><span>Label</span><input type="text" id="na-label" placeholder="e.g. North job site"></label><label class="field"><span>Attention</span><input type="text" id="na-attn"></label>
          <label class="field"><span>Street</span><input type="text" id="na-line1"></label>
          <div class="row3"><label class="field"><span>City</span><input type="text" id="na-city"></label><label class="field"><span>State</span><select id="na-state">${AX.stateOptions('WA')}</select></label><label class="field"><span>ZIP</span><input type="text" id="na-zip"></label></div>
          <label class="check"><input type="checkbox" id="na-dock"><span>Has a loading dock (no liftgate needed)</span></label>
          <div class="modal-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="na-go">Save address</button></div>`,
        (m, close) => m.querySelector('#na-go').onclick = () => {
          const v = id => m.querySelector('#na-' + id).value.trim();
          if (!v('line1') || !v('city') || !v('zip')) return AX.toast('Street, city and ZIP are required', null, 'err');
          co.addresses.push({ id: 'a' + Date.now().toString(36), label: v('label') || v('city'), attn: v('attn'), line1: v('line1'), city: v('city'), state: v('state'), zip: v('zip'), dock: m.querySelector('#na-dock').checked });
          s.save(); close();
        });
      if (el.id === 'cli') {
        const past = invoices(co).some(x => x.inv.pastDue);
        if (past) AX.modal(`<h2>Increase not available yet</h2><p>We can't raise the line while an invoice is past due. Once it's paid, ${AX.company.rep.name} can review an increase.</p><div class="modal-actions"><button class="btn btn-primary" data-close>OK</button></div>`);
        else { const nl = Math.round(co.creditLimit * 1.25 / 500) * 500; co.creditLimit = nl; s.save(); AX.toast('Approved: credit line raised to ' + AX.money(nl)); }
      }
      if (el.id === 'tax-add') { const no = AX.$('#tax-no').value.trim(); if (!no) return AX.toast('Enter a certificate number', null, 'err'); co.taxExempt = true; co.exemptCert = { number: no, state: AX.$('#tax-st').value, added: Date.now() }; s.save(); AX.toast('Exemption certificate saved'); }
      if (el.id === 'tax-rm') { co.taxExempt = false; co.exemptCert = null; s.save(); }
    };
    main.onchange = e => {
      const el = e.target;
      if (el.classList.contains('inv-sel')) { const b = AX.$('#pay-sel'); const sel = AX.$$('.inv-sel:checked'); b.disabled = !sel.length; b.textContent = sel.length ? 'Pay ' + AX.money(sel.reduce((a, i) => a + +i.dataset.amt, 0)) + ' by ACH' : 'Pay selected by ACH'; }
      if (el.dataset.role) { co.users.find(x => x.id === el.dataset.role).role = el.value; s.save(); }
      if (el.dataset.limit) { co.users.find(x => x.id === el.dataset.limit).limit = Math.max(0, +el.value || 0); s.save(); AX.toast('Limit updated'); }
      if (el.id === 'po-req') { co.poRequired = el.checked; s.save(); }
    };
  }

  view.live = true;
  AX.page(view);
})();
