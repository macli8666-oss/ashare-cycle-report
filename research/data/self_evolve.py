#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""规则自我进化（每周日随周更运行）：全历史回放检验备选参数，小步自动调参。
安全栏（防过拟合）：
  - 参数只能在固定网格内移动：entry_band∈[2%,3%,5%] stop_days∈[1,2,3] tp_dd∈[8,10,12,15%] tp_ma∈[10,20]
  - 每周最多一个参数移动一格；同一参数 28 天冷却
  - 已完结样本 < 10 笔：不动作
  - 挑战者须同时满足：期望值提升 >10%（相对）且交易数 ≥ 当前规则交易数 × 0.8
评估口径：对 94 家本地K线（周日刚刷新）全历史回放，统计平均每笔盈亏（期望值）。
每次变更写入 rules_config.json changelog 并推 Lark。"""
import json, os, sys, time, urllib.request

HOOK = "https://open.larksuite.com/open-apis/bot/v2/hook/fbb992ff-8755-457c-afdd-f06617366d47"
BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)
from pull_stock_pool import U
from trade_tracker import local_rows, simulate, pnl

CFG = os.path.join(BASE, "rules_config.json")
GRID = {"entry_band": [0.02, 0.03, 0.05], "stop_days": [1, 2, 3],
        "tp_dd": [0.08, 0.10, 0.12, 0.15], "tp_ma": [10, 20]}
MIN_TRADES = 10
IMPROVE = 1.10      # 期望值需提升 10%（相对）
COVER = 0.8         # 交易数覆盖率下限
COOLDOWN_DAYS = 28
DRY = "--dry" in sys.argv

def evaluate(rules, cache):
    pnls = []
    for code, rows in cache.items():
        for t in simulate(rows, rules):
            p = pnl(t)
            if p is not None: pnls.append(p)
    if len(pnls) < MIN_TRADES: return None
    return {"n": len(pnls), "exp": sum(pnls) / len(pnls),
            "win": sum(1 for p in pnls if p > 0) / len(pnls) * 100}

def main():
    cfg = json.load(open(CFG, encoding="utf-8"))
    cur = {k: cfg[k] for k in GRID}
    cache = {code: rows for code, _, _ in U if (rows := local_rows(code))}
    base = evaluate(cur, cache)
    print(f"当前规则 v{cfg['version']} {cur} → n={base['n']} exp={base['exp']:.2f}% win={base['win']:.1f}%")
    today = time.strftime("%Y-%m-%d")
    last_change = {}
    for c in cfg.get("changelog", [])[::-1]:
        for k in GRID:
            if k in c.get("changed_params", []) and k not in last_change:
                last_change[k] = c["date"]
    best_move = None
    for param, grid in GRID.items():
        if param in last_change:
            age = (time.mktime(time.strptime(today, "%Y-%m-%d")) -
                   time.mktime(time.strptime(last_change[param], "%Y-%m-%d"))) / 86400
            if age < COOLDOWN_DAYS:
                print(f"{param}: 冷却中（{int(age)}天 < {COOLDOWN_DAYS}）"); continue
        i = grid.index(cur[param])
        for j in sorted({max(0, i - 1), min(len(grid) - 1, i + 1)} - {i}):
            trial = {**cur, param: grid[j]}
            r = evaluate(trial, cache)
            if not r: continue
            ok = r["exp"] > base["exp"] * IMPROVE and r["n"] >= max(MIN_TRADES, base["n"] * COVER)
            print(f"  试 {param} {cur[param]}→{grid[j]}: n={r['n']} exp={r['exp']:.2f}% win={r['win']:.1f}% {'✅通过' if ok else '未过'}")
            if ok and (not best_move or r["exp"] > best_move[1]["exp"]):
                best_move = ((param, grid[j]), r, trial)
    if not best_move:
        print("本周无调参（无挑战者通过门槛）"); return
    (param, newv), r, trial = best_move
    cfg["version"] += 1
    cfg.update(trial)
    cfg["changelog"].append({
        "date": today, "change": f"自动调参：{param} {cur[param]} → {newv}",
        "params": trial, "changed_params": [param],
        "reason": f"全历史回放期望值 {base['exp']:.2f}% → {r['exp']:.2f}%（n={r['n']}，胜率 {r['win']:.1f}%）",
        "evidence": "simulate over 94 stocks, local kline through weekly refresh"})
    if not DRY:
        json.dump(cfg, open(CFG, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    msg = (f"🧬 **规则自动升级 v{cfg['version']-1} → v{cfg['version']}**\n"
           f"参数调整：`{param}` {cur[param]} → **{newv}**\n"
           f"证据：94家全历史回放，平均每笔盈亏 {base['exp']:.2f}% → {r['exp']:.2f}%，胜率 {r['win']:.1f}%，样本 {r['n']} 笔\n"
           f"当前完整规则：入场 收复MA60幅度≤{trial['entry_band']*100:.0f}% · 止损 连续{trial['stop_days']}日收MA60下 · 止盈 破MA{trial['tp_ma']}或峰值回撤{trial['tp_dd']*100:.0f}%\n"
           f"安全栏：每周最多一格 · 同参数28天冷却 · 样本≥{MIN_TRADES}笔 · 增益>10%才动")
    card = {"msg_type": "interactive", "card": {
        "config": {"wide_screen_mode": True},
        "header": {"template": "violet", "title": {"tag": "plain_text", "content": "🧬 信号台账 · 规则自动升级"}},
        "elements": [{"tag": "div", "text": {"tag": "lark_md", "content": msg}}]}}
    if DRY:
        print(json.dumps(card, ensure_ascii=False, indent=2)); return
    req = urllib.request.Request(HOOK, data=json.dumps(card).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    print(urllib.request.urlopen(req, timeout=20).read().decode())

if __name__ == "__main__":
    main()
