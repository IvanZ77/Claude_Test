// Data validation test suite
// Run in browser: import('./test/data-validator.js').then(m => m.runAllTests())
// Or in Node.js: node assets/js/test/data-validator.js

export async function validateAllData(data) {
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    errors: []
  };

  console.log('🧪 Starting comprehensive data validation...\n');

  // Test 1: Household models completeness
  console.log('📋 Test 1: Validating household models...');
  const householdTest = validateHouseholdModels(data.householdModels);
  results.passed += householdTest.passed;
  results.failed += householdTest.failed;
  results.warnings += householdTest.warnings;
  results.errors.push(...householdTest.errors);

  // Test 2: Categories completeness
  console.log('\n📋 Test 2: Validating categories...');
  const categoriesTest = validateCategories(data.categories);
  results.passed += categoriesTest.passed;
  results.failed += categoriesTest.failed;
  results.warnings += categoriesTest.warnings;
  results.errors.push(...categoriesTest.errors);

  // Test 3: Each city's data
  console.log('\n📋 Test 3: Validating city data...');
  for (const city of data.availableCities) {
    const cityData = data.cityData[city.id];
    if (cityData) {
      console.log(`  Checking ${city.name}...`);
      const cityTest = validateCityData(city.id, city.name, cityData, data.categories, data.householdModels);
      results.passed += cityTest.passed;
      results.failed += cityTest.failed;
      results.warnings += cityTest.warnings;
      results.errors.push(...cityTest.errors);
    }
  }

  // Test 4: FIRE tiers
  console.log('\n📋 Test 4: Validating FIRE tiers...');
  const fireTest = validateFireTiers(data.fireTiers);
  results.passed += fireTest.passed;
  results.failed += fireTest.failed;
  results.warnings += fireTest.warnings;
  results.errors.push(...fireTest.errors);

  // Test 5: Defaults
  console.log('\n📋 Test 5: Validating defaults...');
  const defaultsTest = validateDefaults(data.defaults);
  results.passed += defaultsTest.passed;
  results.failed += defaultsTest.failed;
  results.warnings += defaultsTest.warnings;
  results.errors.push(...defaultsTest.errors);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Summary');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);

  if (results.failed > 0) {
    console.log('\n🔴 ERRORS:');
    results.errors.forEach(err => console.log(`  ❌ ${err}`));
  }

  const status = results.failed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED';
  console.log(`\n${status}\n`);

  return results;
}

function validateHouseholdModels(models) {
  const results = { passed: 0, failed: 0, warnings: 0, errors: [] };

  if (!models || !Array.isArray(models)) {
    results.failed++;
    results.errors.push('Household models is not an array');
    return results;
  }

  if (models.length !== 4) {
    results.failed++;
    results.errors.push(`Expected 4 household models, got ${models.length}`);
    return results;
  }

  const expectedIds = ['1a', '2a', '2a1c', '2a2c'];
  const actualIds = models.map(m => m.id);

  expectedIds.forEach(id => {
    if (actualIds.includes(id)) {
      results.passed++;
      console.log(`  ✅ Model '${id}' exists`);
    } else {
      results.failed++;
      results.errors.push(`Missing household model: ${id}`);
    }
  });

  return results;
}

function validateCategories(categories) {
  const results = { passed: 0, failed: 0, warnings: 0, errors: [] };

  if (!categories || !Array.isArray(categories)) {
    results.failed++;
    results.errors.push('Categories is not an array');
    return results;
  }

  if (categories.length !== 7) {
    results.failed++;
    results.errors.push(`Expected 7 categories, got ${categories.length}`);
    return results;
  }

  const expectedCats = ['housing', 'education', 'food', 'transport', 'medical', 'travel', 'shopping'];
  const actualCats = categories.map(c => c.id);

  expectedCats.forEach(id => {
    if (actualCats.includes(id)) {
      results.passed++;
    } else {
      results.failed++;
      results.errors.push(`Missing category: ${id}`);
    }
  });

  return results;
}

