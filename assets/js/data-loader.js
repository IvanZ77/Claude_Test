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
    // Load core data files in parallel
    const [citiesIdx, categories, fireTiers, defaults, householdModels] = await Promise.all([
      loadJSON('./data/cities.json'),
      loadJSON('./data/categories.json'),
      loadJSON('./data/fire-tiers.json'),
      loadJSON('./data/defaults.json'),
      loadJSON('./data/household-models.json')
    ]);

    // Load all city data in parallel (don't fail if some are missing)
    const cityDataPromises = citiesIdx.cities.map(city =>
      loadJSON(`./data/cities/${city.id}.json`)
        .then(data => ({ id: city.id, data }))
        .catch(error => {
          console.warn(`Could not load data for ${city.id}:`, error);
          return { id: city.id, data: null };
        })
    );

    const cityDataResults = await Promise.all(cityDataPromises);
    const cityData = {};
    cityDataResults.forEach(({ id, data }) => {
      if (data) cityData[id] = data;
    });

    // Load only available cities
    const availableCities = citiesIdx.cities.filter(c => c.available && cityData[c.id]);

    return {
      citiesIndex: citiesIdx,
      availableCities: availableCities,
      categories: categories.categories,
      fireTiers: fireTiers.tiers,
      defaults: defaults,
      householdModels: householdModels.models,
      cityData
    };
  } catch (error) {
    console.error('Failed to load application data:', error);
    throw error;
  }
}
