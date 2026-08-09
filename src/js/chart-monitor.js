// chart-monitor.js — P15 causal horizon:22 个监测信号
// x = 领先结果的月数(左=领先大,右=同步)· y = 因果层 · 节点三态 met/partial/missing
// 结构变量:时滞 × 因果层 × 阈值距离(三态环)
(() => {
  const host = document.getElementById("monitor-chart");
  if (!host || !window.RPT) return;
  const U = window.U, PAL = U.PAL, F = U.FONT;
  const body = U.frame(host, {
    title: "因果地平:哪个信号离结果最近、离阈值最远、缺席的是哪块拼图",
    sub: "CAUSAL HORIZON · 横轴 = 预期领先月数(左=领先大,右=同步)· 纵带 = 因果层 · 实环 = met · 半环 = partial · 红虚环+? = missing · 点击节点看阈值与证伪",
    src: "六行业深潜研究§7 + 31 行业扫描(读数更新至 2026-08-07)· table_monitoring_dashboard + p12 跨行业信号",
  });

  // lead months parsed from expected_lag(见各信号原文,确定性映射)
  const LAYERS = ["价格", "供给产能", "需求", "政策", "资金情绪", "盈利确认"];
  const F2L = { "price": 0, "forcing价格体系": 0, "产能驱动": 1, "产能情绪": 1, "capacity_contraction": 1,
    "capex链": 2, "需求forcing": 2, "需求": 2, "需求确认": 2, "需求第二曲线": 2, "forcing": 2,
    "policy_commitment": 3, "情绪": 4, "渠道forcing": 4, "crowding_washout": 4,
    "利润确认": 5, "渠道打款确认": 5, "确认族": 5, "盈利广度": 5, "inflection_confirm": 5 };
  const LEAD = { // months;负 = 滞后
    "DRAM合约价环比方向": 4.5, "北美四大云厂capex指引": 4.5, "拥挤度/融资盘": 0,
    "能繁母猪月度存栏": 10, "自繁自养养殖利润": -0.75, "7公斤仔猪价格": 1,
    "飞天茅台批价(原箱)": 9, "头部合同负债同比": -4.5,
    "动力+储能电池月度销量": 0, "碳酸锂现货价(电池级)": 4.5,
    "多晶硅价格(n型复投料周度)": 9, "月度新增装机": 3,
    "季度BD首付款": 18, "CXO在手订单增速": 9,
    "月度乘用车零售同比": 4.5, "经销商综合库存系数": 1.5, "乘用车出口同比": 3,
    "中报预喜率与行业分布": 0,
    "全A盈利增速": 4.5, "沪深300调整性质": 0.75, "政策资金对冲": 0, "外部风险(美伊冲突)": 1,
  };

  const rows = RPT.tables.table_monitoring_dashboard.rows.map(r => ({
    ind: r[0], label: r[1], fam: r[2], cur: r[3], th: r[4], lag: r[5], st: r[6], fals: r[7], src: r[8],
  }));
  // p12 跨行业信号(除预喜率外 4 条,预喜率已在 18 行表中)
  const p12 = RPT.pages.find(p => p.page_id === "p12_monitoring");
  p12.modules.filter(m => m.type === "signal_grid").forEach(g => g.items.forEach(s => {
    if (s.label === "中报预喜率") return;
    rows.push({ ind: "全市场", label: s.label, fam: s.signal_family, cur: s.current_value, th: s.threshold, lag: s.expected_lag, st: s.status, fals: s.falsifier, src: s.source + "(" + s.asof + ")" });
  }));

  const W = 920, H = 540, mL = 78, mR = 26, mT = 30, mB = 44;
  const cv = document.createElement("canvas");
  cv.style.width = "100%"; cv.style.height = "auto"; cv.style.display = "block";
  cv.style.aspectRatio = W + " / " + H;
  body.appendChild(cv);
  const ctx = cv.getContext("2d");
  const hits = [];

  const LMIN = -5, LMAX = 19;
  const xs = lead => mL + (1 - (lead - LMIN) / (LMAX - LMIN)) * (W - mL - mR);
  const layerH = (H - mT - mB) / LAYERS.length;
  const ys = (layer, i, n) => mT + layerH * layer + layerH / 2 + (n > 1 ? (i - (n - 1) / 2) * 26 : 0);

  // group by layer for y deconfliction
  const byLayer = LAYERS.map(() => []);
  rows.forEach(r => byLayer[F2L[r.fam] ?? 2].push(r));
  const pos = [];
  byLayer.forEach((list, L) => {
    list.sort((a, b) => (LEAD[b.label] ?? 3) - (LEAD[a.label] ?? 3));
    list.forEach((r, i) => pos.push({ r, x: xs(LEAD[r.label] ?? 3), y: ys(L, i, list.length) }));
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

    // layer bands
    ctx.font = `700 10px ${F.mono}`; ctx.textAlign = "left";
    LAYERS.forEach((ln, L) => {
      if (L % 2 === 0) { ctx.fillStyle = "rgba(5,28,44,.022)"; ctx.fillRect(mL, mT + layerH * L, W - mL - mR, layerH); }
      ctx.strokeStyle = PAL.lineLo; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(mL, mT + layerH * L); ctx.lineTo(W - mR, mT + layerH * L); ctx.stroke();
      ctx.fillStyle = PAL.inkMd;
      ctx.fillText(ln, 8, mT + layerH * L + layerH / 2 + 3);
    });
    // x axis
    ctx.font = `9px ${F.mono}`; ctx.fillStyle = PAL.inkLo; ctx.textAlign = "center";
    [[18, "领先 18 个月"], [12, "12"], [6, "6"], [3, "3"], [1, "1"], [0, "同步"], [-4.5, "滞后"]].forEach(([v, lab]) => {
      ctx.strokeStyle = PAL.line; ctx.beginPath(); ctx.moveTo(xs(v), H - mB); ctx.lineTo(xs(v), H - mB + 5); ctx.stroke();
      ctx.fillText(lab, xs(v), H - mB + 17);
    });
    ctx.fillText("← 领先结果的时间(月)", mL + 90, H - mB + 32);
    ctx.textAlign = "right"; ctx.fillText("摘自各信号「预期时滞」原文的确定性映射 →", W - mR, H - mB + 32);

    // nodes
    pos.forEach((p, i) => {
      const a = U.clamp(prog * 1.5 - i * 0.03, 0, 1);
      if (a <= 0) return;
      ctx.globalAlpha = a;
      const { r, x, y } = p;
      if (r.st === "met") {
        ctx.beginPath(); ctx.fillStyle = PAL.red;
        ctx.arc(x, y, 5.5, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.strokeStyle = "rgba(34,81,255,.4)"; ctx.lineWidth = 2;
        ctx.arc(x, y, 9, 0, U.TAU); ctx.stroke();
      } else if (r.st === "partial") {
        ctx.beginPath(); ctx.fillStyle = "#fff"; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.6;
        ctx.arc(x, y, 5.5, 0, U.TAU); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2;
        ctx.arc(x, y, 9, -Math.PI / 2, Math.PI / 2, false); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.strokeStyle = PAL.neg; ctx.lineWidth = 1.4; ctx.setLineDash([3, 3]);
        ctx.arc(x, y, 6.5, 0, U.TAU); ctx.stroke(); ctx.setLineDash([]);
        ctx.font = `700 10px ${F.mono}`; ctx.textAlign = "center"; ctx.fillStyle = PAL.neg;
        ctx.fillText("?", x, y + 3.5);
      }
      // label: name + industry (deconflict by side of x center)
      const leftSide = x > W * 0.62;
      ctx.textAlign = leftSide ? "right" : "left";
      const lx = x + (leftSide ? -13 : 13);
      ctx.font = `700 9.8px ${F.serif}`; ctx.fillStyle = PAL.ink;
      ctx.strokeStyle = "#fff"; ctx.lineWidth = 3.5; ctx.lineJoin = "round";
      ctx.strokeText(r.label, lx, y + 1);
      ctx.fillText(r.label, lx, y + 1);
      ctx.font = `8px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
      ctx.strokeText(r.ind + " · " + r.st.toUpperCase(), lx, y + 12);
      ctx.fillText(r.ind + " · " + r.st.toUpperCase(), lx, y + 12);
      ctx.globalAlpha = 1;
      hits.push({ x: x - 12, y: y - 12, w: 24, h: 24, r });
    });
  }

  cv.addEventListener("click", e => {
    const rct = cv.getBoundingClientRect();
    const x = (e.clientX - rct.left) / rct.width * W, y = (e.clientY - rct.top) / rct.width * W;
    const hit = hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    const r = hit.r;
    U.showDrill({
      title: `${r.ind} · ${r.label}`, value: r.st.toUpperCase(),
      sub: `当前值:${r.cur} · 阈值:${r.th} · 预期时滞:${r.lag} · 证伪条件:${r.fals}`,
      source: String(r.src),
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
    const p = U.clamp((ts - t0) / 1400, 0, 1);
    draw(U.REDUCE ? 1 : p);
    if (p < 1 && !U.REDUCE) requestAnimationFrame(anim);
  }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !entered) { entered = true; io.disconnect(); requestAnimationFrame(anim); }
  }), { threshold: 0.12 });
  io.observe(cv);
  if (U.REDUCE) { entered = true; draw(1); }
})();
