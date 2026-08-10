#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""LME 铜价破线盯盘 → Lark 推送（无变化则静默）。
口径（有色深潜 §铜信号）：LME 铜周线收盘 > 14140 美元/吨 = re_expansion 强化确认。
  - 每周最后一个已完成交易日（通常周一 16:17 跑上周五的收盘）判定一次
  - 周线收盘上穿 → 🔔 破线确认推送；周线收盘跌回下方 → 解除推送
  - 日常贴线提示：最新收盘距线 ≤1% 且本周未提示过 → 📎 贴线提示（每周至多一条）
数据源：新浪外盘期货日K（CAD = LME铜3月）。状态存 commodity_state.json。
用法：python3 commodity_alert.py [--dry 只打印不发]"""
import json, os, sys, time, urllib.request

HOOK = "https://open.larksuite.com/open-apis/bot/v2/hook/fbb992ff-8755-457c-afdd-f06617366d47"
BASE = os.path.dirname(os.path.abspath(__file__))
STATE = os.path.join(BASE, "commodity_state.json")
LINE = 14140.0          # 铜价确认线（前期高点）
NEAR = 0.01             # 贴线提示阈值：距线 1% 以内
DRY = "--dry" in sys.argv

def fetch_cu_daily():
    url = ("https://stock.finance.sina.com.cn/futures/api/openapi.php/"
           "GlobalFuturesService.getGlobalFuturesDailyKLine?symbol=CAD")
    req = urllib.request.Request(url, headers={"Referer": "https://finance.sina.com.cn",
                                               "User-Agent": "Mozilla/5.0"})
    data = json.loads(urllib.request.urlopen(req, timeout=20).read().decode("utf-8"))
    rows = [(r["date"], float(r["close"])) for r in data["result"]["data"]]
    rows.sort()
    return rows

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
                        "content": "铜价盯盘 · 每日 16:17 随收盘任务自动检查 · 口径见网站有色深潜「LME 铜价平台」监测信号"}}]}}

def main():
    rows = fetch_cu_daily()
    today = time.strftime("%Y-%m-%d")
    done = [r for r in rows if r[0] < today]          # 只用已完成交易日
    if not done:
        print("无已完成交易日数据"); return
    d_last, c_last = done[-1]
    print(f"LME铜 最新已完成收盘 {d_last} = {c_last}（线 {LINE}，距 {(c_last/LINE-1)*100:+.2f}%）")

    st = json.load(open(STATE, encoding="utf-8")) if os.path.exists(STATE) else {}
    if not st:                                        # 首次运行：以当前状态建档，不推送
        st = {"weekly_above": c_last > LINE, "last_week_eval": None,
              "near_alerted_week": None, "last_close": c_last, "last_date": d_last}
        json.dump(st, open(STATE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
        print("首次运行：仅建档，不推送"); return

    events = []
    # --- 周线收盘判定：最新已完成 bar 是周五（周末交易日）且未评过 ---
    import datetime
    wd = datetime.date(*map(int, d_last.split("-"))).weekday()
    if wd == 4 and st.get("last_week_eval") != d_last:
        above = c_last > LINE
        was = st.get("weekly_above", False)
        if above and not was:
            events.append(("orange", "🔔 铜价周线破线确认",
                [f"**LME 铜周线收于 {c_last:,.1f} 美元/吨（{d_last}），站上 {LINE:,.0f} 确认线**",
                 "→ 有色「re_expansion 强化」条件触发，与 SCFI 并列为第二条升确认的强信号",
                 "盯：下周能否守住线上；跌回线下将解除"]))
        elif not above and was:
            events.append(("blue", "↩️ 铜价周线跌回确认线下方",
                [f"**LME 铜周线收于 {c_last:,.1f} 美元/吨（{d_last}），跌破 {LINE:,.0f}**",
                 "→ re_expansion 强化信号解除，退回 partial 观察"]))
        st["weekly_above"] = above
        st["last_week_eval"] = d_last

    # --- 日常贴线提示（每周至多一条，未破线时） ---
    week_iso = d_last[:4] + "-W" + d_last[5:7]        # 粗粒度周内去重
    dist = c_last / LINE - 1
    if (not st.get("weekly_above") and -NEAR <= dist < 0
            and st.get("near_alerted_week") != week_iso):
        events.append(("yellow", "📎 铜价贴近确认线",
            [f"**LME 铜最新收盘 {c_last:,.1f} 美元/吨（{d_last}），距 {LINE:,.0f} 确认线仅 {abs(dist)*100:.2f}%**",
             "→ 本周周线若收在上方，将触发 re_expansion 强化确认"]))
        st["near_alerted_week"] = week_iso

    st["last_close"], st["last_date"] = c_last, d_last
    json.dump(st, open(STATE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if not events:
        print("无状态变化，静默"); return
    for template, title, lines in events:
        push(card(title, template, lines))

if __name__ == "__main__":
    main()
