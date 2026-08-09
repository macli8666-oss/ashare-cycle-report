// chart-adjust.js — 7 月调整周事件时间线(P3 wall-chart 变体,日粒度)
// 结构变量:时间 × 事件类型(外部/资金/基本面/定性)
(() => {
  const host = document.getElementById("adjust-chart");
  if (!host) return;
  const U = window.U, PAL = U.PAL, F = U.FONT;
  const body = U.frame(host, {
    title: "调整周全景:杠杆出清的五个交易日,护盘资金与预喜率在场",
    sub: "WALL CHART · 2026-07-06 → 07-18 · 蓝框 = 资金/政策 · 墨框 = 市场 · 红框 = 外部冲击 · 点击事件牌钻取",
    src: "K30 · 中证金牛座全景复盘(2026-07-18)+ K5/K8/K31/K32(逐事件)",
  });

  const EV = [
    { d: "07-08", day: 8, t: "美伊冲突升级压制风险偏好", ty: "ext", k: "K31",
      note: "外部扰动;冲突外溢至霍尔木兹航运为证伪条件(外部风险信号 = missing)" },
    { d: "07-13", day: 13, t: "调整开始:沪深300 周跌 5.4% 起点", ty: "mkt", k: "K30",
      note: "7/13-7/17 沪深300 周跌 5.4%,六年半最大周跌幅;电子周 -18.8%、通信周 -13.1%" },
    { d: "07-14", day: 14, t: "融资余额单日 -347 亿 · 兴业测得 TMT 拥挤度 -1.5σ", ty: "flow", k: "K5",
      note: "融资余额单周净偿还约 800 亿元;拥挤度处于过去 2-3 年 8% 分位" },
    { d: "07-16", day: 16, t: "中报预告:1678 家披露、预喜率 43.9%", ty: "fund", k: "K1",
      note: "2025 年同期 42.8%,五年中枢约 46%;预喜集中非银/有色/石化/电子/化工" },
    { d: "07-17", day: 17, t: "JPM 定性:拥挤交易出清而非基本面恶化", ty: "flow", k: "K8",
      note: "「前期高杠杆、高拥挤交易的集中出清」;同日宽基 ETF 四日净流入约 1200 亿元(K32)" },
    { d: "07-17", day: 17.4, t: "数据截止:本周五收盘", ty: "mkt", k: "K30",
      note: "初版行情与估值数据截至 2026-07-17 收盘;本次复核已更新至 2026-08-07" },
    { d: "07-18", day: 18, t: "中证金牛座发布全景复盘", ty: "fund", k: "K30",
      note: "报告形成于调整当周,存在叙事偏倚风险,建议一周后复核(§12 缺口 ⑪)" },
  ];
  const TCOL = { ext: PAL.neg, mkt: PAL.ink, flow: PAL.red, fund: PAL.inkMd };
  const TNAM = { ext: "外部冲击", mkt: "市场", flow: "资金/定性", fund: "基本面" };

  const W = 920, H = 300, mL = 40, mR = 20, axisY = 236;
  const cv = document.createElement("canvas");
  cv.style.width = "100%"; cv.style.height = "auto"; cv.style.display = "block";
  cv.style.aspectRatio = W + " / " + H;
  body.appendChild(cv);
  const ctx = cv.getContext("2d");
  const hits = [];
  const xs = d => mL + (d - 6) / (18.8 - 6) * (W - mL - mR);

  // greedy layers
  const items = EV.map(ev => ({ ev, x: xs(ev.day), w: Math.max(ev.t.length * 10.4, 66) + 14, layer: 0 })).sort((a, b) => a.x - b.x);
  const lr = [];
  items.forEach(it => {
    let L = 0;
    while (L < 6 && lr[L] != null && it.x - it.w / 2 <= lr[L] + 8) L++;
    it.layer = L; lr[L] = it.x + it.w / 2;
  });

  function draw(prog) {
    const rct = cv.getBoundingClientRect();
    if (rct.width < 10) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(rct.width * dpr);
    cv.height = Math.round(rct.width * (H / W) * dpr);
    ctx.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0);
    ctx.clearRect(0, 0, W, H);
    hits.length = 0;

    // adjustment-week band
    ctx.fillStyle = "rgba(34,81,255,.06)";
    ctx.fillRect(xs(13), 20, xs(17.6) - xs(13), axisY - 20);
    ctx.font = `9px ${F.mono}`; ctx.textAlign = "center"; ctx.fillStyle = PAL.red;
    ctx.fillText("7/13-7/17 调整周(沪深300 -5.4%)", (xs(13) + xs(17.6)) / 2, 32);

    // axis
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(mL, axisY); ctx.lineTo(W - mR, axisY); ctx.stroke();
    ctx.font = `9px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
    for (let d = 6; d <= 18; d += 2) {
      ctx.textAlign = "center";
      ctx.fillText("7/" + d, xs(d), axisY + 16);
      ctx.strokeStyle = PAL.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xs(d), axisY); ctx.lineTo(xs(d), axisY + 5); ctx.stroke();
    }
    // stems
    items.forEach(it => {
      ctx.strokeStyle = PAL.line;
      ctx.beginPath();
      ctx.moveTo(it.x, axisY - 4);
      ctx.lineTo(it.x, axisY - 26 - it.layer * 40);
      ctx.stroke();
      ctx.beginPath(); ctx.fillStyle = PAL.inkLo;
      ctx.arc(it.x, axisY - 4, 2.2, 0, U.TAU); ctx.fill();
    });
    // plaques
    items.forEach((it, i) => {
      const a = U.clamp(prog * 1.5 - i * 0.09, 0, 1);
      if (a <= 0) return;
      ctx.globalAlpha = a;
      const col = TCOL[it.ev.ty];
      const pw = it.w, ph = 34;
      const px = U.clamp(it.x - pw / 2, mL, W - mR - pw);
      const py = axisY - 30 - it.layer * 40 - ph;
      ctx.fillStyle = "#fff"; ctx.strokeStyle = col; ctx.lineWidth = 1.1;
      ctx.fillRect(px, py, pw, ph); ctx.strokeRect(px, py, pw, ph);
      ctx.font = `8px ${F.mono}`; ctx.textAlign = "left"; ctx.fillStyle = PAL.inkLo;
      ctx.fillText("7/" + it.ev.d + " · " + TNAM[it.ev.ty], px + 6, py + 11);
      ctx.font = `700 9.8px ${F.serif}`; ctx.fillStyle = PAL.ink;
      let lab = it.ev.t;
      while (ctx.measureText(lab).width > pw - 12 && lab.length > 4) lab = lab.slice(0, -1);
      if (lab !== it.ev.t) lab = lab.slice(0, -1) + "…";
      ctx.fillText(lab, px + 6, py + 25);
      ctx.globalAlpha = 1;
      hits.push({ x: px, y: py, w: pw, h: ph, ev: it.ev });
    });
  }

  cv.addEventListener("click", e => {
    const rct = cv.getBoundingClientRect();
    const x = (e.clientX - rct.left) / rct.width * W, y = (e.clientY - rct.top) / rct.width * W;
    const hit = hits.slice().reverse().find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    const ev = hit.ev;
    U.showDrill({
      title: "2026-07-" + ev.d + " · " + TNAM[ev.ty], value: ev.t,
      sub: ev.note, source: window.srcRef ? srcRef(ev.k) : ev.k,
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
    const p = U.clamp((ts - t0) / 1100, 0, 1);
    draw(U.REDUCE ? 1 : p);
    if (p < 1 && !U.REDUCE) requestAnimationFrame(anim);
  }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !entered) { entered = true; io.disconnect(); requestAnimationFrame(anim); }
  }), { threshold: 0.15 });
  io.observe(cv);
  if (U.REDUCE) { entered = true; draw(1); }
})();
