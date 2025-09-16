// src/app/api/food-search/route.js
// Node runtime for maximum compatibility with dynamic imports, fetch etc.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // never static cache this
export const revalidate = 0;

import { NextResponse } from 'next/server';

/**
 * PantryCoach "Super" Food Search API
 *
 * GET /api/food-search?q=paneer&category=Vegetables&size=20&source=all&strict=0&debug=0
 *
 * Params:
 *   q           : string (>=2 chars to query OFF; empty allowed to show category fallbacks)
 *   category    : "All" | "Staples" | "Oils" | "Vegetables" | "Fruits" | "Grains & Pulses" | "Dairy"
 *   size        : number (default 20)
 *   source      : "all" | "off" | "fallback"  (default "all")
 *   strict      : "1" to only include results matching the selected category
 *   debug       : "1" to append a debug payload with scoring + sources used
 *
 * Behavior:
 *   - OFF v2 query first; if weak (<5 hits), OFF v1 with search_simple=1 and countries_tags_en=india.
 *   - Always compute fallback staples for UX (category-first).
 *   - Merge, de-duplicate, score by relevance, trim to size.
 *   - Robust even if fallback module is missing/misplaced.
 */

// ------------------------------
// Small LRU-ish cache (per lambda)
// ------------------------------
const MAX_CACHE_ENTRIES = 120;
const CACHE_TTL_MS = 60_000; // 60s per query
globalThis.__FOOD_CACHE__ ||= new Map();
const cache = globalThis.__FOOD_CACHE__;

