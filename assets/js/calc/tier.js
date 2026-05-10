// Tier matching logic
export function matchTier(monthlyCNY, tiers) {
  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    if (monthlyCNY >= tier.incomeRange.min && monthlyCNY < tier.incomeRange.max) {
      return i;
    }
  }
  return tiers.length - 1;
}
