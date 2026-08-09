#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""计算个股推荐池：94 家公司的趋势指标 + 五桶分类，输出 src/js/pool-data.js。
输入：research/data/stock_pool/{kline,quote}/*.csv + src/js/content.js(cond/veto/q1 复用)。
五桶（按优先级 红>橙>绿>黄>蓝 归入主桶）：
  🔵 超跌观察  距52周高≤-35% 且 行业zone<3
  🟡 底部蓄势  距52周高≤-25% 且 现价>MA20 且(量能比≤1.2 或 r20>0)
  🟢 右侧确认  行业zone≥3 且 现价>MA60 且 Q1有增长 且 距52周高>-25%
  🟠 主升中段  现价>MA60 且 距52周高>-15% 且 r60>+10%
  🔴 尾声预警  距52周高>-15% 且 r20<-8% 且 现价<MA20
未满足任一条件 → ⚪ 中性过渡。排序=距离下一触发最近（各桶内定义见代码）。
"""
import json, csv, os, re, sys

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(BASE))
sys.path.insert(0, BASE)
from pull_stock_pool import U  # (code, name, sw_code)

ZONE = {"801010.SI":("农林牧渔",1.95),"801030.SI":("基础化工",2.8),"801040.SI":("钢铁",1.7),
"801050.SI":("有色金属",4.0),"801080.SI":("电子",4.0),"801110.SI":("家用电器",0.7),
"801120.SI":("食品饮料",1.8),"801130.SI":("纺织服饰",2.9),"801140.SI":("轻工制造",1.3),
"801150.SI":("医药生物",3.6),"801160.SI":("公用事业",0.8),"801170.SI":("交通运输",2.0),
"801180.SI":("房地产",0.8),"801200.SI":("商贸零售",1.3),"801210.SI":("社会服务",1.8),
"801710.SI":("建筑材料",2.0),"801720.SI":("建筑装饰",0.5),"801730.SI":("电力设备",3.0),
"801740.SI":("国防军工",3.3),"801750.SI":("计算机",3.1),"801760.SI":("传媒",3.1),
"801770.SI":("通信",3.3),"801780.SI":("银行",2.1),"801790.SI":("非银金融",3.4),
"801880.SI":("汽车",2.0),"801890.SI":("机械设备",3.2),"801950.SI":("煤炭",2.9),
"801960.SI":("石油石化",2.0),"801970.SI":("环保",2.5),"801980.SI":("美容护理",2.0)}

BUCKETS = [
 ("red",    "🔴 尾声预警", "距 52 周高点 15% 以内、但 20 日跌超 8% 且跌破 MA20——主升动能被破坏，先按纪律看。"),
 ("orange", "🟠 主升中段", "站在 MA60 上方、距高点 15% 以内、60 日涨幅超 10%——趋势仍在，但已经不是左侧。"),
 ("green",  "🟢 右侧确认", "行业档位≥3（右侧）+ 站上 MA60 + 2026Q1 业绩增长——基本面与价格同向确认。"),
 ("yellow", "🟡 底部蓄势", "深跌后重新站上 MA20、缩量或 20 日转正——左侧转右侧的候选区，差行业确认。"),
 ("blue",   "🔵 超跌观察", "距 52 周高点跌超 30% 且仍未止跌（MA20 下方或 20 日涨幅为负）——不接飞刀，等缩量企稳。"),
 ("gray",   "⚪ 过渡观察", "不满足任一桶完整条件——多为左侧行业反弹中段、或右侧行业回调未破位；等下一个信号。"),
]

def load_cnt():
    js = open(os.path.join(ROOT, "src/js/content.js"), encoding="utf-8").read()
    cnt = json.loads(js[len("window.CNT="):].rstrip(";\n"))
    comps = {}
    def walk(o):
        if isinstance(o, dict):
            if isinstance(o.get("comps"), list):
                for c in o["comps"]:
                    if isinstance(c, dict) and "code" in c:
                        comps[c["code"]] = c
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(cnt)
    return comps

def read_kline(code):
    p = os.path.join(BASE, "stock_pool", "kline", f"{code}.csv")
    if not os.path.exists(p): return None
    rows = []
    with open(p, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            try:
                rows.append((r["trade_date"], float(r["close"]), float(r["high"]),
                             float(r["low"]), float(r["volume"])))
            except (KeyError, ValueError):
                pass
    return rows or None

def read_quote(code):
    p = os.path.join(BASE, "stock_pool", "quote", f"{code}.csv")
    if not os.path.exists(p): return {}
    with open(p, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            def num(k):
                v = (r.get(k) or "").strip()
                try: return float(v)
                except ValueError: return None
            pe = num("市盈率(TTM)"); pb = num("市净率"); mc = num("总市值1")
            return {"pe": pe, "pb": pb if pb and pb > 0 else None, "mktcap": mc}
    return {}

def metrics(rows):
    closes = [r[1] for r in rows]; highs = [r[2] for r in rows]
    lows = [r[3] for r in rows]; vols = [r[4] for r in rows]
    n = len(closes)
    def ma(k): return sum(closes[-k:]) / k if n >= k else None
    w = min(250, n)
    hi52, lo52 = max(highs[-w:]), min(lows[-w:])
    c = closes[-1]
    def ret(k): return (c / closes[-1 - k] - 1) * 100 if n > k else None
    v20 = sum(vols[-20:]) / 20 if n >= 20 else None
    v60 = sum(vols[-80:-20]) / 60 if n >= 80 else None
    return {"date": rows[-1][0], "close": round(c, 2),
            "ma20": ma(20) and round(ma(20), 2), "ma60": ma(60) and round(ma(60), 2),
            "ma120": ma(120) and round(ma(120), 2),
            "hi52": round(hi52, 2), "lo52": round(lo52, 2),
            "dist_hi": round((c / hi52 - 1) * 100, 1), "dist_lo": round((c / lo52 - 1) * 100, 1),
            "r20": ret(20) and round(ret(20), 1), "r60": ret(60) and round(ret(60), 1),
            "vol_ratio": v20 and v60 and round(v20 / v60, 2)}

def q1_growth(txt):
    """从 q1 文本里抠营收/归母同比增速，有一个为正增长即视为 Q1 有增长。"""
    if not txt: return None
    nums = [float(x) for x in re.findall(r'[（(]\s*\+\s*([0-9.]+)\s*%', txt)]
    nums += [float(x) for x in re.findall(r'\+\s*([0-9.]+)\s*%', txt)]
    return (len(nums) > 0 and max(nums) > 0) if nums else None

def classify(m, zone, q1g):
    dh, r20, r60 = m["dist_hi"], m["r20"], m["r60"]
    c, ma20, ma60 = m["close"], m["ma20"], m["ma60"]
    vr = m["vol_ratio"]
    red = dh is not None and dh > -15 and r20 is not None and r20 < -8 and ma20 and c < ma20
    orange = ma60 and c > ma60 and dh > -15 and r60 is not None and r60 > 10
    green = zone >= 3 and ma60 and c > ma60 and q1g and dh > -25
    yellow = dh <= -25 and ma20 and c > ma20 and (vr is None or vr <= 1.2 or (r20 or 0) > 0)
    blue = dh <= -30 and (ma20 and c < ma20 or (r20 is not None and r20 < 0))
    for flag, key in [(red, "red"), (orange, "orange"), (green, "green"),
                      (yellow, "yellow"), (blue, "blue")]:
        if flag: return key
    return "gray"

def rank_score(m, bucket):
    """桶内排序：距离下一触发最近者排前。分数越小越靠前。"""
    dh, r20, r60 = m["dist_hi"], m["r20"] or 0, m["r60"] or 0
    c, ma20, ma60 = m["close"], m["ma20"] or 1, m["ma60"] or 1
    if bucket == "red":    return r20                     # 跌得最狠的最先警示
    if bucket == "orange": return -r60                    # 动能最强的最前
    if bucket == "green":  return abs(dh + 15) + max(0, 10 - r60)  # 距主升门槛最近
    if bucket == "yellow": return abs(c / ma60 - 1)       # 距收复MA60最近
    if bucket == "blue":   return abs(c / ma20 - 1)       # 距站回MA20最近
    return abs(dh + 25)

def cond_veto(bucket, m, zone_name, zone, reused):
    if reused and reused.get("cond") and reused.get("veto"):
        return reused["cond"], reused["veto"]
    c, ma20, ma60, lo52 = m["close"], m["ma20"], m["ma60"], m["lo52"]
    if bucket == "blue":
        side = ("右侧行业的深度回调——性质是挤估值而非杀逻辑，"
                if zone >= 3 else "左侧行业的下跌——没有行业确认族支撑，")
        return (f"{side}站回 MA20（约 {ma20} 元）且缩量企稳 → 升级为底部蓄势。",
                f"跌破 52 周低点 {lo52} 元且放量 → 超跌判断证伪，按主跌段处理。")
    if bucket == "yellow":
        return (f"收复 MA60（约 {ma60} 元）+ 行业确认族信号出现 → 进入右侧观察。",
                f"再度跌破 MA20（约 {ma20} 元）且 20 日涨幅转负 → 蓄势判断证伪，退回超跌观察。")
    if bucket == "green":
        return (f"60 日涨幅站上 +10% 且创出阶段新高 → 进入主升中段；行业信号保持 met 不降级。",
                f"跌破 MA60（约 {ma60} 元）且 20 日跌超 8% → 右侧判断降级为尾声预警。")
    if bucket == "orange":
        return (f"沿 MA20 上方运行、量能维持 → 主升延续；不猜顶，用 MA20 做移动纪律线。",
                f"20 日跌超 8% 且收盘跌破 MA20（约 {ma20} 元）→ 主升动能破坏，转入尾声预警。")
    if bucket == "red":
        return (f"缩量止跌并收复 MA20（约 {ma20} 元）→ 解除预警，退回高位震荡观察。",
                f"反弹无量后再度放量下行、失守 MA60（约 {ma60} 元）→ 确认趋势反转，按离场纪律处理。")
    return ("等待价格或行业信号走出明确方向（站上/跌破关键均线）再归类。",
            "无明确证伪线——中性状态本身就是结论：不投入注意力。")

def main():
    cnt = load_cnt()
    stocks, missing = [], []
    for code, name, sw in U:
        rows = read_kline(code)
        if not rows:
            missing.append((code, name)); continue
        m = metrics(rows)
        q = read_quote(code)
        zone_name, zone = ZONE[sw]
        reused = cnt.get(code)
        q1t = reused.get("q1") if reused else None
        q1g = q1_growth(q1t)
        bucket = classify(m, zone, q1g)
        cond, veto = cond_veto(bucket, m, zone_name, zone, reused)
        stocks.append({
            "code": code, "name": name, "ind": zone_name, "zone": zone,
            "bucket": bucket, "score": round(rank_score(m, bucket), 3),
            "m": m, "pe": q.get("pe"), "pb": q.get("pb"),
            "mktcap": q.get("mktcap"),
            "q1": q1t, "q1g": q1g,
            "trend": reused.get("trend") if reused else None,
            "role": reused.get("bucket") if reused else None,
            "cond": cond, "veto": veto, "reused": bool(reused),
        })
    for s in stocks:
        s["rank"] = sorted([x for x in stocks if x["bucket"] == s["bucket"]],
                           key=lambda x: x["score"]).index(s) + 1
    counts = {k: sum(1 for s in stocks if s["bucket"] == k) for k, _, _ in BUCKETS}
    out = {"as_of": max(s["m"]["date"] for s in stocks),
           "buckets": [{"key": k, "label": l, "desc": d, "count": counts[k]} for k, l, d in BUCKETS],
           "stocks": stocks}
    dst = os.path.join(ROOT, "src/js/pool-data.js")
    with open(dst, "w", encoding="utf-8") as f:
        f.write("window.POOL=" + json.dumps(out, ensure_ascii=False, separators=(",", ":")) + ";\n")
    print("stocks:", len(stocks), "| missing kline:", missing)
    print("counts:", counts)
    print("as_of:", out["as_of"], "->", dst)

if __name__ == "__main__":
    main()
