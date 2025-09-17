// src/app/api/recipes/route.js
import fs from 'fs';
import path from 'path';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  // optional: q search term
  const q = searchParams.get('q') || '';
  // inventory[] parameters to compute match
  const inventory = searchParams.getAll('inventory[]').map(s => s.toLowerCase());

  // For simplicity serve from static JSON file (generated earlier)
  const f = path.join(process.cwd(), 'src', 'data', 'recipes.json');
  const raw = fs.readFileSync(f, 'utf8');
  const recipes = JSON.parse(raw);

  // filter by q
  let out = recipes;
  if (q) out = out.filter(r => r.title.toLowerCase().includes(q.toLowerCase()));

  // compute match_count if inventory provided
  if (inventory && inventory.length) {
    out = out.map(r => {
      const ingredientNames = r.ingredients.map(i => i.name.toLowerCase());
      const have = ingredientNames.filter(name => inventory.some(inv => name.includes(inv) || inv.includes(name)));
      return { ...r, match_count: have.length, required_count: ingredientNames.length };
    });
    // sort by best match first
    out.sort((a,b) => (b.match_count - a.match_count));
  }

  return new Response(JSON.stringify(out), { status: 200 });
}
