(function () {
  "use strict";
  const AX = window.AX;
  const UP = "#16c784",
    DN = "#ea3943",
    GRID = "rgba(125,138,163,.08)",
    AXIS = "#7d8aa3",
    TXT = "#e6ebf4";
  const IND_COL = {
    ma20: "#f0b90b",
    ma50: "#a78bfa",
    bb: "#38bdf8",
    vwap: "#f472b6",
  };
  const MONO = '"JetBrains Mono", ui-monospace, monospace';

  function sma(v, n) {
    const o = new Array(v.length).fill(null);
    let s = 0;
    for (let i = 0; i < v.length; i++) {
      s += v[i];
      if (i >= n) s -= v[i - n];
      if (i >= n - 1) o[i] = s / n;
    }
    return o;
  }
  function ema(v, n) {
    const o = new Array(v.length).fill(null),
      k = 2 / (n + 1);
    let e = null;
    for (let i = 0; i < v.length; i++) {
      e = e == null ? v[i] : v[i] * k + e * (1 - k);
      if (i >= n - 1) o[i] = e;
    }
    return o;
  }
  function bands(v, n, m) {
    const mid = sma(v, n),
      up = [],
      lo = [];
    for (let i = 0; i < v.length; i++) {
      if (mid[i] == null) {
        up.push(null);
        lo.push(null);
        continue;
      }
      let s = 0;
      for (let j = i - n + 1; j <= i; j++) s += (v[j] - mid[i]) ** 2;
      const sd = Math.sqrt(s / n);
      up.push(mid[i] + m * sd);
      lo.push(mid[i] - m * sd);
    }
    return { mid, up, lo };
  }
  function rsi(v, n = 14) {
    const o = new Array(v.length).fill(null);
    let g = 0,
      l = 0;
    for (let i = 1; i < v.length; i++) {
      const d = v[i] - v[i - 1],
        up = Math.max(d, 0),
        dn = Math.max(-d, 0);
      if (i <= n) {
        g += up / n;
        l += dn / n;
        if (i === n) o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
      } else {
        g = (g * (n - 1) + up) / n;
        l = (l * (n - 1) + dn) / n;
        o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
      }
    }
    return o;
  }
  function macd(v) {
    const a = ema(v, 12),
      b = ema(v, 26),
      line = v.map((_, i) =>
        a[i] != null && b[i] != null ? a[i] - b[i] : null,
      );
    const first = line.findIndex((x) => x != null);
    const sigRaw = first < 0 ? [] : ema(line.slice(first), 9);
    const sig = line.map((_, i) => (i < first ? null : sigRaw[i - first]));
    return {
      line,
      sig,
      hist: line.map((x, i) =>
        x != null && sig[i] != null ? x - sig[i] : null,
      ),
    };
  }
  function vwap(bars, tf) {
    const o = [];
    let pv = 0,
      vv = 0,
      day = null;
    for (const b of bars) {
      const d = Math.floor(b.t / 86400000);
      if (tf === "1D" || d !== day) {
        pv = 0;
        vv = 0;
        day = d;
      }
      const tp = (b.h + b.l + b.c) / 3;
      pv += tp * b.v;
      vv += b.v;
      o.push(vv ? pv / vv : tp);
    }
    return o;
  }
  function niceStep(raw) {
    if (!(raw > 0)) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(raw))),
      f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }
  const decFor = (step) =>
    Math.max(0, Math.min(4, -Math.floor(Math.log10(step) + 1e-9)));
  const fmtN = (x, d) =>
    x.toLocaleString("en-US", {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    });
  const fmtVol = (v) =>
    v >= 1e9
      ? (v / 1e9).toFixed(2) + "B"
      : v >= 1e6
        ? (v / 1e6).toFixed(2) + "M"
        : v >= 1e3
          ? (v / 1e3).toFixed(1) + "K"
          : v.toFixed(v < 10 ? 3 : 0);
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
  const dLabel = (t) => {
    const d = new Date(t);
    return MON[d.getUTCMonth()] + " " + d.getUTCDate();
  };
  const hm = (t) => {
    const d = new Date(t);
    return (
      String(d.getUTCHours()).padStart(2, "0") +
      ":" +
      String(d.getUTCMinutes()).padStart(2, "0")
    );
  };

  class Chart {
    constructor(cv, onView) {
      this.cv = cv;
      this.g = cv.getContext("2d");
      this.onView = onView || (() => {});
      this.n = 90;
      this.off = 0;
      this.type = "candle";
      this.tf = "5m";
      this.ind = { ma20: true, ma50: false, bb: false, vwap: false, vol: true };
      this.lower = "rsi";
      this.hover = null;
      this.drag = null;
      this.W = 0;
      this.H = 0;
      this.d = null;
      this.geo = null;
      cv.addEventListener("pointerdown", (e) => {
        this.drag = { x: e.clientX, off: this.off, moved: false };
        cv.setPointerCapture(e.pointerId);
      });
      cv.addEventListener("pointermove", (e) => {
        const r = cv.getBoundingClientRect();
        if (this.drag && this.geo) {
          const dx = e.clientX - this.drag.x;
          if (Math.abs(dx) > 3) this.drag.moved = true;
          const max = Math.max(0, (this.d ? this.d.bars.length : 0) - 15);
          this.off = Math.max(
            0,
            Math.min(max, Math.round(this.drag.off + dx / this.geo.cw)),
          );
          this.onView(this.off);
        }
        this.hover =
          e.pointerType === "touch" && !this.drag
            ? null
            : { x: e.clientX - r.left, y: e.clientY - r.top };
        this.draw();
      });
      const end = () => {
        this.drag = null;
      };
      cv.addEventListener("pointerup", end);
      cv.addEventListener("pointercancel", end);
      cv.addEventListener("pointerleave", () => {
        if (!this.drag) {
          this.hover = null;
          this.draw();
        }
      });
      cv.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          this.n = Math.max(
            20,
            Math.min(300, Math.round(this.n * (e.deltaY > 0 ? 1.12 : 0.89))),
          );
          this.draw();
        },
        { passive: false },
      );
      cv.addEventListener("dblclick", () => {
        this.off = 0;
        this.onView(0);
        this.draw();
      });
    }
    resize() {
      const r = this.cv.parentElement.getBoundingClientRect(),
        dpr = window.devicePixelRatio || 1;
      this.W = r.width;
      this.H = r.height;
      this.cv.width = Math.round(this.W * dpr);
      this.cv.height = Math.round(this.H * dpr);
      this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    set(d) {
      this.d = d;
      this.draw();
    }

    draw() {
      const d = this.d,
        g = this.g,
        W = this.W,
        H = this.H;
      if (!d || !W || !H) return;
      const all = d.bars,
        n = this.n;
      const padR = 76,
        padB = 22,
        padT = 8;
      const lowerH =
        this.lower !== "none" ? Math.max(60, Math.round(H * 0.2)) : 0;
      const pTop = padT,
        pBot = H - padB - (lowerH ? lowerH + 10 : 0);
      const end = all.length - this.off,
        start = Math.max(0, end - n);
      const vis = all.slice(start, end);
      const cw = (W - padR) / n,
        shift = n - vis.length;
      const xOf = (i) => (shift + i) * cw + cw / 2;
      this.geo = { cw };

      const closes = all.map((b) => b.c);
      const I = {};
      if (this.ind.ma20) I.ma20 = sma(closes, 20);
      if (this.ind.ma50) I.ma50 = sma(closes, 50);
      if (this.ind.bb) I.bb = bands(closes, 20, 2);
      if (this.ind.vwap && this.tf !== "1D") I.vwap = vwap(all, this.tf);

      let mn = Infinity,
        mx = -Infinity,
        vmx = 0;
      vis.forEach((b, i) => {
        if (this.type === "candle") {
          mn = Math.min(mn, b.l);
          mx = Math.max(mx, b.h);
        } else {
          mn = Math.min(mn, b.c);
          mx = Math.max(mx, b.c);
        }
        vmx = Math.max(vmx, b.v);
        if (I.bb && I.bb.up[start + i] != null) {
          mn = Math.min(mn, I.bb.lo[start + i]);
          mx = Math.max(mx, I.bb.up[start + i]);
        }
        for (const k of ["ma20", "ma50", "vwap"]) {
          const v = I[k] && I[k][start + i];
          if (v != null) {
            mn = Math.min(mn, v);
            mx = Math.max(mx, v);
          }
        }
      });
      if (!isFinite(mn)) return;
      const pad = (mx - mn) * 0.08 || mx * 0.005;
      mn -= pad;
      mx += pad;
      const y = (p) => pTop + ((mx - p) / (mx - mn)) * (pBot - pTop);
      const yInv = (yy) => mx - ((yy - pTop) / (pBot - pTop)) * (mx - mn);

      g.clearRect(0, 0, W, H);
      g.font = `11px ${MONO}`;
      g.textBaseline = "middle";
      g.lineWidth = 1;
      const step = niceStep(
        (mx - mn) / Math.max(3, Math.floor((pBot - pTop) / 55)),
      );
      const dec = Math.max(
        decFor(step),
        d.dp != null ? Math.min(d.dp, decFor(step) + 1) : 0,
      );
      g.strokeStyle = GRID;
      for (let p = Math.ceil(mn / step) * step; p <= mx; p += step) {
        const yy = Math.round(y(p)) + 0.5;
        g.beginPath();
        g.moveTo(0, yy);
        g.lineTo(W - padR, yy);
        g.stroke();
        g.fillStyle = AXIS;
        g.fillText(fmtN(p, dec), W - padR + 8, yy);
      }
      const every = Math.max(1, Math.ceil(85 / cw));
      g.textAlign = "center";
      for (let i = 0; i < vis.length; i++) {
        const b = vis[i],
          prev = i ? vis[i - 1] : all[start - 1];
        const newDay =
          prev && Math.floor(prev.t / 86400000) !== Math.floor(b.t / 86400000);
        const xx = Math.round(xOf(i)) + 0.5;
        if (newDay && this.tf !== "1D") {
          g.strokeStyle = "rgba(125,138,163,.22)";
          g.setLineDash([3, 3]);
          g.beginPath();
          g.moveTo(xx - cw / 2, pTop);
          g.lineTo(xx - cw / 2, H - padB);
          g.stroke();
          g.setLineDash([]);
        }
        if ((start + i) % every) continue;
        g.strokeStyle = GRID;
        g.beginPath();
        g.moveTo(xx, pTop);
        g.lineTo(xx, H - padB);
        g.stroke();
        g.fillStyle = AXIS;
        g.fillText(
          this.tf === "1D" || newDay ? dLabel(b.t) : hm(b.t),
          xx,
          H - padB / 2,
        );
      }
      g.textAlign = "left";
      if (this.ind.vol) {
        const vh = (pBot - pTop) * 0.18;
        vis.forEach((b, i) => {
          const h = vmx ? (b.v / vmx) * vh : 0;
          g.fillStyle =
            b.c >= b.o ? "rgba(22,199,132,.22)" : "rgba(234,57,67,.22)";
          g.fillRect(xOf(i) - cw * 0.36, pBot - h, Math.max(1, cw * 0.72), h);
        });
      }
      const line = (arr, col, w = 1.3, dash) => {
        g.beginPath();
        let on = false;
        vis.forEach((_, i) => {
          const v = arr[start + i];
          if (v == null) return;
          const yy = y(v);
          on ? g.lineTo(xOf(i), yy) : (g.moveTo(xOf(i), yy), (on = true));
        });
        g.strokeStyle = col;
        g.lineWidth = w;
        if (dash) g.setLineDash(dash);
        g.stroke();
        g.setLineDash([]);
        g.lineWidth = 1;
      };
      if (I.bb) {
        g.beginPath();
        let first = true;
        vis.forEach((_, i) => {
          const v = I.bb.up[start + i];
          if (v == null) return;
          first
            ? (g.moveTo(xOf(i), y(v)), (first = false))
            : g.lineTo(xOf(i), y(v));
        });
        for (let i = vis.length - 1; i >= 0; i--) {
          const v = I.bb.lo[start + i];
          if (v == null) continue;
          g.lineTo(xOf(i), y(v));
        }
        g.closePath();
        g.fillStyle = "rgba(56,189,248,.06)";
        g.fill();
        line(I.bb.up, "rgba(56,189,248,.6)", 1);
        line(I.bb.lo, "rgba(56,189,248,.6)", 1);
        line(I.bb.mid, "rgba(56,189,248,.35)", 1, [4, 3]);
      }
      if (this.type === "candle") {
        const bw = Math.max(1, cw * 0.68);
        vis.forEach((b, i) => {
          const up = b.c >= b.o,
            x = xOf(i);
          g.fillStyle = g.strokeStyle = up ? UP : DN;
          g.beginPath();
          g.moveTo(Math.round(x) + 0.5, y(b.h));
          g.lineTo(Math.round(x) + 0.5, y(b.l));
          g.stroke();
          const top = y(Math.max(b.o, b.c)),
            bh = Math.max(1, Math.abs(y(b.o) - y(b.c)));
          g.fillRect(x - bw / 2, top, bw, bh);
        });
      } else {
        const upTrend = vis[vis.length - 1].c >= vis[0].o,
          col = upTrend ? UP : DN;
        g.beginPath();
        vis.forEach((b, i) =>
          i ? g.lineTo(xOf(i), y(b.c)) : g.moveTo(xOf(i), y(b.c)),
        );
        if (this.type === "area") {
          g.save();
          g.lineTo(xOf(vis.length - 1), pBot);
          g.lineTo(xOf(0), pBot);
          g.closePath();
          const gr = g.createLinearGradient(0, pTop, 0, pBot);
          gr.addColorStop(
            0,
            upTrend ? "rgba(22,199,132,.28)" : "rgba(234,57,67,.28)",
          );
          gr.addColorStop(1, "rgba(0,0,0,0)");
          g.fillStyle = gr;
          g.fill();
          g.restore();
          g.beginPath();
          vis.forEach((b, i) =>
            i ? g.lineTo(xOf(i), y(b.c)) : g.moveTo(xOf(i), y(b.c)),
          );
        }
        g.strokeStyle = col;
        g.lineWidth = 1.8;
        g.stroke();
        g.lineWidth = 1;
      }
      if (I.ma20) line(I.ma20, IND_COL.ma20);
      if (I.ma50) line(I.ma50, IND_COL.ma50);
      if (I.vwap) line(I.vwap, IND_COL.vwap, 1.4, [5, 3]);
      if (d.fills && d.fills.length) {
        const idx = new Map(vis.map((b, i) => [b.t, i]));
        for (const f of d.fills) {
          const i = idx.get(AX.barStart(f.t, this.tf));
          if (i == null) continue;
          const b = vis[i],
            x = xOf(i),
            buy = f.side === "buy",
            s = Math.max(4, Math.min(7, cw * 0.4));
          const yy = buy ? y(b.l) + 6 : y(b.h) - 6;
          g.fillStyle = buy ? "#3dd9a0" : "#ff6b74";
          g.beginPath();
          if (buy) {
            g.moveTo(x, yy);
            g.lineTo(x - s, yy + s * 1.4);
            g.lineTo(x + s, yy + s * 1.4);
          } else {
            g.moveTo(x, yy);
            g.lineTo(x - s, yy - s * 1.4);
            g.lineTo(x + s, yy - s * 1.4);
          }
          g.closePath();
          g.fill();
        }
      }

      const tag = (yy, text, bg, fg, sub) => {
        g.fillStyle = bg;
        g.fillRect(W - padR + 1, yy - 9, padR - 2, sub ? 30 : 18);
        g.fillStyle = fg;
        g.fillText(text, W - padR + 6, yy + 0.5);
        if (sub) {
          g.globalAlpha = 0.8;
          g.fillText(sub, W - padR + 6, yy + 13);
          g.globalAlpha = 1;
        }
      };
      const hline = (p, col, dash, label) => {
        if (p < mn || p > mx) return;
        const yy = Math.round(y(p)) + 0.5;
        g.strokeStyle = col;
        g.setLineDash(dash);
        g.beginPath();
        g.moveTo(0, yy);
        g.lineTo(W - padR, yy);
        g.stroke();
        g.setLineDash([]);
        if (label) {
          g.font = `600 10.5px ${MONO}`;
          const w = g.measureText(label).width + 10;
          g.fillStyle = col;
          g.fillRect(4, yy - 8, w, 16);
          g.fillStyle = "#071018";
          g.fillText(label, 9, yy + 0.5);
          g.font = `11px ${MONO}`;
        }
        tag(yy, fmtN(p, d.dp), col, "#071018");
      };
      for (const o of d.orders || []) {
        const col =
          o.label === "TP"
            ? "#3dd9a0"
            : o.label === "SL"
              ? "#ff6b74"
              : o.side === "buy"
                ? "#5eead4"
                : "#fda4af";
        hline(
          o.px,
          col,
          [6, 4],
          `${o.label || (o.type === "stop" ? "STOP" : "LMT")} ${o.side.toUpperCase()} ${o.q}`,
        );
      }
      if (d.pos) {
        const pnl = (d.price - d.pos.avg) * d.pos.q;
        hline(
          d.pos.avg,
          "#3d8bff",
          [2, 3],
          `POS ${d.pos.q > 0 ? "+" : ""}${d.pos.q}  ${pnl >= 0 ? "+" : "-"}$${fmtN(Math.abs(pnl), 2)}`,
        );
      }
      const last = vis[vis.length - 1];
      if (this.off === 0 || (d.price >= mn && d.price <= mx)) {
        const lc = last.c >= last.o ? UP : DN,
          ly = Math.round(y(Math.max(mn, Math.min(mx, d.price)))) + 0.5;
        g.strokeStyle = lc;
        g.setLineDash([1, 3]);
        g.beginPath();
        g.moveTo(0, ly);
        g.lineTo(W - padR, ly);
        g.stroke();
        g.setLineDash([]);
        tag(ly, fmtN(d.price, d.dp), lc, "#071018", d.countdown);
      }
      if (lowerH) {
        const lt = pBot + 10,
          lb = H - padB;
        g.strokeStyle = "rgba(125,138,163,.18)";
        g.beginPath();
        g.moveTo(0, lt - 5.5);
        g.lineTo(W, lt - 5.5);
        g.stroke();
        if (this.lower === "rsi") {
          const r = rsi(closes, 14),
            yr = (v) => lt + ((100 - v) / 100) * (lb - lt);
          g.fillStyle = "rgba(167,139,250,.06)";
          g.fillRect(0, yr(70), W - padR, yr(30) - yr(70));
          [30, 70].forEach((v) => {
            g.strokeStyle = "rgba(125,138,163,.25)";
            g.setLineDash([3, 3]);
            g.beginPath();
            g.moveTo(0, yr(v) + 0.5);
            g.lineTo(W - padR, yr(v) + 0.5);
            g.stroke();
            g.setLineDash([]);
            g.fillStyle = AXIS;
            g.fillText(String(v), W - padR + 8, yr(v));
          });
          g.beginPath();
          let on = false;
          vis.forEach((_, i) => {
            const v = r[start + i];
            if (v == null) return;
            on
              ? g.lineTo(xOf(i), yr(v))
              : (g.moveTo(xOf(i), yr(v)), (on = true));
          });
          g.strokeStyle = "#a78bfa";
          g.lineWidth = 1.3;
          g.stroke();
          g.lineWidth = 1;
          const hr = this.hover ? this.hIdx(vis.length, shift, cw) : null;
          const hv =
            hr != null && hr >= 0 && hr < vis.length
              ? r[start + hr]
              : r[end - 1];
          g.fillStyle = AXIS;
          g.fillText("RSI 14", 6, lt + 6);
          g.fillStyle = "#a78bfa";
          g.fillText(hv != null ? hv.toFixed(1) : "", 56, lt + 6);
        } else {
          const m = macd(closes);
          let ex = 0;
          vis.forEach((_, i) => {
            const j = start + i;
            [m.line[j], m.sig[j], m.hist[j]].forEach((v) => {
              if (v != null) ex = Math.max(ex, Math.abs(v));
            });
          });
          ex = ex || 1;
          const ym = (v) => (lt + lb) / 2 - (((v / ex) * (lb - lt)) / 2) * 0.92;
          g.strokeStyle = "rgba(125,138,163,.25)";
          g.beginPath();
          g.moveTo(0, ym(0) + 0.5);
          g.lineTo(W - padR, ym(0) + 0.5);
          g.stroke();
          vis.forEach((_, i) => {
            const v = m.hist[start + i];
            if (v == null) return;
            g.fillStyle = v >= 0 ? "rgba(22,199,132,.5)" : "rgba(234,57,67,.5)";
            g.fillRect(
              xOf(i) - cw * 0.33,
              Math.min(ym(0), ym(v)),
              Math.max(1, cw * 0.66),
              Math.abs(ym(v) - ym(0)),
            );
          });
          const ml = (arr, col) => {
            g.beginPath();
            let on = false;
            vis.forEach((_, i) => {
              const v = arr[start + i];
              if (v == null) return;
              on
                ? g.lineTo(xOf(i), ym(v))
                : (g.moveTo(xOf(i), ym(v)), (on = true));
            });
            g.strokeStyle = col;
            g.lineWidth = 1.3;
            g.stroke();
            g.lineWidth = 1;
          };
          ml(m.line, "#38bdf8");
          ml(m.sig, "#f59e0b");
          g.fillStyle = AXIS;
          g.fillText("MACD 12 26 9", 6, lt + 6);
        }
      }
      let lb = last;
      const hi = this.hover ? this.hIdx(vis.length, shift, cw) : null;
      if (hi != null && hi >= 0 && hi < vis.length) {
        lb = vis[hi];
        const x = Math.round(xOf(hi)) + 0.5;
        g.strokeStyle = "rgba(230,235,244,.28)";
        g.setLineDash([4, 4]);
        g.beginPath();
        g.moveTo(x, pTop);
        g.lineTo(x, H - padB);
        g.stroke();
        const hy = this.hover.y;
        if (hy > pTop && hy < pBot) {
          g.beginPath();
          g.moveTo(0, hy + 0.5);
          g.lineTo(W - padR, hy + 0.5);
          g.stroke();
          g.setLineDash([]);
          tag(hy, fmtN(yInv(hy), d.dp), "#2b3650", TXT);
        }
        g.setLineDash([]);
        const tl =
          this.tf === "1D" ? dLabel(lb.t) : dLabel(lb.t) + " " + hm(lb.t);
        g.font = `11px ${MONO}`;
        const tw = g.measureText(tl).width + 12;
        g.fillStyle = "#2b3650";
        g.fillRect(
          Math.min(W - padR - tw, Math.max(0, x - tw / 2)),
          H - padB + 2,
          tw,
          padB - 4,
        );
        g.fillStyle = TXT;
        g.textAlign = "center";
        g.fillText(
          tl,
          Math.min(W - padR - tw / 2, Math.max(tw / 2, x)),
          H - padB / 2,
        );
        g.textAlign = "left";
      }
      const ch = lb.c / lb.o - 1,
        col = ch >= 0 ? UP : DN;
      let lx = 8;
      const ly = pTop + 10;
      const put = (t, c) => {
        g.fillStyle = c;
        g.fillText(t, lx, ly);
        lx += g.measureText(t).width + 6;
      };
      g.font = `600 11px ${MONO}`;
      put(`${d.sym} · ${this.tf.toUpperCase()}`, TXT);
      g.font = `11px ${MONO}`;
      put("O", AXIS);
      put(fmtN(lb.o, d.dp), col);
      put("H", AXIS);
      put(fmtN(lb.h, d.dp), col);
      put("L", AXIS);
      put(fmtN(lb.l, d.dp), col);
      put("C", AXIS);
      put(fmtN(lb.c, d.dp), col);
      put((ch >= 0 ? "+" : "") + (ch * 100).toFixed(2) + "%", col);
      put("Vol", AXIS);
      put(fmtVol(lb.v), TXT);
      lx = 8;
      const li =
        start +
        (hi != null && hi >= 0 && hi < vis.length ? hi : vis.length - 1);
      const ly2 = ly + 16;
      const put2 = (t, c) => {
        g.fillStyle = c;
        g.fillText(t, lx, ly2);
        lx += g.measureText(t).width + 10;
      };
      if (I.ma20 && I.ma20[li] != null)
        put2("MA20 " + fmtN(I.ma20[li], d.dp), IND_COL.ma20);
      if (I.ma50 && I.ma50[li] != null)
        put2("MA50 " + fmtN(I.ma50[li], d.dp), IND_COL.ma50);
      if (I.bb && I.bb.up[li] != null)
        put2(
          `BB ${fmtN(I.bb.up[li], d.dp)} / ${fmtN(I.bb.lo[li], d.dp)}`,
          IND_COL.bb,
        );
      if (I.vwap && I.vwap[li] != null)
        put2("VWAP " + fmtN(I.vwap[li], d.dp), IND_COL.vwap);
    }
    hIdx(len, shift, cw) {
      return this.hover ? Math.floor(this.hover.x / cw) - shift : null;
    }
  }

  function lineChart(cv, pts, opts = {}) {
    const r = cv.getBoundingClientRect(),
      dpr = window.devicePixelRatio || 1;
    const W = opts.w || r.width,
      H = opts.h || r.height;
    if (!W || !H) return;
    if (!opts.fixed) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    }
    const g = cv.getContext("2d");
    if (!opts.fixed) g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (pts.length < 2) return;
    const padR = opts.axis ? 70 : 0,
      padY = opts.axis ? 12 : 3;
    let mn = Math.min(...pts),
      mx = Math.max(...pts);
    if (opts.base != null) {
      mn = Math.min(mn, opts.base);
      mx = Math.max(mx, opts.base);
    }
    const rg = mx - mn || 1;
    const x = (i) => (i / (pts.length - 1)) * (W - padR),
      y = (v) => padY + ((mx - v) / rg) * (H - padY * 2);
    const up =
      opts.base != null
        ? pts[pts.length - 1] >= opts.base
        : pts[pts.length - 1] >= pts[0];
    const col = up ? UP : DN;
    if (opts.axis) {
      g.font = `11px ${MONO}`;
      g.textBaseline = "middle";
      const st = niceStep(rg / 4);
      for (let p = Math.ceil(mn / st) * st; p <= mx; p += st) {
        g.strokeStyle = GRID;
        g.beginPath();
        g.moveTo(0, Math.round(y(p)) + 0.5);
        g.lineTo(W - padR, Math.round(y(p)) + 0.5);
        g.stroke();
        g.fillStyle = AXIS;
        g.fillText(
          "$" + Math.round(p).toLocaleString("en-US"),
          W - padR + 6,
          y(p),
        );
      }
    }
    if (opts.base != null) {
      g.strokeStyle = "rgba(125,138,163,.35)";
      g.setLineDash([3, 3]);
      g.beginPath();
      g.moveTo(0, y(opts.base));
      g.lineTo(W - padR, y(opts.base));
      g.stroke();
      g.setLineDash([]);
    }
    g.beginPath();
    pts.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
    if (opts.fill) {
      g.save();
      g.lineTo(x(pts.length - 1), H);
      g.lineTo(0, H);
      g.closePath();
      const gr = g.createLinearGradient(0, 0, 0, H);
      gr.addColorStop(0, up ? "rgba(22,199,132,.25)" : "rgba(234,57,67,.25)");
      gr.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = gr;
      g.fill();
      g.restore();
      g.beginPath();
      pts.forEach((v, i) => (i ? g.lineTo(x(i), y(v)) : g.moveTo(x(i), y(v))));
    }
    g.strokeStyle = col;
    g.lineWidth = opts.lw || 1.6;
    g.stroke();
  }

  AX.Chart = Chart;
  AX.lineChart = lineChart;
  AX.fmtVol = fmtVol;
})();
