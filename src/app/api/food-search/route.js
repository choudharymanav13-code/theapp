// src/app/api/food-search/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { searchFallbackFoods } from '@/data/fallbackFoods';

// Packaged products (your list)
const PACKAGED_PRODUCTS = [
  { code: "8902080000227", name: "Sting Energy", brand: "Sting", kcal_100g: 28, protein_100g: 0, carbs_100g: 7, fat_100g: 0, source: 'packaged' },
  { code: "8901058000290", name: "Maggi", brand: "Nestle", kcal_100g: 384, protein_100g: 8.14, carbs_100g: 59.6, fat_100g: 12.6, source: 'packaged' },
  { code: "8901491100519", name: "Kurkure", brand: "Kurkure", kcal_100g: 552, protein_100g: 6, carbs_100g: 56.4, fat_100g: 33.6, source: 'packaged' },
  { code: "8901491361026", name: "Masala Munch 10rs", brand: "PepsiCo India", kcal_100g: 558, protein_100g: 6.4, carbs_100g: 55.2, fat_100g: 34.7, source: 'packaged' },
  { code: "8901030921667", name: "Kissan", brand: "Kissan", kcal_100g: 133, protein_100g: 1.33, carbs_100g: 30.7, fat_100g: 0.667, source: 'packaged' },
  { code: "7622201756697", name: "Oreo", brand: "Cadbury", kcal_100g: 483, protein_100g: 0, carbs_100g: 71.9, fat_100g: 19.6, source: 'packaged' },
  { code: "8901030902932", name: "Tomato Ketchup", brand: "Kissan", kcal_100g: 133, protein_100g: 1.33, carbs_100g: 30.7, fat_100g: 0.667, source: 'packaged' },
  { code: "8901764092305", name: "Maaza Original 1.2ltr", brand: "Coca-Cola India", kcal_100g: 54, protein_100g: 0, carbs_100g: 13.5, fat_100g: 0, source: 'packaged' },
  { code: "8901063139374", name: "Bourbon", brand: "Britannia", kcal_100g: 494, protein_100g: 5, carbs_100g: 72.7, fat_100g: 20.3, source: 'packaged' },
  { code: "8901030897542", name: "Kissan Fresh Tomato", brand: "Kissan", kcal_100g: 133, protein_100g: 1.1, carbs_100g: 31, fat_100g: 0.4, source: 'packaged' },
];

function mapOFF(p) {
  return {
    code: p.code,
    name: p.product_name || "Unnamed",
    brand: p.brands || "Unknown",
    kcal_100g: p.nutriments?.["energy-kcal_100g"] ?? 0,
    protein_100g: p.nutriments?.["proteins_100g"] ?? 0,
    carbs_100g: p.nutriments?.["carbohydrates_100g"] ?? 0,
    fat_100g: p.nutriments?.["fat_100g"] ?? 0,
    source: 'off'
  };
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const barcode = (searchParams.get('barcode') || '').trim();
  const pageSize = Number(searchParams.get('pageSize') || 20);
  const countries = searchParams.get('countries') || 'india';

  let results = [];

  // 1) Barcode flow
  if (barcode) {
    // packaged first (trusted)
    const packagedMatch = PACKAGED_PRODUCTS.filter(p => p.code === barcode);
    if (packagedMatch.length > 0) {
      // ALSO query OFF for additional matches (if you want both)
      // we return packaged first then off result (if any)
      let offMatch = [];
      try {
        const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`);
        const d = await r.json();
        if (d?.product) offMatch = [mapOFF(d.product)].filter(x => x.kcal_100g > 0);
      } catch (err) {
        console.error('OFF barcode fetch error', err);
      }
      results = [...packagedMatch, ...offMatch];
      return NextResponse.json(results);
    }

    // if no packaged match, try OFF barcode lookup
    try {
      const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`);
      const d = await r.json();
      if (d?.product) {
        const m = mapOFF(d.product);
        if (m.kcal_100g > 0) return NextResponse.json([m]);
      }
    } catch (err) {
      console.error('OFF barcode lookup error', err);
    }

    // last chance: try staples by text match of barcode string (rare)
    const fallback = searchFallbackFoods(barcode, null, 1);
    return NextResponse.json(fallback);
  }

  // 2) Text search: staples + packaged + OFF (filtered)
  if (q) {
    // staples (fuzzy via your fallback)
    const staples = searchFallbackFoods(q, null, pageSize);

    // packaged
    const packaged = PACKAGED_PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      p.code.includes(q)
    );

    // OFF global search (only if still need more or always include)
    let offResults = [];
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=${pageSize}&sort_by=popularity_key&countries_tags_en=${encodeURIComponent(countries)}`;
      const r = await fetch(url);
      const d = await r.json();
      offResults = (d.products || []).map(mapOFF).filter(x => x.kcal_100g > 0);
    } catch (err) {
      console.error('OFF search error', err);
    }

    // Merge — staples first, packaged next, then OFF
    results = [...staples, ...packaged, ...offResults];
    return NextResponse.json(results);
  }

  // 3) Default: return staples
  return NextResponse.json([]);
}
