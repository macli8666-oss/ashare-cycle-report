// chart-profit.js — 全A盈利加速(区间口径)+ 2024Q1 缺口(画成缺口)
// 结构变量:期间 × 区间上下沿;缺口 = 红斜纹 + ? + [TBD],不插值
(() => {
  const host = document.getElementById("profit-chart");
  if (!host || !window.RPT) return;
  const U = window.U, PAL = U.PAL, F = U.FONT;
  const body = U.frame(host, {
    title: "全 A 盈利加速是总量事实:2026Q1 净利同比 +5.0~7.9%,较 2025 年报明显抬升",
    sub: "RANGE BLOCKS · 粗带 = 区间下沿→上沿 · 2024Q1 未能核实 → 画成缺口不引用 · K 型结构分化见 §2 行业地图",
    src: "K34 · 31 行业扫描「市场背景」节 + K12 · 《2026 年国民经济和社会发展计划报告》规上制造业利润 +5.0%(2026-05-07 交叉印证下沿)",
  });

  const W = 800, H = 330, mL = 60, mR = 30, mT = 40, mB = 46;
  const cv = document.createElement("canvas");
  cv.style.width = "100%"; cv.style.height = "auto"; cv.style.display = "block";
  cv.style.aspectRatio = W + " / " + H;
  body.appendChild(cv);
  const ctx = cv.getContext("2d");
  const hits = [];
  const cols = [
    { lab: "2024Q1", lo: null, hi: null, gap: true },
    { lab: "2025 年报", lo: 0.2, hi: 0.8 },
    { lab: "2026Q1", lo: 5.0, hi: 7.9 },
  ];
  const ymax = 10;
  const ys = v => mT + (1 - v / ymax) * (H - mT - mB);
  const cw = (W - mL - mR) / 3;

  function draw(prog) {
    const rct = cv.getBoundingClientRect();
    if (rct.width < 10) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(rct.width * dpr);
    cv.height = Math.round(rct.width * (H / W) * dpr);
    ctx.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0);
    ctx.clearRect(0, 0, W, H);
    hits.length = 0;
    // grid
    ctx.font = `9px ${F.mono}`; ctx.fillStyle = PAL.inkLo; ctx.textAlign = "right";
    for (let v = 0; v <= 10; v += 2) {
      ctx.strokeStyle = v === 0 ? PAL.ink : PAL.lineLo; ctx.lineWidth = v === 0 ? 1.2 : 1;
      ctx.beginPath(); ctx.moveTo(mL, ys(v)); ctx.lineTo(W - mR, ys(v)); ctx.stroke();
      ctx.fillText("+" + v + "%", mL - 6, ys(v) + 3);
    }
    cols.forEach((c, i) => {
      const cx = mL + cw * i + cw / 2;
      const p = U.clamp(prog * 1.6 - i * 0.18, 0, 1);
      if (p <= 0) return;
      ctx.globalAlpha = p;
      if (c.gap) {
        // red hatch gap column
        const gx = cx - 34, gy = ys(0) - 120, gh = 120;
        ctx.save();
        ctx.beginPath(); ctx.rect(gx, gy, 68, gh); ctx.clip();
        ctx.strokeStyle = "rgba(194,47,78,.4)"; ctx.lineWidth = 1;
        for (let x = gx - gh; x < gx + 68; x += 9) {
          ctx.beginPath(); ctx.moveTo(x, gy + gh); ctx.lineTo(x + gh, gy); ctx.stroke();
        }
        ctx.restore();
        ctx.setLineDash([4, 3]); ctx.strokeStyle = PAL.neg; ctx.lineWidth = 1.2;
        ctx.strokeRect(gx, gy, 68, gh); ctx.setLineDash([]);
        ctx.font = `700 18px ${F.mono}`; ctx.textAlign = "center"; ctx.fillStyle = PAL.neg;
        ctx.fillText("?", cx, gy + 46);
        ctx.font = `9px ${F.mono}`;
        ctx.fillText("[TBD] 未能在源文件中核实", cx, gy + 64);
        ctx.fillText("按缺口处理,不引用", cx, gy + 78);
        hits.push({ x: gx, y: gy, w: 68, h: gh, c });
      } else {
        const bw = 68;
        const yHi = ys(c.hi), yLo = ys(c.lo);
        const h = (yLo - yHi) * U.smooth(p);
        ctx.fillStyle = "rgba(34,81,255,.18)";
        ctx.fillRect(cx - bw / 2, yLo - h, bw, h);
        ctx.strokeStyle = PAL.red; ctx.lineWidth = 1.6;
        ctx.strokeRect(cx - bw / 2, yLo - h, bw, h);
        // whisker labels
        ctx.font = `700 12px ${F.mono}`; ctx.textAlign = "center"; ctx.fillStyle = PAL.red;
        ctx.fillText("+" + c.hi.toFixed(1) + "%", cx, yLo - h - 8);
        ctx.font = `9px ${F.mono}`; ctx.fillStyle = PAL.inkMd;
        ctx.fillText("下沿 +" + c.lo.toFixed(1) + "%", cx, yLo + 14);
        hits.push({ x: cx - bw / 2, y: yLo - h, w: bw, h: h + 16, c });
      }
      ctx.globalAlpha = 1;
      ctx.font = `700 11.5px ${F.serif}`; ctx.textAlign = "center"; ctx.fillStyle = PAL.ink;
      ctx.fillText(c.lab, cx, H - mB + 20);
    });
    // acceleration arrow
    if (prog > 0.8) {
      ctx.globalAlpha = (prog - 0.8) * 5;
      const x0 = mL + cw * 1.5 + 40, y0 = ys(0.5) - 6, x1 = mL + cw * 2.5 - 40, y1 = ys(6.4);
      ctx.strokeStyle = PAL.red; ctx.lineWidth = 1.4; ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo((x0 + x1) / 2, y0 - 60, x1, y1); ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath(); ctx.fillStyle = PAL.red;
      ctx.moveTo(x1, y1); ctx.lineTo(x1 - 8, y1 + 2); ctx.lineTo(x1 - 2, y1 + 8); ctx.closePath(); ctx.fill();
      ctx.font = `700 9.5px ${F.mono}`; ctx.textAlign = "center";
      ctx.fillText("加速 ≈ +5pt(区间口径)", (x0 + x1) / 2, y0 - 58);
      ctx.globalAlpha = 1;
    }
  }

  cv.addEventListener("click", e => {
    const rct = cv.getBoundingClientRect();
    const x = (e.clientX - rct.left) / rct.width * W, y = (e.clientY - rct.top) / rct.width * W;
    const hit = hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    const c = hit.c;
    U.showDrill(c.gap ? {
      title: "2024Q1 全 A 盈利 · 数据缺口", value: "[TBD]",
      sub: "任务口径提及的 2024Q1 -3.56% 未能在源文件中核实,按证据纪律记为缺口不纳入;盈利加速图仅保留两个可核实时点。",
      source: "K34 · 31 行业扫描底稿 + §12 局限性缺口 ①",
      x: e.clientX, y: e.clientY,
    } : {
      title: c.lab + " · 全 A 归母净利同比(区间口径)",
      value: `+${c.lo.toFixed(1)}% ~ +${c.hi.toFixed(1)}%`,
      sub: c.lab === "2026Q1" ? "较 2025 年报(+0.2~0.8%)明显抬升;规上制造业利润 +5.0%(2026 年计划报告)交叉印证下沿。盈利呈 K 型结构分化。" : "区间为不同统计口径的上下沿,并列呈现不取中值。",
      source: "K34 · 31 行业扫描「市场背景」节(2026-07-17)+ K12 · 2026 年计划报告(2026-05-07)",
      x: e.clientX, y: e.clientY,
    });
  });
  cv.addEventListener("mousemove", e => {
    const rct = cv.getBoundingClientRect();
    const x = (e.clientX - rct.left) / rct.width * W, y = (e.clientY - rct.top) / rct.width * W;
    cv.style.cursor = hits.some(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) ? "pointer" : "default";
  });

  let entered = false, t0 = null;
  function anim(ts) {
    if (t0 == null) t0 = ts;
    const p = U.clamp((ts - t0) / 1200, 0, 1);
    draw(U.REDUCE ? 1 : p);
    if (p < 1 && !U.REDUCE) requestAnimationFrame(anim);
  }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !entered) { entered = true; io.disconnect(); requestAnimationFrame(anim); }
  }), { threshold: 0.15 });
  io.observe(cv);
  if (U.REDUCE) { entered = true; draw(1); }
})();
