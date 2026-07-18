// cover-wire.js — 封面 C:周期仪表盘 · 工程蓝图(轴测线框,无隐藏线消除)
// 同时承担封面四态切换器(A 递归 / B 拆解 / C 蓝图 / D 开箱)。
(() => {
  const U = window.U, F = U.FONT;
  const header = document.getElementById("cover");
  if (!header) return;

  /* ================= State C engine ================= */
  const WIRE = (() => {
    let cv, ctx, W = 0, H = 0, active = false, raf = 0;
    let k = 1, kTgt = 1, mx = 0, t0 = performance.now(), last = performance.now();

    const BG = "#0c1f47";
    const LC = {
      base: "#8fa8ff", gears: "#ffd9a0", price: "#ff9db1",
      dial: "#eef3ff", needle: "#9db8ff", bezel: "#ffffff",
    };
    const ZCOL = ["#7e93ad", "#a9bcd2", "#e8eefc", "#7d9bff", "#3f66ff"];
    const LAYERS = [
      { id: "base", z0: 0, z1: 15, col: LC.base, lab: "基座 · 证据闸门" },
      { id: "gears", z0: 15, z1: 33, col: LC.gears, lab: "齿轮组 · 库存 价格 产能 政策" },
      { id: "dial", z0: 33, z1: 43, col: LC.dial, lab: "刻度盘 · 五阶段" },
      { id: "needle", z0: 43, z1: 51, col: LC.needle, lab: "指针 · forcing 读数" },
      { id: "bezel", z0: 51, z1: 63, col: LC.bezel, lab: "表圈 · 市场定价层" },
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
      // same exploded-stack framing as cover-exploded: span ≈ 193u must fit H
      const SPAN = 193, TOPZ = 185;
      let u = Math.min((W - 360) / 40, (H - 120) / SPAN, H * 0.0128);
      u = Math.max(2.6, u);
      const stackTop = (63 + 114 * lay(4) + 8) * u, stackBot = 8 * u;
      const cy = (H - stackTop - stackBot) / 2 + stackTop;
      return { u, cx: W * 0.72, cy }; // right of the text column
    }
    function yaw(t) { return Math.PI / 4 + 0.14 * Math.sin(t * 0.6) + mx * 0.11; }
    function pt(x, y, z, c, yw) {
      const rx = x * Math.cos(yw) - y * Math.sin(yw);
      const ry = x * Math.sin(yw) + y * Math.cos(yw);
      return { x: c.cx + rx * c.u, y: c.cy + ry * c.u * 0.5 - z * c.u };
    }
    function lay(i) {
      const kk = U.clamp(k * 1.55 - i * 0.17, 0, 1);
      return 1 - Math.pow(1 - kk, 3);
    }
    const zOff = (i, t) => lay(i) * (i * 26 + 10) + Math.sin(t * 1.1 + i * 1.7) * 1.6 * lay(i);

    function circ(c, z, r, col, lw, yw, dash) {
      ctx.beginPath();
      for (let i = 0; i <= 48; i++) {
        const a = i / 48 * U.TAU;
        const p = pt(Math.cos(a) * r, Math.sin(a) * r, z, c, yw);
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      }
      ctx.closePath();
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
    }
    function seg(c, p, q, col, lw, dash) {
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
      ctx.strokeStyle = col; ctx.lineWidth = lw;
      ctx.setLineDash(dash || []); ctx.stroke(); ctx.setLineDash([]);
    }

    function grid() {
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(150,180,245,.10)"; ctx.lineWidth = 1;
      for (let x = 26; x < W; x += 52) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 26; y < H; y += 52) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.strokeStyle = "rgba(170,198,255,.30)";
      for (let x = 26; x < W; x += 52) for (let y = 26; y < H; y += 52) {
        ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.moveTo(x, y - 4); ctx.lineTo(x, y + 4); ctx.stroke();
      }
      // registration marks
      [[26, 26], [W - 26, 26], [26, H - 26], [W - 26, H - 26]].forEach(([x, y]) => {
        ctx.beginPath(); ctx.arc(x, y, 9, 0, U.TAU);
        ctx.moveTo(x - 13, y); ctx.lineTo(x + 13, y); ctx.moveTo(x, y - 13); ctx.lineTo(x, y + 13);
        ctx.strokeStyle = "rgba(190,210,255,.55)"; ctx.lineWidth = 1; ctx.stroke();
      });
    }

    function drawLayer(li, c, t, yw) {
      const L = LAYERS[li], off = zOff(li, t);
      const z0 = L.z0 + off, z1 = L.z1 + off, r = 15 - li * 0.4;
      const col = L.col, lw = 1.1;
      if (L.id === "gears") {
        circ(c, z0, r, col, lw, yw); circ(c, z0 + 4, r, col, lw, yw);
        for (let i = 0; i < 10; i++) {
          const a = i / 10 * U.TAU;
          seg(c, pt(Math.cos(a) * r, Math.sin(a) * r, z0, c, yw), pt(Math.cos(a) * r, Math.sin(a) * r, z0 + 4, c, yw), col, 0.7);
        }
        const gp = [[-6.5, -6.5], [6.5, -6.5], [-6.5, 6.5], [6.5, 6.5]];
        gp.forEach((g, gi) => {
          const gcol = gi === 1 ? LC.price : col;
          const spin = t * (0.5 + gi * 0.13) * (gi % 2 ? 1 : -1);
          const gr = gi === 1 ? 4.6 : 3.9;
          circ(c, z1, gr, gcol, lw, yw);
          circ(c, z1, gr * 0.4, gcol, 0.7, yw);
          for (let tt = 0; tt < 10; tt++) {
            const a = spin + tt / 10 * U.TAU;
            seg(c,
              pt(g[0] + Math.cos(a) * gr, g[1] + Math.sin(a) * gr, z1, c, yw),
              pt(g[0] + Math.cos(a) * (gr + 1.3), g[1] + Math.sin(a) * (gr + 1.3), z1, c, yw), gcol, 1.3);
          }
          for (let sp = 0; sp < 4; sp++) {
            const a = spin + sp / 4 * U.TAU;
            seg(c,
              pt(g[0] + Math.cos(a) * gr * 0.4, g[1] + Math.sin(a) * gr * 0.4, z1, c, yw),
              pt(g[0] + Math.cos(a) * gr, g[1] + Math.sin(a) * gr, z1, c, yw), gcol, 0.6);
          }
        });
        return;
      }
      if (L.id === "dial") {
        circ(c, z0, r, col, lw, yw); circ(c, z1, r, col, lw, yw);
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * U.TAU;
          seg(c, pt(Math.cos(a) * r, Math.sin(a) * r, z0, c, yw), pt(Math.cos(a) * r, Math.sin(a) * r, z1, c, yw), col, 0.6);
        }
        const a0 = Math.PI * (210 / 180), a1 = -Math.PI / 6;
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          const s0 = a0 + (a1 - a0) * (i / 5) + 0.03, s1 = a0 + (a1 - a0) * ((i + 1) / 5) - 0.03;
          for (let j = 0; j <= 16; j++) {
            const a = s0 + (s1 - s0) * j / 16;
            const p = pt(Math.cos(a) * (r - 2.6), Math.sin(a) * (r - 2.6), z1, c, yw);
            j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
          }
          ctx.strokeStyle = ZCOL[i]; ctx.lineWidth = 2.2; ctx.stroke();
        }
        for (let i = 0; i <= 20; i++) {
          const a = a0 + (a1 - a0) * (i / 20);
          seg(c,
            pt(Math.cos(a) * (r - 5), Math.sin(a) * (r - 5), z1, c, yw),
            pt(Math.cos(a) * (r - 6.6), Math.sin(a) * (r - 6.6), z1, c, yw), col, 0.7);
        }
        return;
      }
      if (L.id === "needle") {
        circ(c, z0, r * 0.32, col, lw, yw); circ(c, z0 + 2, r * 0.32, col, lw, yw);
        const baseA = Math.PI * (210 / 180) + (-Math.PI / 6 - Math.PI * (210 / 180)) * 0.86;
        const a = baseA + Math.sin(t * 0.7) * 0.03;
        const tip = pt(Math.cos(a) * (r + 1.5), Math.sin(a) * (r + 1.5), z1, c, yw);
        const tail = pt(-Math.cos(a) * 4.5, -Math.sin(a) * 4.5, z1, c, yw);
        const s1 = pt(Math.cos(a + Math.PI / 2) * 1.1, Math.sin(a + Math.PI / 2) * 1.1, z1, c, yw);
        const s2 = pt(Math.cos(a - Math.PI / 2) * 1.1, Math.sin(a - Math.PI / 2) * 1.1, z1, c, yw);
        seg(c, tail, s1, col, 1.2); seg(c, s1, tip, col, 1.2); seg(c, tip, s2, col, 1.2); seg(c, s2, tail, col, 1.2);
        seg(c, pt(0, 0, z1, c, yw), tip, "rgba(157,184,255,.4)", 0.6, [3, 3]);
        return;
      }
      if (L.id === "bezel") {
        circ(c, z0, r + 1.2, col, lw, yw); circ(c, z1, r + 1.2, col, lw, yw);
        circ(c, z1, r - 2.2, col, 0.8, yw); circ(c, z0, r - 2.2, col, 0.6, yw, [2, 3]);
        for (let i = 0; i < 12; i++) {
          const a = i / 12 * U.TAU;
          seg(c, pt(Math.cos(a) * (r + 1.2), Math.sin(a) * (r + 1.2), z0, c, yw),
            pt(Math.cos(a) * (r + 1.2), Math.sin(a) * (r + 1.2), z1, c, yw), col, 0.6);
        }
        for (let i = 0; i < 6; i++) {
          const a = i / 6 * U.TAU + 0.3;
          const p = pt(Math.cos(a) * (r + 0.1), Math.sin(a) * (r + 0.1), z1, c, yw);
          ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(1.4, c.u * 0.36), 0, U.TAU);
          ctx.strokeStyle = col; ctx.lineWidth = 0.9; ctx.stroke();
        }
        return;
      }
      // base
      circ(c, z0, r + 0.6, col, lw, yw); circ(c, z1, r + 0.6, col, lw, yw);
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * U.TAU;
        seg(c, pt(Math.cos(a) * (r + 0.6), Math.sin(a) * (r + 0.6), z0, c, yw),
          pt(Math.cos(a) * (r + 0.6), Math.sin(a) * (r + 0.6), z1, c, yw), col, 0.6);
      }
      for (let i = 0; i < 41; i++) { // 41 台账铆钉
        const a = i / 41 * U.TAU;
        const p = pt(Math.cos(a) * (r - 1.6), Math.sin(a) * (r - 1.6), z1, c, yw);
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.1, 0, U.TAU);
        ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
      }
    }

    function labels(c, t, yw) {
      const la = U.clamp((k - 0.45) * 2.4, 0, 1);
      if (la <= 0 || W < 900) return;
      const colX = W - 300;
      // evenly distributed rows in the upper-right band — never collide with the
      // title block at bottom-right, regardless of exploded anchor spread
      const rows = LAYERS.map((L, i) => ({
        L,
        anchor: pt(15, 0, (L.z0 + L.z1) / 2 + zOff(i, t), c, yw),
        y: H * 0.24 + i * (H * 0.34) / 4,
      }));
      ctx.globalAlpha = la;
      rows.forEach(r => {
        const rc = r.L.id === "gears" ? LC.price : "rgba(170,198,255,.8)";
        seg(c, { x: r.anchor.x + 4, y: r.anchor.y }, { x: colX - 10, y: r.y - 4 }, rc, 0.8);
        ctx.beginPath(); ctx.fillStyle = rc; ctx.arc(r.anchor.x + 3, r.anchor.y, 2, 0, U.TAU); ctx.fill();
        ctx.font = `700 11.5px ${F.mono}`; ctx.textAlign = "left";
        ctx.fillStyle = r.L.id === "gears" ? LC.price : "#dfe8ff";
        ctx.fillText(r.L.lab, colX, r.y - 2);
        ctx.font = `9.5px ${F.mono}`; ctx.fillStyle = "rgba(170,198,255,.65)";
        ctx.fillText(`z ${r.L.z0}–${r.L.z1} · 未消隐`, colX, r.y + 13);
      });
      ctx.globalAlpha = 1;
    }

    function titleBlock() {
      const bw = 262, bh = 66, bx = W - bw - 20, by = H - bh - 18;
      ctx.strokeStyle = "rgba(190,210,255,.7)"; ctx.lineWidth = 1;
      ctx.strokeRect(bx, by, bw, bh);
      ctx.beginPath(); ctx.moveTo(bx, by + 26); ctx.lineTo(bx + bw, by + 26);
      ctx.moveTo(bx, by + 46); ctx.lineTo(bx + bw, by + 46); ctx.stroke();
      ctx.textAlign = "left"; ctx.fillStyle = "#eef3ff";
      ctx.font = `700 11px ${F.mono}`;
      ctx.fillText("FIG. C — 周期仪表盘 · 装配蓝图", bx + 10, by + 17);
      ctx.font = `9.5px ${F.mono}`; ctx.fillStyle = "rgba(190,210,255,.85)";
      ctx.fillText(`MODE ${k > 0.6 ? "EXPLODED" : "ASSEMBLED"} · 轴测投影 · 无隐藏线消除`, bx + 10, by + 38);
      ctx.fillText("SCALE 1:1 · SHEET 1/1 · 2026-07 · 点击空白处组装/拆解", bx + 10, by + 59);
    }

    function frame(now) {
      if (!active) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = (now - t0) / 1000;
      if (!W) fit();
      k = U.ease(k, kTgt, dt, 0.28);
      const c = cam(), yw = yaw(t);
      grid();
      for (let i = 0; i < LAYERS.length; i++) drawLayer(i, c, t, yw);
      labels(c, t, yw);
      titleBlock();
      raf = requestAnimationFrame(frame);
    }
    function staticFrame() {
      fit(); if (!W) return;
      const c = cam(), yw = Math.PI / 4;
      grid();
      for (let i = 0; i < LAYERS.length; i++) drawLayer(i, c, 4.2, yw);
      labels(c, 4.2, yw);
      titleBlock();
    }

    return {
      setActive(on) {
        if (on) {
          if (!cv) { cv = document.getElementById("cover-canvas-w"); ctx = cv.getContext("2d"); }
          if (!cv) return;
          cv.style.display = ""; active = true;
          requestAnimationFrame(() => {
            fit(); last = performance.now();
            cancelAnimationFrame(raf);
            if (U.REDUCE) staticFrame(); else raf = requestAnimationFrame(frame);
          });
        } else { active = false; cancelAnimationFrame(raf); if (cv) cv.style.display = "none"; }
      },
      onClick() { kTgt = kTgt > 0.5 ? 0 : 1; },
      onMove(nx) { mx = nx; },
    };
  })();

  /* ================= 4-state switcher ================= */
  const btns = Array.from(header.querySelectorAll("#cover-mode [data-mode]"));
  const engines = {
    rec: { on: () => window.COVER_A && COVER_A.setActive(true), off: () => window.COVER_A && COVER_A.setActive(false) },
    x: { on: () => window.COVER_X && COVER_X.setActive(true), off: () => window.COVER_X && COVER_X.setActive(false) },
    w: { on: () => WIRE.setActive(true), off: () => WIRE.setActive(false) },
    d: { on: () => window.COVER_X && COVER_X.setActive(true, { intro: true }), off: () => window.COVER_X && COVER_X.setActive(false) },
  };
  let mode = "rec";
  function setMode(m, persist = true) {
    if (!engines[m]) m = "rec";
    Object.keys(engines).forEach(key => { if (key !== m) engines[key].off(); });
    engines[m].on();
    mode = m;
    header.classList.toggle("on-blue", m === "w"); // blueprint bg → light cover text
    btns.forEach(b => b.classList.toggle("on", b.dataset.mode === m));
    if (persist) try { localStorage.setItem("cover-mode", m); } catch (e) { }
  }
  btns.forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));

  // pointer parallax + click-to-toggle on the canvas itself (not on UI chrome)
  header.addEventListener("pointermove", e => {
    const r = header.getBoundingClientRect();
    const nx = U.clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
    if (mode === "x" || mode === "d") window.COVER_X && COVER_X.onMove(nx);
    if (mode === "w") WIRE.onMove(nx);
  });
  header.addEventListener("click", e => {
    if (e.target.closest("button, a, .cover-mode, .cover-chips")) return;
    if (mode === "x" || mode === "d") window.COVER_X && COVER_X.onClick(e.clientX, e.clientY);
    if (mode === "w") WIRE.onClick();
  });

  // initial mode: ?cover= > localStorage > rec
  const q = new URLSearchParams(location.search).get("cover");
  let saved = null;
  try { saved = localStorage.getItem("cover-mode"); } catch (e) { }
  setMode(q || saved || "rec", false);
})();
