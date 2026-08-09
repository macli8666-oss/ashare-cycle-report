#!/bin/bash
# 个股推荐池周更：Gildata 刷新 94 家 → 五桶重算 → 打包 → 提交并推送 GitHub Pages
# 由 launchd（Mac Studio）每周日 20:17 触发；也可手动执行。
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO" || exit 1
LOG="research/data/weekly_update.log"
{
  echo "=== $(date '+%F %T') weekly update start ==="
  python3 research/data/pull_stock_pool_gildata.py --refresh --start 0 --limit 94
  python3 research/data/compute_stock_pool.py
  (cd src && python3 tools/bundle.py && cp dist-single.html ../index.html)
  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "个股推荐池周更：数据刷新至 $(date +%F)"
    if git push origin main; then echo "PUSH OK"; else echo "PUSH FAIL"; fi
  else
    echo "no changes, skip commit/push"
  fi
  echo "=== $(date '+%F %T') weekly update done ==="
} >> "$LOG" 2>&1

# ── Lark 通知 ──
LARK_HOOK="https://open.larksuite.com/open-apis/bot/v2/hook/fbb992ff-8755-457c-afdd-f06617366d47"
COUNTS=$(grep "^counts:" "$LOG" | tail -1 | sed "s/^counts: //")
ASOF=$(grep "^as_of:" "$LOG" | tail -1 | awk '{print $2}')
PUSHSTAT=$(grep -E "^PUSH (OK|FAIL)$|no changes" "$LOG" | tail -1)
TEXT="【个股推荐池周更】$(date '+%F %T')\n数据截至: ${ASOF:-未知}\n五桶分布: ${COUNTS:-未知}\nGitHub 推送: ${PUSHSTAT:-未知}\n日志: ~/ashare-cycle-report/research/data/weekly_update.log"
curl -s -m 20 -X POST -H "Content-Type: application/json" \
  -d "{\"msg_type\":\"text\",\"content\":{\"text\":\"$TEXT\"}}" "$LARK_HOOK" >> "$LOG" 2>&1
tail -7 "$LOG"
