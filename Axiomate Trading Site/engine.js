(function () {
  "use strict";

  const AX = (window.AX = {});

  const SIM_SEC = 5;
  const OPEN = 570,
    CLOSE = 960;
  const MIN = 60000,
    DAY = 86400000;
  const TPD = ((CLOSE - OPEN) * 60) / SIM_SEC;
  const MAXBARS = 320,
    SAVEBARS = 160;
  const MKT_VOL = 0.0085;
  const START_CASH = 100000;
  const MARGIN = 2;
  const MAINT = 0.25;
  const TFS = { "1m": 1, "5m": 5, "15m": 15, "1h": 60, "1D": "D" };
  const SECTOR_VOL = {
    Tech: 0.009,
    Finance: 0.007,
    Health: 0.007,
    Energy: 0.011,
    Consumer: 0.005,
    Industrial: 0.007,
    Crypto: 0.03,
    Commodity: 0.005,
    ETF: 0,
  };

  const ASSETS = [
    {
      sym: "AXM",
      name: "Axiomate Holdings",
      sector: "Tech",
      price: 184.2,
      dvol: 0.017,
      beta: 1.15,
      shares: 5.2e9,
      eps: 6.1,
      adv: 42e6,
      bps: 1.2,
      desc: "Diversified technology group: cloud, devices and AI services.",
    },
    {
      sym: "NVQ",
      name: "NovaQuant Semiconductors",
      sector: "Tech",
      price: 412.75,
      dvol: 0.027,
      beta: 1.6,
      shares: 2.4e9,
      eps: 9.8,
      adv: 38e6,
      bps: 1.5,
      desc: "Designs high-performance chips for data centers and AI training.",
    },
    {
      sym: "CLDX",
      name: "Cloudex Software",
      sector: "Tech",
      price: 96.1,
      dvol: 0.023,
      beta: 1.3,
      shares: 0.9e9,
      eps: 1.9,
      adv: 9e6,
      bps: 3,
      desc: "Enterprise software for workflow automation and analytics.",
    },
    {
      sym: "QBT",
      name: "Qubitron",
      sector: "Tech",
      price: 14.62,
      dvol: 0.058,
      beta: 2.0,
      shares: 0.31e9,
      eps: -0.8,
      adv: 22e6,
      bps: 8,
      desc: "Early-stage quantum computing hardware developer. Unprofitable, highly volatile.",
    },
    {
      sym: "MRDN",
      name: "Meridian Bank",
      sector: "Finance",
      price: 61.48,
      dvol: 0.015,
      beta: 1.05,
      shares: 3.1e9,
      eps: 5.4,
      adv: 18e6,
      bps: 2,
      desc: "Retail and commercial banking across 30 states.",
    },
    {
      sym: "VLT",
      name: "Vaultline Payments",
      sector: "Finance",
      price: 238.9,
      dvol: 0.017,
      beta: 1.1,
      shares: 1.6e9,
      eps: 8.7,
      adv: 7e6,
      bps: 2,
      desc: "Global card network and digital payments processor.",
    },
    {
      sym: "HLX",
      name: "Helix Biogenics",
      sector: "Health",
      price: 57.31,
      dvol: 0.04,
      beta: 0.9,
      shares: 0.42e9,
      eps: 0.6,
      adv: 11e6,
      bps: 5,
      desc: "Gene-therapy biotech with three late-stage clinical trials.",
    },
    {
      sym: "CRVN",
      name: "Carevine Health",
      sector: "Health",
      price: 132.05,
      dvol: 0.012,
      beta: 0.7,
      shares: 1.1e9,
      eps: 7.2,
      adv: 5e6,
      bps: 2.5,
      desc: "Managed care and pharmacy benefits provider.",
    },
    {
      sym: "FRG",
      name: "Forge Energy",
      sector: "Energy",
      price: 96.4,
      dvol: 0.019,
      beta: 0.95,
      shares: 4.0e9,
      eps: 8.9,
      adv: 16e6,
      bps: 2,
      desc: "Integrated oil & gas producer and refiner.",
    },
    {
      sym: "SOLR",
      name: "Solaris Renewables",
      sector: "Energy",
      price: 33.17,
      dvol: 0.034,
      beta: 1.4,
      shares: 0.6e9,
      eps: 0.4,
      adv: 14e6,
      bps: 4,
      desc: "Utility-scale solar and battery storage developer.",
    },
    {
      sym: "LMN",
      name: "Lumen Retail Group",
      sector: "Consumer",
      price: 41.12,
      dvol: 0.016,
      beta: 0.85,
      shares: 2.2e9,
      eps: 2.6,
      adv: 12e6,
      bps: 2.5,
      desc: "Big-box retailer with 2,100 stores and a growing online business.",
    },
    {
      sym: "BRWS",
      name: "Brewster Foods",
      sector: "Consumer",
      price: 72.66,
      dvol: 0.011,
      beta: 0.6,
      shares: 1.3e9,
      eps: 3.9,
      adv: 4e6,
      bps: 3,
      desc: "Packaged foods and beverages brand portfolio.",
    },
    {
      sym: "ORB",
      name: "Orbital Freight",
      sector: "Industrial",
      price: 23.88,
      dvol: 0.029,
      beta: 1.25,
      shares: 0.8e9,
      eps: 1.1,
      adv: 10e6,
      bps: 4,
      desc: "Air and ground logistics, piloting autonomous trucks.",
    },
    {
      sym: "TTN",
      name: "Titan Aerospace",
      sector: "Industrial",
      price: 205.3,
      dvol: 0.017,
      beta: 1.0,
      shares: 0.7e9,
      eps: 11.2,
      adv: 3e6,
      bps: 3,
      desc: "Commercial jets, defense systems and satellites.",
    },
    {
      sym: "AXC",
      name: "Axiocoin",
      sector: "Crypto",
      price: 64210,
      dvol: 0.04,
      beta: 0.7,
      shares: 19.6e6,
      eps: null,
      adv: 30000,
      bps: 2,
      crypto: true,
      desc: "Decentralized digital currency with a fixed 21M supply.",
    },
    {
      sym: "ETR",
      name: "Etheris",
      sector: "Crypto",
      price: 3184.5,
      dvol: 0.05,
      beta: 0.8,
      shares: 120e6,
      eps: null,
      adv: 400000,
      bps: 3,
      crypto: true,
      desc: "Smart-contract platform token.",
    },
    {
      sym: "SGLD",
      name: "Synthetic Gold",
      sector: "Commodity",
      price: 2318.4,
      dvol: 0.009,
      beta: 0.05,
      shares: null,
      eps: null,
      adv: 180000,
      bps: 1.5,
      desc: "Tracks the spot price of one troy ounce of gold.",
    },
    {
      sym: "AX50",
      name: "Axiomate 50 Index ETF",
      sector: "ETF",
      price: 482.15,
      dvol: 0.011,
      beta: 1.0,
      shares: 0.95e9,
      eps: null,
      adv: 55e6,
      bps: 0.5,
      etf: true,
      desc: "Tracks a cap-weighted basket of every simulated stock.",
    },
  ];
  const BY = {};
  ASSETS.forEach((a) => {
    BY[a.sym] = a;
  });
  const STOCKS = ASSETS.filter(
    (a) => !a.crypto && !a.etf && a.sector !== "Commodity",
  );
  ASSETS.forEach((a) => {
    const sv = SECTOR_VOL[a.sector] * 0.7;
    const sys = Math.pow(a.beta * MKT_VOL, 2) + sv * sv;
    a.idf =
      Math.sqrt(Math.max(a.dvol * a.dvol - sys, Math.pow(a.dvol * 0.35, 2))) /
      a.dvol;
    a.tick = a.price < 1 ? 0.0001 : 0.01;
    a.lot = a.crypto ? 0.001 : 1;
  });

  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  function gauss() {
    let u = 0,
      v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function tdist() {
    let c = 0;
    for (let i = 0; i < 4; i++) {
      const g = gauss();
      c += g * g;
    }
    return (gauss() / Math.sqrt(c / 4)) * Math.SQRT1_2;
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const minuteOf = (t) => (((t % DAY) + DAY) % DAY) / MIN;
  const dayStart = (t) => t - (((t % DAY) + DAY) % DAY);
  const weekday = (t) => new Date(t).getUTCDay();
  function nextSession(t) {
    let d = dayStart(t) + DAY;
    while (weekday(d) === 0 || weekday(d) === 6) d += DAY;
    return d + OPEN * MIN;
  }
  function prevTradingDay(d) {
    d -= DAY;
    while (weekday(d) === 0 || weekday(d) === 6) d -= DAY;
    return d;
  }
  function barStart(t, tf) {
    const tfm = TFS[tf],
      d = dayStart(t);
    if (tfm === "D") return d + OPEN * MIN;
    const k = Math.floor((minuteOf(t) - OPEN) / tfm);
    return d + (OPEN + k * tfm) * MIN;
  }
  function barEnd(t, tf) {
    const tfm = TFS[tf],
      s = barStart(t, tf);
    if (tfm === "D") return dayStart(t) + CLOSE * MIN;
    return Math.min(s + tfm * MIN, dayStart(t) + CLOSE * MIN);
  }
  function barTimesBefore(t, tf, n) {
    const tfm = TFS[tf],
      out = [];
    let d = dayStart(t);
    if (tfm === "D") {
      while (out.length < n) {
        d = prevTradingDay(d);
        out.push(d + OPEN * MIN);
      }
      return out.reverse();
    }
    const cur = barStart(t, tf);
    let list = [];
    for (let m = OPEN; m < CLOSE; m += tfm) list.push(d + m * MIN);
    list = list.filter((x) => x < cur).reverse();
    out.push(...list);
    while (out.length < n) {
      d = prevTradingDay(d);
      const day = [];
      for (let m = OPEN; m < CLOSE; m += tfm) day.push(d + m * MIN);
      out.push(...day.reverse());
    }
    return out.slice(0, n).reverse();
  }
  const uvol = (m) =>
    0.75 + 0.9 * Math.exp(-m / 25) + 0.45 * Math.exp(-(390 - m) / 25);
  const roundTick = (p, a) => Math.round(p / a.tick) * a.tick;
  const sig = (x) => +x.toPrecision(7);

  let S;
  AX.listeners = { news: [], fill: [], toast: [], session: [] };
  const emit = (k, v) => AX.listeners[k].forEach((f) => f(v));

  function freshState() {
    const t0 = Date.UTC(2026, 2, 2) + OPEN * MIN;
    const st = {
      v: 2,
      t: t0,
      day: 1,
      ticks: 0,
      mDrift: 0,
      mRegime: 600,
      mVm: 1,
      secDrift: {},
      market: {},
      nextNews: randi(60, 200),
      account: {
        cash: START_CASH,
        pos: {},
        orders: [],
        fills: [],
        realized: 0,
        fees: 0,
        dayStartEq: START_CASH,
        curve: [],
        peak: START_CASH,
        maxDD: 0,
      },
      bots: [],
      news: [],
      seq: 1,
      etf: null,
    };
    Object.keys(SECTOR_VOL).forEach((s) => {
      st.secDrift[s] = 0;
    });
    S = st;
    seedHistory();
    for (const a of ASSETS) {
      const m = S.market[a.sym];
      m.earn = a.eps != null ? randi(2, 12) : null;
    }
    initBots();
    S.account.curve.push([S.t, START_CASH]);
    pushNews({
      text: "Welcome to Axiomate Trading. Opening bell: the market is open. You have $100,000 in virtual cash.",
      dir: 0,
      sym: null,
      kind: "bell",
    });
    return st;
  }

  function seedHistory() {
    const T = S.t;
    for (const a of ASSETS) {
      S.market[a.sym] = {
        p: a.price,
        F: a.price,
        drift: 0,
        regime: randi(200, 1500),
        vm: 1,
        shock: 0,
        shockLeft: 0,
        bars: {},
        prevClose: a.price,
        dOpen: a.price,
        dHigh: a.price,
        dLow: a.price,
        dVol: 0,
        lvB: [],
        lvA: [],
        prints: [],
        earn: null,
      };
    }
    for (const tf of Object.keys(TFS)) {
      const n = MAXBARS - 20;
      const times = barTimesBefore(T, tf, n);
      const tfm = TFS[tf] === "D" ? 390 : TFS[tf];
      const scale = Math.sqrt(tfm / 390);
      const mk = [],
        sec = {};
      let md = 0;
      for (let i = 0; i < n; i++) {
        if (i % 30 === 0) md = gauss() * 0.15;
        mk.push((tdist() + md) * MKT_VOL * scale);
      }
      Object.keys(SECTOR_VOL).forEach((s) => {
        sec[s] = [];
        for (let i = 0; i < n; i++)
          sec[s].push(tdist() * SECTOR_VOL[s] * 0.7 * scale);
      });
      const comp = {};
      for (const a of ASSETS) {
        if (a.etf) continue;
        const rets = [];
        let drift = 0;
        for (let i = 0; i < n; i++) {
          if (i % 40 === 0) drift = gauss() * 0.2;
          rets.push(
            a.beta * mk[i] +
              sec[a.sector][i] +
              (tdist() + drift) * a.dvol * a.idf * scale,
          );
        }
        const closes = new Array(n);
        let p = a.price;
        for (let i = n - 1; i >= 0; i--) {
          closes[i] = p;
          p = p / Math.exp(rets[i]);
        }
        const bars = [];
        for (let i = 0; i < n; i++) {
          const c = closes[i];
          const o = i ? closes[i - 1] : c / Math.exp(rets[0]);
          const wig = a.dvol * scale * 0.55;
          const h = Math.max(o, c) * (1 + Math.abs(gauss()) * wig);
          const l = Math.min(o, c) * (1 - Math.abs(gauss()) * wig);
          const mod = tfm === 390 ? 1 : uvol(minuteOf(times[i]) - OPEN);
          const v =
            a.adv *
            (tfm / 390) *
            mod *
            (0.6 + (Math.abs(rets[i]) / (a.dvol * scale)) * 0.5) *
            rand(0.6, 1.4);
          bars.push({ t: times[i], o, h, l, c, v });
        }
        comp[a.sym] = bars;
        S.market[a.sym].bars[tf] = bars;
      }
      if (!S.etf) {
        const caps = STOCKS.map((a) => a.shares * a.price),
          tot = caps.reduce((x, y) => x + y, 0);
        S.etf = { w: {}, ref: {}, scale: BY.AX50.price };
        STOCKS.forEach((a, i) => {
          S.etf.w[a.sym] = caps[i] / tot;
          S.etf.ref[a.sym] = a.price;
        });
      }
      const eb = [];
      for (let i = 0; i < n; i++) {
        const f = (k) =>
          S.etf.scale *
          STOCKS.reduce(
            (s, a) =>
              s + (S.etf.w[a.sym] * comp[a.sym][i][k]) / S.etf.ref[a.sym],
            0,
          );
        const o = f("o"),
          c = f("c");
        const h = Math.max(o, c, f("h") * 0.4 + Math.max(o, c) * 0.6),
          l = Math.min(o, c, f("l") * 0.4 + Math.min(o, c) * 0.6);
        eb.push({
          t: times[i],
          o,
          h,
          l,
          c,
          v: BY.AX50.adv * (tfm / 390) * rand(0.6, 1.4),
        });
      }
      S.market.AX50.bars[tf] = eb;
    }
    for (const a of ASSETS) {
      const m = S.market[a.sym];
      const lastD = m.bars["1D"][m.bars["1D"].length - 1];
      m.prevClose = lastD.c;
      for (const tf of Object.keys(TFS))
        m.bars[tf].push({
          t: barStart(S.t, tf),
          o: m.p,
          h: m.p,
          l: m.p,
          c: m.p,
          v: 0,
        });
      m.dOpen = m.dHigh = m.dLow = m.p;
      m.F = m.p * Math.exp(gauss() * 0.03);
      initBook(a, m);
    }
  }

  const LEVELS = 12;
  function baseSize(a) {
    return Math.max(a.lot * 5, (a.adv / TPD) * 0.7);
  }
  function initBook(a, m) {
    m.lvB = [];
    m.lvA = [];
    for (let i = 0; i < LEVELS; i++) {
      m.lvB.push(baseSize(a) * (1 + i * 0.35) * rand(0.4, 1.6));
      m.lvA.push(baseSize(a) * (1 + i * 0.35) * rand(0.4, 1.6));
    }
  }
  function refreshBook(a, m) {
    for (let i = 0; i < LEVELS; i++) {
      const tgt = baseSize(a) * (1 + i * 0.35);
      m.lvB[i] = Math.max(0, m.lvB[i] * 0.88 + tgt * rand(0.02, 0.24));
      m.lvA[i] = Math.max(0, m.lvA[i] * 0.88 + tgt * rand(0.02, 0.24));
    }
  }
  function quote(sym) {
    const a = BY[sym],
      m = S.market[sym];
    const half = Math.max(
      a.tick / 2,
      ((m.p * a.bps) / 10000 / 2) * Math.min(4, m.vm * S.mVm),
    );
    let bid = Math.floor((m.p - half) / a.tick) * a.tick;
    let ask = Math.ceil((m.p + half) / a.tick) * a.tick;
    if (ask - bid < a.tick * 0.5) ask = bid + a.tick;
    return { bid: sig(bid), ask: sig(ask), mid: m.p };
  }
  function levelStep(a, m) {
    return Math.max(a.tick, roundTick(m.p * 0.00012, a));
  }
  function book(sym) {
    const a = BY[sym],
      m = S.market[sym],
      q = quote(sym),
      st = levelStep(a, m);
    const bids = [],
      asks = [];
    for (let i = 0; i < LEVELS; i++) {
      bids.push([sig(q.bid - i * st), roundSize(a, m.lvB[i])]);
      asks.push([sig(q.ask + i * st), roundSize(a, m.lvA[i])]);
    }
    return { bids, asks, step: st };
  }
  function roundSize(a, s) {
    return a.crypto
      ? Math.max(0.001, Math.round(s * 1000) / 1000)
      : Math.max(1, Math.round(s));
  }
  function walk(sym, side, qty, limit, consume) {
    const a = BY[sym],
      m = S.market[sym],
      q = quote(sym),
      st = levelStep(a, m);
    const lv = side === "buy" ? m.lvA : m.lvB;
    let rem = qty,
      cost = 0,
      filled = 0,
      i = 0;
    while (rem > 1e-9) {
      const px = side === "buy" ? q.ask + i * st : q.bid - i * st;
      if (
        limit != null &&
        (side === "buy" ? px > limit + 1e-9 : px < limit - 1e-9)
      )
        break;
      if (px <= 0) break;
      const avail = i < LEVELS ? Math.max(0, lv[i]) : baseSize(a) * 3;
      const take = Math.min(rem, avail);
      if (take > 0) {
        cost += take * px;
        filled += take;
        rem -= take;
        if (consume && i < LEVELS) lv[i] -= take;
      }
      i++;
      if (i > 400) {
        cost += rem * px;
        filled += rem;
        rem = 0;
      }
    }
    return { qty: filled, avg: filled ? cost / filled : 0, levels: i };
  }

  const A = () => S.account;
  function commission(sym, qty, px) {
    const a = BY[sym];
    if (a.crypto) return qty * px * 0.001;
    return Math.min(Math.max(1, 0.005 * qty), qty * px * 0.01);
  }
  function mark(sym) {
    const q = quote(sym);
    const p = A().pos[sym];
    return p && p.q < 0 ? q.ask : q.bid;
  }
  function equity() {
    let e = A().cash;
    for (const s in A().pos) e += A().pos[s].q * mark(s);
    return e;
  }
  function gross() {
    let g = 0;
    for (const s in A().pos) g += Math.abs(A().pos[s].q) * S.market[s].p;
    return g;
  }
  function unrealized() {
    let u = 0;
    for (const s in A().pos) {
      const p = A().pos[s];
      u += (mark(s) - p.avg) * p.q;
    }
    return u;
  }
  function buyingPower() {
    return Math.max(0, equity() * MARGIN - gross());
  }
  function grossAfter(sym, dq) {
    const p = A().pos[sym],
      cur = p ? p.q : 0;
    return (
      gross() -
      Math.abs(cur) * S.market[sym].p +
      Math.abs(cur + dq) * S.market[sym].p
    );
  }

  function applyFill(sym, side, qty, px, kind, fee) {
    const acc = A(),
      dq = side === "buy" ? qty : -qty;
    const p = acc.pos[sym] || { q: 0, avg: 0, t: S.t };
    let pnl = null;
    if (p.q === 0 || Math.sign(p.q) === Math.sign(dq)) {
      p.avg =
        (p.avg * Math.abs(p.q) + px * Math.abs(dq)) /
        (Math.abs(p.q) + Math.abs(dq));
      if (p.q === 0) p.t = S.t;
      p.q += dq;
    } else {
      const closeQ = Math.min(Math.abs(dq), Math.abs(p.q));
      pnl = closeQ * (px - p.avg) * Math.sign(p.q);
      acc.realized += pnl;
      p.q += dq;
      if (Math.abs(p.q) < 1e-9) p.q = 0;
      else if (Math.sign(p.q) === Math.sign(dq)) {
        p.avg = px;
        p.t = S.t;
      }
    }
    acc.cash -= dq * px + fee;
    acc.fees += fee;
    if (p.q === 0) delete acc.pos[sym];
    else acc.pos[sym] = p;
    const f = { id: S.seq++, t: S.t, sym, side, q: qty, px, kind, pnl, fee };
    acc.fills.unshift(f);
    if (acc.fills.length > 300) acc.fills.length = 300;
    const m = S.market[sym];
    m.prints.unshift({ t: S.t, px, sz: qty, side, mine: true });
    if (m.prints.length > 50) m.prints.length = 50;
    emit("fill", f);
    cleanupReduceOnly(sym);
    return f;
  }
  function execute(sym, side, qty, opts = {}) {
    const a = BY[sym];
    qty = a.crypto ? Math.floor(qty * 1000) / 1000 : Math.floor(qty);
    if (!(qty > 0))
      return {
        error: a.crypto
          ? "Minimum size is 0.001."
          : "Quantity must be at least 1 share.",
      };
    const w = walk(sym, side, qty, opts.limit, false);
    if (w.qty <= 0) return { error: "No liquidity at that price." };
    const dq = side === "buy" ? w.qty : -w.qty;
    if (!opts.force) {
      const ga = grossAfter(sym, dq);
      const fee = commission(sym, w.qty, w.avg);
      if (ga > gross() + 1e-6 && ga > (equity() - fee) * MARGIN) {
        return {
          error: `Not enough buying power. This order needs about ${fmtUsd((ga - gross()) / MARGIN)} of equity; you have ${fmtUsd(buyingPower() / MARGIN)} free.`,
        };
      }
    }
    const r = walk(sym, side, qty, opts.limit, true);
    const fee = commission(sym, r.qty, r.avg);
    const m = S.market[sym];
    const part = r.qty / Math.max(a.lot, a.adv / 78);
    m.p *= Math.exp(
      (side === "buy" ? 1 : -1) * a.dvol * 0.12 * Math.sqrt(part),
    );
    const f = applyFill(sym, side, r.qty, r.avg, opts.kind || "market", fee);
    return { fill: f, partial: r.qty < qty - 1e-9, filled: r.qty };
  }
  const fmtUsd = (n) => "$" + Math.round(n).toLocaleString("en-US");

  function placeOrder(o) {
    const a = BY[o.sym];
    o.q = a.crypto ? Math.floor(o.q * 1000) / 1000 : Math.floor(o.q);
    if (!(o.q > 0))
      return {
        error: a.crypto
          ? "Minimum size is 0.001."
          : "Quantity must be at least 1 share.",
      };
    if (o.type === "market") {
      const r = execute(o.sym, o.side, o.q, { kind: "market" });
      if (r.error) return r;
      if (o.tp || o.sl) attachBracket(o, r.filled);
      return r;
    }
    if (!(o.px > 0)) return { error: "Enter a valid price." };
    const q = quote(o.sym);
    if (o.type === "stop") {
      if (o.side === "buy" && o.px <= q.ask)
        return {
          error: `A buy stop must be above the ask (${q.ask.toFixed(2)}). Use a limit order to buy lower.`,
        };
      if (o.side === "sell" && o.px >= q.bid)
        return {
          error: `A sell stop must be below the bid (${q.bid.toFixed(2)}). Use a limit order to sell higher.`,
        };
    }
    const dq = o.side === "buy" ? o.q : -o.q;
    const ga = grossAfter(o.sym, dq);
    if (!o.reduceOnly && ga > gross() + 1e-6 && ga > equity() * MARGIN)
      return { error: "Not enough buying power for this order." };
    const ord = {
      id: S.seq++,
      t: S.t,
      sym: o.sym,
      side: o.side,
      type: o.type,
      q: o.q,
      px: o.px,
      tif: o.tif || "day",
      tp: o.tp || null,
      sl: o.sl || null,
      oco: o.oco || null,
      reduceOnly: !!o.reduceOnly,
    };
    A().orders.push(ord);
    if (o.type === "limit") tryFill(ord);
    return { order: ord };
  }

  function attachBracket(o, qty) {
    const exit = o.side === "buy" ? "sell" : "buy";
    const oco = S.seq++;
    if (o.tp)
      A().orders.push({
        id: S.seq++,
        t: S.t,
        sym: o.sym,
        side: exit,
        type: "limit",
        q: qty,
        px: o.tp,
        tif: "gtc",
        oco,
        reduceOnly: true,
        label: "TP",
      });
    if (o.sl)
      A().orders.push({
        id: S.seq++,
        t: S.t,
        sym: o.sym,
        side: exit,
        type: "stop",
        q: qty,
        px: o.sl,
        tif: "gtc",
        oco,
        reduceOnly: true,
        label: "SL",
      });
  }
  function cancelOrder(id) {
    A().orders = A().orders.filter((o) => o.id !== id);
  }
  function cleanupReduceOnly(sym) {
    const p = A().pos[sym];
    A().orders = A().orders.filter((o) => {
      if (!o.reduceOnly || o.sym !== sym) return true;
      if (!p) return false;
      const closes =
        (p.q > 0 && o.side === "sell") || (p.q < 0 && o.side === "buy");
      if (!closes) return false;
      o.q = Math.min(o.q, Math.abs(p.q));
      return true;
    });
  }

  function tryFill(o) {
    const q = quote(o.sym);
    let fire = false,
      limit = null;
    if (o.type === "limit") {
      fire = o.side === "buy" ? q.ask <= o.px + 1e-9 : q.bid >= o.px - 1e-9;
      limit = o.px;
    } else {
      fire = o.side === "buy" ? q.ask >= o.px - 1e-9 : q.bid <= o.px + 1e-9;
    }
    if (!fire) return false;
    if (o.reduceOnly) {
      const p = A().pos[o.sym];
      if (!p) {
        cancelOrder(o.id);
        return true;
      }
      o.q = Math.min(o.q, Math.abs(p.q));
    }
    const kind = o.label
      ? o.label === "TP"
        ? "take-profit"
        : "stop-loss"
      : o.type;
    const r = execute(o.sym, o.side, o.q, { limit, kind, force: o.reduceOnly });
    if (r.error) {
      cancelOrder(o.id);
      emit("toast", {
        text: `${o.type === "stop" ? "Stop" : "Limit"} order for ${o.sym} cancelled: ${r.error}`,
        kind: "warn",
      });
      return true;
    }
    if (o.tp || o.sl) attachBracket(o, r.filled);
    o.q -= r.filled;
    if (o.q <= 1e-9 || o.type === "stop") {
      cancelOrder(o.id);
      if (o.oco) A().orders = A().orders.filter((x) => x.oco !== o.oco);
    }
    return true;
  }
  function processOrders() {
    for (const o of [...A().orders]) if (A().orders.includes(o)) tryFill(o);
  }

  function checkMargin() {
    const g = gross();
    if (g <= 0) return;
    const eq = equity();
    if (eq >= g * MAINT) return;
    emit("toast", {
      text: "MARGIN CALL — equity fell below 25% of your positions. Closing positions.",
      kind: "warn",
      sticky: true,
    });
    pushNews({
      text: "Your broker issued a margin call and liquidated positions.",
      dir: -1,
      sym: null,
      kind: "you",
    });
    const syms = Object.keys(A().pos).sort(
      (x, y) =>
        Math.abs(A().pos[y].q) * S.market[y].p -
        Math.abs(A().pos[x].q) * S.market[x].p,
    );
    for (const s of syms) {
      const p = A().pos[s];
      execute(s, p.q > 0 ? "sell" : "buy", Math.abs(p.q), {
        kind: "liquidation",
        force: true,
      });
      if (equity() >= gross() * 0.5) break;
    }
  }

  const BOT_DEFS = [
    {
      name: "IndexIrene",
      strat: "index",
      blurb: "Buys the AX50 index and holds.",
    },
    {
      name: "MomentumMax",
      strat: "momentum",
      blurb: "Chases the 3 strongest stocks.",
    },
    {
      name: "ReversionRita",
      strat: "meanrev",
      blurb: "Buys the day's biggest losers.",
    },
    {
      name: "YOLOYuki",
      strat: "yolo",
      blurb: "All-in on one volatile asset at a time.",
    },
    {
      name: "ValueVictor",
      strat: "value",
      blurb: "Holds the cheapest stocks by P/E.",
    },
    {
      name: "CryptoCass",
      strat: "crypto",
      blurb: "Crypto-only, rebalanced 50/50.",
    },
  ];
  function initBots() {
    S.bots = BOT_DEFS.map((b) => ({
      ...b,
      cash: START_CASH,
      pos: {},
      trades: 0,
    }));
  }
  function botEq(b) {
    let e = b.cash;
    for (const s in b.pos) e += b.pos[s] * S.market[s].p;
    return e;
  }
  function botTarget(b, weights) {
    const eq = botEq(b);
    const syms = new Set([...Object.keys(b.pos), ...Object.keys(weights)]);
    for (const s of syms) {
      const px = S.market[s].p,
        want = ((weights[s] || 0) * eq) / px;
      const have = b.pos[s] || 0,
        d = want - have;
      if (Math.abs(d * px) < eq * 0.02 && want) continue;
      const fill = px * (1 + (Math.sign(d) * BY[s].bps) / 20000);
      b.cash -= d * fill;
      if (Math.abs(want) < 1e-9) delete b.pos[s];
      else b.pos[s] = want;
      if (Math.abs(d) > 1e-9) b.trades++;
    }
  }
  function retOver(sym, tf, n) {
    const b = S.market[sym].bars[tf];
    const r = b[Math.max(0, b.length - 1 - n)];
    return S.market[sym].p / r.o - 1;
  }
  function stepBots() {
    for (const b of S.bots) {
      const w = {};
      if (b.strat === "index") w.AX50 = 1;
      else if (b.strat === "momentum")
        STOCKS.slice()
          .sort((x, y) => retOver(y.sym, "15m", 8) - retOver(x.sym, "15m", 8))
          .slice(0, 3)
          .forEach((a) => {
            w[a.sym] = 0.32;
          });
      else if (b.strat === "meanrev")
        STOCKS.slice()
          .sort((x, y) => dayChg(x.sym) - dayChg(y.sym))
          .slice(0, 3)
          .forEach((a) => {
            w[a.sym] = 0.32;
          });
      else if (b.strat === "value")
        STOCKS.filter((a) => a.eps > 0)
          .sort((x, y) => S.market[x.sym].p / x.eps - S.market[y.sym].p / y.eps)
          .slice(0, 5)
          .forEach((a) => {
            w[a.sym] = 0.19;
          });
      else if (b.strat === "crypto") {
        w.AXC = 0.49;
        w.ETR = 0.49;
      } else if (b.strat === "yolo") {
        const cur = Object.keys(b.pos)[0];
        const s =
          !cur || Math.random() < 0.12
            ? pick(["QBT", "HLX", "SOLR", "ETR", "AXC", "ORB", "NVQ"])
            : cur;
        w[s] = 0.98;
      }
      botTarget(b, w);
    }
  }

  const GOOD = [
    "{n} announces a multi-year partnership with a major cloud provider",
    "Analysts upgrade {s} to Buy, citing accelerating demand",
    "{n} unveils new flagship product line to strong reviews",
    "Report: {n} exploring sale; private equity interest rumored",
    "{n} authorizes $5B share buyback",
    "Large block buyer spotted accumulating {s}",
    "{n} wins major government contract",
    "{n} raises dividend 12%",
  ];
  const BAD = [
    "Regulators open investigation into {n}",
    "Analysts downgrade {s} to Underperform on margin concerns",
    "{n} CEO steps down unexpectedly",
    "{n} issues voluntary recall of flagship product",
    "Short-seller report alleges accounting issues at {n}",
    "{n} delays key product launch to next year",
    "Supply chain disruption hits {n} production",
    "Key executive departs {n} for rival",
  ];
  const SECTOR_NEWS = {
    Tech: [
      ["AI spending boom lifts chipmakers and software names", 1],
      ["Proposed tech regulation weighs on the sector", -1],
    ],
    Finance: [
      ["Bank stress test results come in better than feared", 1],
      ["Credit concerns spread across regional banks", -1],
    ],
    Health: [
      ["FDA fast-tracks approvals in key therapy areas", 1],
      ["Drug-pricing reform bill advances in Congress", -1],
    ],
    Energy: [
      ["Oil jumps as supply cut extended", 1],
      ["Crude slides on surprise inventory build", -1],
    ],
    Consumer: [
      ["Retail sales beat expectations; shoppers keep spending", 1],
      ["Consumer confidence drops to 2-year low", -1],
    ],
    Industrial: [
      ["Manufacturing index expands for a third month", 1],
      ["Freight volumes slump on weak orders", -1],
    ],
    Crypto: [
      ["Crypto rallies as major exchange lists spot products", 1],
      ["Crypto sells off after exchange hack headlines", -1],
    ],
    Commodity: [
      ["Gold climbs on safe-haven demand", 1],
      ["Gold slips as the dollar strengthens", -1],
    ],
  };
  const MACRO = [
    ["Central bank signals rate cuts ahead; equities rally", 1],
    ["Inflation report runs hotter than expected", -1],
    ["Jobs report beats forecasts; soft-landing hopes grow", 1],
    ["Global growth worries hit risk assets", -1],
    ["Treasury yields surge to multi-year highs", -1],
    ["Trade deal headlines spark broad rally", 1],
  ];
  function pushNews(n) {
    n.t = n.t || S.t;
    S.news.unshift(n);
    if (S.news.length > 80) S.news.length = 80;
    emit("news", n);
  }
  function shock(sym, total, ticks, volBoost) {
    const m = S.market[sym];
    m.shock = Math.log(1 + total) / ticks;
    m.shockLeft = ticks;
    m.vm = Math.min(5, m.vm + (volBoost || 1));
  }
  function fireNews() {
    const r = Math.random();
    if (r < 0.07) {
      const [text, dir] = pick(MACRO);
      S.mVm = Math.min(2, S.mVm + 0.25);
      for (const a of ASSETS)
        if (!a.etf)
          shock(a.sym, dir * a.beta * rand(0.003, 0.009), randi(30, 90), 0.15);
      pushNews({ text, dir, sym: null, kind: "macro" });
    } else if (r < 0.25) {
      const sec = pick(Object.keys(SECTOR_NEWS));
      const [text, dir] = pick(SECTOR_NEWS[sec]);
      for (const a of ASSETS)
        if (a.sector === sec)
          shock(a.sym, dir * rand(0.004, 0.012), randi(20, 70), 0.3);
      pushNews({ text, dir, sym: null, sector: sec, kind: "sector" });
    } else {
      const a = pick(
        ASSETS.filter((x) => !x.etf && !x.crypto && x.sector !== "Commodity"),
      );
      const dir = Math.random() < 0.52 ? 1 : -1;
      const text = pick(dir > 0 ? GOOD : BAD)
        .replace("{n}", a.name)
        .replace("{s}", a.sym);
      const mega = a.shares * S.market[a.sym].p > 4e11;
      const mag = rand(0.01, 0.045) * (a.dvol / 0.02) * (mega ? 0.5 : 1);
      shock(a.sym, dir * Math.min(mag, 0.14), randi(8, 40), 1.2);
      S.market[a.sym].F *= Math.exp(dir * mag * 0.6);
      pushNews({ text, dir, sym: a.sym, kind: "company" });
    }
  }

  function updateBars(sym, vol) {
    const m = S.market[sym],
      p = m.p;
    for (const tf of Object.keys(TFS)) {
      const bars = m.bars[tf],
        bs = barStart(S.t, tf);
      let b = bars[bars.length - 1];
      if (b.t !== bs) {
        b = { t: bs, o: p, h: p, l: p, c: p, v: 0 };
        bars.push(b);
        if (bars.length > MAXBARS) bars.shift();
      }
      if (p > b.h) b.h = p;
      if (p < b.l) b.l = p;
      b.c = p;
      b.v += vol;
    }
    if (p > m.dHigh) m.dHigh = p;
    if (p < m.dLow) m.dLow = p;
    m.dVol += vol;
  }
  function dayChg(sym) {
    const m = S.market[sym];
    return m.p / m.prevClose - 1;
  }

  function etfPrice() {
    return (
      S.etf.scale *
      STOCKS.reduce(
        (s, a) => s + (S.etf.w[a.sym] * S.market[a.sym].p) / S.etf.ref[a.sym],
        0,
      )
    );
  }

  function tick() {
    S.t += SIM_SEC * 1000;
    S.ticks++;
    if (minuteOf(S.t) >= CLOSE) {
      closeSession();
      return;
    }
    const mm = minuteOf(S.t) - OPEN,
      u = uvol(mm);
    if (--S.mRegime <= 0) {
      S.mDrift = pick([-1, 0, 0, 1]) * rand(0.003, 0.012);
      S.mRegime = randi(400, 3000);
    }
    const zM = tdist();
    const mσ = (MKT_VOL / Math.sqrt(TPD)) * u * S.mVm;
    const rm = mσ * (zM + S.mDrift);
    S.mVm = 1 + (S.mVm - 1) * 0.998 + 0.015 * Math.max(0, Math.abs(zM) - 3);
    const rs = {};
    for (const s in SECTOR_VOL) {
      if (Math.random() < 0.0004)
        S.secDrift[s] = pick([-1, 0, 1]) * rand(0.003, 0.015);
      rs[s] =
        ((SECTOR_VOL[s] * 0.7) / Math.sqrt(TPD)) *
        u *
        (tdist() + S.secDrift[s]);
    }
    for (const a of ASSETS) {
      const m = S.market[a.sym];
      let r,
        z = 0;
      if (a.etf) {
        const np = etfPrice();
        r = Math.log(np / m.p);
        z = r / (a.dvol / Math.sqrt(TPD));
        m.p = np;
      } else {
        if (--m.regime <= 0) {
          m.drift = pick([-1, -1, 0, 0, 0, 1, 1]) * rand(0.005, 0.018);
          m.regime = randi(300, 2500);
        }
        const σ = (a.dvol / Math.sqrt(TPD)) * u * m.vm * (a.crypto ? 1 : 1);
        z = tdist();
        r =
          a.beta * rm +
          rs[a.sector] +
          σ * a.idf * (z + m.drift) -
          0.00002 * Math.log(m.p / m.F);
        if (m.shockLeft > 0) {
          r += m.shock;
          m.shockLeft--;
        }
        if (Math.random() < 0.0002) r += tdist() * σ * 10;
        m.p = Math.max(a.tick, m.p * Math.exp(r));
        m.vm = 1 + (m.vm - 1) * 0.997 + 0.03 * Math.max(0, Math.abs(z) - 3);
        m.F *= Math.exp((gauss() * a.dvol * 0.2) / Math.sqrt(TPD));
      }
      const vol =
        (a.adv / TPD) *
        u *
        (0.5 + Math.abs(z) * 0.8) *
        m.vm *
        rand(0.3, 1.7) *
        (m.shockLeft > 0 ? 2.5 : 1);
      updateBars(a.sym, vol);
      refreshBook(a, m);
      const n = Math.random() < 0.6 ? randi(1, 3) : 0;
      if (n) {
        const q = quote(a.sym);
        for (let i = 0; i < n; i++) {
          const buy = r > 0 ? Math.random() < 0.65 : Math.random() < 0.35;
          let sz = (vol / n) * rand(0.3, 1.6);
          sz = a.crypto
            ? Math.max(0.001, Math.round(sz * 1000) / 1000)
            : Math.max(
                1,
                Math.round(sz / (sz > 500 ? 100 : 1)) * (sz > 500 ? 100 : 1),
              );
          m.prints.unshift({
            t: S.t,
            px: buy ? q.ask : q.bid,
            sz,
            side: buy ? "buy" : "sell",
          });
        }
        if (m.prints.length > 50) m.prints.length = 50;
      }
    }
    processOrders();
    checkMargin();
    if (S.ticks % 60 === 0) stepBots();
    if (S.ticks % 12 === 0) sampleEquity();
    if (--S.nextNews <= 0) {
      fireNews();
      S.nextNews = randi(220, 650);
    }
  }

  function sampleEquity() {
    const acc = A(),
      eq = equity();
    acc.curve.push([S.t, sig(eq)]);
    if (acc.curve.length > 2400)
      acc.curve = acc.curve.filter(
        (_, i) => i % 2 === 0 || i === acc.curve.length - 1,
      );
    if (eq > acc.peak) acc.peak = eq;
    acc.maxDD = Math.max(acc.maxDD, 1 - eq / acc.peak);
  }

  function closeSession() {
    const idx = S.market.AX50;
    pushNews({
      text: `Closing bell — AX50 ends the day ${(dayChg("AX50") >= 0 ? "+" : "") + (dayChg("AX50") * 100).toFixed(2)}% at ${idx.p.toFixed(2)}.`,
      dir: Math.sign(dayChg("AX50")),
      sym: null,
      kind: "bell",
      t: dayStart(S.t) + CLOSE * MIN,
    });
    const before = A().orders.length;
    A().orders = A().orders.filter((o) => o.tif === "gtc");
    if (A().orders.length < before)
      emit("toast", {
        text: `${before - A().orders.length} day order(s) expired at the close.`,
        kind: "",
      });
    for (const a of ASSETS) S.market[a.sym].prevClose = S.market[a.sym].p;
    sampleEquity();
    S.t = nextSession(S.t);
    S.day++;
    const gm = gauss() * 0.004;
    for (const a of ASSETS) {
      if (a.etf) continue;
      const m = S.market[a.sym];
      let gap = a.beta * gm + gauss() * a.dvol * (a.crypto ? 0.8 : 0.3);
      if (m.earn === S.day) gap += earnings(a, m);
      m.p = Math.max(a.tick, m.p * Math.exp(gap));
      m.vm = Math.max(1, m.vm * 0.7);
    }
    S.market.AX50.p = etfPrice();
    for (const a of ASSETS) {
      const m = S.market[a.sym];
      m.dOpen = m.dHigh = m.dLow = m.p;
      m.dVol = 0;
      initBook(a, m);
    }
    A().dayStartEq = equity();
    const d = new Date(S.t);
    pushNews({
      text: `Opening bell — Day ${S.day} (${d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" })}). AX50 opens ${(dayChg("AX50") >= 0 ? "+" : "") + (dayChg("AX50") * 100).toFixed(2)}%.`,
      dir: 0,
      sym: null,
      kind: "bell",
    });
    emit("session", S.day);
    for (const a of ASSETS) updateBars(a.sym, 0);
  }

  const eps$ = (v) => (v < 0 ? "-$" : "$") + Math.abs(v).toFixed(2);
  function earnings(a, m) {
    const qn = (Math.floor(S.day / 20) % 4) + 1;
    const est = (Math.abs(a.eps) / 4) * (a.eps < 0 ? -1 : 1);
    const surprise = gauss();
    const act = est + Math.abs(est) * surprise * 0.12;
    const mega = a.shares * m.p > 4e11;
    const move = clamp(
      (surprise * a.dvol * 2.6 + gauss() * a.dvol) * (mega ? 0.6 : 1),
      -0.25,
      0.25,
    );
    m.F *= Math.exp(move * 0.8);
    m.vm = Math.min(5, m.vm + 2);
    m.earn = S.day + randi(15, 25);
    const beat = act >= est;
    pushNews({
      text: `${a.name} Q${qn} earnings: EPS ${eps$(act)} vs ${eps$(est)} est. — ${beat ? "beat" : "miss"}. Shares ${move >= 0 ? "up" : "down"} ${(Math.abs(Math.exp(move) - 1) * 100).toFixed(1)}% at the open.`,
      dir: Math.sign(move),
      sym: a.sym,
      kind: "earnings",
    });
    return move;
  }

  const KEY = "axiomate-trading-v2";
  function save() {
    try {
      const out = { ...S, market: {} };
      for (const s in S.market) {
        const m = S.market[s],
          bars = {};
        for (const tf in m.bars)
          bars[tf] = m.bars[tf]
            .slice(-SAVEBARS)
            .map((b) => [
              b.t,
              sig(b.o),
              sig(b.h),
              sig(b.l),
              sig(b.c),
              Math.round(b.v * 1000) / 1000,
            ]);
        out.market[s] = { ...m, bars, prints: m.prints.slice(0, 20) };
      }
      localStorage.setItem(KEY, JSON.stringify(out));
    } catch {}
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return false;
      const st = JSON.parse(raw);
      if (!st || st.v !== 2 || !st.market) return false;
      for (const a of ASSETS) {
        const m = st.market[a.sym];
        if (!m || !m.bars) return false;
        for (const tf in TFS) {
          if (!m.bars[tf] || !m.bars[tf].length) return false;
          m.bars[tf] = m.bars[tf].map((b) => ({
            t: b[0],
            o: b[1],
            h: b[2],
            l: b[3],
            c: b[4],
            v: b[5],
          }));
        }
      }
      S = st;
      return true;
    } catch {
      return false;
    }
  }
  function reset() {
    try {
      localStorage.removeItem(KEY);
    } catch {}
    freshState();
  }

  Object.defineProperty(AX, "S", { get: () => S });
  Object.assign(AX, {
    ASSETS,
    BY,
    TFS,
    OPEN,
    CLOSE,
    MIN,
    START_CASH,
    MARGIN,
    MAINT,
    SIM_SEC,
    init() {
      if (!load()) freshState();
    },
    tick,
    save,
    reset,
    quote,
    book,
    walk,
    commission,
    equity,
    gross,
    unrealized,
    buyingPower,
    grossAfter,
    placeOrder,
    cancelOrder,
    execute,
    dayChg,
    barStart,
    barEnd,
    minuteOf,
    botEq,
    isOpen: () => minuteOf(S.t) >= OPEN && minuteOf(S.t) < CLOSE,
  });
})();
