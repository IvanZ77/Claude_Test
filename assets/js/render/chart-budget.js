// Budget chart renderer
let chartInstance = null;

export function initBudgetChart(containerEl, categories, initialTierPct) {
  if (typeof window.Chart === 'undefined') {
    console.warn('Chart.js not loaded');
    return null;
  }

  const ctx = containerEl.getContext('2d');
  const bgColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-bg-tertiary')
    .trim() || '#fff';

  chartInstance = new window.Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: categories.map(c => c.label),
      datasets: [
        {
          data: initialTierPct,
          backgroundColor: categories.map(c => c.color),
          borderWidth: 3,
          borderColor: bgColor,
          hoverOffset: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '64%',
      animation: { duration: 400 },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: c => ` ${c.label}: ${c.parsed}%`
          }
        }
      }
    }
  });

  return chartInstance;
}

export function updateBudgetChart(tierPct) {
  if (chartInstance) {
    chartInstance.data.datasets[0].data = tierPct;
    chartInstance.update('none');
  }
}

export function updateChartBorderColor() {
  if (!chartInstance) return;
  const bgColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-bg-tertiary')
    .trim() || '#fff';
  chartInstance.data.datasets[0].borderColor = bgColor;
  chartInstance.update('none');
}
