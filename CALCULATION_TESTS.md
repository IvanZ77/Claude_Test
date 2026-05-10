# 🧮 计算逻辑测试指南

## 概述

计算测试验证所有数学函数的正确性，确保从用户输入到最终结果的完整计算流程都是准确的。

## 包含的测试

### 1️⃣ 滑块到资产转换 (Slider to Assets)
**函数：** `sliderToAssets(sliderValue)`  
**作用：** 将 0-100 的滑块值转换为 $200K-$20M 的资产值（对数刻度）

**测试用例：**
```javascript
Slider 0   → $200K    (最小值)
Slider 35  → $1M      (示例)
Slider 50  → $2M      (中点)
Slider 100 → $20M     (最大值)
```

**公式：**
```
log10_min = log10(200000) ≈ 5.301
log10_max = log10(20000000) ≈ 7.301
assets = 10^(log10_min + (slider/100) × (log10_max - log10_min))
```

✅ **当前状态：** 全部通过

---

### 2️⃣ 月度收入计算 (Monthly Income Calculation)
**函数：** `computeMonthlyIncome(assets, withdrawalRate, taxRate, fxUsdCny)`  
**作用：** 计算资产对应的月度可支配收入

**测试用例：**
```javascript
// 用例 1: $1M 资产, 4% 提取率, 20% 税率, 6.8 汇率
Input: 1000000, 0.04, 0.20, 6.8
Output: {
  annualUSD: 40000,     // 1M × 4%
  monthlyUSD: 2667,     // 40000 × 80% ÷ 12
  monthlyCNY: 18133     // 2667 × 6.8
}

// 用例 2: $500K 资产, 5% 提取率, 15% 税率
Input: 500000, 0.05, 0.15, 6.8
Output: {
  monthlyUSD: 1771,
  monthlyCNY: 12042
}
```

**公式：**
```
年提取额 = 资产 × 提取率
月度 USD = 年提取额 × (1 - 税率) ÷ 12
月度 CNY = 月度 USD × 汇率
```

✅ **当前状态：** 全部通过

---

### 3️⃣ FIRE 目标数额计算 (FIRE Number)
**函数：** `fireNumber(annualExpense, withdrawalRate)`  
**作用：** 根据年度支出和提取率计算达成 FIRE 需要的资产总额

**测试用例：**
```javascript
// 用例 1: 年支出 ¥300K, 4% 提取率
Input: 300000, 0.04
Output: 7500000    // 300000 ÷ 0.04

// 用例 2: 年支出 ¥600K, 4% 提取率
Input: 600000, 0.04
Output: 15000000   // 600000 ÷ 0.04
```

**公式：**
```
FIRE_目标 = 年支出 ÷ 提取率
```

**解释：**
- 根据 Trinity Study，4% 提取率在 30 年期间有 95% 成功率
- 如果年支出 ¥300K，需要 ¥7.5M 资产才能每年安全提取 ¥300K

✅ **当前状态：** 全部通过

---

### 4️⃣ 到达 FIRE 需要年数 (Years to FIRE)
**函数：** `yearsToFire(pv, pmt, r, fireTarget, inflation)`  
**作用：** 计算从现在开始需要多少年才能达成 FIRE 目标

**参数：**
- `pv`: 当前资产 (Present Value)
- `pmt`: 年度储蓄 (年度支付额)
- `r`: 年化收益率 (Return Rate)
- `fireTarget`: FIRE 目标金额
- `inflation`: 通胀率

**测试用例：**
```javascript
// 用例 1: 初始 $500K + 年储 $24K, 7% 收益, 目标 $7.5M, 2.5% 通胀
Input: 500000, 240000, 0.07, 7500000, 0.025
Output: 18.1 年

// 用例 2: 初始 $1M, 无储蓄, 7% 收益, 目标 $7.5M, 2.5% 通胀
Input: 1000000, 0, 0.07, 7500000, 0.025
Output: 46.9 年
```

**公式（复利计算）：**
```
实际收益率 = (1 + 名义收益率) ÷ (1 + 通胀率) - 1
年数 = ln((目标 × r + 年储) ÷ (初始 × r + 年储)) ÷ ln(1 + r)
```

✅ **当前状态：** 全部通过

---

### 5️⃣ Coast FIRE 计算 (Coast FIRE Amount)
**函数：** `coastFireAmount(fireNumber, rate, yearsToRetire, inflation)`  
**作用：** 计算"现在停止储蓄"仍能在退休时达成 FIRE 所需的当前资产

**概念：**
> 假设你现在就停止工作和储蓄，现有资产靠复利增长，你能在目标退休年龄达成 FIRE 吗？

