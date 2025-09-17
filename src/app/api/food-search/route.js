export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';
import { searchFallbackFoods } from '@/data/fallbackFoods';

// ----------------- Packaged foods -----------------
const PACKAGED_PRODUCTS = [
  { code: "8902080000227", name: "Sting Energy", brand: "Sting", kcal_100g: 28, protein_100g: 0, carbs_100g: 7, fat_100g: 0 },
  { code: "8901058000290", name: "Maggi", brand: "Nestle", kcal_100g: 384, protein_100g: 8.14, carbs_100g: 59.6, fat_100g: 12.6 },
  { code: "8901491100519", name: "Kurkure", brand: "Kurkure", kcal_100g: 552, protein_100g: 6, carbs_100g: 56.4, fat_100g: 33.6 },
  { code: "8901491361026", name: "Masala Munch 10rs", brand: "PepsiCo India", kcal_100g: 558, protein_100g: 6.4, carbs_100g: 55.2, fat_100g: 34.7 },
  { code: "8901030921667", name: "Kissan", brand: "Kissan", kcal_100g: 133, protein_100g: 1.33, carbs_100g: 30.7, fat_100g: 0.667 },
  { code: "7622201756697", name: "Oreo", brand: "Cadbury", kcal_100g: 483, protein_100g: 0, carbs_100g: 71.9, fat_100g: 19.6 },
  { code: "8901030902932", name: "Tomato Ketchup", brand: "Kissan", kcal_100g: 133, protein_100g: 1.33, carbs_100g: 30.7, fat_100g: 0.667 },
  { code: "8901764092305", name: "Maaza Original 1.2ltr", brand: "Coca-Cola India", kcal_100g: 54, protein_100g: 0, carbs_100g: 13.5, fat_100g: 0 },
  { code: "8901063139374", name: "Bourbon", brand: "Britannia", kcal_100g: 494, protein_100g: 5, carbs_100g: 72.7, fat_100g: 20.3 },
  { code: "8901030897542", name: "Kissan Fresh Tomato", brand: "Kissan", kcal_100g: 133, protein_100g: 1.1, carbs_100g: 31, fat_100g: 0.4 }
];

// ----------------- Helper to map OFF results -----------------
function mapOFF(p) {
  return {
    code: p.code,
    name: p.product_name || "Unnamed",
    brand: p.brands || "Unknown",
    kcal_100g: p.nutriments?.["energy-kcal_100g"] ?? 0,
    protein_100g: p.nutriments?.["proteins_100g"] ?? 0,
    carbs_100g: p.nutriments?.["carbohydrates_100g"] ?? 0,
    fat_100g: p.nutriments?.["fat_100g"] ?? 0,
    source: "off"
  };
}

// ----------------- Handler -----------------
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim().toLowerCase();
  const barcode = (searchParams.get('barcode') || '').trim();

  let results = [];

  if (barcode) {
    // 1) Barcode → packaged first
    const packaged = PACKAGED_PRODUCTS.filter(p => p.code === barcode);
    if (packaged.length > 0) return NextResponse.json(packaged);

    // 2) fallback → OFF barcode API
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();
      if (data?.product) return NextResponse.json([mapOFF(data.product)]);
    } catch (err) {
      console.error("OFF barcode fetch error:", err);
    }

    // 3) last chance → try staples (matches only aliases/names, not real barcodes)
    const fallback = searchFallbackFoods(barcode, null, 1);
    return NextResponse.json(fallback);
  }

  if (q) {
    // 1) Staples
    const staples = searchFallbackFoods(q, null, 20);

    // 2) Packaged
    const packaged = PACKAGED_PRODUCTS.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      p.code.includes(q)
    );

    // 3) OFF global search
    let offResults = [];
    try {
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=20&sort_by=popularity_key`;
      const res = await fetch(url);
      const data = await res.json();
      offResults = (data.products || []).map(mapOFF).filter(x => x.kcal_100g > 0);
    } catch (err) {
      console.error("OFF search error:", err);
    }

    results = [...staples, ...packaged, ...offResults];
    return NextResponse.json(results);
  }

  // Default → show staples
  const staples = searchFallbackFoods('', null, 20);
  return NextResponse.json(staples);
}
