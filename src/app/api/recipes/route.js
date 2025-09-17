// src/app/api/recipes/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Load recipes.json once at startup
const recipesFile = path.join(process.cwd(), 'src', 'data', 'recipes.json');
let RECIPES = [];
try {
  RECIPES = JSON.parse(fs.readFileSync(recipesFile, 'utf8'));
} catch (err) {
  console.error('Failed to load recipes.json', err);
  RECIPES = [];
}

// Simple fuzzy match helper
function matchesPantry(ingredientName, pantryNames) {
  const ing = ingredientName.toLowerCase();
  return pantryNames.some(p => ing.includes(p.toLowerCase()) || p.toLowerCase().includes(ing));
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const inventory = searchParams.getAll('inventory[]'); // array of pantry names

  const recipes = RECIPES.map(r => {
    const required = r.ingredients?.length || 0;

    // how many ingredients user has
    let match = 0;
    if (inventory.length > 0) {
      for (const ing of r.ingredients || []) {
        if (matchesPantry(ing.name, inventory)) {
          match++;
        }
      }
    }

    return {
      ...r,
      required_count: required,
      match_count: match,
    };
  });

  // If inventory provided → sort by best matches
  // Otherwise → just return all
  recipes.sort((a, b) => (b.match_count || 0) - (a.match_count || 0));

  return NextResponse.json(recipes);
}
