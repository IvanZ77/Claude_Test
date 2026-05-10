// Comparison grid renderer
export function renderCompareTiers(containerEl, tiers) {
  containerEl.innerHTML = tiers
    .map((tier) => {
      const range =
        tier.incomeRange.max === null || tier.incomeRange.max === Infinity
          ? `> ¥${(tier.incomeRange.min / 10000).toFixed(0)}万/月`
          : `¥${(tier.incomeRange.min / 10000).toFixed(tier.incomeRange.min < 10000 ? 1 : 0)}万–${(tier.incomeRange.max / 10000).toFixed(0)}万/月`;

      const housing = tier.items.housing;
      const education = tier.items.education;
      const food = tier.items.food;

      return `
        <div class="compare-card">
          <span class="compare-name" style="background:${tier.badge.bg};color:${tier.badge.fg}">${tier.name}</span>
          <div class="compare-range">${range}</div>
          <dl class="compare-row">
            <dt>住房</dt>
            <dd>${housing.examples[0] || housing.label}</dd>
          </dl>
          <dl class="compare-row">
            <dt>教育</dt>
            <dd>${education.examples[0] || education.label}</dd>
          </dl>
          <dl class="compare-row">
            <dt>餐饮</dt>
            <dd>${food.examples[0] || food.label}</dd>
          </dl>
        </div>
      `;
    })
    .join('');
}
