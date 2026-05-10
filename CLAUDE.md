# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A pure frontend asset-to-lifestyle calculator for expats planning relocation or FIRE (Financial Independence, Retire Early). Applies the 4% safe withdrawal rate to compute monthly disposable income, match living tiers with real neighborhoods/schools/restaurants, and compare across 21 cities in 8 countries.

**Stack**: HTML5 + CSS3 + ES Modules (no build tools) + Chart.js. Deploys directly to GitHub Pages.

---

## Repository Structure

```
/
├── index.html                     # Single-page app shell
├── assets/
│   ├── css/
│   │   ├── tokens.css             # CSS variables (colors, spacing, typography)
│   │   ├── base.css               # Reset + body + semantic elements
│   │   ├── components.css         # UI patterns (sliders, panels, grids)
│   │   └── main.css               # @import all CSS files
│   └── js/
│       ├── main.js                # Entry point: bootstrap, mount components, subscribe to state
│       ├── state.js               # Minimal pub-sub: getState/setState/subscribe
│       ├── url.js                 # URL ↔ state serialization
│       ├── data-loader.js         # Fetch and cache JSON files
│       ├── calc/                  # Calculation modules (pure functions, testable)
│       │   ├── assets.js          # Log-scale slider ↔ asset amount; formatting
│       │   ├── income.js          # Monthly CNY = f(assets, withdrawal rate, tax, FX)
│       │   ├── tier.js            # Match income → living tier
│       │   └── fire.js            # FIRE number, years to FIRE, coast FIRE, projections
│       ├── render/                # UI rendering functions (react to state changes)
│       │   ├── chart-budget.js    # Doughnut chart (budget breakdown per tier)
│       │   ├── chart-fire.js      # Line chart (asset growth over time)
│       │   ├── param-panel.js     # Adjustable parameters form (withdrawal rate, tax, FX, etc.)
│       │   ├── fire-panel.js      # FIRE inputs/outputs UI
│       │   ├── compare-cities.js  # Multi-city comparison grid
│       │   └── compare-tiers.js   # Current tier detail card
│       └── components/
│           ├── slider.js
│           ├── city-select.js
│           └── compare-toggle.js
└── data/                          # JSON data layer (no hardcoding)
    ├── cities.json                # City registry (id, name, tiers file, currency, FX, enabled)
    ├── categories.json            # 7 budget categories (housing, education, dining, transport, health, leisure, shopping)
    ├── defaults.json              # Default parameters (4% rate, 20% tax, 6.8 FX, 7% return, 2.5% inflation)
    ├── fire-tiers.json            # FIRE classification (Lean/Regular/Fat thresholds)
    └── cities/                    # Per-city tier data
        ├── shanghai.json
        ├── beijing.json
        └── [20 more cities...]
```

---

## Development Workflow

### Running Locally

