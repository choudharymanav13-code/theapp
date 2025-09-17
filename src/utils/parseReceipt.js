// src/utils/parseReceipt.js
import { searchFallbackFoods } from '../data/fallbackFoods';

// 1. Parse raw text into structured items
export function parseReceiptText(raw) {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);

  const items = lines.map(line => {
    // Try to capture "Name 200g" style
    const match = line.match(/(.+?)\s+(\d+)\s*(g|ml|kg|l|pcs|pc|pack)?$/i);
    if (match) {
      let qty = parseInt(match[2], 10);
      let unit = match[3] ? match[3].toLowerCase() : 'g';

      // Normalize kg/l to g/ml
      if (unit === 'kg') { qty *= 1000; unit = 'g'; }
      if (unit === 'l') { qty *= 1000; unit = 'ml'; }

      return { name: match[1].trim(), qty, unit };
    }
    return { name: line, qty: null, unit: null };
  });

  return items;
}

// 2. Enrich with nutrition info
export async function enrichWithNutrition(items) {
  const enriched = [];

  for (const item of items) {
    try {
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(item.name)}&countries=india`);
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        const best = data[0];
        enriched.push({
          ...item,
          calories_per_100g: best.kcal_100g ?? null,
          protein_100g: best.protein_100g ?? null,
          carbs_100g: best.carbs_100g ?? null,
          fat_100g: best.fat_100g ?? null,
          brand: best.brand ?? null,
          barcode: best.code ?? null,
          source: 'off'
        });
        continue;
      }

      // fallback
      const fb = searchFallbackFoods(item.name);
      if (fb.length > 0) {
        enriched.push({
          ...item,
          calories_per_100g: fb[0].kcal_100g,
          protein_100g: fb[0].protein_100g,
          carbs_100g: fb[0].carbs_100g,
          fat_100g: fb[0].fat_100g,
          brand: fb[0].brand,
          barcode: fb[0].code,
          source: 'fallback'
        });
        continue;
      }

      // If nothing found
      enriched.push({ ...item, calories_per_100g: null, source: 'none' });
    } catch (err) {
      console.error('Nutrition lookup failed:', err);
      enriched.push({ ...item, calories_per_100g: null, source: 'error' });
    }
  }

  return enriched;
}