function validateCityData(cityId, cityName, cityData, categories, householdModels) {
  const results = { passed: 0, failed: 0, warnings: 0, errors: [] };

  // Check tiers count
  if (!cityData.tiers || cityData.tiers.length !== 6) {
    results.failed++;
    results.errors.push(`${cityName}: Expected 6 tiers, got ${cityData.tiers ? cityData.tiers.length : 0}`);
    return results;
  }

  results.passed++; // Tiers count correct

  // Check each tier
  cityData.tiers.forEach((tier, tierIdx) => {
    // Check variants exist
    if (!tier.variants) {
      results.failed++;
      results.errors.push(`${cityName} Tier ${tierIdx}: Missing 'variants' object`);
      return;
    }

    // Check all household models have variants
    const missingModels = householdModels
      .filter(m => !tier.variants[m.id])
      .map(m => m.id);

    if (missingModels.length > 0) {
      results.failed++;
      results.errors.push(`${cityName} Tier ${tierIdx}: Missing variants for ${missingModels.join(', ')}`);
      return;
    }

    // Validate each variant
    householdModels.forEach(model => {
      const variant = tier.variants[model.id];

      // Check incomeRange
      if (!variant.incomeRange) {
        results.failed++;
        results.errors.push(`${cityName} Tier ${tierIdx} (${model.id}): Missing incomeRange`);
        return;
      }

      if (typeof variant.incomeRange.min !== 'number' || typeof variant.incomeRange.max !== 'number') {
        results.failed++;
        results.errors.push(`${cityName} Tier ${tierIdx} (${model.id}): Invalid incomeRange values`);
        return;
      }

      if (variant.incomeRange.min > variant.incomeRange.max) {
        results.failed++;
        results.errors.push(`${cityName} Tier ${tierIdx} (${model.id}): incomeRange.min > max`);
        return;
      }

      // Check pct array
      if (!Array.isArray(variant.pct) || variant.pct.length !== categories.length) {
        results.failed++;
        results.errors.push(
          `${cityName} Tier ${tierIdx} (${model.id}): pct array length should be ${categories.length}, got ${variant.pct ? variant.pct.length : 0}`
        );
        return;
      }

      // Check pct sum
      const pctSum = variant.pct.reduce((a, b) => a + b, 0);
      if (Math.abs(pctSum - 100) > 1) {
        results.warnings++;
        console.log(
          `  ⚠️  ${cityName} Tier ${tierIdx} (${model.id}): pct sum is ${pctSum.toFixed(1)}% (expected ~100%)`
        );
      } else {
        results.passed++;
      }

      // Check education percentage follows pattern
      const educationIdx = 1; // education is the 2nd category
      const eduPct = variant.pct[educationIdx];
      const expectedEduPattern = {
        '1a': 0,
        '2a': 0,
        '2a1c': 8,
        '2a2c': 16
      };
      const expectedEdu = expectedEduPattern[model.id];
      if (eduPct !== expectedEdu && !(model.id === '2a2c' && Math.abs(eduPct - 16) <= 2)) {
        // Allow some flexibility for 2a2c
        results.warnings++;
        console.log(
          `  ⚠️  ${cityName} Tier ${tierIdx} (${model.id}): Education % is ${eduPct}% (expected ~${expectedEdu}%)`
        );
      }
    });
  });

  // Check range continuity
  for (let i = 0; i < cityData.tiers.length - 1; i++) {
    householdModels.forEach(model => {
      const currentMax = cityData.tiers[i].variants[model.id].incomeRange.max;
      const nextMin = cityData.tiers[i + 1].variants[model.id].incomeRange.min;
      if (currentMax !== nextMin) {
        results.warnings++;
        console.log(
          `  ⚠️  ${cityName} (${model.id}): Tier ${i} max (${currentMax}) ≠ Tier ${i + 1} min (${nextMin})`
        );
      }
    });
  }

  return results;
}

function validateFireTiers(fireTiers) {
  const results = { passed: 0, failed: 0, warnings: 0, errors: [] };

  if (!fireTiers || !Array.isArray(fireTiers)) {
    results.failed++;
    results.errors.push('Fire tiers is not an array');
    return results;
  }

  const expectedCount = 4; // Lean, Regular, Fat, Coast
  if (fireTiers.length !== expectedCount) {
    results.failed++;
    results.errors.push(`Expected ${expectedCount} FIRE tiers, got ${fireTiers.length}`);
    return results;
  }

  const tierIds = fireTiers.map(t => t.id);
  const expectedIds = ['lean', 'regular', 'fat', 'coast'];

  expectedIds.forEach(id => {
    if (tierIds.includes(id)) {
      results.passed++;
      console.log(`  ✅ FIRE tier '${id}' exists`);
    } else {
      results.failed++;
      results.errors.push(`Missing FIRE tier: ${id}`);
    }
  });

  return results;
}

function validateDefaults(defaults) {
  const results = { passed: 0, failed: 0, warnings: 0, errors: [] };

  const requiredParams = [
    'withdrawalRate',
    'taxRate',
    'fxUsdCny',
    'annualReturnRate',
    'inflationRate',
    'defaultHouseholdModel'
  ];

  requiredParams.forEach(param => {
    if (defaults.params && typeof defaults.params[param] !== 'undefined') {
      results.passed++;
      console.log(`  ✅ Default param '${param}' = ${defaults.params[param]}`);
    } else {
      results.failed++;
      results.errors.push(`Missing default parameter: ${param}`);
    }
  });

  // Check ranges
  const requiredRanges = [
    'withdrawalRate',
    'taxRate',
    'fxUsdCny',
    'annualReturnRate',
    'inflationRate'
  ];

  requiredRanges.forEach(range => {
    if (defaults.ranges && defaults.ranges[range]) {
      results.passed++;
      console.log(`  ✅ Range for '${range}' defined`);
    } else {
      results.failed++;
      results.errors.push(`Missing range definition: ${range}`);
    }
  });

  return results;
}

// Test matchTier function
export function validateMatchTierFunction(matchTier, cityTiers, householdModels) {
  const results = { passed: 0, failed: 0, errors: [] };

  console.log('\n🧪 Testing matchTier function...');

  householdModels.forEach(model => {
    // Test each tier's income range
    cityTiers.forEach((tier, expectedTierIdx) => {
      const variant = tier.variants[model.id];
      const minIncome = variant.incomeRange.min + 1; // Just above minimum
      const maxIncome = variant.incomeRange.max ? variant.incomeRange.max - 1 : variant.incomeRange.max; // Just below maximum

      if (minIncome <= maxIncome) {
        const tierIdx = matchTier(minIncome, cityTiers, model.id);
        if (tierIdx === expectedTierIdx) {
          results.passed++;
        } else {
          results.failed++;
          results.errors.push(
            `matchTier(¥${minIncome}, '${model.id}') returned tier ${tierIdx}, expected ${expectedTierIdx}`
          );
        }
      }
    });
  });

  console.log(`  ✅ Passed: ${results.passed}`);
  if (results.failed > 0) {
    console.log(`  ❌ Failed: ${results.failed}`);
    results.errors.slice(0, 5).forEach(err => console.log(`    - ${err}`));
  }

  return results;
}

// If running in Node.js directly
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateAllData, validateMatchTierFunction };
}
