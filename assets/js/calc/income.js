// Income calculation using 4% rule
export function computeMonthlyIncome(assets, withdrawalRate = 0.04, taxRate = 0.20, fxUsdCny = 6.8) {
  const safeAssets = Math.max(0, Number(assets) || 0);
  const safeRate = (Number(withdrawalRate) > 0 && Number(withdrawalRate) <= 1) ? Number(withdrawalRate) : 0.04;
  const safeTax = Math.min(Math.max(Number(taxRate) || 0, 0), 0.99);
  const safeFx = (Number(fxUsdCny) > 0 && isFinite(Number(fxUsdCny))) ? Number(fxUsdCny) : 6.8;

  const annualUSD = safeAssets * safeRate;
  const monthlyUSD = (annualUSD * (1 - safeTax)) / 12;
  const monthlyCNY = monthlyUSD * safeFx;

  return {
    annualUSD,
    monthlyUSD,
    monthlyCNY
  };
}
