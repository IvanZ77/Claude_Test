# 数据来源与维护规范

## 数据状态说明

每个城市的 `city.json` 文件顶层包含以下字段：

```jsonc
{
  "lastUpdated": "2026-05-15",  // 数据最后核对日期
  "incomplete": false,           // true = 数据待核，UI 显示"数据待核"徽章
  "sources": [                   // 至少 1 条来源记录
    { "label": "链家上海二手房均价", "url": "https://...", "asOf": "2026-04" }
  ]
}
```

`incomplete: true` 表示该城市数据尚未经过人工核对，档位金额和生活描述仅供参考。

---

## 允许的数据来源

| 品类 | 中国大陆城市 | 日本城市 | 英美澳 | 东南亚 / 中东 |
|------|------------|---------|--------|-------------|
| **房租** | 链家、贝壳、安居客（取目标面积区域中位价） | SUUMO、HOME's、AtHome | Zillow、Rightmove、Domain | DDproperty、PropertyGuru |
| **学校学费** | 各国际学校官网公示 | 学校官网 + JISCS 目录 | 学校官网 + ISC Research | 学校官网 + ICEF Monitor |
| **餐饮均价** | 大众点评、美团（取人均消费中位数） | 食べログ、Retty | Google Maps、Yelp | Foodpanda、Google Maps |
| **交通** | 各市交委官网/官方APP（地铁票价 + 出租计价） | 国土交通省、私铁公示 | TfL、MTA 官方票价 | 当地交管局公示 |
| **医疗** | 公立医院挂号费 + 主要私立体检包官网公示 | 厚生劳动省 + 私立诊所官网 | NHS/Medicare 官方文档 + 私立医院官网 | 主要私立 hospital 官网 |
| **汇率** | 中国人民银行中间价（https://www.pbc.gov.cn/） + XE.com 双源交叉 | 同左 | 同左 | 同左 |

**禁用来源**：

- 任何无 `asOf` 时间戳的来源
- 个人博客 / 知乎帖子 / Reddit 帖子作为唯一来源
- numbeo 数据仅可用于 sanity check，不可作为主要来源

---

## 数据核对流程（每个城市）

### 1. 收入档位阈值（`incomeRange.min / max`，单位：CNY/月）

- 找目标区域**60–80㎡ 两室或三室**的月租金中位数（CNY）
- 该数值应对应该城市 Tier 2（舒适生活）的下限左右
- 各档位之间必须无缝衔接：`Tier[i].max === Tier[i+1].min`
- **家庭模型**：`2a1c`（2 大 1 小）是主力模型，其他模型（1a、2a、2a2c）按比例调整约 ±10–20%

### 2. 品类百分比（`pct` 数组，7 项，单位：%，必须加总 100%）

顺序固定：`housing | education | food | transport | medical | travel | shopping`

- `education` 字段约定：
  - `1a`（单身）和 `2a`（无孩伴侣）= 0
  - `2a1c`（含 1 孩）= 6–10%（视档位和城市）
  - `2a2c`（含 2 孩）= 12–18%
- 其余品类根据目标城市实际消费习惯估算

### 3. 生活示例文本（`items[category].examples[]`）

- 每个品类至少 3 条具体示例（小区名/学校名/餐厅名/线路名）
- 推荐格式：`具体名称 + 关键数字`，例如：
  - ✅ `"朝阳区望京 SOHO 周边 90㎡ 月租 ¥1.5–1.8 万"`
  - ❌ `"市中心公寓"` （过于模糊）
- 如已升级为 `examplesDetailed`，每条需附 `asOf` 和 `sourceUrl`

### 4. 升级可选字段 `examplesDetailed`（渐进式）

```jsonc
"housing": {
  "label": "住房/租金",
  "examples": ["简短示例..."],  // 保留，向后兼容
  "examplesDetailed": [
    {
      "text": "朝阳区望京 SOHO 周边 90㎡，月租约 ¥1.6 万",
      "asOf": "2026-04",
      "sourceUrl": "https://bj.lianjia.com/..."
    }
  ]
}
```

---

## 汇率更新流程（`data/cities.json` 中的 `fxToCNY`）

1. 访问 PBOC 中间价页面：https://www.pbc.gov.cn/
2. 查询当日各货币对 CNY 的中间价
3. 交叉核对 XE.com (https://www.xe.com) 确认无误
4. 更新 `data/cities.json` 中对应城市的 `fxToCNY` 值
5. 更新顶层 `fxLastUpdated` 为当日日期（格式 YYYY-MM-DD）
6. 运行 `node assets/js/test/data-validator.js` 确认无 ERROR

**参考汇率（2026-05，仅供参考，请以当日实际中间价为准）：**

| 货币 | 至 CNY |
|------|-------|
| HKD（港元） | ≈ 0.93 |
| JPY（日元） | ≈ 0.046 |
| THB（泰铢） | ≈ 0.20 |
| USD（美元） | ≈ 7.2 |
| VND（越南盾） | ≈ 0.00029 |
| GBP（英镑） | ≈ 9.1 |
| EUR（欧元） | ≈ 7.8 |
| SGD（新加坡元） | ≈ 5.4 |
| AED（阿联酋迪拉姆） | ≈ 1.96 |
| AUD（澳元） | ≈ 4.75 |

---

## 更新节奏建议

| 数据类型 | 建议频率 |
|---------|---------|
| 汇率（fxToCNY） | 每季度，或汇率变动 >5% 时 |
| 房租阈值 | 每半年（结合春秋租房旺季数据） |
| 学校学费 | 每年（通常 9 月学年更新） |
| 生活示例文本 | 每年或有重大变化时 |

---

## 数据验证

所有改动提交前须运行：

```bash
node assets/js/test/data-validator.js
```

退出码 0 且无 ERROR 方可合入。WARNING 需在 PR 描述中说明原因。
