// src/app/api/recipes/cook/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// helpers (same as deduct route)
function normalize(qty, unit) {
  const q = Number(qty) || 0;
  const u = (unit || '').toString().toLowerCase();
  if (u === 'kg') return { qty: q * 1000, unit: 'g' };
  if (u === 'g') return { qty: q, unit: 'g' };
  if (u === 'l') return { qty: q * 1000, unit: 'ml' };
  if (u === 'ml') return { qty: q, unit: 'ml' };
  if (u === 'tbsp') return { qty: q * 15, unit: 'ml' };
  if (u === 'tsp') return { qty: q * 5, unit: 'ml' };
  return { qty: q, unit: u };
}
function simplifyName(s = '') { return String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }
function tokenize(name = '') { return simplifyName(name).split(' ').filter(Boolean); }
function jaccardScore(aTokens,bTokens){ const A = new Set(aTokens), B = new Set(bTokens); const inter = [...A].filter(x=>B.has(x)); const union = new Set([...A,...B]); return inter.length / (union.size||1); }

export async function POST(req) {
  try {
    const body = await req.json();
    const { recipeId, user_id } = body || {};
    if (!recipeId || !user_id) return NextResponse.json({ error: 'missing recipeId or user_id' }, { status: 400 });

    const f = path.join(process.cwd(), 'src', 'data', 'recipes.json');
    if (!fs.existsSync(f)) return NextResponse.json({ error: 'recipes file not found' }, { status: 404 });
    const recipes = JSON.parse(fs.readFileSync(f, 'utf8'));
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return NextResponse.json({ error: 'recipe not found' }, { status: 404 });

    const results = [];

    // prefetch all user items
    const { data: allItems, error: itemsErr } = await supabase.from('items').select('*').eq('user_id', user_id);
    if (itemsErr) throw itemsErr;
    const itemsList = allItems || [];

    for (const ing of (recipe.ingredients || [])) {
      try {
        // find ilike match first
        const { data: ilikeResult, error: ilikeErr } = await supabase
          .from('items')
          .select('*')
          .eq('user_id', user_id)
          .ilike('name', `%${ing.name}%`)
          .limit(1);
        if (ilikeErr) throw ilikeErr;

        let matched = null;
        if (ilikeResult && ilikeResult.length > 0) matched = ilikeResult[0];

        // fuzzy fallback
        if (!matched) {
          const targetTokens = tokenize(ing.name);
          const candidates = (itemsList || []).map(it => ({
            ...it,
            score: jaccardScore(targetTokens, tokenize(it.name)),
          })).sort((a,b)=>b.score - a.score);

          if (candidates[0] && candidates[0].score > 0.25) matched = candidates[0];
        }

        if (!matched) {
          results.push({ ok: false, name: ing.name, error: 'no pantry match' });
          continue;
        }

        const currentQty = Number(matched.quantity) || 0;
        const norm = normalize(ing.qty || 0, ing.unit || '');
        let newQty = currentQty - norm.qty;
        if (Number.isNaN(newQty)) newQty = 0;

        if (newQty <= 0) {
          // remove item
          const { error: delErr } = await supabase.from('items').delete().eq('id', matched.id);
          if (delErr) throw delErr;
          results.push({ ok: true, requested: ing.name, matchedWith: matched.name, deducted: norm.qty, unit: norm.unit, remaining: 0 });
        } else {
          const { error: upErr } = await supabase.from('items').update({ quantity: newQty }).eq('id', matched.id);
          if (upErr) throw upErr;
          results.push({ ok: true, requested: ing.name, matchedWith: matched.name, deducted: norm.qty, unit: norm.unit, remaining: newQty });
        }
      } catch (e) {
        console.error('cook ing error', e);
        results.push({ ok: false, name: ing.name, error: e.message || 'internal' });
      }
    }

    // NOTE: per your request meal_log writing is paused for now.
    return NextResponse.json({ ok: true, recipeId, results });
  } catch (err) {
    console.error('cook route error', err);
    return NextResponse.json({ error: err.message || 'internal error' }, { status: 500 });
  }
}
