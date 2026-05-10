// Tier matching logic
export function matchTier(monthlyCNY, tiers, householdModel = '2a1c') {
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const variant = tier.variants ? tier.variants[householdModel] : null;

    if (!variant) {
      console.warn(`Household model '${householdModel}' not found in tier ${tier.id}, falling back to 2a1c`);
      if (householdModel !== '2a1c' && tier.variants && tier.variants['2a1c']) {
        const fallback = tier.variants['2a1c'];
        const withinMin = monthlyCNY >= fallback.incomeRange.min;
        const withinMax = fallback.incomeRange.max === null || monthlyCNY < fallback.incomeRange.max;
        if (withinMin && withinMax) {
          return i;
        }
      }
      continue;
    }

    const withinMin = monthlyCNY >= variant.incomeRange.min;
    const withinMax = variant.incomeRange.max === null || monthlyCNY < variant.incomeRange.max;
    if (withinMin && withinMax) {
      return i;
    }
  }
  return tiers.length - 1;
}
