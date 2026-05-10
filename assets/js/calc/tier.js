// Tier matching logic
export function matchTier(monthlyCNY, tiers) {
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const withinMin = monthlyCNY >= tier.incomeRange.min;
    const withinMax = tier.incomeRange.max === null || monthlyCNY < tier.incomeRange.max;
    if (withinMin && withinMax) {
      return i;
    }
  }
  return tiers.length - 1;
}
