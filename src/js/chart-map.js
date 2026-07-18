// chart-map.js — 31 行业阶段地图:仪表盘墙(hero)
// 结构变量:阶段(指针角度)× YTD(外条)× Q1营收增速(中心读数)× 置信度(针色)
(() => {
  const host = document.getElementById("map-chart");
  if (!host || !window.RPT) return;
  const U = window.U, PAL = U.PAL, F = U.FONT;
  const body = U.frame(host, {
    title: "10 个行业的指针已摆进上升象限,10 个贴着底部观察区——上升周期是结构性的",
    sub: "31 GAUGES · 指针 = 五阶段判定 · 中心数 = 2026Q1 营收同比 · 底条 = YTD 涨跌幅 · 点击仪表盘进入对应深潜章节/档案卡",
    src: "K33 · industry_master.csv(申万/Wind,2026-07-17 收盘)+ 31 行业阶段扫描底稿(P1)",
  });

  const ZONES = ["盈利承压", "出清中", "底部观察", "复苏初期", "再扩张"];
  const ZCOL = [PAL.inkLo, PAL.inkMd, PAL.ink, PAL.blueSoft, PAL.red];

  const W = 920, COLS = 6, ROWS = 6, CW = W / COLS, CH = 152, H = CH * ROWS + 34;
  const cv = document.createElement("canvas");
  cv.style.width = "100%"; cv.style.height = "auto"; cv.style.display = "block";
  cv.style.aspectRatio = W + " / " + H;
  body.appendChild(cv);
  const { fit, ctx } = U.bindCanvas(cv);

  const hits = [];
  let t0 = null, raf = 0, entered = false;

  // gauge geometry: sweep from 210° to -30° (240°)
  const a0 = Math.PI * (210 / 180), a1 = -Math.PI / 6;
  const zoneAngle = z => a0 + (a1 - a0) * (z / 4);

  function drawGauge(cx, cy, r, ind, prog) {
    // dial arc zones
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.strokeStyle = ZCOL[i];
      ctx.globalAlpha = ind.zone == null ? 0.25 : 0.9;
      ctx.lineWidth = 4.5;
      ctx.setLineDash(ind.zone == null ? [3, 4] : []);
      ctx.arc(cx, cy, r, zoneAngle(i) + 0.035, zoneAngle(i + 1) - 0.035, false);
      ctx.stroke();
    }
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    // bezel
    ctx.beginPath(); ctx.strokeStyle = PAL.line; ctx.lineWidth = 1;
    ctx.arc(cx, cy, r + 4.5, 0, U.TAU); ctx.stroke();
    // ticks at zone boundaries
    ctx.strokeStyle = PAL.inkLo; ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const a = zoneAngle(Math.min(i, 5) === 5 ? 4 : i) + (i === 5 ? 0 : 0);
      const aa = i === 5 ? a1 : zoneAngle(i);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(aa) * (r + 1.5), cy + Math.sin(aa) * (r + 1.5));
      ctx.lineTo(cx + Math.cos(aa) * (r + 7.5), cy + Math.sin(aa) * (r + 7.5));
      ctx.stroke();
    }
    if (ind.zone != null) {
      // needle (animated sweep)
      const target = zoneAngle(U.clamp(ind.zone, 0, 4));
      const a = a0 + (target - a0) * U.smooth(prog);
      const hot = /确认/.test(ind.conf);
      ctx.beginPath();
      ctx.strokeStyle = hot ? PAL.red : PAL.ink;
      ctx.lineWidth = hot ? 2.4 : 1.8;
      ctx.lineCap = "round";
      ctx.moveTo(cx - Math.cos(a) * 7, cy - Math.sin(a) * 7);
      ctx.lineTo(cx + Math.cos(a) * (r - 8), cy + Math.sin(a) * (r - 8));
      ctx.stroke();
      ctx.beginPath(); ctx.fillStyle = hot ? PAL.red : PAL.ink;
      ctx.arc(cx, cy, 2.6, 0, U.TAU); ctx.fill();
    } else {
      // 不评级:hollow center, no needle
      ctx.beginPath(); ctx.strokeStyle = PAL.inkLo; ctx.setLineDash([2, 3]); ctx.lineWidth = 1.2;
      ctx.arc(cx, cy, 3.2, 0, U.TAU); ctx.stroke(); ctx.setLineDash([]);
    }
    // center readout: Q1 rev
    ctx.textAlign = "center";
    ctx.font = `700 10px ${F.mono}`;
    const rv = ind.rev_q1;
    ctx.fillStyle = rv == null ? PAL.inkLo : (rv < 0 ? PAL.neg : PAL.ink);
    ctx.fillText(rv == null ? "—" : (rv > 0 ? "+" : "") + rv.toFixed(0) + "%", cx, cy + r * 0.52);
    // name + conf (A 层深潜 = 实心粗体;B 层档案 = 中灰;其余 = 浅灰)
    ctx.font = (ind.layer === "A" ? `700 11px ${F.serif}` : `600 11px ${F.serif}`);
    ctx.fillStyle = ind.layer === "A" ? PAL.ink : ind.layer === "B" ? PAL.inkMd : PAL.inkLo;
    ctx.fillText(ind.name, cx, cy + r + 17);
    ctx.font = `9px ${F.mono}`;
    ctx.fillStyle = /确认/.test(ind.conf) ? PAL.red : PAL.inkLo;
    ctx.fillText(ind.conf, cx, cy + r + 29);
    // YTD bar
    const bw = 52, bx = cx - bw / 2, by = cy + r + 34;
    ctx.fillStyle = PAL.lineLo; ctx.fillRect(bx, by, bw, 3);
    const yv = U.clamp(ind.ytd / 40, -1, 1);
    ctx.fillStyle = ind.ytd < 0 ? PAL.neg : PAL.red;
    if (yv >= 0) ctx.fillRect(cx, by, yv * (bw / 2), 3);
    else ctx.fillRect(cx + yv * (bw / 2), by, -yv * (bw / 2), 3);
  }

  function draw(prog) {
    const rct = cv.getBoundingClientRect();
    if (rct.width < 10) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(rct.width * dpr);
    cv.height = Math.round(rct.width * (H / W) * dpr);
    const s = cv.width / W;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    ctx.clearRect(0, 0, W, H);
    hits.length = 0;
    RPT.industries.forEach((ind, i) => {
      const col = i % COLS, row = (i / COLS) | 0;
      const cx = col * CW + CW / 2, cy = row * CH + 52, r = 34;
      const appear = U.clamp(prog * 1.6 - i * 0.03, 0, 1);
      if (appear <= 0) return;
      ctx.globalAlpha = appear;
      drawGauge(cx, cy, r, ind, appear);
      ctx.globalAlpha = 1;
      hits.push({ x: cx - CW / 2 + 6, y: cy - 46, w: CW - 12, h: CH - 8, ind });
    });
    // zone legend strip
    ctx.textAlign = "left"; ctx.font = `9.5px ${F.mono}`;
    let lx = 8;
    ZONES.forEach((z, i) => {
      ctx.fillStyle = ZCOL[i]; ctx.fillRect(lx, H - 14, 12, 3.5);
      ctx.fillStyle = PAL.inkMd; ctx.fillText(z, lx + 16, H - 9.5);
      lx += 16 + ctx.measureText(z).width + 18;
    });
    ctx.fillStyle = PAL.inkLo;
    ctx.fillText("底条:YTD(±40% 截断)· 综合(801230.SI)不评级,画成空心盘", lx + 10, H - 9.5);
  }

  cv.addEventListener("click", e => {
    const rct = cv.getBoundingClientRect();
    const x = (e.clientX - rct.left) / rct.width * W, y = (e.clientY - rct.top) / rct.width * W;
    const hit = hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
    if (!hit) return;
    const d = hit.ind;
    if (d.goto && document.getElementById(d.goto)) {
      document.getElementById(d.goto).scrollIntoView({ behavior: U.REDUCE ? "auto" : "smooth", block: "start" });
      return;
    }
    U.showDrill({
      title: `${d.name}（${d.code}）· 阶段判定`,
      value: d.zone == null ? "不评级" : ZONES[Math.round(U.clamp(d.zone, 0, 4))],
      sub: `判定原文:${d.stage_label} · YTD ${d.ytd}% · 近 20 日 ${d.r20}% · 区间位置 ${d.range_pos}% · PE ${d.pe} / PB ${d.pb} · 2026Q1 营收 ${d.rev_q1 == null ? "—" : d.rev_q1 + "%"} · 毛利率同比 ${d.gm_delta == null ? "—" : d.gm_delta + "pt"}`,
      source: "K33 · industry_master.csv(2026-07-17)+ K34 · 31 行业扫描底稿(暂定口径)",
      x: e.clientX, y: e.clientY,
    });
  });
  cv.addEventListener("mousemove", e => {
    const rct = cv.getBoundingClientRect();
    const x = (e.clientX - rct.left) / rct.width * W, y = (e.clientY - rct.top) / rct.width * W;
    cv.style.cursor = hits.some(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) ? "pointer" : "default";
  });

  function anim(ts) {
    if (t0 == null) t0 = ts;
    const p = U.clamp((ts - t0) / 1400, 0, 1);
    draw(U.REDUCE ? 1 : p);
    if (p < 1 && !U.REDUCE) raf = requestAnimationFrame(anim);
  }
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !entered) { entered = true; io.disconnect(); raf = requestAnimationFrame(anim); }
  }), { threshold: 0.15 });
  io.observe(cv);
  if (U.REDUCE) { entered = true; draw(1); }
})();
