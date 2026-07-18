#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Compile new content sources -> js/content.js (window.CNT).
Parses: 7 new deepdive research.md (§0/§6/§7/§8), 6 trend_state.md (§0/trends),
17 dossier/*.md (§0/verdict/readings/missing/monitors/leaders).
No invented numbers: every extracted field traces to a source file (path recorded)."""
import json, os, re, sys

BASE = "/Users/jinglong/Documents/kimi/workspace/industry-cycle-output-ashare-2026-07-18/data"
OUT = "/Users/jinglong/Documents/kimi/workspace/ashare-cycle-site/js"

def read(p):
    return open(os.path.join(BASE, p), encoding="utf-8").read()

def sec(md, pat, end_pats=None):
    """Extract section body starting at a header matching pat, ending at next ^## header."""
    lines = md.split("\n")
    start = None
    rx = re.compile(pat)
    for i, ln in enumerate(lines):
        if rx.match(ln):
            start = i
            break
    if start is None:
        return ""
    body = []
    for ln in lines[start + 1:]:
        if re.match(r"^## ", ln):
            break
        body.append(ln)
    return "\n".join(body).strip()

def clean(s):
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", s)          # bold
    s = re.sub(r"`([^`]+)`", r"\1", s)              # code
    s = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", s)  # links
    s = re.sub(r"\s+", " ", s)
    return s.strip()

def clip(s, n):
    s = clean(s)
    return s if len(s) <= n else s[: n - 1].rstrip("，；、。 ") + "…"

# ── §0 大白话三行 ─────────────────────────────────────────────
def parse_plain(md, file):
    m = re.search(r"^## (?:§)?0[\. 、]", md, re.M)
    if not m:
        return None
    body = sec(md[m.start():], r"^## ")
    items = []
    for mm in re.finditer(r"^\s*\d+\.\s*\*\*(.+?)\*\*[：:](.+?)(?=^\s*\d+\.\s*\*\*|\Z)", body, re.M | re.S):
        items.append({"q": clean(mm.group(1)), "a": clip(mm.group(2), 500)})
    if len(items) < 3:
        # fallback: numbered lines without bold split
        for mm in re.finditer(r"^\s*\d+\.\s+(.+?)(?=^\s*\d+\.\s|\Z)", body, re.M | re.S):
            t = clip(mm.group(1), 500)
            q = t.split("：", 1)[0][:14] if "：" in t[:20] else ""
            items.append({"q": q, "a": t})
    return items[:3] if items else None

# ── monitor yaml/json blocks ──────────────────────────────────
def parse_monitors(body):
    out = []
    for jm in re.finditer(r"```json\s*(\[[\s\S]*?)\s*```", body):
        try:
            for o in json.loads(jm.group(1)):
                out.append({"label": clean(o.get("label", "")), "status": o.get("status", ""),
                            "value": clip(o.get("current_value", ""), 90),
                            "threshold": clip(o.get("threshold", ""), 90)})
        except Exception:
            pass
    for ym in re.finditer(r"```yaml\s*(.*?)```", body, re.S):
        blk = ym.group(1)
        for item in re.split(r"\n\s*-\s+label:", blk):
            if "signal_family" not in item and "label:" not in item:
                continue
            lab = re.search(r"label:\s*(.+)", item)
            lab = lab.group(1).strip() if lab else item.strip().split("\n")[0]
            st = re.search(r"status:\s*(\w+)", item)
            cur = re.search(r"current_value:\s*(.+)", item)
            thr = re.search(r"threshold:\s*(.+)", item)
            out.append({"label": clean(lab), "status": st.group(1) if st else "",
                        "value": clip(cur.group(1), 90) if cur else "",
                        "threshold": clip(thr.group(1), 90) if thr else ""})
    # inline pseudo-JSON items, quoted (steel) or unquoted (textile-apparel)
    for im in re.finditer(r"\{label:\s*\"([^\"]+)\"[^}]*?status:\s*\"(\w+)\"", body):
        seg = body[im.start():im.end()]
        cur = re.search(r"current_value:\s*\"([^\"]*)\"", seg)
        thr = re.search(r"threshold:\s*\"([^\"]*)\"", seg)
        out.append({"label": clean(im.group(1)), "status": im.group(2),
                    "value": clip(cur.group(1), 90) if cur else "",
                    "threshold": clip(thr.group(1), 90) if thr else ""})
    for im in re.finditer(r"\{label:\s*([^,\"][^,]*?),\s*signal_family:\s*(.+?),\s*current_value:\s*(.+?)(?=,\s*threshold:),\s*threshold:\s*(.+?)(?=,\s*expected_lag:)[^}]*?status:\s*(\w+)", body):
        out.append({"label": clean(im.group(1)), "status": im.group(5),
                    "value": clip(im.group(3), 90), "threshold": clip(im.group(4), 90)})
    # markdown table rows (environmental style)
    for ln in body.split("\n"):
        if ln.startswith("|") and "---" not in ln and "label" not in ln:
            cells = [clean(c) for c in ln.strip().strip("|").split("|")]
            if len(cells) >= 6:
                stm = re.search(r"met|partial|missing", cells[5])
                out.append({"label": cells[0][:40], "status": stm.group(0) if stm else "",
                            "value": clip(cells[2], 90), "threshold": clip(cells[3], 90)})
    # dedupe by label
    seen, ded = set(), []
    for m in out:
        if m["label"] and m["label"] not in seen:
            seen.add(m["label"]); ded.append(m)
    return ded

# ── dossiers (17 B-layer) ─────────────────────────────────────
DOSSIERS = [
    ("coal", "煤炭", "801950.SI"), ("oil-petro", "石油石化", "801960.SI"),
    ("steel", "钢铁", "801040.SI"), ("building-materials", "建筑材料", "801710.SI"),
    ("construction", "建筑装饰", "801720.SI"), ("real-estate", "房地产", "801180.SI"),
    ("home-appliance", "家用电器", "801110.SI"), ("light-industry", "轻工制造", "801140.SI"),
    ("textile-apparel", "纺织服饰", "801130.SI"), ("retail", "商贸零售", "801200.SI"),
    ("social-services", "社会服务", "801210.SI"), ("beauty-care", "美容护理", "801980.SI"),
    ("transportation", "交通运输", "801170.SI"), ("utilities", "公用事业", "801160.SI"),
    ("environmental", "环保", "801970.SI"), ("banks", "银行", "801780.SI"),
    ("conglomerate", "综合", "801230.SI"),
]

def parse_dossier(slug, name, code):
    md = read(f"dossier/{slug}.md")
    f = f"dossier/{slug}.md"
    plain = parse_plain(md, f)
    # verdict: first bold line inside §2 (## 2 … or ## §2 …)
    vbody = sec(md, r"^## (?:§)?2[\. 、\s]")
    vm = re.search(r"\*\*(?:综合)?判定\*\*[：:]\s*([^\n]+)", vbody) \
         or re.search(r"\*\*((?:综合)?判定[^*]*|指数层面[^*]*)\*\*", vbody)
    verdict = clip(vm.group(1), 150) if vm else clip(vbody.split("\n")[0], 150)
    # readings: first table rows in §1
    rbody = sec(md, r"^## (?:§)?1[\. 、\s]")
    readings = []
    for ln in rbody.split("\n"):
        if ln.startswith("|") and "---" not in ln and "变量" not in ln and "子行业" not in ln:
            cells = [clean(c) for c in ln.strip().strip("|").split("|")]
            if len(cells) >= 2 and cells[0]:
                readings.append({"k": cells[0][:24], "v": clip(cells[1], 110)})
        if len(readings) >= 6:
            break
    # missing: numbered items in §3 (or table rows: 缺失确认族 | 现状 | 确认标准)
    mbody = sec(md, r"^## (?:§)?3[\. 、\s]")
    missing = []
    for mm in re.finditer(r"^\s*\d+\.\s*(.+?)(?=^\s*\d+\.\s|\Z)", mbody, re.M | re.S):
        missing.append(clip(mm.group(1), 130))
        if len(missing) >= 4:
            break
    if not missing:
        for ln in mbody.split("\n"):
            if ln.startswith("|") and "---" not in ln and "缺失" not in ln:
                cells = [clean(c) for c in ln.strip().strip("|").split("|")]
                if len(cells) >= 2 and cells[0]:
                    missing.append(clip(cells[0] + "：" + cells[1], 130))
            if len(missing) >= 4:
                break
    # monitors §5
    mon_body = sec(md, r"^## (?:§)?5[\. 、\s]")
    monitors = parse_monitors(mon_body)[:4]
    # leaders §6: bold company names + line (bullet or bare-bold-paragraph style)
    lbody = sec(md, r"^## (?:§)?6[\. 、\s]")
    leaders = []
    for mm in re.finditer(r"[-*]\s*\*\*(.+?)\*\*[：:](.+?)(?=\n[-*]\s*\*\*|\Z)", lbody, re.S):
        nm = clean(mm.group(1))
        leaders.append({"name": nm[:40], "line": clip(mm.group(2), 200)})
        if len(leaders) >= 2:
            break
    if not leaders:
        for mm in re.finditer(r"^\*\*(.+?)\*\*\s*\n(.+?)(?=^\*\*|\Z)", lbody, re.M | re.S):
            nm = clean(mm.group(1))
            leaders.append({"name": nm[:40], "line": clip(mm.group(2), 200)})
            if len(leaders) >= 2:
                break
    # historical ref §4 first paragraph
    refbody = sec(md, r"^## (?:§)?4[\. 、\s]")
    ref = clip(refbody.replace("\n", " "), 240)
    # gap count §7
    gbody = sec(md, r"^## (?:§)?7[\. 、\s]")
    gaps = len(re.findall(r"^\s*\d+\.", gbody, re.M))
    return {"slug": slug, "name": name, "code": code, "verdict": verdict, "plain": plain,
            "readings": readings, "missing": missing, "monitors": monitors,
            "leaders": leaders, "ref": ref, "gaps": gaps, "src": f"data/{f}"}

dossiers = [parse_dossier(*d) for d in DOSSIERS]
print("dossiers:", len(dossiers),
      "| plain ok:", sum(1 for d in dossiers if d["plain"]),
      "| monitors ok:", sum(1 for d in dossiers if d["monitors"]),
      "| leaders ok:", sum(1 for d in dossiers if d["leaders"]))
for d in dossiers:
    if not d["plain"] or not d["verdict"]:
        print("  !! weak:", d["slug"], bool(d["plain"]), bool(d["verdict"]))

# ── 13 A-layer §0 大白话（7 research.md + 6 trend_state.md）────────────
PLAIN_SRC = {
    "sec-ai": "deepdive/ai-compute/trend_state.md",
    "sec-hog": "deepdive/hog-cycle/trend_state.md",
    "sec-baijiu": "deepdive/baijiu/trend_state.md",
    "sec-ne": "deepdive/new-energy/trend_state.md",
    "sec-pharma": "deepdive/innovative-pharma/trend_state.md",
    "sec-auto": "deepdive/autos/trend_state.md",
    "sec-nonferrous": "deepdive/nonferrous/research.md",
    "sec-defense": "deepdive/defense/research.md",
    "sec-nonbank": "deepdive/nonbank-fin/research.md",
    "sec-machinery": "deepdive/machinery/research.md",
    "sec-computer": "deepdive/computer/research.md",
    "sec-media": "deepdive/media/research.md",
    "sec-chem": "deepdive/basic-chem/research.md",
}
plains = {}
for sid, rel in PLAIN_SRC.items():
    p = parse_plain(read(rel), rel)
    plains[sid] = {"items": p, "src": "data/" + rel}
    if not p:
        print("  !! plain missing:", sid, rel)

# ── company block extractor ─────────────────────────────────
def norm_comp(nm, code, bucket, block, src):
    b = block
    pe = (re.search(r"PE[ -]?TTM[：:]?\s*(?:约\s*)?\**([\d.]+)", b) or re.search(r"PE TTM \**([\d.]+)", b)
          or re.search(r"PE[（(]TTM[)）]\s*\**([\d.]+)", b) or re.search(r"PE\s+\**([\d.]+)\**\s*/\s*PB", b)
          or re.search(r"PE\(TTM\)/PB \**([\d.]+)", b))
    pb = (re.search(r"PB[（(]?LF[)）]?\s*[:：]?\s*(?:约\s*)?\**([\d.]+)", b) or re.search(r"PB \**([\d.]+)", b)
          or re.search(r"/\s*PB\s*\**([\d.]+)", b) or re.search(r"PB[（(]LF[)）]\s*\**([\d.]+)", b)
          or re.search(r"PE\s+[\d.]+\s*/\s*PB\s*\**([\d.]+)", b))
    TREND_KW = (r"主升|震荡|回调|蓄势|探底|出清|阴跌|主跌|修复|企稳|磨底|反弹|寻底|"
                r"破位|左侧|右侧|弱势|强势|止跌|崩塌|回落|新高|新低|高位|底部|补跌|剧震|减亏|扩张")
    tr = None
    for pat in (r"趋势状态[^。\n]*?[——→]\s*\*\*([^*]+)\*\*",
                r"趋势状态[（(][^)）]*[)）]?\s*[：:]\s*\*\*([^*]+)\*\*",
                r"趋势状态\s*[：:]\s*\*\*([^*]+)\*\*",
                r"趋势状态[^。\n]*?[——→]\s*[“「]([^“”」]{4,26})[”」]",
                r'趋势状态[^。\n]*?[——→]\s*"([^"]{4,26})"',
                r"趋势状态\s+[^|]*?→\s*([^|，。；]{2,24})(?:\s*\|\||$)",
                r'(?m)趋势状态[^\n]*"([^"]{4,26})"[^\n]*$',
                r"趋势状态[^\n]*——\s*([^，。；\n]{2,20})",
                r"趋势状态\s*[：:]\s*([^\n；;，,|]{2,26})"):
        _m = re.search(pat, b)
        if _m and re.search(TREND_KW, _m.group(1)):
            tr = _m
            break
    q1 = re.search(r"(?:2026)?Q1[^。\n]{0,120}", b) or re.search(r"2026Q1[^。\n]{0,120}", b)
    cond = re.search(r"成立[^：:\n]{0,12}[：:]\s*(.+?)(?=证伪|\n- \*\*|$)", b, re.S)
    veto = re.search(r"证伪(?:信号)?\*\*\s*[：:]\s*(.+?)(?=\n- \*\*|\n\*\*|$)", b, re.S)
    return {"name": nm, "code": code, "bucket": bucket,
            "trend": clean(tr.group(1))[:26] if tr else "",
            "pe": pe.group(1) if pe else None, "pb": pb.group(1) if pb else None,
            "q1": clip(q1.group(0), 110) if q1 else "",
            "cond": clip(cond.group(1), 170) if cond else "",
            "veto": clip(veto.group(1), 170) if veto else "",
            "src": src}

