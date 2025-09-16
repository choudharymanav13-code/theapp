// src/app/api/food-search/route.js
import { NextResponse } from 'next/server';

// Ensure no framework-level caching of this handler
export const runtime = 'nodejs';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

/**
 * GET /api/food-search?q=paneer
 * Returns: {
 *   query: { raw, normalized },
 *   source: 'v2' | 'v1' | 'none',
 *   products: [{ name, brand, kcal_100g, protein_100g, carbs_100g, fat_100g, code }],
 *   error?
 * }
 *
 * Notes:
 * - OFF search can be cached; use `nocache=1` for fresh results (per OFF docs). 
 * - v2 first, v1 fallback; keep results that have ANY nutrient.
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
  if (!qRaw || qRaw.length < 2) {
    const res = NextResponse.json({ query: { raw: qRaw, normalized: '' }, source: 'none', products: [] });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res;
  }

  const q = normalizeQuery(qRaw);

  // Minimal headers (some hosts disallow setting User-Agent programmatically)
  const headers = { Accept: 'application/json' };

  const fields = 'code,product_name,brands,nutriments,languages_tags,countries_tags';
  const size = 24;

  const v2Url =
    `https://world.openfoodfacts.org/api/v2/search` +
    `?fields=${encodeURIComponent(fields)}` +
    `&page_size=${size}` +
    `&sort_by=popularity_key` +
    `&search_terms=${encodeURIComponent(q)}` +
    `&lc=en` +
    `&nocache=1`;

  let source = 'none';
  try {
    // v2 first
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
      source = arr.length ? 'v1' : 'none';
    } else {
      source = 'v2';
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
      .filter(
        (x) =>
          x.kcal_100g != null ||
          x.protein_100g != null ||
          x.carbs_100g != null ||
          x.fat_100g != null
      );

    // Log to Vercel function logs so we can see what the server did
    console.log('[food-search]', { qRaw, q, count: out.length, source });

    const res = NextResponse.json({ query: { raw: qRaw, normalized: q }, source, products: out });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res;
  } catch (err) {
    console.error('[food-search:ERROR]', qRaw, err);
    const res = NextResponse.json(
      { query: { raw: qRaw, normalized: q }, source, products: [], error: String(err?.message || err) },
      { status: 200 }
    );
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return res;
  }
}
