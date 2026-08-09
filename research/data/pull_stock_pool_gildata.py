#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gildata 兜底拉取：为 pull_stock_pool.py 缺口的个股拉日K+估值快照（单次调用同时返回）。
查询：「<名称>(<代码>)2025年以来每个交易日不复权的开盘价收盘价最高价最低价成交量」
返回记录含 股票日行情（387 行日K，不复权）与 A股实时行情（含 PE(TTM)/市净率/总市值）。
输出与 Wind 版同构：kline(trade_date,wind_code,open,high,low,close,volume,amt)、
quote(中文简称,最新成交价,市盈率(TTM),市净率,总市值1,wind_code)；单位换算成股/元与 Wind 对齐。
可断点续传；--start/--limit 分批。"""
import subprocess, json, csv, io, os, time, sys, argparse

SKILL = os.path.expanduser("~/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/kimi-code/home/plugins/managed/gildata-aifinmarket")
BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "stock_pool")
sys.path.insert(0, BASE)
from pull_stock_pool import U

def num(s):
    try: return float(str(s).replace(",", "").strip())
    except (ValueError, AttributeError): return None

def parse(code, name, fp):
    rows = list(csv.DictReader(open(fp, encoding="utf-8")))
    kline, quote = [], {}
    for r in rows:
        md = r.get("table_markdown", "")
        if r.get("api_name") == "港股多周期行情":
            lines = [l for l in md.split("\n") if l.startswith("|") and "---" not in l][1:]
            for l in lines:
                c = [x.strip() for x in l.split("|")]
                if len(c) < 17: continue
                d, o, h, lo, cl = c[3], num(c[8]), num(c[9]), num(c[10]), num(c[11])
                v = num(c[16])  # 成交量(万股/万股)
                if d and cl is not None:
                    kline.append({"trade_date": d, "wind_code": code, "open": o, "high": h,
                                  "low": lo, "close": cl,
                                  "volume": (v * 1e4) if v is not None else "", "amt": ""})
        elif r.get("api_name") == "港股实时行情":
            lines = [l for l in md.split("\n") if l.startswith("|") and "---" not in l]
            val = [x.strip() for x in lines[1].split("|")] if len(lines) > 1 else []
            px = num(val[5]) if len(val) > 5 else None
            quote = {"中文简称": name, "最新成交价": px, "市盈率(TTM)": None,
                     "市净率": None, "总市值1": None, "wind_code": code}
        elif r.get("api_name") == "股票日行情":
            lines = [l for l in md.split("\n") if l.startswith("|") and "---" not in l][1:]
            for l in lines:
                c = [x.strip() for x in l.split("|")]
                if len(c) < 15: continue
                d, o, h, lo, cl = c[3], num(c[6]), num(c[7]), num(c[8]), num(c[9])
                v = num(c[13])  # 成交量(万股)
                if d and cl is not None:
                    kline.append({"trade_date": d, "wind_code": code, "open": o, "high": h,
                                  "low": lo, "close": cl,
                                  "volume": (v * 1e4) if v is not None else "", "amt": ""})
        elif r.get("api_name") == "A股实时行情":
            lines = [l for l in md.split("\n") if l.startswith("|") and "---" not in l]
            hdr = [x.strip() for x in lines[0].split("|")]
            val = [x.strip() for x in lines[1].split("|")] if len(lines) > 1 else []
            cell = {hdr[i]: val[i] for i in range(min(len(hdr), len(val)))}
            quote = {"中文简称": name,
                     "最新成交价": num(cell.get("最新价(元)")),
                     "市盈率(TTM)": num(cell.get("市盈率PE(TTM)")),
                     "市净率": num(cell.get("市净率PB(LF)")),
                     "总市值1": (num(cell.get("总市值(亿元)")) or 0) * 1e8 or None,
                     "wind_code": code}
    return kline, quote

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--limit", type=int, default=len(U))
    a = ap.parse_args()
    fails = []
    for code, name, ind in U[a.start:a.start + a.limit]:
        dst_k = os.path.join(OUT, "kline", f"{code}.csv")
        dst_q = os.path.join(OUT, "quote", f"{code}.csv")
        if os.path.exists(dst_k):
            continue
        tmp = f"/tmp/gildata_pool_{code.replace('.', '_')}.csv"
        seg = "港股" if code.endswith(".HK") else ""
        q = {"query": f"{name}({code})2025年以来{seg}每个交易日不复权的开盘价收盘价最高价最低价成交量",
             "file_path": tmp}
        r = subprocess.run(["python3", "scripts/gildata_tool.py", "call",
                            "--api-name", "gildata_fin_query",
                            "--params-json", json.dumps(q, ensure_ascii=False)],
                           cwd=SKILL, capture_output=True, text=True, timeout=120)
        time.sleep(2)
        if not os.path.exists(tmp):
            fails.append((code, name, r.stdout[-150:])); print(code, name, "FAIL", flush=True); continue
        kline, quote = parse(code, name, tmp)
        if len(kline) < 200:
            fails.append((code, name, f"only {len(kline)} kline rows")); print(code, name, "FAIL rows", len(kline), flush=True); continue
        kline.sort(key=lambda x: x["trade_date"])
        with open(dst_k, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["trade_date", "wind_code", "open", "high", "low", "close", "volume", "amt"])
            w.writeheader(); w.writerows(kline)
        with open(dst_q, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=["中文简称", "最新成交价", "市盈率(TTM)", "市净率", "总市值1", "wind_code"])
            w.writeheader(); w.writerow(quote)
        print(code, name, "OK", len(kline), "rows", flush=True)
    print(f"\n=== GILDATA CHUNK DONE fails={len(fails)} ===")
    for f in fails: print(f[0], f[1], str(f[2]).replace("\n", " ")[:140])

if __name__ == "__main__":
    main()