BUCKET_OF = lambda t: ("龙头" if "龙头" in t else "高成长" if "高成长" in t else
                       "高性价比" if "高性价比" in t else "观察名单" if "观察" in t else "")

def parse_dd_companies(md, src):
    """research §8 → companies. Handles: parens-bold, circled-bold, defense bold, table rows."""
    body = sec(md, r"^## 8[\. 、\s]")
    comps = []
    for chunk in re.split(r"(?=^### )", body, flags=re.M):
        hm = re.match(r"^###\s+(.+)", chunk)
        bucket = BUCKET_OF(hm.group(1)) if hm else ""
        # bold-header variants (A: parens w/ extra text; B: circled no-parens)
        for mm in re.finditer(
            r"\*\*(?:[①②③④⑤⑥⑦]b?\s*)?([一-鿿A-Za-z]+?)(?:[（(]([0-9]{6}\.[A-Z]{2})[^)）]*[)）]|\s+([0-9]{6}\.[A-Z]{2}))[^*\n]*\*\*(.*?)(?=\n\*\*(?:[①②③④⑤⑥⑦]b?\s*)?[一-鿿A-Za-z]+?(?:[（(][0-9]{6}|\s+[0-9]{6})|\n### |\Z)",
            chunk, re.S):
            nm = mm.group(1); code = mm.group(2) or mm.group(3); tail = mm.group(4)
            head = mm.group(0)[:200]
            bk = bucket
            bm = re.search(r"(?:角色)?标签[：:]\s*\*\*([^*]+)\*\*", head) or re.search(r"——\s*(龙头|高成长|高性价比|观察名单)", head)
            if bm: bk = re.sub(r"[①②③④⑤⑥⑦（(].*$", "", bm.group(1))
            comps.append(norm_comp(nm, code, bk, head + "\n" + tail, src))
        # table rows: | 公司 code | ... |  (column-aware via header)
        hdr = None
        for ln in chunk.split("\n"):
            if ln.startswith("|") and "公司" in ln and ("---" not in ln):
                hdr = [clean(c) for c in ln.strip().strip("|").split("|")]
        def colidx(keys):
            if not hdr: return None
            for i, h in enumerate(hdr):
                if any(k in h for k in keys): return i
            return None
        ipe, ipb = colidx(["PE"]), colidx(["PB"])
        iq1, itr = colidx(["Q1"]), colidx(["趋势"])
        for tm in re.finditer(r"^\|\s*\*?\*?([一-鿿A-Za-z]+)\*?\*?\s+([0-9]{6}\.[A-Z]{2})\s*\|(.+)$", chunk, re.M):
            cells = [clean(c) for c in ("|" + tm.group(1) + " " + tm.group(2) + "|" + tm.group(3)).strip().strip("|").split("|")]
            syn = []
            if ipe is not None and ipe < len(cells): syn.append("PE-TTM " + cells[ipe])
            if ipb is not None and ipb < len(cells): syn.append("PB " + cells[ipb])
            if iq1 is not None and iq1 < len(cells): syn.append("2026Q1 " + cells[iq1])
            if itr is not None and itr < len(cells): syn.append("趋势状态 " + cells[itr])
            comps.append(norm_comp(tm.group(1), tm.group(2), bucket, "；".join(syn) + " || " + tm.group(3), src))
    # dedupe
    seen, ded = set(), []
    for c in comps:
        if c["name"] not in seen:
            seen.add(c["name"]); ded.append(c)
    return ded

