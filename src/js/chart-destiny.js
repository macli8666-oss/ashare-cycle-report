// chart-destiny.js — P2 队列台账 destiny flow:41 条当时队列公司 → 结局
// 结构变量:时间 × 流向(实体→结局)× 队列分组;无交易额 → 全部细带(undisclosed = hairline)
(() => {
  const host = document.getElementById("destiny-chart");
  if (!host || !window.RPT) return;
  const U = window.U, PAL = U.PAL, F = U.FONT;
  const body = U.frame(host, {
    title: "队列的归处:六个窗口的 41 家当时公司,17 家以退市/重整/被并购/衰落收场",
    sub: "DESTINY FLOW · 左 = 当时队列(按窗口分组)· 生命线 = 当时可知窗口 → 结局时点 · ✕ = 消亡端点 · 右牌 = 结局归处 · 点击公司或结局牌钻取",
    src: "六行业深潜研究§4.1 队列重建(2026-07-18)· table_cohort_ledger",
  });

  const OUTS = ["存续(含赢家)", "衰落/持续失败", "重整/破产重整", "退市", "被并购", "破发出清", "实质出局"];
  const outOf = t => {
    if (/幸存赢家|存活赢家|存活(?!（曾戴帽）)/.test(t) && !/衰落|重整|退市|并购|出局/.test(t)) return 0;
    if (/存活（曾戴帽）|存活（转型）|存活（翻身）|存活（份额下滑）|存活（周期再起）/.test(t)) return 0;
    if (/幸存赢家/.test(t)) return 0;
    if (/衰落|持续失败|地缘失败/.test(t)) return 1;
    if (/重整/.test(t)) return 2;
    if (/退市/.test(t)) return 3;
    if (/被并购/.test(t)) return 4;
    if (/破发/.test(t)) return 5;
    if (/出局/.test(t)) return 6;
    if (/存活/.test(t)) return 0;
    return 1;
  };
  const rows = RPT.tables.table_cohort_ledger.rows.map(r => {
    const win = r[0].split("·")[0], cohort = r[0].split("·")[1] || "";
    const ys = (r[4].match(/(19|20)\d{2}/g) || []).map(Number);
    const startY = Number((cohort.match(/^\d{4}/) || ["2015"])[0]);
    return { win, cohort, name: r[1], role: r[2], then: r[3], later: r[4], type: r[5],
      out: outOf(r[5]), y0: startY, y1: ys.length ? Math.max(...ys) : (/存活|幸存/.test(r[5]) ? 2026 : 2022) };
  });
  // group order by first appearance
  const groups = [];
  rows.forEach(r => { if (!groups.includes(r.win)) groups.push(r.win); });

  const mL = 128, plaqueW = 128, mR = plaqueW + 16, mT = 30;
  const ROWH = 19.5, GAPH = 17;
  let H = mT + 40;
  const rowY = [];
  {
    let y = H, lastWin = null;
    rows.forEach(r => {
      if (r.win !== lastWin) { if (lastWin) y += GAPH; lastWin = r.win; }
      rowY.push(y); y += ROWH;
    });
    H = y + 60;
  }
  const W = 920;
  const X0 = 2011.5, X1 = 2026.8;
  const xs = yr => mL + (yr - X0) / (X1 - X0) * (W - mL - mR);

  // plaque y = mean of inflow rows
  const inflow = OUTS.map(() => []);
  rows.forEach((r, i) => inflow[r.out].push(rowY[i]));
  const plaqueY = inflow.map((list, oi) => list.length ? list.reduce((a, b) => a + b, 0) / list.length : mT + 60 + oi * 60);
  // sort plaques by mean y, keep min gap
  const order = OUTS.map((_, i) => i).sort((a, b) => plaqueY[a] - plaqueY[b]);
  const pyFinal = [];
  let lastY = mT + 30;
  order.forEach(oi => { pyFinal[oi] = Math.max(plaqueY[oi], lastY); lastY = pyFinal[oi] + 46; });

  const cv = document.createElement("canvas");
  cv.style.width = "100%"; cv.style.height = "auto"; cv.style.display = "block";
  cv.style.aspectRatio = W + " / " + H;
  body.appendChild(cv);
  const ctx = cv.getContext("2d");
  const hits = [];

  function draw(prog) {
    const rct = cv.getBoundingClientRect();
    if (rct.width < 10) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(rct.width * dpr);
    cv.height = Math.round(rct.width * (H / W) * dpr);
    ctx.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0);
    ctx.clearRect(0, 0, W, H);
    hits.length = 0;

    // year axis
    ctx.font = `9px ${F.mono}`; ctx.fillStyle = PAL.inkLo; ctx.textAlign = "center";
    for (let yr = 2012; yr <= 2026; yr += 2) {
      ctx.fillText(String(yr), xs(yr), H - 30);
      ctx.strokeStyle = PAL.lineLo;
      ctx.beginPath(); ctx.moveTo(xs(yr), mT - 6); ctx.lineTo(xs(yr), H - 40); ctx.stroke();
    }

    // lifelines first (labels later — QA postmortem #4)
    let lastWin = null;
    rows.forEach((r, i) => {
      const y = rowY[i];
      if (r.win !== lastWin) {
        ctx.font = `9px ${F.mono}`; ctx.textAlign = "left"; ctx.fillStyle = PAL.red;
        ctx.fillText(r.win + " · " + r.cohort + " 窗口", 6, y - 8);
        lastWin = r.win;
      }
      const g = U.clamp(prog * 1.5 - i * 0.02, 0, 1);
      if (g <= 0) return;
      const x0 = xs(r.y0), x1 = xs(Math.min(r.y1, 2026.55));
      const xEnd = x0 + (x1 - x0) * U.smooth(g);
      const dead = r.out >= 3, fail = r.out >= 1;
      ctx.strokeStyle = fail ? PAL.inkMd : PAL.ink;
      ctx.lineWidth = 2.6; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(xEnd, y); ctx.stroke();
      ctx.font = `8px ${F.mono}`; ctx.fillStyle = PAL.inkLo; ctx.textAlign = "left";
      ctx.fillText(String(r.y0), x0 - 2, y - 6);
      if (g > 0.98) {
        if (dead) { // ✕ endpoint
          ctx.strokeStyle = PAL.neg; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(xEnd - 3.4, y - 3.4); ctx.lineTo(xEnd + 3.4, y + 3.4);
          ctx.moveTo(xEnd + 3.4, y - 3.4); ctx.lineTo(xEnd - 3.4, y + 3.4);
          ctx.stroke();
        } else if (r.out === 1 || r.out === 2) {
          ctx.beginPath(); ctx.fillStyle = PAL.neg;
          ctx.arc(xEnd, y, 2.6, 0, U.TAU); ctx.fill();
        } else {
          ctx.beginPath(); ctx.fillStyle = PAL.red;
          ctx.arc(xEnd, y, 2.6, 0, U.TAU); ctx.fill();
        }
        // ribbon to plaque
        const py = pyFinal[r.out] + 4;
        const rp = U.clamp((prog - 0.55 - i * 0.008) * 2.4, 0, 1);
        if (rp > 0) {
          ctx.globalAlpha = rp * (r.out === 0 ? 0.35 : 0.6);
          ctx.strokeStyle = r.out === 0 ? PAL.red : (r.out >= 3 ? PAL.neg : PAL.inkMd);
          ctx.lineWidth = 1;
          const xm = (xEnd + (W - mR + 6)) / 2;
          ctx.beginPath();
          ctx.moveTo(xEnd, y);
          ctx.bezierCurveTo(xm, y, xm, py, W - mR + 6, py);
          ctx.stroke();
          ctx.globalAlpha = 1;
        }
      }
      hits.push({ x: x0 - 4, y: y - 8, w: Math.max(xEnd - x0 + 8, 30), h: 16, row: r });
    });

    // plaques
    OUTS.forEach((on, oi) => {
      const n = inflow[oi].length;
      if (!n) return;
      const a = U.clamp((prog - 0.7) * 2.6, 0, 1);
      if (a <= 0) return;
      ctx.globalAlpha = a;
      const py = pyFinal[oi] - 12, pw = plaqueW, ph = 30;
      const col = oi === 0 ? PAL.red : (oi >= 3 ? PAL.neg : PAL.ink);
      ctx.fillStyle = "#fff"; ctx.strokeStyle = col; ctx.lineWidth = 1.3;
      ctx.fillRect(W - mR + 6, py, pw, ph); ctx.strokeRect(W - mR + 6, py, pw, ph);
      ctx.fillStyle = col; ctx.fillRect(W - mR + 6, py, 3.5, ph);
      ctx.font = `700 9.5px ${F.mono}`; ctx.textAlign = "left"; ctx.fillStyle = col;
      ctx.fillText(on, W - mR + 14, py + 12);
      ctx.font = `8.5px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
      ctx.fillText("×" + n + " 家", W - mR + 14, py + 24);
      ctx.globalAlpha = 1;
      hits.push({ x: W - mR + 6, y: py, w: pw, h: ph, out: oi });
    });

    // name labels LAST (above lines)
    rows.forEach((r, i) => {
      const y = rowY[i];
      const a = U.clamp(prog * 1.6 - i * 0.02, 0, 1);
      if (a <= 0) return;
      ctx.globalAlpha = a;
      ctx.font = `700 10px ${F.serif}`; ctx.textAlign = "right";
      ctx.fillStyle = r.out >= 3 ? PAL.neg : PAL.ink;
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.lineJoin = "round";
      ctx.strokeText(r.name, mL - 6, y + 3.5);
      ctx.fillText(r.name, mL - 6, y + 3.5);
      ctx.globalAlpha = 1;
    });
    ctx.font = `8.5px ${F.mono}`; ctx.textAlign = "left"; ctx.fillStyle = PAL.inkLo;
    ctx.fillText("细带 = 未披露交易金额;✕ = 消亡端点(退市/出局);红点 = 衰落/重整;蓝点 = 存续", mL, H - 10);
  }

  cv.addEventListener("click", e => {
    const rct = cv.getBoundingClientRect();
    const x = (e.clientX - rct.left) / rct.width * W, y = (e.clientY - rct.top) / rct.width * W;
    const hit = hits.slice().reverse().find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    if (hit.row) {
      const r = hit.row;
      U.showDrill({
        title: `${r.name} · ${r.win} ${r.cohort} 队列`, value: r.type,
        sub: `当时角色:${r.role} · 当时状态:${r.then} · 后续:${r.later}`,
        source: "六行业深潜研究§4.1(2026-07-18)· table_cohort_ledger",
        x: e.clientX, y: e.clientY,
      });
    } else {
      const names = rows.filter(r => r.out === hit.out).map(r => r.name).join("、");
      U.showDrill({
        title: "结局归处 · " + OUTS[hit.out], value: "×" + inflow[hit.out].length + " 家",
        sub: names,
        source: "table_cohort_ledger(2026-07-18)· 幸存者偏差制度性排除",
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
    const p = U.clamp((ts - t0) / 1900, 0, 1);
    draw(U.REDUCE ? 1 : p);
    if (p < 1 && !U.REDUCE) requestAnimationFrame(anim);
  }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !entered) { entered = true; io.disconnect(); requestAnimationFrame(anim); }
  }), { threshold: 0.08 });
  io.observe(cv);
  if (U.REDUCE) { entered = true; draw(1); }
})();
