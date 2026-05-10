// URL state encoding/decoding
export function encodeState(state, defaults) {
  const params = new URLSearchParams();

  // City ID (if not default)
  if (state.cityId && state.cityId !== 'shanghai') {
    params.set('c', state.cityId);
  }

  // Slider value (required)
  params.set('a', state.sliderValue);

  // Household model (if not default)
  const defaultHouseholdModel = defaults.params.defaultHouseholdModel || '2a1c';
  if (state.householdModel && state.householdModel !== defaultHouseholdModel) {
    params.set('hm', state.householdModel);
  }

  // Custom parameters (only if different from default)
  const paramKeys = ['withdrawalRate', 'taxRate', 'fxUsdCny', 'annualReturnRate', 'inflationRate'];
  const paramShortcuts = {
    withdrawalRate: 'wr',
    taxRate: 'tx',
    fxUsdCny: 'fx',
    annualReturnRate: 'rr',
    inflationRate: 'inf'
  };

  paramKeys.forEach(key => {
    const defaultVal = defaults.params[key];
    const currentVal = state.params[key];
    if (Math.abs(currentVal - defaultVal) > 0.0001) {
      const shortKey = paramShortcuts[key];
      params.set(shortKey, currentVal.toFixed(key === 'fxUsdCny' ? 2 : 3));
    }
  });

  return params.toString();
}

export function decodeState(searchString, defaults) {
  const params = new URLSearchParams(searchString);

  const state = {
    sliderValue: 35, // default
    householdModel: defaults.params.defaultHouseholdModel || '2a1c',
    params: { ...defaults.params }
  };

  // Slider value (also support legacy 'v' param)
  const aVal = params.get('a') || params.get('v');
  if (aVal !== null) {
    const aNum = parseInt(aVal, 10);
    if (!isNaN(aNum) && aNum >= 0 && aNum <= 100) {
      state.sliderValue = aNum;
    }
  }

  // Household model
  const hmVal = params.get('hm');
  if (hmVal) {
    state.householdModel = hmVal;
  }

  // Custom parameters
  const paramShortcuts = {
    wr: 'withdrawalRate',
    tx: 'taxRate',
    fx: 'fxUsdCny',
    rr: 'annualReturnRate',
    inf: 'inflationRate'
  };

  Object.entries(paramShortcuts).forEach(([shortKey, fullKey]) => {
    const val = params.get(shortKey);
    if (val !== null) {
      const numVal = parseFloat(val);
      if (!isNaN(numVal)) {
        state.params[fullKey] = numVal;
      }
    }
  });

  return state;
}

export function syncToUrl(state, defaults) {
  try {
    const url = new URL(location.href);
    const newParams = encodeState(state, defaults);
    url.search = newParams;
    history.replaceState(null, '', url);
  } catch (_) {}
}