# ── trend_state: 3 subsection variants + table ──────────────
def parse_trend_subs(rel):
    md = read(rel)
    src = "data/" + rel
    out = {}
    pats = [
        r"^###\s+([一-鿿A-Za-z（）\-]+?)[（(]([0-9]{5,6}\.[A-Z]{2})[)）]\s*[·｜-]\s*([^—\n]+?)——\s*\*\*([^*]+)\*\*\s*\n(.*?)(?=^### |\Z)",   # ne/pharma/autos
        r"^###\s+\d+\.\s*([一-鿿A-Za-z（）\-]+?)[（(]([0-9]{5,6}\.[A-Z]{2})[)）]\s*｜([^｜]+)｜\s*状态[：:]\s*([^\n]+)\n(.*?)(?=^### |\Z)",          # hog/baijiu
        r"^###\s+([一-鿿A-Za-z（）\-]+?)[（(]([0-9]{5,6}\.[A-Z]{2})[)）]\s*—\s*([^\n*][^\n]*)\n(.*?)(?=^### |\Z)",                                          # ai-compute
    ]
    for pi, pat in enumerate(pats):
        for mm in re.finditer(pat, md, re.M | re.S):
            g = mm.groups()
            if pi == 2:
                nm, code, trend, body = g; tag = ""
            else:
                nm, code, tag, trend, body = g
            if nm in out:
                continue
            cond = re.search(r"成立[^：:\n]{0,12}[：:]\s*(.+?)(?=\n- \*\*证伪|\Z)", body, re.S)
            veto = re.search(r"证伪信号\*\*\s*[：:]\s*(.+?)(?=\n- \*\*|\Z)", body, re.S)
            out[nm] = {"name": nm, "code": code, "tag": clean(tag)[:30], "trend": clean(trend)[:26],
                       "cond": clip(cond.group(1), 170) if cond else "",
                       "veto": clip(veto.group(1), 170) if veto else "", "src": src}
    return out

