// Calculation logic tests
// Tests for all mathematical functions used in the calculator

export async function runCalculationTests(data) {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  console.log('🧪 Testing Calculation Logic\n');

  // Import required modules
  const { sliderToAssets, formatUSD } = await import('../calc/assets.js');
  const { computeMonthlyIncome } = await import('../calc/income.js');
  const { matchTier } = await import('../calc/tier.js');
  const {
    fireNumber,
    yearsToFire,
    projectAssets,
    classifyFireTier,
    coastFireAmount
  } = await import('../calc/fire.js');

  // Test 1: Asset slider conversion
  console.log('📋 Test 1: Slider to Assets Conversion');
  const sliderTests = testSliderConversion(sliderToAssets);
  results.tests.push(...sliderTests);
  results.passed += sliderTests.filter(t => t.passed).length;
  results.failed += sliderTests.filter(t => !t.passed).length;

  // Test 2: Monthly income calculation
  console.log('\n📋 Test 2: Monthly Income Calculation');
  const incomeTests = testMonthlyIncomeCalculation(computeMonthlyIncome);
  results.tests.push(...incomeTests);
  results.passed += incomeTests.filter(t => t.passed).length;
  results.failed += incomeTests.filter(t => !t.passed).length;

  // Test 3: Tier matching
  console.log('\n📋 Test 3: Tier Matching for Different Household Models');
  const tierTests = testTierMatching(matchTier, data.cityData.shanghai.tiers, data.householdModels);
  results.tests.push(...tierTests);
  results.passed += tierTests.filter(t => t.passed).length;
  results.failed += tierTests.filter(t => !t.passed).length;

  // Test 4: FIRE calculations
  console.log('\n📋 Test 4: FIRE Number Calculation');
  const fireTests = testFireNumber(fireNumber);
  results.tests.push(...fireTests);
  results.passed += fireTests.filter(t => t.passed).length;
  results.failed += fireTests.filter(t => !t.passed).length;

  // Test 5: Years to FIRE
  console.log('\n📋 Test 5: Years to FIRE Calculation');
  const yearsTests = testYearsToFire(yearsToFire);
  results.tests.push(...yearsTests);
  results.passed += yearsTests.filter(t => t.passed).length;
  results.failed += yearsTests.filter(t => !t.passed).length;

  // Test 6: Coast FIRE
  console.log('\n📋 Test 6: Coast FIRE Amount Calculation');
  const coastTests = testCoastFire(coastFireAmount);
  results.tests.push(...coastTests);
  results.passed += coastTests.filter(t => t.passed).length;
  results.failed += coastTests.filter(t => !t.passed).length;

  // Test 7: Integration test (full flow)
  console.log('\n📋 Test 7: Full Calculation Flow');
  const integrationTests = testFullFlow(
    sliderToAssets,
    computeMonthlyIncome,
    matchTier,
    data
  );
  results.tests.push(...integrationTests);
  results.passed += integrationTests.filter(t => t.passed).length;
  results.failed += integrationTests.filter(t => !t.passed).length;

  return results;
}

function testSliderConversion(sliderToAssets) {
  const tests = [];

  const testCases = [
    { slider: 0, expectedMin: 200000, expectedMax: 200000, desc: 'Slider 0 = $200k' },
    { slider: 50, expectedMin: 1000000, expectedMax: 1100000, desc: 'Slider 50 ≈ $1M' },
    { slider: 100, expectedMin: 19000000, expectedMax: 21000000, desc: 'Slider 100 ≈ $20M' },
    { slider: 35, expectedMin: 900000, expectedMax: 1100000, desc: 'Slider 35 ≈ $1M' }
  ];

  for (const tc of testCases) {
    const assets = sliderToAssets(tc.slider);
    const passed = assets >= tc.expectedMin && assets <= tc.expectedMax;

    console.log(`  ${passed ? '✅' : '❌'} ${tc.desc} (got $${(assets / 1000000).toFixed(2)}M)`);

    tests.push({
      name: tc.desc,
      passed,
      expected: `$${(tc.expectedMin / 1000000).toFixed(1)}M-$${(tc.expectedMax / 1000000).toFixed(1)}M`,
      actual: `$${(assets / 1000000).toFixed(2)}M`
    });
  }

  return tests;
}

