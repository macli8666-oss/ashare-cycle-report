#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""导出 content.js 里全部监测信号清单（含所在章节名）到 /tmp/monitors_inventory.txt"""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
js = open(os.path.join(ROOT, "src/js/content.js"), encoding="utf-8").read()
cnt = json.loads(js[len("window.CNT="):].rstrip(";\n"))
out = []

def walk(o, path=""):
    if isinstance(o, dict):
        name = o.get("name") or o.get("title") or o.get("ind") or ""
        if isinstance(o.get("monitors"), list):
            out.append(f"### {path} {name}")
            for m in o["monitors"]:
                out.append(f"[{m.get('status','?')}] {m.get('label','?')}")
                out.append(f"  值: {m.get('value','—')}")
                out.append(f"  阈值: {m.get('threshold','—')}")
        for k, v in o.items():
            if k != "monitors":
                walk(v, f"{path}/{k}")
    elif isinstance(o, list):
        for v in o:
            walk(v, path)

walk(cnt)
open("/tmp/monitors_inventory.txt", "w", encoding="utf-8").write("\n".join(out))
print(f"{len(out)} lines -> /tmp/monitors_inventory.txt")