def parse_trend_table(rel):
    md = read(rel)
    src = "data/" + rel
    out = {}
    for ln in md.split("\n"):
        if not ln.startswith("|") or "---" in ln or "公司" in ln:
            continue
        cells = [clean(c) for c in ln.strip().strip("|").split("|")]
        if len(cells) < 3 or not cells[0]:
            continue
        last = cells[-1]
        if not re.search(r"主升|震荡|回调|蓄势|探底|出清|阴跌|主跌|修复|企稳", last):
            continue
        out[cells[0]] = {"name": cells[0], "code": cells[1] if re.match(r"[0-9]{5,6}\.", cells[1]) else "",
                         "tag": "", "trend": last[:26], "cond": "", "veto": "", "src": src,
                         "row": " · ".join(cells[2:-1])[:150]}
    return out

def merge_trend(comp, trends):
    t = trends.get(comp["name"])
    if not t:
        return comp
    if not comp["trend"]: comp["trend"] = t["trend"]
    if not comp["cond"]:  comp["cond"] = t.get("cond", "")
    if not comp["veto"]:  comp["veto"] = t.get("veto", "")
    if not comp["bucket"] and t.get("tag"): comp["bucket"] = t["tag"]
    return comp


# ── assemble: trend stores + deepdive companies ─────────────
TRENDS = {}
for d in ("new-energy", "innovative-pharma", "autos"):
    TRENDS[d] = parse_trend_subs(f"deepdive/{d}/trend_state.md")
