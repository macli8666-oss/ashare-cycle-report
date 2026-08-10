// 信号台账渲染：window.LEDGER → #ledger-host（§8.86）
(() => {
  const host = document.getElementById("ledger-host");
  if (!host || !window.LEDGER) return;
  const L = window.LEDGER;
  const el = (tag, cls, txt) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (txt != null) n.textContent = txt;
    return n;
  };
  const pct = (v) => (v == null ? "—" : (v > 0 ? "+" : "") + v.toFixed(1) + "%");
  const r = L.rules;

  // ── 规则与汇总条 ──
  const strip = el("div", "lg-strip");
  [
    ["规则版本", "v" + L.rules_version],
    ["入场", `收复MA60·幅度≤${r.entry_band * 100}%`],
    ["止损", `连续${r.stop_days}日收MA60下`],
    ["止盈", `破MA${r.tp_ma} 或 峰值回撤${r.tp_dd * 100}%`],
    ["已完结", L.stats.closed_n + " 笔"],
    ["胜率", (L.stats.win_rate ?? "—") + "%"],
    ["平均盈亏", (L.stats.avg_pnl ?? "—") + "%"],
    ["平均持有", (L.stats.avg_days ?? "—") + " 天"],
  ].forEach(([k, v]) => {
    const c = el("div", "lg-chip");
    c.appendChild(el("span", "lg-chip-k", k));
    c.appendChild(el("b", "lg-chip-v", String(v)));
    strip.appendChild(c);
  });
  host.appendChild(strip);
  host.appendChild(el("p", "lg-asof",
    `台账口径：信号=收盘上穿MA60，次日开盘价模拟成交（不含滑点/涨跌停限制）· 数据截至 ${L.as_of} · 每日收盘后自动更新`));

  function table(title, sub, cols, rows, cellCls) {
    const wrap = el("div", "lg-sec");
    const h = el("h3", "lg-t", title + " ");
    h.appendChild(el("span", "lg-sub", sub));
    wrap.appendChild(h);
    const tb = el("table", "lg-table");
    const trh = el("tr");
    cols.forEach((c) => trh.appendChild(el("th", null, c)));
    tb.appendChild(trh);
    rows.forEach((row) => {
      const tr = el("tr");
      row.forEach((v, i) => {
        const td = el("td", cellCls ? cellCls(v, i, row) : null, v == null ? "—" : String(v));
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    if (!rows.length) wrap.appendChild(el("p", "lg-empty", "暂无记录"));
    else wrap.appendChild(tb);
    host.appendChild(wrap);
    return tb;
  }
  const pnlCls = (v, i, row) =>
    i === 0 ? "nm" : (String(row[0]) && (i === 4 || i === 7) && String(v).startsWith("+") ? "pos" : (i === 4 || i === 7) && String(v).startsWith("-") ? "neg" : null);

  // ── 待入场 ──
  if (L.pending.length)
    table("🕐 待入场", L.pending.length + " 笔 · 信号已触发，次日开盘价成交", ["股票", "信号日", "信号收盘", "MA60"],
      L.pending.map((t) => [t.name, t.signal_date, t.signal_px, t.signal_ma60]));

  // ── 进行中 ──
  table("📈 进行中", L.open.length + " 笔 · 每日收盘更新", ["股票", "入场日", "入场价", "现价", "浮盈", "天数", "离场线", "最大浮盈", "状态"],
    L.open.map((t) => [t.name, t.entry_date, t.entry_px, t.last_px, pct(t.float_pct), t.days,
                       t.exit_line, pct(t.max_up), t.pending_exit ? "待平仓:" + t.pending_exit.slice(0, 12) : "持有"]),
    pnlCls);

  // ── 已完结（近 20 笔 + 展开全部）──
  const closedRows = (ts) => ts.map((t) => [t.name, t.signal_date, t.entry_date, t.entry_px,
    t.exit_date, t.exit_px, pct(t.pnl), t.days, pct(t.max_up), (t.reason || "").replace(/^止盈：|^止损：/, "")]);
  const recent = L.closed.slice(0, 20);
  table("📕 已完结", `共 ${L.closed.length} 笔 · 展示最近 20 笔 · 模拟口径`, ["股票", "信号日", "入场日", "入场价", "出场日", "出场价", "盈亏", "天数", "最大浮盈", "出场原因"],
    recent.length ? closedRows(recent).map((r2) => r2) : [],
    (v, i, row) => (i === 6 ? (String(v).startsWith("+") ? "pos" : "neg") : i === 0 ? "nm" : null));
  if (L.closed.length > 20) {
    const det = el("details", "lg-more");
    det.appendChild(el("summary", null, `展开全部 ${L.closed.length} 笔已完结记录`));
    const tb = el("table", "lg-table");
    const trh = el("tr");
    ["股票", "信号日", "入场日", "入场价", "出场日", "出场价", "盈亏", "天数", "最大浮盈", "出场原因"].forEach((c) => trh.appendChild(el("th", null, c)));
    tb.appendChild(trh);
    closedRows(L.closed.slice(20)).forEach((row) => {
      const tr = el("tr");
      row.forEach((v, i) => tr.appendChild(el("td", i === 6 ? (String(v).startsWith("+") ? "pos" : "neg") : null, v == null ? "—" : String(v))));
      tb.appendChild(tr);
    });
    det.appendChild(tb);
    host.appendChild(det);
  }

  // ── 行业统计 + 规则变更日志 ──
  if (L.stats.by_ind && L.stats.by_ind.length)
    table("🏷️ 分行业统计", "按已完结信号归属行业 · 样本小的别当真", ["行业", "笔数", "胜率", "平均盈亏"],
      L.stats.by_ind.map((d) => [d.ind, d.n, d.win_rate + "%", (d.avg_pnl > 0 ? "+" : "") + d.avg_pnl + "%"]),
      (v, i) => (i === 3 ? (String(v).startsWith("+") ? "pos" : "neg") : null));

  const log = el("div", "lg-sec");
  log.appendChild(el("h3", "lg-t", "🧬 规则进化日志 "));
  const ul = el("ul", "lg-log");
  L.changelog.forEach((c) => {
    ul.appendChild(el("li", null, `${c.date} · ${c.change} · ${JSON.stringify(c.params)}${c.reason && c.reason !== "—" ? " · " + c.reason : ""}`));
  });
  log.appendChild(ul);
  host.appendChild(log);
})();
