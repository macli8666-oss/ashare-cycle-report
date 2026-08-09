// chart-verdict.js — P18 判定天平 ×6(same_case vs different_case 刻度)
// 三重结构编码:证据 sidedness(拓扑)+ 梁倾角(权重)+ 虚线砝码(缺席条件)+ 红封条(共同证伪)
(() => {
  const U = window.U, PAL = U.PAL, F = U.FONT;

  const HOSTS = [
    ["verdict-chart-ai", "p05_ai_compute", 0.90, "再扩张进行中 · 双证据族确认"],
    ["verdict-chart-hog", "p06_hog_cycle", 0.50, "底部观察 · 映射 2014 年中"],
    ["verdict-chart-baijiu", "p07_baijiu", 0.48, "底部观察 · 2014H2-2015H1 磨底段"],
    ["verdict-chart-ne", "p08_new_energy", 0.64, "锂电复苏初期 / 光伏政策底"],
    ["verdict-chart-pharma", "p09_innovative_pharma", 0.82, "复苏初期 → 再扩张"],
    ["verdict-chart-auto", "p10_autos", 0.42, "底部观察 · 2018 末-2019 初最深段"],
  ];

  HOSTS.forEach(([hid, pid, dialPos, verdict]) => {
    const host = document.getElementById(hid);
    if (!host || !window.RPT) return;
    const page = RPT.pages.find(p => p.page_id === pid);
    const cab = page.modules.find(m => m.type === "cycle_answer_box");
    const sg = page.modules.find(m => m.type === "signal_grid");
    const upgrades = (sg ? sg.items.filter(s => s.status !== "met") : []).slice(0, 2);

    const body = U.frame(host, {
      title: cab.question.replace("?", "") + "——把证据放上秤:指针停在「" + verdict.split(" ·")[0] + "」区",
      sub: "VERDICT SCALE · 左盘 = same-case 证据 · 右盘 = different-case 证据 · 虚线砝码 = 未满足的升级信号 · 红封条 = 共同证伪 · 梁倾角为定性示意非打分 · 全部可点",
      src: "cycle_report.json · " + pid + "(cycle_answer_box + signal_grid,更新至2026-08-07)",
    });

    const W = 880, H = 560;
    const cv = document.createElement("canvas");
    cv.style.width = "100%"; cv.style.height = "auto"; cv.style.display = "block";
    cv.style.aspectRatio = W + " / " + H;
    body.appendChild(cv);
    const ctx = cv.getContext("2d");
    const hits = [];

    const tiltDir = cab.same_case_bullets.length >= cab.different_case_bullets.length ? 1 : -1;
    const tilt = tiltDir * 0.055; // qualitative
    const cx = W / 2, beamY = 218, beamHalf = 252, pillarTop = 200, baseY = 468;

    function beamEnd(side) { // side -1 left, +1 right
      return { x: cx + side * beamHalf * Math.cos(tilt), y: beamY + side * beamHalf * Math.sin(tilt) };
    }
    function weight(w, h) { // trapezoid path centered at x, top y
      return (x, y) => {
        ctx.beginPath();
        ctx.moveTo(x - w * 0.36, y); ctx.lineTo(x + w * 0.36, y);
        ctx.lineTo(x + w * 0.5, y + h); ctx.lineTo(x - w * 0.5, y + h);
        ctx.closePath();
      };
    }
    function trunc(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

    function drawPan(side, bullets, prog, dropT) {
      const e = beamEnd(side);
      const stackH = bullets.length * 34;
      const panY = e.y + 86 + stackH * 0.45;
      // chains
      ctx.strokeStyle = PAL.inkMd; ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(e.x, e.y); ctx.lineTo(e.x - 34, panY);
      ctx.moveTo(e.x, e.y); ctx.lineTo(e.x + 34, panY);
      ctx.stroke();
      // pan arc
      ctx.beginPath(); ctx.strokeStyle = PAL.ink; ctx.lineWidth = 2.4;
      ctx.arc(e.x, panY - 4, 42, Math.PI * 0.12, Math.PI * 0.88, false);
      ctx.stroke();
      // weights bounce on (alternating timing via dropT offset)
      bullets.forEach((b, i) => {
        const p = U.clamp((prog - dropT - i * 0.13) * 2.2, 0, 1);
        if (p <= 0) return;
        const bounce = 1 - Math.pow(1 - p, 3);
        const w = 108, h = 18;
        const wy = panY - 12 - (bullets.length - i) * 34 + (1 - bounce) * -46;
        const path = weight(w, h);
        ctx.globalAlpha = bounce;
        path(e.x, wy);
        ctx.fillStyle = side < 0 ? "rgba(34,81,255,.13)" : "rgba(5,28,44,.08)";
        ctx.fill();
        ctx.strokeStyle = side < 0 ? PAL.red : PAL.ink; ctx.lineWidth = 1.1; ctx.stroke();
        // top knob
        ctx.beginPath(); ctx.fillStyle = side < 0 ? PAL.red : PAL.ink;
        ctx.fillRect(e.x - 2.5, wy - 4, 5, 5);
        // label UNDER the weight with white halo (chains pass behind)
        ctx.font = `700 10px ${F.serif}`; ctx.textAlign = "center";
        ctx.strokeStyle = "rgba(255,255,255,.94)"; ctx.lineWidth = 3.5;
        ctx.strokeText(trunc(b, 15), e.x, wy + h + 12);
        ctx.fillStyle = PAL.ink;
        ctx.fillText(trunc(b, 15), e.x, wy + h + 12);
        ctx.globalAlpha = 1;
        hits.push({ x: e.x - w * 0.55, y: wy - 4, w: w * 1.1, h: h + 20, text: b, side });
      });
      // pan label
      ctx.font = `700 10.5px ${F.mono}`; ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(255,255,255,.94)"; ctx.lineWidth = 3.5;
      const pl = side < 0 ? "SAME-CASE · 机制一致" : "DIFFERENT-CASE · 机制断裂";
      ctx.strokeText(pl, e.x, panY + 26);
      ctx.fillStyle = side < 0 ? PAL.red : PAL.ink;
      ctx.fillText(pl, e.x, panY + 26);
      return panY;
    }

    function draw(prog) {
      const rct = cv.getBoundingClientRect();
      if (rct.width < 10) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.round(rct.width * dpr);
      cv.height = Math.round(rct.width * (H / W) * dpr);
      ctx.setTransform(cv.width / W, 0, 0, cv.width / W, 0, 0);
      ctx.clearRect(0, 0, W, H);
      hits.length = 0;

      const tiltP = U.clamp((prog - 0.42) * 2.4, 0, 1);

      // pillar + base
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(cx - 5, pillarTop, 10, baseY - pillarTop);
      ctx.fillRect(cx - 92, baseY, 184, 10);
      ctx.fillStyle = PAL.line; ctx.fillRect(cx - 104, baseY + 10, 208, 4);

      // beam (tilts with tiltP)
      ctx.save();
      ctx.translate(cx, beamY);
      ctx.rotate(tilt * U.smooth(tiltP));
      ctx.fillStyle = PAL.ink;
      ctx.fillRect(-beamHalf - 12, -4, (beamHalf + 12) * 2, 8);
      ctx.restore();
      // beam-end hooks
      [-1, 1].forEach(s => {
        const e = beamEnd(s);
        ctx.save(); ctx.translate(cx, beamY); ctx.rotate(tilt * U.smooth(tiltP));
        ctx.fillStyle = PAL.ink; ctx.fillRect(s * beamHalf - 2, -4, 4, 14);
        ctx.restore();
      });

      // fulcrum dial
      const dialR = 40, dy = pillarTop - dialR + 6;
      ctx.beginPath(); ctx.strokeStyle = PAL.inkMd; ctx.lineWidth = 1.2;
      ctx.arc(cx, dy + dialR, dialR, Math.PI, 0, false); ctx.stroke();
      // three-zone ticks
      const zoneLab = ["左侧区", "观察区", "右侧区"];
      const zoneCol = [PAL.inkLo, PAL.ink, PAL.red];
      for (let i = 0; i < 3; i++) {
        const a0 = Math.PI + i * Math.PI / 3, a1 = Math.PI + (i + 1) * Math.PI / 3;
        ctx.beginPath(); ctx.strokeStyle = zoneCol[i]; ctx.lineWidth = 3;
        ctx.arc(cx, dy + dialR, dialR - 3, a0 + 0.04, a1 - 0.04, false); ctx.stroke();
        const am = (a0 + a1) / 2;
        ctx.font = `8.5px ${F.mono}`; ctx.textAlign = "center"; ctx.fillStyle = zoneCol[i];
        ctx.fillText(zoneLab[i], cx + Math.cos(am) * (dialR + 13), dy + dialR + Math.sin(am) * (dialR + 13) + 3);
      }
      // needle deflects after tilt
      const nP = U.clamp((prog - 0.62) * 2.6, 0, 1);
      const na = Math.PI + dialPos * Math.PI * U.smooth(nP) + (1 - U.smooth(nP)) * 0;
      ctx.beginPath(); ctx.strokeStyle = PAL.red; ctx.lineWidth = 2; ctx.lineCap = "round";
      ctx.moveTo(cx, dy + dialR);
      ctx.lineTo(cx + Math.cos(Math.PI + dialPos * Math.PI * U.smooth(nP)) * (dialR - 8),
                 dy + dialR + Math.sin(Math.PI + dialPos * Math.PI * U.smooth(nP)) * (dialR - 8));
      ctx.stroke();
      ctx.beginPath(); ctx.fillStyle = PAL.ink; ctx.arc(cx, dy + dialR, 3, 0, U.TAU); ctx.fill();

      // pans + weights
      drawPan(-1, cab.same_case_bullets, prog, 0.05);
      drawPan(1, cab.different_case_bullets, prog, 0.11);

      // dashed upgrade weights (hover above left area, arrows to pans)
      upgrades.forEach((up, i) => {
        const p = U.clamp((prog - 0.3 - i * 0.12) * 2, 0, 1);
        if (p <= 0) return;
        ctx.globalAlpha = p;
        const ux = 132 + i * 196, uy = 66 + i * 26;
        const path = weight(96, 18);
        path(ux, uy);
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = PAL.red; ctx.lineWidth = 1.1; ctx.stroke();
        ctx.setLineDash([]);
        ctx.font = `700 9.5px ${F.mono}`; ctx.textAlign = "center"; ctx.fillStyle = PAL.red;
        ctx.fillText(trunc(up.label + " · " + up.threshold, 16), ux, uy + 13);
        // dashed arrow toward nearest pan
        ctx.setLineDash([3, 4]); ctx.strokeStyle = PAL.inkLo; ctx.lineWidth = 1;
        const e = beamEnd(-1);
        ctx.beginPath(); ctx.moveTo(ux + 20, uy + 20);
        ctx.quadraticCurveTo(ux + 60, uy + 90, e.x + 30, e.y + 40);
        ctx.stroke(); ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        hits.push({ x: ux - 52, y: uy - 4, w: 104, h: 26, up });
      });
      ctx.font = `9px ${F.mono}`; ctx.textAlign = "left"; ctx.fillStyle = PAL.inkLo;
      ctx.fillText("升级砝码 · 尚未放上秤 —— 落盘(信号转 met)后读数才上调", 40, 46);

      // readout plaque (hangs from pillar)
      const rp = U.clamp((prog - 0.72) * 3, 0, 1);
      if (rp > 0) {
        ctx.globalAlpha = rp;
        const pw = 300, ph = 56, px = cx - pw / 2, py = 322;
        ctx.fillStyle = "#ffffff"; ctx.strokeStyle = PAL.red; ctx.lineWidth = 1.4;
        ctx.fillRect(px, py, pw, ph); ctx.strokeRect(px, py, pw, ph);
        ctx.font = `9px ${F.mono}`; ctx.textAlign = "center"; ctx.fillStyle = PAL.red;
        ctx.fillText("当前读数 · CURRENT READING", cx, py + 14);
        ctx.font = `700 15px ${F.serif}`; ctx.fillStyle = PAL.ink;
        ctx.fillText(verdict.split(" ·")[0], cx, py + 34);
        ctx.font = `9px ${F.mono}`; ctx.fillStyle = PAL.inkLo;
        ctx.fillText("指针未出当前判定区 —— 任何反弹/回撤不作阶段迁移确认", cx, py + 49);
        ctx.globalAlpha = 1;
        hits.push({ x: px, y: py, w: pw, h: ph, verdict: true });
      }

      // falsifier seal strip
      const fp = U.clamp((prog - 0.8) * 3.2, 0, 1);
      if (fp > 0) {
        ctx.globalAlpha = fp;
        const fy = 492, fh = 54;
        ctx.save();
        ctx.beginPath(); ctx.rect(20, fy, W - 40, fh); ctx.clip();
        ctx.fillStyle = "rgba(194,47,78,.06)"; ctx.fillRect(20, fy, W - 40, fh);
        ctx.strokeStyle = "rgba(194,47,78,.35)"; ctx.lineWidth = 1;
        for (let x = -fh; x < W; x += 12) {
          ctx.beginPath(); ctx.moveTo(x, fy + fh); ctx.lineTo(x + fh, fy); ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = PAL.neg; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.2;
        ctx.strokeRect(20, fy, W - 40, fh); ctx.setLineDash([]);
        ctx.font = `700 9px ${F.mono}`; ctx.textAlign = "left"; ctx.fillStyle = PAL.neg;
        ctx.fillText("共同证伪封条 · FALSIFIERS —— 任何一条出现,整杆秤重称", 32, fy - 6);
        const fw = (W - 40 - 24) / cab.falsifiers.length;
        cab.falsifiers.forEach((f0, i) => {
          const fx = 20 + 8 + i * fw;
          ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "rgba(194,47,78,.5)"; ctx.lineWidth = 1;
          ctx.fillRect(fx, fy + 12, fw - 8, fh - 24);
          ctx.strokeRect(fx, fy + 12, fw - 8, fh - 24);
          ctx.font = `9.5px ${F.serif}`; ctx.fillStyle = PAL.ink; ctx.textAlign = "left";
          ctx.fillText("× " + trunc(f0, Math.floor((fw - 26) / 9.5)), fx + 8, fy + 32);
          hits.push({ x: fx, y: fy + 12, w: fw - 8, h: fh - 24, fals: f0 });
        });
        ctx.globalAlpha = 1;
      }
    }

    cv.addEventListener("click", e => {
      const rct = cv.getBoundingClientRect();
      const x = (e.clientX - rct.left) / rct.width * W, y = (e.clientY - rct.top) / rct.width * W;
      const hit = hits.slice().reverse().find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
      if (!hit) return;
      if (hit.text) U.showDrill({
        title: hit.side < 0 ? "SAME-CASE 证据(机制一致)" : "DIFFERENT-CASE 证据(机制断裂)",
        value: hit.text,
        sub: `完整表述:${hit.side < 0 ? cab.same_case : cab.different_case}`,
        source: "cycle_report.json · " + pid + " · cycle_answer_box",
        x: e.clientX, y: e.clientY,
      });
      else if (hit.up) U.showDrill({
        title: "升级信号(当前 " + hit.up.status.toUpperCase() + ")",
        value: hit.up.label,
        sub: `当前值:${hit.up.current_value} · 阈值:${hit.up.threshold} · 预期时滞:${hit.up.expected_lag} · 证伪:${hit.up.falsifier}`,
        source: hit.up.source + "（" + hit.up.asof + "）",
        x: e.clientX, y: e.clientY,
      });
      else if (hit.fals) U.showDrill({
        title: "证伪条件", value: hit.fals,
        sub: "任何一条出现即触发该行业阶段判定降级(重称)。",
        source: "cycle_report.json · " + pid + " · falsifiers",
        x: e.clientX, y: e.clientY,
      });
      else if (hit.verdict) U.showDrill({
        title: "当前判定", value: verdict,
        sub: `same_case:${cab.same_case} ｜ different_case:${cab.different_case}`,
        source: "cycle_report.json · " + pid + " · current_stage=" + cab.current_stage,
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
      const p = U.clamp((ts - t0) / 1900, 0, 1);
      draw(U.REDUCE ? 1 : p);
      if (p < 1 && !U.REDUCE) requestAnimationFrame(anim);
    }
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting && !entered) { entered = true; io.disconnect(); requestAnimationFrame(anim); }
    }), { threshold: 0.18 });
    io.observe(cv);
    if (U.REDUCE) { entered = true; draw(1); }
  });
})();
