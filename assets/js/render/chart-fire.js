// FIRE projection chart renderer
let fireChartInstance = null;

export function initFireChart(containerEl, projection, fireNumber) {
  if (typeof window.Chart === 'undefined') {
    console.warn('Chart.js not loaded');
    return null;
  }

  const ctx = containerEl.getContext('2d');
  const bgColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-bg-tertiary')
    .trim() || '#fff';
  const accentColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--color-accent')
    .trim() || '#000';

  const years = projection.map(p => p.year);
  const nominal = projection.map(p => p.nominal);
  const real = projection.map(p => p.real);

  fireChartInstance = new window.Chart(ctx, {
    type: 'line',
    data: {
      labels: years,
      datasets: [
        {
          label: '名义资产',
          data: nominal,
          borderColor: accentColor,
          backgroundColor: `${accentColor}08`,
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 6
        },
        {
          label: '实际资产（考虑通胀）',
          data: real,
          borderColor: accentColor,
          borderDash: [5, 5],
          borderWidth: 2,
          fill: false,
          tension: 0.3,
          pointRadius: 0,
          pointHoverRadius: 6
        },
        {
          label: 'FIRE 目标',
          data: years.map(() => fireNumber),
          borderColor: '#ff6b6b',
          borderDash: [2, 2],
          borderWidth: 1.5,
          fill: false,
          pointRadius: 0,
          tension: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            font: { size: 11 },
            boxWidth: 12,
            padding: 10,
            usePointStyle: true
          }
        },
        tooltip: {
          backgroundColor: `${bgColor}dd`,
          titleColor: accentColor,
          bodyColor: accentColor,
          borderColor: accentColor,
          borderWidth: 0.5,
          padding: 8,
          titleFont: { size: 12, weight: '500' },
          bodyFont: { size: 11 },
          displayColors: true,
          callbacks: {
            label: ctx => {
              const value = Math.round(ctx.parsed.y);
              return `${ctx.dataset.label}: ¥${value.toLocaleString('en-US')}`;
            }
          }
        }
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: '年份',
            font: { size: 11 }
          },
          ticks: {
            font: { size: 10 }
          }
        },
        y: {
          beginAtZero: true,
          display: true,
          title: {
            display: true,
            text: '资产 (CNY)',
            font: { size: 11 }
          },
          ticks: {
            font: { size: 10 },
            callback: value => `¥${(value / 1000000).toFixed(0)}M`
          }
        }
      }
    }
  });

  return fireChartInstance;
}

export function updateFireChart(projection, fireNumber) {
  if (!fireChartInstance) return;

  const years = projection.map(p => p.year);
  const nominal = projection.map(p => p.nominal);
  const real = projection.map(p => p.real);

  fireChartInstance.data.labels = years;
  fireChartInstance.data.datasets[0].data = nominal;
  fireChartInstance.data.datasets[1].data = real;
  fireChartInstance.data.datasets[2].data = years.map(() => fireNumber);
  fireChartInstance.update('none');
}
