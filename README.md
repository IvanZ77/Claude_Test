# 多城市生活成本计算器 | Multi-City Lifestyle Calculator

一个强大的资产-生活方式映射工具，帮助你理解在不同城市的生活成本与生活质量。基于4%安全提取率（Trinity Study），将可投资资产换算为月度可支配收入，对应不同生活档位。

**[在线使用](https://IvanZ77.github.io/shanghai_life_calculator)** | **[English Version](#english)**

---

## 功能特性 ✨

### 核心计算器
- **资产转收入**: 基于4%安全提取率，美国投资税20%，USD↔CNY汇率6.8
- **生活档位匹配**: 6档完整的生活方式画像（从拮据到顶奢）
- **真实参考数据**: 真实小区、学校、餐厅、交通等具体例子

### 多城市对比
- **并排对比**: 同一资产水平下对比2-3个城市的生活成本
- **动态更新**: 拖动滑块实时更新所有城市的生活档位
- **易于扩展**: 添加新城市只需一个JSON文件

### FIRE计算器
- **FIRE目标**: 基于月度支出自动计算FIRE所需总资产
- **达成年限**: 闭式公式计算需要多少年达成财务自由
- **资产增长曲线**: 可视化展示通胀调整前后的资产增长
- **Coast FIRE**: 计算现在需要多少钱才能通过复利达成目标

### 参数调整面板
- **灵活配置**: 调整提取率(2.5%-6%)、税率(0%-45%)、汇率、收益率、通胀率
- **URL分享**: 自定义参数和滑块位置自动编码到URL，分享给朋友
- **即时计算**: 参数变化立即更新所有输出结果

### 用户体验
- **深色模式支持**: 自动适配系统偏好设置
- **响应式设计**: 完美支持手机、平板、桌面设备
- **无需构建**: 纯HTML/CSS/JS，直接部署到GitHub Pages
- **即时反馈**: 所有计算在前端完成，无需服务器

---

## 如何使用 📖

### 基本流程
1. **拖动滑块** — 设置你的可投资资产总额（$20万–$2000万）
2. **查看生活档位** — 实时显示对应的月度可支配收入和生活方式
3. **浏览详情** — 环形图显示预算分配，文字列出真实小区/学校/餐厅
4. **调整参数** (可选) — 点击"调整参数"修改税率、汇率等
5. **分享链接** — 复制按钮会保存滑块位置和自定义参数到URL

### 高级功能

#### 城市对比
- 点击"城市对比"按钮进入对比模式
- 选择2-3个城市，在同一资产水平下并排对比生活成本
- 拖动顶部滑块，所有城市的档位同时更新

#### FIRE计算器
- 在"FIRE计算器"部分输入当前资产、月度储蓄、年化收益率
- 自动计算FIRE目标资产和达成年限
- 图表展示资产增长轨迹（考虑通胀）
- Coast FIRE显示"仅靠复利"需要的最低本金

#### 分享和协作
```
# 示例URL格式
?a=50                    # 滑块位置50
?a=50&wr=0.035&tx=0.15   # 滑块+自定义提取率和税率
?a=50&cmp=shanghai,beijing # 滑块+城市对比模式
```

---

## 数据结构与扩展 🏗️

### 添加新城市指南

#### 第1步：创建城市数据文件
在 `data/cities/` 目录下创建 `{cityname}.json`，包含6个档位（参考shanghai.json）：

```json
{
  "id": "chengdu",
  "name": "成都",
  "currency": "CNY",
  "schemaVersion": 1,
  "tiers": [
    {
      "id": "t1",
      "name": "档位名称",
      "incomeRange": { "min": 0, "max": 12000, "unit": "CNY/month" },
      "badge": { "bg": "#RRGGBB", "fg": "#RRGGBB" },
      "description": "生活描述...",
      "items": {
        "housing": { "label": "住房/租金", "examples": ["小区名1", "小区名2"] },
        "education": { ... },
        "food": { ... },
        "transport": { ... },
        "medical": { ... },
        "travel": { ... },
        "shopping": { ... }
      },
      "pct": [35, 12, 22, 10, 5, 8, 8]
    },
    // ... 共6个档位
  ]
}
```

**关键点**:
- 必须有7个 items（按categories.json顺序）
- pct数组7个数字，和为100（允许±1误差）
- incomeRange按min递增排序

#### 第2步：注册到城市索引
编辑 `data/cities.json`：

```json
{
  "id": "chengdu",
  "name": "成都",
  "country": "中国",
  "file": "cities/chengdu.json",
  "currency": "CNY",
  "fxToCNY": 1.0,
  "available": true
}
```

#### 第3步：更新数据加载器
编辑 `assets/js/data-loader.js`，在 `loadAllData()` 中添加：

```javascript
const chengduData = loadJSON('./data/cities/chengdu.json');
cityData.chengdu = chengduData;
```

#### 完成！
新城市自动出现在城市对比选择器中。

---

## 计算公式 📐

### 月度可支配收入
```
年提取 = 资产 × 4%
税后 = 年提取 × (1 - 税率)
月度(美元) = 税后 ÷ 12
月度(人民币) = 月度(美元) × 汇率
```

### FIRE目标资产
```
FIRE金额 = 年度支出 ÷ 提取率 = 年度支出 × 25
```

### 达成年限
```
实际收益率 = (1 + 名义率) / (1 + 通胀率) - 1

n = ln((FV·r + PMT) / (PV·r + PMT)) / ln(1 + r)

其中：PV=当前资产, PMT=年度储蓄, r=年化收益率, FV=目标, n=年数
```

---

## 计算假设 ℹ️

- **4% 安全提取率**: Trinity Study，30年退休期
- **美国投资税20%**: 简化估算，不含州税
- **汇率6.8**: 参考中间价（可在参数面板调整）
- **家庭模型**: 2位成人 + 1名学龄儿童
- **生活成本**: 2025-2026年市场参考，实际因房型/年级/谈判而异

⚠️ **声明**: 本计算器仅作参考，**不构成投资或移居建议**。

---

## 技术栈 ⚙️

- **前端**: HTML5 + CSS3 + Vanilla JavaScript (ES Modules)
- **图表**: Chart.js 4.4 (CDN)
- **部署**: GitHub Pages
- **无依赖**: 无包管理器、无构建工具

### 本地开发
```bash
# 启动HTTP服务器（不能用file://协议）
python3 -m http.server 8000
# 访问 http://localhost:8000
```

---

## 文件结构 📁

```
data/
├── cities.json          # 城市注册表
├── categories.json      # 预算分类 (7个)
├── fire-tiers.json      # FIRE分级
├── defaults.json        # 默认参数
└── cities/
    ├── shanghai.json    # 上海数据
    └── beijing.json     # 北京数据

assets/
├── css/
│   ├── tokens.css       # 变量、颜色、暗色模式
│   ├── base.css         # 排版
│   ├── components.css   # 组件
│   └── main.css         # 总入口
└── js/
    ├── main.js          # 启动
    ├── state.js         # 状态管理
    ├── url.js           # URL编解码
    ├── data-loader.js   # 数据加载
    ├── calc/            # 计算模块
    └── render/          # 渲染模块
```

---

## 常见问题 ❓

**Q: 可以离线使用吗？**  
A: 可以。下载整个仓库，用HTTP服务器本地运行。

**Q: 如何修改某城市数据？**  
A: 编辑 `data/cities/{name}.json`，浏览器刷新自动读取。

**Q: 支持跨国城市吗？**  
A: 完全支持。在cities.json中设置fxToCNY汇率即可（如东京0.048）。

---

## 许可与致谢 📄

- MIT License
- 数据：公开市场信息，仅作参考
- 感谢：Trinity Study、各城市官方统计

---

## 反馈与贡献 💬

- 报告问题: [GitHub Issues](https://github.com/IvanZ77/shanghai_life_calculator/issues)
- 欢迎Pull Request
- 数据更新: 发现偏离时请提交Issue附带链接

---

<a name="english"></a>

## English

**Multi-City Lifestyle Cost Calculator** — An intuitive tool mapping your net worth to lifestyle quality. Based on 4% Safe Withdrawal Rate, converts assets to monthly disposable income across 6 lifestyle tiers with real-world examples.

### Features
✅ Asset-to-income conversion (4% rule)  
✅ 6-tier lifestyle profiles (real neighborhoods, schools, restaurants)  
✅ Multi-city comparison (2-3 cities side-by-side)  
✅ FIRE calculator with projections  
✅ Adjustable parameters (tax, exchange rate, returns, inflation)  
✅ URL state sharing  
✅ Dark mode  
✅ Fully responsive  

### Quick Start
1. Drag slider to set asset level ($200K–$20M)
2. View matching lifestyle tier and budget breakdown
3. (Optional) Compare cities side-by-side
4. (Optional) Calculate FIRE number and years to goal
5. Share URL with your settings

### Adding a City
1. Create `data/cities/{name}.json` with 6 tiers
2. Register in `data/cities.json` with `available: true`
3. Update `data-loader.js` to load the file
4. Done!

**Last Updated**: 2025-2026  
**License**: MIT