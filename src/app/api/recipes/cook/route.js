// src/app/api/recipes/cook/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req) {
  try {
    const body = await req.json();
    const { recipeId } = body;
    if (!recipeId) {
      return NextResponse.json({ error: 'missing recipeId' }, { status: 400 });
    }

    // Load recipes.json
    const filePath = path.join(process.cwd(), 'src', 'data', 'recipes.json');
    const recipes = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const recipe = recipes.find(r => r.id === recipeId);

    if (!recipe) {
      return NextResponse.json({ error: 'recipe not found' }, { status: 404 });
    }

    // Return just the ingredients list
    return NextResponse.json({ ingredients: recipe.ingredients });
  } catch (err) {
    console.error('API error /api/recipes/cook:', err);
    return NextResponse.json({ error: 'Failed to cook recipe' }, { status: 500 });
  }
}
