function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getVariant(tier, householdModel) {
  if (!tier || !tier.variants) return null;
  return tier.variants[householdModel] || tier.variants['2a1c'] || Object.values(tier.variants)[0] || null;
}

function getRangeEnd(range, monthlyCNY) {
  if (Number.isFinite(range.max)) return range.max;
  return Math.max(monthlyCNY, range.min * 2, range.min + 1);
}

function normalizeBudgets(budgets, targetTotal) {
  const total = budgets.reduce((sum, item) => sum + item.amount, 0);
  if (total <= 0 || targetTotal <= 0) return budgets;

  const scale = targetTotal / total;
  return budgets.map(item => ({
    ...item,
    amount: item.amount * scale,
    percentage: ((item.amount * scale) / targetTotal) * 100
  }));
}

export function calculateBudgetAllocation({
  monthlyCNY,
  tiers,
  tierIndex,
  householdModel = '2a1c',
  categories = []
}) {
  const tier = tiers?.[tierIndex];
  const variant = getVariant(tier, householdModel);

  if (!tier || !variant || !Array.isArray(variant.pct)) {
    return {
      items: [],
      itemsByCategory: {},
      percentages: [],
      total: 0
    };
  }

  const previousVariant = tierIndex > 0 ? getVariant(tiers[tierIndex - 1], householdModel) : null;
  const range = variant.incomeRange || { min: 0, max: monthlyCNY };
  const rangeMin = Number.isFinite(range.min) ? range.min : 0;
  const rangeMax = getRangeEnd(range, monthlyCNY);
  const progress = rangeMax > rangeMin ? clamp((monthlyCNY - rangeMin) / (rangeMax - rangeMin)) : 1;
  const startPct = previousVariant?.pct || variant.pct;
  const endPct = variant.pct;

  const items = categories.map((category, index) => {
    const categoryId = category.id;
    const startBudget = rangeMin * ((startPct[index] || 0) / 100);
    const endBudget = rangeMax * ((endPct[index] || 0) / 100);
    const amount = startBudget + (endBudget - startBudget) * progress;

    return {
      categoryId,
      label: category.label,
      amount,
      percentage: monthlyCNY > 0 ? (amount / monthlyCNY) * 100 : 0
    };
  });

  const normalizedItems = normalizeBudgets(items, monthlyCNY);
  const itemsByCategory = Object.fromEntries(
    normalizedItems.map(item => [item.categoryId, item])
  );

  return {
    items: normalizedItems,
    itemsByCategory,
    percentages: normalizedItems.map(item => item.percentage),
    total: normalizedItems.reduce((sum, item) => sum + item.amount, 0)
  };
}
