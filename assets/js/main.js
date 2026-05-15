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
    const compareEmptyStateEl = document.getElementById('compareEmptyState');
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
    let lastTierPanelKey = null;
    const tierItemRefs = new Map(); // catId -> spendingEl

    function renderTierPanel() {
      const state = getState();

      if (!state.cityTiers || !Array.isArray(state.cityTiers) || state.cityTiers.length === 0) return;

      const tier = state.cityTiers[state.activeTierIndex];
      if (!tier) return;

      const variant = tier.variants ? tier.variants[state.householdModel] : null;
      if (!variant) return;

      // Always update badge, income range, description (cheap DOM writes)
      badgeEl.style.background = tier.badge.bg;
      badgeEl.style.color = tier.badge.fg;
      badgeEl.textContent = tier.name;

      const incomeRangeEl = document.getElementById('incomeRange');
      const minStr = '¥' + formatNumber(variant.incomeRange.min);
      const maxStr = variant.incomeRange.max
        ? '¥' + formatNumber(variant.incomeRange.max)
        : '¥' + formatNumber(variant.incomeRange.min) + '+';
      incomeRangeEl.textContent = minStr + '–' + maxStr + '/月';

      descEl.textContent = tier.description;

      const allocation = calculateBudgetAllocation({
        monthlyCNY: state.monthlyCNY,
        tiers: state.cityTiers,
        tierIndex: state.activeTierIndex,
        householdModel: state.householdModel,
        categories: state.categories
      });

      // Structural key: only rebuild DOM when city/tier/household actually changes
      const structKey = `${state.cityId}_${state.activeTierIndex}_${state.householdModel}`;
      if (structKey !== lastTierPanelKey) {
        lastTierPanelKey = structKey;
        tierItemRefs.clear();
        itemsEl.innerHTML = '';

        Object.entries(tier.items).forEach(([catId, catData]) => {
          const budgetItem = allocation.itemsByCategory[catId];
          if (!budgetItem || budgetItem.amount <= 0) return;

          const div = document.createElement('div');
          div.className = 'tier-item';

          const rowDiv = document.createElement('div');
          rowDiv.className = 'tier-item-row';

          const catSpan = document.createElement('span');
          catSpan.className = 'tier-item-cat';
          catSpan.textContent = catData.label;

          const spendingSpan = document.createElement('span');
          spendingSpan.className = 'tier-item-spending';

          rowDiv.appendChild(catSpan);
          rowDiv.appendChild(spendingSpan);
          div.appendChild(rowDiv);

          const exDiv = document.createElement('div');
          exDiv.className = 'tier-item-ex';
          exDiv.innerHTML = catData.examples.join(' &nbsp;·&nbsp; ');
          div.appendChild(exDiv);

          itemsEl.appendChild(div);
          tierItemRefs.set(catId, spendingSpan);
        });
      }

      // Always update spending amounts (just text, no DOM restructure)
      tierItemRefs.forEach((spendingEl, catId) => {
        const budgetItem = allocation.itemsByCategory[catId];
        if (budgetItem) {
          spendingEl.textContent = '¥' + formatNumber(roundToReadable(budgetItem.amount)) + '/月';
        }
      });

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

    // Household selector — first-render creates nodes once, update only toggles active state
    const householdSelectorEl = document.getElementById('householdSelector');
    let householdBtnMap = null; // Map<modelId, btnEl>

    function renderHouseholdModelSelector() {
      const state = getState();
      if (!householdSelectorEl || !state.householdModels || !state.householdModels.length) return;

      if (!householdBtnMap) {
        householdBtnMap = new Map();
        householdSelectorEl.innerHTML = '';

        const label = document.createElement('span');
        label.className = 'loading-tag';
        label.style.cssText = 'white-space:nowrap;margin-right:6px;';
        label.textContent = '家庭结构：';
        householdSelectorEl.appendChild(label);

        state.householdModels.forEach(model => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.dataset.model = model.id;
          btn.title = model.description;
          btn.textContent = model.label;
          btn.style.cssText = 'padding:6px 14px;border-radius:var(--border-radius-md);font-size:12px;font-weight:500;cursor:pointer;transition:all 0.15s ease;border:0.5px solid;';
          householdSelectorEl.appendChild(btn);
          householdBtnMap.set(model.id, btn);
        });

        // Single delegated listener on container
        householdSelectorEl.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-model]');
          if (!btn) return;
          const modelId = btn.dataset.model;
          if (modelId) {
            setState({ householdModel: modelId });
            updateCalculations();
            scheduleUrlSync();
          }
        });
      }

      // Update: only toggle active/inactive styles — no DOM rebuild
      const activeModel = state.householdModel;
      householdBtnMap.forEach((btn, modelId) => {
        const isActive = modelId === activeModel;
        btn.style.background = isActive ? 'var(--color-accent)' : 'var(--color-bg-secondary)';
        btn.style.color = isActive ? 'var(--color-bg)' : 'var(--color-text-primary)';
        btn.style.borderColor = isActive ? 'var(--color-accent)' : 'var(--color-border-tertiary)';
      });
    }

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

    // Compare slider — registered once at bootstrap (static HTML, no inject/remove)
    const compareSliderInput = document.getElementById('compareSliderInput');
    const compareAssetDisp = document.getElementById('compareAssetDisp');
    let compareRafId = null;
    if (compareSliderInput) {
      compareSliderInput.addEventListener('input', (e) => {
        const newValue = parseInt(e.target.value);
        if (compareRafId) cancelAnimationFrame(compareRafId);
        compareRafId = requestAnimationFrame(() => {
          compareRafId = null;
          setState({ sliderValue: newValue });
          updateCalculations();
          if (compareAssetDisp) compareAssetDisp.textContent = formatUSD(sliderToAssets(newValue));
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
      renderCompareCitiesGrid(
        compareCitiesContainerEl,
        newCities.map(id => data.cityData[id]),
        state.monthlyCNY,
        formatNumber,
        state.householdModel
      );
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

        // Show the static compare slider and sync its value to current state
        const compareSliderEl = document.getElementById('compareSlider');
        if (compareSliderEl) compareSliderEl.style.display = 'block';
        if (compareSliderInput) compareSliderInput.value = state.sliderValue;
        if (compareAssetDisp) compareAssetDisp.textContent = formatUSD(sliderToAssets(state.sliderValue));

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

        const compareSliderEl = document.getElementById('compareSlider');
        if (compareSliderEl) compareSliderEl.style.display = 'none';
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

    // City selector — first-render creates nodes once, update only toggles active state
    let cityBtnMap = null; // Map<cityId, btnEl>

    function renderCitySelector() {
      const state = getState();

      if (!cityBtnMap) {
        cityBtnMap = new Map();
        citySelectorEl.innerHTML = '';

        const wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;';

        const groupedCities = {};
        data.availableCities.forEach(city => {
          if (!groupedCities[city.country]) groupedCities[city.country] = [];
          groupedCities[city.country].push(city);
        });

        const countryOrder = ['中国', '中国香港', '日本', '泰国', '美国', '越南', '英国', '法国', '新加坡', '阿联酋', '澳大利亚', '法国'];
        const sortedCountries = Object.keys(groupedCities).sort((a, b) => {
          const ai = countryOrder.indexOf(a), bi = countryOrder.indexOf(b);
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        });

        sortedCountries.forEach((country, idx) => {
          if (idx > 0) {
            const sep = document.createElement('div');
            sep.style.cssText = 'width:1px;height:24px;background:var(--color-border-tertiary);margin:0 2px;flex-shrink:0;';
            wrap.appendChild(sep);
          }

          groupedCities[country].forEach(city => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.dataset.city = city.id;
            btn.title = country;
            btn.style.cssText = 'padding:6px 14px;border-radius:var(--border-radius-md);font-size:13px;font-weight:500;cursor:pointer;transition:all 0.15s ease;border:0.5px solid;';

            btn.appendChild(document.createTextNode(city.name));

            if (city.incomplete) {
              const badge = document.createElement('span');
              badge.className = 'data-incomplete-badge';
              badge.title = '数据待核对，仅供参考';
              badge.textContent = '待核';
              btn.appendChild(badge);
            }

            wrap.appendChild(btn);
            cityBtnMap.set(city.id, btn);
          });
        });

        citySelectorEl.appendChild(wrap);

        // Single delegated listener
        citySelectorEl.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-city]');
          if (!btn) return;
          const cityId = btn.dataset.city;
          const city = data.cityData[cityId];
          if (city) {
            localStorage.setItem('lastCity', cityId);
            setState({ cityId, cityData: city, cityTiers: city.tiers });
            renderCitySelector();
            updateCalculations();
            scheduleUrlSync();
          }
        });
      }

      // Update: only toggle active/inactive styles
      const activeId = state.cityId;
      cityBtnMap.forEach((btn, cityId) => {
        const isActive = cityId === activeId;
        btn.style.background = isActive ? 'var(--color-accent)' : 'var(--color-bg-secondary)';
        btn.style.color = isActive ? 'var(--color-bg)' : 'var(--color-text-primary)';
        btn.style.borderColor = isActive ? 'var(--color-accent)' : 'var(--color-border-tertiary)';
      });
    }

    // Initialize city selector
    renderCitySelector();

    // Initialize household model selector
    renderHouseholdModelSelector();

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

    // Prefetch last-visited city data for faster next switch
    const lastCity = localStorage.getItem('lastCity');
    if (lastCity && lastCity !== getState().cityId) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = `./data/cities/${lastCity}.json`;
      document.head.appendChild(link);
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
