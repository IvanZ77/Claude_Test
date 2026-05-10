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

    const textColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-text-primary')
      .trim() || '#000';
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-bg')
      .trim() || '#fff';
    const borderColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-border-tertiary')
      .trim() || '#ddd';

    ctx.save();

    const dataset = data.datasets[0];
    const total = dataset.data.reduce((a, b) => a + b, 0);
    let currentAngle = -Math.PI / 2;

    // Collect all label data
    const labels = [];
    data.labels.forEach((label, i) => {
      const value = dataset.data[i];
      const sliceAngle = (value / total) * 2 * Math.PI;
      const labelAngle = currentAngle + sliceAngle / 2;
      const percentage = Math.round((value / total) * 100);

      labels.push({
        label,
        percentage,
        angle: labelAngle,
        index: i
      });

      currentAngle += sliceAngle;
    });

    // Separate labels into left and right groups
    const leftLabels = labels.filter(l => Math.cos(l.angle) < 0);
    const rightLabels = labels.filter(l => Math.cos(l.angle) >= 0);

    // Sort each group by angle (top to bottom for left, bottom to top for right)
    leftLabels.sort((a, b) => a.angle - b.angle);
    rightLabels.sort((a, b) => b.angle - a.angle);

    const labelHeight = 18;
    const lineLength = 40;
    const gapFromPie = 12;

    // Calculate positions for left side labels
    const leftStart = centerY - (leftLabels.length * labelHeight) / 2;
    leftLabels.forEach((item, idx) => {
      const labelAngle = item.angle;
      const lineStartX = centerX + Math.cos(labelAngle) * (outerRadius + 2);
      const lineStartY = centerY + Math.sin(labelAngle) * (outerRadius + 2);

      const labelY = leftStart + idx * labelHeight + labelHeight / 2;
      const lineEndX = centerX - lineLength - gapFromPie;
      const lineEndY = labelY;

      item.lineStartX = lineStartX;
      item.lineStartY = lineStartY;
      item.lineEndX = lineEndX;
      item.lineEndY = lineEndY;
      item.labelY = labelY;
      item.side = 'left';
    });

    // Calculate positions for right side labels
    const rightStart = centerY - (rightLabels.length * labelHeight) / 2;
    rightLabels.forEach((item, idx) => {
      const labelAngle = item.angle;
      const lineStartX = centerX + Math.cos(labelAngle) * (outerRadius + 2);
      const lineStartY = centerY + Math.sin(labelAngle) * (outerRadius + 2);

      const labelY = rightStart + idx * labelHeight + labelHeight / 2;
      const lineEndX = centerX + lineLength + gapFromPie;
      const lineEndY = labelY;

      item.lineStartX = lineStartX;
      item.lineStartY = lineStartY;
      item.lineEndX = lineEndX;
      item.lineEndY = lineEndY;
      item.labelY = labelY;
      item.side = 'right';
    });

    // Draw all lines and labels
    const allLabels = [...leftLabels, ...rightLabels];

    allLabels.forEach(item => {
      // Draw connecting line (straight line from pie to label area)
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(item.lineStartX, item.lineStartY);
      ctx.lineTo(item.lineEndX, item.lineEndY);
      ctx.stroke();

      // Draw label text with background
      const labelText = `${item.label} ${item.percentage}%`;

      ctx.font = '12px var(--font-sans, -apple-system, sans-serif)';
      const metrics = ctx.measureText(labelText);
      const textWidth = metrics.width;

      let bgX, bgY;
      if (item.side === 'left') {
        bgX = item.lineEndX - textWidth - 8;
        bgY = item.labelY - 7;
      } else {
        bgX = item.lineEndX + 4;
        bgY = item.labelY - 7;
      }

      // Draw background rectangle for better readability
      ctx.fillStyle = bgColor;
      ctx.fillRect(bgX - 2, bgY, textWidth + 4, 14);

      // Optional: draw border around label
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bgX - 2, bgY, textWidth + 4, 14);

      // Draw text
      ctx.font = '12px var(--font-sans, -apple-system, sans-serif)';
      ctx.fillStyle = textColor;
      ctx.textBaseline = 'top';
      ctx.textAlign = item.side === 'left' ? 'right' : 'left';

      const textX = item.side === 'left' ? item.lineEndX - 4 : item.lineEndX + 4;
      ctx.fillText(labelText, textX, item.labelY - 6);
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
