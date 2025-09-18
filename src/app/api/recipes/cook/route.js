// src/app/api/recipes/cook/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(req) {
  try {
    const { recipeId, user_id } = await req.json();
    if (!recipeId || !user_id) {
      return NextResponse.json({ error: 'missing recipeId or user_id' }, { status: 400 });
    }

    // load recipes.json
    const f = path.join(process.cwd(), 'src', 'data', 'recipes.json');
    const recipes = JSON.parse(fs.readFileSync(f, 'utf8'));
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return NextResponse.json({ error: 'recipe not found' }, { status: 404 });

    const results = [];
    for (const ing of recipe.ingredients) {
      try {
        const r = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/inventory/deduct`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...ing, user_id })
        });
        results.push(await r.json());
      } catch (e) {
        results.push({ error: e.message, name: ing.name });
      }
    }

    // log meal
    await supabase.from('meal_log').insert({
      user_id,
      recipe_id: recipeId,
      summary: results
    });

    return NextResponse.json({ ok: true, recipe, results });
  } catch (err) {
    console.error('cook error', err);
    return NextResponse.json({ error: err.message || 'internal error' }, { status: 500 });
  }
}
