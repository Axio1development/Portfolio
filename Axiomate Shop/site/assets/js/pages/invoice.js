AX.page(function invoicePage() {
  const s = AX.store, o = s.order(AX.qs('id')), main = AX.$('#main');
  const inv = o && s.invoice(o);
  if (!o || !inv) { main.innerHTML = `<div class="wrap"><div class="card empty" style="margin-top:32px"><h2>No invoice yet</h2><p>Invoices are created when an order ships or is picked up.</p>${o ? `<a class="btn btn-primary" href="order.html?id=${o.id}">Back to ${o.id}</a>` : ''}</div></div>`; return; }
  document.title = inv.id + ' · Axiomate Shop';
  const co = o.companyId ? s.state.companies[o.companyId] : null;
  const billTo = co ? [co.name, ...(co.addresses[0] ? [co.addresses[0].line1, co.addresses[0].city + ', ' + co.addresses[0].state + ' ' + co.addresses[0].zip] : [])] : [o.placedBy, (o.contact && o.contact.email) || ''];
  const net = o.payment.type === 'net30';
  const stamp = !net ? '<span class="stamp">PAID</span>' : o.paidAt ? '<span class="stamp">PAID</span>' : inv.pastDue ? '<span class="stamp late">PAST DUE</span>' : '<span class="stamp due">DUE ' + AX.date(inv.due, { month: 'short', day: 'numeric' }).toUpperCase() + '</span>';
  main.innerHTML = `<div class="wrap">
    <div class="no-print" style="display:flex;justify-content:space-between;align-items:center;gap:12px;padding-top:20px;flex-wrap:wrap">
      <a href="order.html?id=${o.id}">← Back to order ${o.id}</a><button class="btn btn-primary" onclick="window.print()">Print or save as PDF</button></div>
    <article class="invoice">
      <div class="inv-top">
        <div><div class="brand" style="color:var(--navy)"><img src="favicon.svg" alt="" width="34" height="34"><span>Axiomate<em>Shop</em></span></div>
          <p class="small muted" style="margin-top:10px">${AX.company.remit.join('<br>')}<br>${AX.company.phone}</p></div>
        <div style="text-align:right"><h1>${net ? 'INVOICE' : 'RECEIPT'}</h1><div class="mono">${inv.id}</div><div style="margin-top:12px">${stamp}</div></div>
      </div>
      <div class="inv-grid">
        <div><h4>Bill to</h4>${billTo.filter(Boolean).map(AX.esc).join('<br>')}${co ? '<br><span class="small muted">Account ' + AX.esc(co.account || co.id) + '</span>' : ''}</div>
        <div><h4>${o.method === 'ship' ? 'Ship to' : 'Picked up at'}</h4>${o.method === 'ship' ? [o.shipTo.attn, o.shipTo.line1, o.shipTo.city + ', ' + o.shipTo.state + ' ' + o.shipTo.zip].filter(Boolean).map(AX.esc).join('<br>') : AX.esc(AX.locById[o.branch].name) + '<br>' + AX.esc(AX.locById[o.branch].street) + '<br>' + AX.locById[o.branch].city + ', ' + AX.locById[o.branch].state}</div>
        <div><h4>Details</h4>Invoice date: ${AX.date(inv.date)}<br>${net ? 'Terms: Net 30<br>Due: <strong>' + AX.date(inv.due) + '</strong><br>' : 'Paid: ' + AX.esc(o.payment.label) + '<br>'}Order: ${o.id}<br>${o.po ? 'PO: <strong>' + AX.esc(o.po) + '</strong><br>' : ''}${o.job ? 'Job: ' + AX.esc(o.job) : ''}</div>
      </div>
      <table class="data"><thead><tr><th>SKU</th><th>Description</th><th class="num">Qty shipped</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead><tbody>
        ${o.lines.map(l => `<tr><td class="mono">${l.sku}</td><td>${AX.esc(l.name)}${l.backorder ? `<br><small class="muted">${l.backorder} backordered, billed when shipped</small>` : ''}</td><td class="num">${l.qty}</td><td class="num">${AX.money(l.unit)}</td><td class="num">${AX.money(l.unit * l.qty)}</td></tr>`).join('')}
      </tbody></table>
      <div style="display:flex;justify-content:flex-end;margin-top:16px"><div style="width:min(320px,100%)">
        <div class="sum-row"><span>Subtotal</span><span>${AX.money(o.subtotal)}</span></div>
        <div class="sum-row"><span>Freight</span><span>${AX.money(o.shipping + (o.accessorials || 0))}</span></div>
        <div class="sum-row"><span>Sales tax${o.taxState ? ' (' + o.taxState + ')' : ''}</span><span>${AX.money(o.tax)}</span></div>
        ${o.creditMemo ? `<div class="sum-row"><span>Credit memo (return)</span><span>−${AX.money(o.creditMemo)}</span></div>` : ''}
        <div class="sum-row total"><span>${net && !o.paidAt ? 'Amount due' : 'Total'}</span><span>${AX.money(net && !o.paidAt ? inv.balance : o.total - (o.creditMemo || 0))}</span></div>
      </div></div>
      <p class="small muted" style="margin-top:32px">${net ? 'Please include the invoice number with payment. Balances more than 30 days past due may pause ordering on terms.' : ''} Concept invoice from a demo store: not a request for payment.</p>
    </article></div>`;
});
