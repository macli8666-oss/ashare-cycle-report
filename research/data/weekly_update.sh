#!/bin/bash
# 个股推荐池周更：Gildata 刷新 94 家 → 五桶重算 → 打包 → 提交并推送 GitHub Pages
# 由 launchd（Mac Studio）每周日 20:17 触发；也可手动执行。
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO" || exit 1
LOG="research/data/weekly_update.log"
{
  echo "=== $(date '+%F %T') weekly update start ==="
  [ -f src/js/pool-data.js ] && cp src/js/pool-data.js research/data/stock_pool/pool-data.prev.js
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

# ── Lark 富文本通知 ──
python3 research/data/notify_lark.py >> "$LOG" 2>&1
tail -7 "$LOG"
