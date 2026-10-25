(function () {
  "use strict";
  const AX = window.AX;
  const TICK_MS = 250;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) =>
    String(s).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  const num = (n, d = 2) =>
    (n ?? 0).toLocaleString("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  const usd = (n, d = 2) => (n < 0 ? "-$" : "$") + num(Math.abs(n), d);
  const signed = (n, d = 2) => (n >= 0 ? "+" : "-") + "$" + num(Math.abs(n), d);
  const pct = (n, d = 2) => (n >= 0 ? "+" : "") + (n * 100).toFixed(d) + "%";
  const cls = (n) => (n > 1e-9 ? "up" : n < -1e-9 ? "down" : "");
  const isCrypto = (sym) => !!AX.BY[sym].crypto;
  const fq = (q, sym) => {
    const c = sym ? isCrypto(sym) : !Number.isInteger(q);
    return c
      ? q.toLocaleString("en-US", { maximumFractionDigits: 3 })
      : q.toLocaleString("en-US", { maximumFractionDigits: 0 });
  };
  const big = (n) =>
    n == null
      ? "—"
      : n >= 1e12
        ? "$" + (n / 1e12).toFixed(2) + "T"
        : n >= 1e9
          ? "$" + (n / 1e9).toFixed(2) + "B"
          : "$" + (n / 1e6).toFixed(1) + "M";
  const MON = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const hms = (t) => {
    const d = new Date(t);
    return [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()]
      .map((x) => String(x).padStart(2, "0"))
      .join(":");
  };
  const hm = (t) => hms(t).slice(0, 5);
  const dateL = (t) => {
    const d = new Date(t);
    return `${DOW[d.getUTCDay()]}, ${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
  };
  const shortDate = (t) => {
    const d = new Date(t);
    return `${MON[d.getUTCMonth()]} ${d.getUTCDate()}`;
  };
  const store = {
    get(k) {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch {}
    },
  };

  const ui = JSON.parse(store.get("axiomate-ui") || "{}");
  let sel = AX.BY[ui.sel] ? ui.sel : "AXM";
  let side = "buy",
    otype = "market",
    tif = "day",
    btab = "positions",
    bookTab = "book",
    chip = "All",
    search = "";
  let speed = 1,
    lastSpeed = 1;
  const saveUi = () =>
    store.set(
      "axiomate-ui",
      JSON.stringify({
        sel,
        tf: chart.tf,
        type: chart.type,
        ind: chart.ind,
        lower: chart.lower,
        n: chart.n,
      }),
    );

  AX.init();
  const S = () => AX.S;

  const chart = new AX.Chart($("#chart"), (off) => {
    $("#go-latest").hidden = off === 0;
  });
  if (ui.tf && AX.TFS[ui.tf]) chart.tf = ui.tf;
  if (ui.type) chart.type = ui.type;
  if (ui.ind) Object.assign(chart.ind, ui.ind);
  if (ui.lower) chart.lower = ui.lower;
  if (ui.n) chart.n = ui.n;
  const syncSeg = (id, attr, val) =>
    $$(`#${id} button`).forEach((b) =>
      b.classList.toggle("on", b.dataset[attr] === val),
    );
  syncSeg("tf", "tf", chart.tf);
  syncSeg("ctype", "type", chart.type);
  syncSeg("lower", "lower", chart.lower);
  $$("#ind button").forEach((b) =>
    b.classList.toggle("on", !!chart.ind[b.dataset.ind]),
  );

  new ResizeObserver(() => {
    chart.resize();
    drawChart();
  }).observe($("#chart-wrap"));
  function drawChart() {
    const m = S().market[sel],
      pos = S().account.pos[sel];
    const tf = chart.tf,
      now = S().t,
      endT = AX.barEnd(now, tf);
    const left = Math.max(0, Math.round((endT - now) / 1000));
    const cd =
      tf === "1D"
        ? `${Math.floor(left / 3600)}h${String(Math.floor((left % 3600) / 60)).padStart(2, "0")}m`
        : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`;
    chart.set({
      sym: sel,
      bars: m.bars[tf],
      price: m.p,
      dp: 2,
      countdown: cd,
      pos: pos ? { q: pos.q, avg: pos.avg } : null,
      orders: S().account.orders.filter((o) => o.sym === sel),
      fills: S()
        .account.fills.filter((f) => f.sym === sel)
        .slice(0, 60),
    });
  }
  $$("#tf button").forEach((b) =>
    b.addEventListener("click", () => setTf(b.dataset.tf)),
  );
  function setTf(tf) {
    chart.tf = tf;
    chart.off = 0;
    $("#go-latest").hidden = true;
    syncSeg("tf", "tf", tf);
    drawChart();
    saveUi();
  }
  $$("#ctype button").forEach((b) =>
    b.addEventListener("click", () => {
      chart.type = b.dataset.type;
      syncSeg("ctype", "type", chart.type);
      drawChart();
      saveUi();
    }),
  );
  $$("#lower button").forEach((b) =>
    b.addEventListener("click", () => {
      chart.lower = b.dataset.lower;
      syncSeg("lower", "lower", chart.lower);
      drawChart();
      saveUi();
    }),
  );
  $$("#ind button").forEach((b) =>
    b.addEventListener("click", () => {
      const k = b.dataset.ind;
      chart.ind[k] = !chart.ind[k];
      b.classList.toggle("on", chart.ind[k]);
      drawChart();
      saveUi();
    }),
  );
  $("#go-latest").addEventListener("click", () => {
    chart.off = 0;
    $("#go-latest").hidden = true;
    drawChart();
  });

  function renderHeader() {
    const s = S(),
      acc = s.account,
      eq = AX.equity(),
      up = AX.unrealized();
    const open = AX.isOpen();
    $("#clock").textContent = `${dateL(s.t)} · ${hms(s.t)}`;
    const closeT = s.t - (s.t % 86400000) + AX.CLOSE * AX.MIN,
      left = Math.max(0, (closeT - s.t) / 60000);
    $("#clock-sub").textContent =
      `Day ${s.day} · closes in ${Math.floor(left / 60)}h ${String(Math.floor(left % 60)).padStart(2, "0")}m`;
    const live = $("#live-dot");
    live.classList.toggle("paused", speed === 0);
    live.querySelector("b").textContent =
      speed === 0 ? "PAUSED" : open ? "OPEN" : "CLOSED";
    const ix = s.market.AX50,
      ic = AX.dayChg("AX50");
    $("#idx-px").textContent = num(ix.p);
    const c = $("#idx-chg");
    c.textContent = pct(ic);
    c.className = "mono small " + cls(ic);
    $("#st-equity").textContent = usd(eq);
    const dp = eq - acc.dayStartEq;
    const d = $("#st-day");
    d.textContent = signed(dp);
    d.className = "mono " + cls(dp);
    const u = $("#st-upnl");
    u.textContent = signed(up);
    u.className = "mono " + cls(up);
    $("#st-bp").textContent = usd(AX.buyingPower(), 0);
    const g = AX.gross(),
      mb = $("#margin-banner");
    if (g > 0 && eq < g * 0.35) {
      mb.hidden = false;
      mb.textContent = `⚠ Margin warning: your equity is ${((eq / g) * 100).toFixed(0)}% of your position value. Below 25%, positions get liquidated automatically.`;
    } else mb.hidden = true;
  }
  $("#index-chip").addEventListener("click", () => selectSym("AX50"));

  const CHIPS = [
    "All",
    "Owned",
    "Tech",
    "Finance",
    "Health",
    "Energy",
    "Consumer",
    "Industrial",
    "Crypto",
    "Other",
  ];
  $("#wl-chips").innerHTML = CHIPS.map(
    (c) =>
      `<button data-chip="${c}" class="${c === chip ? "on" : ""}">${c}</button>`,
  ).join("");
  $$("#wl-chips button").forEach((b) =>
    b.addEventListener("click", () => {
      chip = b.dataset.chip;
      $$("#wl-chips button").forEach((x) => x.classList.toggle("on", x === b));
      filterWatch();
    }),
  );
  $("#wl-search").addEventListener("input", (e) => {
    search = e.target.value.trim().toLowerCase();
    filterWatch();
  });
  $("#watchlist").innerHTML = AX.ASSETS.map(
    (a) => `
  <li data-sym="${a.sym}" tabindex="0">
    <div class="wl-id"><div class="wl-sym">${a.sym}${a.crypto ? '<i class="tg">24/7</i>' : a.etf ? '<i class="tg">ETF</i>' : ""}</div><div class="wl-name">${esc(a.name)}</div></div>
    <canvas class="wl-spark" width="120" height="44"></canvas>
    <div class="wl-num"><div class="wl-px mono"></div><div class="wl-chg mono"></div></div>
  </li>`,
  ).join("");
  $$("#watchlist li").forEach((li) => {
    li.addEventListener("click", () => selectSym(li.dataset.sym));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter") selectSym(li.dataset.sym);
    });
  });
  function visibleSyms() {
    return $$("#watchlist li")
      .filter((li) => !li.hidden)
      .map((li) => li.dataset.sym);
  }
  function filterWatch() {
    for (const li of $$("#watchlist li")) {
      const a = AX.BY[li.dataset.sym];
      let ok =
        chip === "All" ||
        (chip === "Owned"
          ? !!S().account.pos[a.sym]
          : chip === "Other"
            ? a.sector === "Commodity" || a.sector === "ETF"
            : a.sector === chip);
      if (
        search &&
        !(
          a.sym.toLowerCase().includes(search) ||
          a.name.toLowerCase().includes(search)
        )
      )
        ok = false;
      li.hidden = !ok;
    }
  }
  const lastPx = {};
  let sparkTick = 0;
  function renderWatch() {
    const drawSparks = sparkTick++ % 8 === 0;
    for (const li of $$("#watchlist li")) {
      const s = li.dataset.sym,
        m = S().market[s],
        ch = AX.dayChg(s);
      li.classList.toggle("sel", s === sel);
      li.classList.toggle("owned", !!S().account.pos[s]);
      if (li.hidden) continue;
      $(".wl-px", li).textContent = num(m.p);
      const c = $(".wl-chg", li);
      c.textContent = pct(ch);
      c.className = "wl-chg mono " + cls(ch);
      if (lastPx[s] != null && Math.abs(m.p / lastPx[s] - 1) > 0.0015) {
        const px = $(".wl-px", li);
        px.classList.remove("fl-up", "fl-dn");
        void px.offsetWidth;
        px.classList.add(m.p > lastPx[s] ? "fl-up" : "fl-dn");
        lastPx[s] = m.p;
      } else if (lastPx[s] == null) lastPx[s] = m.p;
      if (drawSparks) {
        const cv = $("canvas", li);
        if (cv.offsetParent)
          AX.lineChart(
            cv,
            m.bars["5m"].slice(-60).map((b) => b.c),
            { w: 120, h: 44, fixed: true, base: m.prevClose, lw: 2 },
          );
      }
    }
  }

  function renderSymHead() {
    const a = AX.BY[sel],
      m = S().market[sel],
      ch = AX.dayChg(sel);
    $("#c-sym").textContent = a.sym;
    $("#c-name").textContent = a.name;
    $("#c-sector").textContent = a.sector;
    $("#c-price").textContent = num(m.p);
    const c = $("#c-chg");
    c.textContent = `${signed(m.p - m.prevClose).replace("$", "")} (${pct(ch)})`;
    c.className = "mono chg " + cls(ch);
  }
  function renderFund() {
    const a = AX.BY[sel],
      m = S().market[sel],
      d = m.bars["1D"];
    const yr = d.slice(-252);
    const hi = Math.max(m.dHigh, ...yr.map((b) => b.h)),
      lo = Math.min(m.dLow, ...yr.map((b) => b.l));
    const avgVol =
      d.slice(-31, -1).reduce((s, b) => s + b.v, 0) /
      Math.max(1, Math.min(30, d.length - 1));
    const items = [];
    items.push(["Open", num(m.dOpen)], ["Prev close", num(m.prevClose)]);
    items.push(["Day range", `${num(m.dLow)} – ${num(m.dHigh)}`]);
    items.push(["52W range", `${num(lo)} – ${num(hi)}`]);
    items.push([
      "Volume",
      `${AX.fmtVol(m.dVol)} <span class="muted">/ ${AX.fmtVol(avgVol)} avg</span>`,
    ]);
    if (a.crypto)
      items.push(
        ["Market cap", big(m.p * a.shares)],
        ["Supply", AX.fmtVol(a.shares)],
      );
    else if (a.shares) items.push(["Market cap", big(m.p * a.shares)]);
    if (a.eps != null)
      items.push(
        ["P/E", a.eps > 0 ? (m.p / a.eps).toFixed(1) : "n/a"],
        ["EPS (ttm)", (a.eps < 0 ? "-$" : "$") + Math.abs(a.eps).toFixed(2)],
      );
    items.push(["Beta", a.beta.toFixed(2)]);
    if (m.earn) {
      const dd = m.earn - S().day;
      items.push([
        "Earnings",
        dd <= 0
          ? "today"
          : dd === 1
            ? '<b class="gold">tomorrow</b>'
            : `in ${dd} days`,
      ]);
    }
    $("#fund").innerHTML =
      items
        .map(([k, v]) => `<div><dt>${k}</dt><dd class="mono">${v}</dd></div>`)
        .join("") + `<p class="desc">${esc(a.desc)}</p>`;
  }

  const qtyInput = $("#t-qty"),
    pxInput = $("#t-px");
  function qty() {
    return parseFloat(qtyInput.value) || 0;
  }
  function setStep() {
    const c = isCrypto(sel);
    qtyInput.step = c ? "0.001" : "1";
    $("#t-qty-l").textContent = c ? `Amount (${sel})` : "Shares";
  }
  function refPrice() {
    const q = AX.quote(sel);
    if (otype !== "market") return parseFloat(pxInput.value) || 0;
    return side === "buy" ? q.ask : q.bid;
  }
  function renderQuote() {
    const q = AX.quote(sel),
      b = AX.book(sel);
    $("#q-bid span").textContent = num(q.bid);
    $("#q-bid small").textContent = fq(b.bids[0][1], sel);
    $("#q-ask span").textContent = num(q.ask);
    $("#q-ask small").textContent = fq(b.asks[0][1], sel);
    const sp = q.ask - q.bid;
    $("#q-spread").textContent =
      `${num(sp)} · ${((sp / q.mid) * 10000).toFixed(1)}bp`;
  }
  function renderTicket() {
    renderQuote();
    const q = qty(),
      pos = S().account.pos[sel],
      held = pos ? pos.q : 0;
    const lines = [];
    let est = refPrice();
    if (otype === "market" && q > 0) {
      const w = AX.walk(sel, side, q, null, false);
      est = w.avg;
      const touch = side === "buy" ? AX.quote(sel).ask : AX.quote(sel).bid;
      const slip = Math.abs(est / touch - 1) * 10000;
      lines.push([
        "Est. fill price",
        num(est) +
          (slip > 0.5
            ? ` <span class="${slip > 20 ? "down" : "muted"}">(${slip.toFixed(1)}bp slip)</span>`
            : ""),
      ]);
    } else if (otype !== "market") {
      lines.push([
        otype === "limit" ? "Limit price" : "Trigger price",
        est ? num(est) : "—",
      ]);
    }
    const fee = q > 0 && est > 0 ? AX.commission(sel, q, est) : 0;
    lines.push(["Commission", usd(fee)]);
    lines.push([
      side === "buy" ? "Est. cost" : "Est. proceeds",
      usd(q * est + (side === "buy" ? fee : -fee)),
    ]);
    lines.push(["Buying power", usd(AX.buyingPower())]);
    const after = held + (side === "buy" ? q : -q);
    lines.push([
      "Position after",
      after === 0
        ? "Flat"
        : `${after > 0 ? "Long" : '<span class="down">Short</span>'} ${fq(Math.abs(after), sel)}`,
    ]);
    $("#summary").innerHTML = lines
      .map(([k, v]) => `<div><span>${k}</span><b>${v}</b></div>`)
      .join("");
    $("#t-notional").textContent =
      q > 0 && est > 0 ? `≈ ${usd(q * est, 0)}` : "";
    let label;
    if (side === "buy")
      label =
        held < 0
          ? q > -held
            ? `Cover & go long ${sel}`
            : `Buy to cover ${sel}`
          : `Buy ${sel}`;
    else
      label =
        held > 0
          ? q > held
            ? `Sell & go short ${sel}`
            : `Sell ${sel}`
          : `Sell short ${sel}`;
    if (otype !== "market") label += otype === "limit" ? " · Limit" : " · Stop";
    const btn = $("#t-submit");
    btn.textContent = label;
    btn.className = "submit " + side;
    const card = $("#pos-card");
    if (pos) {
      const mk = pos.q > 0 ? AX.quote(sel).bid : AX.quote(sel).ask;
      const pnl = (mk - pos.avg) * pos.q,
        pr = (mk / pos.avg - 1) * Math.sign(pos.q);
      card.hidden = false;
      card.innerHTML = `<div class="h">Your position <span class="badge ${pos.q > 0 ? "long" : "short"}">${pos.q > 0 ? "LONG" : "SHORT"}</span></div>
      <span>Quantity</span><b>${fq(Math.abs(pos.q), sel)}</b>
      <span>Avg price</span><b>${num(pos.avg)}</b>
      <span>Market value</span><b>${usd(Math.abs(pos.q) * mk)}</b>
      <span>Unrealized</span><b class="${cls(pnl)}">${signed(pnl)} (${pct(pr)})</b>
      <button class="mini wide" data-pcclose>Close position at market</button>`;
    } else card.hidden = true;
  }
  $$("#side-tabs button").forEach((b) =>
    b.addEventListener("click", () => setSide(b.dataset.side)),
  );
  $("#pos-card").addEventListener("pointerdown", (e) => {
    if (!e.button && e.target.closest("[data-pcclose]")) closePos(sel);
  });
  function setSide(s) {
    side = s;
    $$("#side-tabs button").forEach((x) =>
      x.classList.toggle("on", x.dataset.side === s),
    );
    $("#t-err").textContent = "";
    suggestBracket(true);
    renderTicket();
  }
  $$("#otype button").forEach((b) =>
    b.addEventListener("click", () => {
      otype = b.dataset.type;
      syncSeg("otype", "type", otype);
      $("#px-field").hidden = $("#tif-field").hidden = otype === "market";
      $("#t-px-l").textContent =
        otype === "limit" ? "Limit price" : "Stop trigger price";
      if (otype !== "market") {
        const q = AX.quote(sel),
          p = S().market[sel].p;
        pxInput.value = (
          otype === "limit"
            ? side === "buy"
              ? q.bid
              : q.ask
            : side === "buy"
              ? p * 1.01
              : p * 0.99
        ).toFixed(2);
      }
      $("#t-err").textContent = "";
      renderTicket();
    }),
  );
  $$("#tif button").forEach((b) =>
    b.addEventListener("click", () => {
      tif = b.dataset.tif;
      syncSeg("tif", "tif", tif);
    }),
  );
  qtyInput.addEventListener("input", renderTicket);
  pxInput.addEventListener("input", renderTicket);
  $("#qty-minus").addEventListener("click", () => {
    const st = isCrypto(sel) ? 0.01 : 1;
    qtyInput.value = Math.max(0, +(qty() - st).toFixed(3));
    renderTicket();
  });
  $("#qty-plus").addEventListener("click", () => {
    const st = isCrypto(sel) ? 0.01 : 1;
    qtyInput.value = +(qty() + st).toFixed(3);
    renderTicket();
  });
  $("#q-bid").addEventListener("click", () => usePrice(AX.quote(sel).bid));
  $("#q-ask").addEventListener("click", () => usePrice(AX.quote(sel).ask));
  function usePrice(p) {
    if (otype === "market") {
      $$("#otype button")[1].click();
    }
    pxInput.value = p.toFixed(2);
    renderTicket();
  }
  $$("#pcts button").forEach((b) =>
    b.addEventListener("click", () => {
      const p = +b.dataset.p,
        pos = S().account.pos[sel],
        held = pos ? pos.q : 0,
        px = refPrice() || S().market[sel].p;
      let q;
      const closing =
        (side === "buy" && held < 0) || (side === "sell" && held > 0);
      if (closing) q = Math.abs(held) * p;
      else q = (AX.buyingPower() * p * 0.98) / px;
      q = isCrypto(sel) ? Math.floor(q * 1000) / 1000 : Math.floor(q);
      qtyInput.value = q;
      renderTicket();
    }),
  );
  function suggestBracket(force) {
    const p = S().market[sel].p,
      up = side === "buy";
    if (force || !$("#tp-px").value)
      $("#tp-px").value = (p * (up ? 1.03 : 0.97)).toFixed(2);
    if (force || !$("#sl-px").value)
      $("#sl-px").value = (p * (up ? 0.985 : 1.015)).toFixed(2);
  }
  $("#bracket").addEventListener("toggle", () => suggestBracket(false));
  $("#tp-px").addEventListener("input", () => {
    $("#tp-on").checked = true;
  });
  $("#sl-px").addEventListener("input", () => {
    $("#sl-on").checked = true;
  });

  $("#t-submit").addEventListener("click", () => {
    const err = $("#t-err");
    err.textContent = "";
    const q = qty();
    if (!(q > 0)) {
      err.textContent = "Enter a quantity.";
      return;
    }
    const o = { sym: sel, side, type: otype, q, tif };
    if (otype !== "market") o.px = parseFloat(pxInput.value);
    const ref = otype === "market" ? S().market[sel].p : o.px;
    if ($("#bracket").open) {
      const tp = $("#tp-on").checked ? parseFloat($("#tp-px").value) : null;
      const sl = $("#sl-on").checked ? parseFloat($("#sl-px").value) : null;
      if (tp != null && !(side === "buy" ? tp > ref : tp < ref)) {
        err.textContent = `Take profit must be ${side === "buy" ? "above" : "below"} the entry price.`;
        return;
      }
      if (sl != null && !(side === "buy" ? sl < ref : sl > ref)) {
        err.textContent = `Stop loss must be ${side === "buy" ? "below" : "above"} the entry price.`;
        return;
      }
      o.tp = tp;
      o.sl = sl;
    }
    const r = AX.placeOrder(o);
    if (r.error) {
      err.textContent = r.error;
      return;
    }
    if (r.order && S().account.orders.includes(r.order))
      toast(
        `${otype === "limit" ? "Limit" : "Stop"} order placed: ${side.toUpperCase()} ${fq(r.order.q, sel)} ${sel} @ ${num(r.order.px)}`,
        "",
      );
    if (r.partial)
      toast(
        `Partially filled: ${fq(r.filled, sel)} of ${fq(q, sel)} ${sel}.`,
        "warn",
      );
    AX.save();
    renderAll(true);
  });
  function closePos(sym) {
    const p = S().account.pos[sym];
    if (!p) return;
    const r = AX.execute(sym, p.q > 0 ? "sell" : "buy", Math.abs(p.q), {
      kind: "market",
      force: true,
    });
    if (r.error) toast(r.error, "warn");
    AX.save();
    renderAll(true);
  }

  $$("#book-tabs button").forEach((b) =>
    b.addEventListener("click", () => {
      bookTab = b.dataset.bt;
      syncSeg("book-tabs", "bt", bookTab);
      renderBook();
    }),
  );
  function renderBook() {
    const body = $("#book-body");
    if (bookTab === "book") {
      const bk = AX.book(sel),
        N = 10;
      const asks = bk.asks.slice(0, N),
        bids = bk.bids.slice(0, N);
      let ca = 0,
        cb = 0;
      const askC = asks.map(([, s]) => (ca += s)),
        bidC = bids.map(([, s]) => (cb += s));
      const mx = Math.max(ca, cb);
      const myPx = new Set(
        S()
          .account.orders.filter((o) => o.sym === sel && o.type === "limit")
          .map((o) => o.px.toFixed(2)),
      );
      const row = (p, s, c, sd) =>
        `<div class="bk-row ${sd}" data-px="${p}"><i style="width:${((c / mx) * 100).toFixed(1)}%"></i><span>${num(p)}${myPx.has(p.toFixed(2)) ? " •" : ""}</span><span>${fq(s, sel)}</span><span>${fq(c, sel)}</span></div>`;
      const q = AX.quote(sel);
      body.innerHTML =
        `<div class="bk-head"><span>Price</span><span>Size</span><span>Total</span></div>` +
        asks
          .map((x, i) => [x, askC[i]])
          .reverse()
          .map(([[p, s], c]) => row(p, s, c, "ask"))
          .join("") +
        `<div class="bk-mid"><b class="mono ${cls(AX.dayChg(sel))}">${num(S().market[sel].p)}</b><span class="muted">spread ${num(q.ask - q.bid)}</span></div>` +
        bids.map(([p, s], i) => row(p, s, bidC[i], "bid")).join("");
    } else {
      const pr = S().market[sel].prints.slice(0, 30);
      body.innerHTML =
        `<div class="bk-head"><span>Time</span><span>Price</span><span>Size</span></div>` +
        pr
          .map(
            (t) =>
              `<div class="tr-row ${t.side}${t.mine ? " mine" : ""}"><span>${hms(t.t)}</span><span>${num(t.px)}</span><span>${fq(t.sz, sel)}${t.mine ? " ★" : ""}</span></div>`,
          )
          .join("");
    }
  }
  $("#book-body").addEventListener("pointerdown", (e) => {
    const r = e.target.closest("[data-px]");
    if (!r) return;
    if (otype !== "limit") $$("#otype button")[1].click();
    setSide(r.classList.contains("ask") ? "buy" : "sell");
    pxInput.value = (+r.dataset.px).toFixed(2);
    renderTicket();
  });

  $$("#btabs button").forEach((b) =>
    b.addEventListener("click", () => {
      btab = b.dataset.tab;
      syncSeg("btabs", "tab", btab);
      renderBottom();
    }),
  );
  function renderBottom() {
    const s = S(),
      acc = s.account,
      body = $("#tab-body");
    $("#pos-count").textContent = Object.keys(acc.pos).length;
    $("#ord-count").textContent = acc.orders.length;
    const eq = AX.equity();
    if (btab === "positions") {
      const syms = Object.keys(acc.pos);
      if (!syms.length) {
        body.innerHTML = `<div class="empty">No open positions. Pick a market on the left and place an order. Tip: Sell lets you go short.</div>`;
        return;
      }
      let tot = 0;
      body.innerHTML = `<table><thead><tr><th>Symbol</th><th>Side</th><th>Qty</th><th>Avg price</th><th>Last</th><th>Mkt value</th><th>Day</th><th>Unrealized P&amp;L</th><th>% equity</th><th></th></tr></thead><tbody>${syms
        .map((sym) => {
          const p = acc.pos[sym],
            q = AX.quote(sym),
            mk = p.q > 0 ? q.bid : q.ask,
            pnl = (mk - p.avg) * p.q;
          tot += pnl;
          const val = Math.abs(p.q) * mk;
          return `<tr class="click" data-sym="${sym}"><td><b>${sym}</b></td><td><span class="tag ${p.q > 0 ? "buy" : "sell"}">${p.q > 0 ? "LONG" : "SHORT"}</span></td><td>${fq(Math.abs(p.q), sym)}</td><td>${num(p.avg)}</td><td>${num(s.market[sym].p)}</td><td>${usd(val)}</td><td class="${cls(AX.dayChg(sym))}">${pct(AX.dayChg(sym))}</td><td class="${cls(pnl)}">${signed(pnl)} <small>(${pct((mk / p.avg - 1) * Math.sign(p.q))})</small></td><td>${((val / eq) * 100).toFixed(1)}%</td><td><button class="mini" data-close="${sym}">Close</button></td></tr>`;
        })
        .join(
          "",
        )}</tbody><tfoot><tr><td colspan="7">Total unrealized</td><td class="${cls(tot)}">${signed(tot)}</td><td colspan="2"><button class="mini" data-closeall>Close all</button></td></tr></tfoot></table>`;
    } else if (btab === "orders") {
      if (!acc.orders.length) {
        body.innerHTML = `<div class="empty">No working orders. Limit and stop orders wait here until they trigger.</div>`;
        return;
      }
      body.innerHTML = `<table><thead><tr><th>Placed</th><th>Symbol</th><th>Type</th><th>Side</th><th>Qty</th><th>Price</th><th>Last</th><th>Distance</th><th>TIF</th><th><button class="mini" data-cancelall>Cancel all</button></th></tr></thead><tbody>${acc.orders
        .map((o) => {
          const last = s.market[o.sym].p,
            dist = o.px / last - 1;
          return `<tr class="click" data-sym="${o.sym}"><td>${shortDate(o.t)} ${hm(o.t)}</td><td><b>${o.sym}</b></td><td>${o.label === "TP" ? "Take profit" : o.label === "SL" ? "Stop loss" : o.type === "limit" ? "Limit" : "Stop"}</td><td><span class="tag ${o.side}">${o.side.toUpperCase()}</span></td><td>${fq(o.q, o.sym)}</td><td>${num(o.px)}</td><td>${num(last)}</td><td>${pct(dist)}</td><td>${o.tif.toUpperCase()}</td><td><button class="mini" data-cancel="${o.id}">Cancel</button></td></tr>`;
        })
        .join("")}</tbody></table>`;
    } else if (btab === "history") {
      if (!acc.fills.length) {
        body.innerHTML = `<div class="empty">No trades yet.</div>`;
        return;
      }
      body.innerHTML = `<table><thead><tr><th>Time</th><th>Symbol</th><th>Side</th><th>Type</th><th>Qty</th><th>Price</th><th>Value</th><th>Fee</th><th>Realized P&amp;L</th></tr></thead><tbody>${acc.fills
        .slice(0, 150)
        .map(
          (f) =>
            `<tr class="click" data-sym="${f.sym}"><td>${shortDate(f.t)} ${hms(f.t)}</td><td><b>${f.sym}</b></td><td><span class="tag ${f.side}">${f.side.toUpperCase()}</span></td><td>${f.kind}</td><td>${fq(f.q, f.sym)}</td><td>${num(f.px)}</td><td>${usd(f.q * f.px)}</td><td>${usd(f.fee)}</td><td class="${f.pnl == null ? "" : cls(f.pnl)}">${f.pnl == null ? "—" : signed(f.pnl)}</td></tr>`,
        )
        .join("")}</tbody></table>`;
    } else if (btab === "portfolio") renderPortfolio(body);
    else renderLeaders(body);
  }
  function renderPortfolio(body) {
    const acc = S().account,
      eq = AX.equity(),
      g = AX.gross();
    const closed = acc.fills.filter((f) => f.pnl != null);
    const wins = closed.filter((f) => f.pnl > 0).length;
    const best = closed.reduce((m, f) => Math.max(m, f.pnl), -Infinity),
      worst = closed.reduce((m, f) => Math.min(m, f.pnl), Infinity);
    const stats = [
      ["Equity", usd(eq)],
      ["Cash", usd(acc.cash)],
      [
        "Total return",
        `<span class="${cls(eq - AX.START_CASH)}">${pct(eq / AX.START_CASH - 1)}</span>`,
      ],
      [
        "Realized P&L",
        `<span class="${cls(acc.realized)}">${signed(acc.realized)}</span>`,
      ],
      [
        "Unrealized P&L",
        `<span class="${cls(AX.unrealized())}">${signed(AX.unrealized())}</span>`,
      ],
      ["Fees paid", usd(acc.fees)],
      [
        "Max drawdown",
        `<span class="${acc.maxDD > 0.001 ? "down" : ""}">${(acc.maxDD * 100).toFixed(2)}%</span>`,
      ],
      ["Leverage", (g / Math.max(1, eq)).toFixed(2) + "×"],
      ["Trades", acc.fills.length],
      [
        "Win rate",
        closed.length ? ((wins / closed.length) * 100).toFixed(0) + "%" : "—",
      ],
      [
        "Best trade",
        closed.length ? `<span class="up">${signed(best)}</span>` : "—",
      ],
      [
        "Worst trade",
        closed.length ? `<span class="down">${signed(worst)}</span>` : "—",
      ],
    ];
    const alloc = Object.keys(acc.pos)
      .map((s) => ({
        s,
        v: Math.abs(acc.pos[s].q) * S().market[s].p,
        short: acc.pos[s].q < 0,
      }))
      .sort((a, b) => b.v - a.v);
    const cash = Math.max(0, acc.cash);
    const tot = alloc.reduce((x, a) => x + a.v, 0) + cash || 1;
    const COLS = [
      "#3d8bff",
      "#16c784",
      "#f0b90b",
      "#a78bfa",
      "#f472b6",
      "#38bdf8",
      "#fb923c",
      "#ea3943",
    ];
    body.innerHTML = `<div class="pf">
    <div class="pf-chart"><div class="pf-title">Equity curve <span class="muted small">since start</span></div><canvas id="eq-cv"></canvas></div>
    <div class="pf-side">
      <dl class="pf-stats">${stats.map(([k, v]) => `<div><dt>${k}</dt><dd class="mono">${v}</dd></div>`).join("")}</dl>
      <div class="alloc"><div class="alloc-bar">${alloc.map((a, i) => `<i style="width:${(a.v / tot) * 100}%;background:${COLS[i % COLS.length]}" title="${a.s}"></i>`).join("")}<i style="width:${(cash / tot) * 100}%;background:#26314a" title="Cash"></i></div>
      <div class="alloc-leg small">${alloc.map((a, i) => `<span><i style="background:${COLS[i % COLS.length]}"></i>${a.s}${a.short ? " (short)" : ""} ${((a.v / tot) * 100).toFixed(0)}%</span>`).join("")}<span><i style="background:#26314a"></i>Cash ${((cash / tot) * 100).toFixed(0)}%</span></div></div>
    </div></div>`;
    const pts = acc.curve.map((c) => c[1]).concat([eq]);
    requestAnimationFrame(() => {
      const cv = $("#eq-cv");
      if (cv)
        AX.lineChart(cv, pts, { axis: true, fill: true, base: AX.START_CASH });
    });
  }
  function renderLeaders(body) {
    const rows = S().bots.map((b) => ({
      name: b.name,
      blurb: b.blurb,
      eq: AX.botEq(b),
      top: Object.keys(b.pos).sort(
        (x, y) => b.pos[y] * S().market[y].p - b.pos[x] * S().market[x].p,
      )[0],
    }));
    const accP = S().account.pos;
    rows.push({
      name: "You",
      blurb: "Your account",
      eq: AX.equity(),
      top: Object.keys(accP).sort(
        (x, y) =>
          Math.abs(accP[y].q) * S().market[y].p -
          Math.abs(accP[x].q) * S().market[x].p,
      )[0],
      me: true,
    });
    rows.sort((a, b) => b.eq - a.eq);
    const medal = (i) => ["🥇", "🥈", "🥉"][i] || i + 1;
    body.innerHTML = `<table><thead><tr><th>#</th><th>Trader</th><th>Strategy</th><th>Equity</th><th>Return</th><th>Largest holding</th></tr></thead><tbody>${rows
      .map(
        (r, i) =>
          `<tr class="${r.me ? "me" : ""}"><td>${medal(i)}</td><td><b>${esc(r.name)}</b>${r.me ? "" : ' <span class="tg">AI</span>'}</td><td class="txt">${esc(r.blurb)}</td><td>${usd(r.eq)}</td><td class="${cls(r.eq - AX.START_CASH)}">${pct(r.eq / AX.START_CASH - 1)}</td><td>${r.top || "—"}</td></tr>`,
      )
      .join("")}</tbody></table>`;
  }
  $("#tab-body").addEventListener("pointerdown", (e) => {
    if (e.button) return;
    const t = e.target;
    const c = t.closest("[data-close]");
    if (c) {
      closePos(c.dataset.close);
      return;
    }
    if (t.closest("[data-closeall]")) {
      Object.keys(S().account.pos).forEach(closePos);
      return;
    }
    const k = t.closest("[data-cancel]");
    if (k) {
      AX.cancelOrder(+k.dataset.cancel);
      toast("Order cancelled");
      AX.save();
      renderAll(true);
      return;
    }
    if (t.closest("[data-cancelall]")) {
      S().account.orders = [];
      toast("All orders cancelled");
      AX.save();
      renderAll(true);
      return;
    }
    const row = t.closest("tr[data-sym]");
    if (row) selectSym(row.dataset.sym);
  });

  function renderNews() {
    const items = S().news.slice(0, 40);
    $("#news-count").textContent = `Day ${S().day}`;
    $("#newsfeed").innerHTML = items
      .map((n) => {
        const tag = n.sym
          ? `<button class="sym-tag" data-sym="${n.sym}">${n.sym}</button>`
          : n.sector
            ? `<span class="sec-tag">${n.sector}</span>`
            : n.kind === "macro"
              ? '<span class="sec-tag">MACRO</span>'
              : "";
        const icon =
          n.kind === "earnings"
            ? "📊 "
            : n.kind === "bell"
              ? "🔔 "
              : n.kind === "you"
                ? "⚠ "
                : "";
        return `<li class="${n.dir > 0 ? "up" : n.dir < 0 ? "down" : ""}"><div class="meta">${shortDate(n.t)} ${hm(n.t)} ${tag}</div>${icon}${esc(n.text)}</li>`;
      })
      .join("");
  }
  $("#newsfeed").addEventListener("click", (e) => {
    const b = e.target.closest("[data-sym]");
    if (b) selectSym(b.dataset.sym);
  });

  function toast(text, kind = "", sticky) {
    const el = document.createElement("div");
    el.className = "toast " + kind;
    el.textContent = text;
    $("#toasts").appendChild(el);
    while ($("#toasts").children.length > 4) $("#toasts").firstChild.remove();
    setTimeout(
      () => {
        el.style.opacity = "0";
        setTimeout(() => el.remove(), 300);
      },
      sticky ? 7000 : 3500,
    );
  }
  AX.listeners.toast.push((t) => toast(t.text, t.kind, t.sticky));
  AX.listeners.fill.push((f) => {
    const verb = f.side === "buy" ? "Bought" : "Sold";
    toast(
      `${verb} ${fq(f.q, f.sym)} ${f.sym} @ ${num(f.px)} · ${f.kind}${f.pnl != null ? " · P&L " + signed(f.pnl) : ""}`,
      f.side,
    );
    needBottom = true;
  });
  let needNews = false,
    needBottom = false;
  AX.listeners.news.push(() => {
    needNews = true;
  });
  AX.listeners.session.push(() => {
    needBottom = true;
    renderFund();
  });

  function selectSym(s) {
    if (!AX.BY[s]) return;
    sel = s;
    chart.off = 0;
    $("#go-latest").hidden = true;
    setStep();
    if (otype !== "market") {
      const q = AX.quote(sel);
      pxInput.value = (side === "buy" ? q.bid : q.ask).toFixed(2);
    }
    if (isCrypto(s) && qty() >= 10) qtyInput.value = 0.1;
    $("#t-err").textContent = "";
    suggestBracket(true);
    saveUi();
    renderAll(true);
    if (innerWidth < 980)
      $(".chart-panel").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function setSpeed(v) {
    if (v === 0 && speed !== 0) lastSpeed = speed;
    speed = v;
    syncSeg("speed", "speed", String(v));
    renderHeader();
  }
  $$("#speed button").forEach((b) =>
    b.addEventListener("click", () => setSpeed(+b.dataset.speed)),
  );
  addEventListener("keydown", (e) => {
    if (
      e.target.matches("input, textarea") ||
      e.metaKey ||
      e.ctrlKey ||
      e.altKey
    )
      return;
    const k = e.key;
    if (k === "b" || k === "B") setSide("buy");
    else if (k === "s" || k === "S") setSide("sell");
    else if (k >= "1" && k <= "5")
      setTf(["1m", "5m", "15m", "1h", "1D"][+k - 1]);
    else if (k === " ") {
      e.preventDefault();
      setSpeed(speed === 0 ? lastSpeed || 1 : 0);
    } else if (k === "ArrowDown" || k === "ArrowUp") {
      e.preventDefault();
      const v = visibleSyms(),
        i = v.indexOf(sel);
      selectSym(v[(i + (k === "ArrowDown" ? 1 : -1) + v.length) % v.length]);
    } else if (k === "Escape") $("#help").hidden = true;
  });
  $("#btn-reset").addEventListener("click", () => {
    if (
      !confirm(
        "Start over? This resets your account to $100,000, clears your trades and generates a brand-new market.",
      )
    )
      return;
    AX.reset();
    Object.keys(lastPx).forEach((k) => delete lastPx[k]);
    renderAll(true);
    renderNews();
    toast("Fresh start — $100,000 virtual cash");
  });
  const help = $("#help");
  $("#btn-help").addEventListener("click", () => {
    help.hidden = false;
  });
  $("#help-close").addEventListener("click", () => {
    help.hidden = true;
    store.set("axiomate-seen-help", "1");
  });
  help.addEventListener("click", (e) => {
    if (e.target === help) {
      help.hidden = true;
      store.set("axiomate-seen-help", "1");
    }
  });
  if (!store.get("axiomate-seen-help")) help.hidden = false;

  function renderAll(full) {
    renderHeader();
    renderWatch();
    renderSymHead();
    drawChart();
    renderTicket();
    renderBook();
    if (full) {
      filterWatch();
      renderFund();
      renderBottom();
      sparkTick = 0;
      renderWatch();
    }
  }
  setStep();
  suggestBracket(true);
  chart.resize();
  renderAll(true);
  renderNews();

  let frame = 0;
  setInterval(() => {
    if (speed > 0) for (let i = 0; i < speed; i++) AX.tick();
    frame++;
    renderHeader();
    renderWatch();
    renderSymHead();
    drawChart();
    renderTicket();
    renderBook();
    if (needNews) {
      renderNews();
      needNews = false;
    }
    if (needBottom || frame % 4 === 0) {
      renderBottom();
      needBottom = false;
    }
    if (frame % 8 === 0) {
      renderFund();
      if (chip === "Owned") filterWatch();
    }
  }, TICK_MS);
  setInterval(() => AX.save(), 10000);
  addEventListener("visibilitychange", () => {
    if (document.hidden) AX.save();
  });
  addEventListener("pagehide", () => AX.save());
})();