function testMonthlyIncomeCalculation(computeMonthlyIncome) {
  const tests = [];

  // Test case: $1M with 4% rate, 20% tax, 6.8 FX
  const income = computeMonthlyIncome(1000000, 0.04, 0.20, 6.8);

  // Expected: 1M * 0.04 = 40k/year = 3.33k/month pre-tax
  // After 20% tax: 3.33k * 0.8 = 2.67k USD/month
  // In CNY: 2.67k * 6.8 = 18.1k CNY/month
  const expectedMonthlyUSD = (1000000 * 0.04 * (1 - 0.20)) / 12;
  const expectedMonthlyCNY = expectedMonthlyUSD * 6.8;

  const passedUSD = Math.abs(income.monthlyUSD - expectedMonthlyUSD) < 50;
  const passedCNY = Math.abs(income.monthlyCNY - expectedMonthlyCNY) < 500;

  console.log(`  ${passedUSD ? '✅' : '❌'} Monthly USD: $${income.monthlyUSD.toFixed(0)} (expected ~$${expectedMonthlyUSD.toFixed(0)})`);
  console.log(`  ${passedCNY ? '✅' : '❌'} Monthly CNY: ¥${income.monthlyCNY.toFixed(0)} (expected ~¥${expectedMonthlyCNY.toFixed(0)})`);

  tests.push({
    name: 'Income from $1M at 4% rate',
    passed: passedUSD && passedCNY,
    expected: `$${expectedMonthlyUSD.toFixed(0)}/mo, ¥${expectedMonthlyCNY.toFixed(0)}/mo`,
    actual: `$${income.monthlyUSD.toFixed(0)}/mo, ¥${income.monthlyCNY.toFixed(0)}/mo`
  });

  return tests;
}

function testTierMatching(matchTier, shanghaiTiers, householdModels) {
  const tests = [];

  // Test case: Shanghai with different household models
  // For 1a (single): ¥5000 should be Tier 0 (0-6000)
  const tier1a = matchTier(5000, shanghaiTiers, '1a');
  const passed1a = tier1a === 0;
  console.log(`  ${passed1a ? '✅' : '❌'} Single, ¥5000 → Tier ${tier1a} (expected 0)`);
  tests.push({
    name: 'Single (1a), ¥5000 → Tier 0',
    passed: passed1a,
    expected: 'Tier 0',
    actual: `Tier ${tier1a}`
  });

  // For 2a1c (family of 3): ¥30000 should be Tier 3 (27500-60000)
  const tier2a1c = matchTier(30000, shanghaiTiers, '2a1c');
  const passed2a1c = tier2a1c === 3;
  console.log(`  ${passed2a1c ? '✅' : '❌'} Family of 3, ¥30000 → Tier ${tier2a1c} (expected 3)`);
  tests.push({
    name: 'Family of 3 (2a1c), ¥30000 → Tier 3',
    passed: passed2a1c,
    expected: 'Tier 3',
    actual: `Tier ${tier2a1c}`
  });

  // For 2a2c (family of 4): ¥50000 should be Tier 3 or 4
  const tier2a2c = matchTier(50000, shanghaiTiers, '2a2c');
  const passed2a2c = tier2a2c >= 3 && tier2a2c <= 4;
  console.log(`  ${passed2a2c ? '✅' : '❌'} Family of 4, ¥50000 → Tier ${tier2a2c} (expected 3-4)`);
  tests.push({
    name: 'Family of 4 (2a2c), ¥50000 → Tier 3-4',
    passed: passed2a2c,
    expected: 'Tier 3-4',
    actual: `Tier ${tier2a2c}`
  });

  // Edge case: very high income
  const tierMax = matchTier(400000, shanghaiTiers, '1a');
  const passedMax = tierMax === 5;
  console.log(`  ${passedMax ? '✅' : '❌'} Single, ¥400000 → Tier ${tierMax} (expected 5 - top tier)`);
  tests.push({
    name: 'Single (1a), ¥400000 → Tier 5',
    passed: passedMax,
    expected: 'Tier 5',
    actual: `Tier ${tierMax}`
  });

  return tests;
}

