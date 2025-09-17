// src/app/api/food-search/route.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { NextResponse } from 'next/server';

// ---------- tiny cache ----------
const MAX_CACHE_ENTRIES = 120;
const CACHE_TTL_MS = 60_000;
globalThis.__FOOD_CACHE__ ||= new Map();
const cache = globalThis.__FOOD_CACHE__;
const cacheGet = (k) => {
  const e = cache.get(k); if (!e) return null;
  if (Date.now() - e.t > CACHE_TTL_MS) { cache.delete(k); return null; }
  return e.v;
};
const cacheSet = (k, v) => {
  cache.set(k, { v, t: Date.now() });
  if (cache.size > MAX_CACHE_ENTRIES) {
    const first = cache.keys().next().value; if (first) cache.delete(first);
  }
};

// ---------- utils ----------
const UA = process.env.OFF_USER_AGENT || 'PantryCoach/1.0 (+https://your-app.vercel.app)'; // set to your Vercel URL if you like
const OFF_FIELDS = 'code,product_name,brands,nutriments';

const norm = (s) => (s||'').toString().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const toks = (s) => norm(s).replace(/[^a-z0-9\s]+/g,' ').split(/\s+/).filter(Boolean);
const keyNB = (n,b) => `${norm(n)}|${norm(b)}`;
const uniqNB = (arr) => {
  const seen = new Set(); const out = [];
  for (const x of arr) { const k = keyNB(x.name, x.brand); if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out;
};
const tokenScore = (q, t) => {
  const A = new Set(toks(q)), B = toks(t); if (!A.size || !B.length) return 0;
  let hit = 0; for (const w of B) if (A.has(w)) hit++;
  return hit / Math.max(B.length, A.size);
};
const scoreItem = (it, q, cat) => {
  let s = tokenScore(q, `${it.name||''} ${it.brand||''}`) * 4;
  const mac = [it.kcal_100g, it.protein_100g, it.carbs_100g, it.fat_100g].filter(v=>v!=null).length;
  s += mac * 0.8;
  if (it.source==='fallback' && it.category && cat && cat!=='All') { if (it.category===cat) s+=1.2; }
  if (it.source==='off') s += 0.4;
  if (mac===0) s -= 0.5;
  return s;
};

// ---------- robust loader for staples (tries both) ----------
async function loadFallbackModule() {
  try { return await import('../../../data/fallbackFoods.js'); }           // src/data/…
  catch {
    try { return await import('../../data/fallbackFoods.js'); }           // src/app/data/…
    catch {
      console.error('[food-search] fallbackFoods module not found at src/data or src/app/data');
      return { CATEGORIES: ['Staples','Oils','Vegetables','Fruits','Grains & Pulses','Dairy'], searchFallbackFoods: () => [] };
    }
  }
}

// ---------- OFF helpers ----------
async function offV2(q, size, headers) {
  const url = `https://world.openfoodfacts.org/api/v2/search?fields=${encodeURIComponent(OFF_FIELDS)}&page_size=${size}&sort_by=popularity_key&search_terms=${encodeURIComponent(q)}&nocache=1`;
  const r = await fetch(url, { headers, cache: 'no-store' });
  const j = await r.json();
  return Array.isArray(j?.products) ? j.products : [];
}
async function offV1Smart(q, size, headers) {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?action=process&json=1&search_terms=${encodeURIComponent(q)}&search_simple=1&countries_tags_en=india&page_size=${size}&fields=${encodeURIComponent(OFF_FIELDS)}&nocache=1`;
  const r = await fetch(url, { headers, cache: 'no-store' });
  const j = await r.json();
  return Array.isArray(j?.products) ? j.products : [];
}
function mapOFF(arr) {
  return arr.map(p => {
    const n = p.nutriments || {};
    let kcal = n['energy-kcal_100g'];
    if (kcal==null && n['energy_100g']!=null) kcal = Number(n['energy_100g'])/4.184; // kJ → kcal approx
    return {
      code: p.code || null,
      name: p.product_name || '',
      brand: (p.brands||'').split(',')[0]?.trim() || '',
      kcal_100g: kcal!=null ? Math.round(Number(kcal)) : null,
      protein_100g: n['proteins_100g']!=null ? Number(n['proteins_100g']) : null,
      carbs_100g: n['carbohydrates_100g']!=null ? Number(n['carbohydrates_100g']) : null,
      fat_100g: n['fat_100g']!=null ? Number(n['fat_100g']) : null,
      source: 'off',
    };
  });
}

// ---------- handler ----------
export async function GET(req) {
  const u = new URL(req.url);
  const q = (u.searchParams.get('q')||'').trim();
  const category = (u.searchParams.get('category')||'All').trim();
  const size = Math.max(1, Math.min(100, Number(u.searchParams.get('size')||20)));
  const source = (u.searchParams.get('source')||'all').toLowerCase(); // all | off | fallback
  const strict = u.searchParams.get('strict')==='1';
  const debug = u.searchParams.get('debug')==='1';

  const cacheKey = JSON.stringify({ q, category, size, source, strict });
  const hit = cacheGet(cacheKey);
  if (hit) return NextResponse.json(hit);

  const headers = { 'User-Agent': UA, 'Accept': 'application/json' };

  // Load staples safely
  const { CATEGORIES, searchFallbackFoods } = await loadFallbackModule();

  // Fallback suggestions (category-first)
  let fallbackList = [];
  if (source !== 'off') {
    fallbackList = searchFallbackFoods(q, category, size);
    if (strict && category && category!=='All') {
      fallbackList = fallbackList.filter(x => x.category === category);
    }
  }

  // OFF results
  let offResults = [];
  let usedV2 = false, usedV1 = false;
  if (source !== 'fallback' && q.length >= 2) {
    try {
      const v2 = await offV2(q, size, headers); usedV2 = true;
      let arr = v2;
      if (!arr.length || arr.length < 5) {
        const v1 = await offV1Smart(q, size, headers); usedV1 = true;
        arr = [...v2, ...v1];
      }
      const mapped = mapOFF(arr);
      let kept = mapped.filter(x => x.kcal_100g!=null || x.protein_100g!=null || x.carbs_100g!=null || x.fat_100g!=null);
      if (kept.length < 5) kept = mapped;
      offResults = uniqNB(kept);
    } catch (e) {
      console.error('[food-search] OFF error:', e);
    }
  }

  // Merge / score / trim
  let merged =
    source==='off' ? offResults :
    source==='fallback' ? fallbackList :
    uniqNB([...offResults, ...fallbackList]); // all

  const scored = merged.map(it => ({ ...it, __s: scoreItem(it, q, category) }));

  let filtered = scored;
  if (strict && category && category!=='All') {
    filtered = scored.filter(x => x.source==='fallback' && x.category===category);
    if (!filtered.length && q) filtered = scored.filter(x => x.source==='off');
  }

 
// Prefer exact name matches first, then by score
const eq = (name, q) => {
  if (!q || !name) return false;
  return name.trim().toLowerCase() === q.trim().toLowerCase();
};

filtered.sort((a, b) => {
  const ax = eq(a.name, q) ? 1 : 0;
  const bx = eq(b.name, q) ? 1 : 0;
  if (ax !== bx) return bx - ax;  // exact match to top
  return b.__s - a.__s;           // otherwise by score
});

  const products = filtered.slice(0, size).map(({__s, ...rest}) => rest);

  const payload = {
    products,
    categories: ['All', ...CATEGORIES],
    ...(debug ? { debug: {
      input: { q, category, size, source, strict },
      counts: { off: offResults.length, fallback: fallbackList.length, final: products.length },
      used: { v2: usedV2, v1: usedV1 },
      top5: filtered.slice(0, Math.min(5, filtered.length)).map(x => ({ name: x.name, brand: x.brand, source: x.source, score: Number(x.__s.toFixed(3)) }))
    }} : {})
  };

  cacheSet(cacheKey, payload);
  return NextResponse.json(payload, { headers: { 'Cache-Control': 'private, max-age=30' } });
}
