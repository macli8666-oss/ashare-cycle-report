// chart-valuation.js — 公司估值分位 · odds board(P7 变体:刻度即主角)
// 结构变量:分位(位置)× 组别(AI链 vs 白酒)× PE 读数
(() => {
  const host = document.getElementById("valuation-chart");
  if (!host || !window.RPT) return;
  const U = window.U, PAL = U.PAL, F = U.FONT;
  const C = RPT.charts.chart_company_valuation;
  const body = U.frame(host, {
    title: C.title,
    sub: "ODDS BOARD · 横轴 = PE TTM 相对自身历史分位(0-100%)· 蓝 = AI 算力链(基期 2017-2021 起算不一)· 墨 = 白酒(2016-01 以来 2559 日自算)· 点击刻度钻取",
    src: "K36 · AI 算力链 companies_summary.csv(Gildata)+ K38 · 白酒深潜§8(自算 PE 序列),2026-07-17",
  });

  const pe = { "中际旭创": 73.07, "新易盛": 62.69, "工业富联": 28.11, "沪电股份": 57.17, "天孚通信": 106.16, "澜起科技": 87.62, "兆易创新": 113.06, "深南电路": 62.60, "贵州茅台": 18.94, "五粮液": 22.41 };
  const rows = C.data.categories.map((n, i) => ({ n, v: C.data.series[0].data[i], pe: pe[n], grp: i < 8 ? 0 : 1 }));
  const ZONES = [[0, "地板区"], [20, "低位区"], [50, "高位区"], [80, "拥挤区"]];

  const W = 920, RH = 34, mL = 108, mR = 30, mT = 40, H = mT + rows.length * RH + 92;
  const cv = document.createElement("canvas");
  cv.style.width = "100%"; cv.style.height = "auto"; cv.style.display = "block";
  cv.style.aspectRatio = W + " / " + H;
  body.appendChild(cv);
  const ctx = cv.getContext("2d");
  const hits = [];
  const xs = v => mL + v / 100 * (W - mL - mR);

  function draw(prog) {
    const rct = cv.getBoundingClientRect();
    if (rct.width < 10) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(rct.width * dpr);
    cv.height = Math.round(rct.width * (H / W) * dpr);
    ctx.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0);
    ctx.clearRect(0, 0, W, H);
    hits.length = 0;
    const chartBot = mT + rows.length * RH;

    // zone bands
    ctx.font = `9px ${F.mono}`; ctx.textAlign = "center";
    for (let i = 0; i < 4; i++) {
      const z0 = ZONES[i][0], z1 = i < 3 ? ZONES[i + 1][0] : 100;
      ctx.fillStyle = i % 2 ? "rgba(5,28,44,.025)" : "rgba(5,28,44,.05)";
      ctx.fillRect(xs(z0), mT - 8, xs(z1) - xs(z0), chartBot - mT + 16);
      ctx.fillStyle = PAL.inkLo;
      ctx.fillText(ZONES[i][1], (xs(z0) + xs(z1)) / 2, chartBot + 16);
    }
    // scale ticks
    ctx.fillStyle = PAL.inkLo;
    for (let v = 0; v <= 100; v += 10) {
      ctx.strokeStyle = v % 50 === 0 ? PAL.inkMd : PAL.line;
      ctx.beginPath(); ctx.moveTo(xs(v), mT - 8); ctx.lineTo(xs(v), chartBot + 8); ctx.stroke();
      ctx.fillText(v + "%", xs(v), chartBot + 30);
    }

    let grpStart = 0;
    rows.forEach((r, i) => {
      const y = mT + i * RH + RH / 2;
      if (r.grp !== rows[Math.max(0, i - 1)].grp || i === 0) {
        ctx.font = `700 9.5px ${F.mono}`; ctx.textAlign = "left"; ctx.fillStyle = r.grp === 0 ? PAL.red : PAL.ink;
        ctx.fillText(r.grp === 0 ? "AI 算力链 · 盈利兑现层" : "白酒 · 底部观察层", mL - 100, y - 12);
        grpStart = i;
      }
      const appear = U.clamp(prog * 1.5 - i * 0.05, 0, 1);
      if (appear <= 0) return;
      ctx.globalAlpha = appear;
      // name + PE
      ctx.font = `700 12px ${F.serif}`; ctx.textAlign = "right"; ctx.fillStyle = PAL.ink;
      ctx.fillText(r.n, mL - 10, y + 1);
      ctx.font = `8.5px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
      ctx.fillText("PE " + r.pe.toFixed(1), mL - 10, y + 13);
      // track
      ctx.strokeStyle = PAL.line; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mL, y); ctx.lineTo(W - mR, y); ctx.stroke();
      // fill to position
      const xv = mL + (xs(r.v) - mL) * U.smooth(appear);
      const col = r.grp === 0 ? PAL.red : PAL.ink;
      ctx.fillStyle = r.grp === 0 ? "rgba(34,81,255,.16)" : "rgba(5,28,44,.10)";
      ctx.fillRect(mL, y - 6, xv - mL, 12);
      // marker
      ctx.beginPath(); ctx.fillStyle = col;
      ctx.arc(xv, y, 5, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 1.6;
      ctx.arc(xv, y, 5, 0, U.TAU); ctx.stroke();
      // value
      ctx.font = `700 11px ${F.mono}`; ctx.textAlign = "left"; ctx.fillStyle = col;
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 3.5;
      ctx.strokeText(r.v.toFixed(1) + "%", xv + 9, y + 4);
      ctx.fillText(r.v.toFixed(1) + "%", xv + 9, y + 4);
      ctx.globalAlpha = 1;
      hits.push({ x: mL, y: y - RH / 2, w: W - mL - mR, h: RH, r });
    });
    // footer note
    ctx.font = `9px ${F.mono}`; ctx.textAlign = "left"; ctx.fillStyle = PAL.neg;
    ctx.fillText("⚠ 周期股分位系统性失真:兆易创新历史 PE 中枢 94 倍,65.8% 分位不代表便宜;洋河 PE 59 倍(利润坍塌失真)未列入。", mL, H - 20);
    ctx.fillStyle = PAL.inkLo;
    ctx.fillText("基期不一致(2016-2021 起算不一),横向比较需打折 —— 见 §9 分位数使用纪律。", mL, H - 7);
  }

  cv.addEventListener("click", e => {
    const rct = cv.getBoundingClientRect();
    const x = (e.clientX - rct.left) / rct.width * W, y = (e.clientY - rct.top) / rct.width * W;
    const hit = hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    const r = hit.r;
    U.showDrill({
      title: `${r.n} · PE TTM 历史分位`, value: r.v.toFixed(1) + "%",
      sub: `PE TTM ${r.pe.toFixed(1)} 倍 · 所属层:${r.grp === 0 ? "AI 算力链(盈利兑现层,基期 2017-2021 起算不一)" : "白酒(2016-01 以来 2559 个交易日自算)"} · 周期股分位方向与成长股相反,低分位不自动等于便宜`,
      source: r.grp === 0 ? "K36 · companies_summary.csv(Gildata,2026-07-17)" : "K38 · 白酒深潜§8(Gildata+自算,2026-07-17)",
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
  }), { threshold: 0.12 });
  io.observe(cv);
  if (U.REDUCE) { entered = true; draw(1); }
})();
