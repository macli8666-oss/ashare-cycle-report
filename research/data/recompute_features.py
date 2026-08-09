#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""重算 31 行业价格特征：先用 2026-07-17 旧值校验公式，再算 2026-08-07 新值。
同时把新日线并入 sw_daily/，产出新的 industry_price_features.csv / industry_valuation.csv / industry_master.csv。"""
import csv, os, glob

BASE = os.path.dirname(os.path.abspath(__file__))
UPD = os.path.join(BASE, "update_20260807")
DAILY = os.path.join(BASE, "sw_daily")

NAMES = {}
for row in csv.DictReader(open(os.path.join(BASE, "industry_master.csv"), encoding="utf-8")):
    NAMES[row["code"]] = row["name"]

OLD = {r["code"]: r for r in csv.DictReader(open(os.path.join(BASE, "industry_price_features.csv"), encoding="utf-8"))}

def load_series(code):
    """读 sw_daily 全历史 + update 新日线，返回 [(date,o,h,l,c)] 按日期排序"""
    rows = {}
    for path in [os.path.join(DAILY, f"{code}.csv"), os.path.join(UPD, f"kline_{code}.csv")]:
        if not os.path.exists(path):
            continue
        for r in csv.DictReader(open(path, encoding="utf-8")):
            rows[r["trade_date"]] = (float(r["open"]), float(r["high"]), float(r["low"]), float(r["close"]))
    return sorted(rows.items())

def features(series, asof=None):
    """series: [(date,(o,h,l,c))]; 返回特征 dict"""
    if asof:
        series = [(d, v) for d, v in series if d <= asof]
    dates = [d for d, _ in series]
    closes = [v[3] for _, v in series]
    highs = [v[1] for _, v in series]
    lows = [v[2] for _, v in series]
    last = closes[-1]
    def ret(n):
        return round((last / closes[-1 - n] - 1) * 100, 1) if len(closes) > n else None
    year = dates[-1][:4]
    prev_year_close = None
    for d, v in series:
        if d < f"{year}-01-01":
            prev_year_close = v[3]
    ytd = round((last / prev_year_close - 1) * 100, 1) if prev_year_close else None
    hi = max(closes); hi_d = dates[closes.index(hi)]
    lo = min(closes); lo_d = dates[closes.index(lo)]
    return {
        "last": last, "date": dates[-1], "ytd": ytd,
        "r20": ret(20), "r60": ret(60), "r120": ret(120), "r250": ret(250),
        "dd_high": round((last / hi - 1) * 100, 1), "hi_date": hi_d,
        "up_low": round((last / lo - 1) * 100, 1), "lo_date": lo_d,
        "range_pos": round((last - lo) / (hi - lo) * 100, 1),
    }

# ── 1. 校验公式：用截断到 07-17 的序列复算，对比旧快照
print("=== 公式校验（复算2026-07-17 vs 旧快照）===")
mismatch = 0
for code, old in OLD.items():
    f = features(load_series(code), asof="2026-07-17")
    checks = [("ytd", "ytd"), ("r20", "r20"), ("r250", "r250"), ("dd_high", "drawdown_from_high"),
              ("up_low", "up_from_low"), ("range_pos", "range_pos"), ("hi_date", "hi_date"), ("lo_date", "lo_date")]
    bad = [k2 for k1, k2 in checks if str(f[k1]) != str(old[k2])]
    if bad:
        mismatch += 1
        print(f"{code} {NAMES.get(code,'')} 不一致字段: {bad} | 复算={[f[k] for k,_ in checks]} | 旧={[old[k] for _,k in checks]}")
print(f"不一致: {mismatch}/{len(OLD)}")
if mismatch:
    raise SystemExit("公式校验未通过，停止")

# ── 2. 新日线并入 sw_daily/
print("\n=== 并入 sw_daily ===")
for code in NAMES:
    src = os.path.join(UPD, f"kline_{code}.csv")
    dst = os.path.join(DAILY, f"{code}.csv")
    if not os.path.exists(src):
        continue
    existing = set()
    for r in csv.DictReader(open(dst, encoding="utf-8")):
        existing.add(r["trade_date"])
    new_rows = [r for r in csv.reader(open(src, encoding="utf-8"))][1:]
    added = [r for r in new_rows if r and r[0] not in existing]
    if added:
        with open(dst, "a", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerows(added)
print("并入完成")

# ── 3. 新估值
val = {}
for path in glob.glob(os.path.join(UPD, "val_*.csv")):
    code = os.path.basename(path)[4:-4]
    rows = list(csv.DictReader(open(path, encoding="utf-8")))
    if rows:
        val[code] = (round(float(rows[0]["市盈率(TTM)"]), 2), round(float(rows[0]["市净率"]), 2))

# ── 4. 全量重算（截至 2026-08-07）并写三个 CSV
feat_out, master_out, val_out = [], [], []
old_master = {r["code"]: r for r in csv.DictReader(open(os.path.join(BASE, "industry_master.csv"), encoding="utf-8"))}
for code, name in NAMES.items():
    f = features(load_series(code))
    pe, pb = val.get(code, (None, None))
    feat_out.append({"code": code, "name": name, "last": f["last"], "date": f["date"], "ytd": f["ytd"],
                     "r20": f["r20"], "r60": f["r60"], "r120": f["r120"], "r250": f["r250"],
                     "drawdown_from_high": f["dd_high"], "up_from_low": f["up_low"],
                     "range_pos": f["range_pos"], "hi_date": f["hi_date"], "lo_date": f["lo_date"]})
    val_out.append({"code": code, "pe": pe, "pb": pb})
    om = old_master[code]
    master_out.append({"code": code, "name": name, "ytd": f["ytd"], "r20": f["r20"], "r60": f["r60"],
                       "r250": f["r250"], "range_pos": f["range_pos"], "drawdown_from_high": f["dd_high"],
                       "pe": pe, "pb": pb,
                       "rev_q1_26": om["rev_q1_26"], "gm_q1_26": om["gm_q1_26"],
                       "gm_delta": om["gm_delta"], "np_2025": om["np_2025"]})

def write_csv(path, rows, fields):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)

write_csv(os.path.join(BASE, "industry_price_features.csv"), feat_out,
          ["code","name","last","date","ytd","r20","r60","r120","r250","drawdown_from_high","up_from_low","range_pos","hi_date","lo_date"])
write_csv(os.path.join(BASE, "industry_valuation.csv"), val_out, ["code","pe","pb"])
write_csv(os.path.join(BASE, "industry_master.csv"), master_out,
          ["code","name","ytd","r20","r60","r250","range_pos","drawdown_from_high","pe","pb","rev_q1_26","gm_q1_26","gm_delta","np_2025"])

print("\n=== 2026-08-07 新快照（vs 07-17）===")
print(f"{'行业':<6} {'收盘':>9} {'YTD%':>7} {'R20%':>7} {'R60%':>7} {'区间位':>6} {'PE':>7}")
for r in feat_out:
    o = OLD[r["code"]]
    print(f"{r['name']:<6} {r['last']:>9} {r['ytd']:>7} {r['r20']:>7} {r['r60']:>7} {r['range_pos']:>6} {dict((x['code'],x['pe']) for x in val_out)[r['code']]:>7}  (旧YTD {o['ytd']})")
