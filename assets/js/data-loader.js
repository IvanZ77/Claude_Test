// Data loading and caching
const cache = {};

export async function loadJSON(path) {
  if (cache[path]) return cache[path];

  try {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}: ${response.status}`);
    const data = await response.json();
    cache[path] = data;
    return data;
  } catch (error) {
    console.error(`Error loading ${path}:`, error);
    throw error;
  }
}

export async function loadAllData() {
  try {
    const [citiesIdx, categories, fireTiers, defaults, shanghaiData, beijingData] = await Promise.all([
      loadJSON('./data/cities.json'),
      loadJSON('./data/categories.json'),
      loadJSON('./data/fire-tiers.json'),
      loadJSON('./data/defaults.json'),
      loadJSON('./data/cities/shanghai.json'),
      loadJSON('./data/cities/beijing.json')
    ]);

    const cityData = { shanghai: shanghaiData, beijing: beijingData };

    // Load only available cities
    const availableCities = citiesIdx.cities.filter(c => c.available);

    return {
      citiesIndex: citiesIdx,
      availableCities: availableCities,
      categories: categories.categories,
      fireTiers: fireTiers.tiers,
      defaults: defaults,
      cityData
    };
  } catch (error) {
    console.error('Failed to load application data:', error);
    throw error;
  }
}
