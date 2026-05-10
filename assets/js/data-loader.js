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
    // Load core data files
    const citiesIdx = await loadJSON('./data/cities.json');
    const categories = await loadJSON('./data/categories.json');
    const fireTiers = await loadJSON('./data/fire-tiers.json');
    const defaults = await loadJSON('./data/defaults.json');
    const shanghaiData = await loadJSON('./data/cities/shanghai.json');

    // Load city-specific data (don't fail if some are missing)
    const cityData = { shanghai: shanghaiData };

    for (const city of citiesIdx.cities) {
      if (city.id === 'shanghai') continue; // Already loaded
      try {
        const cityDataFile = await loadJSON(`./data/cities/${city.id}.json`);
        cityData[city.id] = cityDataFile;
      } catch (error) {
        console.warn(`Could not load data for ${city.id}:`, error);
        // Continue without this city
      }
    }

    // Load only available cities
    const availableCities = citiesIdx.cities.filter(c => c.available && cityData[c.id]);

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
