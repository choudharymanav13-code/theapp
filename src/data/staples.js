// src/data/staples.js
// Approximate nutrition per 100g (or per 100 ml for liquids). Values are typical averages.
// You can tweak these later. All items return in the same shape as OFF results.

export const STAPLES = [
  /* Oils & Ghee */
  { key: 'sunflower-oil', name: 'Sunflower Oil', category: 'oils', kcal_100g: 884, protein_100g: 0, carbs_100g: 0, fat_100g: 100, synonyms: ['sunflower oil', 'refined oil'] },
  { key: 'mustard-oil',   name: 'Mustard Oil',   category: 'oils', kcal_100g: 884, protein_100g: 0, carbs_100g: 0, fat_100g: 100, synonyms: ['sarson ka tel', 'rai oil'] },
  { key: 'groundnut-oil', name: 'Groundnut (Peanut) Oil', category: 'oils', kcal_100g: 884, protein_100g: 0, carbs_100g: 0, fat_100g: 100, synonyms: ['peanut oil', 'moongphali tel'] },
  { key: 'olive-oil',     name: 'Olive Oil',     category: 'oils', kcal_100g: 884, protein_100g: 0, carbs_100g: 0, fat_100g: 100, synonyms: ['extra virgin olive oil', 'pomace oil'] },
  { key: 'ghee',          name: 'Ghee',          category: 'oils', kcal_100g: 900, protein_100g: 0, carbs_100g: 0, fat_100g: 100, synonyms: ['clarified butter', 'desi ghee'] },

  /* Vegetables */
  { key: 'onion',   name: 'Onion',   category: 'vegetables', kcal_100g: 40, protein_100g: 1.1, carbs_100g: 9.3, fat_100g: 0.1, synonyms: ['pyaz'] },
  { key: 'tomato',  name: 'Tomato',  category: 'vegetables', kcal_100g: 18, protein_100g: 0.9, carbs_100g: 3.9, fat_100g: 0.2, synonyms: ['tamatar'] },
  { key: 'potato',  name: 'Potato',  category: 'vegetables', kcal_100g: 77, protein_100g: 2.0, carbs_100g: 17,  fat_100g: 0.1, synonyms: ['aloo'] },
  { key: 'spinach', name: 'Spinach', category: 'vegetables', kcal_100g: 23, protein_100g: 2.9, carbs_100g: 3.6, fat_100g: 0.4, synonyms: ['palak'] },
  { key: 'okra',    name: 'Okra',    category: 'vegetables', kcal_100g: 33, protein_100g: 1.9, carbs_100g: 7.0, fat_100g: 0.2, synonyms: ['bhindi', 'lady finger'] },

  /* Fruits */
  { key: 'banana', name: 'Banana', category: 'fruits', kcal_100g: 89, protein_100g: 1.1, carbs_100g: 23, fat_100g: 0.3, synonyms: ['kela'] },
  { key: 'apple',  name: 'Apple',  category: 'fruits', kcal_100g: 52, protein_100g: 0.3, carbs_100g: 14, fat_100g: 0.2, synonyms: ['seb'] },
  { key: 'mango',  name: 'Mango',  category: 'fruits', kcal_100g: 60, protein_100g: 0.8, carbs_100g: 15, fat_100g: 0.4, synonyms: ['aam'] },

  /* Grains & Cereals */
  { key: 'basmati-rice', name: 'Basmati Rice (raw)', category: 'grains', kcal_100g: 365, protein_100g: 7.1, carbs_100g: 78, fat_100g: 0.8, synonyms: ['rice', 'chawal'] },
  { key: 'atta',         name: 'Wheat Flour (Atta)', category: 'grains', kcal_100g: 364, protein_100g: 12, carbs_100g: 76, fat_100g: 1.5, synonyms: ['atta', 'chapati flour', 'roti flour'] },
  { key: 'poha',         name: 'Flattened Rice (Poha)', category: 'grains', kcal_100g: 364, protein_100g: 6.7, carbs_100g: 76, fat_100g: 1.0, synonyms: ['poha', 'beaten rice'] },
  { key: 'oats',         name: 'Oats', category: 'grains', kcal_100g: 389, protein_100g: 17, carbs_100g: 66, fat_100g: 7, synonyms: ['rolled oats'] },

  /* Pulses (Dals) */
  { key: 'toor',  name: 'Toor Dal (Pigeon Pea Split)', category: 'pulses', kcal_100g: 343, protein_100g: 22, carbs_100g: 62, fat_100g: 1.7, synonyms: ['arhar', 'tuvar'] },
  { key: 'moong', name: 'Moong Dal (Split Mung)',      category: 'pulses', kcal_100g: 347, protein_100g: 24, carbs_100g: 63, fat_100g: 1.2, synonyms: ['mung'] },
  { key: 'chana', name: 'Chana Dal (Split Bengal Gram)', category: 'pulses', kcal_100g: 364, protein_100g: 20, carbs_100g: 60, fat_100g: 6, synonyms: ['bengal gram', 'chickpea split'] },
  { key: 'rajma', name: 'Rajma (Kidney Beans, raw)',   category: 'pulses', kcal_100g: 333, protein_100g: 24, carbs_100g: 60, fat_100g: 0.8, synonyms: ['kidney beans'] },

  /* Dairy Basics */
  { key: 'paneer', name: 'Paneer',       category: 'dairy', kcal_100g: 265, protein_100g: 18, carbs_100g: 3.6, fat_100g: 20, synonyms: ['cottage cheese'] },
  { key: 'curd',   name: 'Curd / Yogurt', category: 'dairy', kcal_100g: 61,  protein_100g: 3.5, carbs_100g: 4.7, fat_100g: 3.3, synonyms: ['dahi', 'yogurt'] },
  { key: 'milk',   name: 'Milk (whole)',  category: 'dairy', kcal_100g: 61,  protein_100g: 3.2, carbs_100g: 4.8, fat_100g: 3.3, synonyms: ['doodh', 'uht milk'] },
];

// helper to shape like OFF output (with origin flag)
function stapleToResult(s) {
  return {
    code: s.key,
    name: s.name,
    brand: '',
    kcal_100g: s.kcal_100g,
    protein_100g: s.protein_100g,
    carbs_100g: s.carbs_100g,
    fat_100g: s.fat_100g,
    origin: 'local',
    category: s.category,
  };
}

export function filterStaples({ q = '', cat = 'all', limit = 20 }) {
  const needle = q.trim().toLowerCase();
  const match = (s) => {
    const inCat = cat === 'all' || cat === 'staples' || s.category === cat || (cat === 'staples' && ['grains','pulses','oils','dairy'].includes(s.category));
    if (!needle) return inCat;
    const base = s.name.toLowerCase();
    const syn = (s.synonyms || []).join(' ').toLowerCase();
    return inCat && (base.includes(needle) || syn.includes(needle));
  };

  const scored = STAPLES.filter(match).map(s => {
    const base = s.name.toLowerCase();
    const score =
      !needle ? 0 :
      base.startsWith(needle) ? 100 :
      base.includes(needle) ? 80 :
      (s.synonyms || []).some(x => x.toLowerCase().includes(needle)) ? 60 : 0;
    return { s, score };
  });

  scored.sort((a, b) => b.score - a.score || a.s.name.localeCompare(b.s.name));
  return scored.slice(0, limit).map(x => stapleToResult(x.s));
}
