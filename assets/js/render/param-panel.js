// Parameter panel renderer
export function renderParamPanel(containerEl, defaults, params, onParamChange) {
  const ranges = defaults.ranges;

  containerEl.innerHTML = `
    <div style="padding-top: var(--space-4); border-top: 1px solid var(--color-border-tertiary);">
      <div style="display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-4);">
        <h3 style="margin: 0; font-size: 14px; font-weight: 600; color: var(--color-text-primary);">⚙️ 参数调整</h3>
        <div id="paramBadge" style="display: none; font-size: 11px; background: #4F46E5; color: white; padding: 4px 10px; border-radius: var(--border-radius-sm); font-weight: 500;">
          ⚡ 已自定义
        </div>
      </div>
      <div style="display: grid; grid-template-columns: 1fr; gap: var(--space-4);">
        ${renderParamRow('withdrawalRate', '4% 规则提取率', params.withdrawalRate, ranges.withdrawalRate, defaults.params.withdrawalRate, onParamChange)}
        ${renderParamRow('taxRate', '美国投资税率', params.taxRate, ranges.taxRate, defaults.params.taxRate, onParamChange)}
        ${renderParamRow('fxUsdCny', '美元兑人民币汇率', params.fxUsdCny, ranges.fxUsdCny, defaults.params.fxUsdCny, onParamChange)}
        ${renderParamRow('annualReturnRate', '年化投资收益率', params.annualReturnRate, ranges.annualReturnRate, defaults.params.annualReturnRate, onParamChange)}
        ${renderParamRow('inflationRate', '年化通胀率', params.inflationRate, ranges.inflationRate, defaults.params.inflationRate, onParamChange)}
      </div>
      <button id="paramReset" type="button" style="
        width: 100%;
        margin-top: var(--space-4);
        padding: 10px 16px;
        border-radius: var(--border-radius-md);
        background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
        color: var(--color-text-primary);
        border: 1px solid var(--color-border-tertiary);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
      ">
        ↺ 重置为默认值
      </button>
    </div>
  `;

  // Set up event listeners
  const resetBtn = containerEl.querySelector('#paramReset');
  const paramInputs = containerEl.querySelectorAll('[data-param]');

  resetBtn.addEventListener('click', () => {
    const newParams = { ...defaults.params };
    paramInputs.forEach(input => {
      const paramKey = input.dataset.param;
      const newValue = defaults.params[paramKey];
      const isPercentage = ['withdrawalRate', 'taxRate', 'annualReturnRate', 'inflationRate'].includes(paramKey);

      if (input.type === 'range') {
        input.value = newValue;
      } else {
        const displayValue = isPercentage ? (newValue * 100).toFixed(1) : newValue.toFixed(paramKey === 'fxUsdCny' ? 2 : 3);
        input.value = displayValue;
      }
    });
    onParamChange(newParams);
    updateParamBadge(containerEl, defaults, newParams);
  });

  // Track which inputs are range vs number for syncing
  const paramGroups = {};
  paramInputs.forEach(input => {
    const paramKey = input.dataset.param;
    if (!paramGroups[paramKey]) {
      paramGroups[paramKey] = { range: null, number: null };
    }
    if (input.type === 'range') {
      paramGroups[paramKey].range = input;
    } else {
      paramGroups[paramKey].number = input;
    }
  });

  // Set up listeners for range and number inputs
  Object.entries(paramGroups).forEach(([paramKey, { range, number }]) => {
    const isPercentage = ['withdrawalRate', 'taxRate', 'annualReturnRate', 'inflationRate'].includes(paramKey);

    const syncValue = (newValue, fromPercentage = false) => {
      let numValue = parseFloat(newValue);
      // Convert from percentage if needed
      if (fromPercentage && isPercentage) {
        numValue = numValue / 100;
      }

      if (range) range.value = numValue;
      if (number) {
        const displayValue = isPercentage ? (numValue * 100).toFixed(1) : numValue.toFixed(paramKey === 'fxUsdCny' ? 2 : 3);
        number.value = displayValue;
      }
      const newParams = { ...params, [paramKey]: numValue };
      onParamChange(newParams);
      updateParamBadge(containerEl, defaults, newParams);
    };

    if (range) {
      range.addEventListener('input', (e) => syncValue(e.target.value, false));
    }
    if (number) {
      number.addEventListener('change', (e) => syncValue(e.target.value, true));
    }
  });

  updateParamBadge(containerEl, defaults, params);
}

function renderParamRow(paramKey, label, value, range, defaultValue, onParamChange) {
  // Determine display format
  const isPercentage = ['withdrawalRate', 'taxRate', 'annualReturnRate', 'inflationRate'].includes(paramKey);
  const displayValue = isPercentage ? (value * 100).toFixed(1) : value.toFixed(paramKey === 'fxUsdCny' ? 2 : 3);
  const displaySuffix = isPercentage ? '%' : (paramKey === 'fxUsdCny' ? '' : '');
  const isCustom = Math.abs(value - defaultValue) > 0.0001;

  return `
    <div style="display: grid; grid-template-columns: 120px 1fr 100px 80px; gap: var(--space-3); align-items: center;">
      <label style="font-size: 13px; font-weight: 500; color: var(--color-text-primary);">${label}</label>
      <div style="position: relative;">
        <input
          type="range"
          data-param="${paramKey}"
          data-range-input="true"
          min="${range.min}"
          max="${range.max}"
          step="${range.step}"
          value="${value}"
          style="width: 100%; cursor: pointer;"
        >
      </div>
      <input
        type="number"
        data-param="${paramKey}"
        min="${range.min}"
        max="${range.max}"
        step="${range.step}"
        value="${displayValue}"
        style="padding: 6px; border-radius: var(--border-radius-sm); border: 0.5px solid var(--color-border); font-size: 12px; font-family: monospace;"
      >
      <span style="font-size: 12px; color: var(--color-text-secondary); font-weight: 500; text-align: right;">${displayValue}${displaySuffix}</span>
    </div>
  `;
}

export function updateParamBadge(containerEl, defaults, params) {
  const badge = containerEl.querySelector('#paramBadge');
  const isCustomized = Object.entries(defaults.params).some(
    ([key, defaultValue]) => Math.abs(params[key] - defaultValue) > 0.0001
  );
  badge.style.display = isCustomized ? 'inline-block' : 'none';
}
