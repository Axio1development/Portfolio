AX.page(function cart() {
  const s = AX.store, co = s.company(), u = s.user(), main = AX.$('#main');
  const cart = s.state.cart;
  if (!cart.length) {
    main.innerHTML = `<div class="wrap"><div class="page-head"><h1>Cart</h1></div><div class="card empty"><h2>Your cart is empty</h2>
      <p>Browse the catalog${co ? ', reorder from your order history,' : ''} or accept a quote to get started.</p>
      <a class="btn btn-accent" href="shop.html">Shop the catalog</a> ${co ? '<a class="btn btn-ghost" href="account.html#orders">Order history</a>' : ''}</div></div>`;
    return;
  }
  const t = s.totals(cart, null), B = AX.locById[s.state.branch];
  const lines = t.priced.map((l, i) => {
    const p = l.p, tiers = s.tiers(p), next = tiers.find(x => x.min > l.qty);
    const n = s.stock(p.sku, B.id);
    return `<div class="line">
      <a href="product.html?sku=${p.sku}">${AX.thumb(p, 'sm')}</a>
      <div><a class="line-name" href="product.html?sku=${p.sku}">${AX.esc(p.name)}</a>
        <div class="line-sub">${AX.esc(p.brand)} · <span class="mono">${p.sku}</span> · ${AX.esc(p.pack)}</div>
        <div class="line-sub" style="margin-top:4px">${n >= l.qty ? `<span class="stock ok" style="display:inline-flex">${n} at ${AX.esc(B.short)}</span>` : n > 0 ? `<span class="stock low" style="display:inline-flex">${n} of ${l.qty} at ${AX.esc(B.short)}</span>` : `<span class="stock transfer" style="display:inline-flex">Ships from a DC</span>`}
        ${l.quoteId ? ` · <span class="badge green">Quoted price · ${l.quoteId}</span>` : next && !l.quoteId ? ` · Buy ${next.min} for ${AX.money(s.unitPrice(p, next.min))} each` : ''}
        ${p.heavy ? ' · <span class="badge amber">LTL freight</span>' : ''}</div>
        <button class="btn-link small" data-rm="${i}" style="margin-top:6px">Remove</button>
      </div>
      ${l.quoteId ? `<div class="muted small">Qty ${l.qty}<br>locked by quote</div>` : `<div class="qty"><button data-q="${i}" data-d="-1" aria-label="Less">−</button><input type="number" min="1" value="${l.qty}" data-qi="${i}" aria-label="Quantity"><button data-q="${i}" data-d="1" aria-label="More">+</button></div>`}
      <div class="line-price"><strong>${AX.money(l.ext)}</strong><span class="small muted">${AX.money(l.unit)} / ${p.unit}</span>${l.ext < l.listExt ? `<br><s class="small muted">${AX.money(l.listExt)}</s>` : ''}</div>
    </div>`;
  }).join('');
  const needsApproval = co && u.role === 'buyer' && t.subtotal > u.limit;
  const approver = co && co.users.find(x => x.role !== 'buyer');
  const flags = s.cartFlags(cart);

  main.innerHTML = `<div class="wrap">
    <div class="page-head"><h1>Cart</h1><p class="muted">${s.cartCount()} items · stock shown for ${AX.esc(B.short)} (<a href="#" id="chg-branch">change</a>)</p></div>
    <div class="two">
      <section class="card">${lines}</section>
      <aside class="summary">
        <h3>Order summary</h3>
        <div class="sum-row"><span>Subtotal</span><strong>${AX.money(t.subtotal)}</strong></div>
        ${t.savings > 0 ? `<div class="sum-row save"><span>Tier & contract savings</span><span>−${AX.money(t.savings)}</span></div>` : ''}
        <div class="sum-row muted"><span>Shipping</span><span>${flags.heavy ? 'LTL freight' : t.subtotal >= 250 ? 'Free ground' : 'At checkout'}</span></div>
        <div class="sum-row muted"><span>Sales tax</span><span>At checkout</span></div>
        <div class="sum-row total"><span>Estimated total</span><span>${AX.money(t.subtotal)}</span></div>
        ${needsApproval ? `<div class="notice amber small" style="margin-top:12px">This is over your ${AX.money(u.limit)} order limit. After you place it, it goes to ${AX.esc(approver ? approver.name : 'an approver')} for approval before it ships.</div>` : ''}
        ${!flags.heavy && t.subtotal < 250 ? `<div class="small muted" style="margin:10px 0">Add ${AX.money(250 - t.subtotal)} more for free ground shipping.</div>` : ''}
        <a class="btn btn-accent btn-lg btn-block" href="checkout.html" style="margin-top:12px">Continue to checkout</a>
        ${co ? `<button class="btn btn-ghost btn-block" id="quote-cart" style="margin-top:8px">Request a quote for this cart</button>` : `<p class="small muted" style="margin-top:12px">Guest checkout is card only. <a href="signin.html?next=cart.html">Sign in</a> for Net 30 terms, PO tracking and contract pricing.</p>`}
        <button class="btn-link small" id="clear" style="margin-top:12px">Empty cart</button>
      </aside>
    </div></div>`;

  AX.$('#chg-branch').onclick = e => { e.preventDefault(); AX.branchPicker(); };
  main.onclick = e => {
    const rm = e.target.closest('[data-rm]'); if (rm) return s.cartRemove(+rm.dataset.rm);
    const q = e.target.closest('[data-q]'); if (q) { const l = s.state.cart[+q.dataset.q]; return s.cartSet(+q.dataset.q, l.qty + +q.dataset.d); }
    if (e.target.id === 'clear') { if (confirm('Remove everything from your cart?')) s.cartClear(); }
    if (e.target.id === 'quote-cart') {
      const lines = s.state.cart.filter(l => !l.quoteId);
      if (!lines.length) return AX.toast('Everything in your cart is already quoted.');
      const q = s.requestQuote(lines.map(l => ({ sku: l.sku, qty: l.qty })), 'Whole-cart quote');
      AX.toast('Quote ' + q.id + ' submitted for ' + lines.length + ' lines', { href: 'account.html#quotes', label: 'View quotes' });
    }
  };
  main.onchange = e => { const i = e.target.dataset.qi; if (i != null) s.cartSet(+i, parseInt(e.target.value, 10) || 1); };
});
