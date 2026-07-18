// dashboard.js — P14 常驻右栏:随滚动切换的周期仪表盘
// 组件:窗口徽章+标题 / 五段相位条 / 迷你仪表盘(真实阶段针)/ 半调点阵曲线(真实指数 3 年)
// 四个读数格 / 六行业队列格 —— 全部可钻取
(() => {
  const rail = document.getElementById("dash-rail");
  const cv = document.getElementById("dash-canvas");
  if (!rail || !cv || !window.RPT) return;
  const U = window.U, PAL = U.PAL, F = U.FONT;
  const ctx = cv.getContext("2d");
  const RW = 460;
  let hits = [];
  let curWin = null;

  const STAGES = ["盈利承压", "出清中", "底部观察", "复苏初期", "再扩张"];
  const IND = Object.fromEntries(RPT.industries.map(d => [d.name, d]));

  // window configs — every number traces to RPT
  const WINS = {
    exec: { no: "§0", t: "K 型地图 · 总览", zone: null, curve: "chart_sl_801080", curLab: "AI 算力链指数 · 本轮主线",
      stats: [["全 A Q1 净利", "+5.0~7.9%"], ["上升象限", "10/31"], ["沪深300 周", "-5.4%"], ["ETF 四日", "+1200亿"]] },
    method: { no: "§1", t: "方法论 · 闸门与纪律", zone: null, curve: "chart_sl_801080", curLab: "AI 算力链指数 · 参照系",
      stats: [["选定窗口", "26"], ["明确拒绝", "6"], ["事后锚", "5"], ["队列台账", "41 条"]] },
    map: { no: "§2", t: "31 行业阶段地图", zone: null, curve: "chart_sl_801080", curLab: "AI 算力链指数 · 参照系",
      stats: [["上升象限", "10"], ["临近上升", "9"], ["仍承压", "12"], ["扫描口径", "暂定"]] },
    ai: { no: "§3", t: "AI 算力链 · 再扩张", zone: 4.0, ind: "电子", curve: "chart_sl_801080", curLab: "电子指数 · 近三年",
      stats: [["DRAM Q1 环比", "+90~95%"], ["云厂 capex", "7950亿$"], ["拥挤度", "-1.5σ"], ["电子周跌幅", "-18.8%"]] },
    hog: { no: "§4", t: "猪周期 · 底部观察", zone: 1.95, ind: "农林牧渔", curve: "chart_sl_801010", curLab: "农牧指数 · 近三年",
      stats: [["能繁母猪", "3904万头"], ["距红线", "154万头"], ["均价", "11.6元/kg"], ["6 月去化", "-39万头"]] },
    baijiu: { no: "§5", t: "白酒 · 底部观察", zone: 1.8, ind: "食品饮料", curve: "chart_sl_801120", curLab: "食品饮料指数 · 近三年",
      stats: [["一批价", "1490-1530"], ["Q1 收现", "-18.88%"], ["茅台 PE 分位", "3.1%"], ["预收", "-18.9%"]] },
    ne: { no: "§6", t: "新能源 · 双链剪刀差", zone: 3.0, ind: "电力设备", curve: "chart_sl_801730", curLab: "电力设备指数 · 近三年",
      stats: [["Q2 排产", "342.5GWh"], ["碳酸锂", "6.6-6.7万"], ["多晶硅", "3.5万/吨"], ["组件", "0.71-0.75"]] },
    pharma: { no: "§7", t: "创新药 · 右侧确认", zone: 3.6, ind: "医药生物", curve: "chart_sl_801150", curLab: "医药生物指数 · 近三年",
      stats: [["H1 BD 出海", "608亿$"], ["商保初审", "557+54"], ["药明订单", "597.7亿"], ["Fed 利率", "3.50-3.75%"]] },
    auto: { no: "§8", t: "汽车 · 最深段", zone: 2.0, ind: "汽车", curve: "chart_sl_801880", curLab: "汽车指数 · 近三年",
      stats: [["6 月零售", "-23.2%"], ["库存系数", "1.58"], ["降价款数", "113 款"], ["6 月出口", "+82.3%"]] },
    company: { no: "§9", t: "公司层 · 估值撕裂", zone: null, curve: "chart_sl_801080", curLab: "电子指数 · 近三年",
      stats: [["AI 链分位", "61.8-97.5%"], ["茅台", "3.1%"], ["五粮液", "42.1%"], ["失真警示", "兆易 65.8%"]] },
    monitor: { no: "§10", t: "监测信号 · 全台账", zone: null, curve: "chart_sl_801080", curLab: "电子指数 · 参照系",
      stats: [["met", "6"], ["partial", "10"], ["missing", "2"], ["跨行业", "+4"]] },
    analogs: { no: "§11", t: "类比与队列", zone: null, curve: "chart_sl_801010", curLab: "农牧指数 · 出清参照",
      stats: [["选定窗口", "26"], ["事后锚", "5"], ["拒绝", "6"], ["失败者", "17 条"]] },
    limits: { no: "§12", t: "局限性 · 全披露", zone: null, curve: "chart_sl_801080", curLab: "电子指数 · 参照系",
      stats: [["数据缺口", "11 处"], ["口径冲突", "并列"], ["叙事偏倚", "1 周后复核"], ["买卖建议", "不提供"]] },
  };

  function curve3y(cid) {
    const s = RPT.stocklines[cid].series;
    const cut = s.filter(r => r[0] >= "2023-07-01");
    const n = 72, out = [];
    for (let i = 0; i < n; i++) out.push(cut[Math.floor(i / n * cut.length)][1]);
    return out;
  }

  const a0 = Math.PI * (210 / 180), a1 = -Math.PI / 6;
  const zA = z => a0 + (a1 - a0) * (z / 4);
  const ZCOL = [PAL.inkLo, PAL.inkMd, PAL.ink, PAL.blueSoft, PAL.red];

  function draw() {
    const rct = cv.getBoundingClientRect();
    if (rct.width < 10) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(rct.width * dpr);
    cv.height = Math.round(rct.height * dpr);
    ctx.setTransform(cv.width / RW, 0, 0, cv.width / RW, 0, 0);
    const VH = rct.height / (rct.width / RW); // virtual height
    ctx.clearRect(0, 0, RW, VH);
    hits = [];
    const W = WINS[curWin] || WINS.exec;
    let y = 34;

    // ① badge + title
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.5;
    ctx.strokeRect(26, y, 44, 22);
    ctx.font = `700 12px ${F.mono}`; ctx.textAlign = "center"; ctx.fillStyle = PAL.ink;
    ctx.fillText(W.no, 48, y + 15);
    ctx.font = `700 16px ${F.serif}`; ctx.textAlign = "left";
    ctx.fillText(W.t, 82, y + 16);
    ctx.font = `8.5px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
    ctx.fillText("结论先行 · 随章节切换", 82, y + 31);
    y += 48;

    // ② five-segment phase bar
    const segW = (RW - 52) / 5;
    STAGES.forEach((s, i) => {
      const on = W.zone != null && Math.round(U.clamp(W.zone, 0, 4)) === i;
      ctx.fillStyle = on ? PAL.red : (i / 4 <= (W.zone ?? -1) ? "rgba(34,81,255,.25)" : "rgba(5,28,44,.07)");
      if (W.zone == null) ctx.fillStyle = i >= 3 ? "rgba(34,81,255,.3)" : "rgba(5,28,44,.07)";
      ctx.fillRect(26 + i * segW + 1, y, segW - 2, 7);
      ctx.font = `7.8px ${F.mono}`; ctx.textAlign = "center";
      ctx.fillStyle = on ? PAL.red : PAL.inkLo;
      ctx.fillText(s, 26 + i * segW + segW / 2, y + 17);
    });
    if (W.zone != null) {
      ctx.beginPath(); ctx.fillStyle = PAL.red;
      const px = 26 + (W.zone + 0.5) / 5 * (RW - 52);
      ctx.moveTo(px, y - 6); ctx.lineTo(px - 4, y - 12); ctx.lineTo(px + 4, y - 12); ctx.closePath(); ctx.fill();
    }
    y += 34;

    // ③ mini gauge
    const gx = 100, gy = y + 74, gr = 62;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath(); ctx.strokeStyle = ZCOL[i]; ctx.lineWidth = 6;
      ctx.arc(gx, gy, gr, zA(i) + 0.035, zA(i + 1) - 0.035, false); ctx.stroke();
    }
    ctx.beginPath(); ctx.strokeStyle = PAL.line; ctx.lineWidth = 1;
    ctx.arc(gx, gy, gr + 6, 0, U.TAU); ctx.stroke();
    if (W.zone != null) {
      const a = zA(W.zone);
      ctx.beginPath(); ctx.strokeStyle = /确认/.test((IND[W.ind] || {}).conf || "") ? PAL.red : PAL.ink;
      ctx.lineWidth = 2.6; ctx.lineCap = "round";
      ctx.moveTo(gx - Math.cos(a) * 10, gy - Math.sin(a) * 10);
      ctx.lineTo(gx + Math.cos(a) * (gr - 10), gy + Math.sin(a) * (gr - 10));
      ctx.stroke();
      ctx.beginPath(); ctx.fillStyle = PAL.ink; ctx.arc(gx, gy, 4, 0, U.TAU); ctx.fill();
      ctx.font = `700 11px ${F.serif}`; ctx.textAlign = "center"; ctx.fillStyle = PAL.ink;
      ctx.fillText(W.ind, gx, gy + gr + 26);
      ctx.font = `8.5px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
      ctx.fillText((IND[W.ind] || {}).conf || "", gx, gy + gr + 39);
      hits.push({ x: gx - gr - 10, y: gy - gr - 10, w: gr * 2 + 20, h: gr * 2 + 46, drill: {
        title: W.ind + " · 阶段判定", value: STAGES[Math.round(U.clamp(W.zone, 0, 4))],
        sub: "判定原文:" + ((IND[W.ind] || {}).stage_label || "") + " · 与 §2 仪表盘墙同源",
        source: "K33 · industry_master.csv(2026-07-17)" } });
    } else {
      // market gauge: needle just inside the rising zone (~21/31 of the sweep)
      const a = zA(2.71);
      ctx.beginPath(); ctx.strokeStyle = PAL.red; ctx.lineWidth = 2.6; ctx.lineCap = "round";
      ctx.moveTo(gx - Math.cos(a) * 10, gy - Math.sin(a) * 10);
      ctx.lineTo(gx + Math.cos(a) * (gr - 10), gy + Math.sin(a) * (gr - 10));
      ctx.stroke();
      ctx.beginPath(); ctx.fillStyle = PAL.ink; ctx.arc(gx, gy, 4, 0, U.TAU); ctx.fill();
      ctx.font = `700 13px ${F.mono}`; ctx.textAlign = "center"; ctx.fillStyle = PAL.red;
      ctx.fillText("10/31", gx, gy + 14);
      ctx.font = `8.5px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
      ctx.fillText("市场整体 · 上升象限占比", gx, gy + gr + 26);
      hits.push({ x: gx - gr - 10, y: gy - gr - 10, w: gr * 2 + 20, h: gr * 2 + 46, drill: {
        title: "市场整体读数", value: "10/31 上升 · 9 临近 · 12 承压",
        sub: "扫描框架「暂定」口径;核心结论仅依赖六个深潜行业。", source: "K34 · 31 行业扫描(2026-07-17)" } });
    }

    // ④ halftone dot-matrix curve (right of gauge)
    const cx0 = 208, cw = RW - cx0 - 26, ch = 118, cy0 = y + 10;
    const data = curve3y(W.curve);
    let mn = Math.min(...data), mx = Math.max(...data);
    const cxs = i => cx0 + i / (data.length - 1) * cw;
    const cys = v => cy0 + (1 - (v - mn) / (mx - mn)) * (ch - 26);
    // halftone dots under curve
    ctx.fillStyle = PAL.red;
    for (let gx2 = 0; gx2 < cw; gx2 += 7) {
      const i = Math.min(data.length - 1, Math.floor(gx2 / cw * (data.length - 1)));
      const topY = cys(data[i]);
      for (let yy = cy0 + ch - 16; yy > topY; yy -= 7) {
        const d = (yy - topY) / (cy0 + ch - 16 - topY);
        ctx.globalAlpha = 0.05 + (1 - d) * 0.22;
        ctx.beginPath(); ctx.arc(cx0 + gx2, yy, 1.5, 0, U.TAU); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    // curve line
    ctx.beginPath();
    data.forEach((v, i) => i ? ctx.lineTo(cxs(i), cys(v)) : ctx.moveTo(cxs(i), cys(v)));
    ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.6; ctx.stroke();
    // end pulse + readout
    const ev = data[data.length - 1];
    ctx.beginPath(); ctx.fillStyle = PAL.red; ctx.arc(cxs(data.length - 1), cys(ev), 3.4, 0, U.TAU); ctx.fill();
    ctx.font = `700 13px ${F.mono}`; ctx.textAlign = "right"; ctx.fillStyle = PAL.red;
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
    const rv = RPT.stocklines[W.curve].series.slice(-1)[0][1].toLocaleString("en-US", { maximumFractionDigits: 0 });
    ctx.strokeText(rv, cx0 + cw, cy0 + 14); ctx.fillText(rv, cx0 + cw, cy0 + 14);
    ctx.font = `8px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
    ctx.fillText(W.curLab + " · 2026-07-17", cx0 + cw, cy0 + 26);
    hits.push({ x: cx0, y: cy0, w: cw, h: ch, drill: {
      title: W.curLab, value: rv,
      sub: "近三年日线半调点阵(72 点重采样);完整 12 年序列与事件见正文 stockline 图。",
      source: "K35 · Wind 长周期日线(2014-2026)" } });
    y += 158;

    // ⑤ four stat blocks
    const bw = (RW - 52 - 12) / 2;
    W.stats.forEach((s, i) => {
      const bx = 26 + (i % 2) * (bw + 12), by = y + Math.floor(i / 2) * 62;
      ctx.strokeStyle = PAL.lineLo; ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, 52);
      ctx.fillStyle = i === 0 ? "rgba(34,81,255,.05)" : "transparent";
      if (i === 0) ctx.fillRect(bx, by, bw, 52);
      ctx.font = `700 15px ${F.mono}`; ctx.textAlign = "left"; ctx.fillStyle = PAL.ink;
      ctx.fillText(s[1], bx + 10, by + 24);
      ctx.font = `8.5px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
      ctx.fillText(s[0], bx + 10, by + 40);
      hits.push({ x: bx, y: by, w: bw, h: 52, drill: {
        title: W.t + " · " + s[0], value: s[1],
        sub: "该读数的完整口径与证伪条件见正文对应章节与 §10 监测台账。",
        source: "cycle_report.json(2026-07-17/18)· 逐章溯源" } });
    });
    y += 134;

    // ⑥ six-industry cohort cells
    ctx.font = `9px ${F.mono}`; ctx.textAlign = "left"; ctx.fillStyle = PAL.inkLo;
    ctx.fillText("六深潜行业 · 阶段速览(点击跳转)", 26, y + 6);
    const cells = [
      ["AI 算力", "ai", 4.0], ["猪周期", "hog", 1.95], ["白酒", "baijiu", 1.8],
      ["新能源", "ne", 3.0], ["创新药", "pharma", 3.6], ["汽车", "auto", 2.0],
    ];
    const cw2 = (RW - 52 - 10) / 3;
    cells.forEach((c, i) => {
      const bx = 26 + (i % 3) * (cw2 + 5), by = y + 14 + Math.floor(i / 3) * 56;
      const on = curWin === c[1];
      ctx.strokeStyle = on ? PAL.red : PAL.lineLo; ctx.lineWidth = on ? 1.6 : 1;
      ctx.strokeRect(bx, by, cw2, 46);
      // mini zone dots
      for (let z = 0; z < 5; z++) {
        ctx.beginPath();
        ctx.fillStyle = Math.round(c[2]) === z ? (z >= 3 ? PAL.red : PAL.ink) : "rgba(5,28,44,.12)";
        ctx.arc(bx + 12 + z * 11, by + 13, 3, 0, U.TAU); ctx.fill();
      }
      ctx.font = `700 10.5px ${F.serif}`; ctx.textAlign = "left"; ctx.fillStyle = PAL.ink;
      ctx.fillText(c[0], bx + 10, by + 34);
      ctx.font = `7.5px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
      ctx.textAlign = "right";
      ctx.fillText(STAGES[Math.round(c[2])], bx + cw2 - 6, by + 16);
      ctx.textAlign = "left";
      hits.push({ x: bx, y: by, w: cw2, h: 46, goto: "#sec-" + c[1] });
    });
    y += 132;

    // footer
    ctx.font = `7.5px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
    ctx.fillText("数据截至 2026-07-17 · 不提供买卖建议 · 点击任意元素钻取", 26, Math.min(y + 12, VH - 12));
  }

  // current section watcher
  const secs = [...document.querySelectorAll("main section[data-win]")];
  function onScroll() {
    let w = "exec";
    for (const s of secs) if (s.getBoundingClientRect().top < window.innerHeight * 0.4) w = s.dataset.win;
    if (w !== curWin) { curWin = w; draw(); }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", draw);
  curWin = "exec";

  cv.addEventListener("click", e => {
    const rct = cv.getBoundingClientRect();
    const x = (e.clientX - rct.left) / rct.width * RW, y = (e.clientY - rct.top) / rct.width * RW;
    const hit = hits.slice().reverse().find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    if (hit.goto) { const t = document.querySelector(hit.goto); if (t) t.scrollIntoView({ behavior: U.REDUCE ? "auto" : "smooth" }); return; }
    U.showDrill({ ...hit.drill, x: e.clientX, y: e.clientY });
  });
  cv.addEventListener("mousemove", e => {
    const rct = cv.getBoundingClientRect();
    const x = (e.clientX - rct.left) / rct.width * RW, y = (e.clientY - rct.top) / rct.width * RW;
    cv.style.cursor = hits.some(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) ? "pointer" : "crosshair";
  });

  // initial draw after fonts ready (canvas CJK metrics)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { draw(); onScroll(); });
  else { draw(); onScroll(); }
})();
