(function () {
  const s = AX.store;
  function view() {
    const main = AX.$('#main'), o = s.order(AX.qs('id'));
    if (!o) { main.innerHTML = `<div class="wrap"><div class="card empty" style="margin-top:32px"><h2>Order not found</h2><p>Orders live in the browser they were placed from.</p><a class="btn btn-primary" href="account.html#orders">Your orders</a></div></div>`; return; }
    document.title = o.id + ' · Axiomate Shop';
    const co = s.company(), u = s.user(), st = s.status(o), inv = s.invoice(o), isNew = AX.qs('new');
    const mine = o.companyId ? co && co.id === o.companyId : true;
    const L = o.branch ? AX.locById[o.branch] : null;
    const backorders = o.lines.filter(l => l.backorder > 0);

    const timeline = st.stages.length ? `<div class="timeline">${st.stages.map((x, i) => `<div class="tl ${i <= st.idx ? 'done' : ''} ${i === st.idx ? 'now' : ''}"><i></i><strong>${x[1]}</strong>${st.times && st.times[i] ? AX.time(st.times[i]) : ''}</div>`).join('')}</div>` : '';
    const derived = [];
    if (st.times) st.stages.forEach((x, i) => { if (i > 0 && i <= st.idx && st.times[i] && !(o.method === 'pickup' && x[0] === 'collected')) derived.push({ at: st.times[i], text: stageText(o, x[0]) }); });
    const events = [...(o.events || [{ at: o.placedAt, text: 'Order received' }]), ...derived].sort((a, b) => b.at - a.at);

    const actions = [];
    if (mine && o.state === 'pending_approval' && s.canApprove(u)) actions.push('<button class="btn btn-primary" id="approve">Approve order</button><button class="btn btn-danger" id="reject">Reject</button>');
    if (mine && st.key === 'ready') actions.push('<button class="btn btn-accent" id="collect">Mark as picked up</button>');
    if (mine && s.canCancel(o)) actions.push('<button class="btn btn-danger" id="cancel">Cancel order</button>');
    if (mine && (st.key === 'delivered' || st.key === 'collected')) actions.push('<button class="btn btn-ghost" id="return">Start a return</button>');
    if (inv) actions.push(`<a class="btn btn-ghost" href="invoice.html?id=${o.id}">${o.payment.type === 'net30' ? 'View invoice' : 'View receipt'}</a>`);
    actions.push('<button class="btn btn-ghost" id="reorder">Buy again</button>');

    main.innerHTML = `<div class="wrap">
      ${isNew ? `<div class="notice green" style="margin-top:24px"><strong>${o.state === 'pending_approval' ? 'Submitted for approval.' : 'Order placed.'}</strong> ${o.state === 'pending_approval' ? 'It will be released to the warehouse once an approver signs off.' : 'Progress below updates live. In this demo each stage takes a minute or two instead of hours.'}</div>` : ''}
      <div class="acct-head"><div><div class="crumbs"><a href="account.html#orders">Orders</a> / ${o.id}</div><h1>Order ${o.id}</h1>
        <div class="muted">Placed ${AX.time(o.placedAt)} by ${AX.esc(o.placedBy)}${o.po ? ' · PO <strong class="mono">' + AX.esc(o.po) + '</strong>' : ''}</div></div>
        ${AX.statusBadge(st, 'lg')}</div>
      <div class="two"><div>
        <section class="card">
          ${timeline}
          ${o.state === 'pending_approval' ? `<div class="notice amber" style="margin:14px 0 0">Waiting for approval. ${o.events[0].text}.</div>` : ''}
          ${o.state === 'rejected' || o.state === 'cancelled' ? `<div class="notice red" style="margin:0">${AX.esc(o.events[o.events.length - 1].text)}. Reserved stock was released.</div>` : ''}
          <dl class="kv" style="margin-top:18px">
            ${o.method === 'ship' ? `<dt>Ship to</dt><dd>${AX.esc(o.shipTo.attn || '')}${o.shipTo.attn ? '<br>' : ''}${AX.esc(o.shipTo.line1)}<br>${AX.esc(o.shipTo.city)}, ${o.shipTo.state} ${AX.esc(o.shipTo.zip)}</dd>
              <dt>Service</dt><dd>${AX.serviceName(o.service)}${o.acc && o.service === 'ltl' && o.acc.length ? ' · ' + o.acc.map(id => (s.ACCESSORIALS.find(a => a.id === id) || {}).name).join(', ') : ''}</dd>
              ${o.eta && !o.history ? `<dt>Estimated delivery</dt><dd>${AX.range(o.eta)} <span class="muted small">(real-world estimate)</span></dd>` : ''}
              ${s.stageReached(o, 'shipped') && o.tracking ? `<dt>Tracking</dt><dd class="mono">${o.tracking}${o.service === 'ltl' ? ' · Axiomate Freight' : ' · Axiomate Parcel'}</dd>` : ''}`
            : `<dt>Pickup at</dt><dd>${AX.esc(L.name)}<br>${AX.esc(L.street)}, ${L.city}, ${L.state}<br><span class="muted small">${AX.esc(L.counter)} · ${L.phone}</span></dd>`}
            <dt>Payment</dt><dd>${AX.esc(o.payment.label)} · ${payState(o, inv)}</dd>
            ${o.job ? `<dt>Job / cost center</dt><dd>${AX.esc(o.job)}</dd>` : ''}
            ${o.notes ? `<dt>Notes</dt><dd>${AX.esc(o.notes)}</dd>` : ''}
            ${o.approvedBy ? `<dt>Approved by</dt><dd>${AX.esc(o.approvedBy)}</dd>` : ''}
          </dl>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:20px">${actions.join('')}</div>
        </section>
        <section class="card"><h3>Items</h3>
          ${o.lines.map(l => { const p = AX.bySku[l.sku]; return `<div class="line" style="grid-template-columns:64px minmax(0,1fr) auto">
            <a href="product.html?sku=${l.sku}">${AX.thumb(p, 'sm')}</a>
            <div><a class="line-name" href="product.html?sku=${l.sku}">${AX.esc(l.name)}</a><div class="line-sub"><span class="mono">${l.sku}</span> · ${l.qty} × ${AX.money(l.unit)}${l.quoteId ? ' · quote ' + l.quoteId : ''}</div>
              <div class="line-sub">${l.alloc.map(a => `${a.qty} from ${AX.locById[a.loc].short}${a.transfer ? ' (transfer)' : ''}`).join(' · ')}${l.backorder ? ` <span style="color:var(--red)">· ${l.backorder} backordered, ships separately ~${AX.day(l.restock)}</span>` : ''}</div></div>
            <div class="line-price"><strong>${AX.money(l.unit * l.qty)}</strong></div></div>`; }).join('')}
          ${backorders.length ? '<p class="small muted" style="margin-top:12px">Backordered items ship as soon as they arrive. You are only invoiced for what ships.</p>' : ''}
        </section>
      </div>
      <aside>
        <div class="summary" style="position:static">
          <h3>Totals</h3>
          <div class="sum-row"><span>Subtotal</span><span>${AX.money(o.subtotal)}</span></div>
          ${o.savings ? `<div class="sum-row save"><span>Savings</span><span>−${AX.money(o.savings)}</span></div>` : ''}
          <div class="sum-row"><span>Shipping</span><span>${o.shipping ? AX.money(o.shipping) : 'Free'}</span></div>
          ${o.accessorials ? `<div class="sum-row"><span>Freight services</span><span>${AX.money(o.accessorials)}</span></div>` : ''}
          <div class="sum-row"><span>Sales tax</span><span>${AX.money(o.tax)}</span></div>
          ${o.creditMemo ? `<div class="sum-row save"><span>Return credit</span><span>−${AX.money(o.creditMemo)}</span></div>` : ''}
          <div class="sum-row total"><span>Total</span><span>${AX.money(o.total - (o.creditMemo || 0))}</span></div>
        </div>
        <div class="card" style="margin-top:16px"><h3>Activity</h3><ul class="events">${events.map(e => `<li><time>${AX.time(e.at)}</time>${AX.esc(e.text)}</li>`).join('')}</ul></div>
      </aside></div></div>`;

    const on = (id, fn) => { const el = AX.$('#' + id); if (el) el.onclick = fn; };
    on('approve', () => { s.approve(o.id); AX.toast('Approved and released to the warehouse'); });
    on('reject', () => { const r = prompt('Reason for rejecting (shared with the buyer):', 'Over budget for this month'); if (r !== null) s.reject(o.id, r); });
    on('cancel', () => { if (confirm('Cancel order ' + o.id + '? Reserved stock will be released.')) s.cancel(o.id); });
    on('collect', () => s.collect(o.id));
    on('reorder', () => { s.reorder(o.id); AX.toast('Items added to your cart', { href: 'cart.html', label: 'View cart' }); });
    on('return', () => returnModal(o));
  }

  function stageText(o, key) {
    const from = [...new Set(o.lines.flatMap(l => l.alloc.map(a => AX.locById[a.loc].short)))].join(' and ');
    return {
      processing: 'Released to ' + from + ' for picking',
      picked: o.method === 'pickup' ? 'Picked and staged at the counter' : 'Picked, packed and labeled at ' + from,
      shipped: o.service === 'ltl' ? 'Loaded on Axiomate Freight, PRO ' + (o.tracking || '').replace('PRO ', '') : 'Handed to Axiomate Parcel, tracking ' + o.tracking,
      out: o.service === 'ltl' ? 'Delivery appointment confirmed with receiver' : 'Out for delivery',
      delivered: 'Delivered' + (o.shipTo && o.shipTo.attn ? ', signed for at ' + o.shipTo.attn : ''),
      ready: 'Ready for pickup at ' + (o.branch ? AX.locById[o.branch].short : 'the counter') + '. Bring order ' + o.id
    }[key] || key;
  }
  function payState(o, inv) {
    if (o.state === 'cancelled' || o.state === 'rejected') return 'nothing charged';
    if (o.payment.type === 'net30') { if (!inv) return 'invoiced when it ships'; if (o.paidAt) return 'paid ' + AX.date(o.paidAt); return (inv.pastDue ? '<strong style="color:var(--red)">past due</strong> · ' : '') + 'due ' + AX.date(inv.due); }
    return inv ? 'charged ' + AX.date(inv.date) : 'authorized, charged at shipment';
  }

  function returnModal(o) {
    AX.modal(`<h2>Return items from ${o.id}</h2><p class="muted small">Returns are accepted within 30 days. Furniture and technology carry a 15% restocking fee. We email a prepaid label and credit your account once Harbor Point inspects the return.</p>
      ${o.lines.map(l => `<div class="sum-row" style="align-items:center"><span>${AX.esc(l.name)}<br><small class="muted">bought ${l.qty}</small></span><input type="number" min="0" max="${l.qty}" value="0" data-sku="${l.sku}" style="width:80px"></div>`).join('')}
      <label class="field" style="margin-top:12px"><span>Reason</span><select id="r-reason"><option>Ordered too many</option><option>Damaged in transit</option><option>Wrong item shipped</option><option>Defective</option><option>No longer needed</option></select></label>
      <div class="modal-actions"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="r-go">Request return</button></div>`,
      (m, close) => m.querySelector('#r-go').onclick = () => {
        try {
          const reason = m.querySelector('#r-reason').value;
          const items = [...m.querySelectorAll('input[data-sku]')].map(i => ({ sku: i.dataset.sku, qty: Math.min(+i.max, Math.max(0, parseInt(i.value, 10) || 0)) }));
          const r = AX.store.requestReturn(o.id, items, reason);
          close(); AX.toast(r.id + ' authorized · credit ' + AX.money(r.credit), { href: 'account.html#returns', label: 'View returns' });
        } catch (e) { AX.toast(e.message, null, 'err'); }
      });
  }

  view.live = true;
  AX.page(view);
})();