function cacheGet(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.t > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return e.v;
}
function cacheSet(key, value) {
  cache.set(key, { v: value, t: Date.now() });
  if (cache.size > MAX_CACHE_ENTRIES) {
    // delete oldest
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
}

// ------------------------------
// Utility helpers
// ------------------------------
const UA =
  process.env.OFF_USER_AGENT ||
  'PantryCoach/1.0 (+https://your-app.vercel.app)'; // <- replace with your Vercel URL if you want

const OFF_FIELDS = 'code,product_name,brands,nutriments';

function normalizeStr(s) {
  return (s || '')
    .toString()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .trim()
    .toLowerCase();
}

function tokenize(s) {
  return normalizeStr(s)
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function nameBrandKey(name, brand) {
  return `${normalizeStr(name)}|${normalizeStr(brand)}`;
}

function uniqueByNameBrand(list) {
  const seen = new Set();
  const out = [];
  for (const x of list) {
    const key = nameBrandKey(x.name, x.brand);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(x);
    }
  }
  return out;
}

// Soft similarity: token overlap ratio
function tokenScore(query, text) {
  const qT = tokenize(query);
  const tT = tokenize(text);
  if (!qT.length || !tT.length) return 0;
  const setQ = new Set(qT);
  let hit = 0;
  for (const tok of tT) if (setQ.has(tok)) hit++;
  return hit / Math.max(tT.length, setQ.size);
}

// Ranker combining availability of macros, category match, and textual match
function scoreItem(item, q, category) {
  let s = 0;
  // Textual relevance
  s += tokenScore(q, `${item.name || ''} ${item.brand || ''}`) * 4;

  // Nutrients presence bonus
  const macrosCount = [
    item.kcal_100g,
    item.protein_100g,
    item.carbs_100g,
    item.fat_100g,
  ].filter((v) => v != null).length;
  s += macrosCount * 0.8;

  // Category alignment bonus (only for fallback items that have an explicit category)
  if (item.source === 'fallback' && item.category && category && category !== 'All') {
    if (item.category === category) s += 1.2;
  }

  // Source balance: slight preference to OFF for branded variety, but not overwhelming
  if (item.source === 'off') s += 0.4;

  // Penalize completely missing macros unless OFF count is strong later
  if (macrosCount === 0) s -= 0.5;

  return s;
}

// ------------------------------
// Fallback staples loader (robust)
// ------------------------------
async function loadFallbackModule() {
  // Try preferred path first: src/data/fallbackFoods.js
  try {
    const mod = await import('../../../data/fallbackFoods.js');
    return mod;
  } catch {
    // Try alternative: src/app/data/fallbackFoods.js
    try {
      const mod2 = await import('../../data/fallbackFoods.js');
      return mod2;
    } catch {
      // Graceful degradation
      console.error(
        '[food-search] fallbackFoods module not found at src/data/... or src/app/data/...'
      );
      return {
        CATEGORIES: ['Staples', 'Oils', 'Vegetables', 'Fruits', 'Grains & Pulses', 'Dairy'],
        searchFallbackFoods: () => [],
      };
    }
  }
}

// ------------------------------
// OFF queries (v2 then smart v1)
// ------------------------------
async function offSearchV2(q, size, headers) {
  const url =
    'https://world.openfoodfacts.org/api/v2/search' +
    `?fields=${encodeURIComponent(OFF_FIELDS)}` +
    `&page_size=${size}` +
    `&sort_by=popularity_key` +
    `&search_terms=${encodeURIComponent(q)}` +
    `&nocache=1`;
  const resp = await fetch(url, { headers, cache: 'no-store' });
  const data = await resp.json();
  const arr = Array.isArray(data?.products) ? data.products : [];
  return arr;
}

async function offSearchV1Smart(q, size, headers) {
  // Looser matching + India bias
  const url =
    'https://world.openfoodfacts.org/cgi/search.pl' +
    `?action=process&json=1` +
    `&search_terms=${encodeURIComponent(q)}` +
    `&search_simple=1` +
    `&countries_tags_en=india` +
    `&page_size=${size}` +
    `&fields=${encodeURIComponent(OFF_FIELDS)}` +
    `&nocache=1`;
  const resp = await fetch(url, { headers, cache: 'no-store' });
  const data = await resp.json();
  const arr = Array.isArray(data?.products) ? data.products : [];
  return arr;
}

function mapOFF(arr) {
  return arr.map((p) => {
    const n = p.nutriments || {};
    let kcal = n['energy-kcal_100g'];
    if (kcal == null && n['energy_100g'] != null) {
      kcal = Number(n['energy_100g']) / 4.184; // kJ → kcal approx
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
}

// ------------------------------
// Main handler
// ------------------------------
export async function GET(req) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const category = (url.searchParams.get('category') || 'All').trim();
  const size = Math.max(1, Math.min(100, Number(url.searchParams.get('size') || 20)));
  const source = (url.searchParams.get('source') || 'all').toLowerCase(); // all | off | fallback
  const strict = url.searchParams.get('strict') === '1';
  const debug = url.searchParams.get('debug') === '1';

  const cacheKey = JSON.stringify({ q, category, size, source, strict });
  const cached = cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const headers = {
    'User-Agent': UA,
    Accept: 'application/json',
  };

  // Load staples dataset (robust)
  const { CATEGORIES, searchFallbackFoods } = await loadFallbackModule();

  // Build FALLBACK results (category-first UX)
  let fallbackList = [];
  if (source !== 'off') {
    fallbackList = searchFallbackFoods(q, category, size);
    if (strict && category && category !== 'All') {
      fallbackList = fallbackList.filter((x) => x.category === category);
    }
  }

  // OFF results
  let offResults = [];
  let usedV2 = false;
  let usedV1 = false;
  if (source !== 'fallback' && q.length >= 2) {
    try {
      const v2 = await offSearchV2(q, size, headers);
      usedV2 = true;
      let arr = v2;

      // Weak signal → augment with v1 smart (looser, India bias)
      if (!arr.length || arr.length < 5) {
        const v1 = await offSearchV1Smart(q, size, headers);
        usedV1 = true;
        // prefer v1 if it adds variety
        arr = [...v2, ...v1];
      }

      const mapped = mapOFF(arr);

      // Prefer with macros; if too few, keep all mapped
      let kept = mapped.filter(
        (x) =>
          x.kcal_100g != null ||
          x.protein_100g != null ||
          x.carbs_100g != null ||
          x.fat_100g != null
      );
      if (kept.length < 5) kept = mapped;

      offResults = uniqueByNameBrand(kept);
    } catch (e) {
      console.error('[food-search] OFF error:', e);
      offResults = [];
    }
  }

  // Merge according to source
  let merged;
  if (source === 'off') merged = offResults;
  else if (source === 'fallback') merged = fallbackList;
  else merged = uniqueByNameBrand([...offResults, ...fallbackList]); // all

  // Scoring + sort
  const withScore = merged.map((it) => ({
    ...it,
    __score: scoreItem(it, q, category),
  }));

  // If strict category is requested, filter after scoring too (to be safe)
  let filtered = withScore;
  if (strict && category && category !== 'All') {
    filtered = withScore.filter(
      (x) => x.source === 'fallback' && x.category === category
    );
    // If strict wiped everything and q is present, relax to at least OFF results
    if (!filtered.length && q) filtered = withScore.filter((x) => x.source === 'off');
  }

  // Final ordering
  filtered.sort((a, b) => b.__score - a.__score);

  // Cap size
  const products = filtered.slice(0, size).map(({ __score, ...rest }) => rest);

  const payload = {
    products,
    categories: ['All', ...CATEGORIES],
  };

  if (debug) {
    payload.debug = {
      input: { q, category, size, source, strict },
      counts: {
        off: offResults.length,
        fallback: fallbackList.length,
        merged: merged.length,
        final: products.length,
      },
      used: { v2: usedV2, v1: usedV1 },
      exampleScores: filtered.slice(0, Math.min(5, filtered.length)).map((x) => ({
        name: x.name,
        brand: x.brand,
        source: x.source,
        score: Number(x.__score.toFixed(3)),
      })),
    };
  }

  cacheSet(cacheKey, payload);
  return NextResponse.json(payload, {
    headers: {
      // Small edge-cdn hint; function response itself is dynamic
      'Cache-Control': 'private, max-age=30',
    },
  });
}
