import { getState, setState, subscribe, subscribeKeys } from './state.js';
import { loadAllData } from './data-loader.js';
import { sliderToAssets, formatUSD, formatNumber, roundToReadable } from './calc/assets.js';
import { computeMonthlyIncome } from './calc/income.js';
import { matchTier } from './calc/tier.js';
import { calculateBudgetAllocation } from './calc/budget.js';
import { fireNumber as computeFireNumber, yearsToFire, projectAssets, coastFireAmount, classifyFireTier } from './calc/fire.js';
import { initBudgetChart, updateBudgetChart, updateChartBorderColor } from './render/chart-budget.js';
import { renderParamPanel, updateParamBadge } from './render/param-panel.js';
import { renderFirePanel, updateFireOutputs } from './render/fire-panel.js';
import { initFireChart, updateFireChart } from './render/chart-fire.js';
import { renderCityComparison, renderCompareCitiesGrid } from './render/compare-cities.js';
import { decodeState, syncToUrl } from './url.js';

async function bootstrap() {
  try {
    // Diagnostic: show bootstrap is running
    const householdLoadingEl = document.getElementById('householdLoading');
    if (householdLoadingEl) {
      householdLoadingEl.textContent = '【JS运行中...】';
    }
    console.log('[Bootstrap] Starting...');

    // Load all data first
    const data = await loadAllData();

    // Mark JS as loaded after data is ready
    document.body.classList.remove('js-pending');
    document.body.classList.add('js');
    const defaultParams = data.defaults.params;
    const shanghaiTiers = data.cityData.shanghai.tiers;

    // Decode state from URL
    const urlState = decodeState(location.search, data.defaults);

    // Get city ID from URL or default to shanghai
    const urlParams = new URLSearchParams(location.search);
    const cityIdFromUrl = urlParams.get('c') || 'shanghai';
    const selectedCity = data.availableCities.find(c => c.id === cityIdFromUrl) || data.availableCities[0];
    const cityData = data.cityData[selectedCity.id];

    // Initialize state
    const fireDefaults = data.defaults.params;

    // Debug: Check if householdModels loaded
    console.log('[Data] Data loaded successfully');
    console.log('[Data] householdModels:', data.householdModels);
    console.log('[Data] householdModels length:', data.householdModels ? data.householdModels.length : 'undefined');

    // Update diagnostic
    if (householdLoadingEl) {
      householdLoadingEl.textContent = '【数据已加载】';
    }

    setState({
      cityId: selectedCity.id,
      cityData: cityData,
      cityTiers: cityData.tiers,
      categories: data.categories,
      householdModels: data.householdModels,
      householdModel: urlState.householdModel,
      sliderValue: urlState.sliderValue,
      params: { ...urlState.params },
      monthlyCNY: 0,
      activeTierIndex: 0,
      compareMode: false,
      selectedCities: ['shanghai'],
      fire: {
        pv: 1000000,
        pmt: 20000,
        r: fireDefaults.annualReturnRate,
        inflation: fireDefaults.inflationRate,
        currentAge: fireDefaults.currentAge,
        retireAge: fireDefaults.fireTargetAge,
        fireNumber: 0,
        yearsToFire: 0,
        coastFireAmount: 0,
        tier: null,
        projection: []
      }
    });

    // Get DOM elements
    const sliderEl = document.getElementById('sl');
    const assetDisplayEl = document.getElementById('aDisp');
    const annualUSDEl = document.getElementById('aUSD');
    const monthlyUSDEl = document.getElementById('mUSD');
    const monthlyCNYEl = document.getElementById('mCNY');
    const badgeEl = document.getElementById('badge');
    const descEl = document.getElementById('tdesc');
    const itemsEl = document.getElementById('titems');
    const legendEl = document.getElementById('leg');
    const chartCanvasEl = document.getElementById('bc');
    const paramPanelEl = document.getElementById('paramPanel');
    const fireSectionEl = document.getElementById('fireSection');
    const compareModeToggleBtn = document.getElementById('compareModeToggle');
    const compareCitiesSectionEl = document.getElementById('compareCitiesSection');
    const compareCitiesContainerEl = document.getElementById('compareCitiesContainer');
    const singleCityCalcEl = document.getElementById('singleCityCalc');
    const citySelectorEl = document.getElementById('citySelector');
    const tsBars = document.querySelectorAll('.tier-strip-bars .ts');
    const tsLabels = document.querySelectorAll('.tier-strip-labels > div');
    const copyBtn = document.getElementById('copyBtn');
    const copyTxt = document.getElementById('copyTxt');

    // Derive state on input changes
    function updateCalculations() {
      const state = getState();
      const assets = sliderToAssets(state.sliderValue);
      const income = computeMonthlyIncome(
        assets,
        state.params.withdrawalRate,
        state.params.taxRate,
        state.params.fxUsdCny
      );
      const tierIndex = matchTier(income.monthlyCNY, state.cityTiers, state.householdModel);

      setState({
        assets,
        monthlyCNY: income.monthlyCNY,
        activeTierIndex: tierIndex,
        annualUSD: income.annualUSD,
        monthlyUSD: income.monthlyUSD
      });
    }

    // Render metrics
    function renderMetrics() {
      const state = getState();
      assetDisplayEl.textContent = formatUSD(state.assets);
      annualUSDEl.textContent = '$' + formatNumber(state.annualUSD);
      monthlyUSDEl.textContent = '$' + formatNumber(state.monthlyUSD);
      monthlyCNYEl.textContent = '¥' + formatNumber(state.monthlyCNY);
    }

    // Render tier strip
    function renderTierStrip() {
      const state = getState();
      tsBars.forEach((el, i) => {
        el.style.opacity = i === state.activeTierIndex ? '1' : '0.2';
        el.style.height = i === state.activeTierIndex ? '9px' : '5px';
      });
      tsLabels.forEach((el, i) => {
        el.classList.toggle('is-active', i === state.activeTierIndex);
      });
    }

    // Render tier panel
    function renderTierPanel() {
      const state = getState();

      // Safety checks
      if (!state.cityTiers || !Array.isArray(state.cityTiers) || state.cityTiers.length === 0) {
        console.warn('[renderTierPanel] No city tiers loaded yet');
        return;
      }

      const tier = state.cityTiers[state.activeTierIndex];
      if (!tier) {
        console.warn('[renderTierPanel] No tier at index', state.activeTierIndex);
        return;
      }

      const variant = tier.variants ? tier.variants[state.householdModel] : null;

      if (!variant) {
        console.error(`No variant found for household model ${state.householdModel} in tier ${tier.id}`);
        return;
      }

      badgeEl.style.background = tier.badge.bg;
      badgeEl.style.color = tier.badge.fg;
      badgeEl.textContent = tier.name;

      // Update income range display
      const incomeRangeEl = document.getElementById('incomeRange');
      const minStr = '¥' + formatNumber(variant.incomeRange.min);
      const maxStr = variant.incomeRange.max ? '¥' + formatNumber(variant.incomeRange.max) : '¥' + formatNumber(variant.incomeRange.min) + '+';
      incomeRangeEl.textContent = minStr + '–' + maxStr + '/月';

      descEl.textContent = tier.description;
      const allocation = calculateBudgetAllocation({
        monthlyCNY: state.monthlyCNY,
        tiers: state.cityTiers,
        tierIndex: state.activeTierIndex,
        householdModel: state.householdModel,
        categories: state.categories
      });

      itemsEl.innerHTML = Object.entries(tier.items)
        .map(([catId, catData]) => {
          const budgetItem = allocation.itemsByCategory[catId];
          if (!budgetItem || budgetItem.amount <= 0) return '';
          const displaySpending = roundToReadable(budgetItem.amount);
          return `
            <div class="tier-item">
              <div class="tier-item-row">
                <span class="tier-item-cat">${catData.label}</span>
                <span class="tier-item-spending">¥${formatNumber(displaySpending)}/月</span>
              </div>
              <div class="tier-item-ex">${catData.examples.join(' &nbsp;·&nbsp; ')}</div>
            </div>
          `;
        })
        .join('');

      updateBudgetChart(allocation.percentages);
    }

    // Render legend
    function renderLegend() {
      const state = getState();
      legendEl.innerHTML = state.categories
        .map(
          cat =>
            `<span class="legend-item"><span class="legend-dot" style="background:${cat.color}"></span>${cat.label}</span>`
        )
        .join('');
    }

    // Define household model selector renderer BEFORE subscribe
    let renderHouseholdModelSelector = () => {
      console.log('[renderHouseholdModelSelector] Called');
      try {
        const state = getState();
        const el = document.getElementById('householdSelector');

        if (!el) {
          console.error('[Household] ✗ Element #householdSelector not found');
          return;
        }

        console.log('[Household] ✓ Element found, state.householdModels:', state.householdModels);

        if (!state.householdModels || state.householdModels.length === 0) {
          console.error('[Household] ✗ No household models in state');
          el.innerHTML = '<span style="color: #f00;">❌ 家庭模型加载失败</span>';
          return;
        }

        console.log('[Household] ✓ Found', state.householdModels.length, 'household models');

        try {
          let html = '<span style="font-size: 12px; color: var(--color-text-secondary); white-space: nowrap; margin-right: 6px;">家庭结构：</span>';

          state.householdModels.forEach(model => {
            const isActive = state.householdModel === model.id;
            html += `
              <button class="household-btn" data-model="${model.id}"
                      title="${model.description}"
                      style="padding: 6px 14px; border-radius: var(--border-radius-md);
                             background: ${isActive ? 'var(--color-accent)' : 'var(--color-bg-secondary)'};
                             color: ${isActive ? 'var(--color-bg)' : 'var(--color-text-primary)'};
                             border: 0.5px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border-tertiary)'};
                             font-size: 12px; font-weight: 500; cursor: pointer;
                             transition: all 0.15s ease;">
                ${model.label}
              </button>
            `;
          });

          el.innerHTML = html;
          console.log('[Household] Rendered household selector with', state.householdModels.length, 'models');

          // Add event listeners
          el.querySelectorAll('.household-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              const modelId = e.target.dataset.model;
              if (modelId) {
                setState({ householdModel: modelId });
                updateCalculations();
                scheduleUrlSync();
              }
            });
          });
        } catch (renderError) {
          console.error('[Household] Error rendering:', renderError);
          el.innerHTML = '<span style="color: #f00;">渲染失败: ' + renderError.message + '</span>';
        }
      } catch (error) {
        console.error('[Household] Initialization error:', error);
      }
    };

    // Subscribe to state changes — split by dirty keys to avoid full re-render on every setState

    // Metrics: only when income/asset values change
    subscribeKeys(['assets', 'annualUSD', 'monthlyUSD', 'monthlyCNY'], () => {
      try { renderMetrics(); } catch (e) { console.error('[Subscribe] renderMetrics:', e); }
    });

    // Tier strip: only when active tier changes
    subscribeKeys(['activeTierIndex'], () => {
      try { renderTierStrip(); } catch (e) { console.error('[Subscribe] renderTierStrip:', e); }
    });

    // Tier panel: when tier, household model, city, or income changes
    subscribeKeys(['activeTierIndex', 'householdModel', 'cityTiers', 'monthlyCNY', 'cityId'], () => {
      try { renderTierPanel(); } catch (e) { console.error('[Subscribe] renderTierPanel:', e); }
    });

    // Household selector: only when household model or available models change
    subscribeKeys(['householdModel', 'householdModels'], (state) => {
      try {
        if (renderHouseholdModelSelector && state.householdModels) {
          renderHouseholdModelSelector();
        }
      } catch (e) { console.error('[Subscribe] renderHouseholdModelSelector:', e); }
    });

    // Comparison grid: when compare mode, city selection, or income changes
    subscribeKeys(['compareMode', 'selectedCities', 'monthlyCNY', 'householdModel'], (state) => {
      try {
        if (state.compareMode && state.monthlyCNY) {
          renderCompareCitiesGrid(
            compareCitiesContainerEl,
            state.selectedCities.map(id => data.cityData[id]),
            state.monthlyCNY,
            formatNumber,
            state.householdModel
          );
        }
      } catch (e) { console.error('[Subscribe] renderCompareCitiesGrid:', e); }
    });

    // FIRE outputs: when income or FIRE state changes
    subscribeKeys(['monthlyCNY', 'params', 'fire'], (state) => {
      try {
        if (state.fire && state.monthlyCNY) {
          const annualExpenseCNY = state.monthlyCNY * 12;
          const fn = computeFireNumber(annualExpenseCNY, state.params.withdrawalRate);
          updateFireOutputs(fireSectionEl, {
            fireNumber: fn,
            yearsToFire: state.fire.yearsToFire,
            coastFireAmount: state.fire.coastFireAmount,
            tier: state.fire.tier
          }, formatNumber);
        }
      } catch (e) { console.error('[Subscribe] updateFireOutputs:', e); }
    });

    // Debounced URL sync
    let urlSyncTimeout;
    const scheduleUrlSync = () => {
      clearTimeout(urlSyncTimeout);
      urlSyncTimeout = setTimeout(() => {
        syncToUrl(getState(), data.defaults);
      }, 150);
    };

    // Slider event — rAF-throttled to avoid redundant frames
    let sliderRafId = null;
    if (sliderEl) {
      sliderEl.addEventListener('input', (e) => {
        const newValue = parseInt(e.target.value);
        if (sliderRafId) cancelAnimationFrame(sliderRafId);
        sliderRafId = requestAnimationFrame(() => {
          sliderRafId = null;
          setState({ sliderValue: newValue });
          updateCalculations();
          scheduleUrlSync();
        });
      });
    }

    // Parameter change handler
    const handleParamChange = (newParams) => {
      setState({ params: newParams });
      updateCalculations();
      scheduleUrlSync();
      updateParamBadge(paramPanelEl, data.defaults, newParams);
    };

    // Comparison mode handlers
    const handleCitySelect = (cityId) => {
      const state = getState();
      const newCities = [...state.selectedCities, cityId];
      setState({ selectedCities: newCities });
      if (compareCitiesContainerEl) {
        renderCityComparison(
          compareCitiesContainerEl,
          data.availableCities,
          newCities,
          handleCitySelect,
          handleCityDeselect
        );
        renderCompareCitiesGrid(
          compareCitiesContainerEl,
          newCities.map(id => data.cityData[id]),
          state.monthlyCNY,
          formatNumber,
          state.householdModel
        );
      }
    };

    const handleCityDeselect = (cityId) => {
      const state = getState();
      const newCities = state.selectedCities.filter(id => id !== cityId);
      setState({ selectedCities: newCities });
      renderCityComparison(
        compareCitiesContainerEl,
        data.availableCities,
        newCities,
        handleCitySelect,
        handleCityDeselect
      );
      if (newCities.length > 0) {
        renderCompareCitiesGrid(
          compareCitiesContainerEl,
          newCities.map(id => data.cityData[id]),
          state.monthlyCNY,
          formatNumber,
          state.householdModel
        );
      }
    };

    const toggleCompareMode = () => {
      const state = getState();
      const newCompareMode = !state.compareMode;
      setState({ compareMode: newCompareMode });

      if (newCompareMode) {
        singleCityCalcEl.style.display = 'none';
        citySelectorEl.style.display = 'none';
        compareCitiesSectionEl.style.display = 'block';
        compareModeToggleBtn.style.background = 'var(--color-accent)';
        compareModeToggleBtn.style.color = 'var(--color-bg)';
        compareModeToggleBtn.style.borderColor = 'var(--color-accent)';

        // Add slider to compare section
        const compareSection = compareCitiesSectionEl;
        const sliderHtml = `
          <div style="margin-bottom: var(--space-5);">
            <p class="section-label">可投资资产总额（美元）</p>
            <div class="slider-row" id="compareSlider">
              <input type="range" id="compareSliderInput" min="0" max="100" value="${state.sliderValue}" step="1" aria-label="可投资资产" style="flex: 1;">
              <span id="compareAssetDisp" class="asset-display" style="margin-left: var(--space-3);">$1.00M</span>
            </div>
          </div>
        `;
        compareSection.insertAdjacentHTML('afterbegin', sliderHtml);

        const compareSliderInput = compareSection.querySelector('#compareSliderInput');
        const compareAssetDisp = compareSection.querySelector('#compareAssetDisp');

        let compareRafId = null;
        compareSliderInput.addEventListener('input', (e) => {
          const newValue = parseInt(e.target.value);
          if (compareRafId) cancelAnimationFrame(compareRafId);
          compareRafId = requestAnimationFrame(() => {
            compareRafId = null;
            setState({ sliderValue: newValue });
            updateCalculations();
            compareAssetDisp.textContent = formatUSD(sliderToAssets(newValue));
            scheduleUrlSync();
          });
        });

        renderCityComparison(
          compareCitiesContainerEl,
          data.availableCities,
          state.selectedCities,
          handleCitySelect,
          handleCityDeselect
        );
        renderCompareCitiesGrid(
          compareCitiesContainerEl,
          state.selectedCities.map(id => data.cityData[id]),
          state.monthlyCNY,
          formatNumber,
          state.householdModel
        );
      } else {
        singleCityCalcEl.style.display = 'block';
        citySelectorEl.style.display = 'flex';
        compareCitiesSectionEl.style.display = 'none';
        compareModeToggleBtn.style.background = 'var(--color-bg-secondary)';
        compareModeToggleBtn.style.color = 'var(--color-text-primary)';
        compareModeToggleBtn.style.borderColor = 'var(--color-border-tertiary)';

        // Remove slider from compare section
        const compareSlider = compareCitiesSectionEl.querySelector('#compareSlider');
        if (compareSlider) compareSlider.remove();
      }
    };

    // FIRE parameter change handler
    const handleFireParamChange = (fireParams) => {
      const state = getState();
      const annualExpenseCNY = state.monthlyCNY * 12;

      const fn = computeFireNumber(annualExpenseCNY, state.params.withdrawalRate);
      const years = yearsToFire(
        fireParams.pv,
        fireParams.pmt * 12,
        fireParams.r,
        fn,
        fireParams.inflation
      );
      const projection = projectAssets(
        fireParams.pv,
        fireParams.pmt * 12,
        fireParams.r,
        years,
        fireParams.inflation
      );
      const coast = coastFireAmount(
        fn,
        fireParams.r,
        fireParams.retireAge - fireParams.currentAge,
        fireParams.inflation
      );
      const tier = classifyFireTier(annualExpenseCNY, data.fireTiers);

      setState({
        fire: {
          ...fireParams,
          fireNumber: fn,
          yearsToFire: years,
          projection,
          coastFireAmount: coast,
          tier
        }
      });

      scheduleUrlSync();
      updateFireOutputs(fireSectionEl, {
        fireNumber: fn,
        yearsToFire: years,
        coastFireAmount: coast,
        tier
      }, formatNumber);
      updateFireChart(projection, fn);
    };

    // Comparison mode toggle
    if (compareModeToggleBtn) {
      compareModeToggleBtn.addEventListener('click', toggleCompareMode);
    }

    // Copy button
    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(location.href);
        copyTxt.textContent = '已复制';
        copyBtn.classList.add('is-copied');
        setTimeout(() => {
          copyTxt.textContent = '复制链接';
          copyBtn.classList.remove('is-copied');
        }, 1500);
      } catch (_) {
        // Fallback
        const input = document.createElement('input');
        input.value = location.href;
        document.body.appendChild(input);
        input.select();
        try {
          document.execCommand('copy');
          copyTxt.textContent = '已复制';
          copyBtn.classList.add('is-copied');
        } catch (_) {}
        document.body.removeChild(input);
        setTimeout(() => {
          copyTxt.textContent = '复制链接';
          copyBtn.classList.remove('is-copied');
        }, 1500);
      }
      });
    }

    // Update slider to match state
    if (sliderEl) {
      sliderEl.value = getState().sliderValue;
    }

    // Render city selector
    const renderCitySelector = () => {
      const state = getState();
      const groupedCities = {};

      data.availableCities.forEach(city => {
        if (!groupedCities[city.country]) {
          groupedCities[city.country] = [];
        }
        groupedCities[city.country].push(city);
      });

      const countryOrder = ['中国', '中国香港', '日本', '泰国', '美国', '越南', '英国', '法国'];
      const sortedCountries = Object.keys(groupedCities).sort((a, b) => {
        const aIndex = countryOrder.indexOf(a);
        const bIndex = countryOrder.indexOf(b);
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      });

      let html = '<div style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center;">';

      sortedCountries.forEach((country, countryIdx) => {
        const cities = groupedCities[country];

        if (countryIdx > 0) {
          html += '<div style="width: 1px; height: 24px; background: var(--color-border-tertiary); margin: 0 2px;"></div>';
        }

        cities.forEach(city => {
          const isActive = state.cityId === city.id;
          const incompleteMark = city.incomplete ? ' <span class="data-incomplete-badge" title="数据待核对，仅供参考">待核</span>' : '';
          html += `
            <button class="city-btn" data-city="${city.id}"
                    title="${country}"
                    style="padding: 6px 14px; border-radius: var(--border-radius-md);
                           background: ${isActive ? 'var(--color-accent)' : 'var(--color-bg-secondary)'};
                           color: ${isActive ? 'var(--color-bg)' : 'var(--color-text-primary)'};
                           border: 0.5px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border-tertiary)'};
                           font-size: 13px; font-weight: 500; cursor: pointer;
                           transition: all 0.15s ease;">
              ${city.name}${incompleteMark}
            </button>
          `;
        });
      });

      html += '</div>';
      citySelectorEl.innerHTML = html;

      citySelectorEl.querySelectorAll('.city-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const cityId = e.target.dataset.city;
          const city = data.cityData[cityId];
          if (city) {
            setState({
              cityId,
              cityData: city,
              cityTiers: city.tiers
            });
            renderCitySelector();
            updateCalculations();
            scheduleUrlSync();
          }
        });
      });
    };

    // Initialize city selector
    renderCitySelector();

    // Initialize household model selector (function defined earlier before subscribe)
    console.log('[Init] About to initialize household selector');
    const householdSelectorEl = document.getElementById('householdSelector');
    console.log('[Init] householdSelectorEl:', householdSelectorEl);
    if (householdSelectorEl) {
      console.log('[Init] Calling renderHouseholdModelSelector()');
      const currentState = getState();
      console.log('[Init] Current state.householdModels:', currentState.householdModels);
      console.log('[Init] Current state.householdModel:', currentState.householdModel);
      renderHouseholdModelSelector();
      console.log('[Household] Initial render completed');
    } else {
      console.warn('[Household] householdSelector element not found at initialization');
    }

    // Render parameter panel
    renderParamPanel(paramPanelEl, data.defaults, getState().params, handleParamChange);

    // Initialize FIRE section
    const state = getState();
    renderFirePanel(fireSectionEl, state.fire, handleFireParamChange);
    const fireChartCanvasEl = fireSectionEl.querySelector('#fireChart');
    if (fireChartCanvasEl) {
      initFireChart(fireChartCanvasEl, state.fire.projection, state.fire.fireNumber);
    }

    // Initialize chart
    if (chartCanvasEl) {
      const state = getState();
      const defaultVariant = shanghaiTiers[1].variants[state.householdModel] || shanghaiTiers[1].variants['2a1c'];
      initBudgetChart(chartCanvasEl, data.categories, defaultVariant.pct);
    }

    // Dark mode listener
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        updateChartBorderColor();
      });
    }

    // Initial render
    if (legendEl) {
      renderLegend();
    }
    updateCalculations();

    // Final safety: ensure household selector is rendered
    console.log('[Bootstrap] Final initialization: calling renderHouseholdModelSelector one more time');
    const finalState = getState();
    console.log('[Bootstrap] Final state - householdModels:', finalState.householdModels ? finalState.householdModels.length + ' models' : 'undefined');
    console.log('[Bootstrap] Final state - householdModel:', finalState.householdModel);
    if (typeof renderHouseholdModelSelector === 'function') {
      console.log('[Bootstrap] Calling renderHouseholdModelSelector...');
      renderHouseholdModelSelector();
    } else {
      console.error('[Bootstrap] renderHouseholdModelSelector is not a function!');
    }

  } catch (error) {
    console.error('Failed to bootstrap application:', error);
    document.body.classList.add('js-error');
    const banner = document.getElementById('errBanner');
    if (banner) {
      banner.textContent = '⚠️ 数据加载失败，请刷新页面重试。';
      banner.classList.add('is-visible');
    }
  }
}

bootstrap();
