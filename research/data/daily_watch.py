#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""每日收盘盯盘：贴线位风控预警 → Lark 推送（无变化则静默）。
只监控 A 类（名单每日从 src/js/pool-data.js 动态生成，跟随每周五桶更新）：
  A 贴线位   🟢右侧确认且距MA60≤5%（另含🟠主升且距MA20≤5%）→ 连续两日收在离场线下方 = 证伪
入场/待入场/平仓信号统一由 trade_tracker.py（信号台账，§8.86）推送，本脚本不再推 🚀 触发，
避免与台账的事件口径（前收线下+当日穿越+幅度带）产生两套名单。
状态存 research/data/watch_state.json，只在状态变化时推送。首次运行仅建档不推送。
用法：python3 daily_watch.py [--force 忽略数据日期检查] [--dry 只打印不发]"""
import json, csv, os, subprocess, sys, time, urllib.request

HOOK = "https://open.larksuite.com/open-apis/bot/v2/hook/fbb992ff-8755-457c-afdd-f06617366d47"
BASE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(BASE))
SKILL = os.path.expanduser("~/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/kimi-code/home/plugins/managed/gildata-aifinmarket")
STATE = os.path.join(BASE, "watch_state.json")
FORCE = "--force" in sys.argv
DRY = "--dry" in sys.argv

def num(s):
    try: return float(str(s).replace(",", "").strip())
    except (ValueError, AttributeError): return None

def load_pool():
    js = open(os.path.join(REPO, "src/js/pool-data.js"), encoding="utf-8").read()
    pool = json.loads(js[len("window.POOL="):].rstrip(";\n"))
    watch = []
    for s in pool["stocks"]:
        m = s["m"]
        if not m.get("ma60") or not m.get("ma20"): continue
        d60 = m["close"] / m["ma60"] - 1
        d20 = m["close"] / m["ma20"] - 1
        if s["bucket"] == "green" and 0 <= d60 <= 0.05:
            watch.append({"code": s["code"], "name": s["name"], "tier": "A", "line_ma": 60, "role": "右侧贴线位"})
        elif s["bucket"] == "orange" and 0 <= d20 <= 0.05:
            watch.append({"code": s["code"], "name": s["name"], "tier": "A", "line_ma": 20, "role": "主升贴线位"})
    return watch, pool["as_of"]

def gildata_kline(code, name):
    tmp = f"/tmp/watch_{code.replace('.', '_')}.csv"
    seg = "港股" if code.endswith(".HK") else ""
    q = {"query": f"{name}({code})2025年以来{seg}每个交易日不复权的开盘价收盘价最高价最低价成交量",
         "file_path": tmp}
    subprocess.run(["python3", "scripts/gildata_tool.py", "call", "--api-name", "gildata_fin_query",
                    "--params-json", json.dumps(q, ensure_ascii=False)],
                   cwd=SKILL, capture_output=True, text=True, timeout=120)
    time.sleep(2)
    if not os.path.exists(tmp): return None
    rows = []
    for r in csv.DictReader(open(tmp, encoding="utf-8")):
        api = r.get("api_name") or ""
        if api not in ("股票日行情", "港股多周期行情"): continue
        lines = [l for l in r["table_markdown"].split("\n") if l.startswith("|") and "---" not in l][1:]
        for l in lines:
            c = [x.strip() for x in l.split("|")]
            if api == "股票日行情" and len(c) >= 10:
                rows.append((c[3], num(c[9])))
            elif api == "港股多周期行情" and len(c) >= 12:
                rows.append((c[3], num(c[11])))
    rows = [(d, c) for d, c in rows if d and c is not None]
    rows.sort()
    return rows or None

def ma(closes, k):
    return sum(closes[-k:]) / k if len(closes) >= k else None

def evaluate(w, rows):
    closes = [c for _, c in rows]
    c = closes[-1]
    k = w["line_ma"]
    line = ma(closes, k)
    if line is None: return None
    broken = len(closes) >= 2 and closes[-1] < line and ma(closes[:-1], k) and closes[-2] < ma(closes[:-1], k)
    status = "broken" if broken else "normal"
    return {"date": rows[-1][0], "close": round(c, 2), "line": round(line, 2), "status": status}

ALERT_TEXT = {
    ("normal", "broken"):    "🔺 **{name}**：连续两日收在离场线 {line} 元下方（现价 {close} 元）→ {role}证伪，按纪律离场",
    ("broken", "normal"):    "✅ **{name}**：收复离场线 {line} 元（现价 {close} 元）→ 解除证伪，恢复观察",
}

def main():
    watch, pool_asof = load_pool()
    print(f"watch list: {len(watch)} 只（pool as_of {pool_asof}）")
    prev = json.load(open(STATE, encoding="utf-8")) if os.path.exists(STATE) else {}
    first_run = not prev
    events, new_state = [], {}
    for w in watch:
        rows = gildata_kline(w["code"], w["name"])
        if not rows:
            print(f"{w['name']} 拉取失败，保持原状态"); new_state[w["code"]] = prev.get(w["code"], {}); continue
        ev = evaluate(w, rows)
        if not ev: continue
        fresh = FORCE or ev["date"] == time.strftime("%Y-%m-%d")
        if not fresh:
            print(f"{w['name']} 数据截至 {ev['date']}（非今日），不判定推送")
        old = prev.get(w["code"], {}).get("status")
        new_state[w["code"]] = {**w, **ev}
        if fresh and old and old != ev["status"] and (old, ev["status"]) in ALERT_TEXT:
            events.append(ALERT_TEXT[(old, ev["status"])].format(name=w["name"], role=w["role"], **ev))
        print(f"{w['name']:6s} {w['tier']} 现价{ev['close']:>8} 线{ev['line']:>8} {old or '-'} -> {ev['status']}")
    os.makedirs(BASE, exist_ok=True)
    json.dump(new_state, open(STATE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    if first_run:
        print("首次运行：仅建档，不推送"); return
    if not events:
        print("无状态变化，静默"); return
    card = {"msg_type": "interactive", "card": {
        "config": {"wide_screen_mode": True},
        "header": {"template": "red" if any("🔺" in e for e in events) else "green",
                   "title": {"tag": "plain_text", "content": f"🚨 贴线位风控 · 状态变化 {time.strftime('%m-%d')}"}},
        "elements": [{"tag": "div", "text": {"tag": "lark_md", "content": "\n".join(events)}},
                     {"tag": "hr"},
                     {"tag": "div", "text": {"tag": "lark_md", "content": "每日收盘 16:17 自动盯盘 · 仅破线/收复时推送 · 入场/平仓信号见台账卡片 · 网站 §8.85/§8.86"}}]}}
    if DRY:
        print(json.dumps(card, ensure_ascii=False, indent=2)); return
    req = urllib.request.Request(HOOK, data=json.dumps(card).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    print(urllib.request.urlopen(req, timeout=20).read().decode())

if __name__ == "__main__":
    main()
