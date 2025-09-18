// src/app/api/inventory/deduct/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use the public anon key (must be present in your Vercel env)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// normalize units to g / ml
function normalize(qty, unit) {
  const q = Number(qty) || 0;
  if (!unit) return { qty: q, unit: '' };
  const u = String(unit).toLowerCase();
  if (u === 'kg') return { qty: q * 1000, unit: 'g' };
  if (u === 'g') return { qty: q, unit: 'g' };
  if (u === 'l') return { qty: q * 1000, unit: 'ml' };
  if (u === 'ml') return { qty: q, unit: 'ml' };
  return { qty: q, unit };
}

// simplified name for fuzzy match
function simplifyName(s = '') {
  return String(s).toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\bs\b/g, '').trim();
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, qty, unit, user_id } = body || {};

    if (!name || !qty) {
      return NextResponse.json({ error: 'missing name or qty in request body' }, { status: 400 });
    }
    if (!user_id) {
      return NextResponse.json({ error: 'missing user_id (pass current user id in request body)' }, { status: 400 });
    }

    const norm = normalize(qty, unit);

    // 1) try ilike match first
    const nameQuery = `%${name}%`;
    let { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user_id)
      .ilike('name', nameQuery)
      .limit(1);

    if (error) throw error;

    // 2) fallback: fetch user's items and fuzzy-match by simplified strings
    if (!items || items.length === 0) {
      const { data: allItems, error: e2 } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user_id);

      if (e2) throw e2;

      const target = simplifyName(name);
      const candidate = (allItems || []).find(it => {
        const s = simplifyName(it.name);
        return s.includes(target) || target.includes(s) || s.split(' ')[0] === target.split(' ')[0];
      });

      if (candidate) items = [candidate];
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: `no pantry match for "${name}"` }, { status: 404 });
    }

    const item = items[0];

    // compute new quantity (assumes item.quantity stored in same unit as we normalize to, else you may need convert)
    const currentQty = Number(item.quantity) || 0;
    let newQty = currentQty - norm.qty;
    if (Number.isNaN(newQty)) newQty = 0;
    if (newQty < 0) newQty = 0;

    // update DB
    const { error: updateErr } = await supabase
      .from('items')
      .update({ quantity: newQty })
      .eq('id', item.id);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      message: `deducted ${norm.qty}${norm.unit || ''} from ${item.name}`,
      remaining: newQty,
      item_id: item.id
    });
  } catch (err) {
    console.error('inventory.deduct error:', err);
    return NextResponse.json({ error: err.message || 'internal error' }, { status: 500 });
  }
}
