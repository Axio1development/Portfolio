(function () {
  const f = { cat: AX.qs('cat') || '', q: (AX.qs('q') || '').trim(), brands: [], avail: '', sort: 'relevance' };
  let built = false;

  function matches(p) {
    if (f.cat && p.cat !== f.cat) return false;
    if (f.brands.length && !f.brands.includes(p.brand)) return false;
    if (f.q) {
      const hay = (p.name + ' ' + p.brand + ' ' + p.sku + ' ' + AX.catById[p.cat].name + ' ' + p.desc).toLowerCase();
      if (!f.q.toLowerCase().split(/\s+/).every(w => hay.includes(w))) return false;
    }
    const s = AX.store;
    if (f.avail === 'branch' && s.stock(p.sku, s.state.branch) <= 0) return false;
    if (f.avail === 'any' && s.totalStock(p.sku) <= 0) return false;
    return true;
  }

  function results() {
    const s = AX.store;
    let list = AX.products.filter(matches);
    const price = p => s.unitPrice(p, 1);
    if (f.sort === 'price-asc') list.sort((a, b) => price(a) - price(b));
    if (f.sort === 'price-desc') list.sort((a, b) => price(b) - price(a));
    if (f.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
    if (f.sort === 'stock') list.sort((a, b) => s.stock(b.sku, s.state.branch) - s.stock(a.sku, s.state.branch));
    AX.$('#count').textContent = `${list.length} product${list.length === 1 ? '' : 's'}`;
    AX.$('#results').innerHTML = list.length ? `<div class="grid">${list.map(AX.tile).join('')}</div>`
      : `<div class="card empty"><h2>No matches</h2><p>Try a different search or clear the filters.</p><a class="btn btn-ghost" href="shop.html">Clear all</a></div>`;
  }

  function build() {
    const cat = f.cat ? AX.catById[f.cat] : null;
    const pool = AX.products.filter(p => !f.cat || p.cat === f.cat);
    const brands = [...new Set(pool.map(p => p.brand))].sort();
    AX.$('#main').innerHTML = `<div class="wrap">
      <div class="page-head">
        <div class="crumbs"><a href="index.html">Home</a> / <a href="shop.html">Shop</a>${cat ? ' / ' + cat.name : ''}</div>
        <h1>${f.q ? `Results for “${AX.esc(f.q)}”` : cat ? cat.name : 'All products'}</h1>
        ${cat ? `<p class="muted">${cat.blurb}. Tier pricing applies automatically as quantities go up.</p>` : `<p class="muted">Tier pricing applies automatically as quantities go up. Signed-in accounts see their contract price.</p>`}
      </div>
      <div class="shop">
        <aside class="filters" aria-label="Filters">
          <h4>Category</h4>
          <label class="check"><input type="radio" name="cat" value="" ${!f.cat ? 'checked' : ''}> All categories</label>
          ${AX.categories.map(c => `<label class="check"><input type="radio" name="cat" value="${c.id}" ${f.cat === c.id ? 'checked' : ''}> ${c.name}</label>`).join('')}
          <h4>Availability</h4>
          <label class="check"><input type="radio" name="avail" value="" checked> Show everything</label>
          <label class="check"><input type="radio" name="avail" value="branch"> In stock at my branch</label>
          <label class="check"><input type="radio" name="avail" value="any"> In stock anywhere</label>
          <h4>Brand</h4>
          ${brands.map(b => `<label class="check"><input type="checkbox" name="brand" value="${AX.esc(b)}"> ${AX.esc(b)}</label>`).join('')}
        </aside>
        <section>
          <div class="toolbar"><strong id="count"></strong>
            <label class="small">Sort <select id="sort">
              <option value="relevance">Featured</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="name">Name</option><option value="stock">Most in stock at my branch</option>
            </select></label></div>
          <div id="results"></div>
        </section>
      </div></div>`;
    AX.$('.filters').addEventListener('change', e => {
      if (e.target.name === 'cat') { location.href = 'shop.html' + (e.target.value ? '?cat=' + e.target.value : '') + (f.q ? (e.target.value ? '&' : '?') + 'q=' + encodeURIComponent(f.q) : ''); return; }
      if (e.target.name === 'avail') f.avail = e.target.value;
      if (e.target.name === 'brand') f.brands = AX.$$('input[name=brand]:checked').map(i => i.value);
      results();
    });
    AX.$('#sort').onchange = e => { f.sort = e.target.value; results(); };
    built = true;
  }

  AX.page(function shop() { if (!built) build(); results(); });
})();
