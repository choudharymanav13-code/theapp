// src/app/api/inventory/deduct/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// --- simple conversions ---
function normalizeQty(qty, unit) {
  if (!unit) return { qty, unit: 'count' };
  const u = unit.toLowerCase();
  if (u === 'kg') return { qty: qty * 1000, unit: 'g' };
  if (u === 'g') return { qty, unit: 'g' };
  if (u === 'l') return { qty * 1000, unit: 'ml' };
  if (u === 'ml') return { qty, unit: 'ml' };
  return { qty, unit }; // leave as is
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, qty, unit } = body;

    if (!name || !qty) {
      return NextResponse.json({ error: 'Missing name or qty' }, { status: 400 });
    }

    // normalize units
    const { qty: normQty, unit: normUnit } = normalizeQty(Number(qty), unit);

    // Get user
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Find item (first match only)
    const { data: items, error: fetchError } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .ilike('name', `%${name}%`);

    if (fetchError) throw fetchError;
    if (!items || items.length === 0) {
      return NextResponse.json({ error: `No inventory match for ${name}` }, { status: 404 });
    }

    const item = items[0];
    let newQty = Number(item.quantity) - normQty;
    if (newQty < 0) newQty = 0;

    const { error: updateError } = await supabase
      .from('items')
      .update({ quantity: newQty })
      .eq('id', item.id);

    if (updateError) throw updateError;

    return NextResponse.json({
      message: `Deducted ${normQty}${normUnit} from ${item.name}`,
      remaining: newQty
    });
  } catch (err) {
    console.error('Deduct API error:', err);
    return NextResponse.json({ error: 'Failed to deduct' }, { status: 500 });
  }
}
