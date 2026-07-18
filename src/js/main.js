// main.js — scroll engine · tables · lists · drill wiring · entrances
(() => {
  const R = window.RPT, S = window.SRC, U = window.U;
  const $ = s => document.querySelector(s);

  // ── source lookup: "K7" → anchor object ──
  const srcByK = Object.fromEntries(S.map(x => [x.k, x]));
  window.srcRef = k => {
    const s = srcByK[k];
    return s ? `${s.k} · ${s.title}（${s.date}）` : k;
  };

  // ── smooth scroll for chips / subnav / topnav ──
  document.addEventListener("click", e => {
    const a = e.target.closest("[data-goto], .subnav a, .tn-item > a, .tn-sub a, .tn-brand");
    if (!a) return;
    const href = a.dataset.goto || a.getAttribute("href");
    if (!href || !href.startsWith("#")) return;
    const t = document.querySelector(href);
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: window.U.REDUCE ? "auto" : "smooth", block: "start" });
  });

  // ── topnav show/hide + progress + current section ──
  const nav = $("#topnav"), bar = $("#tn-bar"), rail = $("#dash-rail");
  const secs = [...document.querySelectorAll("main section[data-win], footer#sec-sources")];
  const navMap = { "sec-exec": "sec-exec", "sec-method": "sec-exec", "sec-glossary": "sec-exec", "sec-map": "sec-map",
    "sec-ai": "deep", "sec-hog": "deep", "sec-baijiu": "deep", "sec-ne": "deep", "sec-pharma": "deep", "sec-auto": "deep",
    "sec-nonferrous": "deep", "sec-defense": "deep", "sec-nonbank": "deep", "sec-machinery": "deep",
    "sec-computer": "deep", "sec-media": "deep", "sec-chem": "deep",
    "sec-matrix": "sec-matrix", "sec-dossier": "sec-dossier",
    "sec-company": "sec-matrix", "sec-monitor": "sec-monitor", "sec-analogs": "sec-monitor",
    "sec-limits": "sec-monitor", "sec-sources": "sec-sources" };
  function onScroll() {
    const y = window.scrollY;
    const past = y > window.innerHeight * 0.62;
    nav.classList.toggle("on", past);
    rail.classList.toggle("on", past);
    const doc = document.documentElement;
    const p = U.clamp(y / (doc.scrollHeight - window.innerHeight), 0, 1);
    bar.style.width = (p * 100).toFixed(1) + "%";
    let cur = null;
    for (const s of secs) { if (s.getBoundingClientRect().top < window.innerHeight * 0.45) cur = s.id; }
    if (cur && navMap[cur]) {
      nav.querySelectorAll(".tn-item > a").forEach(a =>
        a.classList.toggle("cur", a.dataset.nav === navMap[cur]));
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // ── entrance animation: [data-io] elements ──
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("io-in"); io.unobserve(e.target); }
  }), { threshold: 0.12 });
  document.querySelectorAll(".prose h2, .prose p, .quote-card, .term-mag, .chart-frame, .tbl-host").forEach(el => {
    el.classList.add("io"); io.observe(el);
  });

  // ── generic data-table renderer ──
  function dtTable(host, t, opts = {}) {
    const el = typeof host === "string" ? $(host) : host;
    if (!el || !t) return;
    const wrap = document.createElement("div");
    wrap.innerHTML = `<p class="chart-title">${t.title}</p>
      <p class="chart-sub">${opts.sub || "点击带下划线数字可钻取 · 口径与单位见表注"}</p>`;
    const tb = document.createElement("table");
    tb.className = "dt";
    tb.innerHTML = "<thead><tr>" + t.columns.map(c => `<th>${c}</th>`).join("") + "</tr></thead>";
    const body = document.createElement("tbody");
    t.rows.forEach((r, ri) => {
      const tr = document.createElement("tr");
      if (opts.hl && opts.hl(r, ri)) tr.className = "hl";
      r.forEach((c, ci) => {
        const td = document.createElement("td");
        if (opts.cell) opts.cell(td, c, ci, r, ri);
        else { td.textContent = c == null ? "—" : String(c); if (typeof c === "number") td.className = "num"; }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    tb.appendChild(body);
    wrap.appendChild(tb);
    if (opts.note) { const n = document.createElement("p"); n.className = "chart-src"; n.textContent = opts.note; wrap.appendChild(n); }
    el.appendChild(wrap);
  }

  // clickable number chip
  function kn(v, info, neg) {
    const s = document.createElement("span");
    s.className = "kn" + (neg ? " neg" : "");
    s.textContent = v;
    U.drillable(s, info);
    return s;
  }

  // ── §2 sw31 table ──
  dtTable("#sw31-table", R.tables.table_sw31_master, {
    sub: "31 个申万一级行业 · 阶段判定全部为扫描框架「暂定」口径 · 2026-07-17 收盘",
    hl: r => ["电子", "通信", "电力设备", "医药生物", "农林牧渔", "食品饮料", "汽车"].includes(r[0]),
    cell: (td, c, ci, r) => {
      td.textContent = c == null ? "—" : String(c);
      if (typeof c === "number") td.className = "num";
      if (ci === 3 && typeof c === "number") {
        td.innerHTML = ""; td.appendChild(kn(c.toFixed(1) + "%", {
          title: r[0] + " · YTD 涨跌幅", value: c.toFixed(1) + "%",
          sub: `2026-01-01 至 2026-07-17 收盘;近 20 日 ${r[4]}%;2023 以来区间位置 ${r[5]}%`,
          source: "K33 · industry_master.csv（申万/Wind,2026-07-17）",
        }, c < 0));
      }
      if (ci === 8 && typeof c === "number") {
        td.innerHTML = "";
        if (r[1] === "801780.SI") { // 银行:扫描口径估算 → 缺口处理,不引用为事实
          td.appendChild(kn("—*", {
            title: r[0] + " · 2026Q1 营收同比", value: "缺口",
            sub: "该数字为扫描口径估算(约 +7.59%),未经旧数据闸门核实,按缺口处理不引用为事实",
            source: "K33 · industry_master.csv（2026Q1 财务,2026-07-17）",
          }, false));
          return;
        }
        td.appendChild(kn((c > 0 ? "+" : "") + c.toFixed(1) + "%", {
          title: r[0] + " · 2026Q1 营收同比", value: (c > 0 ? "+" : "") + c.toFixed(1) + "%",
          sub: `阶段判定:${r[2]} · 2026Q1 毛利率同比变动 ${r[9]}pt`,
          source: "K33 · industry_master.csv（2026Q1 财务,2026-07-17）",
        }, c < 0));
      }
    },
    note: "注:蓝色高亮行 = 六个深潜行业;银行 Q1 营收同比为扫描口径估算(约 +7.59%),未核实,按缺口 —* 处理;阶段判定置信度均为「暂定」(扫描框架未逐行业过旧数据闸门)。",
  });

  // ── company tables (six industries) — cell renderer keyed by column name ──
  const COMP = {
    "table-companies-ai":   { t: R.tables.table_companies_ai_compute, ds: "K36 · AI 算力链深潜 companies_summary.csv(Gildata,2026-07-17)" },
    "table-companies-hog":  { t: R.tables.table_companies_hog,        ds: "K37 · 猪周期深潜 company_layer_2026.csv(2026-07-17)" },
    "table-companies-baijiu": { t: R.tables.table_companies_baijiu,   ds: "K38 · 白酒深潜研究§8(Gildata+自算 PE 序列,2026-07-17)" },
    "table-companies-ne":   { t: R.tables.table_companies_new_energy, ds: "K39 · 新能源深潜研究§8(Gildata 07-07/07-17 两口径)" },
    "table-companies-pharma": { t: R.tables.table_companies_pharma,   ds: "K40 · 创新药深潜研究§8(Wind/Gildata,2026-07-17)" },
    "table-companies-auto": { t: R.tables.table_companies_autos,      ds: "K41 · 汽车深潜研究§8(Gildata+乘联分会,2026-07-17)" },
  };
  Object.entries(COMP).forEach(([id, cfg]) => {
    const host = document.getElementById(id);
    if (!host) return;
    const cols = cfg.t.columns;
    dtTable(host, cfg.t, {
      sub: "公司表 · 市值/估值为 2026-07-17 收盘 · 点击关键数字钻取依据",
      cell: (td, c, ci, r) => {
        const col = cols[ci], name = r[0], code = r[1];
        const drill = (val, sub) => ({ title: `${name}（${code}）· ${col}`, value: val, sub, source: cfg.ds });
        td.textContent = c == null ? "—" : String(c);
        if (typeof c === "number") td.className = "num";
        // make valuation & growth key numbers drillable
        if (["市值(亿元)", "市值", "PE_TTM", "PB", "PB_LF", "资产负债率", "股息率", "股息率(静态/滚动)"].includes(col) && c != null && c !== "—") {
          td.innerHTML = "";
          td.appendChild(kn(typeof c === "number" ? String(c) : String(c), drill(String(c), `角色:${r[2]} · 周期位置:${r[r.length - 1]}`)));
        }
        if ((col.includes("同比") || col.includes("归母")) && typeof c === "string" && /[+\-−]?\d/.test(c) && c !== "—" && c.length < 40) {
          td.innerHTML = "";
          td.appendChild(kn(c, drill(c, `${name} 2026Q1 表现 · 周期位置:${r[r.length - 1]}`)));
        }
      },
      note: "来源:" + cfg.ds + " · 完整口径冲突与缺口见 §12 局限性。",
    });
  });

  // ── monitor table ──
  dtTable("#monitor-table", R.tables.table_monitoring_dashboard, {
    sub: "18 个行业信号台账 · met = 已达阈值 / partial = 部分兑现 / missing = 读数缺失 · 全部可点",
    hl: r => r[6] === "missing",
    cell: (td, c, ci, r) => {
      td.textContent = c == null ? "—" : String(c);
      if (ci === 6) {
        td.innerHTML = "";
        const st = document.createElement("span");
        st.className = "kn" + (c === "missing" ? " neg" : "");
        st.textContent = c.toUpperCase();
        U.drillable(st, {
          title: `${r[0]} · ${r[1]}`, value: String(c).toUpperCase(),
          sub: `当前值:${r[3]} · 阈值:${r[4]} · 预期时滞:${r[5]} · 证伪条件:${r[7]}`,
          source: String(r[8]),
        });
        td.appendChild(st);
      }
      if (ci === 3 || ci === 4) td.style.maxWidth = "260px";
    },
    note: "跨行业 5 信号(全 A 盈利/调整性质/护盘资金/外部风险/中报预喜率)见上图 causal horizon 右簇;来源:六行业深潜研究§7 + 31 行业扫描(2026-07-17/18)。",
  });

  // ── cohort table ──
  dtTable("#cohort-table", R.tables.table_cohort_ledger, {
    sub: "队列台账 41 条 · 六个窗口的当时队列全部含失败者 · 幸存者偏差的制度性排除",
    hl: r => /退市|重整|破产|并购|出局|衰落/.test(r[5]),
    cell: (td, c, ci, r) => {
      td.textContent = c == null ? "—" : String(c);
      if (ci === 5) {
        td.innerHTML = "";
        const bad = /退市|重整|破产|并购|出局|衰落|戴帽|破发/.test(c);
        const s = document.createElement("span");
        s.className = "kn" + (bad ? " neg" : "");
        s.textContent = c;
        U.drillable(s, {
          title: `${r[1]} · 结局类型`, value: c,
          sub: `${r[0]} · 当时角色:${r[2]} · 当时状态:${r[3]} · 后续:${r[4]}`,
          source: "六行业深潜研究§4.1 队列重建(2026-07-18)",
        });
        td.appendChild(s);
      }
    },
    note: "来源:六行业深潜研究§4.1(2026-07-18);台账为定性记录,无数值单位。",
  });

  // ── analog list ──
  const al = $("#analog-list");
  if (al) {
    const box = document.createElement("div");
    box.innerHTML = `<p class="chart-title">26 个选定窗口 + 6 个明确拒绝</p>
      <p class="chart-sub">CONTEMPORANEOUS / NEAR = 当时可知序列已重建 · HINDSIGHT = 事后锚,仅作对照 · 每行可点</p>`;
    const mk = (w, rej) => {
      const d = document.createElement("div");
      d.className = "analog-row" + (rej ? " rej" : "");
      const vin = rej ? "REJECTED" : (w.vintage === "hindsight" ? "hindsight" : w.vintage.replace("_", " "));
      d.innerHTML = `<div class="a-head"><span class="a-name">${w.name}</span>
        <span><span class="a-vin ${w.vintage === "hindsight" ? "hind" : ""}">${vin}</span>
        <span class="a-per">${w.period || ""}</span></span></div>
        <p class="a-mech">${rej ? w.why_rejected : w.mechanism}</p>`;
      U.drillable(d, rej ? {
        title: "拒绝原因", value: w.name, sub: w.why_rejected, source: "cycle_report.json · analogs.rejected",
      } : {
        title: `${w.name}（${w.period}）`, value: w.archetype,
        sub: `机制:${w.mechanism} · 映射:${w.transmission} · 证据:${w.temporal_evidence_summary}`,
        source: `cycle_report.json · analogs.selected · vintage=${w.vintage}`,
      });
      return d;
    };
    R.analogs.selected.forEach(w => box.appendChild(mk(w, false)));
    R.analogs.rejected.forEach(w => box.appendChild(mk(w, true)));
    al.appendChild(box);
  }

  // ── limitations list ──
  const ll = $("#limits-list");
  if (ll) {
    const ol = document.createElement("ol");
    ol.className = "laws";
    R.limitations.forEach((t, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<b>缺口 ${String(i + 1).padStart(2, "0")}</b> · ${t}`;
      ol.appendChild(li);
    });
    ll.appendChild(ol);
  }

  // ── sources register ──
  const sl = $("#source-list");
  if (sl) {
    const catOf = t => ({ primary: "primary", regulator: "primary", broker: "broker", database: "industry", news: "industry", secondary: "kimi" }[t] || "kimi");
    const catName = { primary: "一手/监管", broker: "券商研究", industry: "行业/数据", kimi: "汇编/本地" };
    S.forEach(s => {
      const row = document.createElement("div");
      row.className = "src-row";
      row.innerHTML = `<span class="s-fact"><span class="src-cat ${catOf(s.type)}">${catName[catOf(s.type)]}</span><b>${s.k}</b> · ${s.title}</span>
        <span class="s-cite">${s.date} · ${s.url}</span>`;
      U.drillable(row, { title: s.k + " · 来源锚点", value: s.date, sub: s.title, source: s.url });
      sl.appendChild(row);
    });
  }
})();
