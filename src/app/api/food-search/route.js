// src/app/api/food-search/route.js
import { NextResponse } from 'next/server';

/**
 * GET /api/food-search?q=paneer
 * Returns: { products: [{ name, brand, kcal_100g, protein_100g, carbs_100g, fat_100g, code }] }
 *
 * Uses OFF v2 /api/v2/search with selected fields; falls back to v1 /cgi/search.pl.
 * OFF advises sending a User-Agent header and supports nocache=1; we do both.
 */
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ products: [] });
  }

  const headers = {
    // Recommended by OFF to avoid being blocked by mistake.
    // Replace URL below with your live Vercel URL once deployed.
    'User-Agent': 'PantryCoach/1.0 (+https://your-app.vercel.app)',
  };

  // We want only what we need to keep payload small.
  const fields = 'code,product_name,brands,nutriments';
  const size = 20;

  const v2Url =
    `https://world.openfoodfacts.org/api/v2/search` +
    `?fields=${encodeURIComponent(fields)}` +
    `&page_size=${size}` +
    `&sort_by=popularity_key` +
    `&search_terms=${encodeURIComponent(q)}` +
    `&nocache=1`;

  try {
    let resp = await fetch(v2Url, { headers });
    let data = await resp.json();
    let arr = Array.isArray(data?.products) ? data.products : [];

    // Fallback to v1 if v2 yields nothing (or the param changes)
    if (!arr.length) {
      const v1Url =
        `https://world.openfoodfacts.org/cgi/search.pl` +
        `?action=process&json=1` +
        `&fields=${encodeURIComponent(fields)}` +
        `&page_size=${size}` +
        `&search_terms=${encodeURIComponent(q)}` +
        `&nocache=1`;
      resp = await fetch(v1Url, { headers });
      data = await resp.json();
      arr = Array.isArray(data?.products) ? data.products : [];
    }

    // Map to a clean shape for the UI
    const out = arr
      .map((p) => {
        const n = p.nutriments || {};
        // Prefer OFF's kcal field. If only energy_100g exists (kJ), convert to kcal (~ / 4.184).
        // OFF stores energy in both kcal and kJ fields when available.
        let kcal = n['energy-kcal_100g'];
        if (kcal == null && n['energy_100g'] != null) {
          kcal = Number(n['energy_100g']) / 4.184; // approximate conversion
        }
        return {
          code: p.code || null,
          name: p.product_name || '',
          brand: (p.brands || '').split(',')[0]?.trim() || '',
          kcal_100g: kcal != null ? Math.round(Number(kcal)) : null,
          protein_100g:
            n['proteins_100g'] != null ? Number(n['proteins_100g']) : null,
          carbs_100g:
            n['carbohydrates_100g'] != null
              ? Number(n['carbohydrates_100g'])
              : null,
          fat_100g: n['fat_100g'] != null ? Number(n['fat_100g']) : null,
        };
      })
      // keep results that have at least kcal or any macro
      .filter(
        (x) =>
          x.kcal_100g != null ||
          x.protein_100g != null ||
          x.carbs_100g != null ||
          x.fat_100g != null
      );

    return NextResponse.json({ products: out });
  } catch (err) {
    return NextResponse.json(
      { products: [], error: err?.message || 'Search failed' },
      { status: 200 }
    );
  }
}
