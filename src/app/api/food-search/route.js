// src/app/api/food-search/route.js
import { NextResponse } from 'next/server';
import { filterStaples } from '../../../data/staples';

// Make this route always dynamic and uncached
export const runtime = 'nodejs';
export const revalidate = 0;
export const dynamic = 'force-dynamic';

/**
 * Strategy
 * 1) v2 OFF with text term + English label preference + nocache (per OFF docs)
 * 2) If results look unrelated to the query, try v2 "hints" (category nudges)
 * 3) If still poor, v1 OFF fallback with search_simple=1 + India bias (+nocache)
 * 4) Merge with local staples filtered by q + category, then de-duplicate.
 *    Mark local entries with origin:'local' so UI can badge them.
 *
 * OFF notes: search endpoints are cached; add nocache=no_cache to get fresh results.
 * v2 supports field selection and tag filters. v1 handles generic text search well.
 * (See Open Food Facts Search API v2 and the Search docs.) 
 */

// ---- Indian synonyms normalization ----
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

// ---- v2 hint params per query (optional) ----
function hintParamsForV2(qNorm, cat) {
  // If user picked a category, prefer that; else infer from query
  if (cat && cat !== 'all') {
    const map = {
      vegetables: '&categories_tags_en=vegetables',
      fruits: '&categories_tags_en=fruits',
      oils: '&categories_tags_en=vegetable-fats-and-oils',
      grains: '&categories_tags_en=cereals-and-their-products',
      pulses: '&categories_tags_en=legumes',
      dairy: '&categories_tags_en=dairies',
      staples: '&categories_tags_en=cereals-and-their-products', // reasonable default
    };
    if (map[cat]) return map[cat];
  }
  if (/paneer/i.test(qNorm)) return '&categories_tags_en=cheeses';
  if (/roti|chapati/i.test(qNorm)) return '&categories_tags_en=flatbreads';
  if (/poha|flattened\s*rice/i.test(qNorm)) return '&categories_tags_en=breakfast-cereals';
  if (/dal|lentil/i.test(qNorm)) return '&categories_tags_en=legumes';
  if (/dahi|yogurt|curd/i.test(qNorm)) return '&categories_tags_en=yogurts';
  return '';
}

// ---- map OFF product -> simple shape ----
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
        origin: 'off',
      };
    })
    .filter(
      (x) =>
        x.kcal_100g != null ||
        x.protein_100g != null ||
        x.carbs_100g != null ||
        x.fat_100g != null
    );
}

// ---- quick relevance check ----
function isLowQuality(list, qNorm) {
  if (!qNorm || !list.length) return !list.length;
  const top = list.slice(0, 8);
  const q = qNorm.toLowerCase();
  const hits = top.reduce((acc, p) => {
    const name = (p.product_name || '').toLowerCase();
    const brand = (p.brands || '').toLowerCase();
    return acc + (name.includes(q) || brand.includes(q) ? 1 : 0);
  }, 0);
  return hits < 2;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const qRaw = (searchParams.get('q') ?? '').trim();
  const cat = (searchParams.get('cat') ?? 'all').trim().toLowerCase();
  const limit = Math.max(1, Math.min(30, Number(searchParams.get('limit') ?? 20)));

  const resHeaders = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' };

  if (!qRaw && cat === 'all') {
    return NextResponse.json({ query: { raw: qRaw, normalized: '' }, source: 'none', products: [] }, { headers: resHeaders });
  }

  const q = normalizeQuery(qRaw);
  const headers = { Accept: 'application/json' }; // avoid setting UA in case runtime blocks
  const fields = 'code,product_name,brands,nutriments,categories_tags,countries_tags';
  const size = limit; // keep payload small
  let source = 'none';
  let offOut = [];

  try {
    // --- Attempt A: v2 base ---
    const v2Base =
      `https://world.openfoodfacts.org/api/v2/search` +
      `?fields=${encodeURIComponent(fields)}` +
      `&page_size=${size}` +
      `&sort_by=popularity_key` +
      `&search_terms=${encodeURIComponent(q || '')}` +
      `&lc=en&nocache=1`;

    let resp = await fetch(v2Base, { headers, cache: 'no-store' });
    let data = await resp.json();
    let list = Array.isArray(data?.products) ? data.products : [];

    if (!isLowQuality(list, q)) {
      source = 'v2';
      offOut = toOut(list);
    } else {
      // --- Attempt B: v2 with hints ---
      const hint = hintParamsForV2(q, cat);
      if (hint) {
        const v2HintUrl = v2Base + hint;
        const resp2 = await fetch(v2HintUrl, { headers, cache: 'no-store' });
        const data2 = await resp2.json();
        const list2 = Array.isArray(data2?.products) ? data2.products : [];
        if (!isLowQuality(list2, q)) {
          source = 'v2-hint';
          offOut = toOut(list2);
        }
      }
    }

    // --- Attempt C: v1 fallback ---
    if (!offOut.length) {
      const v1Url =
        `https://world.openfoodfacts.org/cgi/search.pl` +
        `?action=process&json=1&search_simple=1` +
        `&fields=${encodeURIComponent(fields)}` +
        `&page_size=${size}` +
        `&search_terms=${encodeURIComponent(q || '')}` +
        `&tagtype_0=countries&tag_contains_0=contains&tag_0=india` +
        `&lc=en&nocache=1`;
      const resp3 = await fetch(v1Url, { headers, cache: 'no-store' });
      const data3 = await resp3.json();
      const list3 = Array.isArray(data3?.products) ? data3.products : [];
      if (list3.length) {
        source = 'v1';
        offOut = toOut(list3);
      }
    }

    // --- Local staples (A + B) ---
    const local = filterStaples({ q: qRaw, cat, limit: size });

    // --- Merge & de-duplicate ---
    const dedupe = new Map();
    const push = (arr, originLabel) => {
      arr.forEach((x) => {
        // key by normalized name + brand or code
        const key = (x.code || '') + '|' + (x.name || '').toLowerCase() + '|' + (x.brand || '').toLowerCase();
        if (!dedupe.has(key)) dedupe.set(key, { ...x, origin: x.origin || originLabel });
      });
    };
    push(offOut, 'off');
    push(local, 'local');

    const merged = Array.from(dedupe.values()).slice(0, size);

    console.log('[food-search merged]', { qRaw, q, cat, source, offCount: offOut.length, localCount: local.length, merged: merged.length });

    return NextResponse.json(
      { query: { raw: qRaw, normalized: q, category: cat }, source, products: merged },
      { headers: resHeaders }
    );
  } catch (err) {
    console.error('[food-search ERROR]', qRaw, err);
    return NextResponse.json(
      { query: { raw: qRaw, normalized: q, category: cat }, source, products: [], error: String(err?.message || err) },
      { status: 200, headers: resHeaders }
    );
  }
}
