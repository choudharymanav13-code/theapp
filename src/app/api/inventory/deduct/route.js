// src/app/api/inventory/deduct/route.js
import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabaseClient';

// helper: normalize units (convert kg→g, l→ml, etc.)
function normalize(qty, unit) {
  if (!unit) return { qty, unit };
  const u = unit.toLowerCase();
  if (u === 'kg') return { qty: qty * 1000, unit: 'g' };
  if (u === 'g') return { qty, unit: 'g' };
  if (u === 'l') return { qty: qty * 1000, unit: 'ml' };
  if (u === 'ml') return { qty, unit: 'ml' };
  return { qty, unit }; // leave as is
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, qty, unit } = body;
    if (!name || !qty) {
      return NextResponse.json({ error: 'missing name/qty' }, { status: 400 });
    }

    const norm = normalize(qty, unit);

    // get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'not signed in' }, { status: 401 });
    }

    // find item in DB
    const { data: items } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .ilike('name', name)
      .limit(1);

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'item not found in pantry' }, { status: 404 });
    }

    const item = items[0];
    let newQty = item.quantity - norm.qty;
    if (newQty < 0) newQty = 0;

    // update DB
    const { error } = await supabase
      .from('items')
      .update({ quantity: newQty })
      .eq('id', item.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: `deducted ${norm.qty}${norm.unit} from ${name}`, remaining: newQty });
  } catch (err) {
    console.error('deduct API error:', err);
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
