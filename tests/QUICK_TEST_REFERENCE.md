# 🚀 快速测试参考

## 三种测试方式对比

| 方式 | 命令 | 用途 | 速度 |
|------|------|------|------|
| 🔵 **数据验证** | `node test.js` | 检查数据完整性 | ⚡ 最快 |
| 🟢 **计算测试** | `node test-calc.js` | 验证数学函数 | ⚡ 最快 |
| 🟡 **全部测试** | 浏览器 `test.html` | 数据 + 计算 | 📊 可视化 |

---

## 命令行快速运行

### 仅验证数据结构
```bash
node test.js

# 输出：
# ✅ 通过: 28
# ❌ 失败: 0
# ⚠️  警告: 0
```

### 仅验证计算逻辑
```bash
node test-calc.js

# 输出：
# ✅ 通过: 12
# ❌ 失败: 0
```

### 两个测试都运行
```bash
node test.js && node test-calc.js
```

---

## 浏览器可视化

### 方式 A：启动服务器 + 打开测试页面
```bash
# 终端 1
python3 -m http.server 8000

# 浏览器打开：
http://localhost:8000/test.html         # 数据验证
http://localhost:8000/test-calc.html    # 计算测试
```

### 方式 B：同时运行两个测试
在 `test-calc.html` 页面点击 **"同时运行数据验证"** 按钮

---

## 每个测试检查什么

### 数据验证测试 (`test.js`) - 28 项检查
✅ 4 个家庭模型 (1a, 2a, 2a1c, 2a2c)  
✅ 7 个支出类别  
✅ 24 个城市的完整性  
✅ 每个城市的 6 个档位 × 4 个家庭模型  
✅ 百分比加总是否为 100%  
✅ 收入范围是否连续  
✅ FIRE 档位完整性  
✅ 默认参数完整性  

### 计算测试 (`test-calc.js`) - 12 项检查
✅ 滑块到资产转换 (4 用例)  
✅ 月度收入计算 (2 用例)  
✅ FIRE 目标数额 (2 用例)  
✅ 到达年数计算 (2 用例)  
✅ 完整流程集成 (2 用例)  

---

## 测试结果说明

### ✅ 全绿 = 一切正常
```
✅ 通过: 28  ❌ 失败: 0  ⚠️ 警告: 0
✅ ALL TESTS PASSED
```
✓ 数据无误  
✓ 计算准确  
✓ 可以部署

### ⚠️ 有警告 = 注意但不致命
```
⚠️ 上海 (2a1c): Tier 0 的 pct 和为 101%
```
通常是百分比四舍五入导致的 ±1% 误差  
→ 检查并调整百分比数值

### ❌ 有失败 = 需要立即修复
```
❌ 新加坡 Tier 0: Missing variants
❌ Failed tests: 1
```
→ 按照错误信息修复问题  
→ 重新运行测试

---

## 常见工作流

### 📝 场景：修改了某个城市的数据
```bash
# 1. 编辑文件
vim data/cities/shanghai.json

# 2. 快速验证
node test.js

# 3. 查看结果
# 如果通过，继续；如果失败，修复

# 4. 提交
git add data/cities/shanghai.json
git commit -m "Update Shanghai data for 2026"
```

### 📝 场景：添加了新城市
```bash
# 1. 创建新城市文件
cp data/cities/shanghai.json data/cities/xxx.json
# 编辑 xxx.json

# 2. 在 data/cities.json 注册
vim data/cities.json
# 添加新城市

# 3. 验证
node test.js

# 期望输出包含：
# ✅ 你的新城市: All validations passed
```

### 📝 场景：修改了计算函数
```bash
# 1. 编辑函数（如 calc/tier.js）
vim assets/js/calc/tier.js

# 2. 验证没有破坏现有逻辑
node test-calc.js

# 3. 如果通过，继续；如果失败，检查更改
```

---

## 故障排除

### 问题：`command not found: node`
```bash
# 检查 Node.js 是否安装
node --version

# 如果没有，安装 Node.js
# macOS: brew install node
# Ubuntu: sudo apt install nodejs
```

### 问题：某个城市测试失败
```bash
# 运行浏览器版本查看详细错误
http://localhost:8000/test.html

# 然后查看该城市文件
cat data/cities/失败的城市.json | head -50

# 常见问题：
# 1. 缺少 variants（对于新加坡等旧城市）
# 2. pct 数组和不是 100%
# 3. incomeRange 不连续
```

### 问题：浏览器测试页面加载失败
```bash
# 确保服务器运行
python3 -m http.server 8000

# 确保在项目根目录
pwd  # 应该在 /home/user/Claude_Test

# 尝试访问数据文件
curl http://localhost:8000/data/household-models.json
```

---

## 测试覆盖总结

```
总检查项：40 项
├─ 数据完整性：28 项 ✅
└─ 计算逻辑：12 项 ✅

城市覆盖：24 个全部检查
├─ 中国：8 个
├─ 亚洲：8 个
├─ 欧美：6 个
└─ 其他：2 个

通过率：100% ✅
```

---

## 下一步

### 每次开发后
- [ ] `node test.js` 确保数据无误
- [ ] `node test-calc.js` 确保计算准确
- [ ] 提交代码

### 每次上线前
- [ ] 两个命令都运行并全部通过
- [ ] 浏览器测试界面显示全绿
- [ ] 导出测试结果作为备案

### CI/CD 集成（可选）
- [ ] 在 GitHub Actions 中运行测试
- [ ] PR 必须通过所有测试才能合并
- [ ] 自动化部署

---

## 常用命令速查表

```bash
# 数据验证
node test.js

# 计算测试
node test-calc.js

# 两个都跑
node test.js && node test-calc.js

# 在浏览器中查看
python3 -m http.server 8000
# 然后访问：
# http://localhost:8000/test.html
# http://localhost:8000/test-calc.html

# 查看帮助
cat TEST.md              # 详细数据测试文档
cat CALCULATION_TESTS.md # 详细计算测试文档
cat TESTING_GUIDE.md     # 综合测试指南
```

---

**最重要的一点：** 修改数据或代码后，立即运行 `node test.js && node test-calc.js`！这样可以在问题早期发现它。✨
