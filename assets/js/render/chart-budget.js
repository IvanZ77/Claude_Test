// Budget chart renderer
let chartInstance = null;

const chartLabelsPlugin = {
  id: 'chartLabels',
  afterDatasetsDraw(chart) {
    const { ctx, data, chartArea: { left, top, width, height } } = chart;
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    const radius = Math.min(width, height) / 2;
    const cutoutPercentage = 0.64;
    const outerRadius = radius;
    const innerRadius = radius * cutoutPercentage;
    const midRadius = (outerRadius + innerRadius) / 2;

    ctx.save();
    ctx.font = 'bold 12px var(--font-sans, -apple-system, sans-serif)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-text-primary')
      .trim() || '#000';

    const dataset = data.datasets[0];
    const total = dataset.data.reduce((a, b) => a + b, 0);
    let currentAngle = -Math.PI / 2;

    data.labels.forEach((label, i) => {
      const value = dataset.data[i];
      const sliceAngle = (value / total) * 2 * Math.PI;
      const labelAngle = currentAngle + sliceAngle / 2;

      const labelX = centerX + Math.cos(labelAngle) * midRadius;
      const labelY = centerY + Math.sin(labelAngle) * midRadius;

      const percentage = Math.round((value / total) * 100);
      ctx.fillText(`${label} ${percentage}%`, labelX, labelY);

      currentAngle += sliceAngle;
    });

    ctx.restore();
  }
};

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
    },
    plugins: [chartLabelsPlugin]
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
