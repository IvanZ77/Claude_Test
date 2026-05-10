import { getState, setState, subscribe } from './state.js';
import { loadAllData } from './data-loader.js';
import { sliderToAssets, formatUSD, formatNumber } from './calc/assets.js';
import { computeMonthlyIncome } from './calc/income.js';
import { matchTier } from './calc/tier.js';
import { fireNumber as computeFireNumber, yearsToFire, projectAssets, coastFireAmount, classifyFireTier } from './calc/fire.js';
import { renderCompareTiers } from './render/compare-tiers.js';
import { initBudgetChart, updateBudgetChart, updateChartBorderColor } from './render/chart-budget.js';
import { renderParamPanel, updateParamBadge } from './render/param-panel.js';
import { renderFirePanel, updateFireOutputs } from './render/fire-panel.js';
import { initFireChart, updateFireChart } from './render/chart-fire.js';
import { renderCityComparison, renderCompareCitiesGrid } from './render/compare-cities.js';
import { decodeState, syncToUrl } from './url.js';

async function bootstrap() {
  try {
    // Mark JS as loaded
    document.body.classList.remove('js-pending');
    document.body.classList.add('js');

    // Load all data
    const data = await loadAllData();
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
    setState({
      cityId: selectedCity.id,
      cityData: cityData,
      cityTiers: cityData.tiers,
      categories: data.categories,
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
    const compareGridEl = document.getElementById('compareGrid');
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
      const tierIndex = matchTier(income.monthlyCNY, state.cityTiers);

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
      const tier = state.cityTiers[state.activeTierIndex];

      badgeEl.style.background = tier.badge.bg;
      badgeEl.style.color = tier.badge.fg;
      badgeEl.textContent = tier.name;

      // Update income range display
      const incomeRangeEl = document.getElementById('incomeRange');
      const minStr = '¥' + formatNumber(tier.incomeRange.min);
      const maxStr = tier.incomeRange.max ? '¥' + formatNumber(tier.incomeRange.max) : '¥' + formatNumber(tier.incomeRange.min) + '+';
      incomeRangeEl.textContent = minStr + '–' + maxStr + '/月';

      descEl.textContent = tier.description;

      itemsEl.innerHTML = Object.entries(tier.items)
        .map(([catId, catData]) => {
          return `
            <div class="tier-item">
              <div class="tier-item-row">
                <span class="tier-item-cat">${catData.label}</span>
              </div>
              <div class="tier-item-ex">${catData.examples.join(' &nbsp;·&nbsp; ')}</div>
            </div>
          `;
        })
        .join('');

      updateBudgetChart(tier.pct);
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

    // Subscribe to state changes
    subscribe((state) => {
      renderMetrics();
      renderTierStrip();
      renderTierPanel();

      // Update comparison grid when monthly CNY changes
      if (state.compareMode && state.monthlyCNY) {
        renderCompareCitiesGrid(
          compareCitiesContainerEl,
          state.selectedCities.map(id => data.cityData[id]),
          state.monthlyCNY,
          formatNumber
        );
      }

      // Update FIRE outputs when monthly CNY changes
      if (state.fire && state.monthlyCNY) {
        const annualExpenseCNY = state.monthlyCNY * 12;
        const fn = computeFireNumber(annualExpenseCNY, state.params.withdrawalRate);
        const updatedFire = { ...state.fire, fireNumber: fn };
        updateFireOutputs(fireSectionEl, {
          fireNumber: fn,
          yearsToFire: state.fire.yearsToFire,
          coastFireAmount: state.fire.coastFireAmount,
          tier: state.fire.tier
        }, formatNumber);
      }
    });

    // Debounced URL sync
    let urlSyncTimeout;
    const scheduleUrlSync = () => {
      clearTimeout(urlSyncTimeout);
      urlSyncTimeout = setTimeout(() => {
        syncToUrl(getState(), data.defaults);
      }, 150);
    };

    // Slider event
    sliderEl.addEventListener('input', (e) => {
      const newValue = parseInt(e.target.value);
      setState({ sliderValue: newValue });
      updateCalculations();
      scheduleUrlSync();
    });

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
        formatNumber
      );
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
          formatNumber
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

        compareSliderInput.addEventListener('input', (e) => {
          const newValue = parseInt(e.target.value);
          setState({ sliderValue: newValue });
          updateCalculations();
          compareAssetDisp.textContent = formatUSD(sliderToAssets(newValue));
          scheduleUrlSync();
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
          formatNumber
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
    compareModeToggleBtn.addEventListener('click', toggleCompareMode);

    // Copy button
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

    // Update slider to match state
    sliderEl.value = getState().sliderValue;

    // Render city selector
    const renderCitySelector = () => {
      const state = getState();
      citySelectorEl.innerHTML = data.availableCities
        .map(city => {
          const isActive = state.cityId === city.id;
          return `
            <button class="city-btn${isActive ? ' is-active' : ''}" data-city="${city.id}"
                    style="padding: 6px 14px; border-radius: var(--border-radius-md);
                           background: ${isActive ? 'var(--color-accent)' : 'var(--color-bg-secondary)'};
                           color: ${isActive ? 'var(--color-bg)' : 'var(--color-text-primary)'};
                           border: 0.5px solid ${isActive ? 'var(--color-accent)' : 'var(--color-border-tertiary)'};
                           font-size: 13px; font-weight: 500; cursor: pointer;
                           transition: all 0.15s ease;">
              ${city.name}
            </button>
          `;
        })
        .join('');

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

    // Initialize parameter panel
    renderParamPanel(paramPanelEl, data.defaults, getState().params, handleParamChange);

    // Initialize FIRE section
    const state = getState();
    renderFirePanel(fireSectionEl, state.fire, handleFireParamChange);
    const fireChartCanvasEl = fireSectionEl.querySelector('#fireChart');
    if (fireChartCanvasEl) {
      initFireChart(fireChartCanvasEl, state.fire.projection, state.fire.fireNumber);
    }

    // Initialize chart
    initBudgetChart(chartCanvasEl, data.categories, shanghaiTiers[1].pct);

    // Render comparison grid
    renderCompareTiers(compareGridEl, shanghaiTiers);

    // Dark mode listener
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        updateChartBorderColor();
      });
    }

    // Initial render
    renderLegend();
    updateCalculations();

  } catch (error) {
    console.error('Failed to bootstrap application:', error);
    document.body.classList.add('js-error');
  }
}

bootstrap();
