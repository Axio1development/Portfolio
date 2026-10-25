AX.page(function locations() {
  const s = AX.store, me = s.state.branch;
  const now = new Date();
  const openNow = l => { const d = now.getDay(), h = now.getHours() + now.getMinutes() / 60;
    if (d === 0) return false; if (d === 6) return l.hours.includes('Sat') && h >= 8 && h < (l.type === 'dc' ? 14 : 12);
    return l.type === 'dc' ? h >= 6 && h < 20 : h >= 7 && h < 17; };
  AX.$('#main').innerHTML = `<div class="wrap">
    <div class="page-head"><h1>Locations</h1><p class="muted">Three distribution centers ship parcel and freight nationwide. Three branches handle counter pickup and restock overnight from their parent DC. All locations are fictional.</p></div>
    <div class="band" style="margin-bottom:20px;grid-template-columns:1.3fr 1fr">
      ${AX.netmap(me, true)}
      <div><h3>How orders are routed</h3>
        <ul class="small" style="padding-left:18px;margin:0">
          <li><strong>Shipping:</strong> your delivery state picks the DC. West ships from Harbor Point, central and south from Redstone Junction, Midwest and East from Eastgate.</li>
          <li><strong>Short on stock?</strong> The rest comes from another DC as a transfer, which adds transit days. Nothing anywhere? The line is backordered and ships separately.</li>
          <li><strong>Same-day cutoff:</strong> parcel orders placed before 4:00 PM local on a business day ship that day.</li>
          <li><strong>Pickup:</strong> shelf stock is ready in about 2 hours. Items from the parent DC arrive on the overnight truck for 9 AM pickup.</li>
          <li><strong>Freight:</strong> furniture and large items ship LTL with a booked delivery window.</li></ul></div>
    </div>
    <div class="loc-grid">${AX.locations.map(l => {
      const kids = AX.locations.filter(x => x.parent === l.id);
      return `<article class="loc${l.id === me ? ' me' : ''}" id="${l.id}">
        <h3><span>${AX.esc(l.name)}<br><small class="muted" style="font-weight:500">${l.type === 'dc' ? 'Distribution center' : 'Branch · supplied by ' + AX.locById[l.parent].short}</small></span>
          <span>${openNow(l) ? '<span class="badge green">Open now</span>' : '<span class="badge">Closed</span>'}</span></h3>
        <p style="margin:0">${AX.esc(l.street)}<br>${l.city}, ${l.state} ${l.zip} · ${l.phone}</p>
        <dl class="kv"><dt>Hours</dt><dd>${AX.esc(l.hours)}</dd><dt>Pickup</dt><dd>${AX.esc(l.counter)}</dd><dt>Ship cutoff</dt><dd>${l.type === 'dc' ? l.cutoff + ' for same-day parcel' : 'Ships via ' + AX.locById[l.parent].short}</dd><dt>Facility</dt><dd>${l.sqft} · ${l.docks} dock door${l.docks > 1 ? 's' : ''}</dd>
          ${kids.length ? `<dt>Supplies</dt><dd>${kids.map(k => k.short).join(', ')}</dd>` : ''}</dl>
        <ul>${l.services.map(x => `<li>${x}</li>`).join('')}</ul>
        <p class="small muted" style="margin:10px 0 14px">${AX.esc(l.note)}</p>
        ${l.id === me ? '<span class="badge blue">Your branch</span>' : `<button class="btn btn-ghost btn-sm" data-set="${l.id}">Make this my branch</button>`}
      </article>`; }).join('')}</div></div>`;
  AX.$('#main').onclick = e => { const b = e.target.closest('[data-set]'); if (b) { s.setBranch(b.dataset.set); AX.toast('Branch set to ' + AX.locById[b.dataset.set].short); } };
});
