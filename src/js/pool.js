// 个股推荐池渲染：window.POOL → #pool-host
// 五桶卡片 + 桶摘要条 + 每桶 Top8 展开。数据由 research/data/compute_stock_pool.py 生成。
(() => {
  const host = document.getElementById("pool-host");
  if (!host || !window.POOL) return;
  const P = window.POOL;
  const el = (tag, cls, txt) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };
  const pct = (v, digits = 1) =>
    v == null ? "—" : (v > 0 ? "+" : "") + v.toFixed(digits) + "%";
  const money = (v) => (v == null ? "—" : v.toFixed(2) + " 元");
  const yi = (v) => (v == null ? "—" : Math.round(v / 1e8).toLocaleString() + " 亿");
  const clip = (t, n) => (t && t.length > n ? t.slice(0, n) + "…" : t || "");

  // ── 桶摘要条 ──
  const strip = el("div", "pl-strip");
  P.buckets.forEach((b) => {
    const a = el("a", "pl-chip pl-" + b.key);
    a.href = "#pool-b-" + b.key;
    a.appendChild(el("span", "pl-chip-l", b.label));
    a.appendChild(el("b", "pl-chip-n", String(b.count)));
    strip.appendChild(a);
  });
  const asof = el("p", "pl-asof",
    `行情与估值口径：${P.as_of} 收盘 · 不复权日K（Wind / 恒生聚源 Gildata 双源对齐）· 共 ${P.stocks.length} 家 · 点击桶标签跳转`);
  host.appendChild(strip);
  host.appendChild(asof);

  // ── 单卡 ──
  function card(s) {
    const c = el("div", "pl-card pl-" + s.bucket);
    const head = el("div", "pl-card-head");
    const nm = el("p", "pl-name", s.name + " ");
    nm.appendChild(el("span", "pl-code", s.code));
    head.appendChild(nm);
    head.appendChild(el("p", "pl-ind", `${s.ind} · 档位 ${s.zone}`));
    c.appendChild(head);
    const tags = el("p", "pl-tags");
    if (s.role) tags.appendChild(el("span", "pl-role", s.role));
    if (s.trend) tags.appendChild(el("span", "pl-trend", s.trend));
    if (tags.childNodes.length) c.appendChild(tags);

    const m = s.m;
    const rows = [
      ["现价", money(m.close), "距52周高", pct(m.dist_hi)],
      ["vs MA20", pct(m.ma20 ? (m.close / m.ma20 - 1) * 100 : null), "vs MA60", pct(m.ma60 ? (m.close / m.ma60 - 1) * 100 : null)],
      ["20日涨幅", pct(m.r20), "60日涨幅", pct(m.r60)],
      ["量比(20/60)", m.vol_ratio == null ? "—" : m.vol_ratio.toFixed(2), "距52周低", pct(m.dist_lo)],
      ["PE(TTM)", s.pe == null ? "—" : s.pe.toFixed(1), "总市值", yi(s.mktcap)],
    ];
    const tb = el("table", "pl-metrics");
    rows.forEach(([k1, v1, k2, v2]) => {
      const tr = el("tr");
      tr.appendChild(el("td", "k", k1)); tr.appendChild(el("td", "v", v1));
      tr.appendChild(el("td", "k", k2)); tr.appendChild(el("td", "v", v2));
      tb.appendChild(tr);
    });
    c.appendChild(tb);

    const trig = { blue: "触发价 MA20", yellow: "触发价 MA60", green: "离场线 MA60",
                   orange: "离场线 MA20", red: "解除线 MA20" }[s.bucket];
    const trigPx = { blue: m.ma20, yellow: m.ma60, green: m.ma60,
                     orange: m.ma20, red: m.ma20 }[s.bucket];
    if (trig && trigPx != null)
      c.appendChild(el("p", "pl-trigger", `${trig}：${trigPx} 元（距52周高 ${pct(m.dist_hi)}）`));

    if (s.q1) c.appendChild(el("p", "pl-q1", clip(s.q1, 60)));
    else c.appendChild(el("p", "pl-q1 dim", "2026Q1 财务速览未收录（不在原深潜名单内）"));
    c.appendChild(el("p", "pl-cond", "成立:" + clip(s.cond, 64)));
    c.appendChild(el("p", "pl-veto", "证伪:" + clip(s.veto, 64)));
    return c;
  }

  // ── 每桶一节 ──
  const TOPN = 8;
  P.buckets.forEach((b) => {
    const stocks = P.stocks
      .filter((s) => s.bucket === b.key)
      .sort((x, y) => x.score - y.score);
    const sec = el("section", "pl-bucket pl-b-" + b.key);
    sec.id = "pool-b-" + b.key;
    const h = el("h3", "pl-b-t");
    h.appendChild(document.createTextNode(b.label + " "));
    h.appendChild(el("b", "pl-b-n", b.count + " 家"));
    sec.appendChild(h);
    sec.appendChild(el("p", "pl-b-d", b.desc + "（排序 = 距离下一触发信号最近者在前）"));
    if (!stocks.length) {
      sec.appendChild(el("p", "pl-empty", "本期无触发——该桶为实时预警位，条件满足时自动出现。"));
      host.appendChild(sec);
      return;
    }
    const grid = el("div", "pl-grid");
    stocks.slice(0, TOPN).forEach((s) => grid.appendChild(card(s)));
    sec.appendChild(grid);
    if (stocks.length > TOPN) {
      const det = el("details", "pl-more");
      det.appendChild(el("summary", null, `展开其余 ${stocks.length - TOPN} 家（同桶按触发距离续排）`));
      const g2 = el("div", "pl-grid");
      stocks.slice(TOPN).forEach((s) => g2.appendChild(card(s)));
      det.appendChild(g2);
      sec.appendChild(det);
    }
    host.appendChild(sec);
  });
})();
