import { getState, setState, subscribe } from './state.js';
import { loadAllData } from './data-loader.js';
import { sliderToAssets, formatUSD, formatNumber } from './calc/assets.js';
import { computeMonthlyIncome } from './calc/income.js';
import { matchTier } from './calc/tier.js';

async function bootstrap() {
  try {
    // Mark JS as loaded
    document.body.classList.remove('js-pending');
    document.body.classList.add('js');

    // Load all data
    const data = await loadAllData();
    const defaultParams = data.defaults.params;
    const shanghaiTiers = data.cityData.shanghai.tiers;

    // Initialize state
    setState({
      cityId: 'shanghai',
      cityData: data.cityData.shanghai,
      cityTiers: shanghaiTiers,
      categories: data.categories,
      sliderValue: 35,
      params: { ...defaultParams },
      monthlyCNY: 0,
      activeTierIndex: 0
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
      descEl.textContent = tier.description;

      itemsEl.innerHTML = Object.entries(tier.items)
        .map(([catId, catData]) => {
          const cat = state.categories.find(c => c.id === catId);
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
    subscribe(() => {
      renderMetrics();
      renderTierStrip();
      renderTierPanel();
    });

    // Slider event
    sliderEl.addEventListener('input', (e) => {
      const newValue = parseInt(e.target.value);
      setState({ sliderValue: newValue });
      updateCalculations();

      // Update URL
      try {
        const u = new URL(location.href);
        u.searchParams.set('v', newValue);
        history.replaceState(null, '', u);
      } catch (_) {}
    });

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

    // Read initial state from URL
    const params = new URLSearchParams(location.search);
    const vRaw = params.get('v');
    if (vRaw !== null) {
      const vNum = parseInt(vRaw, 10);
      if (!isNaN(vNum) && vNum >= 0 && vNum <= 100) {
        setState({ sliderValue: vNum });
        sliderEl.value = vNum;
      }
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
