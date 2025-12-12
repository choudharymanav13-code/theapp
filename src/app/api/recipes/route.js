// src/app/api/recipes/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

function simplify(s=''){ return String(s).toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim(); }
function tokens(s=''){ return simplify(s).split(' ').filter(Boolean); }
function jaccardScore(aTokens, bTokens){
  const A = new Set(aTokens), B = new Set(bTokens);
  const inter = [...A].filter(x => B.has(x));
  const union = new Set([...A, ...B]);
  return inter.length / (union.size || 1);
}

export async function GET(req) {
  try {
    const url = new URL(req.url);
    const inventory = url.searchParams.getAll('inventory[]').map(s => s || '').filter(Boolean);
    const q = url.searchParams.get('q') || '';
    const fpath = path.join(process.cwd(), 'src', 'data', 'recipes.json');
    if (!fs.existsSync(fpath)) return NextResponse.json([], { status: 200 });

    const raw = JSON.parse(fs.readFileSync(fpath, 'utf8'));
    let recipes = Array.isArray(raw) ? raw.slice() : [];

    // If there's a q param -> search by title / ingredient names
    if (q && q.trim().length > 0) {
      const qTokens = tokens(q);
      recipes = recipes.filter(r => {
        const hay = tokens(r.title + ' ' + (r.cuisine || '') + ' ' + (r.ingredients || []).map(i=>i.name).join(' '));
        // require any overlap
        return qTokens.some(t => hay.includes(t));
      });
    }

    const invTokens = inventory.map(i => tokens(i));

    // compute match_count & missing list
    recipes = recipes.map(r => {
      const required = r.ingredients || [];
      let match_count = 0;
      const missing = [];
      required.forEach(ing => {
        const ingTokens = tokens(ing.name || '');
        let best = 0;
        for (const it of invTokens) {
          const sc = jaccardScore(ingTokens, it);
          if (sc > best) best = sc;
        }
        if (best > 0.25) match_count++;
        else missing.push(ing.name);
      });
      const required_count = required.length;
      const match_percent = required_count === 0 ? 0 : (match_count / required_count);
      return { ...r, match_count, required_count, match_percent, missing };
    });

    // Sort: higher match_percent first, fewer missing, then lower calories
    recipes.sort((a,b) => {
      if (b.match_percent !== a.match_percent) return b.match_percent - a.match_percent;
      if ((a.missing?.length||0) !== (b.missing?.length||0)) return (a.missing?.length||0) - (b.missing?.length||0);
      const ak = a.nutrition?.kcal || 9999;
      const bk = b.nutrition?.kcal || 9999;
      return ak - bk;
    });

    return NextResponse.json(recipes, { status: 200 });
  } catch (err) {
    console.error('recipes route error', err);
    return NextResponse.json([], { status: 500 });
  }
}
