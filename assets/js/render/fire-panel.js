// FIRE panel renderer
export function renderFirePanel(containerEl, fireOutputs, onFireParamChange) {
  if (containerEl.dataset.built === 'true') return;
  containerEl.dataset.built = 'true';

  containerEl.innerHTML = `
    <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 var(--space-4); color: var(--color-text-primary);">FIRE 计算器</h2>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-5); margin-bottom: var(--space-6);">
      <div>
        <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: var(--space-2); color: var(--color-text-primary);">
          当前资产 (CNY)
        </label>
        <input
          type="number"
          id="firePv"
          value="${Math.round(fireOutputs.pv || 1000000)}"
          style="width: 100%; padding: 8px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border); font-size: 14px; font-family: monospace;"
        >
      </div>

      <div>
        <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: var(--space-2); color: var(--color-text-primary);">
          每月储蓄 (CNY)
        </label>
        <input
          type="number"
          id="firePmt"
          value="${Math.round(fireOutputs.pmt || 20000)}"
          style="width: 100%; padding: 8px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border); font-size: 14px; font-family: monospace;"
        >
      </div>

      <div>
        <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: var(--space-2); color: var(--color-text-primary);">
          年化投资收益率
        </label>
        <input
          type="number"
          id="fireR"
          value="${(fireOutputs.r || 0.07).toFixed(3)}"
          step="0.001"
          style="width: 100%; padding: 8px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border); font-size: 14px; font-family: monospace;"
        >
      </div>

      <div>
        <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: var(--space-2); color: var(--color-text-primary);">
          通胀率
        </label>
        <input
          type="number"
          id="fireInf"
          value="${(fireOutputs.inflation || 0.025).toFixed(3)}"
          step="0.001"
          style="width: 100%; padding: 8px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border); font-size: 14px; font-family: monospace;"
        >
      </div>

      <div>
        <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: var(--space-2); color: var(--color-text-primary);">
          当前年龄
        </label>
        <input
          type="number"
          id="fireAge"
          value="${fireOutputs.currentAge || 30}"
          style="width: 100%; padding: 8px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border); font-size: 14px; font-family: monospace;"
        >
      </div>

      <div>
        <label style="display: block; font-size: 13px; font-weight: 500; margin-bottom: var(--space-2); color: var(--color-text-primary);">
          目标退休年龄
        </label>
        <input
          type="number"
          id="fireRetire"
          value="${fireOutputs.retireAge || 50}"
          style="width: 100%; padding: 8px; border-radius: var(--border-radius-md); border: 0.5px solid var(--color-border); font-size: 14px; font-family: monospace;"
        >
      </div>
    </div>

    <div id="fireOutputs" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-4); margin-bottom: var(--space-6);">
      <div style="background: var(--color-bg-secondary); padding: var(--space-4); border-radius: var(--border-radius-md);">
        <p style="font-size: 11px; color: var(--color-text-tertiary); margin: 0 0 var(--space-1); text-transform: uppercase; letter-spacing: 0.02em;">FIRE 目标资产</p>
        <p id="fireNumber" style="font-size: 18px; font-weight: 600; margin: 0; color: var(--color-text-primary);">—</p>
      </div>

      <div style="background: var(--color-bg-secondary); padding: var(--space-4); border-radius: var(--border-radius-md);">
        <p style="font-size: 11px; color: var(--color-text-tertiary); margin: 0 0 var(--space-1); text-transform: uppercase; letter-spacing: 0.02em;">达成年限</p>
        <p id="fireYears" style="font-size: 18px; font-weight: 600; margin: 0; color: var(--color-text-primary);">—</p>
      </div>

      <div style="background: var(--color-bg-secondary); padding: var(--space-4); border-radius: var(--border-radius-md);">
        <p style="font-size: 11px; color: var(--color-text-tertiary); margin: 0 0 var(--space-1); text-transform: uppercase; letter-spacing: 0.02em;">Coast FIRE 金额</p>
        <p id="fireCoast" style="font-size: 18px; font-weight: 600; margin: 0; color: var(--color-text-primary);">—</p>
      </div>

      <div style="background: var(--color-bg-secondary); padding: var(--space-4); border-radius: var(--border-radius-md);">
        <p style="font-size: 11px; color: var(--color-text-tertiary); margin: 0 0 var(--space-1); text-transform: uppercase; letter-spacing: 0.02em;">FIRE 分级</p>
        <p id="fireTier" style="font-size: 18px; font-weight: 600; margin: 0; color: var(--color-text-primary);">—</p>
      </div>
    </div>

    <div style="position: relative; width: 100%; height: 300px; margin-bottom: var(--space-6);">
      <canvas id="fireChart" role="img" aria-label="资产增长时间线"></canvas>
    </div>
  `;

  // Set up input listeners
  const inputs = {
    pv: containerEl.querySelector('#firePv'),
    pmt: containerEl.querySelector('#firePmt'),
    r: containerEl.querySelector('#fireR'),
    inflation: containerEl.querySelector('#fireInf'),
    currentAge: containerEl.querySelector('#fireAge'),
    retireAge: containerEl.querySelector('#fireRetire')
  };

  const handleChange = () => {
    const newParams = {
      pv: parseFloat(inputs.pv.value) || 0,
      pmt: parseFloat(inputs.pmt.value) || 0,
      r: parseFloat(inputs.r.value) || 0,
      inflation: parseFloat(inputs.inflation.value) || 0,
      currentAge: parseInt(inputs.currentAge.value) || 30,
      retireAge: parseInt(inputs.retireAge.value) || 50
    };
    onFireParamChange(newParams);
  };

  Object.values(inputs).forEach(input => {
    if (input) {
      input.addEventListener('change', handleChange);
      input.addEventListener('input', handleChange);
    }
  });
}

export function updateFireOutputs(containerEl, outputs, formatNumber) {
  const fireNumberEl = containerEl.querySelector('#fireNumber');
  const fireYearsEl = containerEl.querySelector('#fireYears');
  const fireCoastEl = containerEl.querySelector('#fireCoast');
  const fireTierEl = containerEl.querySelector('#fireTier');

  if (fireNumberEl) {
    fireNumberEl.textContent = outputs.fireNumber
      ? `¥${formatNumber(outputs.fireNumber)}`
      : '—';
  }

  if (fireYearsEl) {
    fireYearsEl.textContent = outputs.yearsToFire
      ? `${outputs.yearsToFire.toFixed(1)} 年`
      : '—';
  }

  if (fireCoastEl) {
    fireCoastEl.textContent = outputs.coastFireAmount
      ? `¥${formatNumber(outputs.coastFireAmount)}`
      : '—';
  }

  if (fireTierEl) {
    fireTierEl.textContent = outputs.tier ? outputs.tier.name : '—';
  }
}
