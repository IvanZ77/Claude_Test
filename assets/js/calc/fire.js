// FIRE calculations
export function fireNumber(annualExpenseCNY, withdrawalRate = 0.04) {
  return annualExpenseCNY / withdrawalRate;
}

export function yearsToFire(pv, pmt, r, fv, inflationRate = 0) {
  // Using inflation-adjusted rate if provided
  let rate = r;
  if (inflationRate > 0) {
    rate = (1 + r) / (1 + inflationRate) - 1;
  }

  // Handle edge cases
  if (rate < 0.0001) {
    if (pmt <= 0) return Infinity;
    return Math.max(0, (fv - pv) / pmt);
  }

  // Closed-form solution: n = ln((FV·r + PMT) / (PV·r + PMT)) / ln(1 + r)
  const numerator = fv * rate + pmt;
  const denominator = pv * rate + pmt;

  if (numerator <= 0 || denominator <= 0) return Infinity;

  const n = Math.log(numerator / denominator) / Math.log(1 + rate);
  return Math.max(0, Math.min(n, 50)); // Cap at 50 years
}

export function projectAssets(pv, pmt, r, years, inflationRate = 0) {
  const projection = [];

  for (let year = 0; year <= Math.ceil(years); year++) {
    // Nominal value
    let nominal = pv * Math.pow(1 + r, year);
    if (pmt > 0) {
      if (r > 0.0001) {
        nominal += pmt * (Math.pow(1 + r, year) - 1) / r;
      } else {
        // When rate is near zero, use linear growth
        nominal += pmt * year;
      }
    }

    // Real value (adjusted for inflation)
    const real = nominal / Math.pow(1 + inflationRate, year);

    projection.push({
      year,
      nominal: Math.round(nominal),
      real: Math.round(real)
    });
  }

  return projection;
}

export function coastFireAmount(fireNumberTarget, r, yearsToRetire, inflationRate = 0) {
  // How much do you need NOW to reach fireNumber at retirement without further savings?
  // fireNumber = pv * (1 + r)^years
  let rate = r;
  if (inflationRate > 0) {
    rate = (1 + r) / (1 + inflationRate) - 1;
  }

  const pv = fireNumberTarget / Math.pow(1 + rate, yearsToRetire);
  return Math.round(pv);
}

export function classifyFireTier(annualExpenseCNY, fireTiers) {
  // Find matching tier based on annual expense threshold
  for (const tier of fireTiers) {
    if (tier.computed) continue; // Skip computed tiers like Coast FIRE
    if (tier.annualExpenseMaxCNY === null) {
      // This is the highest tier
      return tier;
    }
    if (annualExpenseCNY <= tier.annualExpenseMaxCNY) {
      return tier;
    }
  }
  // Return highest tier if no match
  return fireTiers[fireTiers.length - 1];
}