for d in ("hog-cycle", "baijiu", "ai-compute"):
    tt = parse_trend_table(f"deepdive/{d}/trend_state.md")
    tt.update(parse_trend_subs(f"deepdive/{d}/trend_state.md"))  # subsections add cond/veto
    TRENDS[d] = tt
print("trends:", {k: len(v) for k, v in TRENDS.items()})

DD = {}
for d in ("nonferrous", "defense", "nonbank-fin", "machinery", "computer", "media",
          "basic-chem", "ai-compute", "new-energy", "innovative-pharma", "autos",
          "hog-cycle", "baijiu"):
    md = read(f"deepdive/{d}/research.md")
    src = f"data/deepdive/{d}/research.md"
    comps = [merge_trend(c, TRENDS.get(d, {})) for c in parse_dd_companies(md, src)]
    # trend-only industries: pull in companies present in trends but missed by §8 parser
    have = {c["name"] for c in comps}
    for nm, t in TRENDS.get(d, {}).items():
        if nm not in have:
            comps.append({"name": nm, "code": t["code"], "bucket": t.get("tag", ""),
                          "trend": t["trend"], "pe": None, "pb": None, "q1": "",
                          "cond": t.get("cond", ""), "veto": t.get("veto", ""), "src": t["src"]})
    # grouped cond/veto bullets (media): 公司名——成立需看到：X。证伪：Y。
    body8 = sec(md, r"^## 8[\. 、\s]")
    for c in comps:
        if not c["cond"]:
            gm = re.search(re.escape(c["name"]) + r"——成立需看到[：:](.+?)。证伪[：:](.+?)。", body8, re.S)
            if gm:
                c["cond"] = clip(gm.group(1), 170); c["veto"] = clip(gm.group(2), 170)
    DD[d] = {"md": md, "comps": comps}
    print(f"{d:18s} comps={len(comps):2d} trend={sum(1 for c in comps if c['trend'])} "
          f"pe={sum(1 for c in comps if c['pe'])} cond={sum(1 for c in comps if c['cond'])}")

