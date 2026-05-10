# 数据验证测试套件

## 概述

这个测试套件可以快速验证应用数据的完整性和正确性，确保添加新城市或更新数据后不会出现问题。

## 运行测试

### 方法 1：在浏览器中运行（推荐）

1. 在浏览器中打开：`http://localhost:8000/test.html`
2. 点击"运行全部测试"按钮
3. 查看测试结果

### 方法 2：在 Node.js 中运行

```bash
node assets/js/test/data-validator.js
```

## 测试项目

### 1. 家庭模型验证
- ✅ 家庭模型数量是否为 4 个
- ✅ 每个模型是否具有必需的属性（id, name, label, description）
- 模型：`1a`（单身）、`2a`（夫妇）、`2a1c`（三口）、`2a2c`（四口）

### 2. 支出类别验证
- ✅ 类别数量是否为 7 个
- ✅ 每个类别是否具有必需的属性（id, label, color）
- 类别：housing, education, food, transport, medical, travel, shopping

### 3. 城市数据验证（对每个城市）
- ✅ 每个城市是否有 6 个生活档位（tiers）
- ✅ 每个档位是否有 4 个家庭模型的变体（variants）
- ✅ 每个变体是否有：
  - `incomeRange`：月收入范围 {min, max}
  - `pct`：7 个支出类别的百分比
- ✅ 支出百分比是否加总为 100%（允许 ±1% 误差）
- ✅ `pct` 数组长度是否等于类别数量
- ✅ 收入范围是否连续（第 i 个档位的 max = 第 i+1 个档位的 min）
- ✅ 教育支出百分比是否符合预期：
  - 单身（1a）：0%
  - 夫妇（2a）：0%
  - 三口（2a1c）：约 8%
  - 四口（2a2c）：约 16%

### 4. FIRE 档位验证
- ✅ FIRE 档位数量是否为 4 个
- ✅ 档位是否包含：lean, regular, fat, coast

### 5. 默认参数验证
- ✅ 所有必需的默认参数是否存在：
  - withdrawalRate（提取率）
  - taxRate（税率）
  - fxUsdCny（汇率）
  - annualReturnRate（年收益率）
  - inflationRate（通胀率）
  - defaultHouseholdModel（默认家庭模型）
- ✅ 每个参数是否有有效的范围定义

### 6. Tier 匹配函数验证
- ✅ `matchTier` 函数是否为给定的收入返回正确的档位
- ✅ 所有家庭模型的收入匹配是否正确

## 测试结果解释

### ✅ 通过（Passed）
测试成功，数据符合预期。

### ❌ 失败（Failed）
严重问题，需要立即修复。例如：
- 缺少必需的字段
- 档位数量不正确
- 收入范围不连续

### ⚠️ 警告（Warning）
潜在问题，值得注意但不一定需要修复。例如：
- 支出百分比之和不是正好 100%（1-2% 误差）
- 教育支出百分比与预期不完全一致

## 常见问题修复

### 问题：某个城市的支出百分比和不是 100%

**解决方法：**
打开 `data/cities/{cityId}.json`，找到相关的 tier 和 household model，调整 `pct` 数组使其加总为 100%。

```json
"pct": [37, 8, 26, 7, 5, 5, 12]  // 总和应为 100
```

### 问题：某个档位的收入范围不连续

**解决方法：**
确保第 i 个档位的 `incomeRange.max` 等于第 i+1 个档位的 `incomeRange.min`。

```json
// Tier 1
"incomeRange": { "min": 0, "max": 6000 }
// Tier 2  
"incomeRange": { "min": 6000, "max": 12500 }  // min 必须等于前一个 max
```

### 问题：某个城市缺少某个家庭模型的变体

**解决方法：**
确保每个 tier 的 `variants` 对象包含所有 4 个家庭模型：

```json
"variants": {
  "1a": { "incomeRange": {...}, "pct": [...] },
  "2a": { "incomeRange": {...}, "pct": [...] },
  "2a1c": { "incomeRange": {...}, "pct": [...] },
  "2a2c": { "incomeRange": {...}, "pct": [...] }
}
```

## 添加新城市时的检查清单

- [ ] 创建 `data/cities/{cityId}.json` 文件
- [ ] 包含 6 个 tiers（拮据、基本、舒适、品质、豪华、顶奢）
- [ ] 每个 tier 包含 4 个 household model variants
- [ ] 每个 variant 有 incomeRange 和 pct
- [ ] pct 数组长度为 7，加总为 100%
- [ ] 收入范围在所有 household models 中都是连续的
- [ ] 在 `data/cities.json` 中注册城市
- [ ] 运行测试套件验证

## 测试输出示例

```
🧪 Starting comprehensive data validation...

📋 Test 1: Validating household models...
  ✅ Model '1a' exists
  ✅ Model '2a' exists
  ✅ Model '2a1c' exists
  ✅ Model '2a2c' exists

📋 Test 2: Validating categories...
  ✅ (7 categories found)

📋 Test 3: Validating city data...
  Checking Shanghai...
    ✅ (Tier validation passed)
  
============================================================
📊 Test Summary
============================================================
✅ Passed: 142
❌ Failed: 0
⚠️  Warnings: 2

✅ ALL TESTS PASSED
```

## 自动化建议

在 CI/CD 流程中，可以添加测试步骤：

```bash
# 在提交前运行测试
npm run test:data

# 或在 CI 管道中
- name: Validate data
  run: npm run test:data
```

## 相关文件

- `assets/js/test/data-validator.js` - 测试逻辑
- `test.html` - 浏览器测试界面
- `data/` - 数据文件目录
- `assets/js/calc/tier.js` - Tier 匹配函数

## 需要帮助？

如果测试失败，查看控制台的详细错误信息，然后：
1. 确认数据格式是否正确
2. 检查收入范围是否连续
3. 验证百分比是否加总为 100%
4. 运行 `npm run test:data` 再次验证
