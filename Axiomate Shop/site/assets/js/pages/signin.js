AX.page(function signin() {
  const s = AX.store, next = AX.qs('next') || 'account.html';
  const safeNext = /^[a-z]+\.html([?#].*)?$/.test(next) ? next : 'account.html';
  const others = Object.values(s.state.companies).filter(c => !c.demo);
  const cur = s.company();
  const demoUsers = [
    ['u1', 'Jordan Avery', 'Purchasing Manager · admin', 'Approves orders, pays invoices, manages buyers and limits.'],
    ['u2', 'Sam Okafor', 'Office Coordinator · buyer, $2,500 limit', 'Orders over $2,500 wait for Jordan to approve them.'],
    ['u3', 'Priya Nair', 'Site Supervisor · buyer, $1,000 limit', 'Orders job-site safety gear with a low limit.']
  ];
  AX.$('#main').innerHTML = `<div class="wrap" style="max-width:880px">
    <div class="page-head"><h1>Sign in to a business account</h1>
      <p class="muted">This is a concept store, so there are no passwords. Accounts exist only in this browser. Pick the demo company, or one you've opened here.</p></div>
    ${cur ? `<div class="notice">You're signed in to <strong>${AX.esc(cur.name)}</strong>. <a href="account.html">Go to dashboard</a> or choose another account below.</div>` : ''}
    <section class="card">
      <div class="card-head"><div><h2 style="margin:0">Kestrel Ridge Engineering, LLC</h2><div class="muted small">Demo company · Silver tier (3% contract) · Net 30 · $25,000 credit line · PO required</div></div><span class="badge navy">Demo</span></div>
      <div class="opts">${demoUsers.map(([id, n, r, d]) => `<button class="opt" data-demo="${id}" style="text-align:left;font:inherit"><span class="grow"><strong>${n}</strong><small>${r}</small><small>${d}</small></span><span class="btn btn-primary btn-sm">Sign in</span></button>`).join('')}</div>
      <p class="small muted" style="margin:14px 0 0">The demo company comes with order history, one past-due invoice and three ship-to addresses (two in Washington, one in Texas) so you can see how tax and shipping change.</p>
    </section>
    ${others.length ? `<section class="card"><h3>Accounts opened in this browser</h3><div class="opts">${others.map(c => `<button class="opt" data-co="${c.id}" style="text-align:left;font:inherit"><span class="grow"><strong>${AX.esc(c.name)}</strong><small>${c.creditLimit ? c.terms + ' · ' + AX.money(c.creditLimit) + ' line' : 'Card / ACH account'} · ${AX.esc(c.users[0].name)}</small></span><span class="btn btn-primary btn-sm">Sign in</span></button>`).join('')}</div></section>` : ''}
    <section class="card" style="display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap">
      <div><h3 style="margin:0">New here?</h3><p class="muted" style="margin:0">Open a business account and get an instant decision on Net 30 terms.</p></div>
      <a class="btn btn-accent" href="apply.html">Open a business account</a></section>
  </div>`;
  AX.$('#main').onclick = e => {
    const d = e.target.closest('[data-demo]'), c = e.target.closest('[data-co]');
    if (d) { s.seedDemo(); s.signIn('kestrel', d.dataset.demo); location.href = safeNext; }
    if (c) { s.signIn(c.dataset.co); location.href = safeNext; }
  };
});