# ── 7 new A-layer deepdive sections ─────────────────────────
NEWDD = [
    ("nonferrous", "sec-nonferrous", "有色金属", "801050.SI",
     "基本面 RE_EXPANSION × 股价 CLEARING 并列", "hot",
     "有色:赚的是真钱,跌的是真股价——子金属必须拆开判",
     "Q1 营收 +31.7% 全市场第一、紫金 H1 预告约 391 亿,但指数自 1 月高点回撤三分之一;铜最健康、金转 profit_pressure 暂定、稀土政策二元——一个指数装着三种周期。"),
    ("defense", "sec-defense", "国防军工", "801740.SI",
     "EARLY_RECOVERY 暂定偏确认 · 基本面右侧×股价左侧", "hot",
     "军工:订单空窗期的「假背离」——沈飞利润腰斩是真的,行业好转也是真的",
     "Q1 行业净利 +19.36% 逐季走高,但六成系船舶/弹药贡献;主机厂盈利腰斩是旧型号收尾的结构性定价,股价 YTD -22.8% 跌的正是这些顶梁柱;映射 2019,扳机是十五五合同正式签订。"),
    ("nonbank-fin", "sec-nonbank", "非银金融", "801790.SI",
     "券商 RE_EXPANSION / 保险 BOTTOM_OBSERVATION", "hot",
     "非银:券商「天天爆满的饭店按淡季价格出售」,保险在等利率止跌",
     "券商中报全部预喜(+50~112%)、日均成交约 3 万亿,股价却低于 1 月高点两成——业绩右侧与估值左侧并存;保险保费正增但 10 年期国债 1.75% 压制投资收益,站回 2% 才松绑。"),
    ("machinery", "sec-machinery", "机械设备", "801890.SI",
     "工程机械 RE_EXPANSION(映射 2017)/ 机器人主题出清中段", "hot",
     "机械:挖机生意在变好,机器人故事在挤泡沫——同一指数两条线",
     "挖机销量连续两年多上行、H1 同比约 +25%、出口占近半,映射 2017 确认年;人形机器人主题两周最大回撤 -33%,属主题渗透早期的拥挤出清,等 7 月底特斯拉量产与订单验证。"),
    ("computer", "sec-computer", "计算机", "801750.SI",
     "结构性 EARLY_RECOVERY 暂定偏确认 × 股价 CLEARING 中段", "hot",
     "计算机:少数公司真靠 AI 收到钱了,但「利润翻倍」里有注水",
     "金山付费用户 4615 万、同花顺 Q1 营收 +40%——订阅制兑现组真实成立;但全行业 Q1 营收仅 +4~5%,金山 21.95 亿净利中 19.4 亿是投资收益;三条验证线兑现两条,才算和 2023 年不一样。"),
    ("media", "sec-media", "传媒", "801760.SI",
     "游戏 RE_EXPANSION / 影视 PROFIT_PRESSURE / 广告暂定", "warm",
     "传媒:游戏公司中报预喜五成到一倍,电影院线还在过冬",
     "游戏线新游流水强劲、H1 预告普遍 +50%~+120%,生意层面像 2013 年;影视线 H1 全国票房同比约 -40%;板块 1 月被 AI+游戏炒到八年新高后半年回撤 37%,7/17 收在全年低点。"),
    ("basic-chem", "sec-chem", "基础化工", "801030.SI",
     "BOTTOM_OBSERVATION → EARLY_RECOVERY 过渡", "obs",
     "化工:熬了四年「货多价贱」,现在天刚蒙蒙亮",
     "制冷剂涨到十年最高(配额制)、磷矿石高位,龙头 Q1 盈利重回增长;但 CCPI 指数仍在低位、钛白粉「涨价函≠拐点」是现成反例——涨价品种变多才天亮,目前只在过渡段。"),
]

def parse_splits(md):
    """Tables inside §6 → split tables (header + rows)."""
    body = sec(md, r"^## 6[\. 、\s]")
    tables, cur = [], []
    for ln in body.split("\n"):
        if ln.startswith("|"):
            cells = [clean(c) for c in ln.strip().strip("|").split("|")]
            if "---" in ln:
                continue
            cur.append(cells)
        else:
            if len(cur) >= 2:
                tables.append(cur)
            cur = []
    if len(cur) >= 2:
        tables.append(cur)
    out = []
    for t in tables[:2]:
        hdr, rows = t[0], t[1:7]
        out.append({"head": hdr[:6], "rows": [r[:6] for r in rows]})
    return out

deepdives = []
for slug, sid, name, code, badge, bcls, title, dek in NEWDD:
    md = DD[slug]["md"]
    vbody = sec(md, r"^## 6[\. 、\s]")
    para = ""
    for ln in vbody.split("\n"):
        t = re.sub(r"^[-*]\s+", "", clean(ln))
        if len(t) > 60 and not t.startswith("|") and not t.startswith("#"):
            para = clip(t, 420)
            break
    mons = parse_monitors(sec(md, r"^## 7[\. 、\s]"))[:5]
    deepdives.append({"slug": slug, "id": sid, "name": name, "code": code,
                      "badge": badge, "bcls": bcls, "title": title, "dek": dek,
                      "verdict": para, "splits": parse_splits(md), "monitors": mons,
                      "comps": DD[slug]["comps"], "src": f"data/deepdive/{slug}/research.md"})
    print(f"dd {slug:14s} verdict={len(para)>0} splits={len(deepdives[-1]['splits'])} mons={len(mons)}")

# ── 估值分位补丁：ai-compute companies_summary.csv ──────────
import csv as _csv
AI_PCT = {}
with open(os.path.join(BASE, "deepdive/ai-compute/companies_summary.csv"), encoding="utf-8") as fh:
    for row in _csv.DictReader(fh):
        AI_PCT[row["公司"]] = row.get("PE分位_基期", "")
for c in DD["ai-compute"]["comps"]:
    if c["name"] in AI_PCT and AI_PCT[c["name"]]:
        c["pePct"] = AI_PCT[c["name"]][:34]
