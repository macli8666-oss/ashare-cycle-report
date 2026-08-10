#!/bin/bash
# 每日收盘任务：盯盘状态变化推送 → 信号台账推进（新开仓/平仓）→ 打包 → 提交推送
# 由 launchd（Mac Studio）周一至周五 16:17 触发。
set -u
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO" || exit 1
LOG="research/data/daily_job.log"
{
  echo "=== $(date '+%F %T') daily job start ==="
  python3 research/data/daily_watch.py
  python3 research/data/trade_tracker.py
  (cd src && python3 tools/bundle.py && cp dist-single.html ../index.html)
  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "台账/盯盘日更：$(date +%F)"
    if git push origin main; then echo "PUSH OK"; else echo "PUSH FAIL"; fi
  else
    echo "no changes"
  fi
  echo "=== $(date '+%F %T') daily job done ==="
} >> "$LOG" 2>&1
tail -6 "$LOG"
