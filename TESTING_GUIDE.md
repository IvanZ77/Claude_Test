# 🧪 快速测试指南

## 三种运行测试的方法

### 1️⃣ **最快：命令行运行**（推荐用于日常检查）
```bash
node test.js
```
✅ 30 秒内看到结果  
✅ 完全离线运行  
✅ 无需任何依赖  

**输出示例：**
```
✅ Passed: 28
❌ Failed: 0
⚠️  Warnings: 0

✅ All tests passed! Data is valid.
```

### 2️⃣ **交互式：浏览器界面**（推荐用于详细检查）
```bash
# 启动本地服务器
python3 -m http.server 8000

# 在浏览器中打开
http://localhost:8000/test.html
```
✅ 彩色输出，易于阅读  
✅ 可导出测试结果为文本文件  
✅ 实时查看测试进度  

### 3️⃣ **编程方式：导入模块**（推荐用于 CI/CD）
```javascript
import { validateAllData } from './assets/js/test/data-validator.js';
import { loadAllData } from './assets/js/data-loader.js';

const data = await loadAllData();
const results = await validateAllData(data);

if (results.failed > 0) {
  console.error('测试失败');
  process.exit(1);
}
```

---

## 每个测试检查什么

| 测试项 | 检查内容 | 通过条件 |
|-------|--------|--------|
| **家庭模型** | 是否有 4 个家庭模型 | `1a`, `2a`, `2a1c`, `2a2c` 都存在 |
| **支出类别** | 是否有 7 个支出类别 | housing, education, food 等全部存在 |
| **每个城市** | 6 个档位 × 4 个家庭模型 | 所有 variants 都有 incomeRange 和 pct |
| **支出百分比** | pct 数组和 | ≈ 100%（允许 ±1% 误差） |
| **收入范围** | 相邻档位是否连续 | tier[i].max = tier[i+1].min |
| **FIRE 档位** | FIRE 分类档位数 | lean, regular, fat, coast 都存在 |
| **默认参数** | 必要的配置参数 | withdrawalRate, taxRate, fxUsdCny 等存在 |

---

## 常见场景和测试方式

### 📝 场景 1：添加新城市后验证
```bash
# 1. 创建新城市文件 data/cities/xxx.json
# 2. 在 data/cities.json 中注册
# 3. 运行测试
node test.js

# 预期输出包含你的新城市
# ✅ 你的城市名称
```

### 📝 场景 2：更新某个城市的数据后验证
```bash
# 修改后运行测试
node test.js

# 检查是否有警告关于你修改的城市
# ⚠️  该城市名称: OK (X warnings)
```

### 📝 场景 3：修复支出百分比不对
```bash
# 编辑 data/cities/shanghai.json
# 修改 tiers[0].variants['1a'].pct 的数值
# 使其加总为 100%

node test.js

# 如果警告消失，说明修复成功
# ✅ 上海: All validations passed
```

### 📝 场景 4：添加新家庭模型（高级）
```bash
# 更新 data/household-models.json
# 在所有 24 个城市的所有 tiers 中添加新 model variant

node test.js

# 应该显示通过，或清楚地标出缺少的数据
```

---

## ✅ 测试检查清单

在提交代码前运行：
- [ ] `node test.js` 返回 ✅ All tests passed
- [ ] 没有 ❌ Failed
- [ ] ⚠️ Warnings 数量是否在预期内

在部署前运行：
- [ ] 浏览器测试界面显示全绿色
- [ ] 所有 24 个城市都通过
- [ ] 导出结果并保存作为参考

---

## 🔍 调试技巧

### 看到 ❌ Failed 怎么办？

1. **查看详细错误信息**
   ```bash
   # 使用浏览器版本查看更详细的错误
   http://localhost:8000/test.html
   ```

2. **检查特定城市**
   ```bash
   # 查看某个城市的数据结构
   cat data/cities/shanghai.json | head -100
   ```

3. **验证 JSON 格式**
   ```bash
   # 检查 JSON 是否合法
   node -e "const data = require('./data/cities/shanghai.json'); console.log(Object.keys(data))"
   ```

### 看到 ⚠️ Warnings 怎么办？

通常不严重，但值得检查：
- 支出百分比稍微不是 100% → 调整 pct 数值
- 收入范围不连续 → 确保 max = 下一个 min

---

## 📊 测试数据统计

当前状态：
- 📍 24 个城市（全部通过）
- 👥 4 个家庭模型
- 📂 7 个支出类别
- 📈 6 个生活档位每个城市
- ✅ 总共 28 个验证项

---

## 🚀 集成到 CI/CD

### GitHub Actions 示例
```yaml
name: Validate Data

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: node test.js
```

### 本地 Git Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

echo "Running data validation..."
node test.js
if [ $? -ne 0 ]; then
  echo "❌ Data validation failed"
  exit 1
fi
```

---

## 📚 相关文件

- `test.js` - 命令行测试脚本（推荐！）
- `test.html` - 浏览器测试界面
- `assets/js/test/data-validator.js` - 测试逻辑实现
- `TEST.md` - 详细测试文档

---

**最后提示：** 每次修改数据后，都运行 `node test.js`！这样可以及时发现问题，避免提交错误的数据。✨