# baijiu table rows carry 分位 column text inside q1/block → regex pull
for c in DD["baijiu"]["comps"]:
    if not c.get("pePct"):
        m = re.search(r"PE[- ]?TTM?\s*([\d.]+%)", c.get("q1", ""))
        if m:
            c["pePct"] = m.group(1)

# ── 行业公司矩阵 ────────────────────────────────────────────
def pick(d, names):
    pool = DD[d]["comps"]
    out = []
    for nm in names:
        hit = next((c for c in pool if c["name"] == nm or c["name"].startswith(nm) or nm in c["name"]), None)
        if hit:
            out.append(hit)
        else:
            print("  !! matrix miss:", d, nm)
    return out

def dossier_comp(slug, nm):
    d = next(x for x in dossiers if x["slug"] == slug)
    for ld in d["leaders"]:
        m = re.match(r"([一-鿿A-Za-z]+)[（(]([0-9]{6}\.[A-Z]{2})", ld["name"])
        if m and m.group(1) == nm:
            c = norm_comp(m.group(1), m.group(2), "龙头", ld["line"], "data/dossier/%s.md" % slug)
            c["q1"] = (re.search(r"2026Q1[^。]{0,90}", ld["line"]) or [None])
            c["q1"] = clip(c["q1"].group(0), 100) if c["q1"] else ""
            return c
    print("  !! dossier comp miss:", slug, nm)
    return None

MATRIX = [
    {"ind": "电子", "sub": "AI 算力硬件 · PCB/服务器/芯片", "code": "801080.SI", "side": "right",
     "note": "re_expansion 双族确认 · 回调即拥挤出清", "goto": "sec-ai",
     "comps": pick("ai-compute", ["工业富联", "沪电股份", "兆易创新", "澜起科技"])},
    {"ind": "通信", "sub": "光模块 / CPO", "code": "801770.SI", "side": "right",
     "note": "子链确认 · 指数层面暂定", "goto": "sec-ai",
     "comps": pick("ai-compute", ["中际旭创", "新易盛", "天孚通信"])},
    {"ind": "有色金属", "sub": "铜 / 铝子链", "code": "801050.SI", "side": "right",
     "note": "基本面右侧 × 股价左侧并列", "goto": "sec-nonferrous",
     "comps": pick("nonferrous", ["紫金矿业", "洛阳钼业", "中国铝业"])},
    {"ind": "电力设备", "sub": "锂电 / 储能", "code": "801730.SI", "side": "right",
     "note": "early_recovery 右侧初现", "goto": "sec-ne",
     "comps": pick("new-energy", ["宁德时代", "亿纬锂能", "阳光电源"])},
    {"ind": "国防军工", "sub": "主机厂 / 船舶 / 无人装备", "code": "801740.SI", "side": "right",
     "note": "early_recovery 暂定偏确认 · 等十五五合同", "goto": "sec-defense",
     "comps": pick("defense", ["中国船舶", "中航沈飞", "中无人机", "中航光电"])},
    {"ind": "医药生物", "sub": "创新药 / CXO", "code": "801150.SI", "side": "right",
     "note": "early_recovery → re_expansion 子链确认", "goto": "sec-pharma",
     "comps": pick("innovative-pharma", ["恒瑞医药", "药明康德", "百济神州", "信达生物"])},
    {"ind": "非银金融", "sub": "券商", "code": "801790.SI", "side": "right",
     "note": "券商 re_expansion · 成交中枢是命门", "goto": "sec-nonbank",
     "comps": pick("nonbank-fin", ["中信证券", "国泰海通", "东方财富", "华泰证券"])},
    {"ind": "机械设备", "sub": "工程机械", "code": "801890.SI", "side": "right",
     "note": "re_expansion · 映射 2017 确认年", "goto": "sec-machinery",
     "comps": pick("machinery", ["三一重工", "徐工机械", "恒立液压", "浙江鼎力"])},
    {"ind": "计算机", "sub": "AI 应用 · 订阅兑现组", "code": "801750.SI", "side": "right",
     "note": "结构性 early_recovery 暂定偏确认", "goto": "sec-computer",
     "comps": pick("computer", ["金山办公", "同花顺", "恒生电子"])},
    {"ind": "传媒", "sub": "游戏", "code": "801760.SI", "side": "right",
     "note": "游戏 re_expansion · 中报验证窗", "goto": "sec-media",
     "comps": pick("media", ["世纪华通", "巨人网络", "恺英网络"])},
    {"ind": "煤炭", "sub": "动力煤", "code": "801950.SI", "side": "right",
     "note": "early_recovery 暂定（上调半档）· 待中报确认", "goto": "dossier-coal",
     "comps": [c for c in (dossier_comp("coal", "中国神华"), dossier_comp("coal", "陕西煤业")) if c]},
    {"ind": "农林牧渔", "sub": "猪周期", "code": "801010.SI", "side": "watch",
     "note": "底部观察 · 能繁去化未到红线", "goto": "sec-hog",
     "comps": pick("hog-cycle", ["牧原股份", "温氏股份", "神农集团"])},
    {"ind": "食品饮料", "sub": "白酒", "code": "801120.SI", "side": "watch",
     "note": "底部观察 · 现金底未确认", "goto": "sec-baijiu",
     "comps": pick("baijiu", ["贵州茅台", "五粮液", "山西汾酒"])},
    {"ind": "基础化工", "sub": "制冷剂 / 磷化工", "code": "801030.SI", "side": "watch",
     "note": "bottom→early 过渡 · 涨价品种还不够多", "goto": "sec-chem",
     "comps": pick("basic-chem", ["万华化学", "巨化股份", "卫星化学"])},
    {"ind": "汽车", "sub": "整车", "code": "801880.SI", "side": "watch",
     "note": "底部观察 · 需求断崖未止", "goto": "sec-auto",
     "comps": pick("autos", ["比亚迪", "长城汽车", "上汽集团"])},
    {"ind": "银行", "sub": "股份行 / 国有大行", "code": "801780.SI", "side": "watch",
     "note": "底部观察 · 息差企稳信号未确认", "goto": "dossier-banks",
     "comps": [c for c in (dossier_comp("banks", "招商银行"), dossier_comp("banks", "工商银行")) if c]},
]
print("matrix industries:", len(MATRIX), "comps:", sum(len(m["comps"]) for m in MATRIX))

