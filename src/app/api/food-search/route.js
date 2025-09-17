// src/app/api/food-search/route.js
import { NextResponse } from 'next/server';

const SYNONYMS = {
  curd: ['dahi', 'yogurt', 'yoghurt'],
  dahi: ['curd', 'yogurt', 'yoghurt'],
  brinjal: ['eggplant', 'aubergine'],
  eggplant: ['brinjal', 'aubergine'],
  aubergine: ['eggplant', 'brinjal'],
  ladyfinger: ['okra', 'bhindi'],
  okra: ['ladyfinger', 'bhindi'],
  bhindi: ['ladyfinger', 'okra'],
  poha: ['flattened rice', 'aval'],
  chapati: ['roti', 'chapathi', 'phulka'],
  roti: ['chapati', 'chapathi', 'phulka'],
  paneer: ['cottage cheese'],
  atta: ['whole wheat flour'],
};

function mapProduct(p) {
  const n = p?.nutriments || {};
  const kcal = n['energy-kcal_100g'] ?? n['energy-kcal_serving'] ?? n['energy-kcal'];
  const protein = n['proteins_100g'] ?? n['proteins_serving'];
  const carbs = n['carbohydrates_100g'] ?? n['carbohydrates_serving'];
  const fat = n['fat_100g'] ?? n['fat_serving'];
  return {
    code: p.code || null,
    name: p.product_name || '',
    brand: p.brands || '',
    kcal_100g: typeof kcal === 'number' ? Math.round(kcal) : null,
    protein_100g: typeof protein === 'number' ? Number(protein) : null,
    carbs_100g: typeof carbs === 'number' ? Number(carbs) : null,
    fat_100g: typeof fat === 'number' ? Number(fat) : null,
  };
}

async function offSearch({ q, page, pageSize, countries, sortBy }) {
  const fields = [
    'code',
    'product_name',
    'brands',
    'nutriments',
    'countries_tags',
    'quantity',
    'serving_size',
  ].join(',');

  const sp = new URLSearchParams({
    search_terms: q,
    fields,
    page: String(page),
    page_size: String(pageSize),
    sort_by: sortBy, // 'popularity_key' is supported by OFF v2
  });

  if (countries) sp.set('countries_tags_en', countries); // e.g., 'india' or 'india|united-kingdom|united-states'
  const url = `https://world.openfoodfacts.org/api/v2/search?${sp.toString()}`;

  const resp = await fetch(url, { headers: { 'User-Agent': 'PantryCoach/1.0' } });
  const data = await resp.json();
  const products = Array.isArray(data?.products) ? data.products : [];
  return products.map(mapProduct);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const raw = (searchParams.get('q') || '').trim();
  const page = Math.max(1, Number(searchParams.get('page') || '1'));
  const pageSize = Math.min(50, Math.max(10, Number(searchParams.get('pageSize') || '30')));
  const countries = searchParams.get('countries') || 'india'; // prefer India; widen later if needed
  const sortBy = searchParams.get('sortBy') || 'popularity_key';

  if (!raw || raw.length < 2) return NextResponse.json({ products: [] });

  // Primary search
  let results = await offSearch({ q: raw, page, pageSize, countries, sortBy });

  // If too few, expand with up to 2 synonyms (keeps requests polite)
  const key = raw.toLowerCase();
  const syns = (SYNONYMS[key] || []).slice(0, 2);
  if (results.length < 12 && syns.length) {
    const extras = await Promise.all(
      syns.map(s =>
        offSearch({
          q: s,
          page: 1,
          pageSize: Math.ceil(pageSize / syns.length),
          countries,
          sortBy,
        })
      )
    );
    const mapKey = x => `${x.name.toLowerCase()}|${x.brand.toLowerCase()}|${x.code || ''}`;
    const seen = new Set(results.map(mapKey));
    for (const arr of extras) {
      for (const item of arr) {
        const k = mapKey(item);
        if (!seen.has(k)) {
          results.push(item);
          seen.add(k);
        }
      }
    }
  }

  // Keep items that have some nutrition info; cap length
  const filtered = results
    .filter(
      x =>
        x.kcal_100g !== null ||
        x.protein_100g !== null ||
        x.carbs_100g !== null ||
        x.fat_100g !== null
    )
    .slice(0, pageSize);

  return NextResponse.json({ products: filtered });
}
