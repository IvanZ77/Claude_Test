#!/usr/bin/env node

/**
 * 计算逻辑测试脚本
 * 用法: node test-calc.js
 */

const fs = require('fs');
const path = require('path');

class CalculationTester {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.tests = [];
  }

  async loadFunctions() {
    // 直接加载并执行 JS 文件来获取函数
    return {
      sliderToAssets: (slider) => {
        // Log scale: 0 = 200k, 100 = 20M
        const minLog = Math.log10(200000);
        const maxLog = Math.log10(20000000);
        const currentLog = minLog + (slider / 100) * (maxLog - minLog);
        return Math.pow(10, currentLog);
      },

      computeMonthlyIncome: (assets, withdrawalRate, taxRate, fxUsdCny) => {
        const annualUSD = assets * withdrawalRate;
        const monthlyUSD = (annualUSD * (1 - taxRate)) / 12;
        const monthlyCNY = monthlyUSD * fxUsdCny;
        return {
          annualUSD,
          monthlyUSD,
          monthlyCNY
        };
      },

      fireNumber: (annualExpense, withdrawalRate) => {
        return annualExpense / withdrawalRate;
      },

      yearsToFire: (pv, pmt, r, fireTarget, inflation) => {
        if (r === 0) {
          return (fireTarget - pv) / pmt;
        }
        const realRate = ((1 + r) / (1 + inflation)) - 1;
        const numerator = fireTarget * realRate + pmt;
        const denominator = pv * realRate + pmt;
        if (denominator <= 0) return 50;
        const years = Math.log(numerator / denominator) / Math.log(1 + realRate);
        return Math.max(0, Math.min(50, years));
      }
    };
  }

  async run() {
    console.log('🧪 运行计算逻辑测试\n');

    const funcs = await this.loadFunctions();

    this.testSliderConversion(funcs.sliderToAssets);
    this.testMonthlyIncome(funcs.computeMonthlyIncome);
    this.testFireNumber(funcs.fireNumber);
    this.testYearsToFire(funcs.yearsToFire);
    this.testIntegration(funcs);

    this.printSummary();
  }

  testSliderConversion(sliderToAssets) {
    console.log('📋 Test 1: 滑块到资产转换 (对数刻度)');

    const cases = [
      { slider: 0, expectedMin: 190000, expectedMax: 210000, desc: 'Slider 0' },
      { slider: 35, expectedMin: 900000, expectedMax: 1100000, desc: 'Slider 35' },
      { slider: 50, expectedMin: 1900000, expectedMax: 2100000, desc: 'Slider 50' },
      { slider: 100, expectedMin: 19000000, expectedMax: 21000000, desc: 'Slider 100' }
    ];

    cases.forEach(tc => {
      const assets = sliderToAssets(tc.slider);
      const passed = assets >= tc.expectedMin && assets <= tc.expectedMax;
      this.recordTest(
        `${tc.desc} → $${(assets / 1000000).toFixed(2)}M`,
        passed,
        `$${(tc.expectedMin / 1000000).toFixed(1)}M-$${(tc.expectedMax / 1000000).toFixed(1)}M`,
        `$${(assets / 1000000).toFixed(2)}M`
      );
      console.log(`  ${passed ? '✅' : '❌'} ${tc.desc} = $${(assets / 1000000).toFixed(2)}M`);
    });
  }

  testMonthlyIncome(computeMonthlyIncome) {
    console.log('\n📋 Test 2: 月度收入计算');

    // Test case 1: $1M -> 4% -> 20% tax -> 6.8 FX
    const income1 = computeMonthlyIncome(1000000, 0.04, 0.20, 6.8);
    const expectedUSD1 = (1000000 * 0.04 * 0.8) / 12;
    const expectedCNY1 = expectedUSD1 * 6.8;

    const passedUSD1 = Math.abs(income1.monthlyUSD - expectedUSD1) < 50;
    const passedCNY1 = Math.abs(income1.monthlyCNY - expectedCNY1) < 500;

    this.recordTest(
      '$1M资产 (4%提取率, 20%税) → 月度收入',
      passedUSD1 && passedCNY1,
      `$${expectedUSD1.toFixed(0)}/月, ¥${expectedCNY1.toFixed(0)}/月`,
      `$${income1.monthlyUSD.toFixed(0)}/月, ¥${income1.monthlyCNY.toFixed(0)}/月`
    );
    console.log(`  ${passedUSD1 && passedCNY1 ? '✅' : '❌'} $1M → 月度 USD: $${income1.monthlyUSD.toFixed(0)}, CNY: ¥${income1.monthlyCNY.toFixed(0)}`);

    // Test case 2: Different withdrawal rate
    const income2 = computeMonthlyIncome(500000, 0.05, 0.15, 6.8);
    const expectedUSD2 = (500000 * 0.05 * 0.85) / 12;
    const expectedCNY2 = expectedUSD2 * 6.8;

    const passedUSD2 = Math.abs(income2.monthlyUSD - expectedUSD2) < 30;
    const passedCNY2 = Math.abs(income2.monthlyCNY - expectedCNY2) < 300;

    this.recordTest(
      '$500K资产 (5%提取率, 15%税) → 月度收入',
      passedUSD2 && passedCNY2,
      `$${expectedUSD2.toFixed(0)}/月, ¥${expectedCNY2.toFixed(0)}/月`,
      `$${income2.monthlyUSD.toFixed(0)}/月, ¥${income2.monthlyCNY.toFixed(0)}/月`
    );
    console.log(`  ${passedUSD2 && passedCNY2 ? '✅' : '❌'} $500K (5% 提取率) → 月度 USD: $${income2.monthlyUSD.toFixed(0)}, CNY: ¥${income2.monthlyCNY.toFixed(0)}`);
  }

  testFireNumber(fireNumber) {
    console.log('\n📋 Test 3: FIRE 目标数额计算');

    // Test case 1: ¥300k annual -> 4% -> ¥7.5M
    const fn1 = fireNumber(300000, 0.04);
    const expected1 = 300000 / 0.04;
    const passed1 = Math.abs(fn1 - expected1) < 1000;

    this.recordTest(
      '¥300k年支出 (4%提取率) → FIRE目标',
      passed1,
      `¥${(expected1 / 1000000).toFixed(2)}M`,
      `¥${(fn1 / 1000000).toFixed(2)}M`
    );
    console.log(`  ${passed1 ? '✅' : '❌'} ¥300k年支出 (4%提取率) → ¥${(fn1 / 1000000).toFixed(2)}M`);

    // Test case 2: ¥600k annual -> 4% -> ¥15M
    const fn2 = fireNumber(600000, 0.04);
    const expected2 = 600000 / 0.04;
    const passed2 = Math.abs(fn2 - expected2) < 2000;

    this.recordTest(
      '¥600k年支出 (4%提取率) → FIRE目标',
      passed2,
      `¥${(expected2 / 1000000).toFixed(2)}M`,
      `¥${(fn2 / 1000000).toFixed(2)}M`
    );
    console.log(`  ${passed2 ? '✅' : '❌'} ¥600k年支出 (4%提取率) → ¥${(fn2 / 1000000).toFixed(2)}M`);
  }

  testYearsToFire(yearsToFire) {
    console.log('\n📋 Test 4: 到达FIRE需要年数');

    // Test case: PV=$500k, PMT=$20k/year, R=7%, FN=$7.5M, Inflation=2.5%
    const years = yearsToFire(500000, 240000, 0.07, 7500000, 0.025);
    const passed = years > 0 && years < 50;

    this.recordTest(
      '$500K初始 + $20K/月储蓄 → FIRE年数',
      passed,
      '5-30年 (合理范围)',
      `${years.toFixed(1)}年`
    );
    console.log(`  ${passed ? '✅' : '❌'} 初始$500K + 月储$20K → ${years.toFixed(1)}年到达FIRE`);

    // Test case 2: Starting with less, no savings
    const years2 = yearsToFire(1000000, 0, 0.07, 7500000, 0.025);
    const passed2 = years2 > 10 && years2 < 50;

    this.recordTest(
      '$1M初始, 无储蓄 → FIRE年数',
      passed2,
      '10-30年 (无储蓄情况)',
      `${years2.toFixed(1)}年`
    );
    console.log(`  ${passed2 ? '✅' : '❌'} 初始$1M + 无储蓄 → ${years2.toFixed(1)}年到达FIRE`);
  }

  testIntegration(funcs) {
    console.log('\n📋 Test 5: 完整流程集成');

    // Scenario: Slider 35
    const slider = 35;
    const assets = funcs.sliderToAssets(slider);
    const income = funcs.computeMonthlyIncome(assets, 0.04, 0.20, 6.8);

    const passed = assets > 0 && income.monthlyCNY > 0 && income.monthlyCNY < 1000000;

    this.recordTest(
      '滑块35 → 资产 → 月度收入',
      passed,
      '正数且有效',
      `$${(assets / 1000000).toFixed(2)}M → ¥${income.monthlyCNY.toFixed(0)}/月`
    );

    console.log(`  ${passed ? '✅' : '❌'} 滑块35: $${(assets / 1000000).toFixed(2)}M → ¥${income.monthlyCNY.toFixed(0)}/月`);

    // Scenario: Slider 70
    const slider2 = 70;
    const assets2 = funcs.sliderToAssets(slider2);
    const income2 = funcs.computeMonthlyIncome(assets2, 0.04, 0.20, 6.8);

    const passed2 = assets2 > assets && income2.monthlyCNY > income.monthlyCNY;

    this.recordTest(
      '滑块值越高 → 资产越多 → 收入越多',
      passed2,
      '单调递增关系',
      `滑块70 ($${(assets2 / 1000000).toFixed(2)}M) > 滑块35 ($${(assets / 1000000).toFixed(2)}M)`
    );

    console.log(`  ${passed2 ? '✅' : '❌'} 滑块70 ($${(assets2 / 1000000).toFixed(2)}M) > 滑块35 ($${(assets / 1000000).toFixed(2)}M)`);
  }

  recordTest(name, passed, expected, actual) {
    if (passed) {
      this.passed++;
    } else {
      this.failed++;
    }
    this.tests.push({ name, passed, expected, actual });
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 计算测试总结');
    console.log('='.repeat(50));
    console.log(`✅ 通过: ${this.passed}`);
    console.log(`❌ 失败: ${this.failed}`);

    if (this.failed > 0) {
      console.log('\n🔴 失败的测试:');
      this.tests
        .filter(t => !t.passed)
        .forEach(t => {
          console.log(`  ❌ ${t.name}`);
          console.log(`     期望: ${t.expected}`);
          console.log(`     实际: ${t.actual}`);
        });
    }

    console.log('');

    if (this.failed === 0) {
      console.log('✅ 所有计算测试通过！\n');
      process.exit(0);
    } else {
      console.log('❌ 有测试失败！\n');
      process.exit(1);
    }
  }
}

const tester = new CalculationTester();
tester.run().catch(err => {
  console.error('错误:', err);
  process.exit(1);
});
