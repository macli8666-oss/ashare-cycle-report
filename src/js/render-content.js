// render-content.js — CNT-driven renderers:
// §0 大白话注入(6 旧章节) · 大白话词典 · 7 个新深潜章节 · 行业公司矩阵 · 17 张全景档案卡
// 视觉语言复用 main.js 的 table.dt / .kn / U.showDrill;数字全部来自 window.CNT,缺口画"—"。
(() => {
  const C = window.CNT, U = window.U;
  if (!C || !U) return;
  const $ = s => document.querySelector(s);
  const el = (tag, cls, txt) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  };
  const stripTail = s => (s || "").replace(/\s*---\s*$/, "").trim();
  const clipTxt = (s, n) => {
    s = s || "";
    return s.length > n ? s.slice(0, n - 1).replace(/[，；、。：\s]+$/, "") + "…" : s;
  };

  // ── shared: drillable number chip + generic table (same look as main.js) ──
  function kn(v, info, neg) {
    const s = el("span", "kn" + (neg ? " neg" : ""), v);
    U.drillable(s, info);
    return s;
  }
  function dtTable(host, t, opts = {}) {
    const wrap = el("div");
    wrap.innerHTML = `<p class="chart-title">${t.title}</p><p class="chart-sub">${opts.sub || ""}</p>`;
    const tb = el("table", "dt");
    tb.innerHTML = "<thead><tr>" + t.columns.map(c => `<th>${c}</th>`).join("") + "</tr></thead>";
    const body = el("tbody");
    t.rows.forEach((r, ri) => {
      const tr = el("tr");
      r.forEach((c, ci) => {
        const td = el("td");
        if (opts.cell) opts.cell(td, c, ci, r, ri);
        else { td.textContent = c == null || c === "" ? "—" : String(c); }
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
    tb.appendChild(body);
    wrap.appendChild(tb);
    if (opts.note) wrap.appendChild(el("p", "chart-src", opts.note));
    host.appendChild(wrap);
  }

  // ── status chip (met / partial / missing + 括号注释) ──
  const stBase = st => (st || "").replace(/（.*$/, "").trim();
  const ST_TXT = { met: "已确认", partial: "部分", missing: "缺失" };
  function statusChip(st) {
    const b = stBase(st);
    const cls = b === "met" ? "ok" : b === "partial" ? "part" : b === "missing" ? "miss" : "none";
    const w = el("span", "stw");
    w.appendChild(el("span", "chip-st " + cls, ST_TXT[b] || "—"));
    const note = (st || "").match(/（(.+)$/) ;
    if (note) w.appendChild(el("span", "st-note", note[1].replace(/）$/, "")));
    return w;
  }

  // ── trend chip: 主升 hot / 高位 blue / 回调修复 copper / 底部 green / 主跌 neg ──
  function trendCls(t) {
    t = t || "";
    if (!t.trim()) return "none";
    if (/主跌|阴跌|探底|崩塌|破位|补跌|出清|止血|寻底|新低/.test(t)) return "neg";
    if (/主升|强反弹|扩张/.test(t)) return "hot";
    if (/高位|剧震|回落/.test(t)) return "blue";
    if (/回调|修复|企稳|止跌/.test(t)) return "copper";
    if (/底部|蓄势|磨底|弱势|左侧|反弹/.test(t)) return "green";
    return "mid";
  }
  const trendChip = t => (t && t.trim())
    ? el("span", "tr-chip " + trendCls(t), t)
    : el("span", "kn-none", "—");

  // ── §0 大白话盒子 ──
  function plainBox(sid) {
    const p = C.plains[sid];
    if (!p || !p.items || !p.items.length) return null;
    const box = el("div", "plain-box");
    box.appendChild(el("p", "pb-tag", "大白话三行 · 先讲人话,再讲数据"));
    const ol = el("ol");
    p.items.forEach(it => {
      const li = el("li");
      li.appendChild(el("b", null, stripTail(it.q)));
      li.appendChild(document.createTextNode("：" + stripTail(it.a)));
      ol.appendChild(li);
    });
    box.appendChild(ol);
    box.appendChild(el("p", "pb-src", "来源 · " + p.src));
    return box;
  }

  // 1) 注入 6 个旧深潜章节(dek 段之后)
  ["sec-ai", "sec-hog", "sec-baijiu", "sec-ne", "sec-pharma", "sec-auto"].forEach(sid => {
    const sec = document.getElementById(sid);
    if (!sec) return;
    const prose = sec.querySelector(".prose");
    const box = plainBox(sid);
    if (!prose || !box) return;
    const dek = prose.querySelector(".dek");
    if (dek) dek.insertAdjacentElement("afterend", box);
    else prose.appendChild(box);
  });

  // 2) 大白话词典 16 条
  const gg = $("#glossary-grid");
  if (gg) {
    C.glossary.forEach(([term, en, expl]) => {
      const card = el("div", "gl-card");
      card.appendChild(el("p", "gl-term", term));
      card.appendChild(el("p", "gl-en", en));
      card.appendChild(el("p", "gl-expl", expl));
      gg.appendChild(card);
    });
  }

  // 3) 7 个新 A 层深潜章节
  const CIRC = ["⑦", "⑧", "⑨", "⑩", "⑪", "⑫", "⑬"];
  const NEXT = { nonferrous: ["sec-defense", "军工"], defense: ["sec-nonbank", "非银"],
    "nonbank-fin": ["sec-machinery", "机械"], machinery: ["sec-computer", "计算机"],
    computer: ["sec-media", "传媒"], media: ["sec-chem", "基础化工"],
    "basic-chem": ["sec-matrix", "公司矩阵"] };
  const compDrill = (c, fallbackSrc) => ({
    title: `${c.name}（${c.code || "—"}）`,
    value: c.trend || "—",
    sub: [c.q1, c.cond && ("成立条件：" + c.cond), c.veto && ("证伪信号：" + c.veto)]
      .filter(Boolean).join(" · ") || "细项见来源底稿",
    source: c.src || fallbackSrc,
  });

  C.deepdives.forEach((dd, i) => {
    const sec = document.getElementById(dd.id);
    if (!sec) return;
    const prose = el("div", "prose");
    const no = el("p", "sec-no");
    no.appendChild(document.createTextNode(`§8.${i + 1} · 深潜 ${CIRC[i]} ${dd.name} `));
    no.appendChild(el("span", "stage-badge " + dd.bcls, dd.badge));
    prose.appendChild(no);
    prose.appendChild(el("h2", null, dd.title));
    prose.appendChild(el("p", "dek", dd.dek));
    const pb = plainBox(dd.id);
    if (pb) prose.appendChild(pb);
    if (dd.verdict) prose.appendChild(el("p", null, dd.verdict));
    const nav = el("div", "subnav");
    const nx = NEXT[dd.slug];
    if (nx) { const a = el("a", null, dd.slug === "basic-chem" ? "下一站:公司矩阵 →" : `下一行业:${nx[1]} →`); a.href = "#" + nx[0]; nav.appendChild(a); }
    if (dd.splits.length) { const a = el("a", null, "子链拆解"); a.href = `#dd-splits-${dd.slug}`; nav.appendChild(a); }
    const am = el("a", null, "监测信号"); am.href = `#dd-mon-${dd.slug}`; nav.appendChild(am);
    const ac = el("a", null, "公司表"); ac.href = `#dd-comp-${dd.slug}`; nav.appendChild(ac);
    prose.appendChild(nav);
    sec.appendChild(prose);

    // splits 子链拆解表
    if (dd.splits.length) {
      const w = el("div", "wide xl"); w.id = `dd-splits-${dd.slug}`;
      const host = el("div", "tbl-host");
      dd.splits.forEach((sp, si) => {
        dtTable(host, { title: si === 0 ? "子链/维度拆解 · 一个指数装着几种周期" : "子链拆解(续)", columns: sp.head, rows: sp.rows },
          { sub: si === 0 ? "阶段判定按子链/维度分别落锤,不取平均 · 来源:" + dd.src : "" });
      });
      w.appendChild(host); sec.appendChild(w);
    }
    // monitors 监测表
    if (dd.monitors.length) {
      const w = el("div", "wide xl"); w.id = `dd-mon-${dd.slug}`;
      const host = el("div", "tbl-host");
      dtTable(host, {
        title: "监测信号 · 事先写好的认输线与确认线",
        columns: ["监测信号", "状态", "当前读数", "确认 / 证伪阈值"],
        rows: dd.monitors.map(m => [m.label, m.status, m.value, m.threshold]),
      }, {
        sub: "已确认 = 读数达阈值 · 部分 = 方向对但未达标 · 缺失 = 暂无读数 · 点击状态看全称",
        cell: (td, c, ci, r) => {
          if (ci === 1) {
            td.appendChild(statusChip(c));
            U.drillable(td, { title: `${dd.name} · ${r[0]}`, value: stBase(c).toUpperCase() || "—",
              sub: `当前读数:${r[2] || "—"} · 阈值:${r[3] || "—"}`, source: dd.src });
          } else {
            td.textContent = c == null || c === "" ? "—" : String(c);
            if (ci >= 2) td.style.maxWidth = "300px";
          }
        },
        note: "来源:" + dd.src,
      });
      w.appendChild(host); sec.appendChild(w);
    }
    // comps 公司表
    if (dd.comps.length) {
      const w = el("div", "wide xl"); w.id = `dd-comp-${dd.slug}`;
      const host = el("div", "tbl-host");
      dtTable(host, {
        title: "公司层 · 龙头 / 高成长 / 高性价比(证据特征陈列,不构成买卖建议)",
        columns: ["公司", "代码", "标签", "趋势状态", "PE", "PB", "2026Q1 速览"],
        rows: dd.comps.map(c => [c.name, c.code, c.bucket, c.trend, c.pe, c.pb, c.q1]),
      }, {
        sub: "估值为 2026-07-17 收盘口径 · 点击公司名展开成立条件/证伪信号全文 · 缺口画 —",
        cell: (td, c, ci, r, ri) => {
          const comp = dd.comps[ri];
          if (ci === 0) { td.appendChild(kn(c, compDrill(comp, dd.src))); }
          else if (ci === 3) { td.appendChild(trendChip(c)); U.drillable(td, compDrill(comp, dd.src)); }
          else if (ci === 6) {
            td.style.maxWidth = "320px";
            td.appendChild(c ? kn(clipTxt(c, 42), compDrill(comp, dd.src)) : el("span", "kn-none", "—"));
          } else { td.textContent = c == null || c === "" ? "—" : String(c); if (ci === 4 || ci === 5) td.className = "num"; }
        },
        note: "来源:" + dd.src + " · 趋势状态/成立条件/证伪信号均原文摘录,未改写。",
      });
      w.appendChild(host); sec.appendChild(w);
    }
  });

  // 4) 行业公司矩阵(右侧进行中 + 左侧观察名单)
  const mxh = $("#matrix-host");
  if (mxh) {
    const sides = [["right", "右侧进行中", "判定已在右侧(或子链右侧)的行业——盯增速收敛与价格环比,不是底部"],
      ["watch", "左侧观察名单", "临近拐点但还差确认族——用观察名单的纪律看,虚线框标注"]];
    sides.forEach(([side, label, sub]) => {
      const groups = C.matrix.filter(m => m.side === side);
      if (!groups.length) return;
      const sec = el("div", "mx-side");
      const h = el("h3", "mx-side-t");
      h.appendChild(document.createTextNode(label + " · " + groups.length + " 行业 "));
      h.appendChild(el("span", "mx-side-s", sub));
      sec.appendChild(h);
      groups.forEach(m => {
        const blk = el("div", "mx-ind" + (side === "watch" ? " watch" : ""));
        const head = el("div", "mx-ind-head");
        const hh = el("h4", null, m.ind + " ");
        hh.appendChild(el("span", "mx-sub", m.sub + " · " + m.code));
        head.appendChild(hh);
        const nt = el("p", "mx-note", m.note + " ");
        const ga = el("a", "ink-link", /^sec-/.test(m.goto) ? "→ 深潜章节" : "→ 档案卡");
        ga.href = "#" + m.goto;
        nt.appendChild(ga);
        head.appendChild(nt);
        blk.appendChild(head);
        const grid = el("div", "mx-grid");
        m.comps.forEach(c => {
          const card = el("div", "mx-card" + (side === "watch" ? " watch" : ""));
          if (side === "watch") card.appendChild(el("span", "mx-corner", "左侧观察"));
          if (c.bucket) card.appendChild(el("p", "mx-bucket", c.bucket));
          const nm = el("p", "mx-name", c.name + " ");
          nm.appendChild(el("span", "mx-code", c.code || ""));
          card.appendChild(nm);
          card.appendChild(el("p", "mx-trend")).appendChild(trendChip(c.trend));
          const vals = ["PE " + (c.pe || "—"), "PB " + (c.pb || "—")];
          if (c.pePct) vals.push("分位 " + c.pePct);
          card.appendChild(el("p", "mx-vals", vals.join(" · ")));
          if (c.q1) card.appendChild(el("p", "mx-q1", clipTxt(c.q1, 56)));
          if (c.cond) card.appendChild(el("p", "mx-cond", "成立:" + clipTxt(c.cond, 46)));
          if (c.veto) card.appendChild(el("p", "mx-veto neg-t", "证伪:" + clipTxt(c.veto, 46)));
          U.drillable(card, compDrill(c, "data/ 行业矩阵"));
          grid.appendChild(card);
        });
        blk.appendChild(grid);
        sec.appendChild(blk);
      });
      mxh.appendChild(sec);
    });
  }

  // 5) 17 张 B 层档案卡
  const dsh = $("#dossier-host");
  if (dsh) {
    const grid = el("div", "ds-grid");
    C.dossiers.forEach(d => {
      const card = el("div", "ds-card");
      card.id = "dossier-" + d.slug;
      const head = el("div", "ds-head");
      const hh = el("h3", null, d.name + " ");
      hh.appendChild(el("span", "ds-code", d.code));
      head.appendChild(hh);
      card.appendChild(head);
      card.appendChild(el("p", "ds-verdict", "判定:" + d.verdict));
      // 大白话三行(折叠)
      if (d.plain && d.plain.length) {
        const det = el("details", "ds-plain");
        det.appendChild(el("summary", null, "大白话三行 · 点开"));
        const ol = el("ol");
        d.plain.forEach(it => {
          const li = el("li");
          li.appendChild(el("b", null, stripTail(it.q)));
          li.appendChild(document.createTextNode(":" + stripTail(it.a)));
          ol.appendChild(li);
        });
        det.appendChild(ol);
        card.appendChild(det);
      }
      // 变量读数
      if (d.readings && d.readings.length) {
        card.appendChild(el("p", "ds-sub-h", "变量读数"));
        const tb = el("table", "ds-read");
        d.readings.forEach(r => {
          const tr = el("tr");
          tr.appendChild(el("td", "k", r.k));
          tr.appendChild(el("td", "v", r.v));
          tb.appendChild(tr);
        });
        card.appendChild(tb);
      }
      // 还缺什么
      if (d.missing && d.missing.length) {
        card.appendChild(el("p", "ds-sub-h", "还缺什么证据(前 " + Math.min(3, d.missing.length) + " 条)"));
        const ol = el("ol", "ds-miss");
        d.missing.slice(0, 3).forEach(m => ol.appendChild(el("li", null, m)));
        card.appendChild(ol);
      }
      // 盯什么
      if (d.monitors && d.monitors.length) {
        card.appendChild(el("p", "ds-sub-h", "盯什么"));
        const ul = el("ul", "ds-mon");
        d.monitors.forEach(m => {
          const li = el("li");
          li.appendChild(statusChip(m.status));
          li.appendChild(el("span", "ds-mon-l", m.label));
          if (m.value) li.appendChild(el("span", "ds-mon-v", clipTxt(m.value, 40)));
          U.drillable(li, { title: `${d.name} · ${m.label}`, value: stBase(m.status).toUpperCase() || "—",
            sub: `当前读数:${m.value || "—"} · 阈值:${m.threshold || "—"}`, source: d.src });
          ul.appendChild(li);
        });
        card.appendChild(ul);
      }
      // 龙头画像
      if (d.leaders && d.leaders.length) {
        card.appendChild(el("p", "ds-sub-h", "龙头画像"));
        d.leaders.forEach(ld => {
          const p = el("p", "ds-leader");
          p.appendChild(el("b", null, ld.name + " "));
          p.appendChild(document.createTextNode(clipTxt(ld.line, 130)));
          U.drillable(p, { title: d.name + " · " + ld.name, value: "龙头画像", sub: ld.line, source: d.src });
          card.appendChild(p);
        });
      }
      // 历史映射
      if (d.ref) {
        card.appendChild(el("p", "ds-sub-h", "历史映射"));
        card.appendChild(el("p", "ds-ref", d.ref));
      }
      card.appendChild(el("p", "ds-foot", `数据缺口 ${d.gaps} 项 · 来源 ${d.src}`));
      grid.appendChild(card);
    });
    dsh.appendChild(grid);
  }
})();
