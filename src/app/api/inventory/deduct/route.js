// src/app/api/inventory/deduct/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// normalize qty/unit to g/ml
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

function simplifyName(s = '') {
  return String(s).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}
function tokenize(name = '') {
  return simplifyName(name).split(' ').filter(Boolean);
}
function jaccardScore(aTokens, bTokens) {
  const setA = new Set(aTokens);
  const setB = new Set(bTokens);
  const inter = [...setA].filter(x => setB.has(x));
  const union = new Set([...setA, ...setB]);
  return inter.length / (union.size || 1);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, qty, unit, user_id } = body || {};

    if (!name || (qty === undefined || qty === null) || !user_id) {
      return NextResponse.json({ ok: false, error: 'missing name, qty, or user_id' }, { status: 400 });
    }

    const norm = normalize(qty, unit);

    // 1) try ilike match first
    let { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user_id)
      .ilike('name', `%${name}%`)
      .limit(1);

    if (error) throw error;

    let matchedWith = null;

    // 2) fallback fuzzy
    if (!items || items.length === 0) {
      const { data: allItems, error: e2 } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user_id);

      if (e2) throw e2;

      const targetTokens = tokenize(name);
      const candidates = (allItems || []).map(it => ({
        ...it,
        score: jaccardScore(targetTokens, tokenize(it.name)),
      }));
      candidates.sort((a,b)=>b.score - a.score);

      if (candidates[0] && candidates[0].score > 0.25) {
        items = [candidates[0]];
        matchedWith = candidates[0].name;
      }
    } else {
      matchedWith = items[0].name;
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ ok: false, name, error: `no pantry match for "${name}"` }, { status: 404 });
    }

    const item = items[0];
    const currentQty = Number(item.quantity) || 0;
    let newQty = currentQty - norm.qty;
    if (Number.isNaN(newQty)) newQty = 0;
    if (newQty <= 0) {
      // delete item
      const { error: delErr } = await supabase.from('items').delete().eq('id', item.id);
      if (delErr) throw delErr;
      return NextResponse.json({
        ok: true,
        action: 'deleted',
        requested: name,
        matchedWith: item.name,
        deducted: norm.qty,
        unit: norm.unit,
        remaining: 0
      });
    }

    const { error: updateErr } = await supabase
      .from('items')
      .update({ quantity: newQty })
      .eq('id', item.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      ok: true,
      action: 'updated',
      requested: name,
      matchedWith: item.name,
      deducted: norm.qty,
      unit: norm.unit,
      remaining: newQty
    });
  } catch (err) {
    console.error('inventory.deduct error:', err);
    return NextResponse.json({ ok: false, error: err.message || 'internal error' }, { status: 500 });
  }
}
