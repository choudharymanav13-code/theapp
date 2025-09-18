// src/app/api/inventory/deduct/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// normalize qty/unit to g/ml
function normalize(qty, unit) {
  const q = Number(qty) || 0;
  const u = (unit || '').toLowerCase();
  if (u === 'kg') return { qty: q * 1000, unit: 'g' };
  if (u === 'g') return { qty: q, unit: 'g' };
  if (u === 'l') return { qty: q * 1000, unit: 'ml' };
  if (u === 'ml') return { qty: q, unit: 'ml' };
  return { qty: q, unit };
}

// make name matching more flexible
function simplifyName(s = '') {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(name = '') {
  return simplifyName(name)
    .split(' ')
    .filter(Boolean);
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, qty, unit, user_id } = body || {};

    if (!name || !qty || !user_id) {
      return NextResponse.json(
        { error: 'missing name, qty, or user_id' },
        { status: 400 }
      );
    }

    const norm = normalize(qty, unit);

    // try ilike exact first
    let { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user_id)
      .ilike('name', `%${name}%`)
      .limit(1);

    if (error) throw error;

    let matchedWith = null;

    // fallback fuzzy
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
      candidates.sort((a, b) => b.score - a.score);

      if (candidates[0] && candidates[0].score > 0.3) {
        items = [candidates[0]];
        matchedWith = candidates[0].name;
      }
    } else {
      matchedWith = items[0].name;
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: `no pantry match for "${name}"` },
        { status: 404 }
      );
    }

    const item = items[0];
    const currentQty = Number(item.quantity) || 0;
    let newQty = currentQty - norm.qty;
    if (newQty < 0) newQty = 0;

    const update = newQty === 0 ? { quantity: 0 } : { quantity: newQty };

    const { error: updateErr } = await supabase
      .from('items')
      .update(update)
      .eq('id', item.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      message: `Deducted ${norm.qty}${norm.unit} from "${matchedWith}" (for recipe ingredient "${name}"