**示例：**
```javascript
// FIRE 目标 $7.5M, 7% 年收益, 20 年到退休, 2.5% 通胀
Input: 7500000, 0.07, 20, 0.025
Output: 1940000   // 需要当前拥有 $1.94M

// 解释：如果现在有 $1.94M，不再储蓄，
//      20 年后以 7% 年收益增长，
//      将增长到 $7.5M
```

**公式：**
```
Coast_FIRE = FIRE_目标 ÷ (1 + 年收益率)^年数
```

---

### 6️⃣ 完整流程集成测试 (Integration Test)
**验证内容：** 从滑块值到月度收入的完整链路

**测试场景：**
```javascript
场景 1: 滑块 35
  滑块 35 → 资产 $1.00M → 月度 ¥18,176
  
场景 2: 滑块 70
  滑块 70 → 资产 $5.02M → 月度 ¥90,846
  
验证：滑块越高 → 资产越多 → 收入越多 (单调递增)
```

✅ **当前状态：** 全部通过

---

## 运行测试

### 方式 1：命令行（最快）
```bash
node test-calc.js
```

输出示例：
```
🧪 运行计算逻辑测试

📋 Test 1: 滑块到资产转换 (对数刻度)
  ✅ Slider 0 = $0.20M
  ✅ Slider 35 = $1.00M
  ✅ Slider 50 = $2.00M
  ✅ Slider 100 = $20.00M

[... 更多测试 ...]

==================================================
📊 计算测试总结
==================================================
✅ 通过: 12
❌ 失败: 0

✅ 所有计算测试通过！
```

### 方式 2：浏览器界面
```bash
# 启动本地服务器
python3 -m http.server 8000

# 打开浏览器
http://localhost:8000/test-calc.html
```

**功能：**
- 彩色输出
- 详细测试结果展示
- 同时运行数据验证和计算测试

### 方式 3：在代码中集成
```javascript
import { loadAllData } from './assets/js/data-loader.js';
import { runCalculationTests } from './assets/js/test/calculation-tests.js';

const data = await loadAllData();
const results = await runCalculationTests(data);

if (results.failed === 0) {
  console.log('✅ 所有计算都正确！');
}
```

---

## 常见问题

### Q1: 为什么使用对数刻度？
**A:** 对数刻度使用户可以精细控制从 $200K 到 $20M 的广泛范围。
- 线性刻度：滑块 50 = $10M（不够均衡）
- 对数刻度：滑块 50 = $2M（更均衡）

### Q2: 为什么要考虑通胀率？
**A:** 实际收益率 = (名义收益率 - 通胀率)
- 假设 7% 投资收益，2.5% 通胀
- 实际增长 = (1.07 ÷ 1.025) - 1 ≈ 4.4%

### Q3: 4% 提取率从何而来？
**A:** Trinity Study (1998) 研究发现，在 30 年退休期内，4% 提取率有 95% 成功率。
- 基于历史美国股市数据
- 结合通胀调整
- 常用于 FIRE 社区

### Q4: 为什么某些测试中数值不完全相等？
**A:** 允许小的舍入误差（通常 < 1%）以容纳浮点数精度问题：
- 月收入允许差异 < $50
- CNY 金额允许差异 < ¥500

---

## 测试覆盖

| 测试项 | 用例数 | 状态 |
|-------|-------|------|
| 滑块转换 | 4 | ✅ 全通过 |
| 月度收入 | 2 | ✅ 全通过 |
| FIRE目标 | 2 | ✅ 全通过 |
| 到达年数 | 2 | ✅ 全通过 |
| 完整流程 | 2 | ✅ 全通过 |
| **总计** | **12** | **✅ 全通过** |

---

## 维护和扩展

### 添加新测试
```javascript
// 在 calculation-tests.js 中添加新函数
export async function runCalculationTests(data) {
  // 现有测试 ...
  
  // 新增测试
  console.log('\n📋 Test 8: 新的测试');
  const newTests = testMyNewFunction(myFunc);
  results.tests.push(...newTests);
  // ...
}
```

### 修改现有测试
1. 编辑 `test-calc.js` 或 `assets/js/test/calculation-tests.js`
2. 运行 `node test-calc.js` 验证
3. 确保所有测试通过再提交

### 调试失败的测试
```bash
# 运行测试并查看详细输出
node test-calc.js

# 或在浏览器中查看更详细的输出
http://localhost:8000/test-calc.html
```

---

## 关联文件

- `test-calc.js` - 命令行测试脚本
- `test-calc.html` - 浏览器测试界面
- `assets/js/test/calculation-tests.js` - 测试逻辑实现
- `assets/js/calc/assets.js` - 滑块转换函数
- `assets/js/calc/income.js` - 收入计算函数
- `assets/js/calc/fire.js` - FIRE 计算函数

---

**提示：** 每次修改计算逻辑（如改变提取率默认值、税率计算等）后，都应该运行这些测试来确保没有破坏现有功能！✨
