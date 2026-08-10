#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""五线信号盯盘 → Lark 推送（无变化则静默）。
线位口径全部来自网站对应深潜/dossier 的监测信号阈值：
  ① LME 铜（新浪 CAD）   周线收盘 > 14,140 美元 = re_expansion 强化确认（有色深潜）
  ② COMEX 金（新浪 GC）  周线收盘 > 4,500 = 企稳确认；< 3,800 = 转负（有色深潜）
  ③ 布伦特（新浪 OIL）   连续 4 周周收 ≥ 80 = 偏多确认；周收 < 65 = 证伪（石油石化 dossier）
  ④ 两融合计（东财）     跌破 26,000 亿 = 退潮警报（非银深潜）
  ⑤ 10Y 国债（东财）     < 1.60% = 利差损恶化；> 2.00% = 资产端修复（非银深潜）
外盘品种（①②③）用"最新已完成交易日"（date < 今天），周五收盘即为周线判定；
④⑤为境内日频数据，每日按最新发布值判定。贴线提示每周至多一条，状态变化才推送。
状态存 signal_state.json。用法：python3 commodity_alert.py [--dry 只打印不发]"""
import datetime, json, os, sys, time, urllib.request

HOOK = "https://open.larksuite.com/open-apis/bot/v2/hook/fbb992ff-8755-457c-afdd-f06617366d47"
BASE = os.path.dirname(os.path.abspath(__file__))
STATE = os.path.join(BASE, "signal_state.json")
DRY = "--dry" in sys.argv

SINA_KLINE = ("https://stock.finance.sina.com.cn/futures/api/openapi.php/"
              "GlobalFuturesService.getGlobalFuturesDailyKLine?symbol={}")
EM_RZRQ = ("https://datacenter-web.eastmoney.com/api/data/v1/get?reportName=RPTA_RZRQ_LSHJ"
           "&columns=DIM_DATE%2CRZRQYE&sortColumns=DIM_DATE&sortTypes=-1&pageSize=5")
EM_CN10Y = ("https://push2.eastmoney.com/api/qt/stock/get?secid=171.CN10Y&fields=f43,f60")
EM_CN10Y_BAK = ("https://push2delay.eastmoney.com/api/qt/stock/get?secid=171.CN10Y&fields=f43,f60")

def http(url, ref):
    req = urllib.request.Request(url, headers={"Referer": ref, "User-Agent": "Mozilla/5.0"})
    return urllib.request.urlopen(req, timeout=20).read().decode("utf-8", "ignore")

def fetch_sina(symbol):
    data = json.loads(http(SINA_KLINE.format(symbol), "https://finance.sina.com.cn"))
    rows = [(r["date"], float(r["close"])) for r in data["result"]["data"]]
    rows.sort()
    return rows

def fetch_rzrq():  # -> [(date, 亿元)]（原始单位：元）
    d = json.loads(http(EM_RZRQ, "https://data.eastmoney.com/rzrq/total.html"))
    rows = [(r["DIM_DATE"][:10], r["RZRQYE"] / 1e8) for r in d["result"]["data"] if r.get("RZRQYE")]
    rows.sort()
    return rows

def fetch_cn10y():  # -> [(date, %)]，实时报价接口；双主机轮流试，间隔6秒，容忍东财间歇限流
    last = None
    for u in (EM_CN10Y, EM_CN10Y_BAK, EM_CN10Y, EM_CN10Y_BAK):
        try:
            d = json.loads(http(u, "https://quote.eastmoney.com/"))["data"]
            return [(time.strftime("%Y-%m-%d"), d["f43"] / 10000)]
        except Exception as e:
            last = e; time.sleep(6)
    raise last

def push(card):
    if DRY:
        print(json.dumps(card, ensure_ascii=False, indent=2)); return
    req = urllib.request.Request(HOOK, data=json.dumps(card).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    print(urllib.request.urlopen(req, timeout=20).read().decode())

def card(title, template, lines):
    return {"msg_type": "interactive", "card": {
        "config": {"wide_screen_mode": True},
        "header": {"template": template,
                   "title": {"tag": "plain_text", "content": title}},
        "elements": [{"tag": "div", "text": {"tag": "lark_md", "content": "\n".join(lines)}},
                     {"tag": "hr"},
                     {"tag": "div", "text": {"tag": "lark_md",
                        "content": "五线信号盯盘 · 每日 16:17 随收盘任务自动检查 · 口径见网站对应深潜/dossier 监测信号"}}]}}

def week_key(date_str):
    return date_str[:4] + "-W" + date_str[5:7]

def completed(rows):
    today = time.strftime("%Y-%m-%d")
    return [r for r in rows if r[0] < today]

def is_friday(date_str):
    return datetime.date(*map(int, date_str.split("-"))).weekday() == 4

def main():
    st = json.load(open(STATE, encoding="utf-8")) if os.path.exists(STATE) else {}
    # 旧版铜状态迁移
    if "weekly_above" in st:
        st = {"cu": {"weekly_above": st["weekly_above"], "last_week_eval": st.get("last_week_eval"),
                     "near_alerted": st.get("near_alerted_week")}}
    events = []

    # ================= 外盘三品种（铜/金/油，周线口径） =================
    def sina_signal(key, symbol, name, unit, lines_spec):
        rows = completed(fetch_sina(symbol))
        if not rows: print(f"{name} 无数据"); return
        d_last, c_last = rows[-1]
        sig = st.setdefault(key, {})
        first = "last_date" not in sig
        sig.update({"last_close": c_last, "last_date": d_last})
        print(f"{name:6s} 最新收盘 {d_last} = {c_last}")
        if first:
            for sp in lines_spec:  # 建档：按当前位置初始化
                if sp["kind"] == "weekly_cross":
                    sig[sp["flag"]] = c_last > sp["line"] if sp["dir"] == "up" else c_last < sp["line"]
                elif sp["kind"] == "weekly_streak":
                    fri = [r for r in rows if is_friday(r[0])][-sp["weeks"]:]
                    sig[sp["flag"]] = len(fri) == sp["weeks"] and all(c >= sp["line"] for _, c in fri)
            return
        for sp in lines_spec:
            line = sp["line"]
            if sp["kind"] == "weekly_cross":
                if is_friday(d_last) and sig.get("last_cross_eval") != (sp["flag"], d_last):
                    trig = c_last > line if sp["dir"] == "up" else c_last < line
                    was = sig.get(sp["flag"], False)
                    if trig and not was:
                        events.append((sp["tpl"], sp["title_on"],
                            [f"**{name}周线收于 {c_last:,.2f} {unit}（{d_last}），{sp['verb_on']} {line:,.0f}**", sp["note_on"]]))
                    elif not trig and was:
                        events.append(("blue", sp["title_off"],
                            [f"**{name}周线收于 {c_last:,.2f} {unit}（{d_last}），{sp['verb_off']} {line:,.0f}**", sp["note_off"]]))
                    sig[sp["flag"]] = trig
                    sig["last_cross_eval"] = (sp["flag"], d_last)
                dist = (c_last / line - 1) if sp["dir"] == "up" else (line / c_last - 1)
                if not sig.get(sp["flag"]) and 0 <= dist <= sp.get("near", 0.01) \
                        and sig.get("near_alerted") != week_key(d_last):
                    events.append(("yellow", f"📎 {name}贴近关键线",
                        [f"**{name}最新收盘 {c_last:,.2f} {unit}（{d_last}），距 {line:,.0f} 仅 {abs(dist)*100:.2f}%**",
                         sp["near_note"]]))
                    sig["near_alerted"] = week_key(d_last)
            elif sp["kind"] == "weekly_streak":
                if is_friday(d_last) and sig.get("last_streak_eval") != d_last:
                    fri = [r for r in rows if is_friday(r[0])][-sp["weeks"]:]
                    ok = len(fri) == sp["weeks"] and all(c >= line for _, c in fri)
                    if ok and not sig.get(sp["flag"]):
                        seq = "、".join(f"{c:,.1f}" for _, c in fri)
                        events.append((sp["tpl"], sp["title_on"],
                            [f"**{name}连续 {sp['weeks']} 周周收 ≥ {line:,.0f} {unit}（{seq}）**", sp["note_on"]]))
                    sig[sp["flag"]] = ok
                    sig["last_streak_eval"] = d_last

    sina_signal("cu", "CAD", "LME 铜", "美元/吨", [
        {"kind": "weekly_cross", "dir": "up", "line": 14140, "flag": "above", "near": 0.01,
         "tpl": "orange", "title_on": "🔔 铜价周线破线确认", "title_off": "↩️ 铜价周线跌回确认线下方",
         "verb_on": "站上", "verb_off": "跌破",
         "note_on": "→ 有色「re_expansion 强化」条件触发，与 SCFI 并列为第二条升确认的强信号",
         "note_off": "→ re_expansion 强化信号解除，退回 partial 观察",
         "near_note": "→ 本周周线若收在上方，将触发 re_expansion 强化确认"}])
    sina_signal("gold", "GC", "COMEX 金", "美元/盎司", [
        {"kind": "weekly_cross", "dir": "up", "line": 4500, "flag": "above4500", "near": 0.02,
         "tpl": "orange", "title_on": "🔔 黄金周线企稳确认", "title_off": "↩️ 黄金跌回 4500 下方",
         "verb_on": "收复", "verb_off": "失守",
         "note_on": "→ 有色深潜「黄金企稳确认」触发，黄金股逻辑从防御转入进攻观察",
         "note_off": "→ 企稳确认解除，退回区间观察",
         "near_note": "→ 周线若收在 4500 上方，黄金「企稳确认」触发"},
        {"kind": "weekly_cross", "dir": "down", "line": 3800, "flag": "below3800", "near": 0.01,
         "tpl": "red", "title_on": "🔺 黄金周线跌破 3800 转负线", "title_off": "✅ 黄金收复 3800",
         "verb_on": "跌破", "verb_off": "收复",
         "note_on": "→ 有色深潜黄金信号转负，黄金股避险逻辑受损，复查持仓",
         "note_off": "→ 转负解除，恢复区间观察",
         "near_note": "→ 距转负线不足 1%，留意周线收盘"}])
    sina_signal("brent", "OIL", "布伦特", "美元/桶", [
        {"kind": "weekly_streak", "line": 80, "weeks": 4, "flag": "streak80",
         "tpl": "orange", "title_on": "🔔 布伦特征服 80 美元：偏多确认",
         "note_on": "→ 石油石化「连续四周站稳 80 上方」确认条件满足，炼化/油服景气逻辑强化"},
        {"kind": "weekly_cross", "dir": "down", "line": 65, "flag": "below65", "near": 0.03,
         "tpl": "red", "title_on": "🔺 布伦特周线跌破 65 证伪线", "title_off": "✅ 布伦特征复 65",
         "verb_on": "跌破", "verb_off": "收复",
         "note_on": "→ 石油石化证伪：地缘溢价消退+需求逻辑双杀，板块退回避开名单",
         "note_off": "→ 证伪解除，恢复观察",
         "near_note": "→ 距证伪线不足 3%，留意油价动能"}])

    # ================= 两融合计（境内日频，单位：亿元） =================
    try:
        rows = fetch_rzrq()
        d_last, v_last = rows[-1]
        sig = st.setdefault("rzrq", {})
        LINE = 26000.0
        print(f"两融合计  最新 {d_last} = {v_last:,.0f} 亿（线 {LINE:,.0f} 亿，余量 {(v_last/LINE-1)*100:+.2f}%）")
        if "below" not in sig:
            sig.update({"below": v_last < LINE, "last_date": d_last, "last_val": v_last})
        elif sig.get("last_date") != d_last:
            below = v_last < LINE
            if below and not sig["below"]:
                events.append(("red", "🔺 两融跌破 2.6 万亿警报线",
                    [f"**两融合计 {v_last:,.0f} 亿（{d_last}），跌破 26,000 亿**",
                     "→ 非银深潜退潮警报触发，券商/高β仓位按纪律复查"]))
            elif not below and sig["below"]:
                events.append(("green", "✅ 两融收复 2.6 万亿",
                    [f"**两融合计 {v_last:,.0f} 亿（{d_last}）**", "→ 退潮警报解除"]))
            dist = v_last / LINE - 1
            if not below and 0 <= dist <= 0.02 and sig.get("near_alerted") != week_key(d_last):
                events.append(("yellow", "📎 两融贴近 2.6 万亿警报线",
                    [f"**两融合计 {v_last:,.0f} 亿（{d_last}），距警报线余量仅 {dist*100:.1f}%**",
                     "→ 若继续回落跌破，将触发非银退潮警报"]))
                sig["near_alerted"] = week_key(d_last)
            sig.update({"below": below, "last_date": d_last, "last_val": v_last})
    except Exception as e:
        print("两融拉取失败：", e)

    # ================= 10Y 国债（境内日频，单位：%） =================
    try:
        rows = fetch_cn10y()
        d_last, y_last = rows[-1]
        sig = st.setdefault("cn10y", {})
        print(f"10Y 国债  最新 {d_last} = {y_last:.4f}%（走廊 1.60–2.00%）")
        zone = "low" if y_last < 1.60 else ("high" if y_last > 2.00 else "mid")
        if "zone" not in sig:
            sig.update({"zone": zone, "last_date": d_last, "last_val": y_last})
        elif sig.get("last_date") != d_last and zone != sig["zone"]:
            if zone == "low":
                events.append(("red", "🔺 10Y 国债跌破 1.60%",
                    [f"**10Y 国债收益率 {y_last:.4f}%（{d_last}）**",
                     "→ 保险利差损恶化警报，保险股资产端逻辑转负"]))
            elif zone == "high":
                events.append(("orange", "🔔 10Y 国债升破 2.00%",
                    [f"**10Y 国债收益率 {y_last:.4f}%（{d_last}）**",
                     "→ 保险资产端修复确认，利好保险/价值风格"]))
            else:
                events.append(("blue", "↩️ 10Y 国债回到 1.60–2.00% 走廊",
                    [f"**10Y 国债收益率 {y_last:.4f}%（{d_last}）**", "→ 极端读数解除"]))
            sig.update({"zone": zone, "last_date": d_last, "last_val": y_last})
    except Exception as e:
        print("10Y 拉取失败：", e)

    json.dump(st, open(STATE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if not events:
        print("无状态变化，静默"); return
    for template, title, lines in events:
        push(card(title, template, lines))

if __name__ == "__main__":
    main()
