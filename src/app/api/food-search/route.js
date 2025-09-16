// src/app/api/food-search/route.js
import { NextResponse } from 'next/server';

// Deduplicate by name+brand
function uniqueByNameBrand(list) {
  const seen = new Set();
  const out = [];
  for (const x of list) {
    const key = `${(x.name || '').toLowerCase()}|${(x.brand || '').toLowerCase()}`;
    if (!seen.has(key)) { seen.add(key); out.push(x); }
  }
  return out;
}

async function loadFallbackModule() {
  // Try both canonical locations; if both fail, return empty fallbacks gracefully.
  try {
    // Preferred: src/data/fallbackFoods.js  (3 ups from this file)
    return await import('../../../data/fallbackFoods.js');
  } catch {
    try {
      // Alternate: src/app/data/fallbackFoods.js  (2 ups)
      return await import('../../data/fallbackFoods.js');
    } catch {
      console.error('[food-search] fallbackFoods module not found in either path.');
      return {
        CATEGORIES: ['Staples','Oils','Vegetables','Fruits','Grains & Pulses','Dairy'],
        searchFallbackFoods: () => []
      };
    }
  }
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const category = (searchParams.get('category') || 'All').trim();
  const size = Number(searchParams.get('size') || 20);

  const { CATEGORIES, searchFallbackFoods } = await loadFallbackModule();

  // Always compute some fallback suggestions (esp. for category tabs)
  const fallbackList = searchFallbackFoods(q, category, size);

  // OFF search (only if we have a meaningful query)
  let offResults = [];
  if (q.length >= 2) {
    const headers = {
      // Use your actual Vercel URL to be a good citizen with OFF
      'User-Agent': 'PantryCoach/1.0 (+https://YOUR-VERCEL-URL.vercel.app)',
      'Accept': 'application/json'
    };

    const fields = 'code,product_name,brands,nutriments';

    // Try v2 first
    const v2Url =
      `https://world.openfoodfacts.org/api/v2/search` +
      `?fields=${encodeURIComponent(fields)}` +
      `&page_size=${size}` +
      `&sort_by=popularity_key` +
      `&search_terms=${encodeURIComponent(q)}` +
      `&nocache=1`;

    try {
      let resp = await fetch(v2Url, { headers, cache: 'no-store' });
      let data = await resp.json();
      let arr = Array.isArray(data?.products) ? data.products : [];

      // If v2 returns little or nothing, try v1 with looser matching and India bias
      if (!arr.length || arr.length < 5) {
        const v1Url =
          `https://world.openfoodfacts.org/cgi/search.pl` +
          `?action=process&json=1` +
          `&search_terms=${encodeURIComponent(q)}` +
          `&search_simple=1` +                        // looser matching
          `&countries_tags_en=india` +                // improve relevance for India
          `&page_size=${size}` +
          `&fields=${encodeURIComponent(fields)}` +
          `&nocache=1`;
        resp = await fetch(v1Url, { headers, cache: 'no-store' });
        data = await resp.json();
        arr = Array.isArray(data?.products) ? data.products : arr;
      }

      // Map to clean shape
      const mapped = arr.map(p => {
        const n = p.nutriments || {};
        let kcal = n['energy-kcal_100g'];
        if (kcal == null && n['energy_100g'] != null) {
          kcal = Number(n['energy_100g']) / 4.184; // kJ -> kcal approx
        }
        return {
          code: p.code || null,
          name: p.product_name || '',
          brand: (p.brands || '').split(',')[0]?.trim() || '',
          kcal_100g: kcal != null ? Math.round(Number(kcal)) : null,
          protein_100g: n['proteins_100g'] != null ? Number(n['proteins_100g']) : null,
          carbs_100g: n['carbohydrates_100g'] != null ? Number(n['carbohydrates_100g']) : null,
          fat_100g: n['fat_100g'] != null ? Number(n['fat_100g']) : null,
          source: 'off',
        };
      });

      // Keep items with macros; if too few remain, relax and keep all mapped
      let kept = mapped.filter(x =>
        x.kcal_100g != null ||
        x.protein_100g != null ||
        x.carbs_100g != null ||
        x.fat_100g != null
      );
      if (kept.length < 5) kept = mapped;

      offResults = kept;
    } catch (e) {
      console.error('[food-search] OFF error:', e);
      offResults = [];
    }
  }

  // Merge: OFF first, then fallback. Deduplicate by name+brand.
  const merged = uniqueByNameBrand([
    ...offResults,
    ...fallbackList,
  ]);

  return NextResponse.json({
    products: merged.slice(0, size),
    categories: ['All', ...CATEGORIES],
  });
}
