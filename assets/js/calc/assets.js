// Asset formatting and log-scale conversion
const MIN_USD = 200000;
const MAX_USD = 20000000;

export function sliderToAssets(sliderValue) {
  const clamped = Math.min(100, Math.max(0, Number(sliderValue) || 0));
  const minLog = Math.log10(MIN_USD);
  const maxLog = Math.log10(MAX_USD);
  return Math.pow(10, minLog + (clamped / 100) * (maxLog - minLog));
}

export function formatNumber(n) {
  return Math.round(n).toLocaleString('en-US');
}

export function formatUSD(amount) {
  if (amount >= 10000000) return '$' + (amount / 1000000).toFixed(1) + 'M';
  if (amount >= 1000000) return '$' + (amount / 1000000).toFixed(2) + 'M';
  return '$' + formatNumber(Math.round(amount / 1000)) + 'K';
}

export function roundToReadable(value) {
  if (value < 100) return Math.round(value / 10) * 10;
  if (value < 1000) return Math.round(value / 100) * 100;
  if (value < 10000) return Math.round(value / 1000) * 1000;
  if (value < 100000) return Math.round(value / 10000) * 10000;
  return Math.round(value / 100000) * 100000;
}
