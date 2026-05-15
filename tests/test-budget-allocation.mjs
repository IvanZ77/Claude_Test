import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sliderToAssets, roundToReadable } from '../assets/js/calc/assets.js';
import { computeMonthlyIncome } from '../assets/js/calc/income.js';
import { matchTier } from '../assets/js/calc/tier.js';
import { calculateBudgetAllocation } from '../assets/js/calc/budget.js';

const categories = JSON.parse(fs.readFileSync('data/categories.json', 'utf8')).categories;
const cityIndex = JSON.parse(fs.readFileSync('data/cities.json', 'utf8')).cities;
const shanghai = JSON.parse(fs.readFileSync('data/cities/shanghai.json', 'utf8'));
const params = {
  withdrawalRate: 0.04,
  taxRate: 0.2,
  fxUsdCny: 6.8
};

function allocationForSlider(city, sliderValue, householdModel) {
  const assets = sliderToAssets(sliderValue);
  const income = computeMonthlyIncome(
    assets,
    params.withdrawalRate,
    params.taxRate,
    params.fxUsdCny
  );
  const tierIndex = matchTier(income.monthlyCNY, city.tiers, householdModel);
  const allocation = calculateBudgetAllocation({
    monthlyCNY: income.monthlyCNY,
    tiers: city.tiers,
    tierIndex,
    householdModel,
    categories
  });

  return {
    sliderValue,
    monthlyCNY: income.monthlyCNY,
    tierIndex,
    allocation
  };
}

const beforeBoundary = allocationForSlider(shanghai, 44, '2a2c');
const afterBoundary = allocationForSlider(shanghai, 49, '2a2c');
const beforeHousing = beforeBoundary.allocation.itemsByCategory.housing.amount;
const afterHousing = afterBoundary.allocation.itemsByCategory.housing.amount;

assert.equal(beforeBoundary.tierIndex, 1);
assert.equal(afterBoundary.tierIndex, 2);
assert.ok(
  afterHousing >= beforeHousing,
  `housing should not drop across tier boundary: ${beforeHousing} -> ${afterHousing}`
);
assert.equal(roundToReadable(beforeHousing), 5000);
assert.equal(roundToReadable(afterHousing), 6000);

for (const cityMeta of cityIndex) {
  const city = JSON.parse(fs.readFileSync(`data/${cityMeta.file}`, 'utf8'));

  for (const householdModel of ['1a', '2a', '2a1c', '2a2c']) {
    const previousByCategory = {};

    for (let sliderValue = 0; sliderValue <= 100; sliderValue += 1) {
      const result = allocationForSlider(city, sliderValue, householdModel);
      const total = result.allocation.total;

      assert.ok(
        Math.abs(total - result.monthlyCNY) < 0.01,
        `${cityMeta.id} ${householdModel} slider ${sliderValue}: allocation total must equal monthly income`
      );

      for (const item of result.allocation.items) {
        const previous = previousByCategory[item.categoryId] ?? 0;
        assert.ok(
          item.amount + 0.01 >= previous,
          `${cityMeta.id} ${householdModel} slider ${sliderValue}: ${item.categoryId} dropped ${previous} -> ${item.amount}`
        );
        previousByCategory[item.categoryId] = item.amount;
      }
    }
  }
}

console.log('OK budget allocation is continuous, monotonic, and sums to monthly income');
