#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Compile cycle_report.json -> js/data.js (window.RPT) + js/sources.js (window.SRC).
No invented numbers: everything traces to the fact package."""
import json, os, re

BASE = "/Users/mac/Documents/Kimi/Workspaces/股票/ashare-cycle-report/research"
OUT = "/Users/mac/Documents/Kimi/Workspaces/股票/ashare-cycle-report/src/js"

r = json.load(open(os.path.join(BASE, "cycle_report.json"), encoding="utf-8"))

# ── 31-industry stage zones (needle angle 0..4: 盈利承压/出清中/底部观察/复苏初期/再扩张)
# 2026-07-18 复核：并入 7 个新 A 层深潜 + 17 个 B 层档案的判定(煤炭上调半档、公用事业改判承压)
ZONE = {
 "801010.SI": (1.95, "暂定"), "801030.SI": (2.80, "暂定偏确认"), "801040.SI": (1.70, "暂定"),
 "801050.SI": (4.00, "双族确认"), "801080.SI": (4.00, "双族确认"), "801110.SI": (0.70, "暂定"),
 "801120.SI": (1.80, "暂定"), "801130.SI": (2.90, "暂定·弱"), "801140.SI": (1.30, "暂定"),
 "801150.SI": (3.60, "子链确认"), "801160.SI": (0.80, "暂定"), "801170.SI": (2.00, "暂定"),
 "801180.SI": (0.80, "暂定"), "801200.SI": (1.30, "暂定"), "801210.SI": (1.80, "暂定"),
 "801230.SI": (None, "不评级"), "801710.SI": (2.00, "暂定"), "801720.SI": (0.50, "暂定"),
 "801730.SI": (3.00, "子链确认"), "801740.SI": (3.30, "暂定偏确认·背离"), "801750.SI": (3.10, "暂定偏确认"),
 "801760.SI": (3.10, "子链确认"), "801770.SI": (3.30, "子链确认"), "801780.SI": (2.10, "单族暂定"),
 "801790.SI": (3.40, "双族确认"), "801880.SI": (2.00, "暂定"), "801890.SI": (3.20, "暂定偏确认"),
 "801950.SI": (2.90, "暂定·上调"), "801960.SI": (2.00, "暂定"), "801970.SI": (2.50, "暂定"),
 "801980.SI": (2.00, "暂定"),
}

# 判定原文覆写(来自各深潜 §6 / 档案 §2,扫描表原文过时时以深潜为准)
LABEL = {
 "801030.SI": "bottom_observation→early_recovery 过渡（制冷剂确认/钛白粉反例）",
 "801040.SI": "clearing 尾段→bottom_observation（被动修复，暂定）",
 "801050.SI": "基本面 re_expansion × 股价 clearing 并列（铜最健康/金 profit_pressure 暂定/稀土政策二元）",
 "801110.SI": "profit_pressure 中后段 × bottom_observation 暂定信号",
 "801130.SI": "bottom_observation→early_recovery 过渡边缘（暂定·弱）",
 "801140.SI": "clearing 中段偏后（造纸 bottom_observation/家居 clearing）",
 "801160.SI": "profit_pressure（量增价减·盈利平台期）；水电子链 early_recovery 暂定",
 "801170.SI": "bottom_observation（暂定；快递/油运右侧、集运/航空承压）",
 "801180.SI": "clearing 中段（供给出清快于需求）",
 "801200.SI": "profit_pressure/clearing 尾段·bottom_observation 边缘",
 "801210.SI": "clearing 后段→bottom_observation（暂定）",
 "801230.SI": "不评级（业务混杂的残余篮子，权重股≈个股判定）",
 "801710.SI": "bottom_observation（暂定·单族偏强）",
 "801720.SI": "profit_pressure 中段",
 "801740.SI": "early_recovery 暂定偏确认（基本面右侧×股价左侧，主机厂盈利腰斩系结构性定价）",
 "801750.SI": "结构性 early_recovery 暂定偏确认 × 股价 clearing 中段",
 "801760.SI": "游戏 re_expansion / 影视 profit_pressure / 广告暂定",
 "801780.SI": "bottom_observation（息差企稳信号已现未确认，单族暂定）",
 "801790.SI": "券商 re_expansion × 保险 bottom_observation",
 "801890.SI": "工程机械 re_expansion（映射 2017）× 机器人主题出清中段",
 "801950.SI": "early_recovery（暂定，盈利确认族仍缺，较扫描上调半档）",
 "801960.SI": "bottom_observation（暂定；利润端信号已现、收入端未至）",
 "801970.SI": "bottom_observation→early_recovery 过渡（未确认）",
 "801980.SI": "bottom_observation（出清后期/磨底观察，暂定）",
}

# 层级:A=深潜章节,B=全景档案;goto=点击跳转锚点
LAYER = {"801010.SI": "A", "801030.SI": "A", "801050.SI": "A", "801080.SI": "A", "801120.SI": "A",
         "801150.SI": "A", "801730.SI": "A", "801740.SI": "A", "801750.SI": "A", "801760.SI": "A",
         "801770.SI": "A", "801790.SI": "A", "801880.SI": "A", "801890.SI": "A"}
GOTO = {"801010.SI": "sec-hog", "801030.SI": "sec-chem", "801050.SI": "sec-nonferrous",
        "801080.SI": "sec-ai", "801120.SI": "sec-baijiu", "801150.SI": "sec-pharma",
        "801730.SI": "sec-ne", "801740.SI": "sec-defense", "801750.SI": "sec-computer",
        "801760.SI": "sec-media", "801770.SI": "sec-ai", "801790.SI": "sec-nonbank",
        "801880.SI": "sec-auto", "801890.SI": "sec-machinery",
        "801950.SI": "dossier-coal", "801960.SI": "dossier-oil-petro", "801040.SI": "dossier-steel",
        "801710.SI": "dossier-building-materials", "801720.SI": "dossier-construction",
        "801180.SI": "dossier-real-estate", "801110.SI": "dossier-home-appliance",
        "801140.SI": "dossier-light-industry", "801130.SI": "dossier-textile-apparel",
        "801200.SI": "dossier-retail", "801210.SI": "dossier-social-services",
        "801980.SI": "dossier-beauty-care", "801170.SI": "dossier-transportation",
        "801160.SI": "dossier-utilities", "801970.SI": "dossier-environmental",
        "801780.SI": "dossier-banks", "801230.SI": "dossier-conglomerate"}

t31 = r["tables"]["table_sw31_master"]
industries = []
for row in t31["rows"]:
    name, code, stage, ytd, r20, rpos, pe, pb, rev, gm, np25 = row
    z, conf = ZONE[code]
    industries.append({
        "name": name, "code": code, "stage_label": LABEL.get(code, stage), "zone": z, "conf": conf,
        "layer": LAYER.get(code, "B"), "goto": GOTO.get(code, ""),
        "ytd": ytd, "r20": r20, "range_pos": rpos, "pe": pe, "pb": pb,
        # 银行 Q1 营收为扫描口径估算值 → 按缺口处理(虚框标出,不引用为事实)
        "rev_q1": None if (rev == "—" or code == "801780.SI") else rev,
        "gm_delta": None if gm == "—" else gm,
        "np_2025": None if np25 == "—" else np25,
    })

# ── stocklines: keep [date, close] + events + bands
stocklines = {}
for cid, c in r["charts"].items():
    if c["chart_type"] != "stockline":
        continue
    stocklines[cid] = {
        "title": c["title"], "purpose": c["purpose"], "caption": c["caption"],
        "idx": re.search(r"（(.+?)）", c["source"][0]["label"]).group(1) if "（" in c["source"][0]["label"] else c["chart_id"],
        "asof": c["asof"],
        "series": [[row[0], row[4]] for row in c["data"]["rows"]],
        "events": c["data"]["events"], "bands": c["data"]["stage_bands"],
    }

charts = {}
for cid in ("chart_sw31_stage_map", "chart_company_valuation", "chart_profit_acceleration"):
    c = r["charts"][cid]
    charts[cid] = {k: c[k] for k in ("chart_id", "title", "purpose", "metric_definition", "unit",
                                     "asof", "data_status", "caption", "data")}

tables = {tid: {"title": t["title"], "columns": t["columns"], "rows": t["rows"], "asof": t["asof"]}
          for tid, t in r["tables"].items()}

pages = r["pages"]
decision = r["decision_frame"]
analogs = r["analogs"]
limitations = r["limitations"]
run = {k: r["run"][k] for k in ("anchor_company", "market", "as_of", "assumptions")}

RPT = {
    "title": r["title"], "subtitle": r["subtitle"],
    "industries": industries, "stocklines": stocklines, "charts": charts,
    "tables": tables, "pages": pages, "decision": decision, "analogs": analogs,
    "limitations": limitations, "run": run,
}

with open(os.path.join(OUT, "data.js"), "w", encoding="utf-8") as f:
    f.write("window.RPT=" + json.dumps(RPT, ensure_ascii=False, separators=(",", ":")) + ";\n")

# ── sources.js : K1-K32 web manifest + K33+ local datasets
SRC = []
for i, s in enumerate(r["run"]["search_manifest"]):
    SRC.append({"k": f"K{i+1}", "title": s["title"], "url": s["url"],
                "type": s["source_type"], "date": s.get("date", "")})
local_sets = [
    ("industry_master.csv · 申万/Wind 31行业量化总表（2026-08-07收盘）", "data/industry_master.csv", "primary", "2026-08-07"),
    ("industry_scan_stages.md · 31行业四象限阶段定位扫描底稿", "data/industry_scan_stages.md", "primary", "2026-07-17"),
    ("sw_daily_long/*.SI.csv · Wind长周期日线本地序列（2014-01-02至2026-08-07，每指数3063个交易日）", "data/sw_daily_long/", "primary", "2026-08-07"),
    ("update_20260807/*.csv · Wind增量行情与估值（2026-07-18至08-07，本次更新）", "data/update_20260807/", "primary", "2026-08-07"),
    ("deepdive/ai-compute/research.md + companies_summary.csv · AI算力链深潜（Gildata）", "data/deepdive/ai-compute/", "primary", "2026-07-18"),
    ("deepdive/hog-cycle/research.md + company_layer_2026.csv · 猪周期深潜", "data/deepdive/hog-cycle/", "primary", "2026-07-18"),
    ("deepdive/baijiu/research.md · 白酒深潜（Gildata估值+自算PE序列）", "data/deepdive/baijiu/", "primary", "2026-07-18"),
    ("deepdive/new-energy/research.md · 新能源双链深潜（Gildata 07-07/07-17两口径）", "data/deepdive/new-energy/", "primary", "2026-07-18"),
    ("deepdive/innovative-pharma/research.md · 创新药深潜（Wind/Gildata）", "data/deepdive/innovative-pharma/", "primary", "2026-07-18"),
    ("deepdive/autos/research.md · 汽车整车深潜（Gildata+乘联分会）", "data/deepdive/autos/", "primary", "2026-07-18"),
    ("web_research_2026H1.md · 2026H1网络研究汇总底稿", "data/web_research_2026H1.md", "secondary", "2026-07-18"),
    ("deepdive/nonferrous/research.md · 有色金属深潜（含子金属拆分）", "data/deepdive/nonferrous/", "primary", "2026-07-18"),
    ("deepdive/defense/research.md · 国防军工深潜（背离归因）", "data/deepdive/defense/", "primary", "2026-07-18"),
    ("deepdive/nonbank-fin/research.md · 非银金融深潜（券商+保险双线）", "data/deepdive/nonbank-fin/", "primary", "2026-07-18"),
    ("deepdive/machinery/research.md · 机械设备深潜（工程机械+机器人）", "data/deepdive/machinery/", "primary", "2026-07-18"),
    ("deepdive/computer/research.md · 计算机深潜（AI 应用兑现组）", "data/deepdive/computer/", "primary", "2026-07-18"),
    ("deepdive/media/research.md · 传媒深潜（游戏/影视/广告拆分）", "data/deepdive/media/", "primary", "2026-07-18"),
    ("deepdive/basic-chem/research.md · 基础化工深潜（制冷剂确认）", "data/deepdive/basic-chem/", "primary", "2026-07-18"),
    ("dossier/*.md · 17 个 B 层行业档案（含煤炭/银行/综合）", "data/dossier/", "primary", "2026-07-18"),
    ("deepdive/*/trend_state.md · 6 行业 41 家公司趋势状态评估", "data/deepdive/", "primary", "2026-07-18"),
]
for j, (t, u, ty, d) in enumerate(local_sets):
    SRC.append({"k": f"K{33+j}", "title": t, "url": u, "type": ty, "date": d})

with open(os.path.join(OUT, "sources.js"), "w", encoding="utf-8") as f:
    f.write("window.SRC=" + json.dumps(SRC, ensure_ascii=False, separators=(",", ":")) + ";\n")

print("data.js", os.path.getsize(os.path.join(OUT, "data.js")), "bytes · sources", len(SRC))
