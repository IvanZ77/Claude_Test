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
    const lineStartRadius = outerRadius + 8;
    const lineEndDistance = outerRadius + 35;

    const textColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-text-primary')
      .trim() || '#000';

    ctx.save();

    const dataset = data.datasets[0];
    const total = dataset.data.reduce((a, b) => a + b, 0);
    let currentAngle = -Math.PI / 2;

    const labels = [];

    // First pass: collect all label data
    data.labels.forEach((label, i) => {
      const value = dataset.data[i];
      const sliceAngle = (value / total) * 2 * Math.PI;
      const labelAngle = currentAngle + sliceAngle / 2;

      const percentage = Math.round((value / total) * 100);

      // Calculate line start point (at pie edge)
      const lineStartX = centerX + Math.cos(labelAngle) * lineStartRadius;
      const lineStartY = centerY + Math.sin(labelAngle) * lineStartRadius;

      // Calculate line end point and label position
      const lineEndX = centerX + Math.cos(labelAngle) * lineEndDistance;
      const lineEndY = centerY + Math.sin(labelAngle) * lineEndDistance;

      labels.push({
        label,
        percentage,
        angle: labelAngle,
        lineStartX,
        lineStartY,
        lineEndX,
        lineEndY
      });

      currentAngle += sliceAngle;
    });

    // Second pass: draw lines and labels
    labels.forEach(item => {
      // Draw line
      ctx.strokeStyle = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-border-tertiary')
        .trim() || '#ccc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(item.lineStartX, item.lineStartY);
      ctx.lineTo(item.lineEndX, item.lineEndY);
      ctx.stroke();

      // Draw label text
      const labelText = `${item.label} ${item.percentage}%`;
      const isRightSide = Math.cos(item.angle) > 0;

      ctx.font = '12px var(--font-sans, -apple-system, sans-serif)';
      ctx.fillStyle = textColor;
      ctx.textBaseline = 'middle';
      ctx.textAlign = isRightSide ? 'left' : 'right';

      // Add small gap after line
      const textX = isRightSide ? item.lineEndX + 4 : item.lineEndX - 4;
      ctx.fillText(labelText, textX, item.lineEndY);
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
