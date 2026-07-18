// chart-sw31.js — 31 行业 YTD × 2026Q1 营收增速 成对横条(chart_sw31_stage_map)
// 结构变量:股价(YTD)× 基本面(Q1营收),排序 = 营收降序;背离即视觉错位
(() => {
  const host = document.getElementById("sw31-chart");
  if (!host || !window.RPT) return;
  const U = window.U, PAL = U.PAL, F = U.FONT;
  const C = RPT.charts.chart_sw31_stage_map;
  const body = U.frame(host, {
    title: C.title,
    sub: "PAIRED BARS · 墨条 = YTD 涨跌幅 · 蓝条 = 2026Q1 营收同比 · 按营收降序 · 蓝高墨低 = 背离候选 · 点击任一条钻取",
    src: "K33 · industry_master.csv(申万/Wind,2026-07-17 收盘)",
  });

  const rows = RPT.industries
    .map(d => ({ name: d.name, code: d.code, ytd: d.ytd, rev: d.rev_q1, stage: d.stage_label }))
    .sort((a, b) => (b.rev ?? -999) - (a.rev ?? -999));
  const DEEP = new Set(["电子", "通信", "电力设备", "医药生物", "农林牧渔", "食品饮料", "汽车"]);

  const RH = 25, W = 920, mL = 96, mR = 74, H = rows.length * RH + 66;
  const cv = document.createElement("canvas");
  cv.style.width = "100%"; cv.style.height = "auto"; cv.style.display = "block";
  cv.style.aspectRatio = W + " / " + H;
  body.appendChild(cv);
  const ctx = cv.getContext("2d");
  const hits = [];
  const vmax = 60; // symmetric scale ±60%
  const x0 = mL + (W - mL - mR) / 2;
  const xs = v => x0 + U.clamp(v / vmax, -1, 1) * ((W - mL - mR) / 2);

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
    ctx.strokeStyle = PAL.lineLo; ctx.lineWidth = 1;
    ctx.textAlign = "center"; ctx.font = `9px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
    for (let v = -60; v <= 60; v += 20) {
      ctx.beginPath(); ctx.moveTo(xs(v), 8); ctx.lineTo(xs(v), H - 40); ctx.stroke();
      ctx.fillText((v > 0 ? "+" : "") + v + "%", xs(v), H - 26);
    }
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x0, 8); ctx.lineTo(x0, H - 40); ctx.stroke();

    rows.forEach((r, i) => {
      const y = 14 + i * RH;
      const appear = U.clamp(prog * 1.5 - i * 0.025, 0, 1);
      if (appear <= 0) return;
      ctx.globalAlpha = appear;
      // name
      ctx.textAlign = "right"; ctx.font = `${DEEP.has(r.name) ? "700" : "400"} 11px ${F.serif}`;
      ctx.fillStyle = DEEP.has(r.name) ? PAL.ink : PAL.inkMd;
      ctx.fillText(r.name, mL - 8, y + 9);
      // YTD bar (ink)
      const yw = (xs(r.ytd) - x0) * appear;
      ctx.fillStyle = r.ytd < 0 ? PAL.neg : PAL.ink;
      ctx.fillRect(yw < 0 ? x0 + yw : x0, y, Math.abs(yw), 7.5);
      // rev bar (blue)
      const rw = r.rev == null ? 0 : (xs(r.rev) - x0) * appear;
      if (r.rev == null) {
        ctx.strokeStyle = PAL.inkLo; ctx.setLineDash([2, 3]);
        ctx.strokeRect(x0 - 4, y + 10.5, 8, 7.5); ctx.setLineDash([]);
        ctx.textAlign = "left"; ctx.font = `8.5px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
        ctx.fillText("缺口", x0 + 8, y + 17.5);
      } else {
        ctx.fillStyle = r.rev < 0 ? PAL.neg : PAL.red;
        ctx.fillRect(rw < 0 ? x0 + rw : x0, y + 10.5, Math.abs(rw), 7.5);
      }
      // value labels
      ctx.font = `9px ${F.mono}`; ctx.textAlign = "left";
      ctx.fillStyle = r.ytd < 0 ? PAL.neg : PAL.ink;
      ctx.fillText((r.ytd > 0 ? "+" : "") + r.ytd.toFixed(1), Math.max(x0 + yw, x0) + 4, y + 7);
      if (r.rev != null) {
        ctx.fillStyle = r.rev < 0 ? PAL.neg : PAL.red;
        ctx.fillText((r.rev > 0 ? "+" : "") + r.rev.toFixed(1), Math.max(x0 + rw, x0) + 4, y + 17.5);
      }
      ctx.globalAlpha = 1;
      hits.push({ x: mL, y, w: W - mL - mR, h: RH - 4, r });
    });
    // legend
    ctx.textAlign = "left"; ctx.font = `9.5px ${F.mono}`;
    ctx.fillStyle = PAL.ink; ctx.fillRect(mL, H - 16, 12, 3.5);
    ctx.fillStyle = PAL.inkMd; ctx.fillText("YTD 涨跌幅(负值为语义红)", mL + 17, H - 11);
    ctx.fillStyle = PAL.red; ctx.fillRect(mL + 170, H - 16, 12, 3.5);
    ctx.fillStyle = PAL.inkMd; ctx.fillText("2026Q1 营收同比 · 银行缺口以虚框标出(扫描口径 +7.59%)", mL + 187, H - 11);
  }

  cv.addEventListener("click", e => {
    const rct = cv.getBoundingClientRect();
    const x = (e.clientX - rct.left) / rct.width * W, y = (e.clientY - rct.top) / rct.width * W;
    const hit = hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    const r = hit.r;
    U.showDrill({
      title: `${r.name}（${r.code}）· 股价 × 基本面`,
      value: `YTD ${r.ytd > 0 ? "+" : ""}${r.ytd}% / Q1 营收 ${r.rev == null ? "缺口" : (r.rev > 0 ? "+" : "") + r.rev + "%"}`,
      sub: `阶段判定:${r.stage} · YTD 为日度行情快照、营收为季度财务,频率不同已并列注明`,
      source: "K33 · industry_master.csv(2026-07-17 收盘;财务 2026Q1)",
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
    const p = U.clamp((ts - t0) / 1300, 0, 1);
    draw(U.REDUCE ? 1 : p);
    if (p < 1 && !U.REDUCE) requestAnimationFrame(anim);
  }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !entered) { entered = true; io.disconnect(); requestAnimationFrame(anim); }
  }), { threshold: 0.1 });
  io.observe(cv);
  if (U.REDUCE) { entered = true; draw(1); }
})();