function testFireNumber(fireNumber) {
  const tests = [];

  // Test case: Annual expense ¥300k at 4% rate
  // FIRE number = 300k / 0.04 = 7.5M
  const fn = fireNumber(300000, 0.04);
  const expected = 300000 / 0.04;
  const passed = Math.abs(fn - expected) < 1000;

  console.log(`  ${passed ? '✅' : '❌'} ¥300k expense → ¥${(fn / 1000000).toFixed(2)}M FIRE number`);
  console.log(`       (Expected: ¥${(expected / 1000000).toFixed(2)}M)`);

  tests.push({
    name: 'FIRE number: ¥300k annual → ¥7.5M target',
    passed,
    expected: `¥${(expected / 1000000).toFixed(2)}M`,
    actual: `¥${(fn / 1000000).toFixed(2)}M`
  });

  return tests;
}

function testYearsToFire(yearsToFire) {
  const tests = [];

  // Test case:
  // PV = $500k, PMT = $20k/year, R = 7%, FIRE = $7.5M, Inflation = 2.5%
  const years = yearsToFire(500000, 240000, 0.07, 7500000, 0.025);

  // Simple check: should be positive and reasonable (5-30 years)
  const passed = years > 0 && years < 50;

  console.log(`  ${passed ? '✅' : '❌'} With $500k, $20k/mo savings, 7% return → ${years.toFixed(1)} years to ¥7.5M FIRE`);

  tests.push({
    name: 'Years to FIRE with savings',
    passed,
    expected: '5-30 years (reasonable range)',
    actual: `${years.toFixed(1)} years`
  });

  return tests;
}

function testCoastFire(coastFireAmount) {
  const tests = [];

  // Test case:
  // FIRE number = $7.5M, return = 7%, years to retirement = 20
  const coast = coastFireAmount(7500000, 0.07, 20, 0.025);

  // Expected: 7.5M / (1.07)^20 ≈ $1.94M
  const expected = 7500000 / Math.pow(1.07, 20);
  const passed = Math.abs(coast - expected) < 50000;

  console.log(`  ${passed ? '✅' : '❌'} Coast FIRE: $${(coast / 1000000).toFixed(2)}M needed (20 years, 7% return)`);
  console.log(`       (Expected: $${(expected / 1000000).toFixed(2)}M)`);

  tests.push({
    name: 'Coast FIRE amount for $7.5M in 20 years',
    passed,
    expected: `$${(expected / 1000000).toFixed(2)}M`,
    actual: `$${(coast / 1000000).toFixed(2)}M`
  });

  return tests;
}

function testFullFlow(sliderToAssets, computeMonthlyIncome, matchTier, data) {
  const tests = [];

  // Scenario: User with slider at 35, Shanghai, family of 3
  const slider = 35;
  const assets = sliderToAssets(slider);
  const income = computeMonthlyIncome(assets, 0.04, 0.20, 6.8);
  const tierIdx = matchTier(income.monthlyCNY, data.cityData.shanghai.tiers, '2a1c');
  const tier = data.cityData.shanghai.tiers[tierIdx];

  console.log(`  Scenario: Slider 35 → $${(assets / 1000000).toFixed(2)}M → ¥${income.monthlyCNY.toFixed(0)}/mo → ${tier.name}`);

  const passed = tierIdx >= 0 && tierIdx < 6 && assets > 0 && income.monthlyCNY > 0;
  console.log(`  ${passed ? '✅' : '❌'} Full flow completed successfully`);

  tests.push({
    name: 'Full flow: slider → assets → income → tier',
    passed,
    expected: 'Valid tier (0-5) with positive income',
    actual: `Tier ${tierIdx}: ${tier.name}, ¥${income.monthlyCNY.toFixed(0)}/mo`
  });

  return tests;
}

// Helper function to print test results
export function printCalculationTestResults(results) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 Calculation Tests Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.failed > 0) {
    console.log('\n🔴 Failed Tests:');
    results.tests
      .filter(t => !t.passed)
      .forEach(t => {
        console.log(`  ❌ ${t.name}`);
        console.log(`     Expected: ${t.expected}`);
        console.log(`     Got:      ${t.actual}`);
      });
  }

  console.log('');
  return results.failed === 0;
}
