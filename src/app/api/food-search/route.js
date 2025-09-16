// src/app/api/food-search/route.js
import { NextResponse } from 'next/server';

// Make this route always dynamic and uncached
export const runtime = 'nodejs';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

/**
 * Strategy:
 *  1) v2 search (light fields, English label pref, nocache)
 *  2) If low-quality matches, v2 again with category hints for Indian staples
 *  3) If still low-quality, v1 with search_simple=1 (+ India bias) [older API handles free-text well]
 * OFF notes: v2 allows field selection & tags; v1's search is cached unless you add `nocache=1`/`no_cache=1`. [1](https://github.com/openfoodfacts/openfoodfacts-server)[2](https://wiki.openfoodfacts.org/API_Fields)
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

// Optional v2 "hints" per term → add a category filter to guide results
function hintParamsForV2(qNorm) {
  if (/paneer/i.test(qNorm)) return '&categories_tags_en=cheeses';
  if (/roti|chapati/i.test(qNorm)) return '&categories_tags_en=flatbreads';
  if (/poha|flattened\s*rice/i.test(qNorm)) return '&categories_tags_en=breakfast-cereals';
  if (/dal|lentil/i.test(qNorm)) return '&categories_tags_en=legumes';
  if (/dahi|yogurt|curd/i.test(qNorm)) return '&categories_tags_en=yogurts';
  return '';
}

function toOut(products) {
  return products
    .map((p) => {
      const n = p?.nutriments ?? {};
      let kcal = n['energy-kcal_100g'];
      if (kcal == null && n['energy_100g'] != null) {
        kcal = Number(n['energy_100g']) / 4.184; // kJ → kcal
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
    // keep if any nutrient exists
    .filter(
      (x) =>
        x.kcal_100g != null ||
        x.protein_100g != null ||
        x.carbs_100g != null ||
        x.fat_100g != null
    );
}

// Quick relevance check: do top names contain the query?
function isLowQuality(list, qNorm) {
  if (!list.length) return true;
  const top = list.slice(0, 8);
  const hits = top.reduce((acc, p) => {
    const name = (p.product_name || '').toLowerCase();
    const brand = (p.brands || '').toLowerCase();
    return acc + (name.includes(qNorm.toLowerCase()) || brand.includes(qNorm.toLowerCase()) ? 1 : 0);
  }, 0);
  return hits < 2; // tweakable threshold
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const qRaw = (searchParams.get('q') ?? '').trim();
  const resHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

  if (!qRaw || qRaw.length < 2) {
    return new NextResponse(JSON.stringify({ query: { raw: qRaw, normalized: '' }, source: 'none', products: [] }), {
      status: 200,
      headers: resHeaders,
    });
  }

  const q = normalizeQuery(qRaw);
  const headers = { Accept: 'application/json' }; // omit UA to avoid runtime header restrictions
  const fields = 'code,product_name,brands,nutriments,categories_tags,countries_tags';
  const size = 24;

  // Attempt A: v2 base
  let source = 'none';
  try {
    const v2Url =
      `https://world.openfoodfacts.org/api/v2/search` +
      `?fields=${encodeURIComponent(fields)}` +
      `&page_size=${size}` +
      `&sort_by=popularity_key` +
      `&search_terms=${encodeURIComponent(q)}` +
      `&lc=en&nocache=1`; // OFF: search is cached → nocache advisable [2](https://wiki.openfoodfacts.org/API_Fields)

    let resp = await fetch(v2Url, { headers, cache: 'no-store' });
    let data = await resp.json();
    let v2List = Array.isArray(data?.products) ? data.products : [];

    // If v2 results look unrelated, try v2 with hints
    if (isLowQuality(v2List, q)) {
      const hintParams = hintParamsForV2(q);
      if (hintParams) {
        const v2HintUrl = v2Url + hintParams;
        const resp2 = await fetch(v2HintUrl, { headers, cache: 'no-store' });
        const data2 = await resp2.json();
        const v2HintList = Array.isArray(data2?.products) ? data2.products : [];
        if (!isLowQuality(v2HintList, q)) {
          source = 'v2-hint';
          const out = toOut(v2HintList);
          console.log('[food-search v2-hint]', { qRaw, q, count: out.length });
          return new NextResponse(JSON.stringify({ query: { raw: qRaw, normalized: q }, source, products: out }), {
            status: 200,
            headers: resHeaders,
          });
        }
      }
    } else {
      source = 'v2';
      const out = toOut(v2List);
      console.log('[food-search v2]', { qRaw, q, count: out.length });
      return new NextResponse(JSON.stringify({ query: { raw: qRaw, normalized: q }, source, products: out }), {
        status: 200,
        headers: resHeaders,
      });
    }

    // Attempt C: v1 fallback with search_simple (strong free-text), India bias
    // OFF’s v1 generic search uses /cgi/search.pl with search_simple=1 and supports tag filters; also note caching. [2](https://wiki.openfoodfacts.org/API_Fields)
    const v1Url =
      `https://world.openfoodfacts.org/cgi/search.pl` +
      `?action=process&json=1&search_simple=1` +
      `&fields=${encodeURIComponent(fields)}` +
      `&page_size=${size}` +
      `&search_terms=${encodeURIComponent(q)}` +
      `&tagtype_0=countries&tag_contains_0=contains&tag_0=india` +
      `&lc=en&nocache=1`;

    const resp3 = await fetch(v1Url, { headers, cache: 'no-store' });
    const data3 = await resp3.json();
    const v1List = Array.isArray(data3?.products) ? data3.products : [];

    source = v1List.length ? 'v1' : 'none';
    const out = toOut(v1List);

    console.log('[food-search v1]', { qRaw, q, count: out.length });
    return new NextResponse(JSON.stringify({ query: { raw: qRaw, normalized: q }, source, products: out }), {
      status: 200,
      headers: resHeaders,
    });
  } catch (err) {
    console.error('[food-search ERROR]', qRaw, err);
    return new NextResponse(
      JSON.stringify({ query: { raw: qRaw, normalized: q }, source, products: [], error: String(err?.message || err) }),
      { status: 200, headers: resHeaders }
    );
  }
}
