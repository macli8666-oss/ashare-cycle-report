/* ============================================================
   COVER · STATE A — 递归仪表盘墙 (recursion)
   One gauge zooms out into a wall of gauges, endlessly.
   Every cell is a real industry gauge from the 31-trade map.
   ============================================================ */
(function () {
  const cv = document.getElementById('cover-canvas');
  if (!cv || !window.RPT) return;
  const IND = (RPT.industries || []);
  const NZ = IND.length || 31;
  const MARKET_ZONE = 2.71; // 上升象限 10/31 的全市场姿态

  const PI = Math.PI, A0 = PI * 0.83, A1 = PI * 2.17;
  const zA = z => A0 + (A1 - A0) * (z / 4);
  const INK = '#23242c', PAPER = '#f4f1ea', BLUE = '#2251ff';

  /* ---------- one gauge face ---------- */
  function gauge(x, cx, cy, r, zone, detail) {
    // bezel
    x.beginPath(); x.arc(cx, cy, r, 0, 7);
    x.fillStyle = PAPER; x.fill();
    x.lineWidth = Math.max(1, r * 0.045); x.strokeStyle = INK; x.stroke();
    x.beginPath(); x.arc(cx, cy, r * 0.9, 0, 7);
    x.lineWidth = Math.max(0.6, r * 0.014); x.globalAlpha = 0.5; x.stroke(); x.globalAlpha = 1;
    const ri = r * 0.8;
    // 5 zone arcs: ink-scale, the live zone in blue
    for (let z = 0; z < 5; z++) {
      const live = Math.floor(Math.min(4.49, Math.max(0, zone))) === z;
      x.beginPath(); x.arc(cx, cy, ri, zA(z) + 0.03, zA(z + 1) - 0.03);
      x.lineWidth = Math.max(1.2, r * 0.06);
      x.strokeStyle = live ? BLUE : INK;
      x.globalAlpha = live ? 0.95 : 0.16 + z * 0.05; x.stroke(); x.globalAlpha = 1;
    }
    if (detail) { // tick ring
      x.strokeStyle = INK; x.globalAlpha = 0.55;
      for (let i = 0; i <= 40; i++) {
        const a = A0 + (A1 - A0) * i / 40, L = i % 10 ? 0.035 : 0.07;
        x.beginPath();
        x.moveTo(cx + Math.cos(a) * ri * 0.9, cy + Math.sin(a) * ri * 0.9);
        x.lineTo(cx + Math.cos(a) * ri * (0.9 - L * 2), cy + Math.sin(a) * ri * (0.9 - L * 2));
        x.lineWidth = Math.max(0.5, r * 0.006); x.stroke();
      }
      x.globalAlpha = 1;
    }
    // needle
    const a = zA(Math.min(4.49, Math.max(0, zone)));
    x.beginPath();
    x.moveTo(cx - Math.cos(a) * r * 0.1, cy - Math.sin(a) * r * 0.1);
    x.lineTo(cx + Math.cos(a) * ri * 0.86, cy + Math.sin(a) * ri * 0.86);
    x.lineWidth = Math.max(1.4, r * 0.035); x.strokeStyle = INK; x.lineCap = 'round'; x.stroke();
    x.beginPath(); x.arc(cx, cy, r * 0.07, 0, 7); x.fillStyle = INK; x.fill();
    x.beginPath(); x.arc(cx, cy, r * 0.028, 0, 7); x.fillStyle = BLUE; x.fill();
  }

  /* ---------- tile cache (small cells) ---------- */
  const tiles = new Map();
  function tile(zone) {
    const key = Math.round(Math.min(4.49, Math.max(0, zone)) * 4);
    if (tiles.has(key)) return tiles.get(key);
    const S = 120, c = document.createElement('canvas');
    c.width = S * 2; c.height = S * 2;
    const x = c.getContext('2d'); x.scale(2, 2);
    gauge(x, S / 2, S / 2, S / 2 - 3, key / 4, false);
    tiles.set(key, c); return c;
  }

  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663) ^ (x * y * 2971215073)) >>> 0;
  const cellInd = (x, y) => (x === 0 && y === 0) ? null : IND[hash(x, y) % NZ];

  /* ---------- world ---------- */
  const CS = 150;          // cell pitch in px at scale 1
  const RANGE = 2.9;       // zoom range per cycle
  const CYCLE = 12000;     // ms per loop
  let W = 0, H = 0, ctx = null, raf = null, t0 = 0, born = new Map();

  function fit() {
    const b = U.bindCanvas(cv);
    const f = b.fit();          // bindCanvas returns {fit(), ctx}; fit() returns {w,h,cx,cy}
    W = f.w; H = f.h; ctx = b.ctx;
  }

  function drawScene(s, t, alpha) {
    if (alpha <= 0) return;
    ctx.save(); ctx.globalAlpha = alpha;
    const cs = CS * s, rad = Math.ceil(Math.hypot(W, H) / 2 / cs) + 1;
    const cx = W * 0.5, cy = H * 0.52;
    for (let gy = -rad; gy <= rad; gy++) for (let gx = -rad; gx <= rad; gx++) {
      const px = cx + gx * cs, py = cy + gy * cs;
      if (px < -cs || px > W + cs || py < -cs || py > H + cs) continue;
      const d = Math.max(Math.abs(gx), Math.abs(gy));
      // cells ignite ring by ring as the wall expands
      const on = Math.min(1, Math.max(0, (t / 2600) * 1.35 - d * 0.62 + 0.65));
      if (on <= 0) continue;
      const key = gx + ',' + gy;
      if (on > 0.04 && !born.has(key)) born.set(key, t);
      const age = t - (born.get(key) || 0);
      const ind = cellInd(gx, gy);
      const zone = ind ? ind.zone : MARKET_ZONE;
      const size = cs * 0.86;
      ctx.save();
      ctx.globalAlpha = alpha * Math.min(1, on * 1.6);
      ctx.translate(px, py);
      if (size > 150) { // near field: draw full-detail gauge + label
        gauge(ctx, 0, 0, size / 2, zone, true);
        if (size > 200 && ind) {
          ctx.font = `600 ${Math.round(size * 0.052)}px ${U.FONT.serif}`;
          ctx.textAlign = 'center'; ctx.fillStyle = INK;
          ctx.fillText(ind.name, 0, size * 0.5 + size * 0.085);
          ctx.font = `${Math.round(size * 0.045)}px ${U.FONT.mono}`;
          ctx.fillStyle = U.PAL.accent;
          ctx.fillText((ind.ytd >= 0 ? '+' : '') + ind.ytd.toFixed(1) + '% · YTD', 0, size * 0.5 + size * 0.085 + size * 0.062);
        }
      } else {
        ctx.drawImage(tile(zone), -size / 2, -size / 2, size, size);
      }
      // ignition flash — electric blue ring
      if (age < 620) {
        const f = 1 - age / 620;
        ctx.beginPath(); ctx.arc(0, 0, size * (0.5 + 0.24 * (1 - f)), 0, 7);
        ctx.lineWidth = 2.5 * f + 0.5; ctx.strokeStyle = BLUE; ctx.globalAlpha = alpha * f * 0.85; ctx.stroke();
      }
      ctx.restore();
    }
    // viewfinder on the central gauge
    const csz = cs * 0.86;
    if (csz > 150) {
      const m = csz * 0.62, L = csz * 0.16;
      ctx.strokeStyle = BLUE; ctx.lineWidth = Math.max(1.4, csz * 0.008); ctx.globalAlpha = alpha * 0.9;
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
        ctx.beginPath();
        ctx.moveTo(cx + sx * m, cy + sy * m - sy * L); ctx.lineTo(cx + sx * m, cy + sy * m); ctx.lineTo(cx + sx * m - sx * L, cy + sy * m);
        ctx.stroke();
      });
      ctx.globalAlpha = alpha;
    }
    ctx.restore();
  }

  function vignette() {
    const g = ctx.createRadialGradient(W / 2, H * 0.52, Math.min(W, H) * 0.34, W / 2, H * 0.52, Math.max(W, H) * 0.72);
    g.addColorStop(0, 'rgba(244,241,234,0)'); g.addColorStop(1, 'rgba(35,36,44,0.14)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  function wash() { // text-column legibility (same treatment as State B)
    ctx.fillStyle = 'rgba(255,255,255,.34)'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W * 0.66, 0);
    g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.68, 'rgba(255,255,255,.62)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W * 0.66, H);
  }

  function frame(now) {
    if (!W || !H) fit();
    const t = now - t0;
    const u = (t % CYCLE) / CYCLE;
    const s = Math.pow(RANGE, u);
    ctx.clearRect(0, 0, W, H);
    drawScene(s / RANGE, t, Math.min(1, Math.max(0, (u - 0.82) / 0.18))); // incoming layer fades in
    drawScene(s, t, 1);
    wash();
    vignette();
    raf = requestAnimationFrame(frame);
  }
  function staticFrame() {
    fit(); if (!W) return;
    ctx.clearRect(0, 0, W, H);
    drawScene(1.55, 9000, 1); wash(); vignette();
  }

  window.COVER_A = {
    setActive(on) {
      if (on) {
        cv.style.display = '';
        requestAnimationFrame(() => { // deferred fit — canvas may have been display:none
          fit(); born = new Map(); t0 = performance.now();
          cancelAnimationFrame(raf);
          if (U.REDUCE) staticFrame(); else raf = requestAnimationFrame(frame);
        });
      } else { cv.style.display = 'none'; cancelAnimationFrame(raf); raf = null; }
    }
  };
})();
