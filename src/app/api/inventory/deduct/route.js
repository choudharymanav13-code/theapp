// src/app/api/inventory/deduct/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function normalize(qty, unit) {
  const q = Number(qty) || 0;
  const u = String(unit || '').toLowerCase();
  if (u === 'kg') return { qty: q * 1000, unit: 'g' };
  if (u === 'g') return { qty: q, unit: 'g' };
  if (u === 'l') return { qty: q * 1000, unit: 'ml' };
  if (u === 'ml') return { qty: q, unit: 'ml' };
  return { qty: q, unit: u };
}

function simplifyName(s = '') {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
}

export async function POST(req) {
  try {
    const { name, qty, unit, user_id } = await req.json();
    if (!name || !qty || !user_id) {
      return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
    }

    const norm = normalize(qty, unit);

    // Find pantry match
    let { data: items, error } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user_id)
      .ilike('name', `%${name}%`)
      .limit(1);

    if (error) throw error;

    if (!items?.length) {
      const { data: all, error: e2 } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', user_id);
      if (e2) throw e2;

      const target = simplifyName(name);
      const candidate = all.find(it => simplifyName(it.name).includes(target));
      if (candidate) items = [candidate];
    }

    if (!items?.length) {
      return NextResponse.json({ error: `No pantry match for "${name}"` }, { status: 404 });
    }

    const item = items[0];
    let newQty = (Number(item.quantity) || 0) - norm.qty;
    if (newQty < 0) newQty = 0;

    if (newQty === 0) {
      const { error: delErr } = await supabase.from('items').delete().eq('id', item.id);
      if (delErr) throw delErr;
      return NextResponse.json({
        ok: true,
        action: 'deleted',
        name: item.name,
        deducted: norm.qty,
        unit: norm.unit,
        remaining: 0
      });
    }

    const { error: upErr } = await supabase
      .from('items')
      .update({ quantity: newQty })
      .eq('id', item.id);

    if (upErr) throw upErr;

    return NextResponse.json({
      ok: true,
      action: 'updated',
      name: item.name,
      deducted: norm.qty,
      unit: norm.unit,
      remaining: newQty
    });
  } catch (err) {
    console.error('deduct error', err);
    return NextResponse.json({ error: err.message || 'internal error' }, { status: 500 });
  }
}
