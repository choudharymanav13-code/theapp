// src/utils/parseReceipt.js
import { searchFallbackFoods } from '../data/fallbackFoods';

/* -------- Basic line parser -------- */
export function parseReceiptText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const blacklist = [
    /^🛒/i, /^date/i, /^item/i, /^total/i, /^amount/i,
    /^rate/i, /^qty/i, /^customer/i
  ];

  const items = [];
  for (const line of lines) {
    if (blacklist.some(re => re.test(line))) continue;

    // Extract quantity if present (e.g., "Basmati Rice (5kg)")
    const qtyMatch = line.match(/(\d+)\s?(g|kg|ml|ltr|l|pack|x)/i);
    let qty = 1, unit = 'count';
    if (qtyMatch) {
      qty = parseInt(qtyMatch[1]);
      unit = qtyMatch[2].toLowerCase();
      if (unit === 'kg') { qty = qty * 1000; unit = 'g'; }
      if (unit === 'ltr' || unit === 'l') { qty = qty * 1000; unit = 'ml'; }
    }

    // Remove price if present
    const cleanName = line.replace(/\d+(\.\d+)?/g, '').replace(/₹/g, '').trim();

    items.push({ name: cleanName, qty, unit });
  }

  return items;
}

/* -------- Enrich with OFF + fallback -------- */
export async function enrichWithNutrition(items) {
  const enriched = [];

  for (const item of items) {
    try {
      const res = await fetch(`/api/food-search?q=${encodeURIComponent(item.name)}`);
      const data = await res.json();
      let best = Array.isArray(data) && data.length > 0 ? data[0] : null;

      if (!best) {
        // try fallback
        const fallback = searchFallbackFoods(item.name);
        if (fallback) best = fallback;
      }

      enriched.push({
        ...item,
        brand: best?.brand || '',
        barcode: best?.code || '',
        calories_per_100g: best?.kcal_100g || '',
        protein_100g: best?.protein_100g || '',
        carbs_100g: best?.carbs_100g || '',
        fat_100g: best?.fat_100g || '',
        source: best ? (best.fallback ? 'fallback' : 'OFF') : 'none'
      });
    } catch (err) {
      console.error('Nutrition lookup failed', err);
      enriched.push({ ...item, source: 'error' });
    }
  }

  return enriched;
}
