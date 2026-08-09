#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""周更 Lark 富文本通知：五桶分布 + 桶间迁移名单。
对比 research/data/stock_pool/pool-data.prev.js（上周，周更脚本在重算前备份）
与 src/js/pool-data.js（本周）。首次运行无 prev 时只发分布。"""
import json, os, sys, urllib.request

HOOK = "https://open.larksuite.com/open-apis/bot/v2/hook/fbb992ff-8755-457c-afdd-f06617366d47"
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LABEL = {"red": "🔴尾声预警", "orange": "🟠主升中段", "green": "🟢右侧确认",
         "yellow": "🟡底部蓄势", "blue": "🔵超跌观察", "gray": "⚪过渡观察"}
# 迁移展示优先级：预警类在前，其次升级类
PRI = {"red": 0, "blue": 1, "orange": 2, "green": 3, "yellow": 4, "gray": 5}

def load(path):
    js = open(path, encoding="utf-8").read()
    return json.loads(js[len("window.POOL="):].rstrip(";\n"))

def main():
    dry = "--dry" in sys.argv
    cur = load(os.path.join(REPO, "src/js/pool-data.js"))
    counts = {b["key"]: b["count"] for b in cur["buckets"]}
    dist = " · ".join(f"{LABEL[k]} {counts[k]}" for k in ["red", "orange", "green", "yellow", "blue", "gray"])
    total = sum(counts.values())

    migs = []
    prev_path = os.path.join(REPO, "research/data/stock_pool/pool-data.prev.js")
    if os.path.exists(prev_path):
        pmap = {s["code"]: s["bucket"] for s in load(prev_path)["stocks"]}
        for s in cur["stocks"]:
            pb = pmap.get(s["code"])
            if pb and pb != s["bucket"]:
                migs.append((s["name"], pb, s["bucket"]))
        migs.sort(key=lambda m: PRI[m[2]])

    # 推送状态从日志取
    log = os.path.join(REPO, "research/data/weekly_update.log")
    pushstat = ""
    if os.path.exists(log):
        for line in open(log, encoding="utf-8").read().splitlines()[::-1]:
            if line.startswith(("PUSH OK", "PUSH FAIL", "no changes")):
                pushstat = line; break

    content = [[{"tag": "text",
                 "text": f"数据截至：{cur['as_of']} 收盘（共 {total} 家）\n五桶分布：{dist}"}]]
    if migs:
        lines = [f"本周迁移（{len(migs)} 家）："]
        for n, a, b in migs[:8]:
            lines.append(f"• {n}  {LABEL[a]} → {LABEL[b]}")
        if len(migs) > 8:
            lines.append(f"…其余 {len(migs) - 8} 家详见网站 §8.85")
        content.append([{"tag": "text", "text": "\n".join(lines)}])
    else:
        content.append([{"tag": "text", "text": "本周迁移：首次对比基期，下周起展示升桶/降桶名单"}])
    if pushstat:
        content.append([{"tag": "text", "text": f"GitHub 推送：{pushstat}"}])
    content.append([{"tag": "text", "text": "运行环境：Mac Studio · launchd 每周日 20:17 · 网站栏目 §8.85 个股推荐池"}])

    payload = {"msg_type": "post",
               "content": {"post": {"zh_cn": {"title": "📈 个股推荐池周更", "content": content}}}}
    if dry:
        print(json.dumps(payload, ensure_ascii=False, indent=2)); return
    req = urllib.request.Request(HOOK, data=json.dumps(payload).encode("utf-8"),
                                 headers={"Content-Type": "application/json"})
    print(urllib.request.urlopen(req, timeout=20).read().decode())

if __name__ == "__main__":
    main()
