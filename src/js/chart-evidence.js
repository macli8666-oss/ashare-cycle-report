// chart-evidence.js — P17 证据仪表盘:全站最硬的 7 个数字挂在仪表盘的语义位上
// 语义位:指针 = 上升象限行业数 · 弧段 = 三群分布 · 中心 = 盈利读数 · 表圈螺丝 = 资金流 · 吊牌 = 预喜率
(() => {
  const host = document.getElementById("evidence-chart");
  if (!host) return;
  const U = window.U, PAL = U.PAL, F = U.FONT;
  const body = U.frame(host, {
    title: "一张仪表盘装下整个市场:三分之一行业在右侧,盈利在加速,杠杆刚出清",
    sub: "EVIDENCE GAUGE · 指针 = 上升象限 10/31 · 弧段 = 12 承压 / 9 临近 / 10 上升 · 中心 = 全 A 盈利 · 螺丝 = 调整周资金流 · 吊牌 = 预喜率 · 每个数字可点",
    src: "K33 · industry_master.csv + K34 · 扫描底稿(10/9/12 象限计数)+ K1/K30/K32(2026-07-16/17/18)",
  });

  const W = 880, H = 520, cx = W / 2, cy = 252, R = 168;
  const cv = document.createElement("canvas");
  cv.style.width = "100%"; cv.style.height = "auto"; cv.style.display = "block";
  cv.style.aspectRatio = W + " / " + H;
  body.appendChild(cv);
  const ctx = cv.getContext("2d");
  const hits = [];

  const a0 = Math.PI * (210 / 180), a1 = -Math.PI / 6;
  const zoneAngle = f => a0 + (a1 - a0) * f;
  // arc spans: 12 承压 (0 → 12/31), 9 临近 (→ 21/31), 10 上升 (→ 1)
  const SPANS = [
    { f0: 0, f1: 12 / 31, lab: "仍承压 · 12 个", col: PAL.inkLo, key: "pressure" },
    { f0: 12 / 31, f1: 21 / 31, lab: "临近上升 · 9 个", col: PAL.inkMd, key: "near" },
    { f0: 21 / 31, f1: 1, lab: "上升象限 · 10 个", col: PAL.red, key: "up" },
  ];
  const DRILLS = {
    needle: { title: "上升周期象限 · 扫描口径", value: "10 / 31 个行业",
      sub: "另有 9 个临近上升(底部观察区)、12 个仍承压;上升周期覆盖约三分之一行业,是结构性的。扫描为简化框架,全部评级「暂定」。",
      source: "K34 · 31 行业四象限阶段定位扫描(2026-07-17)+ K33 · industry_master.csv" },
    center: { title: "全 A 盈利 · 2026Q1 归母净利同比", value: "+5.0~7.9%",
      sub: "较 2025 年报(+0.2~0.8%)明显加速;区间口径上下沿并列;规上制造业利润 +5.0%(2026 年计划报告)交叉印证下沿。",
      source: "K34 · 扫描「市场背景」节 + K12 · 2026 年计划报告(2026-05-07)" },
    pressure: { title: "仍承压 · 12 个行业", value: "12 / 31",
      sub: "盈利承压与出清中段行业:家电、房地产、商贸零售、建筑装饰等;双低(营收低、股价低)为主。", source: "K33 · industry_master.csv(2026-07-17)" },
    near: { title: "临近上升 · 9 个行业", value: "9 / 31",
      sub: "底部观察区:农林牧渔(猪)、食品饮料(白酒)、汽车、光伏子链等——仅有政策底或单证据族信号。", source: "K33 · industry_master.csv(2026-07-17)" },
    up: { title: "上升象限 · 10 个行业", value: "10 / 31",
      sub: "双证据族确认:电子、通信(光模块/CPO)、电新(锂电/储能);确认/暂定偏确认:军工、非银、机械、计算机、传媒、医药。", source: "K33 · industry_master.csv(2026-07-17)" },
    screw1: { title: "沪深 300 周跌幅(7/13-7/17)", value: "-5.4%",
      sub: "六年半最大周跌幅;融资余额单周净偿还约 800 亿元(7/14 单日 -347 亿)。JPM 定性:拥挤交易出清而非基本面系统性恶化。", source: "K30 · 中证金牛座(2026-07-18)+ K8 · JPM(2026-07-17)" },
    screw2: { title: "宽基 ETF 四日净流入", value: "约 1200 亿元",
      sub: "护盘资金进场,与融资偿还形成对冲;「护盘资金」信号状态 = met。", source: "K32 · 同花顺(2026-07-17)" },
    tag: { title: "中报预告总预喜率", value: "43.9%",
      sub: "1678 家披露(7-15);2025 年同期 42.8%,五年中枢约 46%;预喜集中非银/有色/石化/电子/化工——盈利扩散但强度平庸。", source: "K1 · 大众证券报(2026-07-16)" },
  };

  function needleAngle() { return zoneAngle(21 / 31 + (1 - 21 / 31) * 0.5); } // 指向上升区中点

  function draw(prog) {
    const rct = cv.getBoundingClientRect();
    if (rct.width < 10) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(rct.width * dpr);
    cv.height = Math.round(rct.width * (H / W) * dpr);
    ctx.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0);
    ctx.clearRect(0, 0, W, H);
    hits.length = 0;
    const P = n => U.clamp((prog - n) * 2.2, 0, 1);

    // ground shadow
    ctx.beginPath(); ctx.fillStyle = "rgba(5,28,44,.05)";
    ctx.ellipse(cx, cy + R + 58, R * 0.9, 14, 0, 0, U.TAU); ctx.fill();

    // bezel (double ring)
    const pB = P(0);
    if (pB > 0) {
      ctx.globalAlpha = pB;
      ctx.beginPath(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.2;
      ctx.arc(cx, cy, R + 10, 0, U.TAU * pB); ctx.stroke();
      ctx.beginPath(); ctx.strokeStyle = PAL.line; ctx.lineWidth = 1;
      ctx.arc(cx, cy, R + 16, 0, U.TAU); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    // five-zone tick marks + arc spans (sweep with pA)
    const pA = P(0.12);
    if (pA > 0) {
      SPANS.forEach((sp, i) => {
        const sweep = U.clamp(pA * 1.4 - i * 0.25, 0, 1);
        if (sweep <= 0) return;
        ctx.beginPath(); ctx.strokeStyle = sp.col; ctx.lineWidth = 13;
        ctx.globalAlpha = 0.9;
        const ea = zoneAngle(sp.f0 + (sp.f1 - sp.f0) * U.smooth(sweep));
        ctx.arc(cx, cy, R - 8, zoneAngle(sp.f0) + 0.02, ea, false);
        ctx.stroke();
        ctx.globalAlpha = 1;
      });
      // zone labels (after arcs)
      if (pA > 0.75) {
        ctx.globalAlpha = (pA - 0.75) * 4;
        SPANS.forEach(sp => {
          const am = zoneAngle((sp.f0 + sp.f1) / 2);
          const lx = cx + Math.cos(am) * (R - 34), ly = cy + Math.sin(am) * (R - 34);
          ctx.font = `700 10px ${F.mono}`; ctx.textAlign = "center"; ctx.fillStyle = sp.col;
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 3.5;
          ctx.strokeText(sp.lab, lx, ly); ctx.fillText(sp.lab, lx, ly);
          hits.push({ x: lx - 52, y: ly - 10, w: 104, h: 20, k: sp.key });
        });
        ctx.globalAlpha = 1;
      }
    }
    // dial minor ticks
    ctx.strokeStyle = PAL.inkLo; ctx.lineWidth = 1;
    for (let i = 0; i <= 30; i++) {
      const a = zoneAngle(i / 30);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (R - 22), cy + Math.sin(a) * (R - 22));
      ctx.lineTo(cx + Math.cos(a) * (R - 27), cy + Math.sin(a) * (R - 27));
      ctx.stroke();
    }
    // five stage names on dial
    ctx.font = `8.5px ${F.mono}`; ctx.fillStyle = PAL.inkLo; ctx.textAlign = "center";
    ["盈利承压", "出清中", "底部观察", "复苏初期", "再扩张"].forEach((s, i) => {
      const a = zoneAngle((i + 0.5) / 5);
      ctx.fillText(s, cx + Math.cos(a) * (R + 30), cy + Math.sin(a) * (R + 30) + 3);
    });

    // needle: sweeps to 上升区中点;label = 10/31
    const pN = P(0.34);
    if (pN > 0) {
      const a = a0 + (needleAngle() - a0) * U.smooth(pN);
      ctx.beginPath(); ctx.strokeStyle = PAL.red; ctx.lineWidth = 3.4; ctx.lineCap = "round";
      ctx.moveTo(cx - Math.cos(a) * 16, cy - Math.sin(a) * 16);
      ctx.lineTo(cx + Math.cos(a) * (R - 56), cy + Math.sin(a) * (R - 56)); // stop short of the zone-label ring
      ctx.stroke();
      ctx.beginPath(); ctx.fillStyle = PAL.ink;
      ctx.arc(cx, cy, 7, 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
      ctx.arc(cx, cy, 7, 0, U.TAU); ctx.stroke();
      if (pN > 0.9) {
        const tx = cx + Math.cos(a) * (R + 52), ty = cy + Math.sin(a) * (R + 52);
        ctx.font = `700 20px ${F.mono}`; ctx.textAlign = "center"; ctx.fillStyle = PAL.red;
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 4.5;
        ctx.strokeText("10/31", tx, ty + 2); ctx.fillText("10/31", tx, ty + 2);
        ctx.font = `9px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
        ctx.fillText("行业在上升象限", tx, ty + 16);
        hits.push({ x: tx - 46, y: ty - 16, w: 92, h: 36, k: "needle" });
      }
    }
    // center readout
    const pC = P(0.5);
    if (pC > 0) {
      ctx.globalAlpha = pC;
      ctx.font = `9px ${F.mono}`; ctx.textAlign = "center"; ctx.fillStyle = PAL.inkLo;
      ctx.fillText("全 A 盈利 · 2026Q1", cx, cy + 44);
      ctx.font = `700 21px ${F.mono}`; ctx.fillStyle = PAL.ink;
      ctx.fillText("+5.0~7.9%", cx, cy + 68);
      ctx.font = `8.5px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
      ctx.fillText("2025 年报 +0.2~0.8% → 明显加速", cx, cy + 84);
      ctx.globalAlpha = 1;
      hits.push({ x: cx - 72, y: cy + 34, w: 144, h: 56, k: "center" });
    }
    // bezel screws (2 with stats, 2 plain)
    const pS = P(0.62);
    if (pS > 0) {
      const screws = [
        { a: Math.PI * 1.25, k: "screw1", v: "-5.4%", l: "沪深300 周跌" },
        { a: Math.PI * 1.75, k: null },
        { a: -Math.PI * 0.25, k: "screw2", v: "+1200亿", l: "ETF 四日净流入" },
        { a: -Math.PI * 0.75, k: null },
      ];
      screws.forEach((s, i) => {
        const a2 = U.clamp(pS * 1.6 - i * 0.12, 0, 1);
        if (a2 <= 0) return;
        ctx.globalAlpha = a2;
        const sx = cx + Math.cos(s.a) * (R + 13), sy = cy + Math.sin(s.a) * (R + 13);
        const g = ctx.createRadialGradient(sx - 2, sy - 2, 1, sx, sy, 7);
        g.addColorStop(0, "#fff"); g.addColorStop(1, PAL.inkMd);
        ctx.beginPath(); ctx.fillStyle = g;
        ctx.arc(sx, sy, 6, 0, U.TAU); ctx.fill();
        ctx.beginPath(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1;
        ctx.moveTo(sx - 3.4, sy); ctx.lineTo(sx + 3.4, sy); ctx.stroke();
        if (s.k) {
          const out = s.a > -Math.PI / 2 && s.a < Math.PI / 2 ? 1 : (Math.cos(s.a) > 0 ? 1 : -1);
          ctx.textAlign = out > 0 ? "left" : "right";
          ctx.font = `700 12.5px ${F.mono}`; ctx.fillStyle = s.k === "screw1" ? PAL.neg : PAL.red;
          const lx = sx + out * 14;
          ctx.strokeStyle = "#fff"; ctx.lineWidth = 3.5;
          ctx.strokeText(s.v, lx, sy - 1); ctx.fillText(s.v, lx, sy - 1);
          ctx.font = `8.5px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
          ctx.fillText(s.l, lx, sy + 12);
          hits.push({ x: lx + (out > 0 ? -4 : -88), y: sy - 12, w: 92, h: 28, k: s.k });
        }
        ctx.globalAlpha = 1;
      });
    }
    // hanging tag: 预喜率
    const pT = P(0.76);
    if (pT > 0) {
      ctx.globalAlpha = pT;
      const tx = cx + 118, ty = cy + R + 34;
      ctx.strokeStyle = PAL.inkMd; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx + 60, cy + R - 22); ctx.quadraticCurveTo(cx + 100, cy + R + 4, tx, ty - 16); ctx.stroke();
      ctx.beginPath(); ctx.fillStyle = PAL.inkMd; ctx.arc(tx, ty - 16, 2.4, 0, U.TAU); ctx.fill();
      const tw = 218, th = 40;
      ctx.fillStyle = "#fff"; ctx.strokeStyle = PAL.ink; ctx.lineWidth = 1.2;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(0.03);
      ctx.fillRect(-tw / 2, 0, tw, th); ctx.strokeRect(-tw / 2, 0, tw, th);
      ctx.restore();
      ctx.font = `9px ${F.mono}`; ctx.textAlign = "left"; ctx.fillStyle = PAL.inkLo;
      ctx.fillText("盈利广度 · 中报预告", tx - tw / 2 + 8, ty + 15);
      ctx.font = `700 13px ${F.mono}`; ctx.fillStyle = PAL.ink;
      ctx.fillText("预喜率 43.9%(五年中枢约 46%)", tx - tw / 2 + 8, ty + 31);
      ctx.globalAlpha = 1;
      hits.push({ x: tx - tw / 2, y: ty, w: tw, h: th, k: "tag" });
    }
    // forcing gears (mechanism, no numbers): 库存·价格·产能·政策
    const pG = P(0.86);
    if (pG > 0) {
      ctx.globalAlpha = pG * 0.85;
      const gy = cy + R + 62;
      ["库存", "价格", "产能", "政策"].forEach((lab, i) => {
        const gx = cx - 150 + i * 100;
        ctx.save(); ctx.translate(gx, gy); ctx.rotate(prog * 0 + i * 0.4);
        ctx.strokeStyle = PAL.inkLo; ctx.lineWidth = 1.4;
        for (let t = 0; t < 8; t++) {
          const a = t / 8 * U.TAU;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 9, Math.sin(a) * 9);
          ctx.lineTo(Math.cos(a) * 13, Math.sin(a) * 13);
          ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, 0, 9, 0, U.TAU); ctx.stroke();
        ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, U.TAU); ctx.stroke();
        ctx.restore();
        ctx.font = `8.5px ${F.mono}`; ctx.textAlign = "center"; ctx.fillStyle = PAL.inkLo;
        ctx.fillText(lab, gx, gy + 24);
      });
      ctx.font = `8.5px ${F.mono}`; ctx.fillText("forcing 变量:齿轮组(机制示意,不载数字)", cx, gy + 40);
      ctx.globalAlpha = 1;
    }
  }

  cv.addEventListener("click", e => {
    const rct = cv.getBoundingClientRect();
    const x = (e.clientX - rct.left) / rct.width * W, y = (e.clientY - rct.top) / rct.width * W;
    const hit = hits.slice().reverse().find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    const d = DRILLS[hit.k];
    U.showDrill({ ...d, x: e.clientX, y: e.clientY });
  });
  cv.addEventListener("mousemove", e => {
    const rct = cv.getBoundingClientRect();
    const x = (e.clientX - rct.left) / rct.width * W, y = (e.clientY - rct.top) / rct.width * W;
    cv.style.cursor = hits.some(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) ? "pointer" : "default";
  });

  let entered = false, t0 = null;
  function anim(ts) {
    if (t0 == null) t0 = ts;
    const p = U.clamp((ts - t0) / 2100, 0, 1);
    draw(U.REDUCE ? 1 : p);
    if (p < 1 && !U.REDUCE) requestAnimationFrame(anim);
  }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !entered) { entered = true; io.disconnect(); requestAnimationFrame(anim); }
  }), { threshold: 0.2 });
  io.observe(cv);
  if (U.REDUCE) { entered = true; draw(1); }
})();
