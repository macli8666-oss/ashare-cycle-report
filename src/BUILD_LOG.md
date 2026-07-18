# BUILD LOG · A股行业周期定位图 · 2026 年中

## 数据管线
- `tools/compile_data.py` → `data.js`（608,890 bytes，42 条来源 / 31 个行业）。
- 银行(801780.SI) Q1 营收按缺口处理：扫描口径估算值不作事实引用，主表渲染 "—*" 并附钻取说明；条形图银行行沉底 + 虚框「缺口」。

## QA（全部通过）
- 双宽度 1680 / 1280 慢滚：0 pageerrors、0 console errors、无横向溢出（scrollW == clientW）。
- 字体 gate：et-book / Songti SC / Menlo 三项 true（et-book 为 base64 data-URI @font-face，file:// 可用）。
- 标签零重叠零出界；reducedMotion 0 错误；封面四态（递归/拆解/蓝图/开箱）构图成立。
- 8 个 drill-down 抽查全部打开且带来源（K33/K35 等）。
- 导航「深潜行业▾」hover 展开 6 链接，0 pageerrors（qa/nav-hover.png）。
- 证据：qa/results.json、qa/*.png、qa/dist-results.json、qa/nav-hover.png。

## 本轮修复记录
1. cover.js：`U.bindCanvas` 返回值误用 → `fit()` 正确解构；加文字幕 wash。
2. cover-exploded.js / cover-wire.js：cv 绑定缺失、相机越界、标签撞图签、`on-blue` 浅色文字层。
3. chart-stockline.js：JSON 键下划线 vs 宿主 id 连字符 → 7 条 stockline 静默不渲染，已修。
4. chart-verdict.js / chart-evidence.js：砝码标签移位 + halo；仪表盘指针缩短防撞区标签。
5. 表格横向溢出：`.tbl-host{max-width:100%;overflow-x:auto}`。
6. QA 拍摄假象：章节截图前 scrollIntoView + sleep 2300ms；封面改 clip 拍。

## 打包
- `python3 tools/bundle.py dist/index.html`（已删 vendor/land-110m.json 内联块，本站点无 vendor 依赖）。
- 产物：`dist/index.html`（1,027,075 bytes 单文件）。
- file:// 验证（qa/dist-verify.js）：0 pageerrors / 0 console errors / 0 失败请求 / 无横向溢出 / 字体 3 项 true / 25 canvas。

## 运行
- 开发预览：`npm run dev` → `node scripts/serve.js --port 7100`。
- 单文件分发：直接打开 `dist/index.html`（file:// 可用，无外部依赖）。

## 2026-07-18 内容大升级（6 → 31 行业全覆盖 + 大白话改造）
### 数据管线（新增）
- `tools/compile_content.py`（新，~570 行）→ `js/content.js`（178,490 bytes，`window.CNT`）：
  7 个新深潜 research.md（§0 大白话/§6 判定+子链拆解/§7 监测/§8 公司层）、6 个 trend_state.md
  （41 家公司趋势状态）、17 个 dossier/*.md（大白话/判定/读数/缺失确认族/监测/龙头/历史映射/缺口数）。
  结构：`plains(13)` / `dossiers[17]` / `deepdives[7]` / `matrix[16 行业 51 公司]` / `glossary[16]`。
- `tools/compile_data.py`（改）→ `js/data.js`：煤炭上调 early_recovery 暂定、公用事业改判
  profit_pressure、军工/计算机暂定偏确认、传媒体子链确认；每行业新增 `layer`(A14/B17) 与
  `goto`（A→深潜章节锚，B→`dossier-<slug>` 档案卡锚）。

### 解析修复记录（本轮）
1. dossier verdict：`**判定**：内容` 格式被旧正则截成字面「判定」→ 新正则取冒号后整句（coal/oil-petro/utilities/environmental 四个修复）。
2. 公司 trend 错位：computer 无 trend_state.md，research §8 的「趋势状态：<长描述>」被 fallback 正则截出
   `收 41.12`/`现价 50.90 元` 等碎片 → trend 提取改为九条候选正则 + 趋势关键词校验，
   新增尾引号短语（"左侧寻底中"）与 `——` 尾短语（弱势磨底/左侧破位等）两条规则；8 处脏数据清零。
3. matrix 煤炭/银行 goto 由笼统 `sec-dossier` 改为 `dossier-coal` / `dossier-banks` 精准锚点。
4. 深潜 verdict 段 markdown 列表符 `- ` 前缀清理。

### 渲染（新增 js/render-content.js，~330 行）
- 13 个 §0 大白话盒注入（6 旧章节插 dek 后 + 7 新章节内置）；16 条大白话词典卡；
- 7 个新深潜章节（§8.1–§8.7，深潜 ⑦–⑬）：stage-badge + h2/dek + 大白话 + 情景推演 +
  subnav 链（下一行业…→公司矩阵）+ 子链拆解表 + 监测表（met/partial/missing 三色 chip）+
  公司表（公司名/Q1 可钻取，trend 四色徽标：主升 hot / 高位 blue / 回调修复 copper / 底部 green / 主跌 neg）。
- 公司矩阵（§8.8）：右侧进行中 11 行业 + 左侧观察名单 5 行业（虚线框 + 「左侧观察」角标），
  51 张公司卡（bucket/趋势徽标/PE·PB·分位/Q1/成立/证伪），整卡可钻取。
- 全景档案（§8.9）：17 张 B 层档案卡（判定块 + 大白话折叠 + 变量读数表 + 缺失前 3 +
  监测 chip 行 + 龙头 2 条 + 历史映射 + 缺口计数），id=`dossier-<slug>` 支持地图跳转 :target 高亮。

### 地图与导航
- chart-map.js：行业名按 layer 三档着色（A 实心/B 中灰/其余浅灰）；点击仪表盘 scrollIntoView 到
  goto 锚点（31/31 全行业可跳）；标题改「10 个…10 个」；副标题改「点击进入对应章节/档案」。
- main.js navMap：新增 7 深潜→deep、sec-matrix/sec-dossier/sec-glossary 映射；sec-company→sec-matrix。
- 导航子菜单：右侧进行中 9 + 临近拐点 4 分组（.tn-grp 分组头），max-height 76vh + overflow-y 防超屏。

### QA（全部通过）
- run.js 全量 gates（SECTIONS 扩至 24 节）：1680/1280 双宽度慢滚，0 pageerrors / 0 console errors /
  无横向溢出；字体三项 true；reducedMotion 0 错误；468 个钻取点；errors[] 空。
- 新增钻取抽查 ≥5：地图 A 层点击→sec-nonferrous ✓、地图 B 层点击（钢铁）→dossier-steel 贴顶 ✓、
  深潜公司名 kn ✓（紫金矿业 全文+来源）、矩阵卡 ✓（工业富联 成立/证伪全文）、
  档案监测行 ✓（煤炭 Q5500 PARTIAL+阈值）、深潜监测 chip ✓（传媒游戏 MET）。
- 导航子菜单 13 条展开不超屏、传媒链接跳转 top 48px（qa/shots/nav-deep.png）。
- dist 单文件渲染计数：16 词典卡 / 51 公司卡 / 17 档案卡 / 13 大白话盒 / 7 深潜章节，0 错误。
- 证据：qa/results.json、qa/shots/m1–m7 + d2/d3 + nav-deep + dist-matrix.png、qa/sec-*-{1280,1680}.png。

### 打包（本轮）
- `python3 tools/bundle.py dist/index.html` → 1,238,257 bytes 单文件。
- file:// 验证：0 pageerrors / 0 console errors / 0 失败请求 / 无横向溢出 / 字体 3 项 true / 25 canvas。

### 内容取舍（如实记录）
- 已知字段缺口（卡片画「—」不编造）：media trend 3/7 缺、machinery PE 2/6 缺、new-energy PE 3/8 缺、
  hog PE 3/5 缺、media cond 6/7 缺（分组式成立条件原文未逐家拆分）、龙佰集团 trend 缺
  （源文无「趋势状态」字段，作为「涨价函≠拐点」反例标本保留）。
- 银行 Q1 营收维持缺口处理「—*」；综合（801230）维持不评级空心盘。
- 深潜导航二级菜单只分「右侧进行中/临近拐点」两组：13 个 A 层行业无「出清中段」判定
  （出清中段行业全部在 B 层档案），故不设第三组。
