#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""串行拉取 31 个申万一级行业指数 + 沪深300 的 2026-07-18 以来日线与最新 PE/PB。
结果存 research/data/update_20260807/。依赖 Wind CLI 缓存 CSV 输出。"""
import subprocess, json, glob, os, time, sys

SKILL = os.path.expanduser("~/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/kimi-code/home/plugins/managed/wind-allskill/skills/wind-mcp-skill")
CACHE = os.path.expanduser("~/.cache/wind-allskill/csv")
BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "update_20260807")
os.makedirs(OUT, exist_ok=True)

CODES = ["801010.SI","801030.SI","801040.SI","801050.SI","801080.SI","801110.SI","801120.SI",
         "801130.SI","801140.SI","801150.SI","801160.SI","801170.SI","801180.SI","801200.SI",
         "801210.SI","801230.SI","801710.SI","801720.SI","801730.SI","801740.SI","801750.SI",
         "801760.SI","801770.SI","801780.SI","801790.SI","801880.SI","801890.SI","801950.SI",
         "801960.SI","801970.SI","801980.SI","000300.SH"]

def call(server, tool, params):
    before = set(glob.glob(os.path.join(CACHE, "*.csv")))
    r = subprocess.run(["node", "scripts/cli.mjs", "call", server, tool, json.dumps(params, ensure_ascii=False)],
                       cwd=SKILL, capture_output=True, text=True, timeout=90)
    time.sleep(0.4)
    new = sorted(set(glob.glob(os.path.join(CACHE, "*.csv"))) - before, key=os.path.getmtime)
    return r.stdout, new[-1] if new else None

fails = []
for code in CODES:
    dst_k = os.path.join(OUT, f"kline_{code}.csv")
    dst_v = os.path.join(OUT, f"val_{code}.csv")
    if not os.path.exists(dst_k):
        out, csvpath = call("index_data", "get_index_kline",
                            {"windcode": code, "begin_date": "20260718", "end_date": "20260807"})
        if csvpath:
            os.rename(csvpath, dst_k)
            print(f"{code} kline OK", flush=True)
        else:
            fails.append((code, "kline", out[-300:]))
            print(f"{code} kline FAIL", flush=True)
    if not os.path.exists(dst_v):
        out, csvpath = call("index_data", "get_index_price_indicators",
                            {"windcode": code, "indexes": "市盈率(TTM),市净率"})
        if csvpath:
            os.rename(csvpath, dst_v)
            print(f"{code} val OK", flush=True)
        else:
            fails.append((code, "val", out[-300:]))
            print(f"{code} val FAIL", flush=True)

print("\n=== DONE ===")
print("fails:", len(fails))
for f in fails:
    print(f[0], f[1], f[2].replace("\n", " ")[:200])
