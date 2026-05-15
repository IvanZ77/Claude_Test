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

  // Test 6: FX rate placeholders
  console.log('\n📋 Test 6: Validating FX rates (fxToCNY placeholders)...');
  const fxTest = validateFxRates(data.availableCities);
  results.passed += fxTest.passed;
  results.failed += fxTest.failed;
  results.warnings += fxTest.warnings;
  results.errors.push(...fxTest.errors);

  // Test 7: Data freshness (lastUpdated fields)
  console.log('\n📋 Test 7: Validating data freshness...');
  const freshnessTest = validateFreshness(data.availableCities, data.cityData, data.defaults);
  results.passed += freshnessTest.passed;
  results.failed += freshnessTest.failed;
  results.warnings += freshnessTest.warnings;
  results.errors.push(...freshnessTest.errors);

  // Test 8: City completeness flags
  console.log('\n📋 Test 8: Validating city completeness metadata...');
  const completenessTest = validateCityCompleteness(data.availableCities, data.cityData);
  results.passed += completenessTest.passed;
  results.failed += completenessTest.failed;
  results.warnings += completenessTest.warnings;
  results.errors.push(...completenessTest.errors);

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

  // Check range continuity — gaps are ERRORs, overlaps are WARNINGs
  for (let i = 0; i < cityData.tiers.length - 1; i++) {
    householdModels.forEach(model => {
      const currentMax = cityData.tiers[i].variants[model.id].incomeRange.max;
      const nextMin = cityData.tiers[i + 1].variants[model.id].incomeRange.min;
      if (currentMax !== nextMin) {
        if (currentMax < nextMin) {
          // Gap: income falls into no tier
          results.failed++;
          results.errors.push(
            `${cityName} (${model.id}): GAP between Tier ${i} max (${currentMax}) and Tier ${i + 1} min (${nextMin}) — income in this range matches no tier`
          );
        } else {
          // Overlap: income could match either tier (ambiguous)
          results.warnings++;
          console.log(
            `  ⚠️  ${cityName} (${model.id}): OVERLAP — Tier ${i} max (${currentMax}) > Tier ${i + 1} min (${nextMin})`
          );
        }
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

function validateFxRates(availableCities) {
  const results = { passed: 0, failed: 0, warnings: 0, errors: [] };

  for (const city of availableCities) {
    const isNonCNY = city.nativeCurrency && city.nativeCurrency !== 'CNY';
    if (isNonCNY && city.fxToCNY === 1.0) {
      results.failed++;
      results.errors.push(
        `${city.name} (${city.id}): fxToCNY is placeholder 1.0 but nativeCurrency is ${city.nativeCurrency} — update with real rate from PBOC/XE before merging`
      );
    } else if (!city.nativeCurrency) {
      results.warnings++;
      console.log(`  ⚠️  ${city.name}: missing nativeCurrency field — cannot validate fxToCNY`);
    } else {
      results.passed++;
      console.log(`  ✅ ${city.name}: fxToCNY=${city.fxToCNY} (${city.nativeCurrency})`);
    }
  }

  return results;
}

function validateFreshness(availableCities, cityData, defaults) {
  const results = { passed: 0, failed: 0, warnings: 0, errors: [] };
  const STALE_DAYS = 90;
  const now = Date.now();

  const checkDate = (label, dateStr) => {
    if (!dateStr || dateStr.startsWith('TODO')) {
      results.warnings++;
      console.log(`  ⚠️  ${label}: missing lastUpdated — add date when data was verified`);
      return;
    }
    const ts = new Date(dateStr).getTime();
    if (isNaN(ts)) {
      results.warnings++;
      console.log(`  ⚠️  ${label}: lastUpdated "${dateStr}" is not a valid date`);
      return;
    }
    const daysOld = (now - ts) / (1000 * 60 * 60 * 24);
    if (daysOld > STALE_DAYS) {
      results.warnings++;
      console.log(`  ⚠️  ${label}: data is ${Math.round(daysOld)} days old (>${STALE_DAYS} day threshold)`);
    } else {
      results.passed++;
    }
  };

  checkDate('defaults.json', defaults && defaults.lastUpdated);

  for (const city of availableCities) {
    const cd = cityData[city.id];
    checkDate(`cities/${city.id}.json`, cd && cd.lastUpdated);
    if (cd && !cd.sources) {
      results.warnings++;
      console.log(`  ⚠️  ${city.name}: missing sources[] array — add at least one data source reference`);
    }
  }

  return results;
}

function validateCityCompleteness(availableCities, cityData) {
  const results = { passed: 0, failed: 0, warnings: 0, errors: [] };
  let incompleteCount = 0;

  for (const city of availableCities) {
    const cd = cityData[city.id];
    if (!cd) continue;

    if (cd.incomplete === true) {
      incompleteCount++;
      console.log(`  ℹ️  ${city.name}: marked incomplete — data awaiting verification`);
    } else {
      results.passed++;
    }
  }

  if (incompleteCount > 0) {
    console.log(`  ℹ️  ${incompleteCount} cities marked incomplete (this is informational, not blocking)`);
  }

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
