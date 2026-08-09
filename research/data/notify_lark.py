#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""周更 Lark 互动卡片通知：五桶分布 + 重点桶个股名单 + 桶间迁移。
对比 research/data/stock_pool/pool-data.prev.js（上周）与 src/js/pool-data.js（本周）。"""
import json, os, sys, urllib.request

HOOK = "https://open.larksuite.com/open-apis/bot/v2/hook/fbb992ff-8755-457c-afdd-f06617366d47"
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LABEL = {"red": "🔴尾声预警", "orange": "🟠主升中段", "green": "🟢右侧确认",
         "yellow": "🟡底部蓄势", "blue": "🔵超跌观察", "gray": "⚪过渡观察"}
PRI = {"red": 0, "blue": 1, "orange": 2, "green": 3, "yellow": 4, "gray": 5}

def load(path):
    js = open(path, encoding="utf-8").read()
    return json.loads(js[len("window.POOL="):].rstrip(";\n"))

def md_div(text):
    return {"tag": "div", "text": {"tag": "lark_md", "content": text}}

def name_list(stocks, fmt=None):
    out = []
    for s in stocks:
        if fmt:
            out.append(f"{s['name']}（{fmt(s)}）")
        else:
            out.append(s["name"])
    return " · ".join(out) if out else "（无）"

def main():
    dry = "--dry" in sys.argv
    cur = load(os.path.join(REPO, "src/js/pool-data.js"))
    by = {}
    for s in cur["stocks"]:
        by.setdefault(s["bucket"], []).append(s)
    for v in by.values():
        v.sort(key=lambda x: x["score"])
    counts = {b["key"]: b["count"] for b in cur["buckets"]}
    total = sum(counts.values())
    dist = " · ".join(f"{LABEL[k]} **{counts[k]}**" for k in ["red", "orange", "green", "yellow", "blue", "gray"])

    migs = []
    prev_path = os.path.join(REPO, "research/data/stock_pool/pool-data.prev.js")
    if os.path.exists(prev_path):
        pmap = {s["code"]: s["bucket"] for s in load(prev_path)["stocks"]}
        for s in cur["stocks"]:
            pb = pmap.get(s["code"])
            if pb and pb != s["bucket"]:
                migs.append((s["name"], pb, s["bucket"]))
        migs.sort(key=lambda m: PRI[m[2]])

    log = os.path.join(REPO, "research/data/weekly_update.log")
    pushstat = "未记录"
    if os.path.exists(log):
        for line in open(log, encoding="utf-8").read().splitlines()[::-1]:
            if line.startswith(("PUSH OK", "PUSH FAIL", "no changes")):
                pushstat = line; break

    pct = lambda v: ("+" if v > 0 else "") + f"{v:.1f}%"
    dh = lambda s: pct(s["m"]["dist_hi"])  # 距52周高点回撤
    elements = [
        md_div(f"数据截至 **{cur['as_of']}** 收盘 · 共 {total} 家\n{dist}"),
        {"tag": "hr"},
        md_div(f"**🟠 主升中段（{counts['orange']}）**　趋势仍在、已不便宜（回撤｜60日涨幅｜离场线）\n" +
               name_list(by.get("orange", []),
                         fmt=lambda s: f"{dh(s)}｜60日{pct(s['m']['r60'])}｜MA20 {s['m']['ma20']}元")),
        md_div(f"**🟢 右侧确认（{counts['green']}）**　行业+价格+业绩同向（回撤｜20日涨幅｜离场线）\n" +
               name_list(by.get("green", []),
                         fmt=lambda s: f"{dh(s)}｜20日{pct(s['m']['r20'])}｜MA60 {s['m']['ma60']}元")),
        {"tag": "hr"},
        md_div("**🟡 底部蓄势 · 最接近收复 MA60 的 5 家**（回撤｜触发价=MA60）\n" +
               (name_list(by.get("yellow", [])[:5],
                          fmt=lambda s: f"{dh(s)}｜{s['m']['ma60']}元") if by.get("yellow") else "（无）")),
        md_div("**🔵 超跌观察 · 最接近站回 MA20 的 5 家**（不接飞刀，只等信号｜触发价=MA20）\n" +
               (name_list(by.get("blue", [])[:5],
                          fmt=lambda s: f"{dh(s)}｜{s['m']['ma20']}元") if by.get("blue") else "（无）")),
    ]
    if counts["red"]:
        elements.insert(2, md_div("**🔴 尾声预警（动能破坏，按纪律处理｜解除线=MA20）**\n" +
                                  name_list(by.get("red", []),
                                            fmt=lambda s: f"{dh(s)}｜{s['m']['ma20']}元")))
        elements.insert(3, {"tag": "hr"})
    if migs:
        lines = [f"**🔄 本周迁移（{len(migs)} 家）**"]
        for n, a, b in migs[:10]:
            lines.append(f"{n}：{LABEL[a]} → {LABEL[b]}")
        if len(migs) > 10:
            lines.append(f"…其余 {len(migs) - 10} 家见网站 §8.85")
        elements += [{"tag": "hr"}, md_div("\n".join(lines))]
    elements += [{"tag": "hr"},
                 md_div(f"GitHub 推送：**{pushstat}**　｜　Mac Studio · 每周日 20:17 · 网站 §8.85 个股推荐池")]

    template = "red" if counts["red"] else ("orange" if migs and PRI[migs[0][2]] <= 1 else "blue")
    card = {"msg_type": "interactive", "card": {
        "config": {"wide_screen_mode": True},
        "header": {"template": template,
                   "title": {"tag": "plain_text", "content": f"📈 个股推荐池周更 · {cur['as_of']}"}},
        "elements": elements}}
    if dry:
        print(json.dumps(card, ensure_ascii=False, indent=2)); return
    req = urllib.request.Request(HOOK, data=json.dumps(card).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    print(urllib.request.urlopen(req, timeout=20).read().decode())

if __name__ == "__main__":
    main()
