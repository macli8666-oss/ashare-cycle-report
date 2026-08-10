# A 股行业周期定位图 · 璟隆研究

> **交接说明书**：这份 README 是写给"任何一台电脑上的 Kimi"看的。读完本文件，你就具备了继续维护和升级这套报告所需的全部上下文。

## 一、这是什么

- 一份覆盖**申万 31 个一级行业**的周期阶段判定报告（2026 年中版），含 13 个深潜行业、26 条监测信号、17 张公司证据档案卡，以及 **§8.85 个股推荐池**（94 家公司五桶分类，每周自动更新）。
- 线上地址：https://macli8666-oss.github.io/ashare-cycle-report/ （GitHub Pages，main 分支根目录托管）
- 数据基准：行业行情与个股推荐池截至 **2026-08-07 收盘**，财务截至 **2026 年一季报**。
- 根目录的 `index.html` 是**单文件部署产物**（约 1.3 MB），由打包脚本生成，**不要手工改它**。

## 二、仓库结构

| 路径 | 内容 | 改不改 |
|---|---|---|
| `index.html` | 部署产物（bundle 后的单文件） | ❌ 只由打包流程覆盖 |
| `src/` | 网站工程源码：`index.html`（源）、`css/style.css`、`js/`（data.js / content.js / sources.js / pool-data.js 等数据文件 + 各渲染脚本）、`tools/bundle.py`、`BUILD_LOG.md` | ✅ 所有改动在这里做 |
| `research/` | 研究底稿：`cycle_report.json`、`cycle_brief.md`、`data/industry_master.csv`（31 行业量化总表）、`data/deepdive/`、`data/dossier/`、`data/stock_pool/`（94 家 K 线/估值 CSV） | ✅ 更新判定/数据时同步改 |
| `research/data/` 脚本 | `pull_stock_pool.py`（Wind 拉数）、`pull_stock_pool_gildata.py`（Gildata 拉数，**周更主用**）、`compute_stock_pool.py`（五桶计算）、`weekly_update.sh`（周更流水线）、`notify_lark.py`（Lark 卡片通知） | 改逻辑时同步更新 README |
| `tools/agent_gw.py` | 取数网关垫片（见第五节） | 一般不动 |

## 三、日常更新流程

```bash
cd src
# 1. 改 src/index.html / src/css/style.css / src/js/*
python3 tools/bundle.py           # 产出 src/dist-single.html
cp dist-single.html ../index.html # 覆盖仓库根目录部署产物
cd ..
git add -A && git commit -m "update" && git push origin main
# GitHub Pages 约 1 分钟自动重建，访问线上地址验证
```

本地预览：在 `src/` 下 `python3 -m http.server 8761`，浏览器开 `http://localhost:8761/`（测完务必 Ctrl+C 停掉）。

## 四、两台机器与凭证（重要）

项目在**两台 Mac**上各有一份 checkout，远程仓库是唯一同步点：

| 机器 | 仓库路径 | 说明 |
|---|---|---|
| 家里 MacBook（本机） | `/Users/mac/Documents/Kimi/Workspaces/股票/ashare-cycle-report` | 主要开发机 |
| 办公室 Mac Studio | `~/ashare-cycle-report`（用户 supermac，home 目录，**不在 Documents**——launchd 无权访问 Documents） | 常开机，跑周更 |

- **GitHub PAT 已明文存于两台机器各自仓库的 origin URL 里**（`.git/config`），`git push origin main` 直接可用。这是项目所有者的明确决定：本机使用、风险自担。注意 token 不进任何被跟踪的文件；若仓库转公开，先在 GitHub 吊销并换新 token。
- **Gildata 凭证**：`~/.kimi/agent-gw.json`（两台机器均已配置）。
- **协作纪律：开工前先 `git pull origin main`**，避免双机改动冲突。
- SSH 到 Studio：本机 `~/.ssh/config` 有 `studio` 别名（经 Tailscale），`ssh studio` 直连。

