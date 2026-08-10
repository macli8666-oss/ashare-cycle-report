#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""信号台账引擎：模拟交易全生命周期追踪。
信号 = 收盘价上穿 MA60（前一收盘在其下、当日收在其上，且超出幅度 ≤ entry_band）。
入场 = 信号次日开盘价。出场（先到先走，均次日开盘价成交）：
  止损：连续 stop_days 日收在 MA60 下方；
  止盈A：收盘跌破 MA(tp_ma)；止盈B：收盘 ≤ 持有期最高收盘 × (1 - tp_dd)。
模式：
  --bootstrap  用本地 stock_pool K线全历史回放，重建台账（首次建站/规则重放用）
  （默认）     每日增量：只拉"贴近MA60的候选 + 持仓中"个股的最新行情，登记新信号/推进持仓
产物：research/data/signals_ledger.json + src/js/ledger-data.js（window.LEDGER）。
有开仓/平仓事件时推 Lark 小卡片。"""
import json, csv, os, subprocess, sys, time, urllib.request

HOOK = "https://open.larksuite.com/open-apis/bot/v2/hook/fbb992ff-8755-457c-afdd-f06617366d47"
BASE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(BASE))
SKILL = os.path.expanduser("~/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/kimi-code/home/plugins/managed/gildata-aifinmarket")
sys.path.insert(0, BASE)
from pull_stock_pool import U  # (code, name, sw)
from compute_stock_pool import ZONE  # sw -> (行业名, 档位)

LEDGER = os.path.join(BASE, "signals_ledger.json")
RULES = json.load(open(os.path.join(BASE, "rules_config.json"), encoding="utf-8"))
DRY = "--dry" in sys.argv
BOOT = "--bootstrap" in sys.argv
NOPUSH = "--no-lark" in sys.argv
LOCAL = "--local" in sys.argv  # 用本地CSV（weekly已刷新）代替逐股拉取

# ── 数据 ──
def local_rows(code):
    p = os.path.join(BASE, "stock_pool", "kline", f"{code}.csv")
    if not os.path.exists(p): return None
    rows = []
    for r in csv.DictReader(open(p, encoding="utf-8")):
        try: rows.append((r["trade_date"], float(r["open"]), float(r["close"])))
        except (KeyError, ValueError): pass
    return rows or None

def num(s):
    try: return float(str(s).replace(",", "").strip())
    except (ValueError, AttributeError): return None

def fresh_rows(code, name):
    tmp = f"/tmp/ledger_{code.replace('.', '_')}.csv"
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
        for l in r["table_markdown"].split("\n"):
            if not l.startswith("|") or "---" in l or "股票名称" in l: continue
            c = [x.strip() for x in l.split("|")]
            if api == "股票日行情" and len(c) >= 10:
                d, o, cl = c[3], num(c[6]), num(c[9])
            elif api == "港股多周期行情" and len(c) >= 12:
                d, o, cl = c[3], num(c[8]), num(c[11])
            else: continue
            if d and o and cl: rows.append((d, o, cl))
    rows.sort()
    return rows or None

def ma(closes, k, end=None):
    seg = closes[:end] if end else closes
    return sum(seg[-k:]) / k if len(seg) >= k else None

# ── 回放引擎（bootstrap 与 self_evolve 共用）──
def simulate(rows, rules):
    """rows: [(date, open, close)] → trades list。信号日 T：prev_close<MA60(T-1) 且 close≥MA60(T)
    且 close/MA60(T)-1 ≤ entry_band；T+1 开盘入场。出场条件同模块docstring。"""
    trades, cur = [], None
    closes = [r[2] for r in rows]
    n = len(rows)
    for i in range(61, n):
        if cur:  # 持仓中：先更新峰值，再按 T 收盘判出场（T+1 开盘成交）
            peak = cur["_peak"]
            line60, linetp = ma(closes, 60, i + 1), ma(closes, rules["tp_ma"], i + 1)
            reason = None
            if cur["_below"] + (1 if closes[i] < (line60 or 0) else 0) >= rules["stop_days"] and closes[i] < (line60 or 0):
                reason = f"止损：连续{rules['stop_days']}日收在MA60下方"
            cur["_below"] = cur["_below"] + 1 if closes[i] < (line60 or 0) else 0
            if not reason and linetp and closes[i] < linetp:
                reason = f"止盈：收盘跌破MA{rules['tp_ma']}"
            if not reason and closes[i] <= peak * (1 - rules["tp_dd"]):
                reason = f"止盈：自峰值回撤超{rules['tp_dd']*100:.0f}%"
            if reason:
                if i + 1 < n:
                    cur.update(status="closed", exit_date=rows[i + 1][0], exit_px=rows[i + 1][1],
                               reason=reason, exit_signal_date=rows[i][0],
                               days=i + 1 - cur["_ei"],
                               max_up=round((cur["_peak"] / cur["entry_px"] - 1) * 100, 1))
                    trades.append(cur); cur = None
                else:
                    cur["pending_exit"] = reason  # 信号出在最新bar，待明日开盘成交
            if cur:
                cur["_peak"] = max(peak, closes[i])
            continue
        # 空仓：找信号
        m60_t, m60_p = ma(closes, 60, i + 1), ma(closes, 60, i)
        if m60_t and m60_p and closes[i - 1] < m60_p and closes[i] >= m60_t \
           and closes[i] / m60_t - 1 <= rules["entry_band"]:
            if i + 1 < n:
                cur = {"signal_date": rows[i][0], "entry_date": rows[i + 1][0],
                       "entry_px": rows[i + 1][1], "status": "open",
                       "_peak": closes[i], "_below": 0, "_ei": i + 1, "_ei_date_i": i + 1,
                       "signal_px": closes[i], "signal_ma60": round(m60_t, 2)}
            else:
                trades.append({"signal_date": rows[i][0], "status": "pending",
                               "signal_px": closes[i], "signal_ma60": round(m60_t, 2)})
    if cur: trades.append(cur)
    return trades

def pnl(t):
    if t["status"] != "closed": return None
    return (t["exit_px"] / t["entry_px"] - 1) * 100

# ── 台账 ──
def load_ledger():
    return json.load(open(LEDGER, encoding="utf-8")) if os.path.exists(LEDGER) else {"trades": []}

def key(t): return f"{t['code']}|{t['signal_date']}"

def enrich(t, code, name):
    ind, zone = ZONE.get(dict((c, s) for c, _, s in U).get(code, ""), ("?", 0))
    return {**t, "code": code, "name": name, "ind": ind, "zone": zone}

def bootstrap():
    led = {"trades": []}
    snap = {k: RULES[k] for k in ("entry_band", "stop_days", "tp_dd", "tp_ma")}
    for code, name, _ in U:
        rows = local_rows(code)
        if not rows: continue
        closes = [r[2] for r in rows]
        dates = [r[0] for r in rows]
        for t in simulate(rows, RULES):
            t = enrich(t, code, name)
            t["rules"] = snap
            for k in ("_peak", "_below", "_ei", "_ei_date_i"): t.pop(k, None)
            if t["status"] == "open":
                ei = dates.index(t["entry_date"])
                t["last_date"], t["last_px"] = rows[-1][0], rows[-1][2]
                t["peak_close"] = round(max(closes[ei:]), 2)
                t["float_pct"] = round((rows[-1][2] / t["entry_px"] - 1) * 100, 1)
                t["days"] = len(rows) - 1 - ei
                m60 = ma(closes, 60)
                if m60: t["exit_line"] = round(m60, 2)
            led["trades"].append(t)
    print(f"bootstrap: {len(led['trades'])} 笔信号（含进行中/待入场）")
    return led

def daily_update(led):
    """每日增量：候选 = 本地K线距MA60在 (0, entry_band+5%] 下方或上方3%内 + 所有持仓股。"""
    open_codes = {t["code"] for t in led["trades"] if t["status"] in ("open", "pending")}
    cands = set(open_codes)
    for code, name, _ in U:
        rows = local_rows(code)
        if not rows or len(rows) < 61: continue
        closes = [r[2] for r in rows]
        m = ma(closes, 60)
        if m and -RULES["entry_band"] - 0.05 <= closes[-1] / m - 1 <= 0.03:
            cands.add(code)
    # 并发预拉候选股最新行情（串行逐股拉太慢，前台 300s 跑不完）
    fresh = {}
    if not LOCAL:
        todo = [(c, n) for c, n, _ in U if c in cands]
        from concurrent.futures import ThreadPoolExecutor
        with ThreadPoolExecutor(max_workers=4) as ex:
            for (c, _), rows in zip(todo, ex.map(lambda cn: fresh_rows(*cn), todo)):
                fresh[c] = rows
    events = []
    snap = {k: RULES[k] for k in ("entry_band", "stop_days", "tp_dd", "tp_ma")}
    known = {key(t) for t in led["trades"]}
    for code, name, _ in U:
        if code not in cands: continue
        rows = local_rows(code) if LOCAL else fresh.get(code)
        if not rows: continue
        # 1) 新信号（用当前规则，只看最近3根bar的穿越）
        for t in simulate(rows, RULES)[-3:]:
            if key({**t, "code": code}) not in known:
                t = enrich(t, code, name); t["rules"] = snap
                for k in ("_peak", "_below", "_ei", "_ei_date_i"): t.pop(k, None)
                led["trades"].append(t); known.add(key(t))
                if t["status"] == "open":
                    events.append(f"📥 **开仓** {name}（{code}）：{t['entry_date']} 开盘价 {t['entry_px']} 元（信号日 {t['signal_date']} 收 {t['signal_px']} 上穿 MA60 {t['signal_ma60']}）")
                elif t["status"] == "pending":
                    events.append(f"🕐 **待入场** {name}（{code}）：{t['signal_date']} 收 {t['signal_px']} 上穿 MA60 {t['signal_ma60']}，明日开盘价入场")
        # 2) 推进持仓（用该单入场时的规则快照）
        for t in led["trades"]:
            if t["code"] != code or t["status"] not in ("open", "pending"): continue
            r = t.get("rules", snap)
            dates = [x[0] for x in rows]
            if t["status"] == "pending":
                if t["signal_date"] in dates and dates.index(t["signal_date"]) + 1 < len(rows):
                    j = dates.index(t["signal_date"]) + 1
                    t.update(status="open", entry_date=rows[j][0], entry_px=rows[j][1])
                    events.append(f"📥 **开仓** {name}：{rows[j][0]} 开盘价 {rows[j][1]} 元")
                else: continue
            ei = dates.index(t["entry_date"])
            closes = [x[2] for x in rows]
            peak = max(closes[ei:])
            below = 0; reason = None; sig_d = None
            for j in range(ei + 1, len(rows)):
                l60, ltp = ma(closes, 60, j + 1), ma(closes, r["tp_ma"], j + 1)
                below = below + 1 if l60 and closes[j] < l60 else 0
                if below >= r["stop_days"]:
                    reason = f"止损：连续{r['stop_days']}日收在MA60下方"
                elif ltp and closes[j] < ltp:
                    reason = f"止盈：收盘跌破MA{r['tp_ma']}"
                elif closes[j] <= max(closes[ei:j+1]) * (1 - r["tp_dd"]):
                    reason = f"止盈：自峰值回撤超{r['tp_dd']*100:.0f}%"
                if reason:
                    sig_d = rows[j][0]
                    if j + 1 < len(rows):
                        t.update(status="closed", exit_date=rows[j+1][0], exit_px=rows[j+1][1],
                                 reason=reason, exit_signal_date=sig_d,
                                 days=j + 1 - ei, max_up=round((max(closes[ei:j+1]) / t["entry_px"] - 1) * 100, 1))
                        events.append(f"📤 **平仓** {name}：{rows[j+1][0]} 开盘价 {rows[j+1][1]} 元 · {reason} · 盈亏 {(rows[j+1][1]/t['entry_px']-1)*100:+.1f}% · 持有 {(ei and (j+1-ei))} 个交易日")
                    else:
                        t["pending_exit"] = reason
                    break
            if t["status"] == "open":
                t["last_date"], t["last_px"] = rows[-1][0], rows[-1][2]
                t["peak_close"] = round(peak, 2)
                t["float_pct"] = round((rows[-1][2] / t["entry_px"] - 1) * 100, 1)
                t["days"] = len(rows) - 1 - ei
                m60 = ma(closes, 60)
                if m60: t["exit_line"] = round(m60, 2)
                if t.get("pending_exit") and sig_d != rows[-1][0]:
                    pass  # pending_exit 由下一根bar成交（上方循环处理）
    return led, events

def stats(trades):
    closed = [t for t in trades if t["status"] == "closed"]
    pnls = [p for p in (pnl(t) for t in closed) if p is not None]
    wins = [p for p in pnls if p > 0]
    out = {"closed_n": len(pnls),
           "win_rate": round(len(wins) / len(pnls) * 100, 1) if pnls else None,
           "avg_pnl": round(sum(pnls) / len(pnls), 2) if pnls else None,
           "avg_win": round(sum(wins) / len(wins), 2) if wins else None,
           "avg_loss": round(sum(p for p in pnls if p <= 0) / max(1, len([p for p in pnls if p <= 0])), 2) if pnls else None,
           "avg_days": round(sum(t.get("days", 0) for t in closed) / len(closed), 1) if closed else None}
    by_ind = {}
    for t in closed:
        p = pnl(t)
        if p is None: continue
        d = by_ind.setdefault(t["ind"], {"n": 0, "wins": 0, "sum": 0.0})
        d["n"] += 1; d["wins"] += p > 0; d["sum"] += p
    out["by_ind"] = [{"ind": k, "n": v["n"], "win_rate": round(v["wins"]/v["n"]*100, 1),
                      "avg_pnl": round(v["sum"]/v["n"], 2)} for k, v in
                     sorted(by_ind.items(), key=lambda x: -x[1]["n"])]
    return out

def emit_js(led):
    for t in led["trades"]:
        t.pop("_peak", None); t.pop("_below", None)
        if t["status"] == "closed":
            t["pnl"] = round(pnl(t), 2)
    data = {"as_of": max([t.get("last_date") or t.get("exit_date") or t["signal_date"] for t in led["trades"]] or ["—"]),
            "rules": {k: RULES[k] for k in ("entry_band", "stop_days", "tp_dd", "tp_ma")},
            "rules_version": RULES["version"], "changelog": RULES["changelog"][-8:][::-1],
            "stats": stats(led["trades"]),
            "open": [t for t in led["trades"] if t["status"] == "open"],
            "pending": [t for t in led["trades"] if t["status"] == "pending"],
            "closed": sorted([t for t in led["trades"] if t["status"] == "closed"],
                             key=lambda x: x.get("exit_date", ""), reverse=True)}
    with open(os.path.join(REPO, "src/js/ledger-data.js"), "w", encoding="utf-8") as f:
        f.write("window.LEDGER=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n")
    return data

def lark(events, data):
    if not events or NOPUSH: return
    card = {"msg_type": "interactive", "card": {
        "config": {"wide_screen_mode": True},
        "header": {"template": "orange",
                   "title": {"tag": "plain_text", "content": f"📒 信号台账 · {time.strftime('%m-%d')}"}},
        "elements": [{"tag": "div", "text": {"tag": "lark_md", "content": "\n".join(events[:10])}},
                     {"tag": "hr"},
                     {"tag": "div", "text": {"tag": "lark_md",
                      "content": f"规则 v{data['rules_version']} · 持仓 {len(data['open'])} 笔 · 已完结 {data['stats']['closed_n']} 笔 · 胜率 {data['stats']['win_rate']}% · 网站 §8.86"}}]}}
    if DRY: print(json.dumps(card, ensure_ascii=False, indent=2)); return
    req = urllib.request.Request(HOOK, data=json.dumps(card).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    print(urllib.request.urlopen(req, timeout=20).read().decode())

def main():
    led = bootstrap() if BOOT else load_ledger()
    events = []
    if not BOOT:
        led, events = daily_update(led)
    data = emit_js(led)
    json.dump(led, open(LEDGER, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"open {len(data['open'])} · pending {len(data['pending'])} · closed {data['stats']['closed_n']} · win {data['stats']['win_rate']}% · avg {data['stats']['avg_pnl']}%")
    lark(events, data)

if __name__ == "__main__":
    main()
