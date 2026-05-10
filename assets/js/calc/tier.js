// Tier matching logic
export function matchTier(monthlyCNY, tiers, householdModel = '2a1c') {
  console.log(`[matchTier] Input: monthlyCNY=¥${Math.round(monthlyCNY)}, householdModel=${householdModel}`);

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    const variant = tier.variants ? tier.variants[householdModel] : null;

    if (!variant) {
      console.warn(`[matchTier] Tier ${i} (${tier.id}): No variant for ${householdModel}`);
      if (householdModel !== '2a1c' && tier.variants && tier.variants['2a1c']) {
        const fallback = tier.variants['2a1c'];
        const withinMin = monthlyCNY >= fallback.incomeRange.min;
        const withinMax = fallback.incomeRange.max === null || monthlyCNY < fallback.incomeRange.max;
        if (withinMin && withinMax) {
          console.log(`[matchTier] ✓ Matched Tier ${i} (fallback to 2a1c)`);
          return i;
        }
      }
      continue;
    }

    const withinMin = monthlyCNY >= variant.incomeRange.min;
    const withinMax = variant.incomeRange.max === null || monthlyCNY < variant.incomeRange.max;
    const match = withinMin && withinMax;

    console.log(`[matchTier] Tier ${i} (${tier.id}): Range ¥${variant.incomeRange.min}-${variant.incomeRange.max || '∞'} → ${match ? '✓ MATCH' : '✗'}`);

    if (match) {
      console.log(`[matchTier] ✓ Matched Tier ${i}: ${tier.name}`);
      return i;
    }
  }

  console.error(`[matchTier] ✗ No match found! Returning last tier (${tiers.length - 1})`);
  return tiers.length - 1;
}
