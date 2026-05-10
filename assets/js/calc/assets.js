// Asset formatting and log-scale conversion
const MIN_USD = 200000;
const MAX_USD = 20000000;

export function sliderToAssets(sliderValue) {
  const minLog = Math.log10(MIN_USD);
  const maxLog = Math.log10(MAX_USD);
  return Math.pow(10, minLog + (sliderValue / 100) * (maxLog - minLog));
}

export function formatNumber(n) {
  return Math.round(n).toLocaleString('en-US');
}

export function formatUSD(amount) {
  if (amount >= 10000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(2) + 'M';
  return '$' + formatNumber(Math.round(amount / 1000)) + 'K';
}
