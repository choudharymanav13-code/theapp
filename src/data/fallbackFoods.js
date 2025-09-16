// src/data/fallbackFoods.js
// Nutrition values are approximate per 100g (or 100ml for milk) for common Indian staples.
// You can adjust later as you prefer.

export const CATEGORIES = [
  'Staples',          // general staples if you don't want to pick a specific sub-category
  'Oils',
  'Vegetables',
  'Fruits',
  'Grains & Pulses',
  'Dairy',
];

export const FALLBACK_FOODS = [
  // ---- Oils ----
  {
    key: 'oil-sunflower', name: 'Sunflower Oil', category: 'Oils',
    kcal_100g: 884, protein_100g: 0, carbs_100g: 0, fat_100g: 100,
    aliases: ['sunflower oil', 'refined oil']
  },
  {
    key: 'oil-mustard', name: 'Mustard Oil (Sarson)', category: 'Oils',
    kcal_100g: 884, protein_100g: 0, carbs_100g: 0, fat_100g: 100,
    aliases: ['sarson tel', 'mustard oil', 'kachi ghani']
  },
  {
    key: 'oil-groundnut', name: 'Groundnut Oil (Peanut)', category: 'Oils',
    kcal_100g: 884, protein_100g: 0, carbs_100g: 0, fat_100g: 100,
    aliases: ['peanut oil', 'groundnut oil', 'mungfali oil']
  },
  {
    key: 'oil-olive', name: 'Olive Oil', category: 'Oils',
    kcal_100g: 884, protein_100g: 0, carbs_100g: 0, fat_100g: 100,
    aliases: ['extra virgin olive oil', 'olive']
  },
  {
    key: 'ghee', name: 'Ghee', category: 'Oils',
    kcal_100g: 896, protein_100g: 0, carbs_100g: 0, fat_100g: 99.6,
    aliases: ['desi ghee', 'clarified butter']
  },

  // ---- Vegetables ----
  { key: 'veg-onion', name: 'Onion', category: 'Vegetables',
    kcal_100g: 40, protein_100g: 1.1, carbs_100g: 9.3, fat_100g: 0.1,
    aliases: ['pyaaz', 'onion'] },
  { key: 'veg-tomato', name: 'Tomato', category: 'Vegetables',
    kcal_100g: 18, protein_100g: 0.9, carbs_100g: 3.9, fat_100g: 0.2,
    aliases: ['tamatar', 'tomato'] },
  { key: 'veg-potato', name: 'Potato', category: 'Vegetables',
    kcal_100g: 77, protein_100g: 2, carbs_100g: 17, fat_100g: 0.1,
    aliases: ['aloo', 'potato'] },
  { key: 'veg-spinach', name: 'Spinach (Palak)', category: 'Vegetables',
    kcal_100g: 23, protein_100g: 2.9, carbs_100g: 3.6, fat_100g: 0.4,
    aliases: ['palak', 'spinach'] },
  { key: 'veg-okra', name: 'Okra (Bhindi)', category: 'Vegetables',
    kcal_100g: 33, protein_100g: 1.9, carbs_100g: 7.5, fat_100g: 0.2,
    aliases: ['bhindi', 'okra', 'lady finger'] },

  // ---- Fruits ----
  { key: 'fruit-banana', name: 'Banana', category: 'Fruits',
    kcal_100g: 89, protein_100g: 1.1, carbs_100g: 23, fat_100g: 0.3,
    aliases: ['banana', 'kela'] },
  { key: 'fruit-apple', name: 'Apple', category: 'Fruits',
    kcal_100g: 52, protein_100g: 0.3, carbs_100g: 14, fat_100g: 0.2,
    aliases: ['apple', 'seb'] },
  { key: 'fruit-mango', name: 'Mango', category: 'Fruits',
    kcal_100g: 60, protein_100g: 0.8, carbs_100g: 15, fat_100g: 0.4,
    aliases: ['mango', 'aam'] },

  // ---- Grains & Pulses ----
  { key: 'grain-rice', name: 'Rice (raw, white)', category: 'Grains & Pulses',
    kcal_100g: 365, protein_100g: 7.1, carbs_100g: 80, fat_100g: 0.6,
    aliases: ['chawal', 'rice', 'basmati'] },
  { key: 'grain-wheat-flour', name: 'Wheat Flour (Atta)', category: 'Grains & Pulses',
    kcal_100g: 364, protein_100g: 11.8, carbs_100g: 76, fat_100g: 1.7,
    aliases: ['atta', 'wheat flour'] },
  { key: 'grain-poha', name: 'Poha (Flattened Rice)', category: 'Grains & Pulses',
    kcal_100g: 350, protein_100g: 6.7, carbs_100g: 76, fat_100g: 1,
    aliases: ['poha', 'chivda', 'aval'] },
  { key: 'pulse-toor', name: 'Toor Dal (Arhar)', category: 'Grains & Pulses',
    kcal_100g: 343, protein_100g: 22.3, carbs_100g: 63.4, fat_100g: 1.7,
    aliases: ['toor dal', 'arhar'] },
  { key: 'pulse-moong', name: 'Moong Dal', category: 'Grains & Pulses',
    kcal_100g: 347, protein_100g: 24, carbs_100g: 63, fat_100g: 1.2,
    aliases: ['moong dal', 'green gram split'] },
  { key: 'pulse-chana', name: 'Chana Dal', category: 'Grains & Pulses',
    kcal_100g: 364, protein_100g: 20.8, carbs_100g: 60.8, fat_100g: 5.6,
    aliases: ['chana dal', 'bengal gram'] },
  { key: 'pulse-urad', name: 'Urad Dal', category: 'Grains & Pulses',
    kcal_100g: 341, protein_100g: 25.2, carbs_100g: 58.9, fat_100g: 1.6,
    aliases: ['urad dal', 'black gram'] },
  { key: 'pulse-masoor', name: 'Masoor Dal', category: 'Grains & Pulses',
    kcal_100g: 352, protein_100g: 24.6, carbs_100g: 60.1, fat_100g: 1.1,
    aliases: ['masoor dal', 'red lentil'] },
  { key: 'grain-oats', name: 'Oats (rolled)', category: 'Grains & Pulses',
    kcal_100g: 389, protein_100g: 16.9, carbs_100g: 66.3, fat_100g: 6.9,
    aliases: ['oats'] },

  // ---- Dairy ----
  { key: 'dairy-paneer', name: 'Paneer', category: 'Dairy',
    kcal_100g: 265, protein_100g: 18, carbs_100g: 1.2, fat_100g: 20,
    aliases: ['paneer', 'cottage cheese'] },
  { key: 'dairy-curd', name: 'Curd (Dahi, whole milk)', category: 'Dairy',
    kcal_100g: 61, protein_100g: 3.5, carbs_100g: 4.7, fat_100g: 3.3,
    aliases: ['dahi', 'curd', 'yogurt'] },
  { key: 'dairy-milk', name: 'Milk (Whole, 3.25%) per 100ml', category: 'Dairy',
    kcal_100g: 61, protein_100g: 3.2, carbs_100g: 4.8, fat_100g: 3.3,
    aliases: ['milk', 'doodh'] },
];

// Simple search over fallback foods.
// If q is empty and category provided, returns top items in that category.
export function searchFallbackFoods(q, category, limit = 20) {
  const needle = (q || '').trim().toLowerCase();
  let list = FALLBACK_FOODS;

  if (category && category !== 'All') {
    list = list.filter(x => x.category === category);
  }

  let out = list;
  if (needle) {
    out = list.filter(x => {
      const inName = x.name.toLowerCase().includes(needle);
      const inAliases = (x.aliases || []).some(a => a.toLowerCase().includes(needle));
      return inName || inAliases;
    });
  }

  return out.slice(0, limit).map(x => ({
    code: `fallback:${x.key}`,
    name: x.name,
    brand: '',
    kcal_100g: x.kcal_100g,
    protein_100g: x.protein_100g,
    carbs_100g: x.carbs_100g,
    fat_100g: x.fat_100g,
    category: x.category,
    source: 'fallback',
  }));
}
