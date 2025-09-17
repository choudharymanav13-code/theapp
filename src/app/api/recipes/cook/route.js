import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export async function POST(req) {
  const body = await req.json();
  const { recipeId } = body;
  if (!recipeId) return NextResponse.json({ error: 'missing recipeId' }, { status: 400 });

  // Load recipe from recipes.json (or DB)
  const fs = require('fs');
  const path = require('path');
  const f = path.join(process.cwd(), 'src', 'data', 'recipes.json');
  const recipes = JSON.parse(fs.readFileSync(f, 'utf8'));
  const recipe = recipes.find(r => r.id === recipeId);
  if (!recipe) return NextResponse.json({ error: 'recipe not found' }, { status: 404 });

  // Get user from Supabase auth (use cookie via client lib instead if possible)
  // Here we'll expect frontend to send an auth token header; but simpler: require auth using supabase client in client side.
  // For simplicity, this server route will instruct client to handle deductions via client side. (Alternative: server-side with service role).

  // We'll respond with recipe.ingredients and let client deduct using supabase.from('items')
  return NextResponse.json({ ingredients: recipe.ingredients });
}
