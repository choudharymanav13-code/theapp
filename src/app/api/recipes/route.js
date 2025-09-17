// src/app/api/recipes/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req) {
  try {
    // Load recipes.json
    const filePath = path.join(process.cwd(), 'src', 'data', 'recipes.json');
    const recipes = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    // Parse query params
    const { searchParams } = new URL(req.url);
    const inventory = searchParams.getAll('inventory[]').map(i => i.toLowerCase());

    // Add match stats
    const enriched = recipes.map(r => {
      const ingNames = r.ingredients.map(i => i.name.toLowerCase());
      const matches = ingNames.filter(n => inventory.includes(n)).length;
      return {
        ...r,
        match_count: matches,
        required_count: ingNames.length
      };
    });

    // Sort recipes: most matches first
    enriched.sort((a, b) => b.match_count - a.match_count);

    return NextResponse.json(enriched);
  } catch (err) {
    console.error('API error /api/recipes:', err);
    return NextResponse.json({ error: 'Failed to load recipes' }, { status: 500 });
  }
}
