#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""拉取个股推荐池 94 家公司的统一口径数据（Wind，raw 不复权）：
- 日K 2025-01-02 → 2026-08-07（MA20/60/120、52周高低、量能用）
- 估值快照：最新成交价/市盈率(TTM)/市净率/总市值1（截至 2026-08-07）
结果存 research/data/stock_pool/{kline,quote}/。可断点续传；--start/--limit 分批。"""
import subprocess, json, glob, os, time, sys, argparse

SKILL = os.path.expanduser("~/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/kimi-code/home/plugins/managed/wind-allskill/skills/wind-mcp-skill")
CACHE = os.path.expanduser("~/.cache/wind-allskill/csv")
BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "stock_pool")
os.makedirs(os.path.join(OUT, "kline"), exist_ok=True)
os.makedirs(os.path.join(OUT, "quote"), exist_ok=True)

# (code, name, 申万行业代码) — 行业用于五桶分类的行业档位
U = [
 # AI算力/电子/通信 8
 ("002463.SZ","沪电股份","801080.SI"),("002916.SZ","深南电路","801080.SI"),
 ("300308.SZ","中际旭创","801770.SI"),("300394.SZ","天孚通信","801770.SI"),
 ("300502.SZ","新易盛","801770.SI"),("601138.SH","工业富联","801080.SI"),
 ("603986.SH","兆易创新","801080.SI"),("688008.SH","澜起科技","801080.SI"),
 # 汽车 6
 ("000625.SZ","长安汽车","801880.SI"),("002594.SZ","比亚迪","801880.SI"),
 ("600104.SH","上汽集团","801880.SI"),("601127.SH","赛力斯","801880.SI"),
 ("601238.SH","广汽集团","801880.SI"),("601633.SH","长城汽车","801880.SI"),
 # 白酒/食品饮料 7
 ("000568.SZ","泸州老窖","801120.SI"),("000596.SZ","古井贡酒","801120.SI"),
 ("000858.SZ","五粮液","801120.SI"),("002304.SZ","洋河股份","801120.SI"),
 ("600519.SH","贵州茅台","801120.SI"),("600809.SH","山西汾酒","801120.SI"),
 ("603369.SH","今世缘","801120.SI"),
 # 基础化工 7
 ("600096.SH","云天化","801030.SI"),("600160.SH","巨化股份","801030.SI"),
 ("600309.SH","万华化学","801030.SI"),("600426.SH","华鲁恒升","801030.SI"),
 ("600486.SH","扬农化工","801030.SI"),("002648.SZ","卫星化学","801030.SI"),
 ("002601.SZ","龙佰集团","801030.SI"),
 # 计算机 8
 ("002230.SZ","科大讯飞","801750.SI"),("300033.SZ","同花顺","801750.SI"),
 ("300454.SZ","深信服","801750.SI"),("300496.SZ","中科创达","801750.SI"),
 ("600536.SH","中国软件","801750.SI"),("600570.SH","恒生电子","801750.SI"),
 ("600588.SH","用友网络","801750.SI"),("688111.SH","金山办公","801750.SI"),
 # 国防军工 6
 ("600150.SH","中国船舶","801740.SI"),("600760.SH","中航沈飞","801740.SI"),
 ("688297.SH","中无人机","801740.SI"),("002025.SZ","航天电器","801740.SI"),
 ("002179.SZ","中航光电","801740.SI"),("300395.SZ","菲利华","801740.SI"),
 # 猪/农林牧渔 5
 ("000876.SZ","新希望","801010.SI"),("002714.SZ","牧原股份","801010.SI"),
 ("300498.SZ","温氏股份","801010.SI"),("603477.SH","巨星农牧","801010.SI"),
 ("605296.SH","神农集团","801010.SI"),
 # 创新药/医药 7
 ("000963.SZ","华东医药","801150.SI"),("002422.SZ","科伦药业","801150.SI"),
 ("600196.SH","复星医药","801150.SI"),("600276.SH","恒瑞医药","801150.SI"),
 ("603259.SH","药明康德","801150.SI"),("688235.SH","百济神州","801150.SI"),
 ("01801.HK","信达生物","801150.SI"),
 # 机械设备 8
 ("000157.SZ","中联重科","801890.SI"),("000425.SZ","徐工机械","801890.SI"),
 ("000528.SZ","柳工","801890.SI"),("300124.SZ","汇川技术","801890.SI"),
 ("600031.SH","三一重工","801890.SI"),("601100.SH","恒立液压","801890.SI"),
 ("603338.SH","浙江鼎力","801890.SI"),("688017.SH","绿的谐波","801890.SI"),
 # 传媒 7
 ("002027.SZ","分众传媒","801760.SI"),("002517.SZ","恺英网络","801760.SI"),
 ("002555.SZ","三七互娱","801760.SI"),("002558.SZ","巨人网络","801760.SI"),
 ("002602.SZ","世纪华通","801760.SI"),("300413.SZ","芒果超媒","801760.SI"),
 ("300251.SZ","光线传媒","801760.SI"),
 # 电力设备/新能源 8
 ("300014.SZ","亿纬锂能","801730.SI"),("300274.SZ","阳光电源","801730.SI"),
 ("300750.SZ","宁德时代","801730.SI"),("600438.SH","通威股份","801730.SI"),
 ("601012.SH","隆基绿能","801730.SI"),("603806.SH","福斯特","801730.SI"),
 ("688303.SH","大全能源","801730.SI"),("688472.SH","阿特斯","801730.SI"),
 # 非银金融 7
 ("300059.SZ","东方财富","801790.SI"),("600030.SH","中信证券","801790.SI"),
 ("601211.SH","国泰海通","801790.SI"),("601318.SH","中国平安","801790.SI"),
 ("601601.SH","中国太保","801790.SI"),("601628.SH","中国人寿","801790.SI"),
 ("601688.SH","华泰证券","801790.SI"),
 # 有色金属 6
 ("600111.SH","北方稀土","801050.SI"),("600489.SH","中金黄金","801050.SI"),
 ("600547.SH","山东黄金","801050.SI"),("601600.SH","中国铝业","801050.SI"),
 ("601899.SH","紫金矿业","801050.SI"),("603993.SH","洛阳钼业","801050.SI"),
 # 银行 2
 ("600036.SH","招商银行","801780.SI"),("601398.SH","工商银行","801780.SI"),
 # 煤炭 2
 ("601088.SH","中国神华","801950.SI"),("601225.SH","陕西煤业","801950.SI"),
]

def call(server, tool, params):
    before = set(glob.glob(os.path.join(CACHE, "*.csv")))
    r = subprocess.run(["node", "scripts/cli.mjs", "call", server, tool,
                        json.dumps(params, ensure_ascii=False)],
                       cwd=SKILL, capture_output=True, text=True, timeout=90)
    time.sleep(3)
    new = sorted(set(glob.glob(os.path.join(CACHE, "*.csv"))) - before, key=os.path.getmtime)
    return r.stdout, (new[-1] if new else None)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--limit", type=int, default=len(U))
    a = ap.parse_args()
    subset = U[a.start:a.start + a.limit]
    fails = []
    for code, name, ind in subset:
        dst_k = os.path.join(OUT, "kline", f"{code}.csv")
        dst_q = os.path.join(OUT, "quote", f"{code}.csv")
        if not os.path.exists(dst_k):
            out, csvpath = call("stock_data", "get_stock_kline",
                                {"windcode": code, "begin_date": "20250102", "end_date": "20260807"})
            if csvpath:
                os.rename(csvpath, dst_k)
                print(f"{code} {name} kline OK", flush=True)
            else:
                fails.append((code, name, "kline", out[-200:]))
                print(f"{code} {name} kline FAIL", flush=True)
        if not os.path.exists(dst_q):
            out, csvpath = call("stock_data", "get_stock_price_indicators",
                                {"windcode": code, "indexes": "中文简称,最新成交价,市盈率(TTM),市净率,总市值1"})
            if csvpath:
                os.rename(csvpath, dst_q)
                print(f"{code} {name} quote OK", flush=True)
            else:
                fails.append((code, name, "quote", out[-200:]))
                print(f"{code} {name} quote FAIL", flush=True)
    print(f"\n=== CHUNK DONE ({a.start}..{a.start+len(subset)}) fails={len(fails)} ===")
    for f in fails:
        print(f[0], f[1], f[2], f[3].replace("\n", " ")[:160])

if __name__ == "__main__":
    main()
