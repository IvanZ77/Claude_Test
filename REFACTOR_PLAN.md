# 上海生活计算器 → 多城市 + FIRE 重构计划

## Context

当前 `index.html` 是一个 974 行的单文件应用，所有数据（6 档生活方式、小区/学校/餐厅示例、类别颜色）都硬编码在 JS 数组 `T`、`CATS`、`CC` 中，所有计算常量（4% 提取率、20% 税率、6.8 汇率）也写死在 `upd()` 函数里。

**目标**：把它改造成一个**可扩展的多城市生活方式 + FIRE 规划工具**，并且：
- 数据层与逻辑层完全分离，新增城市 = 加一个 JSON 文件 + cities.json 注册一行（不动 JS）
- 新增 FIRE 计算器模块（FIRE Number、年限预测、Lean/Regular/Fat/Coast 分级、通胀调整 + 资产增长时间线）
- 新增城市对比模式（同样资产，2-3 个城市并排对比）
- 新增可调参数面板（提取率、税率、汇率、收益率、通胀率）
- URL 状态分享加强版（城市 + 资产 + 所有自定义参数）

**约束**：
- 保持纯静态（HTML/CSS/JS + ES Modules，无构建工具）
- 直接部署到 GitHub Pages
- 仅中文（不做 i18n）

---

## 迁移进度

### ✅ **第 1 步：加 `.nojekyll`** — 完成
- 创建 `.nojekyll` 文件，确保 GitHub Pages 不套用 Jekyll 规则

### ✅ **第 2 步：数据外置** — 完成
- ✓ 创建 `data/cities.json` - 城市索引（上海、北京、东京占位）
- ✓ 创建 `data/categories.json` - 7 类预算标签 + 颜色
- ✓ 创建 `data/fire-tiers.json` - Lean/Regular/Fat/Coast FIRE 分级
- ✓ 创建 `data/defaults.json` - 默认参数 + range
- ✓ 创建 `data/cities/shanghai.json` - 从 T[] 迁移的 6 档生活方式完整数据
- ✓ 所有 JSON 文件通过语法检查

**下一步：第 3 步 - CSS 拆分**

---

## 最终目录结构

```
/
├── index.html                          # 骨架：head + 语义 sections + <script type="module">
├── README.md                           # 更新为新架构 + "如何添加一个城市"
├── .nojekyll                           # ✓ GitHub Pages 不要套用 Jekyll 规则
├── .github/workflows/pages.yml         # 现有 deploy workflow
│
├── data/                               # ✓ 数据层完全独立
│   ├── cities.json                     # ✓ 城市索引（id, name, file, currency, fxToCNY, available）
│   ├── categories.json                 # ✓ 7 类预算（共享的标签 + 颜色）
│   ├── fire-tiers.json                 # ✓ Lean/Regular/Fat FIRE 阈值
│   ├── defaults.json                   # ✓ 默认可调参数 + range 配置
│   └── cities/
│       ├── shanghai.json               # ✓ 现有 T[] 数据迁移
│       ├── beijing.json                # (占位，available: false)
│       └── tokyo.json                  # (占位，available: false)
│
├── assets/
│   ├── css/
│   │   ├── tokens.css                  # CSS 变量、亮/暗主题、间距、字号
│   │   ├── base.css                    # reset + body + 排版
│   │   ├── components.css              # slider / tier-strip / tier-panel / compare-grid / param-panel / fire-card
│   │   └── main.css                    # @import 上面三个；index.html 只 link 这一个
│   │
│   └── js/
│       ├── main.js                     # 入口：bootstrap、加载数据、挂载组件、订阅 state
│       ├── state.js                    # 单一 store + 极简 pub-sub（getState/setState/subscribe）
│       ├── url.js                      # encodeState / decodeState ↔ URLSearchParams
│       ├── data-loader.js              # fetch + JSON 解析 + 内存缓存
│       ├── calc/
│       │   ├── assets.js               # log scale 滑块 ↔ 资产；formatMoney
│       │   ├── income.js               # computeMonthlyCNY({assets, withdrawalRate, taxRate, fxUsdCny})
│       │   ├── tier.js                 # matchTier(monthlyCNY, cityTiers)
│       │   └── fire.js                 # fireNumber / yearsToFire / projectAssets / classifyTier / coastFire
│       ├── render/
│       │   ├── metrics.js              # 顶部 3 个指标
│       │   ├── tier-strip.js           # 6 档色条
│       │   ├── tier-panel.js           # 当前档详情卡 + 类别预算
│       │   ├── compare-tiers.js        # 现有 6 档同城对比（迁移自 buildCompare）
│       │   ├── compare-cities.js       # 新：跨城市对比网格
│       │   ├── chart-budget.js         # Chart.js doughnut 包装
│       │   ├── chart-fire.js           # 新：Chart.js line（资产增长时间线）
│       │   ├── fire-panel.js           # 新：FIRE 输入 + 输出
│       │   └── param-panel.js          # 新：可调参数表单
│       └── components/
│           ├── slider.js               # 滑块行为
│           ├── city-select.js          # 城市选择器（pills/dropdown）
│           └── compare-toggle.js       # 对比模式开关
```

---

## 状态管理

单个 store + 极简 pub-sub（约 40 行）。

```js
// state.js
const store = {};
const listeners = new Set();
export const getState = () => store;
export function setState(patch) { Object.assign(store, patch); listeners.forEach(fn => fn(store, patch)); }
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
```

---

## FIRE 计算公式

**FIRE Number**：`fireNumber = annualExpenseCNY / withdrawalRate`（默认 ×25）

**Years to FIRE**（闭式解）：`n = ln((FV·r + PMT) / (PV·r + PMT)) / ln(1 + r)`

**Real rate**：`(1 + nominal) / (1 + inflation) - 1`

**Coast FIRE**：`coastFireAmount = fireNumber / (1 + r)^(retireAge - currentAge)`

---

## 完整迁移顺序

1. ✅ 加 `.nojekyll`
2. ✅ **数据外置**：建所有 JSON，把 inline `<script>` 顶部加 `fetch()` 加载并赋给同名变量
3. ⏳ **CSS 拆分**：建 `assets/css/*`，`<style>` 块换成 `<link>`
4. ⏳ **JS 模块化（增量）**：先 `main.js` + `state.js` + `calc/assets.js`，再逐个迁移
5. ⏳ 删除 legacy inline `<script>`
6. ⏳ **加 state store + pub-sub**，渲染器改成订阅者
7. ⏳ **加 URL sync**（保 `?v=N` 别名）
8. ⏳ **加参数面板**（默认值与现状完全一致）
9. ⏳ **加 FIRE 模块**（DOM + calc + render + chart）
10. ⏳ **加城市对比**（按钮 + picker + grid）
11. ⏳ **打磨 + 暗色模式 + URL 覆盖新参数**
12. ⏳ **更新 README**

每步结束本地浏览器烟测。

---

## 关键文件

- `/home/user/Claude_Test/index.html` — 重写为骨架
- `/home/user/Claude_Test/assets/js/main.js` — 新建
- `/home/user/Claude_Test/assets/js/state.js` — 新建
- `/home/user/Claude_Test/assets/js/calc/fire.js` — 新建
- `/home/user/Claude_Test/data/cities/shanghai.json` — ✓ 迁移完成
- `/home/user/Claude_Test/data/cities.json` — ✓ 新建完成
- `/home/user/Claude_Test/data/defaults.json` — ✓ 新建完成