## 五、每周自动更新（Mac Studio · launchd）

- **触发**：Studio 上 launchd 任务 `com.jinglong.ashare-weekly`，**每周日 20:17**（plist 在 Studio 的 `~/Library/LaunchAgents/`）。
- **流水线**（`research/data/weekly_update.sh`）：备份上周 pool-data → Gildata 刷新 94 家（`--refresh`）→ 五桶重算 → 打包 → commit & push → 发 Lark 卡片。
- **Lark 通知**：`notify_lark.py` 发互动卡片（五桶分布 + 重点桶个股名单含回撤与触发价 + 桶间迁移名单），webhook 写死在脚本里。
- **日志**：Studio 上 `~/ashare-cycle-report/research/data/weekly_update.log`。
- **手动补跑**：`ssh studio 'launchctl kickstart gui/$(id -u)/com.jinglong.ashare-weekly'`，或到 Studio 上直接执行 `weekly_update.sh`。
- 家 MacBook 上的旧 Kimi 定时任务已停用，不要再启用，避免双机推送打架。

## 五之二、每日收盘盯盘（Mac Studio · launchd）

- **触发**：Studio 上 launchd 任务 `com.jinglong.ashare-daily-watch`，**每周一至周五 16:17**（A 股收盘后），执行 `research/data/daily_job.sh`。
- **流水线**：`daily_watch.py`（聚焦名单状态变化→Lark）→ `trade_tracker.py`（信号台账推进：新开仓/平仓→Lark）→ 打包 → commit & push。
- **盯盘名单**每日从 `src/js/pool-data.js` 动态生成——🟢右侧贴线位（距 MA60≤5%）、🟠主升贴线位（距 MA20≤5%）、🟡等触发（距 MA60≤3%）；只有状态**变化**才推 Lark，平时静默。
- **状态文件**：`research/data/watch_state.json`（本机状态，已 gitignore）。

## 五之三、信号台账与规则自我进化（§8.86）

- **台账引擎** `trade_tracker.py`：信号 = 收盘上穿 MA60（幅度≤entry_band）→ 次日开盘价模拟入场 → 出场双轨止盈（破 MA(tp_ma) 或峰值回撤 tp_dd）+ 连续 stop_days 日收 MA60 下止损，次日开盘价成交。`--bootstrap` 全历史回放重建台账；`--local` 用本地CSV（周更时）。
- **规则配置** `rules_config.json`：当前参数 + changelog，网站台账页展示。
- **自我进化** `self_evolve.py`（每周日随周更跑）：94 家全历史回放检验相邻参数网格，满足安全栏才自动调参——样本≥10 笔、期望值提升>10%、交易数覆盖≥80%、每周最多一格、同参数 28 天冷却；每次变更推 Lark 告知新旧规则与证据。
- **数据文件**：`signals_ledger.json`（台账明细）→ 生成 `src/js/ledger-data.js`。

## 六、数据工具（Wind / Gildata）

两个插件都需要在 Kimi 插件市场里已安装；凭证在网关侧或 `~/.kimi/agent-gw.json`。

**Gildata**（个股日K/估值，周更主用，稳定）：

```bash
cd "$HOME/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/kimi-code/home/plugins/managed/gildata-aifinmarket"
python3 scripts/gildata_tool.py call --api-name gildata_fin_query \
  --params-json '{"query":"<自然语言查询>","file_path":"/tmp/out.csv"}'
```

技巧：日K 查询要写明"不复权"；单次查询实体≤3 个；港股加"港股"二字。单票单次调用可同时拿到日K 表 + 实时行情表（含 PE(TTM)/市值）。

**Wind**（行业聚合/宏观/板块首选；个股批量拉取慎用）：

