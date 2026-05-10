// Multi-city comparison renderer
export function renderCityComparison(containerEl, cities, selectedCityIds, onCitySelect, onCityDeselect) {
  // City picker
  const pickerHtml = cities
    .filter(city => city.available)
    .map(city => {
      const isSelected = selectedCityIds.includes(city.id);
      return `
        <button
          class="city-pill ${isSelected ? 'is-selected' : ''}"
          data-city-id="${city.id}"
          style="
            padding: 8px 16px;
            border-radius: var(--border-radius-md);
            border: ${isSelected ? 'none' : '0.5px solid var(--color-border-tertiary)'};
            background: ${isSelected ? 'var(--color-accent)' : 'transparent'};
            color: ${isSelected ? 'var(--color-bg)' : 'var(--color-text-primary)'};
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
          "
        >
          ${city.name}
        </button>
      `;
    })
    .join('');

  containerEl.innerHTML = `
    <div style="margin-bottom: var(--space-5);">
      <p style="font-size: 12px; color: var(--color-text-secondary); margin: 0 0 var(--space-3);">选择城市（最多 3 个）</p>
      <div style="display: flex; gap: var(--space-2); flex-wrap: wrap;">
        ${pickerHtml}
      </div>
    </div>
    <div id="compareCitiesGrid" style="overflow-x: auto; -webkit-overflow-scrolling: touch; width: 100%; max-width: 100%;"></div>
  `;

  // Set up city selection listeners
  const pills = containerEl.querySelectorAll('.city-pill');
  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      const cityId = pill.dataset.cityId;
      const isCurrentlySelected = pill.classList.contains('is-selected');

      if (isCurrentlySelected) {
        onCityDeselect(cityId);
      } else {
        if (selectedCityIds.length < 3) {
          onCitySelect(cityId);
        }
      }
    });
  });
}

export function renderCompareCitiesGrid(containerEl, selectedCities, monthlyCNY, formatNumber) {
  const gridEl = containerEl.querySelector('#compareCitiesGrid');
  if (!gridEl) return;

  gridEl.innerHTML = `
    <div style="
      display: grid;
      grid-template-columns: ${`repeat(${selectedCities.length}, 1fr)`};
      gap: var(--space-4);
      width: 100%;
    ">
      ${selectedCities
        .map(city => renderCityComparisonCard(city, monthlyCNY, formatNumber))
        .join('')}
    </div>
  `;
}

function renderCityComparisonCard(city, monthlyCNY, formatNumber) {
  const tiers = city.tiers;

  // Find matching tier for current monthly CNY
  let matchedTier = tiers[tiers.length - 1];
  for (let i = 0; i < tiers.length; i++) {
    if (monthlyCNY >= tiers[i].incomeRange.min && monthlyCNY < tiers[i].incomeRange.max) {
      matchedTier = tiers[i];
      break;
    }
  }

  return `
    <div style="background: var(--color-bg-tertiary); border-radius: var(--border-radius-lg); padding: var(--space-5); box-shadow: var(--shadow-sm);">
      <h3 style="font-size: 15px; font-weight: 600; margin: 0 0 var(--space-4); color: var(--color-text-primary);">
        ${city.name}
      </h3>

      <div style="padding: var(--space-3); background: var(--color-bg-secondary); border-radius: var(--border-radius-md); margin-bottom: var(--space-4);">
        <p style="font-size: 11px; color: var(--color-text-tertiary); margin: 0 0 var(--space-1); text-transform: uppercase;">月度可支配收入</p>
        <p style="font-size: 18px; font-weight: 600; margin: 0; color: var(--color-text-primary);">
          ¥${formatNumber(monthlyCNY)}
        </p>
      </div>

      <div style="padding: var(--space-3); border-radius: var(--border-radius-md); margin-bottom: var(--space-4); background: ${matchedTier.badge.bg}; color: ${matchedTier.badge.fg};">
        <p style="font-size: 11px; margin: 0 0 var(--space-1); font-weight: 500; opacity: 0.8;">生活档位</p>
        <p style="font-size: 16px; font-weight: 600; margin: 0;">
          ${matchedTier.name}
        </p>
      </div>

      <p style="font-size: 12px; line-height: 1.6; color: var(--color-text-secondary); margin: 0 0 var(--space-4);">
        ${matchedTier.description}
      </p>

      <h4 style="font-size: 12px; font-weight: 600; margin: 0 0 var(--space-2); color: var(--color-text-primary); text-transform: uppercase; letter-spacing: 0.02em;">
        预算分配示例
      </h4>
      <div style="display: flex; flex-direction: column; gap: var(--space-2);">
        ${Object.entries(matchedTier.items)
          .slice(0, 3)
          .map(
            ([catId, catData]) => `
          <div style="font-size: 11px;">
            <p style="margin: 0 0 2px; font-weight: 500; color: var(--color-text-primary);">
              ${catData.label}
            </p>
            <p style="margin: 0; color: var(--color-text-tertiary); line-height: 1.5;">
              ${catData.examples[0] || '—'}
            </p>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;
}
