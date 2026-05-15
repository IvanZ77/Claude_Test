// FIRE calculations
export function fireNumber(annualExpenseCNY, withdrawalRate = 0.04) {
  const expense = Math.max(0, Number(annualExpenseCNY) || 0);
  const rate = (Number(withdrawalRate) > 0 && Number(withdrawalRate) <= 1) ? Number(withdrawalRate) : 0.04;
  return expense / rate;
}

export function yearsToFire(pv, pmt, r, fv, inflationRate = 0) {
  const safePv = Math.max(0, Number(pv) || 0);
  const safePmt = Math.max(0, Number(pmt) || 0);
  const safeFv = Math.max(0, Number(fv) || 0);
  const safeR = (Number(r) >= 0 && isFinite(Number(r))) ? Number(r) : 0.07;
  const safeInflation = (Number(inflationRate) >= 0 && isFinite(Number(inflationRate))) ? Number(inflationRate) : 0;

  // Using inflation-adjusted rate if provided
  let rate = safeR;
  if (safeInflation > 0) {
    rate = (1 + safeR) / (1 + safeInflation) - 1;
  }

  // Handle edge cases
  if (rate < 0.0001) {
    if (safePmt <= 0) return Infinity;
    return Math.max(0, (safeFv - safePv) / safePmt);
  }

  // Closed-form solution: n = ln((FV·r + PMT) / (PV·r + PMT)) / ln(1 + r)
  const numerator = safeFv * rate + safePmt;
  const denominator = safePv * rate + safePmt;

  if (numerator <= 0 || denominator <= 0) return Infinity;

  const n = Math.log(numerator / denominator) / Math.log(1 + rate);
  return Math.max(0, Math.min(n, 50)); // Cap at 50 years
}

export function projectAssets(pv, pmt, r, years, inflationRate = 0) {
  const safePv = Math.max(0, Number(pv) || 0);
  const safePmt = Math.max(0, Number(pmt) || 0);
  const safeR = (Number(r) >= 0 && isFinite(Number(r))) ? Number(r) : 0.07;
  const safeYears = Math.max(0, Math.min(Number(years) || 0, 100));
  const safeInflation = Math.max(0, Number(inflationRate) || 0);

  const projection = [];

  for (let year = 0; year <= Math.ceil(safeYears); year++) {
    // Nominal value
    let nominal = safePv * Math.pow(1 + safeR, year);
    if (safePmt > 0) {
      if (safeR > 0.0001) {
        nominal += safePmt * (Math.pow(1 + safeR, year) - 1) / safeR;
      } else {
        // When rate is near zero, use linear growth
        nominal += safePmt * year;
      }
    }

    // Real value (adjusted for inflation)
    const real = nominal / Math.pow(1 + safeInflation, year);

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
  const safeTarget = Math.max(0, Number(fireNumberTarget) || 0);
  const safeR = (Number(r) > 0 && isFinite(Number(r))) ? Number(r) : 0.07;
  const safeYears = Math.max(0, Number(yearsToRetire) || 0);
  const safeInflation = Math.max(0, Number(inflationRate) || 0);

  let rate = safeR;
  if (safeInflation > 0) {
    rate = (1 + safeR) / (1 + safeInflation) - 1;
  }

  if (safeYears === 0 || rate <= 0) return safeTarget;
  const pv = safeTarget / Math.pow(1 + rate, safeYears);
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
