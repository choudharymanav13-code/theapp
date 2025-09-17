import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, qty, unit } = body;

    if (!name || !qty || !unit) {
      return NextResponse.json({ error: 'missing fields' }, { status: 400 });
    }

    // Get user
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'not logged in' }, { status: 401 });
    }

    // Try to find item in pantry
    const { data: items } = await supabase
      .from('items')
      .select('*')
      .eq('user_id', user.id)
      .ilike('name', `%${name}%`)
      .limit(1);

    if (items && items.length > 0) {
      const item = items[0];
      const newQty = Math.max(0, item.quantity - qty);

      const { error: updateErr } = await supabase
        .from('items')
        .update({ quantity: newQty })
        .eq('id', item.id);

      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, newQty });
    } else {
      // If not found → insert missing with 0 qty
      await supabase.from('items').insert({
        user_id: user.id,
        name,
        quantity: 0,
        unit,
        calories_per_100g: 0,
        expiry_date: new Date().toISOString().slice(0, 10)
      });

      return NextResponse.json({
        success: true,
        note: 'Item was missing; inserted with 0 qty.'
      });
    }
  } catch (err) {
    console.error('Deduct error', err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
