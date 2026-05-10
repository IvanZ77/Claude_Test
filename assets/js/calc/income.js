// Income calculation using 4% rule
export function computeMonthlyIncome(assets, withdrawalRate = 0.04, taxRate = 0.20, fxUsdCny = 6.8) {
  const annualUSD = assets * withdrawalRate;
  const monthlyUSD = (annualUSD * (1 - taxRate)) / 12;
  const monthlyCNY = monthlyUSD * fxUsdCny;

  return {
    annualUSD,
    monthlyUSD,
    monthlyCNY
  };
}
