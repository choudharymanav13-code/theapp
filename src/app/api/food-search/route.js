// src/app/api/food-search/route.js
import { NextResponse } from 'next/server';

// Force Node.js runtime (lets us use regular fetch semantics)
// and prevent any ISR/cache from persisting results.
export const runtime = 'nodejs';
export const revalidate = 0;          // Next.js: no ISR
export const dynamic = 'force-dynamic'; // ensure per-request run

/**
 * GET /api/food-search?q=paneer
 * Returns: { products: [{ name, brand, kcal_100g, protein_100g, carbs_100g, fat_100g, code }], error? }
 * Notes:
 * - Handles Indian synonyms (dahi->yogurt, poha->flattened rice, roti->chapati, etc.)
 * - Uses v2 search first, v1 as fallback
 * - Keeps a result if it has ANY nutrient (not all)
 * - Adds nocache=1 (OFF notes: search is cached) and prefers English labels
 */
const SYNONYMS = [
  [/^dahi$/i, 'yogurt'],
  [/^curd$/i, 'yogurt'],
  [/^paneer$/i, 'paneer'],
  [/^atta$/i, 'wheat flour'],
  [/^maida$/i, 'refined wheat flour'],
  [/^rava$|^suji$/i, 'semolina'],
  [/^poha$/i, 'flattened rice'],
  [/^roti$|^chapati$/i, 'chapati'],
  [/^dal$|^daal$/i, 'lentils'],
  [/^rajma$/i, 'kidney beans'],
  [/^chana$/i, 'chickpeas'],
  [/^toor dal$|^arhar$/i, 'pigeon peas'],
  [/^moong dal$/i, 'mung beans'],
  [/^bhindi$/i, 'okra'],
  [/^brinjal$/i, 'eggplant'],
  [/^capsicum$/i, 'bell pepper'],
  [/^methi$/i, 'fenugreek leaves'],
  [/^idli$/i, 'idli'],
  [/^dosa$/i, 'dosa'],
  [/^sambar$/i, 'sambar'],
  [/^upma$/i, 'upma'],
  [/^biryani$/i, 'biryani'],
];

function normalizeQuery(q) {
  const input = q.trim().toLowerCase();
  for (const [re, repl] of SYNONYMS) if (re.test(input)) return repl;
  return q.trim();
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const qRaw = (searchParams.get('q') ?? '').trim();
  if (!qRaw || qRaw.length < 2) return NextResponse.json({ products: [] });

  const q = normalizeQuery(qRaw);

  // OFF strongly recommends sending a User-Agent, but in some runtimes
  // setting it throws. We omit it for stability, and can re-add once confirmed.
  const headers = { Accept: 'application/json' };

  const fields = 'code,product_name,brands,nutriments,languages_tags,countries_tags';
  const size = 24;

  // Prefer v2 (lighter, field selection), with English label preference & nocache
  const v2Url =
    `https://world.openfoodfacts.org/api/v2/search` +
    `?fields=${encodeURIComponent(fields)}` +
    `&page_size=${size}` +
    `&sort_by=popularity_key` +
    `&search_terms=${encodeURIComponent(q)}` +
    `&lc=en` +              // prefer English
    `&nocache=1`;           // OFF: search is cached → request fresh

  try {
    // v2
    let resp = await fetch(v2Url, { headers, cache: 'no-store' });
    let data = await resp.json();
    let arr = Array.isArray(data?.products) ? data.products : [];

    // v1 fallback (bias to India)
    if (!arr.length) {
      const v1Url =
        `https://world.openfoodfacts.org/cgi/search.pl` +
        `?action=process&json=1` +
        `&fields=${encodeURIComponent(fields)}` +
        `&page_size=${size}` +
        `&sort_by=popularity` +
        `&search_terms=${encodeURIComponent(q)}` +
        `&tagtype_0=countries&tag_contains_0=contains&tag_0=india` +
        `&lc=en` +
        `&nocache=1`;
      resp = await fetch(v1Url, { headers, cache: 'no-store' });
      data = await resp.json();
      arr = Array.isArray(data?.products) ? data.products : [];
    }

    const out = arr
      .map((p) => {
        const n = p?.nutriments ?? {};
        let kcal = n['energy-kcal_100g'];
        if (kcal == null && n['energy_100g'] != null) {
          kcal = Number(n['energy_100g']) / 4.184; // kJ → kcal (approx)
        }
        return {
          code: p.code ?? null,
          name: p.product_name || '',
          brand: (p.brands || '').split(',')[0]?.trim() || '',
          kcal_100g: kcal != null ? Math.round(Number(kcal)) : null,
          protein_100g: n['proteins_100g'] != null ? Number(n['proteins_100g']) : null,
          carbs_100g: n['carbohydrates_100g'] != null ? Number(n['carbohydrates_100g']) : null,
          fat_100g: n['fat_100g'] != null ? Number(n['fat_100g']) : null,
        };
      })
      // RELAXED: keep if any nutrient present (else users think search is "broken")
      .filter(
        (x) =>
          x.kcal_100g != null ||
          x.protein_100g != null ||
          x.carbs_100g != null ||
          x.fat_100g != null
      );

    return NextResponse.json({ products: out });
  } catch (err) {
    // Surface the error to the UI so we can SEE it while testing.
    return NextResponse.json(
      { products: [], error: String(err?.message || err || 'Search failed') },
      { status: 200 }
    );
  }
}
