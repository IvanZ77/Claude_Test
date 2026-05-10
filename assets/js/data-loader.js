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
    const [citiesIdx, categories, fireTiers, defaults, shanghaiData] = await Promise.all([
      loadJSON('./data/cities.json'),
      loadJSON('./data/categories.json'),
      loadJSON('./data/fire-tiers.json'),
      loadJSON('./data/defaults.json'),
      loadJSON('./data/cities/shanghai.json')
    ]);

    return {
      citiesIndex: citiesIdx,
      categories: categories.categories,
      fireTiers: fireTiers.tiers,
      defaults: defaults,
      cityData: { shanghai: shanghaiData }
    };
  } catch (error) {
    console.error('Failed to load application data:', error);
    throw error;
  }
}
