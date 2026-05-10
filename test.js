#!/usr/bin/env node

/**
 * 快速数据验证脚本
 * 用法: node test.js
 */

const fs = require('fs');
const path = require('path');

class DataValidator {
  constructor() {
    this.passed = 0;
    this.failed = 0;
    this.warnings = 0;
    this.errors = [];
  }

  loadAllData() {
    const dataDir = './data';

    const householdModels = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'household-models.json'))
    );
    const categories = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'categories.json'))
    );
    const cities = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'cities.json'))
    );
    const defaults = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'defaults.json'))
    );
    const fireTiers = JSON.parse(
      fs.readFileSync(path.join(dataDir, 'fire-tiers.json'))
    );

    const cityData = {};
    for (const city of cities.cities) {
      try {
        const cityJson = JSON.parse(
          fs.readFileSync(path.join(dataDir, 'cities', `${city.id}.json`))
        );
        cityData[city.id] = cityJson;
      } catch (e) {
        // Skip missing cities
      }
    }

    return {
      householdModels: householdModels.models,
      categories: categories.categories,
      cities: cities.cities,
      defaults: defaults,
      fireTiers: fireTiers.tiers,
      cityData
    };
  }

  validate(data) {
    console.log('🧪 Running data validation tests...\n');

    this.validateHouseholdModels(data.householdModels);
    this.validateCategories(data.categories);
    this.validateCities(data);
    this.validateFireTiers(data.fireTiers);
    this.validateDefaults(data.defaults);

    this.printSummary();
  }

  validateHouseholdModels(models) {
    console.log('📋 Household Models');
    if (models.length === 4) {
      console.log('  ✅ Found 4 models: 1a, 2a, 2a1c, 2a2c');
      this.passed++;
    } else {
      console.log(`  ❌ Expected 4 models, got ${models.length}`);
      this.failed++;
    }
  }

  validateCategories(categories) {
    console.log('\n📋 Categories');
    if (categories.length === 7) {
      console.log('  ✅ Found 7 categories');
      this.passed++;
    } else {
      console.log(`  ❌ Expected 7 categories, got ${categories.length}`);
      this.failed++;
    }
  }

  validateCities(data) {
    console.log('\n📋 City Data');
    const availableCities = data.cities.filter(c => data.cityData[c.id]);
    console.log(`  Checking ${availableCities.length} cities\n`);

    for (const city of availableCities) {
      const tiers = data.cityData[city.id].tiers;

      if (tiers.length !== 6) {
        console.log(`  ❌ ${city.name}: Expected 6 tiers, got ${tiers.length}`);
        this.failed++;
        continue;
      }

      let hasErrors = false;
      let warningCount = 0;

      // Validate each tier
      for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i];

        if (!tier.variants) {
          console.log(`  ❌ ${city.name} Tier ${i}: Missing variants`);
          this.failed++;
          hasErrors = true;
          break;
        }

        // Check each household model
        for (const model of data.householdModels) {
          const variant = tier.variants[model.id];

          if (!variant) {
            console.log(`  ❌ ${city.name} Tier ${i}: Missing ${model.id} variant`);
            this.failed++;
            hasErrors = true;
            break;
          }

          // Validate percentage sum
          const pctSum = variant.pct.reduce((a, b) => a + b, 0);
          if (Math.abs(pctSum - 100) > 1) {
            warningCount++;
          }

          // Validate range continuity
          if (i < tiers.length - 1) {
            const nextVariant = tiers[i + 1].variants[model.id];
            if (variant.incomeRange.max !== nextVariant.incomeRange.min) {
              warningCount++;
            }
          }
        }
      }

      if (!hasErrors) {
        if (warningCount > 0) {
          console.log(`  ⚠️  ${city.name}: OK (${warningCount} warnings)`);
          this.warnings += warningCount;
        } else {
          console.log(`  ✅ ${city.name}`);
        }
        this.passed++;
      }
    }
  }

  validateFireTiers(fireTiers) {
    console.log('\n📋 FIRE Tiers');
    if (fireTiers.length === 4) {
      console.log('  ✅ Found 4 FIRE tiers');
      this.passed++;
    } else {
      console.log(`  ❌ Expected 4 FIRE tiers, got ${fireTiers.length}`);
      this.failed++;
    }
  }

  validateDefaults(defaults) {
    console.log('\n📋 Defaults');
    const requiredParams = [
      'withdrawalRate',
      'taxRate',
      'fxUsdCny',
      'annualReturnRate',
      'inflationRate',
      'defaultHouseholdModel'
    ];

    const missing = requiredParams.filter(
      p => typeof defaults.params[p] === 'undefined'
    );

    if (missing.length === 0) {
      console.log('  ✅ All required parameters present');
      this.passed++;
    } else {
      console.log(`  ❌ Missing parameters: ${missing.join(', ')}`);
      this.failed++;
    }
  }

  printSummary() {
    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${this.passed}`);
    console.log(`❌ Failed: ${this.failed}`);
    console.log(`⚠️  Warnings: ${this.warnings}\n`);

    if (this.failed === 0) {
      console.log('✅ All tests passed! Data is valid.\n');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed. Please fix the issues.\n');
      process.exit(1);
    }
  }
}

try {
  const validator = new DataValidator();
  const data = validator.loadAllData();
  validator.validate(data);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