# ── 名词大白话词典（买菜级比方,每条 ≤2 行）─────────────────
GLOSSARY = [
    ("左侧 / 右侧", "LEFT / RIGHT SIDE", "左侧=证据没齐就进场，赌拐点；右侧=等数据确认拐点后再动。好比等公交：左侧是猜车要来就站进马路，右侧是看见车进站才起身。"),
    ("出清", "CLEARING", "行业里亏钱的企业和产能被一点点挤出去的过程。像菜市场收摊：撑不住的摊位先撤完，剩下的才敢涨价。"),
    ("驱动变量", "FORCING VARIABLE", "真正推动周期转向的那个开关——猪价之于养猪股、成交额之于券商。它先动，报表后动，股价最后动。也叫先行指标。"),
    ("确认族", "CONFIRMING FAMILY", "给拐点投票的独立证据组：价格、订单、库存、盈利各算一族。一族说了不算，至少两族同向才算确认。"),
    ("估值分位", "VALUATION PERCENTILE", "现在的估值在自己历史里的排队位置。分位 3% = 比过去 97% 的时间都便宜，像按身高排队站到了最前面。"),
    ("产能利用率", "CAPACITY UTILIZATION", "工厂机器真正开工的比例。100 台机器只开 70 台就是 70%——数字越低，闲置越狠，降价压力越大。"),
    ("库存系数", "INVENTORY MONTHS", "经销商手里的货按现在的卖速要几个月清完。系数 1.5 = 要压一个半月，数字越高说明渠道货堆得越狠。"),
    ("合同负债", "CONTRACT LIABILITIES", "客户提前打来、货还没发的钱（预收款）。白酒行业里它是经销商信心的存折：增加=愿意打钱，减少=渠道在撤退。"),
    ("拥挤度", "CROWDING", "同时挤在同一个交易里的资金密度。太挤时一点坏消息就踩踏——像演唱会散场只开一个门。"),
    ("底部观察", "BOTTOM OBSERVATION", "五阶段的第三站：跌不动了、个别先行指标冒头，但证据还不够两族——只能盯，不能判。"),
    ("双证据族确认", "TWO-FAMILY CONFIRMED", "本报告的升级门槛：价格/盈利一族 + 资金/订单一族，两族独立证据同向，才把「暂定」摘掉。"),
    ("旧数据闸门", "OLD-DATA GATE", "引用历史类比前的安检：必须还原当时的人能看到什么，不许用事后才知道的数据美化类比。"),
    ("same / different case", "TWO MAPS", "同一判定的两张地图：same 假设历史机制重演，different 假设这次不一样。两张都摆出来，不和稀泥。"),
    ("证伪信号", "FALSIFIER", "事先写好的认输线：哪几个数据一出现，当前判定就作废——避免死扛观点。"),
    ("均线 MA20/60/120", "MOVING AVERAGE", "最近 20/60/120 天的平均成本线。股价站上去=多数人解套，跌破=多数人套牢。"),
    ("量比", "VOLUME RATIO", "最近成交和之前相比是放量还是缩量。跌要缩量才算没人卖了，涨要放量才算有人真金白银在买。"),
]

# ── emit ────────────────────────────────────────────────────
CNT = {"plains": plains, "dossiers": dossiers, "deepdives": deepdives,
       "matrix": MATRIX, "glossary": GLOSSARY,
       "meta": {"built": "2026-07-18", "sources": "industry-cycle-output-ashare-2026-07-18/data"}}
with open(os.path.join(OUT, "content.js"), "w", encoding="utf-8") as f:
    f.write("window.CNT=" + json.dumps(CNT, ensure_ascii=False, separators=(",", ":")) + ";\n")
print("content.js", os.path.getsize(os.path.join(OUT, "content.js")), "bytes")
