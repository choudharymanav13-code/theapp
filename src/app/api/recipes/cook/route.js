// src/app/api/recipes/cook/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Use the same env vars you already set in Vercel (anon key, safe for client-side)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

export async function POST(req) {
  try {
    const body = await req.json();
    const { recipeId } = body;

    if (!recipeId) {
      return NextResponse.json({ error: 'missing recipeId' }, { status: 400 });
    }

    // Load recipes.json (pre-filled file)
    const f = path.join(process.cwd(), 'src', 'data', 'recipes.json');
    const recipes = JSON.parse(fs.readFileSync(f, 'utf8'));

    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) {
      return NextResponse.json({ error: 'recipe not found' }, { status: 404 });
    }

    // For now: just return the recipe ingredients
    return NextResponse.json({
      id: recipe.id,
      name: recipe.name,
      ingredients: recipe.ingredients
    });

  } catch (err) {
    console.error('Cook API error:', err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
