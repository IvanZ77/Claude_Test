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

## 最终目录结构

```
/
├── index.html                          # 骨架：head + 语义 sections + <script type="module">
├── README.md                           # 更新为新架构 + "如何添加一个城市"
├── .nojekyll                           # GitHub Pages 不要套用 Jekyll 规则
├── .github/workflows/pages.yml         # 现有 deploy workflow
│
├── data/
│   ├── cities.json                     # 城市索引（id, name, file, currency, fxToCNY, available）
│   ├── categories.json                 # 7 类预算（共享的标签 + 颜色）
│   ├── fire-tiers.json                 # Lean/Regular/Fat FIRE 阈值
│   ├── defaults.json                   # 默认可调参数 + range 配置
│   └── cities/
│       ├── shanghai.json               # 现有 T[] 数据迁移到这里
│       ├── beijing.json                # 占位（available: false）
│       └── tokyo.json                  # 占位（available: false）
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

`Chart.js` 通过 CDN `<script>` 引入，模块代码引用 `window.Chart`。

---

## 数据 Schema（JSON）

### `data/cities.json`
```json
{
  "version": 1,
  "default": "shanghai",
  "cities": [
    { "id": "shanghai", "name": "上海", "country": "中国", "file": "cities/shanghai.json",
      "currency": "CNY", "fxToCNY": 1.0, "available": true },
    { "id": "beijing", "name": "北京", "country": "中国", "file": "cities/beijing.json",
      "currency": "CNY", "fxToCNY": 1.0, "available": false },
    { "id": "tokyo", "name": "东京", "country": "日本", "file": "cities/tokyo.json",
      "currency": "JPY", "fxToCNY": 0.048, "available": false }
  ]
}
```

### `data/cities/shanghai.json`
```json
{
  "id": "shanghai", "name": "上海", "currency": "CNY", "schemaVersion": 1,
  "tiers": [
    {
      "id": "t1", "name": "拮据生活",
      "incomeRange": { "min": 0, "max": 8000, "unit": "CNY/month" },
      "badge": { "bg": "#5b6470", "fg": "#ffffff" },
      "description": "...",
      "items": {
        "housing":   { "label": "合租城中村", "examples": ["浦东周浦", "宝山顾村"] },
        "education": { "label": "无", "examples": [] },
        "food":      { "label": "食堂 + 自炊", "examples": [] },
        "transport": { "label": "地铁 + 共享单车", "examples": [] },
        "medical":   { "label": "医保为主", "examples": [] },
        "travel":    { "label": "节假日短途", "examples": [] },
        "shopping":  { "label": "拼多多 / 优衣库", "examples": [] }
      },
      "pct": [45, 0, 25, 8, 5, 7, 10]
    }
    // ... 共 6 档
  ]
}
```

规则：`pct` 数组顺序与 `categories.json` 一致；`items` key 必须等于 categories 的 `id`。

### `data/categories.json`
```json
{
  "version": 1,
  "categories": [
    { "id": "housing",   "label": "住房",     "color": "#7c5cff" },
    { "id": "education", "label": "教育",     "color": "#ff8a3d" },
    { "id": "food",      "label": "饮食",     "color": "#42c2a8" },
    { "id": "transport", "label": "交通",     "color": "#3aa0ff" },
    { "id": "medical",   "label": "医疗",     "color": "#ef5d8f" },
    { "id": "travel",    "label": "旅行",     "color": "#f6c85f" },
    { "id": "shopping",  "label": "购物消费", "color": "#9aa3b2" }
  ]
}
```

### `data/fire-tiers.json`
```json
{
  "version": 1,
  "rule": { "withdrawalRate": 0.04, "multiplier": 25 },
  "tiers": [
    { "id": "lean",    "name": "Lean FIRE",    "annualExpenseMaxCNY": 150000, "color": "#42c2a8",
      "description": "极简生活下的提早退休：月支出 ≤ 12,500 元。" },
    { "id": "regular", "name": "Regular FIRE", "annualExpenseMaxCNY": 360000, "color": "#3aa0ff",
      "description": "标准中产生活：月支出 12,500–30,000 元。" },
    { "id": "fat",     "name": "Fat FIRE",     "annualExpenseMaxCNY": null,   "color": "#7c5cff",
      "description": "宽裕生活：月支出 > 30,000 元。" },
    { "id": "coast",   "name": "Coast FIRE",   "computed": true,              "color": "#f6c85f",
      "description": "已积累的本金，仅靠复利即可在退休前达成 FIRE。" }
  ]
}
```

### `data/defaults.json`
```json
{
  "version": 1,
  "params": {
    "withdrawalRate": 0.04, "taxRate": 0.20, "fxUsdCny": 6.8,
    "annualReturnRate": 0.07, "inflationRate": 0.025,
    "currentAge": 30, "fireTargetAge": 50
  },
  "ranges": {
    "withdrawalRate":   { "min": 0.025, "max": 0.06, "step": 0.001 },
    "taxRate":          { "min": 0.0,   "max": 0.45, "step": 0.01 },
    "fxUsdCny":         { "min": 5.0,   "max": 8.5,  "step": 0.01 },
    "annualReturnRate": { "min": 0.0,   "max": 0.15, "step": 0.001 },
    "inflationRate":    { "min": 0.0,   "max": 0.10, "step": 0.001 }
  }
}
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

## 迁移顺序（每步保持网站可用）

1. 加 `.nojekyll`
2. **数据外置但 JS 不动**：建所有 JSON，把 inline `<script>` 顶部加 `fetch()` 加载并赋给同名变量
3. **CSS 拆分**：建 `assets/css/*`，`<style>` 块换成 `<link>`
4. **JS 模块化（增量）**：先 `main.js` + `state.js` + `calc/assets.js`，再逐个迁移
5. 删除 legacy inline `<script>`
6. **加 state store + pub-sub**，渲染器改成订阅者
7. **加 URL sync**（保 `?v=N` 别名）
8. **加参数面板**（默认值与现状完全一致）
9. **加 FIRE 模块**（DOM + calc + render + chart）
10. **加城市对比**（按钮 + picker + grid）
11. **打磨 + 暗色模式 + URL 覆盖新参数**
12. **更新 README**

每步结束本地浏览器烟测。

---

## 关键文件

- `/home/user/Claude_Test/index.html` — 重写为骨架
- `/home/user/Claude_Test/assets/js/main.js` — 新建
- `/home/user/Claude_Test/assets/js/state.js` — 新建
- `/home/user/Claude_Test/assets/js/calc/fire.js` — 新建
- `/home/user/Claude_Test/data/cities/shanghai.json` — 迁移
- `/home/user/Claude_Test/data/cities.json` — 新建
- `/home/user/Claude_Test/data/defaults.json` — 新建

---

**开始实现？** 请确认第一步：建立 `data/` 目录结构和 JSON 文件。
