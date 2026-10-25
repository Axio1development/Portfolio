(function () {
  const AX = window.AX;
  const KEY = 'axiomate-shop:v1';
  const MIN = 60 * 1000, HOUR = 60 * MIN, DAY = 24 * HOUR;
  AX.DAY = DAY;

  function fresh() {
    return { v: 1, branch: 'HP', destState: 'WA', cart: [], session: null, companies: {}, orders: [],
             quotes: [], returns: [], stockAdj: {}, seq: 4815210, qseq: 20480, rseq: 3310 };
  }
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(KEY));
      if (o && o.v === 1) return Object.assign(fresh(), o);
    } catch (e) {}
    return fresh();
  }
  let S = load();
  const listeners = [];
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
    listeners.forEach(f => { try { f(); } catch (e) { console.error(e); } });
  }
  window.addEventListener('storage', e => { if (e.key === KEY) { S = load(); listeners.forEach(f => f()); } });

  const r2 = n => Math.round(n * 100) / 100;
  function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; }

  const isBiz = d => d.getDay() !== 0 && d.getDay() !== 6;
  function addBiz(date, n) { const d = new Date(date); while (n > 0) { d.setDate(d.getDate() + 1); if (isBiz(d)) n--; } return d; }
  function shipDay(now = new Date(), cutoffHour = 16) {
    const d = new Date(now);
    if (!isBiz(d) || d.getHours() >= cutoffHour) return addBiz(d, 1);
    return d;
  }

  function baseStock(p, loc) {
    if (p.stock && p.stock[loc] != null) return p.stock[loc];
    const L = AX.locById[loc], h = hash(p.sku + loc);
    if (L.type === 'dc') return Math.round(p.b * (0.55 + 0.9 * h));
    if (p.dcOnly || h < 0.14) return 0;
    return Math.max(2, Math.round(p.b * 0.1 * (0.4 + 1.2 * h)));
  }
  function stock(sku, loc) {
    const p = AX.bySku[sku];
    return Math.max(0, baseStock(p, loc) - (S.stockAdj[sku + '@' + loc] || 0));
  }
  function adjust(sku, loc, qty) { const k = sku + '@' + loc; S.stockAdj[k] = (S.stockAdj[k] || 0) + qty; }
  const totalStock = sku => AX.locations.reduce((t, l) => t + stock(sku, l.id), 0);

  const DEFAULT_TIERS = [{ min: 1, pct: 0 }, { min: 10, pct: .04 }, { min: 25, pct: .08 }, { min: 100, pct: .12 }];
  const tiers = p => p.tiers || DEFAULT_TIERS;
  function tierPct(p, qty) { let pct = 0; for (const t of tiers(p)) if (qty >= t.min) pct = t.pct; return pct; }
  function unitPrice(p, qty, co = company()) {
    let u = p.price * (1 - tierPct(p, qty));
    if (co && co.contractPct && !p.noContract) u *= (1 - co.contractPct);
    return r2(u);
  }

  const company = () => (S.session && S.companies[S.session.companyId]) || null;
  function user() { const c = company(); if (!c) return null; return c.users.find(u => u.id === S.session.userId) || c.users[0]; }
  const canApprove = u => u && (u.role === 'admin' || u.role === 'approver');

  function newCompany(data) {
    const id = 'c' + Date.now().toString(36);
    const co = Object.assign({
      id, createdAt: Date.now(), tier: 'Standard', contractPct: 0, terms: 'Net 30', creditLimit: 0,
      taxExempt: false, exemptCert: null, poRequired: false, card: null, ach: null, addresses: [], users: []
    }, data, { id });
    S.companies[id] = co;
    return co;
  }

  function seedDemo() {
    if (S.companies.kestrel) return S.companies.kestrel;
    const now = Date.now();
    const co = {
      id: 'kestrel', demo: true, name: 'Kestrel Ridge Engineering, LLC', industry: 'Civil engineering', account: 'AXB-208714',
      createdAt: now - 400 * DAY, tier: 'Silver', contractPct: 0.03, terms: 'Net 30', creditLimit: 25000,
      taxExempt: false, exemptCert: null, poRequired: true,
      card: { brand: 'Corporate Visa', last4: '1881' }, ach: { bank: 'First Cascade Bank', last4: '6620' },
      addresses: [
        { id: 'a1', label: 'Headquarters', attn: 'Front desk receiving', line1: '1180 Alder Commons Dr, Suite 300', city: 'Bellmont', state: 'WA', zip: '98431', dock: false },
        { id: 'a2', label: 'Fallow Creek field office', attn: 'Site trailer 2', line1: '900 Old Mill Road', city: 'Fallow Creek', state: 'TX', zip: '75402', dock: false },
        { id: 'a3', label: 'Equipment yard', attn: 'Dock 1', line1: '41 Carver Industrial Ct', city: 'Bellmont', state: 'WA', zip: '98433', dock: true }
      ],
      users: [
        { id: 'u1', name: 'Jordan Avery', title: 'Purchasing Manager', email: 'j.avery@kestrelridge.example', role: 'admin', limit: 25000 },
        { id: 'u2', name: 'Sam Okafor', title: 'Office Coordinator', email: 's.okafor@kestrelridge.example', role: 'buyer', limit: 2500 },
        { id: 'u3', name: 'Priya Nair', title: 'Site Supervisor', email: 'p.nair@kestrelridge.example', role: 'buyer', limit: 1000 }
      ]
    };
    S.companies.kestrel = co;
    const hist = (id, daysAgo, lines, opts) => {
      const placedAt = now - daysAgo * DAY;
      const L = lines.map(([sku, qty]) => { const p = AX.bySku[sku]; return { sku, name: p.name, qty, list: p.price, unit: unitPrice(p, qty, co), alloc: [{ loc: opts.from || 'HP', qty }], backorder: 0 }; });
      const subtotal = r2(L.reduce((t, l) => t + l.unit * l.qty, 0));
      const shipping = subtotal >= 250 ? 0 : 12.95;
      const tax = r2(subtotal * (AX.states[opts.state || 'WA'][1] / 100));
      S.orders.push({
        id, companyId: 'kestrel', placedBy: opts.by || 'Jordan Avery', placedAt, releasedAt: placedAt, lines: L,
        method: 'ship', service: 'ground', shipTo: co.addresses[opts.addr || 0], po: opts.po, job: opts.job || '',
        payment: { type: 'net30', label: 'Net 30 on account' }, subtotal, shipping, accessorials: 0, tax, total: r2(subtotal + shipping + tax),
        invoiceDate: placedAt + DAY, paidAt: opts.paid ? placedAt + opts.paid * DAY : null,
        tracking: 'AXF' + String(Math.floor(hash(id) * 1e9)).padStart(9, '0'), eta: null, history: true
      });
    };
    hist('SO-4815201', 41, [['AX-PP-2001', 12], ['AX-PP-2003', 2]], { po: 'KR-24-1187', job: 'HQ operations' });
    hist('SO-4815203', 18, [['AX-SF-6001', 20], ['AX-SF-6003', 30], ['AX-SF-6002', 12]], { po: 'KR-24-1215', job: 'Fallow Creek bridge', addr: 1, state: 'TX', from: 'RJ', by: 'Priya Nair' });
    hist('SO-4815205', 9, [['AX-TC-3002', 4], ['AX-TC-3004', 4], ['AX-TC-3003', 4]], { po: 'KR-24-1240', job: 'New hires Q4', paid: 7 });
    return co;
  }

  function signIn(companyId, userId) {
    const co = S.companies[companyId]; if (!co) return;
    S.session = { companyId, userId: userId || co.users[0].id };
    save();
  }
  function signOut() { S.session = null; save(); }
  function switchUser(userId) { if (S.session) { S.session.userId = userId; save(); } }

  function cartAdd(sku, qty) {
    qty = Math.max(1, Math.floor(qty || 1));
    const line = S.cart.find(l => l.sku === sku && !l.quoteId);
    if (line) line.qty += qty; else S.cart.push({ sku, qty });
    save();
  }
  function cartSet(i, qty) { const l = S.cart[i]; if (!l || l.quoteId) return; l.qty = Math.max(1, Math.floor(qty)); save(); }
  function cartRemove(i) {
    const l = S.cart[i]; if (!l) return;
    if (l.quoteId) { const q = S.quotes.find(q => q.id === l.quoteId); if (q) q.accepted = null; }
    S.cart.splice(i, 1); save();
  }
  function cartClear() { S.cart = []; save(); }
  const cartCount = () => S.cart.reduce((t, l) => t + l.qty, 0);

  function priceLines(lines) {
    const co = company();
    return lines.map(l => {
      const p = AX.bySku[l.sku];
      const unit = l.quotedPrice != null ? l.quotedPrice : unitPrice(p, l.qty, co);
      return Object.assign({}, l, { p, unit, ext: r2(unit * l.qty), listExt: r2(p.price * l.qty) });
    });
  }

  function transit(fromLoc, destState) {
    const a = AX.locById[fromLoc].region, b = AX.regionOfState(destState);
    if (a === b) return [1, 2];
    if ((a === 'HP' && b === 'EG') || (a === 'EG' && b === 'HP')) return [4, 5];
    return [2, 4];
  }
  function plan(lines, f) {
    const now = new Date();
    const out = { lines: [], ready: null, eta: null, backorder: false, transfer: false };
    let latestFrom = null, latestTo = null;
    for (const l of lines) {
      const p = AX.bySku[l.sku];
      let need = l.qty; const alloc = [];
      const order = f.method === 'pickup'
        ? [f.branch, AX.locById[f.branch].parent].filter(Boolean)
        : (() => { const prim = AX.regionOfState(f.state); return [prim, ...['HP', 'RJ', 'EG'].filter(x => x !== prim)]; })();
      for (const loc of order) {
        if (need <= 0) break;
        const have = stock(l.sku, loc);
        const take = Math.min(have, need);
        if (take > 0) { alloc.push({ loc, qty: take, transfer: loc !== order[0] }); need -= take; }
      }
      const res = { sku: l.sku, alloc, backorder: need, restock: need > 0 ? addBiz(now, p.leadDays || 7) : null };
      if (need > 0) out.backorder = true;
      for (const a of alloc) {
        if (a.transfer) out.transfer = true;
        let from, to;
        if (f.method === 'pickup') {
          if (!a.transfer) {
            const today = isBiz(now) && now.getHours() < 15;
            from = to = today ? new Date(now.getTime() + 2 * HOUR) : (() => { const d = addBiz(now, 1); d.setHours(9, 0, 0, 0); return d; })();
          } else { const d = addBiz(shipDay(now), 1); d.setHours(9, 0, 0, 0); from = to = d; }
        } else {
          const sd = shipDay(now);
          const t = f.service === 'nextday' && !a.transfer ? [1, 1] : transit(a.loc, f.state);
          from = addBiz(sd, t[0] + (f.service === 'ltl' ? 1 : 0)); to = addBiz(sd, t[1] + (f.service === 'ltl' ? 2 : 0));
        }
        if (!latestFrom || from > latestFrom) latestFrom = from;
        if (!latestTo || to > latestTo) latestTo = to;
      }
      out.lines.push(res);
    }
    out.eta = latestFrom ? { from: +latestFrom, to: +latestTo } : null;
    return out;
  }

  function cartFlags(lines) {
    return { heavy: lines.some(l => AX.bySku[l.sku].heavy), hazmat: lines.some(l => AX.bySku[l.sku].hazmat) };
  }
  function shippingOptions(priced) {
    const sub = priced.reduce((t, l) => t + l.ext, 0);
    const { heavy, hazmat } = cartFlags(priced);
    if (heavy) return [{ id: 'ltl', name: 'LTL freight', price: sub >= 2500 ? 0 : 129, note: 'Required for furniture and large items. Carrier calls to book a delivery window.' }];
    const opts = [{ id: 'ground', name: 'Ground', price: sub >= 250 ? 0 : 12.95, note: 'Free on orders over $250' }];
    opts.push(hazmat
      ? { id: 'nextday', name: 'Next business day', price: 0, disabled: true, note: 'Not available: cart has a ground-only hazmat item' }
      : { id: 'nextday', name: 'Next business day', price: 34.95, note: 'Order by 4:00 PM (DC local time)' });
    return opts;
  }
  const ACCESSORIALS = [
    { id: 'liftgate', name: 'Liftgate delivery', price: 45, note: 'Needed if there is no loading dock' },
    { id: 'inside', name: 'Inside delivery', price: 75, note: 'Carrier brings pallets past the threshold' },
    { id: 'appt', name: 'Delivery appointment call', price: 0, note: 'Free: carrier calls ahead' }
  ];

  function taxRate(st) {
    const co = company();
    if (co && co.taxExempt && co.exemptCert && (co.exemptCert.state === 'ALL' || co.exemptCert.state === st)) return 0;
    return (AX.states[st] || ['', 0])[1] / 100;
  }

  function totals(lines, f) {
    const priced = priceLines(lines);
    const subtotal = r2(priced.reduce((t, l) => t + l.ext, 0));
    const listTotal = r2(priced.reduce((t, l) => t + l.listExt, 0));
    let shipping = 0, accessorials = 0;
    if (f && f.method === 'ship') {
      const o = shippingOptions(priced).find(o => o.id === f.service && !o.disabled) || shippingOptions(priced)[0];
      shipping = o.price;
      if (o.id === 'ltl') accessorials = (f.acc || []).reduce((t, id) => t + (ACCESSORIALS.find(a => a.id === id) || { price: 0 }).price, 0);
    }
    const st = f ? (f.method === 'pickup' ? AX.locById[f.branch].state : f.state) : null;
    const rate = st ? taxRate(st) : null;
    const tax = rate != null ? r2(subtotal * rate) : null;
    return { priced, subtotal, savings: r2(listTotal - subtotal), shipping, accessorials, taxRate: rate, tax,
             total: r2(subtotal + shipping + accessorials + (tax || 0)), taxState: st };
  }

  function credit(co = company()) {
    if (!co) return null;
    let used = 0;
    for (const o of S.orders) {
      if (o.companyId !== co.id || o.payment.type !== 'net30' || o.paidAt) continue;
      if (o.state === 'cancelled' || o.state === 'rejected') continue;
      used += o.total - (o.creditMemo || 0);
    }
    used = r2(used);
    return { limit: co.creditLimit, used, available: r2(Math.max(0, co.creditLimit - used)) };
  }

  const SHIP_STAGES = [['placed', 'Order placed', 0], ['processing', 'Processing', 1], ['picked', 'Picked & packed', 3], ['shipped', 'Shipped', 6], ['out', 'Out for delivery', 10], ['delivered', 'Delivered', 15]];
  const PICK_STAGES = [['placed', 'Order placed', 0], ['processing', 'Processing', 1], ['picked', 'Picked & staged', 3], ['ready', 'Ready for pickup', 5], ['collected', 'Picked up', null]];

  function status(o, now = Date.now()) {
    if (o.state === 'cancelled') return { key: 'cancelled', label: 'Cancelled', idx: -1, stages: [] };
    if (o.state === 'rejected') return { key: 'rejected', label: 'Not approved', idx: -1, stages: [] };
    if (o.state === 'pending_approval') return { key: 'pending_approval', label: 'Awaiting approval', idx: -1, stages: o.method === 'pickup' ? PICK_STAGES : SHIP_STAGES };
    const stages = o.method === 'pickup' ? PICK_STAGES : SHIP_STAGES;
    let idx = 0;
    stages.forEach((s, i) => { if (s[2] != null && now >= o.releasedAt + s[2] * MIN) idx = i; });
    if (o.method === 'pickup' && o.collectedAt) idx = stages.length - 1;
    if (o.history) idx = stages.length - 1;
    const times = stages.map((s, i) => i <= idx ? (o.history ? o.placedAt + i * 0.25 * DAY : (s[2] != null ? o.releasedAt + s[2] * MIN : o.collectedAt)) : null);
    return { key: stages[idx][0], label: stages[idx][1], idx, stages, times };
  }
  const stageReached = (o, key) => { const s = status(o); return s.idx >= 0 && s.stages.findIndex(x => x[0] === key) <= s.idx; };
  const fulfilled = o => o.method === 'pickup' ? stageReached(o, 'collected') : stageReached(o, 'shipped');

  function invoice(o) {
    if (o.state === 'cancelled' || o.state === 'rejected' || o.state === 'pending_approval') return null;
    if (!fulfilled(o)) return null;
    const st = status(o);
    const date = o.invoiceDate || (o.method === 'pickup' ? o.collectedAt : st.times[3]);
    const due = o.payment.type === 'net30' ? date + 30 * DAY : date;
    const balance = o.paidAt || o.payment.type !== 'net30' ? 0 : r2(o.total - (o.creditMemo || 0));
    const pastDue = o.payment.type === 'net30' && !o.paidAt && Date.now() > due;
    return { id: 'INV-' + o.id.slice(3), date, due, balance, paid: o.payment.type !== 'net30' || !!o.paidAt, pastDue };
  }

  function nextId(prefix, key) { S[key] += 1 + Math.floor(Math.random() * 3); return prefix + S[key]; }

  function placeOrder(f) {
    const co = company(), u = user();
    if (!S.cart.length) throw new Error('Your cart is empty.');
    const t = totals(S.cart, f);
    if (co && co.poRequired && !(f.po || '').trim()) throw new Error('Your company requires a PO number on every order.');
    if (f.payment === 'net30') {
      if (!co || !co.creditLimit) throw new Error('Net 30 terms need an approved business credit account.');
      const c = credit(co);
      if (t.total > c.available) throw new Error('This order is over your available credit (' + AX.money(c.available) + '). Pay by card or ACH, or ask us about a limit increase.');
    }
    if (f.method === 'ship' && !(f.address && f.address.line1 && f.address.city && f.address.zip)) throw new Error('Add a complete shipping address.');
    const shipOpts = shippingOptions(t.priced);
    const service = f.method === 'ship' ? (shipOpts.find(o => o.id === f.service && !o.disabled) || shipOpts[0]).id : null;
    const pl = plan(S.cart, Object.assign({}, f, { service }));
    const lines = t.priced.map((l, i) => ({
      sku: l.sku, name: l.p.name, qty: l.qty, list: l.p.price, unit: l.unit, quoteId: l.quoteId || null,
      alloc: pl.lines[i].alloc, backorder: pl.lines[i].backorder, restock: pl.lines[i].restock ? +pl.lines[i].restock : null
    }));
    lines.forEach(l => l.alloc.forEach(a => adjust(l.sku, a.loc, a.qty)));
    const needsApproval = co && u && u.role === 'buyer' && t.total > u.limit;
    const payLabel = { net30: 'Net 30 on account', card: co && co.card ? co.card.brand + ' •••• ' + co.card.last4 : 'Card (simulated)', ach: co && co.ach ? 'ACH · ' + co.ach.bank + ' •••• ' + co.ach.last4 : 'ACH' }[f.payment];
    const o = {
      id: nextId('SO-', 'seq'), companyId: co ? co.id : null, placedBy: u ? u.name : (f.contact && f.contact.name) || 'Guest',
      contact: f.contact || null, placedAt: Date.now(), releasedAt: needsApproval ? null : Date.now(),
      state: needsApproval ? 'pending_approval' : null, lines, method: f.method, service,
      acc: f.acc || [], shipTo: f.method === 'ship' ? f.address : null, branch: f.method === 'pickup' ? f.branch : null,
      po: (f.po || '').trim(), job: (f.job || '').trim(), notes: (f.notes || '').trim(),
      payment: { type: f.payment, label: payLabel },
      subtotal: t.subtotal, savings: t.savings, shipping: t.shipping, accessorials: t.accessorials, tax: t.tax, taxState: t.taxState, total: t.total,
      eta: pl.eta, tracking: service ? (service === 'ltl' ? 'PRO ' : 'AXF') + String(Math.floor(Math.random() * 1e9)).padStart(9, '0') : null,
      events: [{ at: Date.now(), text: needsApproval ? 'Submitted for approval: over ' + u.name + "'s " + AX.money(u.limit) + ' order limit' : 'Order received' }]
    };
    S.cart.forEach(l => { if (l.quoteId) { const q = S.quotes.find(q => q.id === l.quoteId); if (q) q.orderedIn = o.id; } });
    S.orders.unshift(o);
    S.cart = [];
    save();
    return o;
  }

  function releaseStock(o) { o.lines.forEach(l => l.alloc.forEach(a => adjust(l.sku, a.loc, -a.qty))); }
  function approve(id) {
    const o = S.orders.find(o => o.id === id), u = user();
    if (!o || o.state !== 'pending_approval' || !canApprove(u)) return;
    o.state = null; o.releasedAt = Date.now(); o.approvedBy = u.name;
    o.events.push({ at: Date.now(), text: 'Approved by ' + u.name });
    save();
  }
  function reject(id, reason) {
    const o = S.orders.find(o => o.id === id), u = user();
    if (!o || o.state !== 'pending_approval' || !canApprove(u)) return;
    o.state = 'rejected'; releaseStock(o);
    o.events.push({ at: Date.now(), text: 'Not approved by ' + u.name + (reason ? ': ' + reason : '') });
    save();
  }
  function canCancel(o) { const s = status(o); return s.key === 'pending_approval' || (s.idx >= 0 && s.idx <= 1); }
  function cancel(id) {
    const o = S.orders.find(o => o.id === id);
    if (!o || !canCancel(o)) return false;
    o.state = 'cancelled'; releaseStock(o);
    o.events.push({ at: Date.now(), text: 'Cancelled by ' + ((user() || {}).name || 'customer') });
    save(); return true;
  }
  function collect(id) {
    const o = S.orders.find(o => o.id === id);
    if (!o || status(o).key !== 'ready') return;
    o.collectedAt = Date.now();
    o.events.push({ at: Date.now(), text: 'Picked up at ' + AX.locById[o.branch].short + ' counter, signed by ' + ((user() || {}).name || o.placedBy) });
    save();
  }
  function payInvoice(id, method) {
    const o = S.orders.find(o => o.id === id);
    if (!o || o.paidAt) return;
    o.paidAt = Date.now(); o.paidWith = method;
    save();
  }
  function reorder(id) {
    const o = S.orders.find(o => o.id === id); if (!o) return;
    o.lines.forEach(l => cartAdd(l.sku, l.qty));
  }

  function requestQuote(lines, note) {
    const co = company(), u = user();
    if (!co) throw new Error('Sign in to a business account to request a quote.');
    const q = {
      id: nextId('Q-', 'qseq'), companyId: co.id, by: u.name, createdAt: Date.now(), note: note || '',
      lines: lines.map(l => { const p = AX.bySku[l.sku]; const cur = unitPrice(p, l.qty, co); const value = cur * l.qty;
        const extra = value >= 5000 ? .09 : value >= 1500 ? .06 : .035;
        return { sku: l.sku, qty: l.qty, current: cur, quoted: r2(cur * (1 - extra)) }; })
    };
    S.quotes.unshift(q); save(); return q;
  }
  function quoteStatus(q, now = Date.now()) {
    if (q.orderedIn) return { key: 'ordered', label: 'Ordered' };
    if (q.accepted) return { key: 'accepted', label: 'In cart' };
    if (now < q.createdAt + 1.5 * MIN) return { key: 'review', label: 'In review' };
    if (now > q.createdAt + 30 * DAY) return { key: 'expired', label: 'Expired' };
    return { key: 'quoted', label: 'Quote ready' };
  }
  function acceptQuote(id) {
    const q = S.quotes.find(q => q.id === id); if (!q || quoteStatus(q).key !== 'quoted') return;
    q.accepted = Date.now();
    q.lines.forEach(l => S.cart.push({ sku: l.sku, qty: l.qty, quoteId: q.id, quotedPrice: l.quoted }));
    save();
  }

  function requestReturn(orderId, items, reason) {
    const o = S.orders.find(o => o.id === orderId); if (!o) throw new Error('Order not found');
    let credit = 0, fee = 0;
    const waive = /Damaged|Wrong|Defective/.test(reason || '');
    const lines = items.filter(i => i.qty > 0).map(i => {
      const l = o.lines.find(x => x.sku === i.sku); const p = AX.bySku[i.sku];
      const amt = r2(l.unit * i.qty); const f = !waive && ['furniture', 'tech'].includes(p.cat) ? r2(amt * .15) : 0;
      credit += amt; fee += f; return { sku: i.sku, name: l.name, qty: i.qty, amount: amt, fee: f };
    });
    if (!lines.length) throw new Error('Choose at least one item to return.');
    const rate = o.subtotal ? (o.tax || 0) / o.subtotal : 0;
    const taxBack = r2(credit * rate);
    const r = { id: nextId('RMA-', 'rseq'), orderId, companyId: o.companyId, createdAt: Date.now(), reason, lines,
                fee: r2(fee), credit: r2(credit - fee + taxBack), taxBack };
    S.returns.unshift(r); save(); return r;
  }
  function returnStatus(r, now = Date.now()) {
    if (now >= r.createdAt + 8 * MIN) return { key: 'credited', label: 'Credit issued', idx: 3 };
    if (now >= r.createdAt + 5 * MIN) return { key: 'inspected', label: 'Received & inspected', idx: 2 };
    if (now >= r.createdAt + 2 * MIN) return { key: 'transit', label: 'In transit to Harbor Point', idx: 1 };
    return { key: 'authorized', label: 'Return authorized', idx: 0 };
  }
  function syncCredits() {
    let changed = false;
    for (const r of S.returns) {
      if (r.applied || returnStatus(r).key !== 'credited') continue;
      const o = S.orders.find(o => o.id === r.orderId);
      if (o) { o.creditMemo = r2((o.creditMemo || 0) + r.credit); r.lines.forEach(l => adjust(l.sku, 'HP', -l.qty)); }
      r.applied = true; changed = true;
    }
    if (changed) save();
  }

  AX.store = {
    get state() { return S; }, save, on: f => listeners.push(f), reset() { S = fresh(); save(); },
    stock, totalStock, tiers, unitPrice, company, user, canApprove, newCompany, seedDemo, signIn, signOut, switchUser,
    cartAdd, cartSet, cartRemove, cartClear, cartCount, priceLines, plan, shippingOptions, ACCESSORIALS, cartFlags, totals,
    credit, status, invoice, placeOrder, approve, reject, canCancel, cancel, collect, payInvoice, reorder, stageReached,
    requestQuote, quoteStatus, acceptQuote, requestReturn, returnStatus, syncCredits,
    setBranch(id) { S.branch = id; save(); }, setDestState(st) { S.destState = st; save(); },
    order: id => S.orders.find(o => o.id === id)
  };
})();
