export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

// Local India-focused dataset (expand over time)
const localProducts = [
  { code: "8902080000227", name: "Sting Energy", brand: "Sting", kcal_100g: 28, protein_100g: 0, carbs_100g: 7, fat_100g: 0 },
  { code: "8901058000290", name: "Maggi", brand: "Nestle", kcal_100g: 384, protein_100g: 8.14, carbs_100g: 59.6, fat_100g: 12.6 },
  { code: "8901491100519", name: "Kurkure", brand: "Kurkure", kcal_100g: 552, protein_100g: 6, carbs_100g: 56.4, fat_100g: 33.6 },
  { code: "8901491361026", name: "Masala Munch 10rs", brand: "PepsiCo India Holdings Pvt. Ltd", kcal_100g: 558, protein_100g: 6.4, carbs_100g: 55.2, fat_100g: 34.7 },
  { code: "8901030921667", name: "Kissan", brand: "Kissan", kcal_100g: 133, protein_100g: 1.33, carbs_100g: 30.7, fat_100g: 0.667 },
  { code: "7622201756697", name: "Oreo", brand: "Cadbury", kcal_100g: 483, protein_100g: null, carbs_100g: 71.9, fat_100g: 19.6 },
  { code: "8901030902932", name: "Tomato Ketchup", brand: "Kissan", kcal_100g: 133, protein_100g: 1.33, carbs_100g: 30.7, fat_100g: 0.667 },
  { code: "8901764092305", name: "Maaza Original 1.2ltr", brand: "Hindustan Coca-Cola Beverages Pvt Ltd.", kcal_100g: 54, protein_100g: 0, carbs_100g: 13.5, fat_100g: 0 },
  { code: "8901063139374", name: "Bourbon", brand: "Britannia", kcal_100g: 494, protein_100g: 5, carbs_100g: 72.7, fat_100g: 20.3 },
  { code: "8901030897542", name: "Kissan Fresh Tomato", brand: "Kissan", kcal_100g: 133, protein_100g: 1.1, carbs_100g: 31, fat_100g: 0.4 }
];

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase().trim();
  const barcode = searchParams.get("barcode")?.trim();

  // Empty query -> empty list
  if (!q && !barcode) return NextResponse.json({ products: [] });

  // 1) If barcode present -> local first, then OFF barcode endpoint
  if (barcode) {
    const localMatch = localProducts.find((p) => p.code === barcode);
    if (localMatch) return NextResponse.json({ products: [localMatch] });

    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`);
      const data = await res.json();
      if (data?.product) {
        const p = data.product;
        const mapped = {
          code: p.code,
          name: p.product_name || "Unnamed",
          brand: p.brands || "Unknown",
          kcal_100g: p.nutriments?.["energy-kcal_100g"] ?? 0,
          protein_100g: p.nutriments?.["proteins_100g"] ?? 0,
          carbs_100g: p.nutriments?.["carbohydrates_100g"] ?? 0,
          fat_100g: p.nutriments?.["fat_100g"] ?? 0
        };
        return NextResponse.json({ products: [mapped] });
      }
    } catch (err) {
      console.error("Barcode lookup error:", err);
    }
    return NextResponse.json({ products: [] });
  }

  // 2) Text search: local-first matching (name/brand/code), then fallback to OFF
  if (q) {
    const localMatches = localProducts.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q) ||
      p.code.includes(q)
    );
    if (localMatches.length > 0) {
      return NextResponse.json({ products: localMatches });
    }

    // fallback to OpenFoodFacts search
    try {
      const countries = searchParams.get("countries") || "india";
      const pageSize = searchParams.get("pageSize") || "20";
      const page = searchParams.get("page") || "1";
      const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&json=1&page_size=${pageSize}&page=${page}&sort_by=popularity_key&countries_tags_en=${encodeURIComponent(countries)}`;
      const res = await fetch(url);
      const data = await res.json();
      const mapped = (data.products || []).map((p) => ({
        code: p.code,
        name: p.product_name || "Unnamed",
        brand: p.brands || "Unknown",
        kcal_100g: p.nutriments?.["energy-kcal_100g"] ?? 0,
        protein_100g: p.nutriments?.["proteins_100g"] ?? 0,
        carbs_100g: p.nutriments?.["carbohydrates_100g"] ?? 0,
        fat_100g: p.nutriments?.["fat_100g"] ?? 0
      }));
      return NextResponse.json({ products: mapped });
    } catch (err) {
      console.error("Search fallback error:", err);
      return NextResponse.json({ products: [] });
    }
  }

  return NextResponse.json({ products: [] });
}
