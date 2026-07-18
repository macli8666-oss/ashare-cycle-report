// cover-exploded.js — 封面 B/D:周期仪表盘写实拆解 + 开箱
// 同一物理原子 = 周期仪表盘:表圈(市场定价)/ 刻度盘(五阶段)/ 指针(forcing 读数)/
// 齿轮组(库存·价格·产能·政策)/ 基座(证据闸门·41 条队列台账)
window.COVER_X = (() => {
  const U = window.U, PAL = U.PAL, F = U.FONT;
  let cv, ctx, W = 0, H = 0, active = false, raf = 0;
  let k = 1, kTgt = 1, yaw = Math.PI / 4, t0 = performance.now(), mx = 0;
  // intro (D) state
  const INTRO = { on: false, t: 0, shk: 0, uK: 1, yawExtra: 0, parts: [], lidDone: false };

  // steel/brass/enamel true-material palette (color-discipline exempt on cover)
  const M = {
    steel: { hi: "#e8eef4", mid: "#9fb0c0", lo: "#5b6d7d", edge: "#ffffff" },
    brass: { hi: "#e6cf9a", mid: "#c2a05c", lo: "#7d6434", edge: "#fff3d6" },
    enamel: { hi: "#ffffff", mid: "#f4f7fb", lo: "#d5dde7", edge: "#ffffff" },
    blued: { hi: "#3f66ff", mid: "#1233b8", lo: "#0b1f6e", edge: "#bcd0ff" },
    ink: { hi: "#2a3f52", mid: "#10293e", lo: "#051c2c", edge: "#42566a" },
    wood: { hi: "#c9a06b", mid: "#a87f4f", lo: "#6e5233", edge: "#e2c391" },
  };
  const ZCOL = ["#8595a6", "#42566a", "#051c2c", "#7d9bff", "#2251ff"];

  const LAYERS = [
    { id: "base", z0: 0, z1: 15, mat: M.ink, lab: "基座 · 证据闸门", sub: "41 条队列台账 —— 幸存者偏差的制度性排除", red: false },
    { id: "gears", z0: 15, z1: 33, mat: M.brass, lab: "齿轮组 · 库存 价格 产能 政策", sub: "价格 = 最硬约束:DRAM 环比 / 批价 / 猪价 / 碳酸锂", red: true },
    { id: "dial", z0: 33, z1: 43, mat: M.enamel, lab: "刻度盘 · 五阶段", sub: "承压 → 出清 → 底部观察 → 复苏 → 再扩张", red: false },
    { id: "needle", z0: 43, z1: 51, mat: M.blued, lab: "指针 · forcing 读数", sub: "价格/盈利 + 资金/拥挤度,双族齐备才给确认", red: false },
    { id: "bezel", z0: 51, z1: 63, mat: M.steel, lab: "表圈 · 市场定价层", sub: "YTD 与估值分位 —— 价格永远先行于判定", red: false },
  ];

  function fit() {
    const r = cv.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(2, Math.round(r.width * dpr));
    cv.height = Math.max(2, Math.round(r.height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    W = r.width; H = r.height;
  }

  function cam() {
    // framing must fit the FULLY EXPLODED stack: bezel top z ≈ 63+114=177 (+breathing),
    // base bottom z=0; ellipse squash adds ~8u at both ends → span ≈ 193u
    const leftBound = 0.585 * W, right = W - 312;
    const SPAN = 193, TOPZ = 185;
    let u = Math.min((right - leftBound) / 40, (H - 110) / SPAN, H * 0.0135);
    let labels = true;
    if (u < 3.4) { labels = false; u = Math.min((W - 80) / 40, (H - 110) / SPAN, H * 0.0135); }
    u = Math.max(2.6, u);
    const cx = labels ? (leftBound + right) / 2 : W / 2;
    // vertical center of the current (k-dependent) stack
    const stackTop = (63 + 114 * lay(4) + 8) * u, stackBot = 8 * u;
    const cy = (H - stackTop - stackBot) / 2 + stackTop;
    return { u: u * INTRO.uK, cx, cy, labels, right };
  }

  // layer i explode offset
  function lay(i) {
    const kk = U.clamp(k * 1.55 - i * 0.17, 0, 1);
    const e = 1 - Math.pow(1 - kk, 3); // easeOutCubic (backOut during intro via overshoot below)
    return e;
  }
  function zOff(i, t) {
    return lay(i) * (i * 26 + 10) + Math.sin(t * 1.1 + i * 1.7) * 1.6 * lay(i);
  }

  function pt(x, y, z, c) {
    const rx = x * Math.cos(yaw) - y * Math.sin(yaw);
    const ry = x * Math.sin(yaw) + y * Math.cos(yaw);
    return { x: c.cx + rx * c.u, y: c.cy + ry * c.u * 0.5 - z * c.u };
  }

  function discSide(c, z0, z1, r, mat) {
    // side band between two heights (cylinder wall), painter: draw full, top covers
    const steps = 40;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = i / steps * U.TAU;
      const p0 = pt(Math.cos(a) * r, Math.sin(a) * r, z0, c);
      i ? ctx.lineTo(p0.x, p0.y) : ctx.moveTo(p0.x, p0.y);
    }
    for (let i = steps; i >= 0; i--) {
      const a = i / steps * U.TAU;
      const p1 = pt(Math.cos(a) * r, Math.sin(a) * r, z1, c);
      ctx.lineTo(p1.x, p1.y);
    }
    ctx.closePath();
    const g = ctx.createLinearGradient(0, c.cy - z1 * c.u, 0, c.cy - z0 * c.u + r * c.u * 0.5);
    g.addColorStop(0, mat.hi); g.addColorStop(0.45, mat.mid); g.addColorStop(1, mat.lo);
    ctx.fillStyle = g; ctx.fill();
  }
  function discTop(c, z, r, mat, ring) {
    ctx.beginPath();
    const steps = 44;
    for (let i = 0; i <= steps; i++) {
      const a = i / steps * U.TAU;
      const p = pt(Math.cos(a) * r, Math.sin(a) * r, z, c);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.closePath();
    const g = ctx.createRadialGradient(c.cx - r * c.u * 0.3, c.cy - z * c.u - r * c.u * 0.2, r * c.u * 0.1, c.cx, c.cy - z * c.u, r * c.u * 1.2);
    g.addColorStop(0, mat.hi); g.addColorStop(0.7, mat.mid); g.addColorStop(1, mat.lo);
    ctx.fillStyle = g; ctx.fill();
    if (ring) { // hollow: cut inner circle (bezel)
      ctx.save(); ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = i / steps * U.TAU;
        const p = pt(Math.cos(a) * ring, Math.sin(a) * ring, z, c);
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    // top-edge bevel
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = i / steps * U.TAU;
      const p = pt(Math.cos(a) * r, Math.sin(a) * r, z, c);
      i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.strokeStyle = mat.edge; ctx.globalAlpha = 0.55; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
  }
  function plateShadow(c, z, r, sep) {
    const a = U.clamp(0.22 - sep * 0.004, 0.05, 0.22);
    ctx.beginPath(); ctx.fillStyle = `rgba(5,28,44,${a})`;
    ctx.ellipse(c.cx, c.cy - z * c.u + 3, r * c.u * 0.94, r * c.u * 0.42, 0, 0, U.TAU);
    ctx.fill();
  }

  function drawLayer(li, c, t) {
    const L = LAYERS[li], off = zOff(li, t);
    const z0 = L.z0 + off, z1 = L.z1 + off;
    const r = 15 - li * 0.4;
    plateShadow(c, LAYERS[Math.max(0, li - 1)].z1 + zOff(Math.max(0, li - 1), t), r, off - (li ? zOff(li - 1, t) : 0) + 10);
    if (L.id === "gears") {
      // plate + four gears (库存 价格 产能 政策)
      discSide(c, z0, z0 + 4, r, L.mat);
      discTop(c, z0 + 4, r, L.mat);
      const gn = ["库存", "价格", "产能", "政策"];
      const gp = [[-6.5, -6.5], [6.5, -6.5], [-6.5, 6.5], [6.5, 6.5]];
      gp.forEach((g, gi) => {
        const spin = t * (0.5 + gi * 0.13) * (gi % 2 ? 1 : -1);
        const gr = gi === 1 ? 4.6 : 3.9;
        // teeth
        for (let tt = 0; tt < 10; tt++) {
          const a = spin + tt / 10 * U.TAU;
          const p0 = pt(g[0] + Math.cos(a) * gr, g[1] + Math.sin(a) * gr, z1, c);
          const p1 = pt(g[0] + Math.cos(a) * (gr + 1.1), g[1] + Math.sin(a) * (gr + 1.1), z1, c);
          ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y);
          ctx.strokeStyle = gi === 1 ? "#8a1f38" : "#7d6434"; ctx.lineWidth = gi === 1 ? 2 : 1.6; ctx.stroke();
        }
        // gear body
        ctx.beginPath();
        for (let i = 0; i <= 30; i++) {
          const a = i / 30 * U.TAU;
          const p = pt(g[0] + Math.cos(a) * gr, g[1] + Math.sin(a) * gr, z1, c);
          i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        }
        ctx.closePath();
        const gg = ctx.createRadialGradient(c.cx + g[0] * c.u - 3, c.cy - z1 * c.u - 3, 1, c.cx + g[0] * c.u, c.cy - z1 * c.u, gr * c.u);
        gg.addColorStop(0, M.brass.hi); gg.addColorStop(1, M.brass.lo);
        ctx.fillStyle = gg; ctx.fill();
        ctx.strokeStyle = M.brass.lo; ctx.lineWidth = 1; ctx.stroke();
        // hub
        const hp = pt(g[0], g[1], z1, c);
        ctx.beginPath(); ctx.fillStyle = M.brass.lo;
        ctx.arc(hp.x, hp.y, Math.max(1.6, c.u * 0.55), 0, U.TAU); ctx.fill();
        // label under gear
        if (c.u > 5) {
          ctx.font = `${gi === 1 ? "700" : "400"} 8.5px ${F.mono}`;
          ctx.textAlign = "center";
          ctx.fillStyle = gi === 1 ? "#8a1f38" : "#5b4a22";
          const lp = pt(g[0], g[1] + gr + 2.2, z1, c);
          ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 3;
          ctx.strokeText(gn[gi], lp.x, lp.y + 3);
          ctx.fillText(gn[gi], lp.x, lp.y + 3);
        }
      });
      return;
    }
    if (L.id === "dial") {
      discSide(c, z0, z1, r, L.mat);
      discTop(c, z1, r, L.mat);
      // five zone arcs on top face
      const a0 = Math.PI * (210 / 180), a1 = -Math.PI / 6;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        const s0 = a0 + (a1 - a0) * (i / 5) + 0.03, s1 = a0 + (a1 - a0) * ((i + 1) / 5) - 0.03;
        for (let j = 0; j <= 16; j++) {
          const a = s0 + (s1 - s0) * j / 16;
          const p = pt(Math.cos(a) * (r - 2.6), Math.sin(a) * (r - 2.6), z1, c);
          j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
        }
        ctx.strokeStyle = ZCOL[i]; ctx.lineWidth = Math.max(2, c.u * 0.5); ctx.stroke();
      }
      // ticks
      ctx.strokeStyle = "#8595a6"; ctx.lineWidth = 1;
      for (let i = 0; i <= 20; i++) {
        const a = a0 + (a1 - a0) * (i / 20);
        const p0 = pt(Math.cos(a) * (r - 5), Math.sin(a) * (r - 5), z1, c);
        const p1 = pt(Math.cos(a) * (r - 6.4), Math.sin(a) * (r - 6.4), z1, c);
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
      }
      return;
    }
    if (L.id === "needle") {
      discSide(c, z0, z0 + 2, r * 0.32, L.mat);
      discTop(c, z0 + 2, r * 0.32, L.mat);
      // needle pointing into 复苏/再扩张 (real report posture), slow breathing sweep
      const baseA = Math.PI * (210 / 180) + (-Math.PI / 6 - Math.PI * (210 / 180)) * 0.86;
      const a = baseA + Math.sin(t * 0.7) * 0.03;
      const tip = pt(Math.cos(a) * (r + 1.5), Math.sin(a) * (r + 1.5), z1, c);
      const tail = pt(-Math.cos(a) * 4.5, -Math.sin(a) * 4.5, z1, c);
      const s1 = pt(Math.cos(a + Math.PI / 2) * 1.1, Math.sin(a + Math.PI / 2) * 1.1, z1, c);
      const s2 = pt(Math.cos(a - Math.PI / 2) * 1.1, Math.sin(a - Math.PI / 2) * 1.1, z1, c);
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y); ctx.lineTo(s1.x, s1.y); ctx.lineTo(tip.x, tip.y); ctx.lineTo(s2.x, s2.y);
      ctx.closePath();
      const g = ctx.createLinearGradient(tail.x, tail.y, tip.x, tip.y);
      g.addColorStop(0, M.blued.lo); g.addColorStop(1, M.blued.hi);
      ctx.fillStyle = g; ctx.fill();
      const cp = pt(0, 0, z1, c);
      ctx.beginPath(); ctx.fillStyle = M.blued.mid;
      ctx.arc(cp.x, cp.y, Math.max(2, c.u * 0.8), 0, U.TAU); ctx.fill();
      ctx.beginPath(); ctx.strokeStyle = M.blued.edge; ctx.lineWidth = 1;
      ctx.arc(cp.x, cp.y, Math.max(2, c.u * 0.8), 0, U.TAU); ctx.stroke();
      return;
    }
    if (L.id === "bezel") {
      discSide(c, z0, z1, r + 1.2, L.mat);
      discTop(c, z1, r + 1.2, L.mat, r - 2.2);
      // screws
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * U.TAU + 0.3;
        const p = pt(Math.cos(a) * (r + 0.1), Math.sin(a) * (r + 0.1), z1, c);
        const gg = ctx.createRadialGradient(p.x - 1, p.y - 1, 0.5, p.x, p.y, 3.2);
        gg.addColorStop(0, "#fff"); gg.addColorStop(1, "#5b6d7d");
        ctx.beginPath(); ctx.fillStyle = gg;
        ctx.arc(p.x, p.y, Math.max(1.6, c.u * 0.42), 0, U.TAU); ctx.fill();
      }
      return;
    }
    // base
    discSide(c, z0, z1, r + 0.6, L.mat);
    discTop(c, z1, r + 0.6, L.mat);
    // rivet ring with 41 ticks (cohort ledger)
    for (let i = 0; i < 41; i++) {
      const a = i / 41 * U.TAU;
      const p = pt(Math.cos(a) * (r - 1.6), Math.sin(a) * (r - 1.6), z1, c);
      ctx.beginPath(); ctx.fillStyle = i < 17 ? "#8a94a3" : "#c7d2dd";
      ctx.arc(p.x, p.y, Math.max(0.9, c.u * 0.16), 0, U.TAU); ctx.fill();
    }
  }

  // ── crate (D) ──
  function crate(c, t) {
    const T = INTRO.t;
    const rattle = T < 0.5 ? 1 : 0;
    const wallA = T < 0.55 ? 1 : U.clamp(1 - (T - 0.55) / 0.45, 0, 1);
    const lidT = U.clamp((T - 0.5) / 0.85, 0, 1);
    const eoc = 1 - Math.pow(1 - lidT, 3);
    const w = 19, hgt = 30;
    ctx.save();
    ctx.globalAlpha = wallA;
    // four walls (painter: back two first)
    const faces = [
      [[-w, -w], [w, -w]], [[w, -w], [w, w]], [[w, w], [-w, w]], [[-w, w], [-w, -w]],
    ];
    const order = [0, 1, 3, 2];
    order.forEach(fi => {
      const f = faces[fi];
      ctx.beginPath();
      const p1 = pt(f[0][0], f[0][1], 0, c), p2 = pt(f[1][0], f[1][1], 0, c);
      const p3 = pt(f[1][0], f[1][1], hgt, c), p4 = pt(f[0][0], f[0][1], hgt, c);
      ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y); ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      const g = ctx.createLinearGradient(p1.x, p1.y, p4.x, p4.y);
      g.addColorStop(0, M.wood.hi); g.addColorStop(0.55, M.wood.mid); g.addColorStop(1, M.wood.lo);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = M.wood.lo; ctx.lineWidth = 1; ctx.stroke();
      // plank seams
      for (let s = 1; s < 4; s++) {
        const q0 = pt(f[0][0] + (f[1][0] - f[0][0]) * s / 4, f[0][1] + (f[1][1] - f[0][1]) * s / 4, 0, c);
        const q1 = pt(f[0][0] + (f[1][0] - f[0][0]) * s / 4, f[0][1] + (f[1][1] - f[0][1]) * s / 4, hgt, c);
        ctx.beginPath(); ctx.moveTo(q0.x, q0.y); ctx.lineTo(q1.x, q1.y);
        ctx.strokeStyle = "rgba(80,58,32,.5)"; ctx.stroke();
      }
    });
    // stencil on near wall (upright mono, not skewed)
    const np = pt(0, w, hgt * 0.55, c);
    ctx.font = `700 ${Math.max(9, c.u * 1.5)}px ${F.mono}`;
    ctx.textAlign = "center"; ctx.fillStyle = "rgba(40,26,12,.75)";
    ctx.fillText("FRAGILE · 周期仪表盘", np.x, np.y);
    ctx.font = `${Math.max(8, c.u * 1.1)}px ${F.mono}`;
    ctx.fillText("THIS SIDE UP ↑ · 31 GAUGES INSIDE", np.x, np.y + c.u * 1.9);
    // lid (independent: flies off)
    if (lidT < 1) {
      ctx.save();
      const lx = -150 * eoc, ly = -40 * eoc - 60 * eoc;
      ctx.translate(lx, ly); ctx.rotate(-0.85 * eoc);
      ctx.globalAlpha = wallA * (1 - eoc * 0.9);
      ctx.beginPath();
      const lz = hgt + 2 + eoc * 8;
      const c1 = pt(-w, -w, lz, c), c2 = pt(w, -w, lz, c), c3 = pt(w, w, lz, c), c4 = pt(-w, w, lz, c);
      ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c3.x, c3.y); ctx.lineTo(c4.x, c4.y);
      ctx.closePath();
      const g = ctx.createLinearGradient(c1.x, c1.y, c3.x, c3.y);
      g.addColorStop(0, M.wood.edge); g.addColorStop(1, M.wood.mid);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = M.wood.lo; ctx.stroke();
      // nail strips
      ctx.strokeStyle = "#4a3a24"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(c1.x, c1.y); ctx.lineTo(c3.x, c3.y);
      ctx.moveTo(c2.x, c2.y); ctx.lineTo(c4.x, c4.y); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function particles(dt) {
    INTRO.parts = INTRO.parts.filter(p => (p.life -= dt) > 0);
    INTRO.parts.forEach(p => {
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 240 * dt;
      ctx.globalAlpha = U.clamp(p.life / p.max, 0, 1) * 0.8;
      ctx.fillStyle = p.col;
      ctx.fillRect(p.x, p.y, p.s, p.s * 0.6);
    });
    ctx.globalAlpha = 1;
  }
  function burst(c, n, ring) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * U.TAU, sp = 60 + Math.random() * 160;
      INTRO.parts.push({
        x: c.cx + (Math.random() - 0.5) * 60, y: c.cy - 120,
        vx: Math.cos(a) * sp, vy: -Math.abs(Math.sin(a)) * sp - 60,
        s: 2 + Math.random() * 3.4, life: 0.7 + Math.random() * 0.9, max: 1.2,
        col: Math.random() < 0.6 ? "#a87f4f" : "#8a94a3",
      });
    }
  }

  function labels(c) {
    if (!c.labels) return;
    const la = INTRO.on ? U.clamp((INTRO.t - 1.9) / 0.9, 0, 1) : U.clamp((k - 0.45) * 2.4, 0, 1);
    if (la <= 0) return;
    const colX = W - 300;
    let ly = H * 0.24;
    const rows = [];
    LAYERS.forEach((L, i) => {
      const zMid = (L.z0 + L.z1) / 2 + zOff(i, performance.now() / 1000);
      const anchor = pt(15, 0, zMid, c);
      rows.push({ L, anchor, y: Math.max(ly, anchor.y) });
      ly = rows[i].y + 34;
    });
    // push down if spacing < 34
    for (let i = 1; i < rows.length; i++) if (rows[i].y < rows[i - 1].y + 34) rows[i].y = rows[i - 1].y + 34;
    ctx.globalAlpha = la;
    rows.forEach(r => {
      ctx.strokeStyle = r.L.red ? "#8a1f38" : "#8595a6"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(r.anchor.x + 4, r.anchor.y);
      ctx.lineTo(colX - 10, r.y - 4); ctx.stroke();
      ctx.beginPath(); ctx.fillStyle = r.L.red ? "#8a1f38" : "#8595a6";
      ctx.arc(r.anchor.x + 3, r.anchor.y, 2, 0, U.TAU); ctx.fill();
      ctx.font = `700 11.5px ${F.mono}`; ctx.textAlign = "left";
      ctx.fillStyle = r.L.red ? "#8a1f38" : "#051c2c";
      ctx.fillText(r.L.lab, colX, r.y - 2);
      ctx.font = `10px ${F.serif}`; ctx.fillStyle = "#42566a";
      let sub = r.L.sub;
      while (ctx.measureText(sub).width > 270 && sub.length > 6) sub = sub.slice(0, -1);
      if (sub !== r.L.sub) sub += "…";
      ctx.fillText(sub, colX, r.y + 13);
    });
    ctx.globalAlpha = 1;
  }

  let last = performance.now();
  function frame(now) {
    if (!active) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    const t = (now - t0) / 1000;
    if (W === 0) fit();
    // timeline
    if (INTRO.on) {
      INTRO.t += dt;
      INTRO.shk *= Math.exp(-dt * 5.5);
      if (INTRO.t < 0.5) INTRO.shk = Math.max(INTRO.shk, 1.2 + 1.2 * Math.abs(Math.sin(INTRO.t * 34)));
      if (INTRO.t >= 0.5 && !INTRO.lidDone) {
        INTRO.lidDone = true; INTRO.shk = 15;
        const c = cam(); burst(c, 46, true);
      }
      if (INTRO.t >= 0.55 && INTRO.t - dt < 0.55) { const c = cam(); burst(c, 30, false); }
      k = U.clamp((INTRO.t - 0.6) / 1.4, 0, 1);
      INTRO.uK = 1.34 - 0.34 * U.clamp((INTRO.t - 0.55) / 1.55, 0, 1);
      INTRO.yawExtra = 0.55 * (1 - U.clamp((INTRO.t - 0.55) / 1.55, 0, 1));
      if (INTRO.t >= 2.95) finishIntro();
    } else {
      k = U.ease(k, kTgt, dt, 0.28);
    }
    yaw = Math.PI / 4 + 0.14 * Math.sin(t * 0.6) + mx * 0.11 + INTRO.yawExtra;

    ctx.clearRect(0, 0, W, H);
    const c = cam();
    // screen shake (3D content only)
    ctx.save();
    if (INTRO.shk > 0.05) ctx.translate(Math.sin(t * 96) * INTRO.shk, Math.cos(t * 81) * INTRO.shk * 0.7);
    // ground shadow
    ctx.beginPath(); ctx.fillStyle = "rgba(5,28,44,.07)";
    ctx.ellipse(c.cx, c.cy + 8, 16 * c.u, 6 * c.u, 0, 0, U.TAU); ctx.fill();
    if (INTRO.on && INTRO.t < 1.35) crate(c, t);
    if (!(INTRO.on && INTRO.t < 0.55)) {
      // painter: bottom layer first
      for (let i = 0; i < LAYERS.length; i++) drawLayer(i, c, t);
    }
    particles(dt);
    ctx.restore();
    // left wash for text column
    const wash = ctx.createLinearGradient(0, 0, W * 0.62, 0);
    wash.addColorStop(0, "rgba(255,255,255,.92)"); wash.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = wash; ctx.fillRect(0, 0, W * 0.62, H);
    labels(c);
    // caption
    ctx.font = `10px ${F.mono}`; ctx.textAlign = "right"; ctx.fillStyle = "#8595a6";
    const cap = INTRO.on ? "UNBOXING · 周期仪表盘 · 五层结构"
      : (k > 0.7 ? "EXPLODED · 一台仪表盘,四个 forcing 齿轮 —— 点击空白处组装" : "ASSEMBLED · 点击空白处拆解");
    ctx.fillText(cap, W - 20, H - 16);
    raf = requestAnimationFrame(frame);
  }

  function finishIntro() {
    INTRO.on = false; INTRO.t = 0; INTRO.shk = 0; INTRO.uK = 1; INTRO.yawExtra = 0;
    INTRO.parts = []; k = 1; kTgt = 1;
  }
  function playIntro() {
    INTRO.on = true; INTRO.t = 0; INTRO.lidDone = false; INTRO.parts = [];
    k = 0; t0 = performance.now();
    if (U.REDUCE) finishIntro();
  }

  return {
    setActive(on, opts = {}) {
      if (on) {
        if (!cv) { cv = document.getElementById("cover-canvas-x"); ctx = cv.getContext("2d"); }
        if (!cv) return;
        cv.style.display = "";
        active = true;
        // deferred fit: display:none → 0×0 pitfall (QA #2 / COVER a11y note)
        requestAnimationFrame(() => {
          fit();
          last = performance.now();
          if (opts.intro && !U.REDUCE) playIntro(); else if (opts.intro) finishIntro();
          cancelAnimationFrame(raf);
          raf = requestAnimationFrame(frame);
        });
      } else { active = false; cancelAnimationFrame(raf); if (cv) cv.style.display = "none"; }
    },
    playIntro,
    onClick(x, y) {
      if (INTRO.on) return;
      kTgt = kTgt > 0.5 ? 0 : 1;
    },
    onMove(nx) { mx = nx; },
    isIntro: () => INTRO.on,
  };
})();