```bash
PLUGINS="$HOME/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/kimi-code/home/plugins/managed"
node "$PLUGINS/wind-allskill/skills/wind-mcp-skill/scripts/cli.mjs" call <server_type> <tool_name> '<json>'
```

铁律：单次调用只放一个标的；日期 `yyyyMMdd`；`question` 无空格；参数先查插件里的 `references/tool-contracts.md`。**连续约 96 次以上个股调用会触发 Too many requests 限流，需冷却 30 分钟以上**——所以批量个股拉取一律走 Gildata 脚本。

**agent_gw 垫片**：插件脚本依赖 `agent_gw` Python SDK。若报 `ModuleNotFoundError: agent_gw`，把 `tools/agent_gw.py` 复制到 Kimi 托管 Python 的 site-packages（见 git 历史中的命令示例）。

## 七、个股推荐池五桶规则（§8.85，compute_stock_pool.py）

对 94 家用不复权日K 统一计算（距 52 周高低点、vs MA20/60/120、20/60 日涨幅、量比），优先级 红>橙>绿>黄>蓝：

| 桶 | 条件 | 触发/离场线 |
|---|---|---|
| 🔴 尾声预警 | 距高点 15% 内，20 日跌超 8% 且跌破 MA20 | 解除线 = MA20 |
| 🟠 主升中段 | MA60 上方，距高点 15% 内，60 日涨幅超 10% | 离场线 = MA20 |
| 🟢 右侧确认 | 行业档位≥3 且 MA60 上方且 2026Q1 增长 | 离场线 = MA60 |
| 🟡 底部蓄势 | 距高点跌超 25%，重新站上 MA20，缩量或 20 日转正 | 触发价 = MA60 |
| 🔵 超跌观察 | 距高点跌超 30% 且仍未止跌 | 触发价 = MA20 |
| ⚪ 过渡观察 | 不满足以上任一 | — |

桶内排序 = 距离下一触发最近者在前。成立条件/证伪线：46 家深潜公司复用原报告文字，其余按模板生成（引用具体均线价位）。

## 八、判定方法论（改任何判定前必读）

1. **五阶段**：出清中 → 底部观察 → 复苏初期 → 再扩张 → 盈利承压。
2. **升级要双确认**：先行指标好转 + ≥1 个独立证据族（订单/库存/价格/产能）共振；单族证据只能标"暂定"。
3. **降级看证伪线**：预登记的证伪条件被击穿即降一档，不需要第二个信号。
4. **升降都只看经营数据**（批价、能繁、排产、capex、库存系数、订单……），**绝不因股价涨跌改判**。
5. 个股推荐池的口径：不给目标价、不做点位预测；每只票带「成立条件 + 证伪线」；每个数字带期间、单位、来源、日期；取不到的数据画缺口，不编造。
6. 文案风格：**大白话**，少专业术语。

## 九、当前判定快照（2026-08-07）

- **右侧（复苏初期/再扩张，含暂定）**：电子、通信（算力子链）、有色（铜/铝；黄金承压暂定）、电力设备（锂电/储能；光伏仍出清）、军工（暂定偏确认）、医药（创新药/CXO）、非银（券商）、机械（工程机械）、计算机（暂定）、传媒（游戏）、煤炭（暂定上调，待中报确认）
- **临近拐点/底部观察**：猪周期、白酒、基础化工（制冷剂子链已确认）、汽车、银行、美容护理、环保、石油石化、交运（油运右侧/快递暂定/集运承压）、钢铁、建材、纺织服饰、零售（暂定边缘）、社服、公用事业（水电暂定）
- **承压/出清中段**：光伏、房地产、建筑装饰、家电、轻工
- **综合（801230）**：不评级（指数≈单一个股，无行业意义）

完整论据见 `research/cycle_brief.md` 与 `research/cycle_report.json`。

---

*璟隆研究 · 数据：Wind / 恒生聚源 Gildata / 公开资料 · 本报告为周期研究框架展示，不构成投资建议*
