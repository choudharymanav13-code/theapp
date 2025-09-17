import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY // anon key
);

export async function POST(req) {
  const body = await req.json();
  const { recipeId } = body;
  if (!recipeId) return NextResponse.json({ error: 'missing recipeId' }, { status: 400 });

  // Load recipes.json
  const fs = require('fs');
  const path = require('path');
  const f = path.join(process.cwd(), 'src', 'data', 'recipes.json');
  const recipes = JSON.parse(fs.readFileSync(f, 'utf8'));
  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) return NextResponse.json({ error: 'recipe not found' }, { status: 404 });

  return NextResponse.json({ ingredients: recipe.ingredients });
}
