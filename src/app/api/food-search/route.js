// src/app/api/food-search/route.js
import { NextResponse } from 'next/server';
import { CATEGORIES, searchFallbackFoods } from '../../../data/fallbackFoods';

function uniqueByNameBrand(list) {
  const seen = new Set();
  const out = [];
  for (const x of list) {
    const key = `${(x.name || '').toLowerCase()}|${(x.brand || '').toLowerCase()}`;
    if (!seen.has(key)) { seen.add(key); out.push(x); }
  }
  return out;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();
  const category = (searchParams.get('category') || 'All').trim();
  const size = Number(searchParams.get('size') || 20);

  // Always offer some fallback if category is selected and query empty
  const fallbackFirst = searchFallbackFoods(q, category, size);

  // If no query at all and we have a category, we can return fallback immediately
  // (still append OFF if it yields relevant results)
  let offResults = [];

  if (q.length >= 2) {
    const headers = {
      // Recommended by OFF to avoid accidental blocking.
      // Replace with your live URL
      'User-Agent': 'PantryCoach/1.0 (+https://your-app.vercel.app)',
    };

    const fields = 'code,product_name,brands,nutriments';
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

      if (!arr.length) {
        const v1Url =
          `https://world.openfoodfacts.org/cgi/search.pl` +
          `?action=process&json=1` +
          `&fields=${encodeURIComponent(fields)}` +
          `&page_size=${size}` +
          `&search_terms=${encodeURIComponent(q)}` +
          `&nocache=1`;
        resp = await fetch(v1Url, { headers, cache: 'no-store' });
        data = await resp.json();
        arr = Array.isArray(data?.products) ? data.products : [];
      }

      offResults = arr.map(p => {
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
      })
      // keep items that have at least kcal or any macro
      .filter(x =>
        x.kcal_100g != null ||
        x.protein_100g != null ||
        x.carbs_100g != null ||
        x.fat_100g != null
      );
    } catch {
      offResults = [];
    }
  }

  // Merge logic:
  // 1) If OFF results are strong (>= 5), show OFF first and still append a few fallback that match query/category.
  // 2) If OFF is weak (< 5), append more fallback to guarantee relevant staples.
  const merged = uniqueByNameBrand([
    ...offResults,
    ...fallbackFirst,
  ]);

  // Optionally cap results
  const products = merged.slice(0, size);

  // Provide categories to the client so it can render tabs
  return NextResponse.json({
    products,
    categories: ['All', ...CATEGORIES],
  });
}
