// chart-stockline.js — 7 条行业指数 12 年 stockline(含真实事件与阶段带)
// P3 分层:阶段带 → 事件茎(stemLayer)→ 主线 → 事件牌(plaqueLayer)→ 读数
// 结构变量:时间 × 点位 × 事件类型 × 阶段带(类比窗口)
(() => {
  const U = window.U, PAL = U.PAL, F = U.FONT;

  const SLMETA = {
    "chart-sl-801080": "K35 · Wind 长周期日线 801080.SI(2014-01-02 至 2026-08-07,共 3063 个交易日)",
    "chart-sl-801770": "K35 · Wind 长周期日线 801770.SI(同上 3048 个交易日)",
    "chart-sl-801010": "K35 · Wind 长周期日线 801010.SI(同上)",
    "chart-sl-801120": "K35 · Wind 长周期日线 801120.SI(同上)",
    "chart-sl-801730": "K35 · Wind 长周期日线 801730.SI(同上)",
    "chart-sl-801150": "K35 · Wind 长周期日线 801150.SI(同上)",
    "chart-sl-801880": "K35 · Wind 长周期日线 801880.SI(同上)",
  };

  function pdate(d) { // "2016-06" | "2017-11-13" → ms
    const p = d.split("-").map(Number);
    return Date.UTC(p[0], (p[1] || 1) - 1, p[2] || 1);
  }

  function build(cid) {
    const hid = cid.replace(/_/g, "-"); // JSON keys chart_sl_* ↔ host ids chart-sl-*
    const host = document.getElementById(hid);
    if (!host) return;
    const C = RPT.stocklines[cid];
    const body = U.frame(host, {
      title: C.title,
      sub: "12-YEAR STOCKLINE · 阶段带 = 类比窗口(蓝 = 本轮)· 事件牌 = 周期关键事件(蓝框 = 政策,红框 = 下跌/出清,虚框 = 当前窗口)· 点击牌/带钻取",
      src: SLMETA[hid] || C.caption,
    });

    const W = 920, H = 470, mL = 54, mR = 90, mT = 84, mB = 34;
    const cv = document.createElement("canvas");
    cv.style.width = "100%"; cv.style.height = "auto"; cv.style.display = "block";
    cv.style.aspectRatio = W + " / " + H;
    body.appendChild(cv);
    const ctx = cv.getContext("2d");
    const hits = [];

    const rows = C.series;
    const t0s = pdate(rows[0][0]), t1s = pdate(rows[rows.length - 1][0]);
    const xs = t => mL + (t - t0s) / (t1s - t0s) * (W - mL - mR);
    let ymin = Infinity, ymax = -Infinity;
    rows.forEach(r => { ymin = Math.min(ymin, r[1]); ymax = Math.max(ymax, r[1]); });
    const pad = (ymax - ymin) * 0.07;
    ymin -= pad; ymax += pad;
    const ys = v => mT + (1 - (v - ymin) / (ymax - ymin)) * (H - mT - mB);

    const BANDFILL = { same: "rgba(5,28,44,.055)", current: "rgba(34,81,255,.075)", history: "rgba(5,28,44,.03)", different: "rgba(194,47,78,.05)" };
    const BANDLINE = { same: PAL.inkMd, current: PAL.red, history: PAL.inkLo, different: PAL.neg };
    const evFrame = ev => {
      const cur = pdate(ev.date) >= Date.UTC(2026, 0, 1);
      const negEv = ev.type === "market" && /调整|跌|最低|新低|出清|回撤|长阴/.test(ev.label);
      return { cur, col: ev.type === "policy" ? PAL.red : (negEv ? PAL.neg : PAL.ink) };
    };

    // greedy plaque layering
    function layoutEvents() {
      const items = C.events.map(ev => {
        const x = xs(pdate(ev.date));
        const wT = Math.max(ev.label.length * 10.6, ev.date.length * 6.4) + 16;
        return { ev, x, w: wT, layer: 0 };
      }).sort((a, b) => a.x - b.x);
      const layerRight = [];
      items.forEach(it => {
        let L = 0;
        while (L < 9) {
          if (layerRight[L] == null || it.x - it.w / 2 > layerRight[L] + 8) break;
          L++;
        }
        it.layer = L;
        layerRight[L] = it.x + it.w / 2;
      });
      return items;
    }
    const evItems = layoutEvents();
    const maxLayer = Math.max(...evItems.map(i => i.layer), 0);

    function draw(prog) {
      const rct = cv.getBoundingClientRect();
      if (rct.width < 10) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(rct.width * dpr);
      cv.height = Math.round(rct.width * (H / W) * dpr);
      ctx.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0);
      ctx.clearRect(0, 0, W, H);
      hits.length = 0;

      // bands
      C.bands.forEach(b => {
        const bx0 = xs(pdate(b.start)), bx1 = xs(pdate(b.end));
        ctx.fillStyle = BANDFILL[b.tone] || BANDFILL.same;
        ctx.fillRect(bx0, mT, bx1 - bx0, H - mT - mB);
        ctx.strokeStyle = BANDLINE[b.tone] || PAL.inkLo;
        ctx.setLineDash(b.tone === "current" ? [4, 4] : []);
        ctx.lineWidth = 1;
        ctx.strokeRect(bx0, mT, bx1 - bx0, H - mT - mB);
        ctx.setLineDash([]);
        // band label (top, inside)
        ctx.font = `9px ${F.mono}`;
        ctx.fillStyle = BANDLINE[b.tone] || PAL.inkLo;
        ctx.textAlign = "left";
        const lab = b.label;
        const tw = ctx.measureText(lab).width;
        ctx.save();
        ctx.beginPath(); ctx.rect(bx0, mT, bx1 - bx0, H - mT - mB); ctx.clip();
        if (tw + 8 < bx1 - bx0) ctx.fillText(lab, bx0 + 4, mT + 11);
        else ctx.fillText(lab.slice(0, Math.floor((bx1 - bx0 - 10) / 9)) + "…", bx0 + 4, mT + 11);
        ctx.restore();
        hits.push({ x: bx0, y: mT, w: Math.max(bx1 - bx0, 4), h: H - mT - mB, band: b });
      });

      // y grid + x years
      ctx.font = `9px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
      for (let i = 0; i <= 4; i++) {
        const v = ymin + (ymax - ymin) * i / 4, y = ys(v);
        ctx.strokeStyle = PAL.lineLo; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(mL, y); ctx.lineTo(W - mR, y); ctx.stroke();
        ctx.textAlign = "right";
        ctx.fillText(v >= 1000 ? (v / 1000).toFixed(1) + "k" : v.toFixed(0), mL - 6, y + 3);
      }
      ctx.textAlign = "center";
      for (let yr = 2014; yr <= 2026; yr += 2) {
        const x = xs(Date.UTC(yr, 0, 1));
        if (x > W - mR) continue;
        ctx.fillText(String(yr), x, H - mB + 16);
        ctx.strokeStyle = PAL.line;
        ctx.beginPath(); ctx.moveTo(x, H - mB); ctx.lineTo(x, H - mB + 5); ctx.stroke();
      }

      // event stems (stemLayer — before main line & plaques)
      evItems.forEach(it => {
        ctx.strokeStyle = PAL.line;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(it.x, mT + 18 + it.layer * 24 + 26);
        ctx.lineTo(it.x, H - mB - 2);
        ctx.stroke();
        ctx.beginPath(); ctx.fillStyle = PAL.inkLo;
        ctx.arc(it.x, H - mB - 2, 2, 0, U.TAU); ctx.fill();
      });

      // main line (grows with prog)
      const n = rows.length;
      const upto = Math.max(2, Math.floor(n * U.smooth(prog)));
      ctx.beginPath();
      for (let i = 0; i < upto; i++) {
        const x = xs(pdate(rows[i][0])), y = ys(rows[i][1]);
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.5; ctx.lineJoin = "round"; ctx.stroke();
      // current-window re-stroke in blue
      const i2023 = rows.findIndex(r => pdate(r[0]) >= Date.UTC(2023, 0, 1));
      if (i2023 > 0 && upto > i2023) {
        ctx.beginPath();
        for (let i = i2023; i < upto; i++) {
          const x = xs(pdate(rows[i][0])), y = ys(rows[i][1]);
          i === i2023 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = PAL.red; ctx.lineWidth = 1.8; ctx.stroke();
      }
      // last value readout
      if (prog >= 1) {
        const lx = xs(pdate(rows[n - 1][0])), ly = ys(rows[n - 1][1]);
        ctx.beginPath(); ctx.fillStyle = PAL.red;
        ctx.arc(lx, ly, 3, 0, U.TAU); ctx.fill();
        ctx.font = `700 15px ${F.mono}`; ctx.textAlign = "left";
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 4; ctx.lineJoin = "round";
        const val = rows[n - 1][1].toLocaleString("en-US", { maximumFractionDigits: 0 });
        ctx.strokeText(val, lx + 7, ly - 4);
        ctx.fillStyle = PAL.red; ctx.fillText(val, lx + 7, ly - 4);
        ctx.font = `8.5px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
        ctx.fillText(rows[n - 1][0], lx + 7, ly + 9);
      }

      // event plaques (plaqueLayer — after line)
      evItems.forEach((it, i) => {
        const a = U.clamp(prog * 1.4 - 0.25 - i * 0.05, 0, 1);
        if (a <= 0) return;
        ctx.globalAlpha = a;
        const { cur, col } = evFrame(it.ev);
        const pw = it.w, ph = 30;
        const px = U.clamp(it.x - pw / 2, mL, W - mR - pw), py = mT + 18 + it.layer * 24;
        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = col; ctx.lineWidth = cur ? 1.4 : 1;
        ctx.setLineDash(cur ? [4, 3] : []);
        ctx.fillRect(px, py, pw, ph);
        ctx.strokeRect(px, py, pw, ph);
        ctx.setLineDash([]);
        ctx.textAlign = "left";
        ctx.font = `8px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
        ctx.fillText(it.ev.date, px + 6, py + 10);
        ctx.font = `700 10px ${F.serif}`; ctx.fillStyle = PAL.ink;
        // measure-truncate label to plaque width
        let lab = it.ev.label;
        while (ctx.measureText(lab).width > pw - 12 && lab.length > 4) lab = lab.slice(0, -1);
        if (lab !== it.ev.label) lab = lab.slice(0, -1) + "…";
        ctx.fillText(lab, px + 6, py + 23);
        ctx.globalAlpha = 1;
        hits.push({ x: px, y: py, w: pw, h: ph, ev: it.ev });
      });
    }

    cv.addEventListener("click", e => {
      const rct = cv.getBoundingClientRect();
      const x = (e.clientX - rct.left) / rct.width * W, y = (e.clientY - rct.top) / rct.width * W;
      const hit = hits.slice().reverse().find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
      if (!hit) return;
      if (hit.ev) {
        const ev = hit.ev;
        const ty = { policy: "政策", market: "市场", price: "价格", event: "事件" }[ev.type] || ev.type;
        U.showDrill({
          title: `${ev.date} · ${ty}事件`, value: ev.label,
          sub: ev.note + "(日期精确到" + (ev.date.length > 7 ? "日" : "月") + ",为源文件可核实粒度)",
          source: (SLMETA[cid] || "").replace("K35 · ", "K35 · ") + " · 事件见各深潜研究§3",
          x: e.clientX, y: e.clientY,
        });
      } else if (hit.band) {
        const b = hit.band;
        const tone = { same: "同型类比", current: "本轮窗口", history: "历史窗口", different: "异质对照" }[b.tone] || b.tone;
        U.showDrill({
          title: `类比窗口 · ${tone}`, value: b.label,
          sub: `${b.start} → ${b.end} · 窗口语义:${tone};类比价值在机制对照,不在行情暗示`,
          source: "cycle_report.json · charts." + cid + ".stage_bands",
          x: e.clientX, y: e.clientY,
        });
      }
    });
    cv.addEventListener("mousemove", e => {
      const rct = cv.getBoundingClientRect();
      const x = (e.clientX - rct.left) / rct.width * W, y = (e.clientY - rct.top) / rct.width * W;
      cv.style.cursor = hits.some(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) ? "pointer" : "default";
    });

    let entered = false, t0 = null;
    function anim(ts) {
      if (t0 == null) t0 = ts;
      const p = U.clamp((ts - t0) / 1500, 0, 1);
      draw(U.REDUCE ? 1 : p);
      if (p < 1 && !U.REDUCE) requestAnimationFrame(anim);
    }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && !entered) { entered = true; io.disconnect(); requestAnimationFrame(anim); }
    }), { threshold: 0.12 });
    io.observe(cv);
    if (U.REDUCE) { entered = true; draw(1); }
  }

  Object.keys(RPT.stocklines).forEach(build);
})();
