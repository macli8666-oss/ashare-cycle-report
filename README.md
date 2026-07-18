# A 股行业周期定位图 · 璟隆研究

> **交接说明书**：这份 README 是写给"任何一台新电脑上的 Kimi"看的。读完本文件，你就具备了继续维护和升级这套报告所需的全部上下文。

## 一、这是什么

- 一份覆盖**申万 31 个一级行业**的周期阶段判定报告（2026 年中版），含 13 个深潜行业、26 条监测信号、17 张公司证据档案卡。
- 线上地址：https://macli8666-oss.github.io/ashare-cycle-report/ （GitHub Pages，main 分支根目录托管）
- 数据基准：行情截至 **2026-07-17 收盘**，财务截至 **2026 年一季报**，部分宏观数据至 2026-06。
- 根目录的 `index.html` 是**单文件部署产物**（约 1.2 MB），由打包脚本生成，**不要手工改它**。

## 二、仓库结构

| 路径 | 内容 | 改不改 |
|---|---|---|
| `index.html` | 部署产物（bundle 后的单文件） | ❌ 只由打包流程覆盖 |
| `src/` | 网站工程源码：`index.html`（源）、`css/`、`js/`（数据与交互）、`tools/bundle.py`、`scripts/serve.js`、`BUILD_LOG.md`、`qa/results.json` | ✅ 所有改动在这里做 |
| `research/` | 研究底稿：`cycle_report.json`（主结构化结论）、`cycle_brief.md`（文字简报）、`data/industry_master.csv`（31 行业量化总表）、`data/deepdive/`（13 个深潜行业研究）、`data/dossier/`（17 张公司档案）、`data/web_research_2026H1.md`（同期公开证据）、`data/sw_daily*/wind_*`（原始行情/估值数据） | ✅ 更新判定/数据时同步改 |
| `tools/agent_gw.py` | 取数网关垫片（见第五节） | 一般不动 |

## 三、日常更新流程

```bash
cd src
# 1. 改 src/index.html / src/css/style.css / src/js/*
python3 tools/bundle.py          # 产出 src/dist-single.html
cp dist-single.html ../index.html # 覆盖仓库根目录部署产物
cd ..
git add -A && git commit -m "update" && git push
# GitHub Pages 约 1 分钟自动重建，访问线上地址验证
```

本地预览：在 `src/` 下 `npm run dev`（serve.js，7100 端口）。

## 四、部署凭证（重要）

- 推送需要 GitHub fine-grained PAT（对本仓库有 Contents 读写权限）。
- 临时克隆姿势：`git clone https://macli8666-oss:<TOKEN>@github.com/macli8666-oss/ashare-cycle-report.git`
- **永远不要把 token 写进仓库里的任何文件**，也不要把带 token 的 remote 长期留在本地仓库。用临时目录克隆、推完即删。
- token 由项目所有者（用户）线下保管；如果它没有给你 token，问用户要，或让用户去 GitHub → Settings → Developer settings → Fine-grained personal access tokens 重新生成。

## 五、数据工具（Wind / Gildata）

两个插件都需要在 Kimi 插件市场里已安装；凭证在网关侧，无需用户配置。

**Wind**（A 股行情/财务/板块/宏观首选）：

```bash
PLUGINS="$HOME/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/kimi-code/home/plugins/managed"
node "$PLUGINS/wind-allskill/skills/wind-mcp-skill/scripts/cli.mjs" call <server_type> <tool_name> '<json>'
```

铁律：单次调用只放一个标的；日期格式 `yyyyMMdd`；`question` 参数里**不能有空格**；工具名和参数先查插件里的 `references/tool-contracts.md`。

**Gildata**（个股财务/公告/研报/新闻补充）：

```bash
cd "$PLUGINS/gildata-aifinmarket"
python3 scripts/gildata_tool.py call --api-name gildata_fin_query \
  --params-json '{"query":"<自然语言查询>","file_path":"/tmp/out.csv"}'
```

注意：申万行业聚合查询会返回空（改用逐股查询）；有日调用上限，省着用。

**agent_gw 垫片**：插件脚本依赖 `agent_gw` Python SDK。若报 `ModuleNotFoundError: agent_gw` 或 SDK 安装源不可达，把本仓库 `tools/agent_gw.py`（零依赖纯标准库）复制到 Kimi 托管 Python 的 site-packages：

```bash
cp tools/agent_gw.py "$HOME/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/python/.venv/lib/python3.12/site-packages/"
```

（python3.12 目录名以实际版本为准。）

**限流**：Wind/Gildata 都不耐高并发，取数一律串行或小批量，429 就退避。

## 六、判定方法论（改任何判定前必读）

1. **五阶段**：出清中 → 底部观察 → 复苏初期 → 再扩张 → 盈利承压。
2. **升级要双确认**：先行指标好转 + ≥1 个独立证据族（订单/库存/价格/产能）共振，才能确认升档；单族证据只能标"暂定"。
3. **降级看证伪线**：每个行业判定时的预登记证伪条件被击穿，即降一档，不需要第二个信号。
4. **升降都只看经营数据**（批价、能繁、排产、capex、库存系数、订单……），**绝不因股价涨跌改判**。
5. **合规红线**：不给买卖建议、不给目标价、不出现"买入/卖出"字样；公司只给"证据特征标签 + 成立条件/证伪信号"；每个数字带期间、单位、来源、日期；取不到的数据画缺口，不编造。
6. 文案风格：**大白话**，少专业术语，让非专业读者看懂。

## 七、自动化（定时更新）

- 定时任务绑定**单机**，不随 Kimi 账号云同步。换电脑后：在新电脑上重建任务，旧电脑上的任务停用/删除，避免两台机器互相覆盖部署。
- 任务逻辑 = 串行拉取 26 条信号的最新读数 → 对照阈值 → 触发则按第六节方法论重评 → 走第三节流程重部署。

## 八、当前判定快照（2026-07-17）

- **右侧（复苏初期/再扩张，含暂定）**：电子、通信（算力子链）、有色（铜/铝；黄金承压暂定）、电力设备（锂电/储能；光伏仍出清）、军工（暂定偏确认）、医药（创新药/CXO）、非银（券商）、机械（工程机械）、计算机（暂定）、传媒（游戏）、煤炭（暂定上调，待中报确认）
- **临近拐点/底部观察**：猪周期、白酒、基础化工（制冷剂子链已确认）、汽车、银行、美容护理、环保、石油石化、交运（油运右侧/快递暂定/集运承压）、钢铁、建材、纺织服饰、零售（暂定边缘）、社服、公用事业（水电暂定）
- **承压/出清中段**：光伏、房地产、建筑装饰、家电、轻工
- **综合（801230）**：不评级（指数≈单一个股，无行业意义）

完整论据见 `research/cycle_brief.md` 与 `research/cycle_report.json`。

---

*璟隆研究 · 数据：Wind / Gildata / 公开资料 · 本报告为周期研究框架展示，不构成投资建议*
