#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Apply 2026-08-07 data update to cycle_report.json.
All new readings sourced from Wind pulls (update_20260807/) + web research
documented in the handoff notes. No stage upgrades/downgrades this round."""
import json, csv, os, sys

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # research/
fp = os.path.join(BASE, "cycle_report.json")
with open(fp, encoding="utf-8") as f:
    d = json.load(f)

NEW = "2026-08-07"

# ── 1. subtitle / run ────────────────────────────────────────────────
d["subtitle"] = "上升周期的K型地图：盈利右侧与底部观察并存 · 数据截至2026-08-07"
d["run"]["as_of"] = NEW

# ── 2. assumptions[0] 猪周期红线口径（154万头→30万头）────────────────
a0 = d["run"]["assumptions"][0]
a0["why_conservative"] = a0["why_conservative"].replace(
    "'距离红线还差154万头'而非254万头", "'距离红线还差30万头'而非130万头")
a0["how_to_override"] = a0["how_to_override"].replace(
    "'154万头'改为'254万头'", "'30万头'改为'130万头'")
assert "30万头" in a0["why_conservative"], "assumption patch failed"

# ── 3. 监测仪表盘 18 行 ─────────────────────────────────────────────
mt = d["tables"]["table_monitoring_dashboard"]
R = mt["rows"]
def setr(i, val=None, status=None, src=None, fals=None):
    if val is not None: R[i][3] = val
    if status is not None: R[i][6] = status
    if fals is not None: R[i][7] = fals
    if src is not None: R[i][8] = src

# 0 DRAM：补注供需周期，维持 met
setr(0, val="2026Q3预估+13~18%（Q1 +90~95%、Q2 +58~63%收敛）；机构预期供需紧张持续至2027H2",
     src="TrendForce季度预估（2026-07-09）")
# 1 云厂capex：missing→met
setr(1, val="四大云厂2026财年指引合计约7200-7500亿美元，Q2财报季全线上调（亚马逊2000→2200亿、谷歌1800-1900→1950-2050亿、Meta下限1250→1300亿、微软开支节奏未放缓）；单季合计1712亿美元",
     status="met", src="公司2026Q2财报（2026-07下旬至08上旬）")
# 2 拥挤度/融资盘
setr(2, val="两融余额2.62万亿元（8-6），较6/25峰值3.01万亿回落约13%后8月初企稳小幅回升；两融交易额占A股成交9.8%（8-5）；IT融资交易占比8-9%（峰值12%）",
     src="东方财富/财新（2026-08-06）")
# 3 能繁母猪
setr(3, val="3780万头（2026Q2末，环比-3.2%、连续10个月下降，相当于正常保有量100.8%）；距3750万头红线仅30万头",
     src="农业农村部发布会/五部委联合数据（2026-07-31）")
# 4 自繁自养利润
setr(4, val="约-190~-202元/头（8月初）；7月上旬曾收窄至-91元/头，后随猪价回落再扩亏（8-7生猪均价10.34元/公斤）",
     src="Mysteel/中财网（2026-08-02）")
# 5 仔猪
setr(5, val="238元/头（7-31）；8-7均价17.58元/公斤，仍低于断奶成本约260元/头",
     src="行业周度报价（2026-08-07）")
# 6 茅台批价
setr(6, val="原箱1700-1799元/瓶（7月下-8月初）；7-18 i茅台零售价上调100元至1639元后跳涨，站稳1700元上方约3周（升级线需连续2个月）",
     src="今日酒价/酒价内参（2026-08-04）")
# 7 合同负债：维持Q1值，注待中报
R[7][3] = R[7][3] + "；2026正式中报8月下旬起披露"
# 8 电池销量：维持6月值，注待发布
R[8][3] = R[8][3] + "；7月数据预计8/10-16发布"
# 9 碳酸锂
setr(9, val="14.28万元/吨（SMM 8-7电池级均价142750元/吨，较7月中15万中枢回落）；机构分歧6.5万 vs 20万",
     src="SMM日评（2026-08-07）")
# 10 多晶硅
setr(10, val="3.25万元/吨（0731-0806当周，环比持平）；7-31市场监管总局光伏价格合规指导会、8-6硅料企业签《反内卷倡议书》，现货封盘待涨",
     src="Mysteel周评/市场监管总局（2026-08-06）")
# 11 光伏装机
setr(11, val="1-6月72.07GW（-66.0%）；6月单月12.48GW（-13.1%、环比+43.8%，单月降幅已收窄至-20%内）；券商全年预期下修至190-210GW",
     src="国家能源局月度统计（2026-07-22）")
# 12 创新药BD
setr(12, val="2026H1首付款约50-64.5亿美元（同比+124~229%）；H1交易总金额976-1100亿美元、占全球59%",
     src="医药魔方/动脉智库（2026-07）")
# 13 CXO订单
setr(13, val="药明康德在手订单664.3亿元、+25.2%（2026中报）；H1营收+38.9%、扣非+89.4%，全年指引由513-530亿上调至585-605亿元",
     src="公司中报（2026-08-03）")
# 14 乘用车零售：missing→partial + 预警
setr(14, val="7月150.6万辆、-18%（乘联初报，较6月-23.2%收窄约5pt）；1-7月累计1020.7万辆、-20%",
     status="partial",
     fals="7月-18%已触及预警线；2026-08/09仍≤-15%则阶段降级",
     src="乘联分会初报（2026-08-05）")
# 15 库存系数：维持6月值，注待发布
R[15][3] = R[15][3] + "；7月数据预计8/10前后发布"
# 16 乘用车出口
setr(16, val="7月汽车出口109.2万辆、+57%；H1乘用车出口443.2万辆、+71.7%，NEV占比高",
     src="中汽协/乘联分会（2026-08-07）")
# 17 中报预喜率
setr(17, val="定型43-45.2%（7-15强制披露截止、1693家；申万宏源45.2%/兴证43.0%）；预喜仍集中非银/有色/石化/电子/化工，未向消费/地产扩散",
     src="申万宏源/兴业证券（2026-07-27）")
mt["asof"] = NEW
mt["source"][0]["label"] = "六行业深潜研究§7监测信号汇总 + 31行业扫描；本次读数更新至2026-08-07（来源见各行）"

# ── 4. 31 行业总表 + 阶段地图散点 ───────────────────────────────────
with open(os.path.join(BASE, "data", "industry_master.csv"), encoding="utf-8") as f:
    master = {r["code"]: r for r in csv.DictReader(f)}
t31 = d["tables"]["table_sw31_master"]
for row in t31["rows"]:
    m = master[row[1]]
    row[3] = float(m["ytd"]); row[4] = float(m["r20"]); row[5] = float(m["range_pos"])
    row[6] = float(m["pe"]);  row[7] = float(m["pb"])
t31["title"] = "31个申万一级行业阶段总表：10个进入上升象限、9个临近上升、12个仍承压（2026-08-07）"
t31["source"][0]["label"] = "申万/Wind行业量化总表 industry_master.csv（2026-08-07收盘，财务为2026Q1与2025年报）"
t31["asof"] = NEW; t31["period_end"] = NEW

sm = d["charts"]["chart_sw31_stage_map"]
order = ["801010.SI","801030.SI","801040.SI","801050.SI","801080.SI","801110.SI","801120.SI",
         "801130.SI","801140.SI","801150.SI","801160.SI","801170.SI","801180.SI","801200.SI",
         "801210.SI","801230.SI","801710.SI","801720.SI","801730.SI","801740.SI","801750.SI",
         "801760.SI","801770.SI","801780.SI","801790.SI","801880.SI","801890.SI","801950.SI",
         "801960.SI","801970.SI","801980.SI"]
assert sm["data"]["categories"][0] == "农林牧渔"
sm["data"]["series"][0]["data"] = [float(master[c]["ytd"]) for c in order]
sm["metric_definition"] = sm["metric_definition"].replace("2026-07-17收盘", "2026-08-07收盘")
sm["period_end"] = NEW; sm["asof"] = NEW
sm["source"][0]["label"] = sm["source"][0]["label"].replace("2026-07-17收盘", "2026-08-07收盘")

# ── 5. stockline 图表序列延长至 2026-08-07 ──────────────────────────
CH2CODE = {"chart_sl_801080": "801080.SI", "chart_sl_801770": "801770.SI",
           "chart_sl_801010": "801010.SI", "chart_sl_801120": "801120.SI",
           "chart_sl_801730": "801730.SI", "chart_sl_801150": "801150.SI",
           "chart_sl_801880": "801880.SI"}
for cid, code in CH2CODE.items():
    c = d["charts"][cid]
    with open(os.path.join(BASE, "data", "sw_daily", f"{code}.csv"), encoding="utf-8") as f:
        csvrows = list(csv.DictReader(f))
    by_date = {r["trade_date"]: r for r in csvrows}
    last = c["data"]["rows"][-1]
    assert abs(by_date[last[0]] and float(by_date[last[0]]["close"]) - last[4]) < 0.01, \
        f"{cid} alignment check failed: chart {last[4]} vs csv {by_date.get(last[0], {}).get('close')}"
    added = 0
    for r in csvrows:
        if r["trade_date"] > last[0]:
            c["data"]["rows"].append([r["trade_date"], float(r["open"]), float(r["high"]),
                                      float(r["low"]), float(r["close"]), float(r["volume"])])
            added += 1
    n = len(c["data"]["rows"])
    c["asof"] = NEW; c["period_end"] = NEW
    lbl = c["source"][0]["label"]
    c["source"][0]["label"] = lbl.replace("至2026-07-17，共3048个交易日", f"至2026-08-07，共{n}个交易日")
    assert "2026-08-07" in c["source"][0]["label"], f"{cid} label patch failed"
    print(f"{cid}: +{added} rows -> {n}, last close {c['data']['rows'][-1][4]}")

# ── 6. p12 跨市场信号格 ─────────────────────────────────────────────
# 沪深300：取 update_20260807/kline_000300.SH.csv 算 7/20 以来涨幅
hs300_note = ""
kfp = os.path.join(BASE, "data", "update_20260807", "kline_000300.SH.csv")
if os.path.exists(kfp):
    with open(kfp, encoding="utf-8") as f:
        kr = [r for r in csv.DictReader(f)]
    kr.sort(key=lambda r: r["trade_date"])
    first, lastk = kr[0], kr[-1]
    c0 = float(first.get("open") or first["close"]); c1 = float(lastk["close"])
    pct = (c1 / float(first["close"]) - 1) * 100
    hs300_note = f"较7/20收盘{pct:+.1f}%"
    print("HS300:", first["trade_date"], first["close"], "->", lastk["trade_date"], c1, f"{pct:+.1f}%")

p12 = next(p for p in d["pages"] if p.get("page_id") == "p12_monitoring")
grid = next(m for m in p12["modules"] if m.get("type") == "signal_grid")["items"]
grid[0]["current_value"] = "2026Q1 +5.0~7.9%；中报预告样本显著加速（申万宏源：全A非金融三桶油披露样本H1 +83.1% vs Q1 +66.3%）"
grid[0]["asof"] = "2026-07-27"; grid[0]["source"] = "中报预告统计→申万宏源2026-07-27"
grid[1]["current_value"] = f"7/14调整低点未再跌破；8-7收4694.44点（{hs300_note}，Wind日线）；全A成交约2.7万亿元（8-5，按两融成交占比推算），未缩至1.7万亿下方"
grid[1]["asof"] = NEW; grid[1]["source"] = "Wind日线/东方财富2026-08-07"
grid[2]["current_value"] = "7月宽基ETF净流入3157亿元（创历史月度新高）；8月第一周转为净流出约307亿元（反弹后资金兑现）"
grid[2]["asof"] = "2026-08-06"; grid[2]["source"] = "Wind→证券之星/财联社2026-08-06"
grid[3]["current_value"] = "7月中海峡二度关闭、阿联酋油轮遇袭；Brent 7/17升至88.1美元后回落，8-7结算83.55美元/桶；海峡重开谈判未决，风险未消化"
grid[3]["asof"] = NEW; grid[3]["source"] = "华泰证券研报2026-07-21/外媒2026-08-07"
grid[4]["current_value"] = "定型43-45.2%（1693家强制披露截止；2025同期42.8%；五年中枢约46%）"
grid[4]["asof"] = "2026-07-27"; grid[4]["source"] = "申万宏源/兴业证券2026-07-27"

# ── 7. 行业页信号格 ─────────────────────────────────────────────────
def grid_item(pi, mi, label):
    m = d["pages"][pi]["modules"][mi]
    return next(it for it in m["items"] if it["label"] == label)

it = grid_item(4, 3, "DRAM合约价环比")
it["current_value"] = "2026Q1 +90~95%；Q2 +58~63%；Q3预估+13~18%（涨幅收敛、方向未变）"
it["asof"] = "2026-07-09"; it["source"] = "TrendForce季度预估2026-07-09"
it = grid_item(4, 3, "云厂capex承诺")
it["current_value"] = "TSMC 520-560亿美元；北美四大云厂2026指引合计约7200-7500亿美元（Q2财报季全线上调）"
it["asof"] = "2026-08-05"; it["source"] = "公司2026Q2财报（2026-07下旬至08上旬）"
it = grid_item(4, 3, "TMT拥挤度出清")
it["current_value"] = "-1.5σ（2-3年8%分位）；两融余额较6/25峰值回落约13%后8月初企稳"
it["asof"] = "2026-08-06"

it = grid_item(5, 2, "猪价跌破现金成本")
it["current_value"] = "均价10.34元/kg（8-7）vs 行业成本12-13元"
it["asof"] = "2026-08-07"
it = grid_item(5, 2, "能繁去化月度加速")
it["current_value"] = "Q2末3780万头（环比-3.2%、连续10个月下降）；距3750万头红线仅30万头"
it["asof"] = "2026-07-31"; it["source"] = "农业农村部/五部委2026-07-31"

it = grid_item(6, 2, "批价企稳")
it["current_value"] = "原箱7-18起站稳1700元上方（i茅台零售价上调100元至1639元）；7月下-8月初1700-1799元区间"
it["asof"] = "2026-08-04"; it["source"] = "今日酒价/酒价内参2026-08-04"

it = grid_item(7, 2, "多晶硅守住现金成本")
it["current_value"] = "3.25万/吨（0731-0806当周环比持平，现金成本3.2-3.4万）；7-31价格合规指导会+8-6反内卷倡议，封盘待涨"
it["asof"] = "2026-08-06"
it = grid_item(7, 2, "碳酸锂价格")
it["current_value"] = "电池级14.28万/吨（SMM 8-7均价，较7月中15万中枢回落）"
it["asof"] = "2026-08-07"

it = grid_item(8, 2, "BD出海金额")
it["current_value"] = "H1首付款约50-64.5亿美元；H1交易总金额976-1100亿美元、占全球59%"
it["asof"] = "2026-06-30"

it = grid_item(9, 2, "以旧换新退坡冲击")
it["current_value"] = "4-6月零售-10%~-21.3%；7月-18%（初报，较6月收窄约5pt）"
it["asof"] = "2026-08-05"

# ── 8. 首页 hero 与声明日期 ─────────────────────────────────────────
p0 = d["pages"][0]
p0["bullets"][1] = "数据截至2026-08-07（周五）；初版形成于7/13-7/17市场调整期间，本次更新31行业行情估值与26条监测信号读数"
hero = p0["modules"][0]["items"]
hero[3] = {"label": "沪深300（8/7收盘）", "value": "4694.44点",
           "note": f"7/14调整低点未再跌破，{hs300_note}".rstrip("，")}
hero[4] = {"label": "宽基ETF七月净流入", "value": "3157亿元",
           "note": "创历史月度新高；8月首周小幅流出兑现"}
hero[5] = {"label": "数据截止", "value": "2026-08-07", "note": "周五收盘"}
p13 = d["pages"][13]
p13["modules"][1]["body"] = p13["modules"][1]["body"].replace("数据截至2026-07-17", "数据截至2026-08-07")

# ── 写回 ────────────────────────────────────────────────────────────
with open(fp, "w", encoding="utf-8") as f:
    json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
print("cycle_report.json updated:", os.path.getsize(fp), "bytes")

# ── 残留旧值检查（仅报告，不改深潜正文）─────────────────────────────
s = json.dumps(d, ensure_ascii=False)
for pat in ["154万头", "3904万头", "2026-07-17"]:
    print(f"remaining '{pat}':", s.count(pat))