Since this is a **static site with no build step**, simply open `index.html` in your browser:

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Or use a simple server to avoid CORS issues with file://
python3 -m http.server 8000
# Then visit http://localhost:8000
```

The app loads data via `fetch()` from `/data/*.json` files. **File:// protocol will not work** due to CORS; use a local server.

### Testing

No automated test suite yet. **Manual smoke tests**:

1. **Slider interaction**: Drag asset slider; check that:
   - Annual withdrawal (4% rule, pre-tax) updates
   - Monthly USD (tax-adjusted) updates
   - Monthly CNY (with FX) updates
   - Tier indicator bar highlights correct bracket

2. **City switching**: Click different cities; check that:
   - Tier layout changes (thresholds differ by city)
   - Chart legend updates (colors for 7 categories)
   - Budget percentages are reasonable (e.g., housing 20–40%)

3. **Comparison mode**:
   - Enable "城市对比" (city compare) mode
   - Select 2–3 cities; check that side-by-side grid appears
   - Adjust slider; all cities should update

4. **Parameters**: Click "调整参数" (adjust parameters):
   - Change withdrawal rate, tax, FX, return rate, inflation
   - Verify results update instantly
   - Click "重置为默认值" (reset to defaults)

5. **FIRE Calculator**: Toggle "FIRE 计算器":
   - Input current assets, monthly savings, return rate, inflation
   - Check that "FIRE number" (target asset), "years to FIRE", chart appear
   - Adjust inputs; projections should update

6. **URL sharing**:
   - Set city, asset, parameters to a custom state
   - Click "复制链接" (copy link)
   - Paste URL into new tab; verify state reproduces exactly

7. **Dark mode**: Toggle OS dark mode (or use browser dev tools); verify:
   - Colors invert correctly (text, background, borders)
   - Charts remain readable
   - No hardcoded color values leak through

### Debugging Tips

- **No data loads**: Check Network tab in DevTools. Are `data/*.json` files 200 OK? If CORS errors, use local server.
- **Null reference errors**: Look at console. The app initializes with `js-pending` class on `<body>`. Ensure `loadAllData()` completes before rendering.
- **Chart not visible**: Check `#bc` (budget chart canvas) and `#fc` (FIRE chart canvas) exist in DOM. Chart.js needs explicit size.
- **URL state not persisting**: Verify `url.js` is imported and `decodeState()` runs before `setState()`.

---

## Code Architecture

### State Management (40 lines)

**File**: `state.js`

A minimal single-store pub-sub pattern:

```js
const store = {};       // Single source of truth
const listeners = new Set();

export function getState() { return store; }
export function setState(patch) {
  Object.assign(store, patch);
  listeners.forEach(fn => fn(store, patch));
}
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
```

**State shape** (see main.js for initialization):

```js
{
  cityId: 'shanghai',
  cityData: { tiers: [...], description: '...' },
  cityTiers: [...],
  categories: [...],
  sliderValue: 35,        // 0–100 log scale
  params: {               // User adjustments
    withdrawalRate: 0.04,
    taxRate: 0.20,
    fxUsdCny: 6.8,
    annualReturnRate: 0.07,
    inflationRate: 0.025
  },
  monthlyCNY: 18136,
  activeTierIndex: 2,
  compareMode: false,
  selectedCities: ['shanghai'],
  fire: {
    pv: 1000000,          // Current assets
    pmt: 20000,           // Monthly savings
    r: 0.07,              // Annual return
    inflation: 0.025,
    currentAge: 35,
    retireAge: 55,
    fireNumber: 0,
    yearsToFire: 0,
    coastFireAmount: 0,
    tier: null,           // Lean/Regular/Fat classification
    projection: []        // [{year, assets, ...}, ...]
  }
}
```

**Subscribers** register once at startup in `main.js` and re-render on state change. This keeps rendering logic out of event handlers.

### Calculation Modules (Pure Functions)

All in `calc/` folder. No side effects, fully testable.

#### `assets.js`: Slider ↔ Asset Amount

```js
sliderToAssets(sliderValue)  // 0–100 → $200k–$20M logarithmically
assetsToSlider(assets)        // Inverse
formatUSD(amount)             // → $1.5M, $2,667, etc.
```

**Log scale**: The slider ranges 0–100, but maps to $200k–$20M on a log10 scale. This gives fine control at lower values and compressed scale at higher values.

#### `income.js`: Monthly Disposable Income

```js
computeMonthlyIncome({
  assets,           // USD
  withdrawalRate,   // 0.04 = 4%
  taxRate,          // 0.20 = 20% capital gains tax
  fxUsdCny          // 6.8
})
// Returns: { annualUSD, monthlyUSD, monthlyCNY }
```

**Formula**:
```
annualUSD = assets × withdrawalRate
monthlyUSD = (annualUSD × (1 - taxRate)) / 12
monthlyCNY = monthlyUSD × fxUsdCny
```

#### `tier.js`: Income → Living Tier

```js
matchTier(monthlyCNY, cityTiers)
// Returns: { tierIndex, tierName, min, max, categoryBudgets }
```

Each city JSON defines 6 tiers with min/max thresholds and a budget breakdown (7 categories summing to 100%).

#### `fire.js`: FIRE Calculations

```js
fireNumber(annualExpense, withdrawalRate)
  // Target = expense / withdrawal rate (e.g., 300k / 0.04 = 7.5M)

yearsToFire(pv, pmt, r, inflation, fireTarget)
  // Closed form: n = ln((FV·r + PMT) / (PV·r + PMT)) / ln(1 + r)
  // Adjusts for real rate = (1 + nominal) / (1 + inflation) - 1

projectAssets(pv, pmt, r, inflation, years)
  // Array of {year, assets, ...} for charting

coastFireAmount(fireNumber, r, yearsToRetire)
  // Passive-only wealth needed to reach target by retirement age

classifyFireTier(annualExpense, fireNumber)
  // Maps to Lean/Regular/Fat/Coast based on fire-tiers.json thresholds
```

### Rendering Modules

Each in `render/` folder. Subscribe to state; return nothing. Mutate DOM directly (or initialize Chart.js).

**Pattern**:
```js
export function renderX(state) {
  // Read from state
  const { cityId, monthlyCNY, categories } = state;
  
  // Mutate DOM
  document.getElementById('el').textContent = monthlyCNY;
  document.querySelectorAll('.cat').forEach((el, i) => {
    el.style.background = categories[i].color;
  });
}
```

**Examples**:

- `chart-budget.js`: Initialize doughnut chart once; update data on state change.
- `chart-fire.js`: Line chart showing asset growth projections.
- `param-panel.js`: Form inputs for withdrawal rate, tax, FX, etc. Emit `setState()` on input.
- `compare-cities.js`: Grid of city cards, each showing that city's tier for current asset level.

### URL State (Shareable Links)

**File**: `url.js`

Encodes state into URLSearchParams and decodes back:

```
?c=shanghai&a=50&wr=0.035&tx=0.15&fx=7.0&ar=0.08&inf=0.02

c   = city ID
a   = slider (0–100)
wr  = withdrawal rate (override default)
tx  = tax rate
fx  = FX rate
ar  = annual return
inf = inflation rate
```

**Functions**:
```js
decodeState(searchString, defaults)
  // Parse URL; fill missing params from defaults

syncToUrl(state)
  // Encode current state; update browser history
```

Called on bootstrap (decode URL state) and on every `setState()` call (sync URL).

### Data Loading

**File**: `data-loader.js`

Fetches all JSON files in parallel on bootstrap:

```js
async function loadAllData() {
  // Fetch data/cities.json, defaults.json, categories.json, fire-tiers.json
  // Fetch all city files referenced in cities.json
  // Return { cities, defaults, categories, fireTiers, cityData: {...} }
}
```

Files are cached in memory. No refetching.

---

## Adding a New City

**No JS changes required.** Follow these steps:

### 1. Create City Data File

Create `data/cities/{cityId}.json` with this shape:

```json
{
  "name": "Tokyo",
  "country": "Japan",
  "currency": "JPY",
  "currencySymbol": "¥",
  "fxToUsd": 0.007,
  "fxToCny": 0.045,
  "description": "Tokyo is Japan's capital, ...",
  "tiers": [
    {
      "tierIndex": 0,
      "name": "拮据",
      "minMonthly": 0,
      "maxMonthly": 6000,
      "description": "Basic living...",
      "examples": {
        "housing": "Old apartment in Adachi ward",
        "education": "Public school",
        "dining": "Ramen shops, convenience stores",
        "transport": "Public transit only",
        "health": "Public hospital",
        "leisure": "Free parks",
        "shopping": "Uniqlo, Daiso"
      },
      "categoryBudgets": [
        { "name": "housing", "percentage": 35 },
        { "name": "education", "percentage": 5 },
        { "name": "dining", "percentage": 20 },
        { "name": "transport", "percentage": 15 },
        { "name": "health", "percentage": 8 },
        { "name": "leisure", "percentage": 12 },
        { "name": "shopping", "percentage": 5 }
      ]
    },
    // ... 5 more tiers
  ]
}
```

**Tier thresholds must be in CNY** (monthly). The algorithm matches `monthlyCNY` to `minMonthly..maxMonthly` ranges.

### 2. Register in City Index

Edit `data/cities.json`:

```json
{
  "id": "tokyo",
  "name": "東京",
  "file": "cities/tokyo.json",
  "countryId": "japan",
  "currency": "JPY",
  "available": true
}
```

### 3. Test

1. Reload `index.html` in browser.
2. City selector should include "東京".
3. Click it; calculator should update immediately.
4. Slider should work; tiers should highlight correctly.
5. Budget chart should show city-specific category percentages.

**Data validation tips**:
- All 6 tiers must exist.
- Category percentages must sum to ~100% (allow ±0.1%).
- Tier minMonthly must be ≤ maxMonthly.
- `categoryBudgets` array order must match `categories.json` (housing, education, dining, transport, health, leisure, shopping).

---

## Conventions & Patterns

### Naming

- **Functions**: camelCase. Pure functions in `calc/`. Side-effectful functions in `render/`.
- **Identifiers**: Prefer English in code, Chinese in UI strings (exception: city IDs use pinyin slugs like `shanghai`, `beijing`, `chengdu`).
- **Elements**: Use `id=` for unique sections (`#sl`, `#bc`, `#fc`, etc.); use `data-*` for repeating items (`data-i="0"` for tier index).
- **CSS classes**: BEM-inspired for clarity. `.tier-strip`, `.tier-strip-bars`, `.tier-strip-labels`.

### CSS

- **No inline styles** in HTML (except temporary debugging). All styles in `assets/css/`.
- **CSS variables** in `tokens.css`: `--color-*`, `--space-*`, `--font-*`. Use them everywhere.
- **Dark mode**: Use `@media (prefers-color-scheme: dark)` at the end of each file. Override variables.
- **Responsive**: Mobile-first. Use `@media (min-width: ...)` for breakpoints (typically 600px, 900px, 1200px).

### Modules

- **One responsibility per file**. `calc/income.js` does income calculation; `render/chart-budget.js` renders charts.
- **No side effects in `calc/` files**. They're pure functions; test them easily.
- **Each `render/` file exports a single function** (or two for init + update patterns). Import and call from `main.js` subscribe handler.
- **No direct DOM queries in state management**. Pass state to render functions; they handle DOM.

### Error Handling

- **Data load failures**: Wrap `loadAllData()` in try/catch. Show error UI if data missing.
- **User input validation**: Sliders have `min/max/step` attributes; form inputs validate on change.
- **Null checks**: After setting state, render functions check for required properties. Never assume keys exist.

### Comments

Minimal. Code is self-documenting. Add comments only for:
- Non-obvious calculations (e.g., log scale formula).
- Constraints or workarounds (e.g., "Chart.js requires explicit canvas size").
- Historical decisions (e.g., "4% rate from Trinity Study; don't change without research").

---

## Key Assumptions & Constraints

- **4% withdrawal rate**: From Trinity Study. Backed by 30-year retirement success probability ≥ 95%. Don't change without strong reason.
- **US tax 20%**: Assumes long-term capital gains (federal only, not state). Users can override in params.
- **Family model**: 2 adults + 1 school-age child. Budget categories reflect this.
- **Annual rebalancing**: Assumed in FIRE calculations.
- **Static site**: No server, no database. All state lives in memory and URL. On page refresh, URL is reloaded.
- **No offline support**: App requires internet to fetch JSON files (though they're small ~100KB total).

---

## Common Tasks

### Fixing a Bug

1. Identify which module: Is it calculation (`calc/`)? Rendering? Data loading?
2. Add logging: `console.log(state)` in subscribe handler or render function.
3. For calculation bugs: Test the function in DevTools console with mock inputs.
4. Commit with message: `fix: [module] brief description` (e.g., `fix: tier matching off-by-one error`).

### Adding a New Parameter

1. Add to `data/defaults.json` with min/max/default values.
2. Update `state.js` initial state shape.
3. Add form input in `render/param-panel.js`.
4. Handle in calculations: e.g., if it affects income, update `calc/income.js`.
5. Persist in URL: add short code to `url.js` `encodeState`/`decodeState`.
6. Test: set param, check URL contains it, refresh, verify persists.

### Updating City Data

City data changes (e.g., school fees rise, real estate prices drop):

1. Edit `data/cities/{cityId}.json` directly.
2. **No code change required**.
3. Test: reload page, verify numbers updated.
4. Commit: `data: update {cityId} {year} market data` (e.g., `data: update shanghai 2025 school fees`).

### Changing Calculation Logic

**Example**: Treasury inflation-protected securities (TIPS) vs. stock return assumption.

1. Identify affected function: e.g., `calc/income.js`.
2. Update formula/constants.
3. **Update REFACTOR_PLAN.md or comments** explaining the change.
4. Test: manually verify with a known example from README.
5. Commit: `refactor: [module] [reason]` (e.g., `refactor: income adjust real return formula for bonds`).

---

## Testing Checklist Before Commit

- [ ] Slider updates all three metrics (annual USD, monthly USD, monthly CNY).
- [ ] City switching updates tier layout.
- [ ] Parameter adjustments update results instantly.
- [ ] URL updates on state change; copy/paste URL loads state correctly.
- [ ] FIRE calculator outputs change when inputs change.
- [ ] City comparison grid shows all selected cities.
- [ ] Dark mode toggle works (OS preference or browser dev tools).
- [ ] No console errors.
- [ ] No console warnings (except external library warnings, e.g., Chart.js).
- [ ] Charts render without overlapping text.

---

## Deployment

Merges to `main` trigger GitHub Pages deployment automatically (`.github/workflows/pages.yml`). Site is live at:

```
https://IvanZ77.github.io/Multi-City-Lifestyle-Calculator/
```

**No manual steps needed.** Just push to `main`.

---

## Resources

- **README.md**: User guide, calculation formulas, assumptions, FAQ.
- **REFACTOR_PLAN.md**: Architecture decisions, migration progress, directory structure.
- **Trinity Study**: [The Trinity Study](https://en.wikipedia.org/wiki/Trinity_study) — The 4% rule's origin.
- **Chart.js**: [Docs](https://www.chartjs.org/docs/latest/) for customizing doughnut/line charts.
